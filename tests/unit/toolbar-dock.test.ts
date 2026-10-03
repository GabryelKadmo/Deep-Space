import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// A dock nao gera os botoes a partir da lista: cada item fixavel tem o seu
// bloco `pinnedToolbarSet.has('<id>')`. Item que so entra na lista aparece no
// menu "..." e some ao ser fixado (Console na 0.35.3, Servidores na 0.38.0).
const page = readFileSync('src/routes/canvas/+page.svelte', 'utf8');

function toolbarIds(): string[] {
  const match = page.match(/const TOOLBAR_ITEM_IDS = \[([^\]]+)\] as const;/);
  if (!match) throw new Error('TOOLBAR_ITEM_IDS not found');
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

function drawTools(): string[] {
  const start = page.indexOf('const DRAW_CREATORS');
  const end = page.indexOf('};', start);
  return [...page.slice(start, end).matchAll(/^\s{4}(\w+): async/gm)].map((item) => item[1]);
}

describe('canvas dock', () => {
  it('renders a dock button for every item that can be pinned', () => {
    const missing = toolbarIds().filter((id) => !page.includes(`pinnedToolbarSet.has('${id}')`));
    expect(missing, 'add a {#if pinnedToolbarSet.has(...)} block in the dock for these ids').toEqual([]);
  });

  it('lists every pinnable item in the tools menu', () => {
    const menu = page.slice(page.indexOf('const toolbarMenuItems'));
    const missing = toolbarIds().filter((id) => !menu.includes(`case '${id}':`));
    expect(missing, 'add a case to toolbarMenuItems for these ids').toEqual([]);
  });

  it('reaches every drawable node type from the toolbar', () => {
    const missing = drawTools().filter((tool) => !page.includes(`toggleDrawTool('${tool}')`));
    expect(missing, 'add these node types to TOOLBAR_ITEM_IDS, the tools menu and the dock').toEqual([]);
  });
});
