<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import { FilePen, PanelLeftClose, PanelLeftOpen, Plug, RefreshCw, Server, Unplug, X } from '@lucide/svelte';
  import { toast } from '@beeblock/svelar/ui';
  import { getCsrfToken } from '@beeblock/svelar/http';
  import { Button } from '$lib/components/ui/button';
  import TerminalNode from '../TerminalNode.svelte';
  import NodeShell, { type NodeConnection } from './NodeShell.svelte';
  import HeaderIconButton from './HeaderIconButton.svelte';
  import { isSafeSshAlias, sshHostLabel, type SshHost, type SshHostList } from '$lib/modules/agent-room/domain/ssh-config.js';
  import { DEFAULT_TERMINAL_THEME, normalizeTerminalTheme } from '../terminal-themes.js';
  import { getAppSettings } from '../app-settings.svelte.js';
  import * as m from '$lib/paraglide/messages.js';

  type SshPayload = {
    /** Sessao viva de cada servidor, para o log voltar de onde parou. */
    sessions?: Record<string, string>;
    selectedHost?: string | null;
    listOpen?: boolean;
  };

  type SshNodeData = {
    title: string;
    workspaceId: string;
    workspaceName?: string;
    workspaceRoot?: string;
    payload: SshPayload;
    onDelete: (id: string) => void;
    onPayloadChange?: (id: string, payload: Partial<SshPayload>) => void | Promise<void>;
    onResize?: (id: string, params: { x: number; y: number; width: number; height: number }) => void;
    connections?: NodeConnection[];
    onJumpToNode?: (nodeId: string) => void;
    onRemoveConnection?: (edgeId: string) => void;
    onRename?: (id: string, title: string) => void;
    onOpenFile?: (path: string) => void;
  };

  let { id, data, selected } = $props<NodeProps & { data: SshNodeData }>();

  let hosts = $state<SshHost[]>([]);
  let configPath = $state('');
  let configExists = $state(true);
  let loading = $state(true);
  let loadError = $state(false);
  let listOpen = $state(data.payload.listOpen !== false);
  let selectedAlias = $state<string | null>(data.payload.selectedHost ?? null);
  let sessions = $state<Record<string, string>>({ ...(data.payload.sessions ?? {}) });
  let connected = $state<Record<string, boolean>>({});
  let terminalTheme = $state(DEFAULT_TERMINAL_THEME);
  let openingConfig = $state(false);

  type DesktopBridge = { openPath?: (path: string) => Promise<string> };
  const desktop = typeof window === 'undefined'
    ? undefined
    : (window as typeof window & { deepspaceDesktop?: DesktopBridge }).deepspaceDesktop;

  const selectedHost = $derived(hosts.find((host) => host.alias === selectedAlias) ?? null);

  async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const csrf = getCsrfToken();
    const response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(init.headers ?? {}) },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error ?? 'request_failed');
    return payload.data as T;
  }

  async function load() {
    loading = true;
    loadError = false;
    try {
      const list = await api<SshHostList>('/api/agent-room/ssh-hosts');
      hosts = list.hosts;
      configPath = list.configPath;
      configExists = list.exists;
      // A conexao morre com o app fechado: reanexar so mostraria "sessao nao
      // encontrada", entao o que nao existe mais volta como desconectado.
      const aliases = new Set(hosts.map((host) => host.alias));
      const checked = await Promise.all(Object.entries(sessions).map(async ([alias, sessionId]) => {
        if (!aliases.has(alias)) return null;
        const status = await api<{ exists: boolean; running: boolean }>(`/api/agent-room/pty-sessions/${sessionId}`)
          .catch(() => ({ exists: false, running: false }));
        return status.exists ? { alias, sessionId, running: status.running } : null;
      }));
      const alive = checked.filter((entry) => entry !== null);
      connected = Object.fromEntries(alive.map((entry) => [entry.alias, entry.running]));
      if (alive.length !== Object.keys(sessions).length) {
        const pruned = Object.fromEntries(alive.map((entry) => [entry.alias, entry.sessionId]));
        sessions = pruned;
        void persist({ sessions: pruned });
      }
    } catch {
      loadError = true;
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

  // Abre o ~/.ssh/config no editor padrao do sistema: o editor do app so mexe
  // em arquivos do workspace, e a pasta das chaves SSH fica de fora de proposito.
  async function editConfig() {
    if (openingConfig) return;
    openingConfig = true;
    try {
      const result = await api<{ configPath: string; created: boolean }>('/api/agent-room/ssh-hosts/config', { method: 'POST' });
      configPath = result.configPath;
      if (result.created) void load();
      if (!desktop?.openPath) {
        toast.info(m['ssh.edit_config_browser']({ path: result.configPath }));
        return;
      }
      const failure = await desktop.openPath(result.configPath);
      if (failure) toast.error(m['ssh.edit_config_failed']());
    } catch {
      toast.error(m['ssh.edit_config_failed']());
    } finally {
      openingConfig = false;
    }
  }

  function persist(partial: Partial<SshPayload>) {
    return data.onPayloadChange?.(id, partial);
  }

  function select(alias: string) {
    selectedAlias = alias;
    void persist({ selectedHost: alias });
  }

  function toggleList() {
    listOpen = !listOpen;
    void persist({ listOpen });
  }

  function connect(host: SshHost) {
    if (!isSafeSshAlias(host.alias)) return;
    connected = { ...connected, [host.alias]: true };
    select(host.alias);
  }

  function disconnect(host: SshHost) {
    const sessionId = sessions[host.alias];
    connected = { ...connected, [host.alias]: false };
    const next = { ...sessions };
    delete next[host.alias];
    sessions = next;
    void persist({ sessions: next });
    if (sessionId) void api(`/api/agent-room/pty-sessions/${sessionId}`, { method: 'DELETE' }).catch(() => undefined);
  }

  function handleSessionCreated(host: SshHost, sessionId: string) {
    const next = { ...sessions, [host.alias]: sessionId };
    sessions = next;
    connected = { ...connected, [host.alias]: true };
    void persist({ sessions: next });
  }
</script>

<NodeShell
  {id}
  {selected}
  class="canvas-ssh"
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
  {#snippet icon()}<Server size={13} />{/snippet}
  {#snippet title()}{data.title || m['ssh.title']()}{/snippet}
  {#snippet actions()}
    <HeaderIconButton class="node-action-btn" label={m['ssh.edit_config']()} side="left" onclick={() => void editConfig()}>
      <FilePen size={13} />
    </HeaderIconButton>
    <HeaderIconButton class="node-action-btn" label={m['ssh.reload']()} side="left" onclick={() => void load()}>
      <RefreshCw size={13} />
    </HeaderIconButton>
    <HeaderIconButton class="node-action-btn" label={listOpen ? m['ssh.hide_list']() : m['ssh.show_list']()} side="left" onclick={toggleList}>
      {#if listOpen}<PanelLeftClose size={13} />{:else}<PanelLeftOpen size={13} />{/if}
    </HeaderIconButton>
    <HeaderIconButton class="node-action-btn" label={m['files.remove']()} danger side="left" onclick={() => data.onDelete(id)}>
      <X size={13} />
    </HeaderIconButton>
  {/snippet}

  <div class="ssh-body nodrag nowheel">
    {#if listOpen}
      <aside class="ssh-list" aria-label={m['ssh.list_aria']()} data-testid="ssh-host-list">
        {#if loading}
          <p class="ssh-empty">{m['ssh.loading']()}</p>
        {:else if loadError}
          <p class="ssh-empty">{m['ssh.load_failed']()}</p>
        {:else if !hosts.length}
          <div class="ssh-empty">
            <p>{configExists ? m['ssh.empty_hosts']() : m['ssh.no_config']()}</p>
            <code class="ssh-path">{configPath}</code>
            <pre class="ssh-example">Host vps-1
    HostName 203.0.113.10
    User deploy
    IdentityFile ~/.ssh/id_ed25519</pre>
          </div>
        {:else}
          {#each hosts as host (host.alias)}
            <div class="ssh-item" class:active={selectedAlias === host.alias}>
              <button class="ssh-item-main" onclick={() => select(host.alias)} ondblclick={() => connect(host)}>
                <span class="ssh-dot" class:on={Boolean(connected[host.alias])} aria-hidden="true"></span>
                <span class="ssh-text">
                  <span class="ssh-name">{host.alias}</span>
                  <span class="ssh-target">{sshHostLabel(host)}</span>
                </span>
              </button>
              <span class="ssh-item-actions">
                {#if connected[host.alias]}
                  <button class="ssh-action stop" title={m['ssh.disconnect']()} aria-label={m['ssh.disconnect']()} onclick={() => disconnect(host)}>
                    <Unplug size={12} />
                  </button>
                {:else}
                  <button class="ssh-action run" title={m['ssh.connect']()} aria-label={m['ssh.connect']()} onclick={() => connect(host)}>
                    <Plug size={12} />
                  </button>
                {/if}
              </span>
            </div>
          {/each}
        {/if}
      </aside>
    {/if}

    <div class="ssh-output">
      {#if selectedHost && (sessions[selectedHost.alias] || connected[selectedHost.alias])}
        {#key selectedHost.alias}
          <TerminalNode
            sessionId={sessions[selectedHost.alias]}
            createRequest={sessions[selectedHost.alias] ? undefined : {
              command: 'ssh',
              args: [selectedHost.alias],
              cwd: data.workspaceRoot ?? '',
              workspaceRoot: data.workspaceRoot,
              multiSession: true,
            }}
            workspaceId={data.workspaceId}
            nodeId={id}
            sessionLabel={selectedHost.alias}
            workspaceName={data.workspaceName}
            themeName={terminalTheme}
            voiceControls={false}
            onSessionCreated={(sessionId) => handleSessionCreated(selectedHost, sessionId)}
            onExit={() => (connected = { ...connected, [selectedHost.alias]: false })}
            onRespawn={() => disconnect(selectedHost)}
            onOpenPath={(path) => data.onOpenFile?.(path)}
          />
        {/key}
      {:else if selectedHost}
        <div class="ssh-placeholder">
          <p class="ssh-placeholder-name">{selectedHost.alias}</p>
          <p class="ssh-placeholder-target">{sshHostLabel(selectedHost)}</p>
          <Button variant="outline" size="sm" class="mt-2 gap-1.5" onclick={() => connect(selectedHost)} data-testid="ssh-connect">
            <Plug size={13} />{m['ssh.connect']()}
          </Button>
        </div>
      {:else}
        <p class="ssh-placeholder-hint">{m['ssh.pick_host']()}</p>
      {/if}
    </div>
  </div>
</NodeShell>

<style>
  .ssh-body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .ssh-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: 210px;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 4px;
    border-right: 1px solid var(--app-border);
    background: var(--app-surface-subtle);
  }

  .ssh-empty {
    margin: 0;
    padding: 10px 8px;
    font-size: 11px;
    color: var(--app-text-muted);
  }

  .ssh-empty p {
    margin: 0 0 6px;
  }

  .ssh-path {
    display: block;
    margin-bottom: 6px;
    font-size: 10px;
    word-break: break-all;
    color: var(--app-text-soft);
  }

  .ssh-example {
    margin: 0;
    padding: 6px;
    border-radius: 6px;
    background: var(--app-surface);
    font-size: 10px;
    line-height: 1.4;
    color: var(--app-text-soft);
  }

  .ssh-item {
    display: flex;
    align-items: center;
    border-radius: 6px;
  }

  .ssh-item:hover,
  .ssh-item.active {
    background: var(--app-surface-raised);
  }

  .ssh-item-main {
    display: flex;
    align-items: center;
    gap: 7px;
    flex: 1;
    min-width: 0;
    padding: 5px 6px;
    border: 0;
    background: transparent;
    color: var(--app-text);
    text-align: left;
    cursor: pointer;
  }

  .ssh-dot {
    width: 6px;
    height: 6px;
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--app-border);
  }

  .ssh-dot.on {
    background: var(--app-success);
  }

  .ssh-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .ssh-name,
  .ssh-target {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ssh-name {
    font-size: 11px;
    font-weight: 600;
  }

  .ssh-target {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 10px;
    color: var(--app-text-muted);
  }

  .ssh-item-actions {
    display: none;
    padding-right: 4px;
  }

  .ssh-item:hover .ssh-item-actions,
  .ssh-item.active .ssh-item-actions {
    display: flex;
  }

  .ssh-action {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--app-text-muted);
    cursor: pointer;
  }

  .ssh-action:hover {
    background: var(--app-surface);
    color: var(--app-text);
  }

  .ssh-action.run:hover,
  .ssh-action.stop {
    color: var(--app-success);
  }

  .ssh-action.stop:hover {
    color: var(--app-danger);
  }

  .ssh-output {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  .ssh-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin: auto;
    text-align: center;
  }

  .ssh-placeholder p,
  .ssh-placeholder-hint {
    margin: 0;
  }

  .ssh-placeholder-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--app-text);
  }

  .ssh-placeholder-target {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 11px;
    color: var(--app-text-muted);
  }

  .ssh-placeholder-hint {
    margin: auto;
    font-size: 11px;
    color: var(--app-text-muted);
  }

</style>
