<script lang="ts">
  import { page } from '$app/state';
  import { Button } from '$lib/components/ui/button';
  import * as m from '$lib/paraglide/messages.js';
  import { Check, CircleCheck, Loader2, Play, X } from '@lucide/svelte';
  import { tourState, tourNext, tourBack, tourCompleteCurrent, tourRunAction, stopTour } from './engine.svelte.js';
  import { findTourTarget, placeTourPanel, type Box, type Size } from './spotlight.js';
  import { OPEN_LAYER_SELECTOR } from '../managed-portal-surface.js';
  import { TOUR_DIALOG_EVENT } from './types.js';

  const step = $derived(tourState.tour?.steps[tourState.stepIndex] ?? null);
  const total = $derived(tourState.tour?.steps.length ?? 0);
  const completed = (id: string) => tourState.autoCompleted.has(id);

  const SPOTLIGHT_PADDING = 6;
  let panelWidth = $state(0);
  let panelHeight = $state(0);
  let targetBox = $state<Box | null>(null);
  let viewport = $state<Size>({ width: 0, height: 0 });

  const target = $derived(tourState.done ? undefined : step?.target);
  let layerOpen = $state(false);
  // Preso a 2px da borda da janela: um alvo encostado nela (a sidebar) ainda
  // mostra o anel inteiro.
  const highlighted = $derived.by(() => {
    if (!targetBox) return null;
    const top = Math.max(2, targetBox.top - SPOTLIGHT_PADDING);
    const left = Math.max(2, targetBox.left - SPOTLIGHT_PADDING);
    const bottom = Math.min(viewport.height - 2, targetBox.top + targetBox.height + SPOTLIGHT_PADDING);
    const right = Math.min(viewport.width - 2, targetBox.left + targetBox.width + SPOTLIGHT_PADDING);
    return { top, left, width: right - left, height: bottom - top };
  });
  // Um menu ou painel aberto por cima do alvo ficaria abaixo da camada escura:
  // ela sai enquanto ele estiver aberto, e o painel continua ancorado. Quando
  // o alvo esta dentro da camada (um campo do dialogo), ela continua.
  const spotlight = $derived(layerOpen ? null : highlighted);
  const placement = $derived(
    highlighted && panelWidth && panelHeight ? placeTourPanel(highlighted, { width: panelWidth, height: panelHeight }, viewport) : null,
  );

  $effect(() => {
    const dialog = tourState.done ? null : step?.dialog ?? null;
    window.dispatchEvent(new CustomEvent(TOUR_DIALOG_EVENT, { detail: dialog }));
  });

  // O alvo pode mudar de lugar (sidebar recolhida, dock rolando, janela
  // redimensionada) ou ainda nem existir quando o passo abre: segue o
  // retangulo a cada quadro enquanto o passo tiver alvo.
  $effect(() => {
    const id = target;
    if (!id) {
      targetBox = null;
      return;
    }
    let frame = 0;
    let last = '';
    const follow = () => {
      const element = findTourTarget(id);
      const rect = element?.getBoundingClientRect();
      const next = rect ? { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) } : null;
      const open = [...document.querySelectorAll(OPEN_LAYER_SELECTOR)].some((layer) => !element || !layer.contains(element));
      const key = `${JSON.stringify(next)}:${window.innerWidth}x${window.innerHeight}:${open}`;
      if (key !== last) {
        last = key;
        targetBox = next;
        layerOpen = open;
        viewport = { width: window.innerWidth, height: window.innerHeight };
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  });

  function portal(node: Element) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }
</script>

