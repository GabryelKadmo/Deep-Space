/**
 * Preferencias globais aplicadas no momento em que um terminal de agente
 * abre, inclusive para nos criados antes: os args salvos no no continuam
 * com as flags padrao dos adapters, e aqui elas saem quando o usuario
 * desligou a opcao.
 */
export type AgentLaunchPolicy = {
  /** Remote Control do Claude (`--rc`). */
  remoteControl: boolean;
  /** Pular aprovacoes de comandos e edicoes no provider. */
  bypassPermissions: boolean;
};

// Sequencias de args que cada provider usa para pular aprovacoes.
const BYPASS_FLAGS: Record<string, string[][]> = {
  claude: [['--dangerously-skip-permissions']],
  antigravity: [['--dangerously-skip-permissions']],
  codex: [['--dangerously-bypass-approvals-and-sandbox']],
  kimi: [['--auto']],
  cursor: [['--force']],
  copilot: [['--yolo']],
  devin: [['--permission-mode', 'dangerous']],
};
const REMOTE_CONTROL_FLAGS: Record<string, string[][]> = {
  claude: [['--rc']],
};

function withoutSequences(args: string[], sequences: string[][]): string[] {
  const result: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const match = sequences.find((sequence) => sequence.every((token, offset) => args[index + offset] === token));
    if (match) {
      index += match.length - 1;
      continue;
    }
    result.push(args[index]);
  }
  return result;
}

export function applyAgentLaunchPolicy(provider: string | undefined | null, args: string[], policy: AgentLaunchPolicy): string[] {
  if (!provider) return args;
  let next = args;
  if (!policy.bypassPermissions) next = withoutSequences(next, BYPASS_FLAGS[provider] ?? []);
  if (!policy.remoteControl) next = withoutSequences(next, REMOTE_CONTROL_FLAGS[provider] ?? []);
  return next;
}

/**
 * Providers whose CLI documents a flag for extra workspace folders. The rest
 * learn about the folders from the generated AGENTS.md/CLAUDE.md instead; a
 * flag is only added here once it is verified against the provider's docs.
 */
const ADDITIONAL_DIR_FLAGS: Record<string, string> = {
  claude: '--add-dir',
  codex: '--add-dir',
};

export function additionalDirArgs(provider: string | undefined | null, directories: string[], args: string[] = []): string[] {
  const flag = provider ? ADDITIONAL_DIR_FLAGS[provider] : undefined;
  if (!flag) return [];
  // Codex in full-access mode already reaches every path, and an explicit
  // sandbox flag next to a bypass flag would only be noise.
  if (provider === 'codex' && args.includes('--dangerously-bypass-approvals-and-sandbox')) return [];
  return directories.flatMap((directory) => [flag, directory]);
}
