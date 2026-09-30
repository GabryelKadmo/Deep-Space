<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Handle, NodeResizer, Position, useEdges, useNodes, type NodeProps } from '@xyflow/svelte';
  import * as Popover from '$lib/components/ui/popover';
  import { Link2, X } from '@lucide/svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { edgeAnchorsFor } from './floating-anchor.js';

  export type NodeConnection = {
    edgeId: string;
    targetId: string;
    targetTitle: string;
    targetType: string;
    direction: 'in' | 'out';
  };

  type Props = {
    id: NodeProps['id'];
    selected: NodeProps['selected'];
    /** Cor de destaque do tipo de no (borda selecionada / dot). */
    accent?: string;
    minWidth?: number;
    minHeight?: number;
    onResize?: (id: string, params: { x: number; y: number; width: number; height: number }) => void;
    /** Conexoes do no (para o popover de inspecao). */
    connections?: NodeConnection[];
    onJumpToNode?: (nodeId: string) => void;
    onRemoveConnection?: (edgeId: string) => void;
    /** Titulo em texto puro + callback — habilita renomear com duplo-clique. */
    titleText?: string;
    onRename?: (id: string, title: string) => void;
    /** Classe extra no wrapper (ex.: canvas-terminal) — mantida para testes/estilo. */
    class?: string;
    icon: Snippet;
    title: Snippet;
    actions?: Snippet;
    children: Snippet;
  };

  let {
    id,
    selected,
    accent = 'var(--app-accent)',
    minWidth = 320,
    minHeight = 200,
    onResize,
    connections = [],
    onJumpToNode,
    onRemoveConnection,
    titleText = '',
    onRename,
    class: klass = '',
    icon,
    title,
    actions,
    children,
  }: Props = $props();

  // Renomear inline: duplo-clique no titulo vira input; Enter/blur confirma.
  let editingTitle = $state(false);
  let titleDraft = $state('');

  function startRename() {
    if (!onRename) return;
    titleDraft = titleText;
    editingTitle = true;
  }

  function commitRename() {
    editingTitle = false;
    const next = titleDraft.trim();
    if (next && next !== titleText) onRename?.(id, next);
  }

  const nodesStore = useNodes();
  const edgesStore = useEdges();

  // Uma bolinha por corda, no lado virado para o vizinho daquela corda — e
  // a mesma ancora que DeepSpaceEdge usa para a ponta, entao bolinha e
  // corda coincidem sem obrigar as duas a sairem do mesmo ponto.
  const ropeAnchors = $derived.by(() => {
    const self = nodesStore.current.find((node) => node.id === id);
    if (!self) return [];
    return edgeAnchorsFor(id, nodesStore.current, edgesStore.current).map((anchor) => ({
      edgeId: anchor.edgeId,
      side: anchor.side,
      x: anchor.x - self.position.x,
      y: anchor.y - self.position.y,
    }));
  });

  // A corda nova sempre para no lado virado para o vizinho, entao o lado de
  // onde ela e puxada nao importa: num lado que ja tem corda, o handle so
  // desenhava uma segunda bolinha ao lado da primeira. Com os quatro lados
  // ocupados todos voltam, senao nao haveria de onde puxar.
  const occupiedSides = $derived.by(() => {
    const sides = new Set(ropeAnchors.map((anchor) => anchor.side));
    return sides.size === 4 ? new Set<string>() : sides;
  });

  function handleClass(side: string): string {
    return occupiedSides.has(side) ? 'node-handle occupied' : 'node-handle';
  }
</script>

