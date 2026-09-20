<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  type Props = {
    content: string;
    /** compact = tipografia menor (cartoes do kanban). */
    compact?: boolean;
    /** quando presente, checkboxes de task list (GFM) ficam clicaveis; index e a posicao entre todos os checkboxes, na ordem do documento. */
    onToggleCheckbox?: (index: number, checked: boolean) => void;
  };

  let { content, compact = false, onToggleCheckbox }: Props = $props();
  let container = $state<HTMLDivElement | undefined>();

  marked.setOptions({ gfm: true, breaks: true });

  /** markdown -> html sanitizado; links abrem fora, checkboxes editaveis visualmente (e clicaveis de verdade quando onToggleCheckbox e passado). */
  const html = $derived.by(() => {
    const raw = marked.parse(content ?? '', { async: false }) as string;
    let clean = DOMPurify.sanitize(raw, {
      ADD_ATTR: ['target', 'rel', 'checked', 'disabled', 'type', 'class'],
    });
    // Links externos: nova aba, sem referrer (seguranca + UX).
    clean = clean.replaceAll('<a href', '<a target="_blank" rel="noopener noreferrer" href');
    // marked marca os checkboxes de task list como disabled; removemos so quando o caller quer interatividade.
    if (onToggleCheckbox) clean = clean.replace(/(<input[^>]*type="checkbox"[^>]*)\s+disabled(="")?/g, '$1');
    return clean;
  });

  function handleClick(event: MouseEvent) {
    if (!onToggleCheckbox || !container) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
    const boxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    const index = boxes.indexOf(target);
    if (index !== -1) onToggleCheckbox(index, target.checked);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="md" class:compact class:interactive={Boolean(onToggleCheckbox)} bind:this={container} onclick={handleClick}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitizado com DOMPurify -->
  {@html html}
</div>

<style>
  .md {
    font-size: 12.5px;
    line-height: 1.65;
    color: var(--app-text-soft);
    overflow-wrap: break-word;
  }

  .md.compact {
    font-size: 11.5px;
    line-height: 1.55;
  }

  .md :global(h1),
  .md :global(h2),
  .md :global(h3),
  .md :global(h4) {
    font-family: 'Sora Variable', 'Sora', 'Inter Variable', 'Inter', sans-serif;
    font-weight: 600;
    color: var(--app-text);
    margin: 12px 0 6px;
    text-wrap: balance;
  }

  .md :global(h1) { font-size: 16px; }
  .md :global(h2) { font-size: 14.5px; }
  .md :global(h3) { font-size: 13px; }
  .md :global(h4) { font-size: 12px; }

  .md :global(h1:first-child),
  .md :global(h2:first-child),
  .md :global(h3:first-child) {
    margin-top: 0;
  }

  .md :global(p) {
    margin: 0 0 8px;
  }

  .md :global(p:last-child) {
    margin-bottom: 0;
  }

  .md :global(a) {
    color: var(--app-secondary);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .md :global(a:hover) {
    color: color-mix(in srgb, var(--app-secondary) 75%, var(--app-text));
  }

  .md :global(ul),
  .md :global(ol) {
    margin: 0 0 8px;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .md :global(li > p) {
    margin: 0;
  }

  /* Checkboxes de task list (GFM) */
  .md :global(li input[type='checkbox']) {
    appearance: none;
    width: 13px;
    height: 13px;
    border-radius: 4px;
    border: 1px solid var(--app-border-strong);
    background: transparent;
    vertical-align: -2px;
    margin-right: 6px;
    position: relative;
    pointer-events: none;
  }

  .md :global(li input[type='checkbox']:checked) {
    background: var(--app-accent);
    border-color: var(--app-accent);
  }

  .md :global(li input[type='checkbox']:checked::after) {
    content: '✓';
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: var(--app-accent-contrast);
  }

  .md :global(li:has(input[type='checkbox'])) {
    list-style: none;
    margin-left: -18px;
  }

  .md.interactive :global(li input[type='checkbox']) {
    pointer-events: auto;
    cursor: pointer;
  }

  .md :global(code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
    background: var(--app-surface-raised);
    border-radius: 5px;
    padding: 1px 5px;
  }

  .md :global(pre) {
    background: var(--app-canvas);
    border: 1px solid var(--app-border);
    border-radius: 10px;
    padding: 10px 12px;
    overflow-x: auto;
    margin: 0 0 8px;
  }

  .md :global(pre code) {
    background: transparent;
    padding: 0;
    font-size: 11px;
    line-height: 1.55;
  }

  .md :global(blockquote) {
    margin: 0 0 8px;
    padding: 4px 12px;
    border-left: 3px solid var(--app-accent);
    background: color-mix(in srgb, var(--app-accent) 8%, transparent);
    border-radius: 0 8px 8px 0;
    color: var(--app-text-soft);
  }

  .md :global(blockquote p) {
    margin: 0;
  }

  .md :global(table) {
    border-collapse: collapse;
    margin: 0 0 8px;
    font-size: 11.5px;
  }

  .md :global(th),
  .md :global(td) {
    border: 1px solid var(--app-border);
    padding: 4px 9px;
    text-align: left;
  }

  .md :global(th) {
    background: var(--app-surface-raised);
    font-weight: 600;
    color: var(--app-text);
  }

  .md :global(hr) {
    border: none;
    border-top: 1px solid var(--app-border);
    margin: 10px 0;
  }

  .md :global(img) {
    max-width: 100%;
    border-radius: 8px;
  }

  .md :global(strong) {
    color: var(--app-text);
    font-weight: 600;
  }

  .md :global(del) {
    color: var(--app-text-muted);
  }
</style>
