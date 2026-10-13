// Campos que so valem para o provider original do agente: trocar o provider
// sem descarta-los levaria o modelo ou os args de um para outro.
const PROVIDER_BOUND_FIELDS = ['command', 'args', 'env', 'model', 'effort', 'profileId'];

/** Payload de um agente do preset rodando no provider escolhido ao aplicar. */
export function withAgentProvider(payload: Record<string, unknown>, agentProvider: string | undefined): Record<string, unknown> {
  if (!agentProvider || typeof payload.provider !== 'string' || payload.provider === agentProvider) return payload;
  const next = Object.fromEntries(Object.entries(payload).filter(([key]) => !PROVIDER_BOUND_FIELDS.includes(key)));
  return { ...next, provider: agentProvider };
}
