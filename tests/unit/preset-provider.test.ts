import { describe, expect, it } from 'vitest';
import { withAgentProvider } from '$lib/modules/agent-room/domain/preset-provider.js';
import { defaultPresetProvider, presetProviderOptions } from '$lib/components/agent-room/agent-provider-choice.js';
import type { AgentProviderInfo } from '$lib/modules/agent-room/domain/types.js';

describe('provider unico ao aplicar um preset', () => {
  it('troca o provider do agente e descarta o que era do provider anterior', () => {
    const payload = { command: 'kimi', args: ['--yolo'], env: { A: '1' }, model: 'kimi-code/k3', effort: 'high', profileId: 'p1', provider: 'kimi', role: 'Revisor', maestro: true };
    expect(withAgentProvider(payload, 'claude')).toEqual({ provider: 'claude', role: 'Revisor', maestro: true });
  });

  it('mantem o agente intacto quando o provider ja e o escolhido ou nenhum foi escolhido', () => {
    const payload = { command: 'claude', args: [], provider: 'claude', role: 'Lider', model: 'opus' };
    expect(withAgentProvider(payload, 'claude')).toBe(payload);
    expect(withAgentProvider(payload, undefined)).toBe(payload);
  });

  it('nao transforma em agente um terminal que nao tinha provider', () => {
    const shell = { command: 'powershell.exe', shell: 'powershell' };
    expect(withAgentProvider(shell, 'claude')).toBe(shell);
  });
});

describe('provider padrao do formulario de preset', () => {
  const provider = (id: string, installed?: boolean) => ({ id, displayName: id, supportsResume: true, installed }) as AgentProviderInfo;

  it('lista so os providers detectados e prefere o Claude', () => {
    const providers = [provider('codex', true), provider('claude', true), provider('kimi', false)];
    expect(presetProviderOptions(providers).map((item) => item.id)).toEqual(['codex', 'claude']);
    expect(defaultPresetProvider(providers)).toBe('claude');
  });

  it('usa o primeiro detectado quando o Claude nao esta instalado', () => {
    expect(defaultPresetProvider([provider('claude', false), provider('codex', true)])).toBe('codex');
  });

  it('mantem todos como opcao enquanto nada foi detectado', () => {
    const providers = [provider('kimi'), provider('claude')];
    expect(presetProviderOptions(providers)).toHaveLength(2);
    expect(defaultPresetProvider(providers)).toBe('claude');
    expect(defaultPresetProvider([])).toBe('claude');
  });
});
