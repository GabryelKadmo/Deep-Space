import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SshHostService } from '$lib/modules/agent-room/application/services/SshHostService.js';

describe('SshHostService.ensureConfig', () => {
  let home: string;
  const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'ssh-home-'));
    process.env.HOME = home;
    process.env.USERPROFILE = home;
  });

  afterEach(() => {
    process.env.HOME = saved.HOME;
    process.env.USERPROFILE = saved.USERPROFILE;
    rmSync(home, { recursive: true, force: true });
  });

  it('creates a commented config when there is none', async () => {
    const result = await new SshHostService().ensureConfig();
    expect(result).toEqual({ configPath: join(home, '.ssh', 'config'), created: true });
    const text = readFileSync(result.configPath, 'utf8');
    expect(text).toContain('# Host minha-vps');
    expect(text.split('\n').filter((line) => line.trim() && !line.startsWith('#'))).toEqual([]);
  });

  it('never overwrites an existing config', async () => {
    const service = new SshHostService();
    const { configPath } = await service.ensureConfig();
    writeFileSync(configPath, 'Host real\n  HostName 10.0.0.1\n');
    expect(await service.ensureConfig()).toEqual({ configPath, created: false });
    expect(readFileSync(configPath, 'utf8')).toBe('Host real\n  HostName 10.0.0.1\n');
  });
});
