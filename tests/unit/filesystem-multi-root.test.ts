import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const base = mkdtempSync(join(tmpdir(), 'deepspace-roots-'));
const main = join(base, 'main');
const api = join(base, 'api');
const outside = join(base, 'outside');
for (const dir of [main, api, outside]) mkdirSync(dir);
writeFileSync(join(main, 'readme.md'), '# main');
writeFileSync(join(api, 'server.ts'), 'export const needle = 1;');
writeFileSync(join(outside, 'secret.txt'), 'nope');

vi.mock('$lib/modules/agent-room/infrastructure/repositories/WorkspaceRepository.js', () => ({
  workspaceRepository: {
    getWorkspace: async () => ({ id: 'ws', workingDir: main, repositoryRoots: [{ alias: 'api', path: api }] }),
  },
}));

let service: import('$lib/modules/agent-room/application/services/FilesystemService.js').FilesystemService;
beforeAll(async () => {
  const mod = await import('$lib/modules/agent-room/application/services/FilesystemService.js');
  service = new mod.FilesystemService();
});

describe('FilesystemService com varias pastas', () => {
  it('lista a pasta principal quando nenhum caminho e informado', async () => {
    expect((await service.list('ws')).map((entry) => entry.name)).toEqual(['readme.md']);
  });

  it('lista e le uma pasta adicional por caminho absoluto ou por @alias', async () => {
    expect((await service.list('ws', api)).map((entry) => entry.name)).toEqual(['server.ts']);
    expect((await service.list('ws', '@api')).map((entry) => entry.name)).toEqual(['server.ts']);
    expect((await service.read('ws', '@api/server.ts')).content).toContain('needle');
  });

  it('recusa caminhos fora de qualquer pasta aprovada e aliases desconhecidos', async () => {
    await expect(service.read('ws', join(outside, 'secret.txt'))).rejects.toThrow(/fora do diretorio/);
    await expect(service.list('ws', '@api/../outside')).rejects.toThrow(/fora do diretorio/);
    await expect(service.list('ws', '@nope')).rejects.toThrow(/nao registrada/);
  });

  it('busca em todas as pastas', async () => {
    const byName = await service.search('ws', 'server');
    expect(byName.map((hit) => hit.path)).toContain(join(api, 'server.ts'));
    const byContent = await service.search('ws', 'needle', { byContent: true });
    expect(byContent.some((hit) => hit.path === join(api, 'server.ts'))).toBe(true);
  });
});
