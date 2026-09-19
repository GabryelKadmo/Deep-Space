<script lang="ts">
  import { Folder } from '@lucide/svelte';
  import { isLegacyEmojiIcon, workspaceIconComponent } from './workspace-icons.js';
  import { ensureCustomIconsLoaded, getCustomIconNode } from './workspace-custom-icons.svelte.js';
  import DynamicLucideIcon from './DynamicLucideIcon.svelte';

  type Props = {
    name: string | null | undefined;
    size?: number;
  };

  let { name, size = 14 }: Props = $props();

  void ensureCustomIconsLoaded();

  const IconComponent = $derived(workspaceIconComponent(name));
  const customIconNode = $derived(!IconComponent && name ? getCustomIconNode(name) : null);
  const legacyEmoji = $derived(isLegacyEmojiIcon(name) && !customIconNode ? name : null);
</script>

{#if legacyEmoji}
  <span class="legacy-icon">{legacyEmoji}</span>
{:else if IconComponent}
  <IconComponent {size} />
{:else if customIconNode}
  <DynamicLucideIcon iconNode={customIconNode} {size} />
{:else}
  <Folder {size} />
{/if}

<style>
  .legacy-icon {
    font-size: 13px;
    line-height: 1;
  }
</style>
