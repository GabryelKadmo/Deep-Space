import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateCanvasEdgeDto } from '$lib/modules/agent-room/application/dto/WorkspaceDtos.js';
import { WorkspaceService } from '$lib/modules/agent-room/application/services/WorkspaceService.js';
import { workspaceRepository } from '$lib/modules/agent-room/infrastructure/repositories/WorkspaceRepository.js';

const WORKSPACE_ID = 'workspace-1';

function setup(edges: Array<{ id: string; sourceNodeId: string; targetNodeId: string }>) {
  const workspace = { id: WORKSPACE_ID, name: 'Canvas', workingDir: '/workspace' } as any;
  vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValue(workspace);
  vi.spyOn(workspaceRepository, 'getNode').mockImplementation(
    async (id) => ({ id, workspaceId: WORKSPACE_ID, type: 'note' }) as any,
  );
  vi.spyOn(workspaceRepository, 'listEdges').mockResolvedValue(edges as any);
  const service = new WorkspaceService();
  // Ler o workspace provisiona a ponte no disco; aqui so interessa a aresta.
  vi.spyOn(service as unknown as { ensureProvisioned: () => Promise<void> }, 'ensureProvisioned').mockResolvedValue();
  const createEdge = vi.spyOn(workspaceRepository, 'createEdge').mockResolvedValue({ id: 'edge-new' } as any);
  return { service, createEdge };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('canvas edge linking', () => {
  it('refuses to link a node to itself', async () => {
    const { service, createEdge } = setup([]);

    await expect(
      service.createEdge(new CreateCanvasEdgeDto(WORKSPACE_ID, 'node-a', 'node-a', undefined as never)),
    ).rejects.toThrow(/si mesmo/);
    expect(createEdge).not.toHaveBeenCalled();
  });

  it('reuses the existing rope instead of stacking a duplicate, in either direction', async () => {
    const { service, createEdge } = setup([{ id: 'edge-ab', sourceNodeId: 'node-a', targetNodeId: 'node-b' }]);

    const same = await service.createEdge(
      new CreateCanvasEdgeDto(WORKSPACE_ID, 'node-a', 'node-b', undefined as never),
    );
    const reversed = await service.createEdge(
      new CreateCanvasEdgeDto(WORKSPACE_ID, 'node-b', 'node-a', undefined as never),
    );

    expect(same).toMatchObject({ id: 'edge-ab' });
    expect(reversed).toMatchObject({ id: 'edge-ab' });
    expect(createEdge).not.toHaveBeenCalled();
  });

  it('still creates a rope between two nodes that are not linked yet', async () => {
    const { service, createEdge } = setup([{ id: 'edge-ab', sourceNodeId: 'node-a', targetNodeId: 'node-b' }]);

    const edge = await service.createEdge(
      new CreateCanvasEdgeDto(WORKSPACE_ID, 'node-a', 'node-c', undefined as never),
    );

    expect(edge).toMatchObject({ id: 'edge-new' });
    expect(createEdge).toHaveBeenCalledTimes(1);
  });
});
