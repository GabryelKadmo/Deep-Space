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
