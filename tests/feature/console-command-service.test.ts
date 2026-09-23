import { describe, expect, it } from 'vitest';
import { useSvelarTest } from '@beeblock/svelar/testing';
import { consoleCommandService } from '$lib/modules/agent-room/application/services/ConsoleCommandService.js';
import { settingsService } from '$lib/modules/agent-room/application/services/SettingsService.js';
import { workspaceRepository } from '$lib/modules/agent-room/infrastructure/repositories/WorkspaceRepository.js';

describe('ConsoleCommandService', () => {
  useSvelarTest({ refreshDatabase: true });

  async function workspace() {
    return workspaceRepository.createWorkspace({ name: 'Console', workingDir: '/tmp' });
  }

  it('cria, edita e remove um comando do workspace', async () => {
    const { id } = await workspace();

    const created = await consoleCommandService.create(id, { name: 'Start', command: 'npm run dev', folder: 'Projeto' });
    expect(created).toMatchObject({ name: 'Start', command: 'npm run dev', folder: 'Projeto', runOnOpen: false });

    const updated = await consoleCommandService.update(id, created.id, { command: 'npm run dev -- --host', runOnOpen: true });
    expect(updated).toMatchObject({ command: 'npm run dev -- --host', runOnOpen: true });

    await consoleCommandService.remove(id, created.id);
    expect(await consoleCommandService.list(id)).toHaveLength(0);
  });

  it('recusa comando de outro workspace', async () => {
    const mine = await workspace();
    const other = await workspace();
    const command = await consoleCommandService.create(mine.id, { name: 'Start', command: 'npm run dev' });

    await expect(consoleCommandService.update(other.id, command.id, { name: 'Hack' })).rejects.toThrow('CONSOLE_COMMAND_NOT_FOUND');
    await expect(consoleCommandService.remove(other.id, command.id)).rejects.toThrow('CONSOLE_COMMAND_NOT_FOUND');
  });

  it('importa os comandos salvos antigos uma vez e limpa a origem', async () => {
    const { id } = await workspace();
    await settingsService.set('terminalGlobalCommands', JSON.stringify([
      { id: 'g1', name: 'Pull', command: 'git pull', runOnResume: false },
    ]));
    const terminal = await workspaceRepository.createNode({
      workspaceId: id,
      type: 'terminal',
      title: 'Dev API',
      x: 0,
      y: 0,
      width: 560,
      height: 340,
      payload: { savedCommands: [{ id: 't1', name: 'Start', command: 'npm run dev', runOnResume: true }] },
    } as never);

    const imported = await consoleCommandService.list(id);

    expect(imported.map((command) => [command.folder, command.name, command.runOnOpen])).toEqual([
      ['', 'Pull', false],
      ['Dev API', 'Start', true],
    ]);
    // A origem fica vazia: um comando apagado aqui nao pode voltar na proxima listagem.
    expect(await settingsService.get('terminalGlobalCommands')).toBe('[]');
    expect((await workspaceRepository.getNode(terminal.id))?.payload).toMatchObject({ savedCommands: [] });

    await consoleCommandService.remove(id, imported[0].id);
    expect(await consoleCommandService.list(id)).toHaveLength(1);
  });
});
