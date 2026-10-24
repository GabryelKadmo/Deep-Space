import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const base = mkdtempSync(join(tmpdir(), 'deepspace-git-scope-'));
const main = join(base, 'main');
const api = join(base, 'api');
for (const dir of [main, api]) {
  mkdirSync(dir);
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
}
writeFileSync(join(api, 'only-in-api.txt'), 'x');

const workspace = { id: 'ws', workingDir: main, runtimeKind: 'native', wslDistribution: null, wslWorkingDir: null, repositoryRoots: [{ alias: 'api', path: api }] };
vi.mock('$lib/modules/agent-room/infrastructure/repositories/WorkspaceRepository.js', () => ({
  workspaceRepository: { getWorkspace: async () => workspace },
}));

let git: import('$lib/modules/agent-room/application/services/GitService.js').GitService;
beforeAll(async () => {
  git = new (await import('$lib/modules/agent-room/application/services/GitService.js')).GitService();
});

describe('GitService por repositório', () => {
  it('lê o repositório principal sem escopo', async () => {
    expect((await git.status('ws')).changes).toHaveLength(0);
  });

  it('lê o repositório adicional dentro do escopo do alias', async () => {
    const status = await git.inRepository('API', () => git.status('ws'));
    expect(status.isRepo).toBe(true);
    expect(status.changes.map((change) => change.path)).toEqual(['only-in-api.txt']);
  });

  it('recusa um alias que o workspace não registrou', async () => {
    await expect(git.inRepository('nope', () => git.status('ws'))).rejects.toThrow(/não está registrado/);
  });

  it('não vaza o escopo para chamadas seguintes', async () => {
    await git.inRepository('api', () => git.status('ws'));
    expect((await git.status('ws')).changes).toHaveLength(0);
  });
});
