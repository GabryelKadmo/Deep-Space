<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Pencil, Play, Plus, Square, Terminal, Trash2, X } from '@lucide/svelte';
  import { toast } from '@beeblock/svelar/ui';
  import { getCsrfToken } from '@beeblock/svelar/http';
  import TerminalNode from '../TerminalNode.svelte';
  import NodeShell, { type NodeConnection } from './NodeShell.svelte';
  import HeaderIconButton from './HeaderIconButton.svelte';
  import ConsoleCommandDialog from './ConsoleCommandDialog.svelte';
  import { groupConsoleCommands, type ConsoleCommand } from '$lib/modules/agent-room/domain/console-commands.js';
  import { DEFAULT_TERMINAL_THEME, normalizeTerminalTheme } from '../terminal-themes.js';
  import { getAppSettings } from '../app-settings.svelte.js';
  import * as m from '$lib/paraglide/messages.js';

  type ConsolePayload = {
    /** Sessao viva de cada comando, para o log voltar de onde parou. */
    sessions?: Record<string, string>;
    selectedCommandId?: string | null;
    listOpen?: boolean;
  };

  type ConsoleNodeData = {
    title: string;
    workspaceId: string;
    workspaceName?: string;
    workspaceRoot?: string;
    payload: ConsolePayload;
    onDelete: (id: string) => void;
    onPayloadChange?: (id: string, payload: Partial<ConsolePayload>) => void | Promise<void>;
    onResize?: (id: string, params: { x: number; y: number; width: number; height: number }) => void;
    connections?: NodeConnection[];
    onJumpToNode?: (nodeId: string) => void;
    onRemoveConnection?: (edgeId: string) => void;
    onRename?: (id: string, title: string) => void;
    onOpenFile?: (path: string) => void;
  };

  let { id, data, selected } = $props<NodeProps & { data: ConsoleNodeData }>();

  let commands = $state<ConsoleCommand[]>([]);
  let loading = $state(true);
  let collapsedFolders = $state<Record<string, boolean>>({});
  let listOpen = $state(data.payload.listOpen !== false);
  let selectedId = $state<string | null>(data.payload.selectedCommandId ?? null);
  let sessions = $state<Record<string, string>>({ ...(data.payload.sessions ?? {}) });
  let running = $state<Record<string, boolean>>({});
  let editing = $state<ConsoleCommand | null>(null);
  let creating = $state(false);
  let terminalTheme = $state(DEFAULT_TERMINAL_THEME);

  const groups = $derived(groupConsoleCommands(commands));
  const selected_ = $derived(commands.find((command) => command.id === selectedId) ?? null);
  const base = $derived(`/api/agent-room/workspaces/${data.workspaceId}/console-commands`);

  async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const csrf = getCsrfToken();
    const response = await fetch(path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        ...(init.headers ?? {}),
      },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error ?? 'request_failed');
    return payload.data as T;
  }

  async function load() {
    loading = true;
    try {
      commands = await api<ConsoleCommand[]>(base);
      // Um comando apagado por fora nao deve deixar sessao pendurada no payload.
      const ids = new Set(commands.map((command) => command.id));
      const pruned = Object.fromEntries(Object.entries(sessions).filter(([commandId]) => ids.has(commandId)));
      if (Object.keys(pruned).length !== Object.keys(sessions).length) {
        sessions = pruned;
        void persist({ sessions: pruned });
      }
      if (selectedId && !ids.has(selectedId)) select(null);
      for (const command of commands) {
        if (command.runOnOpen && !sessions[command.id]) start(command);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m['console.load_failed']());
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void load();
  });

  $effect(() => {
    void getAppSettings().then((settings) => {
      terminalTheme = normalizeTerminalTheme(settings.terminalTheme);
    });
  });

  function persist(partial: Partial<ConsolePayload>) {
    return data.onPayloadChange?.(id, partial);
  }

  function select(commandId: string | null) {
    selectedId = commandId;
    void persist({ selectedCommandId: commandId });
  }

  function toggleFolder(folder: string) {
    collapsedFolders = { ...collapsedFolders, [folder]: !collapsedFolders[folder] };
  }

  function toggleList() {
    listOpen = !listOpen;
    void persist({ listOpen });
  }

  /** Play: seleciona o comando e monta o terminal dele, que cria a sessao. */
  function start(command: ConsoleCommand) {
    running = { ...running, [command.id]: true };
    select(command.id);
  }

  function stop(command: ConsoleCommand) {
    const sessionId = sessions[command.id];
    running = { ...running, [command.id]: false };
    const next = { ...sessions };
    delete next[command.id];
    sessions = next;
    void persist({ sessions: next });
    if (!sessionId) return;
    void api(`/api/agent-room/pty-sessions/${sessionId}`, { method: 'DELETE' }).catch(() => undefined);
  }

  function handleSessionCreated(command: ConsoleCommand, sessionId: string) {
    const next = { ...sessions, [command.id]: sessionId };
    sessions = next;
    running = { ...running, [command.id]: true };
    void persist({ sessions: next });
  }

  function handleExit(command: ConsoleCommand) {
    running = { ...running, [command.id]: false };
  }

  async function saveCommand(input: { name: string; command: string; folder: string; runOnOpen: boolean }) {
    try {
      if (editing) {
        const updated = await api<ConsoleCommand>(`${base}/${editing.id}`, { method: 'PATCH', body: JSON.stringify(input) });
        commands = commands.map((command) => (command.id === updated.id ? updated : command));
      } else {
        const created = await api<ConsoleCommand>(base, { method: 'POST', body: JSON.stringify(input) });
        commands = [...commands, created];
      }
      editing = null;
      creating = false;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m['console.save_failed']());
    }
  }

  async function removeCommand(command: ConsoleCommand) {
    try {
      await api(`${base}/${command.id}`, { method: 'DELETE' });
      if (running[command.id]) stop(command);
      commands = commands.filter((item) => item.id !== command.id);
      if (selectedId === command.id) select(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m['console.delete_failed']());
    }
  }
