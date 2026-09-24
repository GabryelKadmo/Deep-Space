import { describe, expect, it } from 'vitest';
import { consoleShellInvocation, consoleShellOptions, groupConsoleCommands, normalizeConsoleShell, type ConsoleCommand } from '$lib/modules/agent-room/domain/console-commands.js';

function command(overrides: Partial<ConsoleCommand> = {}): ConsoleCommand {
  return {
    id: overrides.id ?? 'id',
    workspaceId: 'workspace-1',
    folder: overrides.folder ?? '',
    name: overrides.name ?? 'Start',
    command: overrides.command ?? 'npm run dev',
    runOnOpen: overrides.runOnOpen ?? false,
    position: overrides.position ?? 0,
  };
}

describe('comandos do Console', () => {
  it('agrupa por pasta, com os soltos primeiro e a ordem salva dentro de cada uma', () => {
    const groups = groupConsoleCommands([
      command({ id: 'c', folder: 'GIT', name: 'Pull', position: 3 }),
      command({ id: 'b', folder: 'React/Next', name: 'Build', position: 2 }),
      command({ id: 'a', folder: 'React/Next', name: 'Start', position: 1 }),
      command({ id: 'loose', folder: '', name: 'Version', position: 0 }),
    ]);

    expect(groups.map((group) => group.folder)).toEqual(['', 'GIT', 'React/Next']);
    expect(groups[2].commands.map((item) => item.name)).toEqual(['Start', 'Build']);
  });

  it('trata pasta so de espacos como comando solto', () => {
    const groups = groupConsoleCommands([command({ folder: '   ' })]);

    expect(groups).toHaveLength(1);
    expect(groups[0].folder).toBe('');
  });

  it('libera a politica de execucao no PowerShell, senao npm.ps1 nao roda', () => {
    const windows = consoleShellInvocation('npm run dev', 'win32');
    expect(windows.command).toBe('powershell.exe');
    expect(windows.args).toContain('Bypass');
  });

  it('respeita o shell escolhido e ignora um id desconhecido', () => {
    expect(consoleShellInvocation('npm run dev', 'win32', 'cmd').args).toEqual(['/d', '/s', '/c', 'npm run dev']);
    expect(consoleShellInvocation('npm run dev', 'win32', 'wsl')).toEqual({ command: 'wsl.exe', args: ['--', 'bash', '-lc', 'npm run dev'] });
    expect(consoleShellInvocation('npm run dev', 'win32', 'gitbash').command.endsWith('\\Git\\bin\\bash.exe')).toBe(true);
    expect(consoleShellInvocation('npm run dev', 'linux', 'bash').command).toBe('/bin/bash');

    expect(normalizeConsoleShell('C:/evil.exe')).toBe('auto');
    expect(consoleShellInvocation('npm run dev', 'win32', 'C:/evil.exe').command).toBe('powershell.exe');
  });

  it('oferece so os shells que existem na plataforma', () => {
    expect(consoleShellOptions('win32')).not.toContain('zsh');
    expect(consoleShellOptions('darwin')).not.toContain('powershell');
  });

  it('entrega a linha inteira ao shell do sistema, e nao um executavel avulso', () => {
    const windows = consoleShellInvocation('npm run dev && echo done', 'win32');
    expect(windows.command).toBe('powershell.exe');
    expect(windows.args.at(-1)).toBe('npm run dev && echo done');

    const unix = consoleShellInvocation('npm run dev\r\n', 'linux');
    expect(unix.args[0]).toBe('-lc');
    expect(unix.args.at(-1)).toBe('npm run dev');
  });
});
