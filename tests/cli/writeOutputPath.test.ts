import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeAll, afterAll } from 'vitest';

describe('resolveOutputPath', () => {
  const originalHome = process.env.ORACLE_HOME_DIR;

  beforeAll(() => {
    process.env.ORACLE_HOME_DIR = path.join(os.tmpdir(), 'oracle-write-output-test');
  });

  afterAll(() => {
    process.env.ORACLE_HOME_DIR = originalHome;
  });

  test('rejects paths inside session storage', async () => {
    const { resolveOutputPath } = await import('../../src/cli/writeOutputPath.ts');
    const insideSessions = path.join(process.env.ORACLE_HOME_DIR as string, 'sessions', 'out.md');
    expect(() => resolveOutputPath(insideSessions, '/tmp')).toThrow(/Refusing to write output inside session storage/);
  });

  test('allows tilde expansion', async () => {
    const { resolveOutputPath } = await import('../../src/cli/writeOutputPath.ts');
    const result = resolveOutputPath('~/answer.md', '/tmp');
    expect(result?.startsWith(os.homedir())).toBe(true);
  });
});
