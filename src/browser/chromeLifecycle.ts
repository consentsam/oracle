import { rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import CDP from 'chrome-remote-interface';
import { launch, type LaunchedChrome } from 'chrome-launcher';
import type { BrowserLogger, ResolvedBrowserConfig, ChromeClient } from './types.js';

const execFileAsync = promisify(execFile);

export async function launchChrome(config: ResolvedBrowserConfig, userDataDir: string, logger: BrowserLogger) {
  const connectHost = resolveRemoteDebugHost();
  const debugPort = config.debugPort ?? parseDebugPortEnv();
  const chromeFlags = buildChromeFlags(config.headless, connectHost);
  const launcher = await launch({
    chromePath: config.chromePath ?? undefined,
    chromeFlags,
    userDataDir,
    port: debugPort ?? undefined,
  });
  const pidLabel = typeof launcher.pid === 'number' ? ` (pid ${launcher.pid})` : '';
  const hostLabel = connectHost ? ` on ${connectHost}` : '';
  logger(`Launched Chrome${pidLabel} on port ${launcher.port}${hostLabel}`);
  return Object.assign(launcher, { host: connectHost ?? '127.0.0.1' }) as LaunchedChrome & { host?: string };
}

export function registerTerminationHooks(
  chrome: LaunchedChrome,
  userDataDir: string,
  keepBrowser: boolean,
  logger: BrowserLogger,
): () => void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  let handling: boolean | undefined;

  const handleSignal = (signal: NodeJS.Signals) => {
    if (handling) {
      return;
    }
    handling = true;
    logger(`Received ${signal}; terminating Chrome process`);
    void (async () => {
      try {
        await chrome.kill();
      } catch {
        // ignore kill failures
      }
      if (!keepBrowser) {
        await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
      }
    })().finally(() => {
      const exitCode = signal === 'SIGINT' ? 130 : 1;
      process.exit(exitCode);
    });
  };

  for (const signal of signals) {
    process.on(signal, handleSignal);
  }

  return () => {
    for (const signal of signals) {
      process.removeListener(signal, handleSignal);
    }
  };
}

export async function hideChromeWindow(chrome: LaunchedChrome, logger: BrowserLogger): Promise<void> {
  if (process.platform !== 'darwin') {
    logger('Window hiding is only supported on macOS');
    return;
  }
  if (!chrome.pid) {
    logger('Unable to hide window: missing Chrome PID');
    return;
  }
  const script = `tell application "System Events"
    try
      set visible of (first process whose unix id is ${chrome.pid}) to false
    end try
  end tell`;
  try {
    await execFileAsync('osascript', ['-e', script]);
    logger('Chrome window hidden (Cmd-H)');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger(`Failed to hide Chrome window: ${message}`);
  }
}

export async function connectToChrome(port: number, logger: BrowserLogger, host?: string): Promise<ChromeClient> {
  const client = await CDP({ port, host });
  logger('Connected to Chrome DevTools protocol');
  return client;
}

export async function connectToRemoteChrome(
  host: string,
  port: number,
  logger: BrowserLogger,
): Promise<ChromeClient> {
  const client = await CDP({ host, port });
  logger(`Connected to remote Chrome DevTools protocol at ${host}:${port}`);
  return client;
}

function buildChromeFlags(_headless: boolean, debugHost?: string | null): string[] {
  const flags = [
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-default-apps',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--no-first-run',
    '--safebrowsing-disable-auto-update',
    '--disable-features=TranslateUI,AutomationControlled',
    '--mute-audio',
    '--window-size=1280,720',
    '--password-store=basic',
    '--use-mock-keychain',
  ];

  if (debugHost && debugHost !== '127.0.0.1') {
    flags.push('--remote-debugging-address=0.0.0.0');
  }

  // Headless/new is blocked by Cloudflare; always run headful.

  return flags;
}

function parseDebugPortEnv(): number | null {
  const raw = process.env.ORACLE_BROWSER_PORT ?? process.env.ORACLE_BROWSER_DEBUG_PORT;
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0 || value > 65535) {
    return null;
  }
  return value;
}

function resolveRemoteDebugHost(): string | null {
  const override = process.env.ORACLE_BROWSER_REMOTE_DEBUG_HOST?.trim();
  if (override) return override;
  if (!isWsl()) return null;
  try {
    const resolv = readFileSync('/etc/resolv.conf', 'utf8');
    for (const line of resolv.split('\n')) {
      const match = line.match(/^nameserver\s+([0-9.]+)/);
      if (match?.[1]) return match[1];
    }
  } catch {
    // ignore
  }
  return null;
}

function isWsl(): boolean {
  if (process.platform !== 'linux') return false;
  if (process.env.WSL_DISTRO_NAME) return true;
  return os.release().toLowerCase().includes('microsoft');
}
