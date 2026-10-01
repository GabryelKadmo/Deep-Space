<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import { Button } from '$lib/components/ui/button';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { getCsrfToken } from '@beeblock/svelar/http';
  import { groupConsoleCommands, type ConsoleCommand } from '$lib/modules/agent-room/domain/console-commands.js';
  import * as m from '$lib/paraglide/messages.js';

  let {
    open,
    workspaceId,
    existing,
    onImported,
    onClose,
  }: {
    open: boolean;
    workspaceId: string;
    existing: ConsoleCommand[];
    onImported: (result: { imported: ConsoleCommand[]; skipped: number }) => void;
    onClose: () => void;
  } = $props();

  type WorkspaceOption = { id: string; name: string };

  let workspaces = $state<WorkspaceOption[]>([]);
  let sourceId = $state('');
  let commands = $state<ConsoleCommand[]>([]);
  let chosen = $state<Record<string, boolean>>({});
  let loading = $state(false);
  let importing = $state(false);
  let error = $state('');
  let lastOpen = false;

  const fingerprint = (command: Pick<ConsoleCommand, 'folder' | 'name' | 'command'>) => `${command.folder}\u0000${command.name}\u0000${command.command}`;
  const present = $derived(new Set(existing.map(fingerprint)));
  const groups = $derived(groupConsoleCommands(commands));
  const selectedIds = $derived(commands.filter((command) => chosen[command.id] && !present.has(fingerprint(command))).map((command) => command.id));
  const sourceName = $derived(workspaces.find((workspace) => workspace.id === sourceId)?.name ?? '');

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const csrf = getCsrfToken();
    const response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(init.headers ?? {}) },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? 'request_failed');
    return payload.data as T;
  }

  $effect(() => {
    if (open && !lastOpen) void loadWorkspaces();
    lastOpen = open;
  });

  async function loadWorkspaces() {
    sourceId = '';
    commands = [];
    chosen = {};
    error = '';
    loading = true;
    try {
      const all = await request<WorkspaceOption[]>('/api/agent-room/workspaces');
      workspaces = all.filter((workspace) => workspace.id !== workspaceId).map(({ id, name }) => ({ id, name }));
    } catch {
      error = m['console.import_load_error']();
    } finally {
      loading = false;
    }
  }

  async function pickSource(id: string) {
    sourceId = id;
    commands = [];
    error = '';
    loading = true;
    try {
      commands = await request<ConsoleCommand[]>(`/api/agent-room/workspaces/${id}/console-commands`);
      chosen = Object.fromEntries(commands.map((command) => [command.id, !present.has(fingerprint(command))]));
    } catch {
      error = m['console.import_load_error']();
    } finally {
      loading = false;
    }
  }

  async function runImport() {
    if (!selectedIds.length || importing) return;
    importing = true;
    error = '';
    try {
      const result = await request<{ imported: ConsoleCommand[]; skipped: number }>(
        `/api/agent-room/workspaces/${workspaceId}/console-commands/import`,
        { method: 'POST', body: JSON.stringify({ sourceWorkspaceId: sourceId, commandIds: selectedIds }) },
      );
      onImported(result);
    } catch (failure) {
      error = failure instanceof Error && failure.message === 'CONSOLE_COMMAND_LIMIT'
        ? m['console.import_limit']()
        : m['console.import_error']();
    } finally {
      importing = false;
    }
  }
</script>

<Dialog.Root {open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
  <Dialog.Content class="max-w-[480px]">
    <Dialog.Header>
      <Dialog.Title>{m['console.import_title']()}</Dialog.Title>
      <Dialog.Description>{m['console.import_desc']()}</Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-3">
      <label class="grid gap-1.5 text-ui-xs text-[var(--app-text-soft)]">
        {m['console.import_source']()}
        <Select.Root type="single" value={sourceId} onValueChange={(value: string) => void pickSource(value)} disabled={!workspaces.length}>
          <Select.Trigger class="w-full" data-testid="console-import-source">
            {sourceName || (workspaces.length ? m['console.import_pick_workspace']() : m['console.import_no_workspaces']())}
          </Select.Trigger>
          <Select.Content>
            {#each workspaces as workspace (workspace.id)}
              <Select.Item value={workspace.id} label={workspace.name} />
            {/each}
          </Select.Content>
        </Select.Root>
      </label>

      {#if sourceId}
        <div class="max-h-[280px] overflow-y-auto rounded-md border border-[var(--app-border)]" data-testid="console-import-list">
          {#if loading}
            <p class="px-3 py-4 text-ui-xs text-[var(--app-text-muted)]">{m['console.loading']()}</p>
          {:else if !commands.length}
            <p class="px-3 py-4 text-ui-xs text-[var(--app-text-muted)]">{m['console.import_empty']()}</p>
          {:else}
            {#each groups as group (group.folder)}
              {#if group.folder}
                <p class="border-b border-[var(--app-border)] px-3 pt-2 pb-1 text-ui-xs font-semibold text-[var(--app-text-soft)]">{group.folder}</p>
              {/if}
              {#each group.commands as command (command.id)}
                {@const already = present.has(fingerprint(command))}
                <label class="flex items-center gap-2.5 px-3 py-1.5 text-ui-xs" class:cursor-pointer={!already} class:opacity-60={already}>
                  <Checkbox
                    checked={already || Boolean(chosen[command.id])}
                    disabled={already}
                    onCheckedChange={(checked: boolean) => (chosen = { ...chosen, [command.id]: checked })}
                  />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-medium text-[var(--app-text)]">{command.name}</span>
                    <span class="block truncate font-mono text-[var(--app-text-muted)]">{command.command}</span>
                  </span>
                  {#if already}<span class="shrink-0 text-[var(--app-text-muted)]">{m['console.import_already']()}</span>{/if}
                </label>
              {/each}
            {/each}
          {/if}
        </div>
      {/if}

      {#if error}<p class="text-ui-xs text-[var(--app-danger)]" role="alert">{error}</p>{/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={onClose}>{m['dlg.cancel']()}</Button>
      <Button disabled={!selectedIds.length || importing} onclick={() => void runImport()} data-testid="console-import-confirm">
        {importing ? m['console.importing']() : m['console.import_action']({ count: selectedIds.length })}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
