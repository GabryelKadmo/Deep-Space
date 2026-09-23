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

/** O que o PTY recebe para executar a linha inteira em um shell do sistema. */
export function consoleShellInvocation(command: string, platform: NodeJS.Platform | string): { command: string; args: string[] } {
  const line = command.replaceAll('\r\n', '\n').trim();
  if (platform === 'win32') return { command: 'powershell.exe', args: ['-NoLogo', '-NoProfile', '-Command', line] };
  return { command: process.env.SHELL || '/bin/sh', args: ['-lc', line] };
}
