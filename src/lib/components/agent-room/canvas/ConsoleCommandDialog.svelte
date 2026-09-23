<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Switch } from '$lib/components/ui/switch';
  import { Textarea } from '$lib/components/ui/textarea';
  import {
    MAX_CONSOLE_COMMAND_FOLDER,
    MAX_CONSOLE_COMMAND_LENGTH,
    MAX_CONSOLE_COMMAND_NAME,
    type ConsoleCommand,
  } from '$lib/modules/agent-room/domain/console-commands.js';
  import * as m from '$lib/paraglide/messages.js';

  let {
    open,
    command,
    folders,
    onSave,
    onClose,
  }: {
    open: boolean;
    command: ConsoleCommand | null;
    folders: string[];
    onSave: (input: { name: string; command: string; folder: string; runOnOpen: boolean }) => void | Promise<void>;
    onClose: () => void;
  } = $props();

  let name = $state('');
  let line = $state('');
  let folder = $state('');
  let runOnOpen = $state(false);
  let lastOpen = false;

  $effect(() => {
    if (open && !lastOpen) {
      name = command?.name ?? '';
      line = command?.command ?? '';
      folder = command?.folder ?? '';
      runOnOpen = command?.runOnOpen ?? false;
    }
    lastOpen = open;
  });

  const valid = $derived(name.trim().length > 0 && line.trim().length > 0);

  function save() {
    if (!valid) return;
    void onSave({ name: name.trim(), command: line.trim(), folder: folder.trim(), runOnOpen });
  }
</script>

<Dialog.Root {open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
  <Dialog.Content class="max-w-[440px]">
    <Dialog.Header>
      <Dialog.Title>{command ? m['console.edit_title']() : m['console.new_title']()}</Dialog.Title>
      <Dialog.Description>{m['console.dialog_desc']()}</Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-3">
      <label class="grid gap-1.5 text-ui-xs text-[var(--app-text-soft)]">
        {m['console.field_name']()}
        <Input bind:value={name} maxlength={MAX_CONSOLE_COMMAND_NAME} placeholder={m['ph.console_name']()} />
      </label>

      <label class="grid gap-1.5 text-ui-xs text-[var(--app-text-soft)]">
        {m['console.field_command']()}
        <Textarea bind:value={line} rows={3} maxlength={MAX_CONSOLE_COMMAND_LENGTH} placeholder={m['ph.console_command']()} spellcheck="false" />
      </label>

      <label class="grid gap-1.5 text-ui-xs text-[var(--app-text-soft)]">
        {m['console.field_folder']()}
        <Input bind:value={folder} maxlength={MAX_CONSOLE_COMMAND_FOLDER} list="console-folders" placeholder={m['ph.console_folder']()} />
        <datalist id="console-folders">
          {#each folders as option (option)}<option value={option}></option>{/each}
        </datalist>
      </label>

      <div class="flex items-center justify-between gap-3 rounded-md border border-[var(--app-border)] px-3 py-2">
        <span class="text-ui-xs text-[var(--app-text-soft)]">{m['console.field_run_on_open']()}</span>
        <Switch checked={runOnOpen} onCheckedChange={(checked: boolean) => (runOnOpen = checked)} />
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" size="sm" onclick={onClose}>{m['console.cancel']()}</Button>
      <Button size="sm" disabled={!valid} onclick={save}>{m['console.save']()}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