{#if tourState.tour && step}
  {#if spotlight}
    <!-- Mascara SVG: uma box-shadow do tamanho da tela nao e pintada pelo Chromium. -->
    <svg class="tour-spotlight" data-tour-spotlight use:portal aria-hidden="true">
      <defs>
        <mask id="tour-spotlight-hole">
          <rect width="100%" height="100%" fill="white" />
          <rect class="tour-hole" x={spotlight.left} y={spotlight.top} width={spotlight.width} height={spotlight.height} rx="10" fill="black" />
        </mask>
      </defs>
      <rect class="tour-dim" width="100%" height="100%" mask="url(#tour-spotlight-hole)" />
      <rect class="tour-hole tour-ring" x={spotlight.left} y={spotlight.top} width={spotlight.width} height={spotlight.height} rx="10" />
    </svg>
  {/if}
  <aside
    class="tour-panel nodrag nowheel"
    class:workbench={page.url.pathname === '/terminal'}
    class:anchored={placement !== null}
    data-side={placement?.side}
    style:top={placement ? `${placement.top}px` : undefined}
    style:left={placement ? `${placement.left}px` : undefined}
    bind:offsetWidth={panelWidth}
    bind:offsetHeight={panelHeight}
    use:portal
    aria-label={m['tour.panel_aria']()}
  >
    {#if tourState.done}
      <div class="tour-done">
        <CircleCheck size={20} aria-hidden="true" />
        <h3>{m['tour.completed_title']()}</h3>
        <p>{m['tour.completed_body']()}</p>
        <div class="tour-actions">
          <Button size="sm" variant="outline" onclick={stopTour}>{m['tour.finish']()}</Button>
        </div>
      </div>
    {:else}
      <header class="tour-head">
        <span class="tour-kicker">{tourState.tour.title}</span>
        <button class="tour-close" aria-label={m['tour.quit']()} onclick={stopTour}>
          <X size={13} />
        </button>
      </header>
      <div class="tour-progress" aria-hidden="true">
        {#each tourState.tour.steps as s, index (s.id)}
          <span
            class="tour-dot"
            class:done={completed(s.id) || index < tourState.stepIndex}
            class:current={index === tourState.stepIndex}
          ></span>
        {/each}
      </div>
      <span class="tour-step-of">{m['tour.step_of']({ current: String(tourState.stepIndex + 1), total: String(total) })}</span>
      <h3 class="tour-title">{step.title}</h3>
      <p class="tour-body">{step.body}</p>
      {#if tourState.error}
        <p class="tour-error">{tourState.error}</p>
      {/if}
      <div class="tour-actions">
        {#if tourState.stepIndex > 0}
          <Button size="sm" variant="ghost" onclick={tourBack}>{m['tour.back']()}</Button>
        {/if}
        <span class="tour-spacer"></span>
        {#if step.action}
          <Button size="sm" disabled={tourState.busy || tourState.actionDoneFor === step.id} onclick={() => step.action && tourRunAction(step.action)}>
            {#if tourState.busy}<Loader2 size={13} class="tour-spin" aria-hidden="true" />{m['tour.doing']()}{:else}<Play size={13} aria-hidden="true" />{m['tour.do_for_me']()}{/if}
          </Button>
        {:else if step.check}
          <Button size="sm" variant="outline" onclick={tourCompleteCurrent}>
            <Check size={13} aria-hidden="true" />{m['tour.done_step']()}
          </Button>
        {:else}
          <Button size="sm" onclick={tourNext}>{m['tour.next']()}</Button>
        {/if}
      </div>
    {/if}
  </aside>
{/if}

<style>
  .tour-panel {
    position: fixed;
    pointer-events: auto;
    left: 16px;
    bottom: 16px;
    z-index: 60;
    width: 340px;
    max-width: calc(100vw - 40px);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--app-accent) 42%, var(--app-border));
    background: color-mix(in srgb, var(--app-surface-raised) 96%, transparent);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
  }

  .tour-panel.workbench {
    right: 16px;
    bottom: 40px;
    left: auto;
  }

  .tour-panel.anchored {
    right: auto;
    bottom: auto;
    transition: top 220ms ease, left 220ms ease;
  }

  .tour-spotlight {
    position: fixed;
    inset: 0;
    z-index: 59;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
  }

  .tour-dim {
    fill: rgba(0, 0, 0, 0.55);
  }

  .tour-ring {
    fill: none;
    stroke: var(--app-accent);
    stroke-width: 2;
  }

  .tour-hole {
    transition: x 220ms ease, y 220ms ease, width 220ms ease, height 220ms ease;
  }

  .tour-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .tour-kicker {
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0;
    color: var(--app-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tour-close {
    display: inline-flex;
    padding: 3px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--app-text-muted);
    cursor: pointer;
  }

  .tour-close:hover {
    color: var(--app-text);
    background: var(--app-surface-subtle);
  }

  .tour-progress {
    display: flex;
    gap: 5px;
  }

  .tour-dot {
    width: 16px;
    height: 4px;
    border-radius: 999px;
    background: var(--app-border);
  }

  .tour-dot.done {
    background: var(--app-success);
  }

  .tour-dot.current {
    background: var(--app-accent);
  }

  .tour-step-of {
    font-size: 10.5px;
    color: var(--app-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .tour-title {
    margin: 0;
    font-family: 'Sora Variable', 'Sora', 'Inter Variable', 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 600;
    color: var(--app-text);
    text-wrap: balance;
  }

  .tour-body {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--app-text-soft);
    text-wrap: pretty;
  }

  .tour-error {
    margin: 0;
    font-size: 11px;
    color: var(--app-danger);
  }

  .tour-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .tour-spacer {
    flex: 1;
  }

  .tour-done {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    color: var(--app-success);
  }

  .tour-done h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--app-text);
  }

  .tour-done p {
    margin: 0;
    font-size: 12px;
    color: var(--app-text-soft);
    line-height: 1.6;
  }

  :global(.tour-spin) {
    animation: tour-spin 1s linear infinite;
  }

  @keyframes tour-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 600px) {
    .tour-panel {
      right: 12px;
      bottom: 12px;
      left: 12px;
      width: auto;
      max-width: none;
    }

    .tour-panel.workbench {
      right: 12px;
      bottom: 40px;
      left: 12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.tour-spin) {
      animation: none;
    }

    .tour-panel.anchored,
    .tour-hole {
      transition: none;
    }
  }
</style>