</script>

<NodeShell
  {id}
  {selected}
  class="canvas-console"
  accent="var(--app-accent)"
  minWidth={480}
  minHeight={280}
  onResize={data.onResize}
  connections={data.connections ?? []}
  titleText={data.title}
  onRename={data.onRename}
  onJumpToNode={data.onJumpToNode}
  onRemoveConnection={data.onRemoveConnection}
>
  {#snippet icon()}<Terminal size={13} />{/snippet}
  {#snippet title()}{data.title || m['console.title']()}{/snippet}
  {#snippet actions()}
    <HeaderIconButton class="node-action-btn" label={m['console.new_command']()} side="left" onclick={() => { editing = null; creating = true; }}>
      <Plus size={13} />
    </HeaderIconButton>
    <HeaderIconButton class="node-action-btn" label={listOpen ? m['console.hide_list']() : m['console.show_list']()} side="left" onclick={toggleList}>
      {#if listOpen}<PanelLeftClose size={13} />{:else}<PanelLeftOpen size={13} />{/if}
    </HeaderIconButton>
    <HeaderIconButton class="node-action-btn" label={m['files.remove']()} danger side="left" onclick={() => data.onDelete(id)}>
      <X size={13} />
    </HeaderIconButton>
  {/snippet}

  <div class="console-body nodrag nowheel">
    {#if listOpen}
      <aside class="console-list" aria-label={m['console.list_aria']()}>
        {#if loading}
          <p class="console-empty">{m['console.loading']()}</p>
        {:else if !commands.length}
          <p class="console-empty">{m['console.empty']()}</p>
        {:else}
          {#each groups as group (group.folder)}
            {#if group.folder}
              <button class="console-folder" onclick={() => toggleFolder(group.folder)}>
                {#if collapsedFolders[group.folder]}<ChevronRight size={12} />{:else}<ChevronDown size={12} />{/if}
                <span class="console-folder-name">{group.folder}</span>
              </button>
            {/if}
            {#if !collapsedFolders[group.folder]}
              {#each group.commands as command (command.id)}
                <div class="console-item" class:active={selectedId === command.id} class:nested={Boolean(group.folder)}>
                  <button class="console-item-main" onclick={() => select(command.id)} ondblclick={() => start(command)}>
                    <span class="console-dot" class:on={Boolean(running[command.id])} aria-hidden="true"></span>
                    <span class="console-name">{command.name}</span>
                    <span class="console-command">{command.command}</span>
                  </button>
                  <span class="console-item-actions">
                    {#if running[command.id]}
                      <button class="console-action stop" title={m['console.stop']()} aria-label={m['console.stop']()} onclick={() => stop(command)}>
                        <Square size={11} />
                      </button>
                    {:else}
                      <button class="console-action run" title={m['console.run']()} aria-label={m['console.run']()} onclick={() => start(command)}>
                        <Play size={11} />
                      </button>
                    {/if}
                    <button class="console-action" title={m['console.edit']()} aria-label={m['console.edit']()} onclick={() => { creating = false; editing = command; }}>
                      <Pencil size={11} />
                    </button>
                    <button class="console-action danger" title={m['console.delete']()} aria-label={m['console.delete']()} onclick={() => removeCommand(command)}>
                      <Trash2 size={11} />
                    </button>
                  </span>
                </div>
              {/each}
            {/if}
          {/each}
        {/if}
      </aside>
    {/if}

    <div class="console-output">
      {#if selected_ && (sessions[selected_.id] || running[selected_.id])}
        {#key selected_.id}
          <TerminalNode
            sessionId={sessions[selected_.id]}
            createRequest={sessions[selected_.id] ? undefined : {
              command: selected_.command,
              cwd: data.workspaceRoot ?? '',
              workspaceRoot: data.workspaceRoot,
              multiSession: true,
              shellLine: true,
            }}
            workspaceId={data.workspaceId}
            nodeId={id}
            sessionLabel={selected_.name}
            workspaceName={data.workspaceName}
            themeName={terminalTheme}
            voiceControls={false}
            onSessionCreated={(sessionId) => handleSessionCreated(selected_, sessionId)}
            onExit={() => handleExit(selected_)}
            onOpenPath={(path) => data.onOpenFile?.(path)}
          />
        {/key}
      {:else if selected_}
        <p class="console-placeholder">{m['console.stopped']()}</p>
      {:else}
        <p class="console-placeholder">{m['console.pick_command']()}</p>
      {/if}
    </div>
  </div>
</NodeShell>

<ConsoleCommandDialog
  open={creating || editing !== null}
  command={editing}
  folders={groups.map((group) => group.folder).filter(Boolean)}
  onSave={saveCommand}
  onClose={() => { creating = false; editing = null; }}
/>

<style>
  .console-body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .console-list {
    display: flex;
    flex-direction: column;
    width: 190px;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 4px;
    border-right: 1px solid var(--app-border);
    background: var(--app-surface-subtle);
  }

  .console-empty,
  .console-placeholder {
    margin: 0;
    padding: 10px 8px;
    font-size: 11px;
    color: var(--app-text-muted);
  }

  .console-placeholder {
    align-self: center;
    margin: auto;
  }

  .console-folder {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 4px 6px;
    border: 0;
    background: transparent;
    color: var(--app-text-soft);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .console-folder-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .console-item {
    display: flex;
    align-items: center;
    border-radius: 6px;
  }

  .console-item.nested .console-item-main {
    padding-left: 16px;
  }

  .console-item:hover,
  .console-item.active {
    background: var(--app-surface-raised);
  }

  .console-item-main {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 1;
    min-width: 0;
    padding: 4px 6px;
    border: 0;
    background: transparent;
    color: var(--app-text);
    font-size: 11px;
    text-align: left;
    cursor: pointer;
  }

  .console-dot {
    width: 6px;
    height: 6px;
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--app-border);
  }

  .console-dot.on {
    background: var(--app-success);
  }

  .console-name {
    flex-shrink: 0;
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .console-command {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--app-text-muted);
  }

  .console-item-actions {
    display: none;
    align-items: center;
    gap: 1px;
    padding-right: 4px;
  }

  .console-item:hover .console-item-actions,
  .console-item.active .console-item-actions {
    display: flex;
  }

  .console-action {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--app-text-muted);
    cursor: pointer;
  }

  .console-action:hover {
    background: var(--app-surface);
    color: var(--app-text);
  }

  .console-action.run:hover {
    color: var(--app-success);
  }

  .console-action.stop {
    color: var(--app-success);
  }

  .console-action.danger:hover {
    color: var(--app-danger);
  }

  .console-output {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
</style>
