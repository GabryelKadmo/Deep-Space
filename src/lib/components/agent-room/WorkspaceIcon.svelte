<script lang="ts">
  import { Folder } from '@lucide/svelte';
  import { isLegacyEmojiIcon, workspaceIconComponent } from './workspace-icons.js';
  import { ensureCustomIconsLoaded, getCustomIconComponent } from './workspace-custom-icons.svelte.js';

  type Props = {
    name: string | null | undefined;
    size?: number;
  };

  let { name, size = 14 }: Props = $props();

  void ensureCustomIconsLoaded();

  const IconComponent = $derived(workspaceIconComponent(name) ?? (name ? getCustomIconComponent(name) : null));
  const legacyEmoji = $derived(isLegacyEmojiIcon(name) && !getCustomIconComponent(name ?? '') ? name : null);
</script>

{#if legacyEmoji}
  <span class="legacy-icon">{legacyEmoji}</span>
{:else if IconComponent}
  <IconComponent {size} />
{:else}
  <Folder {size} />
{/if}

<style>
  .legacy-icon {
    font-size: 13px;
    line-height: 1;
  }
</style>
