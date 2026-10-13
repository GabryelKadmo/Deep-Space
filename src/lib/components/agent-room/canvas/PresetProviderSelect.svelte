<script lang="ts">
  import * as Select from '$lib/components/ui/select';
  import type { AgentProviderInfo } from '$lib/modules/agent-room/domain/types.js';
  import { providerIcons } from '$lib/modules/agent-room/domain/provider-icons.js';
  import * as m from '$lib/paraglide/messages.js';
  import { presetProviderOptions } from '../agent-provider-choice.js';

  type Props = { providers: AgentProviderInfo[]; value: string; onChange: (value: string) => void };

  let { providers, value, onChange }: Props = $props();

  const options = $derived(presetProviderOptions(providers));
  const selected = $derived(options.find((provider) => provider.id === value));
  const noneDetected = $derived(providers.length > 0 && !providers.some((provider) => provider.installed === true));
</script>

<div class="space-y-2">
  <span class="text-sm font-medium leading-none">{m['dlg.preset_provider_label']()}</span>
  <Select.Root type="single" {value} onValueChange={onChange}>
    <Select.Trigger class="w-full" aria-label={m['dlg.preset_provider_label']()}>
      <span class="provider-option">
        {#if providerIcons[value]}<img src={providerIcons[value]} width="14" height="14" alt="" />{/if}
        {selected?.displayName ?? value}
      </span>
    </Select.Trigger>
    <Select.Content>
      {#each options as provider (provider.id)}
        <Select.Item value={provider.id} label={provider.displayName}>
          <span class="provider-option">
            {#if providerIcons[provider.id]}<img src={providerIcons[provider.id]} width="14" height="14" alt="" />{/if}
            {provider.displayName}
          </span>
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
  <p class="text-xs text-muted-foreground">
    {noneDetected ? m['dlg.preset_provider_none']() : m['dlg.preset_provider_hint']()}
  </p>
</div>

<style>
  .provider-option {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
</style>
