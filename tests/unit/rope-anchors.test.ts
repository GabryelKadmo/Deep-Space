import { describe, expect, it } from 'vitest';
import { edgeAnchorFor, edgeAnchorsFor } from '$lib/components/agent-room/canvas/floating-anchor.js';

const node = (id: string, x: number, y: number, width = 400, height = 200) => ({ id, position: { x, y }, width, height });

describe('ancoras das cordas', () => {
  const claude = node('claude', 0, 0);
  const tasks = node('tasks', 700, 0);
  const note = node('note', 0, 500);
  const nodes = [claude, tasks, note];

  it('cada corda sai pelo lado virado para o seu vizinho', () => {
    const anchors = edgeAnchorsFor('claude', nodes, [
      { id: 'a', source: 'claude', target: 'tasks' },
      { id: 'b', source: 'claude', target: 'note' },
    ]);

    expect(anchors.map((anchor) => [anchor.edgeId, anchor.side])).toEqual([
      ['a', 'right'],
      ['b', 'bottom'],
    ]);
  });

  it('fica a 5px da borda, na perpendicular do lado', () => {
    expect(edgeAnchorFor('claude', 'tasks', nodes)).toMatchObject({ x: 405, y: 100 });
    expect(edgeAnchorFor('claude', 'note', nodes)).toMatchObject({ x: 200, y: 205 });
  });

  it('nunca para no canto arredondado, mesmo com o vizinho na diagonal', () => {
    // centro em (2200, 1110): a direcao do centro do Claude mira o canto
    // inferior direito dele, e sem limite a bolinha cairia em x=398.
    const corner = node('corner', 2000, 1010);
    const anchor = edgeAnchorFor('claude', 'corner', [claude, corner]);

    expect(anchor?.side).toBe('bottom');
    expect(anchor?.x).toBe(400 - 16);
    expect(anchor?.y).toBe(205);
  });

  it('as duas pontas de uma corda usam o lado de cada no', () => {
    expect(edgeAnchorFor('tasks', 'claude', nodes)?.side).toBe('left');
    expect(edgeAnchorFor('note', 'claude', nodes)?.side).toBe('top');
  });
});
