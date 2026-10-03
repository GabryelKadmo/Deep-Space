/**
 * Comandos do Console: o catalogo salvo por workspace que o no Console lista e
 * executa. Herdeiro dos "comandos salvos" que viviam no payload de cada
 * terminal (e nas settings, como globais) — ver `importLegacyCommands` no
 * servico, que traz os antigos para ca uma unica vez.
 */

export const MAX_CONSOLE_COMMANDS = 200;
export const MAX_CONSOLE_COMMAND_NAME = 80;
export const MAX_CONSOLE_COMMAND_LENGTH = 4_000;
export const MAX_CONSOLE_COMMAND_FOLDER = 60;

export type ConsoleCommand = {
  id: string;
  workspaceId: string;
  folder: string;
  name: string;
  command: string;
  runOnOpen: boolean;
  position: number;
};

/** Um grupo da arvore: a pasta sem nome guarda os comandos soltos. */
export type ConsoleCommandGroup = {
  folder: string;
  commands: ConsoleCommand[];
};

export function groupConsoleCommands(commands: readonly ConsoleCommand[]): ConsoleCommandGroup[] {
  const groups = new Map<string, ConsoleCommand[]>();
  for (const command of [...commands].sort((a, b) => a.position - b.position)) {
    const folder = command.folder.trim();
    const bucket = groups.get(folder);
    if (bucket) bucket.push(command);
    else groups.set(folder, [command]);
  }
  // Soltos primeiro, depois as pastas em ordem alfabetica estavel.
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)))
    .map(([folder, list]) => ({ folder, commands: list }));
}

/** Shell em que os comandos do Console rodam (configuracao `consoleShell`). */
export const CONSOLE_SHELLS = ['auto', 'powershell', 'cmd', 'gitbash', 'wsl', 'bash', 'zsh', 'sh'] as const;
export type ConsoleShell = (typeof CONSOLE_SHELLS)[number];

export function normalizeConsoleShell(value: string | null | undefined): ConsoleShell {
  return CONSOLE_SHELLS.includes(value as ConsoleShell) ? (value as ConsoleShell) : 'auto';
}

/** O que a tela de configuracoes oferece: so o que existe na plataforma. */
export function consoleShellOptions(platform: NodeJS.Platform | string): ConsoleShell[] {
  return platform === 'win32' ? ['auto', 'powershell', 'gitbash', 'wsl', 'cmd'] : ['auto', 'bash', 'zsh', 'sh'];
}

/** O que o PTY recebe para executar a linha inteira em um shell do sistema. */
export function consoleShellInvocation(
  command: string,
  platform: NodeJS.Platform | string,
  shell: string | null | undefined = 'auto',
): { command: string; args: string[] } {
  const line = command.replaceAll('\r\n', '\n').trim();
  const choice = normalizeConsoleShell(shell);
  if (platform === 'win32') {
    switch (choice) {
      case 'cmd':
        return { command: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', line] };
      case 'gitbash':
      case 'bash':
      case 'zsh':
      case 'sh':
        return { command: `${process.env.ProgramFiles || 'C:\\Program Files'}\\Git\\bin\\bash.exe`, args: ['-lc', line] };
      case 'wsl':
        return { command: 'wsl.exe', args: ['--', 'bash', '-lc', line] };
      default:
        // -ExecutionPolicy Bypass: sem isso o PowerShell recusa os wrappers .ps1
        // dos gerenciadores (npm.ps1, pnpm.ps1) com "execucao de scripts
        // desabilitada neste sistema" e nenhum `npm run` do Console roda.
        return { command: 'powershell.exe', args: ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', line] };
    }
  }
  const posix = choice === 'bash' ? '/bin/bash'
    : choice === 'zsh' ? '/bin/zsh'
    : choice === 'sh' ? '/bin/sh'
    : process.env.SHELL || '/bin/sh';
  return { command: posix, args: ['-lc', line] };
}

export type TerminalShell = Exclude<ConsoleShell, 'auto'>;

export const SHELL_NAMES: Record<TerminalShell, string> = {
  powershell: 'PowerShell',
  gitbash: 'Git Bash',
  wsl: 'WSL',
  cmd: 'CMD',
  bash: 'bash',
  zsh: 'zsh',
  sh: 'sh',
};

/** Shells que o no Terminal oferece: os da plataforma, sem o "Automatico". */
export function terminalShellOptions(platform: NodeJS.Platform | string): TerminalShell[] {
  return consoleShellOptions(platform).filter((shell): shell is TerminalShell => shell !== 'auto');
}

/** Reconhece o shell de um comando salvo antes de o no guardar a escolha. */
export function shellFromCommand(command: string | null | undefined): TerminalShell | null {
  const name = (command ?? '').trim().split(/[\\/]/).pop()?.toLowerCase().replace(/\.exe$/, '') ?? '';
  if (name === 'powershell' || name === 'pwsh') return 'powershell';
  if (name === 'cmd') return 'cmd';
  if (name === 'wsl') return 'wsl';
  if (name === 'bash') return /[\\/]git[\\/]/i.test(command ?? '') ? 'gitbash' : 'bash';
  if (name === 'zsh' || name === 'sh') return name;
  return null;
}

/** O que o PTY recebe para abrir um shell interativo no no Terminal. */
export function interactiveShellLaunch(
  shell: TerminalShell,
  platform: NodeJS.Platform | string,
): { command: string; args: string[] } {
  if (platform === 'win32') {
    switch (shell) {
      case 'cmd':
        return { command: process.env.ComSpec || 'cmd.exe', args: [] };
      case 'gitbash':
      case 'bash':
      case 'zsh':
      case 'sh':
        return { command: `${process.env.ProgramFiles || 'C:\\Program Files'}\\Git\\bin\\bash.exe`, args: ['--login', '-i'] };
      case 'wsl':
        return { command: 'wsl.exe', args: [] };
      default:
        // Mesmo motivo do Scripts: sem Bypass, claude.ps1, npm.ps1 e o profile
        // do usuario falham com "execucao de scripts desabilitada". Vale so
        // para este processo, nunca para a maquina.
        return { command: 'powershell.exe', args: ['-NoLogo', '-ExecutionPolicy', 'Bypass'] };
    }
  }
  return { command: shell === 'bash' ? '/bin/bash' : shell === 'zsh' ? '/bin/zsh' : '/bin/sh', args: [] };
}
