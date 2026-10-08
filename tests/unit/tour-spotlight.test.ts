import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOURS_PT } from '$lib/components/agent-room/tours/catalog/pt-BR.js';
import { TOURS_EN } from '$lib/components/agent-room/tours/catalog/en.js';
import { TOURS_ES } from '$lib/components/agent-room/tours/catalog/es.js';
import { placeTourPanel } from '$lib/components/agent-room/tours/spotlight.js';

function svelteSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return svelteSources(path);
    return path.endsWith('.svelte') ? [path] : [];
  });
}

const markedTargets = new Set(
  svelteSources('src').flatMap((path) => [...readFileSync(path, 'utf8').matchAll(/data-tour="([^"]+)"/g)].map((match) => match[1])),
);

describe('alvos dos tours', () => {
  it('todo passo com alvo aponta para um elemento marcado com data-tour na UI', () => {
    for (const catalog of [TOURS_PT, TOURS_EN, TOURS_ES]) {
      for (const tour of catalog) {
        for (const step of tour.steps) {
          if (step.target) expect(markedTargets.has(step.target), `${tour.id}/${step.id}: data-tour="${step.target}" nao existe`).toBe(true);
        }
      }
    }
  });

  it('os alvos sao os mesmos nos 3 idiomas', () => {
    const targets = (catalog: typeof TOURS_PT) => catalog.flatMap((tour) => tour.steps.map((step) => `${tour.id}/${step.id}:${step.target ?? ''}`));
    expect(targets(TOURS_EN)).toEqual(targets(TOURS_PT));
    expect(targets(TOURS_ES)).toEqual(targets(TOURS_PT));
  });
});

describe('placeTourPanel', () => {
  const viewport = { width: 1440, height: 860 };
  const panel = { width: 340, height: 200 };

  it('poe o painel ao lado de um alvo alto, centralizado na vertical', () => {
    expect(placeTourPanel({ top: 2, left: 2, width: 290, height: 856 }, panel, viewport)).toEqual({ side: 'right', left: 306, top: 330 });
  });

  it('vai para a esquerda quando a direita de um alvo alto nao cabe', () => {
    expect(placeTourPanel({ top: 100, left: 1200, width: 200, height: 400 }, panel, viewport).side).toBe('left');
  });

  it('sobe acima de um botao no rodape, sem cobrir a fileira dele, e nunca sai da tela', () => {
    const placed = placeTourPanel({ top: 818, left: 1300, width: 44, height: 44 }, panel, viewport);
    expect(placed.side).toBe('top');
    expect(placed.top + panel.height).toBeLessThanOrEqual(818);
    expect(placed.left + panel.width).toBeLessThanOrEqual(viewport.width - 12);
  });

  it('desce abaixo de um botao no topo, preso na margem esquerda', () => {
    expect(placeTourPanel({ top: 47, left: 146, width: 44, height: 44 }, panel, viewport)).toEqual({ side: 'bottom', left: 12, top: 105 });
  });
});
