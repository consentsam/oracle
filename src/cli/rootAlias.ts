import { attachSession, showStatus, type ShowStatusOptions } from './sessionDisplay.js';

export interface StatusAliasOptions {
  status?: boolean;
  session?: string;
}

export interface StatusAliasDependencies {
  attachSession: (sessionId: string) => Promise<void>;
  showStatus: (options: ShowStatusOptions) => Promise<void>;
}

const defaultDeps: StatusAliasDependencies = {
  attachSession,
  showStatus,
};

export async function handleStatusFlag(
  options: StatusAliasOptions,
  deps: StatusAliasDependencies = defaultDeps,
): Promise<boolean> {
  if (!options.status) {
    return false;
  }
  if (options.session) {
    await deps.attachSession(options.session);
    return true;
  }
  await deps.showStatus({ hours: 24, includeAll: false, limit: 100, showExamples: true });
  return true;
}
