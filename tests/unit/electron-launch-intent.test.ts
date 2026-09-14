import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { isBackgroundRuntimeInvocation } = require('../../electron/launch-intent.cjs') as {
  isBackgroundRuntimeInvocation: (argv: unknown[]) => boolean;
};

describe('Electron launch intent', () => {
  it('recognizes packaged CLI and server child invocations on every path style', () => {
    expect(isBackgroundRuntimeInvocation([
      'C:\\Program Files\\Deep Space\\Deep Space.exe',
      'C:\\Program Files\\Deep Space\\resources\\app\\packages\\deepspace-cli\\bin\\deepspace.js',
      'task',
      'list',
    ])).toBe(true);
    expect(isBackgroundRuntimeInvocation([
      '/Applications/Deep Space.app/Contents/MacOS/Deep Space',
      '/Applications/Deep Space.app/Contents/Resources/app/scripts/deepspace-server.mjs',
    ])).toBe(true);
  });

  it('keeps normal launches and collaboration links user-visible', () => {
    expect(isBackgroundRuntimeInvocation(['C:\\Program Files\\Deep Space\\Deep Space.exe'])).toBe(false);
    expect(isBackgroundRuntimeInvocation([
      'C:\\Program Files\\Deep Space\\Deep Space.exe',
      'deepspace://join/invite-token#abcdefghijklmnopqrstuvwxyzABCDEFGH1234567',
    ])).toBe(false);
  });
});