<div class={`node-shell nowheel ${klass}`} class:selected style:--accent={accent}>
  <NodeResizer
    isVisible={selected ?? false}
    {minWidth}
    {minHeight}
    onResizeEnd={(_event, params) => onResize?.(id, params)}
    lineStyle="border-color: var(--accent)"
    handleStyle="background: var(--accent)"
  />
  <!-- Quatro handles bidirecionais (connectionMode Loose), um por lado: sao o
       ponto de partida de uma conexao nova e aparecem no hover do no. A
       ancora das cordas ja existentes e outra coisa (as bolinhas abaixo),
       uma por corda. -->
  <Handle id="top" type="source" position={Position.Top} class={handleClass('top')} />
  <Handle id="right" type="source" position={Position.Right} class={handleClass('right')} />
  <Handle id="bottom" type="source" position={Position.Bottom} class={handleClass('bottom')} />
  <Handle id="left" type="source" position={Position.Left} class={handleClass('left')} />

  {#if ropeAnchors.length}
    <div class="rope-anchors" aria-hidden="true">
      {#each ropeAnchors as anchor (anchor.edgeId)}
        <span class="rope-anchor" style={`left: ${anchor.x}px; top: ${anchor.y}px;`}></span>
      {/each}
    </div>
  {/if}

  <header class="node-header">
    <span class="node-icon">{@render icon()}</span>
    {#if editingTitle}
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="node-title-input nodrag"
        bind:value={titleDraft}
        autofocus
        spellcheck="false"
        onkeydown={(event) => {
          if (event.key === 'Enter') commitRename();
          if (event.key === 'Escape') editingTitle = false;
        }}
        onblur={commitRename}
      />
    {:else}
      <span
        class="node-title"
        class:renamable={Boolean(onRename)}
        aria-label={onRename ? m['shell.rename_hint']() : undefined}
        ondblclick={startRename}
        role={onRename ? 'button' : undefined}
      >{@render title()}</span>
    {/if}
    {#if connections.length}
      <Popover.Root>
        <Popover.Trigger class="connections-badge nodrag" aria-label={m['shell.connections']()}>
          <Link2 size={11} />{connections.length}
        </Popover.Trigger>
        <Popover.Content class="w-56 p-1">
          {#each connections as connection (connection.edgeId)}
            <div class="connection-row">
              <button class="connection-jump" onclick={() => onJumpToNode?.(connection.targetId)}>
                <span class="connection-dir">{connection.direction === 'out' ? '→' : '←'}</span>
                <span class="connection-title">{connection.targetTitle}</span>
                <span class="connection-type">{connection.targetType}</span>
              </button>
              <button class="connection-remove" aria-label={m['shell.remove_connection']()} onclick={() => onRemoveConnection?.(connection.edgeId)}>
                <X size={11} />
              </button>
            </div>
          {/each}
        </Popover.Content>
      </Popover.Root>
    {/if}
    {#if actions}
      <span class="node-actions nodrag">{@render actions()}</span>
    {/if}
  </header>

  <div class="node-body">
    {@render children()}
  </div>
</div>

<style>
  .node-shell {
    --shell-border: 1px;
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    border-radius: 8px;
    border: var(--shell-border) solid var(--app-border);
    background: var(--app-surface);
    box-shadow: var(--app-shadow-card);
    /* overflow visivel: os handles ficam a cavalo da borda (estilo Maestri)
       e precisam ser clicaveis fora da caixa; o recorte dos cantos fica a
       cargo do header/body. */
    overflow: visible;
    overscroll-behavior: contain;
    transition: border-color 120ms ease;
  }

  .node-shell.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent), var(--app-shadow-overlay);
  }

  .node-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    background: var(--app-surface-raised);
    border-bottom: 1px solid var(--app-border);
    border-radius: 7px 7px 0 0;
    color: var(--app-text-soft);
    font-size: 12px;
    font-weight: 500;
    cursor: grab;
    user-select: none;
  }

  .node-header:active {
    cursor: grabbing;
  }

  .node-icon {
    display: inline-flex;
    color: var(--accent);
  }

  .node-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node-title.renamable {
    cursor: text;
  }

  .node-title-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: var(--app-border);
    border-radius: 6px;
    color: var(--app-text);
    font-size: 12px;
    font-weight: 500;
    padding: 2px 6px;
  }

  .node-actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex: none;
    min-width: 0;
  }

  .connections-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    border: none;
    background: var(--app-border);
    color: var(--app-text-muted);
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 8px;
    cursor: pointer;
  }

  .connections-badge:hover {
    color: var(--accent);
  }

  .connection-row {
    display: flex;
    align-items: center;
  }

  .connection-jump {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 7px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--app-text-soft);
    font-size: 11px;
    cursor: pointer;
    text-align: left;
  }

  .connection-jump:hover {
    background: var(--app-border);
  }

  .connection-dir {
    color: var(--app-text-muted);
  }

  .connection-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .connection-type {
    color: var(--app-text-muted);
    font-size: 10px;
  }

  .connection-remove {
    border: none;
    background: transparent;
    color: var(--app-text-muted);
    cursor: pointer;
    padding: 4px;
  }

  .connection-remove:hover {
    color: var(--app-danger);
  }

  .node-body {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 0 0 7px 7px;
  }

  .node-shell :global(.node-action-btn) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--app-text-muted);
    cursor: pointer;
    padding: 0;
  }

  .node-shell :global(.node-action-btn:hover) {
    background: var(--app-border);
    color: var(--app-text);
  }

  .node-shell :global(.node-action-btn.danger:hover) {
    color: var(--app-danger);
  }

  .node-shell :global(.node-action-btn.active) {
    color: var(--app-warning);
  }

  .node-shell :global(.node-handle) {
    width: 13px;
    height: 13px;
    z-index: 20;
    background: var(--accent);
    border: 2.5px solid var(--app-accent-contrast);
    /* O anel nao e elevacao: e um recorte na cor do fundo para a bolinha
       nao encostar nas cordas que passam por baixo. */
    box-shadow: 0 0 0 3px var(--app-canvas), 0 0 8px var(--accent);
    /* So aparece perto do mouse (hover do no) — com 4 bolinhas por no,
       ficarem sempre visiveis poluia o canvas. */
    opacity: 0;
    pointer-events: none;
    transition: opacity 130ms ease, transform 130ms ease, box-shadow 130ms ease;
  }

  .node-shell:hover :global(.node-handle) {
    opacity: 0.95;
    pointer-events: auto;
  }

  /* Lado que ja tem corda: a bolinha da corda ocupa o lugar. visibility (e
     nao opacity) porque o modo "conectando" do canvas liga a opacidade de
     todos os handles, e um handle escondido nao pode reaparecer ali. */
  .node-shell :global(.node-handle.occupied) {
    visibility: hidden;
  }

  /* As ancoras vem em coordenadas do no (canto externo da borda), mas um
     filho absoluto conta a partir de DENTRO da borda: sem esta camada
     recuada, toda bolinha saia deslocada pela espessura da borda. */
  .rope-anchors {
    position: absolute;
    inset: calc(-1 * var(--shell-border));
    z-index: 20;
    pointer-events: none;
  }

  /* Bolinha de uma corda existente: menor que o handle, porque so marca onde
     a corda encosta — nao recebe clique, quem inicia conexao e o handle. */
  .node-shell .rope-anchor {
    position: absolute;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--app-accent-contrast);
    box-shadow: 0 0 0 2px var(--app-canvas), 0 0 6px var(--accent);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  /* Posicao de repouso (sem conexao) empurrada pra fora da borda — o padrao
     do xyflow centraliza a bolinha em cima da borda (metade pra dentro do
     no), que e exatamente a queixa da bolinha "pisando" no conteudo. */
  .node-shell :global(.node-handle.svelte-flow__handle-top) { top: -6px; }
  .node-shell :global(.node-handle.svelte-flow__handle-right) { right: -6px; }
  .node-shell :global(.node-handle.svelte-flow__handle-bottom) { bottom: -6px; }
  .node-shell :global(.node-handle.svelte-flow__handle-left) { left: -6px; }

  .node-shell :global(.node-handle:hover) {
    transform: scale(1.45);
    box-shadow: 0 0 0 4px var(--app-canvas), 0 0 14px var(--accent);
  }

  /* area de clique um pouco maior que a bolinha para iniciar conexoes —
     sem exagerar para nao cobrir a corda quando os nos estao proximos */
  .node-shell :global(.node-handle::after) {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
  }
</style>
