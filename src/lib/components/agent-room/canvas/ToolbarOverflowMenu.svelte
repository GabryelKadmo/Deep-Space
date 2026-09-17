<script lang="ts">
  import { ChevronDown, MoreHorizontal, Pin } from '@lucide/svelte';
  import type { Component } from 'svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import * as m from '$lib/paraglide/messages.js';

  export type ToolbarMenuIcon = { kind: 'img'; src: string } | { kind: 'lucide'; component: Component };
  export type ToolbarMenuItem = { id: string; label: string; icon: ToolbarMenuIcon; onSelect: () => void };

  type Props = {
    items: ToolbarMenuItem[];
    pinnedIds: string[];
    minPinned: number;
    onTogglePin: (itemId: string, pinned: boolean) => void;
  };

  let { items, pinnedIds, minPinned, onTogglePin }: Props = $props();

  const pinnedSet = $derived(new Set(pinnedIds));
  const unpinnedItems = $derived(items.filter((item) => !pinnedSet.has(item.id)));
</script>

<DropdownMenu.Root>
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <DropdownMenu.Trigger
          {...props}
          data-testid="toolbar-overflow-menu"
          class="group relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-[var(--app-text-muted)] outline-none transition-[color,background-color,box-shadow] duration-150 hover:bg-[var(--app-border)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/45 data-[state=open]:bg-[var(--app-accent-soft)] data-[state=open]:text-[var(--app-accent)]"
          aria-label={m['canvas.toolbar_more_aria']()}
        >
          <MoreHorizontal size={15} aria-hidden="true" />
          <ChevronDown
            size={9}
            class="absolute right-0.5 bottom-0.5 text-[var(--app-text-muted)] transition-transform duration-150 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </DropdownMenu.Trigger>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content side="top">{m['canvas.toolbar_more']()}</Tooltip.Content>
  </Tooltip.Root>
  <DropdownMenu.Content side="top" align="end" sideOffset={10} class="toolbar-overflow-content">
    {#if unpinnedItems.length}
      {#each unpinnedItems as item (item.id)}
        <DropdownMenu.Item class="toolbar-overflow-item" textValue={item.label} onclick={item.onSelect}>
          {#if item.icon.kind === 'img'}
            <img src={item.icon.src} width="15" height="15" alt="" class="tool-icon" />
          {:else}
            <item.icon.component size={15} class="tool-icon-svg" aria-hidden="true" />
          {/if}
          <span class="toolbar-overflow-label">{item.label}</span>
        </DropdownMenu.Item>
      {/each}
      <DropdownMenu.Separator />
    {/if}
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>
        <Pin size={14} aria-hidden="true" />
        <span class="toolbar-overflow-label">{m['canvas.toolbar_pinned']({ count: String(pinnedIds.length) })}</span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent sideOffset={8} class="toolbar-pin-submenu">
        {#each items as item (item.id)}
          <DropdownMenu.CheckboxItem
            checked={pinnedSet.has(item.id)}
            disabled={pinnedSet.has(item.id) && pinnedIds.length <= minPinned}
            closeOnSelect={false}
            textValue={item.label}
            onCheckedChange={(checked: boolean) => onTogglePin(item.id, checked)}
          >
            <span class="toolbar-overflow-label">{item.label}</span>
          </DropdownMenu.CheckboxItem>
        {/each}
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  </DropdownMenu.Content>
</DropdownMenu.Root>

<style>
  :global(.toolbar-overflow-content) {
    width: min(260px, calc(100vw - 24px));
    max-height: min(480px, calc(100vh - 120px));
    padding: 6px;
    overscroll-behavior: contain;
  }

  :global(.toolbar-overflow-item) {
    gap: 8px;
  }

  :global(.toolbar-overflow-label) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.toolbar-pin-submenu) {
    width: 210px;
    max-height: min(360px, calc(100vh - 24px));
    overflow-y: auto;
    overscroll-behavior: contain;
  }
</style>
