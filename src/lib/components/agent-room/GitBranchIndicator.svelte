<script lang="ts">
  import { GitBranch } from '@lucide/svelte';
  import * as Popover from '$lib/components/ui/popover';
  import GitWorkspace from './GitWorkspace.svelte';
  import { activeWorkspaceStore } from './active-workspace.svelte.js';
  import * as m from '$lib/paraglide/messages.js';

  type Status = {
    isRepo: boolean;
    branch: string | null;
    upstream: string | null;
    ahead: number;
    behind: number;
  };

  /** `block`: ocupa a linha inteira (sidebar do mac/Linux, que nao tem a barra de titulo do Windows). */
  let { block = false }: { block?: boolean } = $props();

  let status = $state<Status | null>(null);
  let open = $state(false);
  const workspaceId = $derived(activeWorkspaceStore.id);

  async function refresh(id: string) {
    try {
      const response = await fetch(`/api/agent-room/workspaces/${id}/git/status`);
      const payload = await response.json();
      status = response.ok && !payload.error ? (payload.data as Status) : null;
    } catch {
      status = null;
    }
  }

  $effect(() => {
    const id = workspaceId;
    status = null;
    if (!id) return;
    void refresh(id);
    const timer = setInterval(() => void refresh(id), 10_000);
    return () => clearInterval(timer);
  });

  const branchLabel = $derived(status?.branch ?? m['git.detached']());

  // O diff de um arquivo abre num dialogo por cima do popover: clicar ou focar
  // nele nao pode fechar o popover, que desmontaria o proprio dialogo.
  function keepOpenUnderDialog(event: Event) {
    if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) event.preventDefault();
  }
</script>

{#if workspaceId && status?.isRepo}
  {@const wsId = workspaceId}
  <Popover.Root bind:open>
    <Popover.Trigger
      class={block ? 'branch-indicator branch-indicator-block' : 'branch-indicator'}
      aria-label={m['git.branch_indicator_label']({ branch: branchLabel })}
    >
      <GitBranch size={12} aria-hidden="true" />
      <span class="branch-indicator-name">{branchLabel}</span>
      {#if status.upstream}
        <span class="branch-indicator-sync">{status.ahead}↑ {status.behind}↓</span>
      {/if}
    </Popover.Trigger>
    <Popover.Content class="w-auto p-0" align="end" side="bottom" sideOffset={6} onInteractOutside={keepOpenUnderDialog} onFocusOutside={keepOpenUnderDialog} onEscapeKeydown={keepOpenUnderDialog}>
      <div class="branch-indicator-panel">
        <GitWorkspace workspaceId={wsId} />
      </div>
    </Popover.Content>
  </Popover.Root>
{/if}

<style>
  :global(.branch-indicator) {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 24px;
    padding: 0 8px;
    border: 1px solid var(--app-border);
    border-radius: 6px;
    background: transparent;
    color: var(--app-text-soft);
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
  }

  :global(.branch-indicator-block) {
    width: 100%;
    height: 28px;
  }

  :global(.branch-indicator-block .branch-indicator-name) {
    flex: 1;
    max-width: none;
    text-align: left;
  }

  :global(.branch-indicator:hover) {
    background: var(--app-surface-raised);
    color: var(--app-text);
  }

  .branch-indicator-name {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .branch-indicator-sync {
    color: var(--app-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .branch-indicator-panel {
    width: 400px;
    height: 420px;
    overflow: hidden;
    border-radius: inherit;
  }
</style>
