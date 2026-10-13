import type { AgentProviderInfo } from '$lib/modules/agent-room/domain/types.js';

/**
 * Providers que podem rodar os agentes de um preset: os detectados nesta
 * maquina. Enquanto a deteccao nao respondeu (ou nada foi detectado) a lista
 * inteira fica disponivel, para o formulario nunca ficar sem opcao.
 */
export function presetProviderOptions(providers: AgentProviderInfo[]): AgentProviderInfo[] {
  const installed = providers.filter((provider) => provider.installed === true);
  return installed.length ? installed : providers;
}

/** Claude quando ele esta disponivel; senao o primeiro provider da lista. */
export function defaultPresetProvider(providers: AgentProviderInfo[]): string {
  const options = presetProviderOptions(providers);
  return options.find((provider) => provider.id === 'claude')?.id ?? options[0]?.id ?? 'claude';
}
