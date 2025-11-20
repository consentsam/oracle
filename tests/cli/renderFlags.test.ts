import { describe, expect, test } from 'vitest';
import { resolveRenderFlag } from '../../src/cli/renderFlags.ts';

describe('resolveRenderFlag', () => {
  test('prefers explicit renderMarkdown', () => {
    expect(resolveRenderFlag(false, true)).toBe(true);
  });

  test('falls back to render alias', () => {
    expect(resolveRenderFlag(true, false)).toBe(true);
  });

  test('false when neither flag is set', () => {
    expect(resolveRenderFlag(undefined, undefined)).toBe(false);
  });
});
