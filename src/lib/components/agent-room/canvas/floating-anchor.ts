import type { Edge, Node } from '@xyflow/svelte';

/**
 * Ancoras das cordas na borda de um no. Cada corda tem a sua: o ponto da
 * borda virado para o no do outro lado daquela corda. Antes havia uma unica
 * ancora por no, a do vizinho mais proximo, e todas as cordas saiam dali —
 * um Kanban a direita e uma nota embaixo puxavam as duas cordas para baixo,
 * e a unica forma de arrumar o desenho era amontoar os nos. NodeShell
 * (bolinha) e DeepSpaceEdge (ponta da corda) usam a mesma funcao, entao
 * ponta e bolinha continuam coincidindo.
 */

export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';
export type RopeAnchor = { x: number; y: number; side: AnchorSide };

/** A bolinha da corda (9px + anel de 2px) tem ~6px de raio visual: a 5px da
    borda ela encosta no no, sem flutuar solta nem pisar no conteudo. */
const ROPE_ANCHOR_OFFSET_PX = 5;

/** Distancia minima dos cantos: no canto arredondado a bolinha parecia
    descolada do no. */
const CORNER_MARGIN_PX = 16;

type NodeLike = Pick<Node, 'id' | 'position'> & {
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
};

type Rect = { cx: number; cy: number; halfW: number; halfH: number; x: number; y: number };

const nodeIndexCache = new WeakMap<object, ReadonlyMap<string, unknown>>();
const edgeIndexCache = new WeakMap<object, ReadonlyMap<string, readonly unknown[]>>();

/** Shared indexes prevent every rendered edge from scanning the full canvas. */
export function nodeIndexFor<T extends { id: string }>(nodes: readonly T[]): ReadonlyMap<string, T> {
  const cached = nodeIndexCache.get(nodes) as ReadonlyMap<string, T> | undefined;
  if (cached) return cached;
  const index = new Map(nodes.map((node) => [node.id, node]));
  nodeIndexCache.set(nodes, index);
  return index;
}

export function connectedEdgesFor<T extends { source: string; target: string }>(nodeId: string, edges: readonly T[]): readonly T[] {
  let index = edgeIndexCache.get(edges) as ReadonlyMap<string, readonly T[]> | undefined;
  if (!index) {
    const mutable = new Map<string, T[]>();
    for (const edge of edges) {
      const sourceEdges = mutable.get(edge.source) ?? [];
      sourceEdges.push(edge);
      mutable.set(edge.source, sourceEdges);
      if (edge.target !== edge.source) {
        const targetEdges = mutable.get(edge.target) ?? [];
        targetEdges.push(edge);
        mutable.set(edge.target, targetEdges);
      }
    }
    index = mutable;
    edgeIndexCache.set(edges, index as ReadonlyMap<string, readonly unknown[]>);
  }
  return index.get(nodeId) ?? [];
}

function rectOf(node: NodeLike): Rect {
  const width = node.measured?.width ?? node.width ?? 320;
  const height = node.measured?.height ?? node.height ?? 200;
  return {
    cx: node.position.x + width / 2,
    cy: node.position.y + height / 2,
    halfW: width / 2,
    halfH: height / 2,
    x: node.position.x,
    y: node.position.y,
  };
}

function clamp(value: number, limit: number): number {
  return Math.min(Math.max(value, -limit), limit);
}

/**
 * Ponto da borda na direcao (dx, dy), afastado do lado na perpendicular. A
 * conta antiga projetava num retangulo inflado: perto dos cantos a bolinha
 * caia na diagonal, fora de qualquer lado.
 */
function borderPoint(rect: Rect, dx: number, dy: number): RopeAnchor | null {
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) / rect.halfW >= Math.abs(dy) / rect.halfH) {
    const along = clamp(dy * (rect.halfW / Math.abs(dx)), Math.max(rect.halfH - CORNER_MARGIN_PX, 0));
    const side = dx > 0 ? 'right' : 'left';
    return { x: rect.cx + Math.sign(dx) * (rect.halfW + ROPE_ANCHOR_OFFSET_PX), y: rect.cy + along, side };
  }
  const along = clamp(dx * (rect.halfH / Math.abs(dy)), Math.max(rect.halfW - CORNER_MARGIN_PX, 0));
  const side = dy > 0 ? 'bottom' : 'top';
  return { x: rect.cx + along, y: rect.cy + Math.sign(dy) * (rect.halfH + ROPE_ANCHOR_OFFSET_PX), side };
}

/** Ancora absoluta da corda entre dois nos, no lado de `nodeId` virado para `otherId`. */
export function edgeAnchorFor(nodeId: string, otherId: string, nodes: readonly NodeLike[]): RopeAnchor | null {
  const nodesById = nodeIndexFor(nodes);
  const self = nodesById.get(nodeId);
  const other = nodesById.get(otherId);
  if (!self || !other) return null;
  const rect = rectOf(self);
  const otherRect = rectOf(other);
  return borderPoint(rect, otherRect.cx - rect.cx, otherRect.cy - rect.cy);
}

/** Uma ancora por corda conectada ao no — o que a bolinha de cada corda segue. */
export function edgeAnchorsFor(
  nodeId: string,
  nodes: readonly NodeLike[],
  edges: readonly (Pick<Edge, 'source' | 'target'> & { id: string })[],
): Array<RopeAnchor & { edgeId: string }> {
  const anchors: Array<RopeAnchor & { edgeId: string }> = [];
  for (const link of connectedEdgesFor(nodeId, edges)) {
    const otherId = link.source === nodeId ? link.target : link.source;
    const anchor = edgeAnchorFor(nodeId, otherId, nodes);
    if (anchor) anchors.push({ edgeId: link.id, ...anchor });
  }
  return anchors;
}
