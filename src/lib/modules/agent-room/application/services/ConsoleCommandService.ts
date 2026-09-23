import { uuidv7 } from '@beeblock/svelar/support';
import { AgentConsoleCommand } from '../../domain/models/AgentConsoleCommand.js';
import { AgentWorkspace } from '../../domain/models/AgentWorkspace.js';
import {
  MAX_CONSOLE_COMMANDS,
  MAX_CONSOLE_COMMAND_FOLDER,
  MAX_CONSOLE_COMMAND_LENGTH,
  MAX_CONSOLE_COMMAND_NAME,
  type ConsoleCommand,
} from '../../domain/console-commands.js';
import { normalizeSavedTerminalCommands } from '../../domain/terminal-commands.js';
import { workspaceRepository } from '../../infrastructure/repositories/WorkspaceRepository.js';
import { settingsService } from './SettingsService.js';
import type { CreateConsoleCommandInput, UpdateConsoleCommandInput } from '../../contracts/schemas/consoleSchemas.js';

function mapCommand(model: AgentConsoleCommand): ConsoleCommand {
  return {
    id: model.getAttribute('id'),
    workspaceId: model.getAttribute('workspace_id'),
    folder: String(model.getAttribute('folder') ?? ''),
    name: model.getAttribute('name'),
    command: model.getAttribute('command'),
    runOnOpen: Boolean(model.getAttribute('run_on_open')),
    position: Number(model.getAttribute('position') ?? 0),
  };
}

function notifyWorkspaceChanged(workspaceId: string) {
  const broadcast = (globalThis as { __deepspaceBroadcast?: (payload: Record<string, unknown>) => void }).__deepspaceBroadcast;
  broadcast?.({ type: 'workspaceChanged', workspaceId });
}

export class ConsoleCommandService {
  async list(workspaceId: string): Promise<ConsoleCommand[]> {
    if (!await AgentWorkspace.find(workspaceId)) throw new Error('WORKSPACE_NOT_FOUND');
    await this.importLegacyCommands(workspaceId);
    const rows = await AgentConsoleCommand.query()
      .where('workspace_id', workspaceId)
      .orderBy('position', 'asc')
      .get();
    return rows.map(mapCommand);
  }

  async create(workspaceId: string, input: CreateConsoleCommandInput): Promise<ConsoleCommand> {
    if (!await AgentWorkspace.find(workspaceId)) throw new Error('WORKSPACE_NOT_FOUND');
    const total = await AgentConsoleCommand.query().where('workspace_id', workspaceId).get();
    if (total.length >= MAX_CONSOLE_COMMANDS) throw new Error('CONSOLE_COMMAND_LIMIT');
    const created = await this.insert(workspaceId, {
      folder: input.folder ?? '',
      name: input.name,
      command: input.command,
      runOnOpen: input.runOnOpen === true,
      position: total.length,
    });
    notifyWorkspaceChanged(workspaceId);
    return created;
  }

  async update(workspaceId: string, commandId: string, input: UpdateConsoleCommandInput): Promise<ConsoleCommand> {
    const model = await AgentConsoleCommand.find(commandId);
    if (!model || model.getAttribute('workspace_id') !== workspaceId) throw new Error('CONSOLE_COMMAND_NOT_FOUND');
    const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) changes.name = input.name.slice(0, MAX_CONSOLE_COMMAND_NAME);
    if (input.command !== undefined) changes.command = input.command.slice(0, MAX_CONSOLE_COMMAND_LENGTH);
    if (input.folder !== undefined) changes.folder = input.folder.slice(0, MAX_CONSOLE_COMMAND_FOLDER);
    if (input.runOnOpen !== undefined) changes.run_on_open = input.runOnOpen;
    if (input.position !== undefined) changes.position = input.position;
    await model.update(changes);
    notifyWorkspaceChanged(workspaceId);
    return mapCommand(model);
  }

  async remove(workspaceId: string, commandId: string): Promise<{ deleted: boolean }> {
    const model = await AgentConsoleCommand.find(commandId);
    if (!model || model.getAttribute('workspace_id') !== workspaceId) throw new Error('CONSOLE_COMMAND_NOT_FOUND');
    await model.delete();
    notifyWorkspaceChanged(workspaceId);
    return { deleted: true };
  }

  private async insert(
    workspaceId: string,
    values: Omit<ConsoleCommand, 'id' | 'workspaceId'>,
  ): Promise<ConsoleCommand> {
    const now = new Date().toISOString();
    const model = await AgentConsoleCommand.create({
      id: uuidv7(),
      workspace_id: workspaceId,
      folder: values.folder.slice(0, MAX_CONSOLE_COMMAND_FOLDER),
      name: values.name.slice(0, MAX_CONSOLE_COMMAND_NAME),
      command: values.command.slice(0, MAX_CONSOLE_COMMAND_LENGTH),
      run_on_open: values.runOnOpen,
      position: values.position,
      created_at: now,
      updated_at: now,
    });
    return mapCommand(model);
  }

  /**
   * Os comandos salvos viviam no payload de cada terminal e, os globais, numa
   * setting. O Console e a superficie unica agora: traz os antigos uma vez,
   * usando o titulo do terminal como pasta, e limpa a origem para que nada
   * ressuscite depois de ser apagado aqui.
   */
  private async importLegacyCommands(workspaceId: string): Promise<void> {
    const existing = await AgentConsoleCommand.query().where('workspace_id', workspaceId).get();
    const seen = new Set(existing.map((model) => this.fingerprint(mapCommand(model))));
    let position = existing.length;

    const globals = normalizeSavedTerminalCommands(await settingsService.get('terminalGlobalCommands'));
    for (const legacy of globals) {
      const candidate = { folder: '', name: legacy.name, command: legacy.command, runOnOpen: legacy.runOnResume, position };
      if (seen.has(this.fingerprint(candidate))) continue;
      await this.insert(workspaceId, candidate);
      seen.add(this.fingerprint(candidate));
      position += 1;
    }
    if (globals.length) await settingsService.set('terminalGlobalCommands', '[]');

    for (const node of await workspaceRepository.listNodes(workspaceId, undefined, true, true)) {
      if (node.type !== 'terminal') continue;
      const payload = node.payload as { savedCommands?: unknown } | null;
      const legacyCommands = normalizeSavedTerminalCommands(payload?.savedCommands);
      if (!legacyCommands.length) continue;
      for (const legacy of legacyCommands) {
        const candidate = {
          folder: (node.title ?? '').slice(0, MAX_CONSOLE_COMMAND_FOLDER),
          name: legacy.name,
          command: legacy.command,
          runOnOpen: legacy.runOnResume,
          position,
        };
        if (seen.has(this.fingerprint(candidate))) continue;
        await this.insert(workspaceId, candidate);
        seen.add(this.fingerprint(candidate));
        position += 1;
      }
      await workspaceRepository.updateNode(node.id, { payload: { ...(node.payload ?? {}), savedCommands: [] } as never });
    }
  }

  private fingerprint(command: Pick<ConsoleCommand, 'folder' | 'name' | 'command'>): string {
    return `${command.folder}\u0000${command.name}\u0000${command.command}`;
  }
}

export const consoleCommandService = new ConsoleCommandService();
