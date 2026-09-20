import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { useSvelarTest } from '@beeblock/svelar/testing';
import { WorkspaceService, workspaceService } from '$lib/modules/agent-room/application/services/WorkspaceService.js';
import { CreateCanvasNodeDto, UpdateWorkspaceDto } from '$lib/modules/agent-room/application/dto/WorkspaceDtos.js';
import { workspaceRepository } from '$lib/modules/agent-room/infrastructure/repositories/WorkspaceRepository.js';

function createTerminal(workspaceId: string, provider: string) {
  return workspaceService.createNode(new CreateCanvasNodeDto(
    workspaceId,
    'terminal',
    provider,
    0,
    0,
    560,
    340,
    0,
    { command: provider, args: [], provider },
  ));
}

describe('WorkspaceService — provisionamento da ponte', () => {
  useSvelarTest({ refreshDatabase: true });

  it('compartilha o provisionamento concorrente do mesmo workspace', async () => {
    const service = new WorkspaceService() as unknown as {
      ensureProvisioned: (workspace: unknown) => Promise<void>;
      provisionWorkspace: (workspace: unknown) => Promise<void>;
      provisionInFlight: Map<string, Promise<void>>;
    };
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => (finish = resolve));
    let calls = 0;
    service.provisionWorkspace = async () => {
      calls += 1;
      await pending;
    };
    const workspace = { id: 'protected-workspace', workingDir: '/protected' };

    const first = service.ensureProvisioned(workspace);
    const second = service.ensureProvisioned(workspace);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toBe(1);
    expect(service.provisionInFlight.size).toBe(1);
    finish();
    await Promise.all([first, second]);
    expect(service.provisionInFlight.size).toBe(0);
  });

  it('nao deixa a permissao pendente de um workspace bloquear os demais', async () => {
    const service = new WorkspaceService() as unknown as {
      ensureProvisioned: (workspace: unknown) => Promise<void>;
      provisionWorkspace: (workspace: { id: string }) => Promise<void>;
    };
    const releases = new Map<string, () => void>();
    const started: string[] = [];
    service.provisionWorkspace = async (workspace) => {
      started.push(workspace.id);
      await new Promise<void>((resolve) => releases.set(workspace.id, resolve));
    };

    const first = service.ensureProvisioned({ id: 'protected-a', workingDir: '/protected/a' });
    const second = service.ensureProvisioned({ id: 'protected-b', workingDir: '/protected/b' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(started).toEqual(['protected-a', 'protected-b']);
    releases.get('protected-b')?.();
    await second;
    releases.get('protected-a')?.();
    await first;
  });

  it('provisiona a base do Deep Space ao criar o workspace, sem nenhum provider dedicado ainda em uso', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'deepspace-prov-new-'));
    const workspace = await workspaceService.create({ name: 'novo', workingDir: dir, icon: null, instructions: null });

    expect(workspace.id).toBeTruthy();
    expect(workspace.repositoryRoots).toEqual([]);
    expect(existsSync(join(dir, '.deepspace', 'workspace.json'))).toBe(true);
    expect(existsSync(join(dir, '.deepspace', 'SKILL.md'))).toBe(true);
    // AGENTS.md portavel e lido por qualquer CLI sem arquivo dedicado.
    const agentsMd = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    expect(agentsMd).toContain('<!-- deepspace:begin -->');
    expect(agentsMd).toContain('deepspace ask');
    // .claude/skills/ e .mcp.json sao a base que a pagina Skills & MCPs
    // gerencia pra todo workspace — sempre provisionados, sem depender de provider.
    expect(existsSync(join(dir, '.claude', 'skills', 'deepspace', 'SKILL.md'))).toBe(true);
    const mcp = JSON.parse(readFileSync(join(dir, '.mcp.json'), 'utf8'));
    expect(mcp.mcpServers.deepspace.command).toBe(process.execPath);
    expect(mcp.mcpServers.figma).toEqual({ type: 'http', url: 'https://mcp.figma.com/mcp' });
    // Nenhum provider exclusivo (Cline, Devin, Antigravity, Cursor, OpenCode) tem terminal ainda.
    for (const path of [
      '.cline/skills/deepspace/SKILL.md',
      '.devin/skills/deepspace/SKILL.md',
      '.agents/skills/deepspace/SKILL.md',
      '.cursor/mcp.json',
      '.cline/mcp.json',
      '.devin/mcp_config.json',
      '.agents/mcp_config.json',
      'opencode.json',
    ]) {
      expect(existsSync(join(dir, path))).toBe(false);
    }
  });

  it('provisiona a skill e o MCP so do provider exclusivo que ganha um terminal', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'deepspace-prov-provider-'));
    const workspace = await workspaceService.create({ name: 'com-cline', workingDir: dir, icon: null, instructions: null });

    await createTerminal(workspace.id, 'cline');

    expect(existsSync(join(dir, '.cline', 'skills', 'deepspace', 'SKILL.md'))).toBe(true);
    const clineMcp = JSON.parse(readFileSync(join(dir, '.cline', 'mcp.json'), 'utf8'));
    expect(clineMcp.mcpServers.deepspace.command).toBe(process.execPath);
    // Devin, Antigravity, Cursor e OpenCode continuam sem terminal: sem arquivos deles.
    for (const path of [
      '.devin/skills/deepspace/SKILL.md',
      '.agents/skills/deepspace/SKILL.md',
      '.devin/mcp_config.json',
      '.agents/mcp_config.json',
      '.cursor/mcp.json',
      'opencode.json',
    ]) {
      expect(existsSync(join(dir, path))).toBe(false);
    }

    await createTerminal(workspace.id, 'opencode');
    const opencode = JSON.parse(readFileSync(join(dir, 'opencode.json'), 'utf8'));
    expect(opencode.mcp.deepspace).toMatchObject({ type: 'local', enabled: true });
    expect(existsSync(join(dir, '.cursor', 'mcp.json'))).toBe(false);
  });

  it('preserva conteudo do usuario no AGENTS.md ao atualizar o bloco', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'deepspace-prov-merge-'));
    const { writeFileSync: write } = await import('node:fs');
    write(join(dir, 'AGENTS.md'), '# Meu projeto\n\nRegras minhas aqui.\n');
    const workspace = await workspaceService.create({ name: 'merge', workingDir: dir, icon: null, instructions: null });

    const agentsMd = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    expect(agentsMd).toContain('Regras minhas aqui.');
    expect(agentsMd).toContain('<!-- deepspace:begin -->');
    expect(workspace.id).toBeTruthy();
  });

  it('preserva AGENTS.md e CLAUDE.md do usuario ao sincronizar instrucoes de preset', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'deepspace-prov-instructions-'));
    writeFileSync(join(dir, 'AGENTS.md'), '# Product rules\n\nNever rewrite this section.\n');
    writeFileSync(join(dir, 'CLAUDE.md'), '# Claude rules\n\nKeep this too.\n');

    const workspace = await workspaceService.create({
      name: 'instructions',
      workingDir: dir,
      icon: null,
      instructions: 'Team instructions.',
      syncAgentInstructionFiles: true,
    });
    await workspaceService.update(workspace.id, new UpdateWorkspaceDto({
      instructions: 'Updated team instructions.',
      syncAgentInstructionFiles: true,
    }));

    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    const claude = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
    expect(agents).toContain('# Product rules');
    expect(agents).toContain('Never rewrite this section.');
    expect(agents).toContain('Updated team instructions.');
    expect(agents).not.toContain('\nTeam instructions.\n');
    expect(agents).toContain('<!-- deepspace:begin -->');
    expect(claude).toContain('# Claude rules');
    expect(claude).toContain('Keep this too.');
    expect(claude).toContain('Updated team instructions.');
  });

  it('migrates legacy whole-file instructions into a managed block', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'deepspace-prov-legacy-instructions-'));
    writeFileSync(join(dir, 'AGENTS.md'), 'Old managed instructions.\n');
    const workspace = await workspaceRepository.createWorkspace({
      name: 'legacy instructions',
      workingDir: dir,
      instructions: 'Old managed instructions.',
      syncAgentInstructionFiles: false,
    });

    await workspaceService.update(workspace.id, new UpdateWorkspaceDto({ instructions: 'New managed instructions.' }));

    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    expect(agents.match(/Old managed instructions\./g)).toBeNull();
    expect(agents).toContain('<!-- deepspace:workspace-instructions:begin -->');
    expect(agents).toContain('New managed instructions.');
    expect(agents).toContain('<!-- deepspace:begin -->');
  });

  it('preserva servidores MCP configurados pelo usuario', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'deepspace-prov-mcp-'));
    const { mkdirSync: mkdir, writeFileSync: write } = await import('node:fs');
    mkdir(join(dir, '.cursor'), { recursive: true });
    write(
      join(dir, '.cursor', 'mcp.json'),
      `${JSON.stringify({ mcpServers: { custom: { command: 'custom-server', args: ['serve'] } } }, null, 2)}\n`
    );

    const workspace = await workspaceService.create({ name: 'mcp-merge', workingDir: dir, icon: null, instructions: null });
    await createTerminal(workspace.id, 'cursor');

    const config = JSON.parse(readFileSync(join(dir, '.cursor', 'mcp.json'), 'utf8'));
    expect(config.mcpServers.custom).toEqual({ command: 'custom-server', args: ['serve'] });
    expect(config.mcpServers.deepspace.command).toBe(process.execPath);
    expect(config.mcpServers.figma.url).toBe('https://mcp.figma.com/mcp');
  });

  it('repara skill e token ao abrir workspace antigo (sem provisionamento)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'deepspace-prov-old-'));
    // Criado direto no repositorio: simula workspace de versao antiga do app,
    // ja com um terminal Claude criado antes do provisionamento zero-config existir.
    const workspace = await workspaceRepository.createWorkspace({ name: 'antigo', workingDir: dir });
    await workspaceRepository.createNode({
      workspaceId: workspace.id,
      type: 'terminal',
      title: 'Lider',
      payload: { command: 'claude', provider: 'claude' },
    });
    expect(existsSync(join(dir, '.deepspace', 'workspace.json'))).toBe(false);

    await workspaceService.get(workspace.id);

    expect(existsSync(join(dir, '.deepspace', 'workspace.json'))).toBe(true);
    const skillPath = join(dir, '.claude', 'skills', 'deepspace', 'SKILL.md');
    expect(existsSync(skillPath)).toBe(true);
    const skill = readFileSync(skillPath, 'utf8');
    expect(skill).toContain('Modo Maestro');
    expect(skill).toContain('DEEPSPACE_NODE_ID');

    const config = JSON.parse(readFileSync(join(dir, '.deepspace', 'workspace.json'), 'utf8'));
    expect(config.token).toBeTruthy();
  });

  it('atualiza skill com conteudo antigo ao abrir o workspace', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'deepspace-prov-stale-'));
    const workspace = await workspaceService.create({ name: 'stale', workingDir: dir, icon: null, instructions: null });
    // Envelhece a copia canonica (.deepspace/SKILL.md), sempre gravada
    // independente de provider, que e o marcador usado pelo reparo.
    const skillPath = join(dir, '.deepspace', 'SKILL.md');
    writeFileSync(skillPath, '---\nname: deepspace-bridge\n---\nskill antiga\n');

    const staleService = new (await import('$lib/modules/agent-room/application/services/WorkspaceService.js')).WorkspaceService();
    await staleService.get(workspace.id);

    const skill = readFileSync(skillPath, 'utf8');
    expect(skill).toContain('Modo Maestro');
    expect(skill).not.toContain('skill antiga');
  });

  it('provisiona a skill dedicada quando um provider novo entra num workspace ja aberto', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'deepspace-prov-ondemand-'));
    const workspace = await workspaceService.create({ name: 'ondemand', workingDir: dir, icon: null, instructions: null });
    await workspaceService.get(workspace.id);
    expect(existsSync(join(dir, '.devin', 'skills', 'deepspace', 'SKILL.md'))).toBe(false);

    await createTerminal(workspace.id, 'devin');

    expect(existsSync(join(dir, '.devin', 'skills', 'deepspace', 'SKILL.md'))).toBe(true);
    const config = JSON.parse(readFileSync(join(dir, '.devin', 'mcp_config.json'), 'utf8'));
    expect(config.mcpServers.deepspace.command).toBe(process.execPath);
  });
});
