<script lang="ts">
  import { PanelTopOpen, X } from '@lucide/svelte';
  import HeaderIconButton from './HeaderIconButton.svelte';
  import GitWorkspace from '../GitWorkspace.svelte';
  import * as m from '$lib/paraglide/messages.js';

  type Props = {
    workspaceId: string;
    onClose: () => void;
    onAddToCanvas: () => void;
  };

  let { workspaceId, onClose, onAddToCanvas }: Props = $props();
</script>

<aside class="git-panel" aria-label={m['git.title']()} data-testid="git-panel">
  <header class="panel-header">
    <h3>{m['git.title']()}</h3>
    <div class="panel-actions">
      <HeaderIconButton label={m['git.add_canvas']()} class="node-action-btn" side="left" onclick={onAddToCanvas}>
        <PanelTopOpen size={13} />
      </HeaderIconButton>
      <HeaderIconButton label={m['usage.close']()} class="node-action-btn" side="left" onclick={onClose}>
        <X size={13} />
      </HeaderIconButton>
    </div>
  </header>
  {#key workspaceId}
    <div class="panel-body"><GitWorkspace {workspaceId} compact /></div>
  {/key}
</aside>

<style>
  .git-panel {
    width: 380px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-left: 1px solid var(--app-border);
    background: var(--app-sidebar);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px 10px;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0;
    color: var(--app-text-muted);
  }

  .panel-actions {
    display: flex;
    gap: 4px;
  }

  .panel-body {
    flex: 1;
    min-height: 0;
    border-top: 1px solid var(--app-border);
  }
</style>
