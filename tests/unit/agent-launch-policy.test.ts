import { describe, expect, it } from 'vitest';
import { additionalDirArgs, applyAgentLaunchPolicy } from '$lib/modules/agent-room/infrastructure/pty/agent-launch-policy.js';

const ON = { remoteControl: true, bypassPermissions: true };

describe('preferencias de abertura dos terminais de agente', () => {
  it('mantem os args do adapter com as duas opcoes ligadas', () => {
    const args = ['--dangerously-skip-permissions', '--rc', '--model', 'opus'];
    expect(applyAgentLaunchPolicy('claude', args, ON)).toEqual(args);
  });

  it('tira so o Remote Control do Claude', () => {
    expect(applyAgentLaunchPolicy('claude', ['--dangerously-skip-permissions', '--rc', '--model', 'opus'], { ...ON, remoteControl: false }))
      .toEqual(['--dangerously-skip-permissions', '--model', 'opus']);
  });

  it('tira o bypass de cada provider, inclusive a flag com valor do Devin', () => {
    const off = { ...ON, bypassPermissions: false };
    expect(applyAgentLaunchPolicy('claude', ['--dangerously-skip-permissions', '--rc'], off)).toEqual(['--rc']);
    expect(applyAgentLaunchPolicy('codex', ['--dangerously-bypass-approvals-and-sandbox', '--model', 'gpt-5.5'], off)).toEqual(['--model', 'gpt-5.5']);
    expect(applyAgentLaunchPolicy('devin', ['--permission-mode', 'dangerous', '--respect-workspace-trust', 'false'], off)).toEqual(['--respect-workspace-trust', 'false']);
    expect(applyAgentLaunchPolicy('copilot', ['--yolo', '--no-remote'], off)).toEqual(['--no-remote']);
  });

  it('nao mexe em terminais comuns nem no valor de outra flag igual a uma flag de bypass', () => {
    const off = { remoteControl: false, bypassPermissions: false };
    expect(applyAgentLaunchPolicy(undefined, ['--rc'], off)).toEqual(['--rc']);
    expect(applyAgentLaunchPolicy('opencode', ['-m', 'x'], off)).toEqual(['-m', 'x']);
    expect(applyAgentLaunchPolicy('devin', ['--permission-mode', 'ask'], off)).toEqual(['--permission-mode', 'ask']);
  });
});

describe('pastas adicionais do workspace nos agentes', () => {
  it('repete --add-dir por pasta no Claude e no Codex', () => {
    expect(additionalDirArgs('claude', ['/a', '/b'])).toEqual(['--add-dir', '/a', '--add-dir', '/b']);
    expect(additionalDirArgs('codex', ['/a'], ['--model', 'x'])).toEqual(['--add-dir', '/a']);
  });

  it('nao acrescenta nada ao Codex com acesso total, a providers sem flag verificada ou a terminais comuns', () => {
    expect(additionalDirArgs('codex', ['/a'], ['--dangerously-bypass-approvals-and-sandbox'])).toEqual([]);
    expect(additionalDirArgs('kimi', ['/a'])).toEqual([]);
    expect(additionalDirArgs(undefined, ['/a'])).toEqual([]);
    expect(additionalDirArgs('claude', [])).toEqual([]);
  });
});
