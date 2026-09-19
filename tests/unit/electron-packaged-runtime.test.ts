import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('packaged runtime package.json access', () => {
  it('does not read the build config from package.json at runtime', () => {
    // electron-builder strips "build" from the packaged app's package.json
    // (app-builder-lib rejects it outright since v3), so any runtime code
    // reading require('../package.json').build throws "Cannot read
    // properties of undefined" in the installed app, even though it works
    // fine in dev, where the source package.json still has the field.
    const main = readFileSync(path.resolve('electron/main.cjs'), 'utf8');
    expect(main).not.toMatch(/package\.json'\)\.build\b/);
  });

  it('keeps the hardcoded AppUserModelId in sync with package.json', () => {
    const packageJson = JSON.parse(readFileSync(path.resolve('package.json'), 'utf8'));
    const main = readFileSync(path.resolve('electron/main.cjs'), 'utf8');
    expect(main).toContain(`setAppUserModelId('${packageJson.build.appId}')`);
  });
});
