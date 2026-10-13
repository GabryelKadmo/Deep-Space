<script lang="ts">
  import { getCsrfToken } from '@beeblock/svelar/http';
  import { LoaderCircle, Minus, Plus, RotateCcw } from '@lucide/svelte';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import type { GitChange, GitFileHunks, GitHunkAction } from '$lib/modules/agent-room/application/services/GitService.js';
  import * as m from '$lib/paraglide/messages.js';

  type Props = {
    workspaceId: string;
    change: GitChange | null;
    onClose: () => void;
    /** Avisa a lista de alteracoes para recarregar depois de uma acao. */
    onChanged: () => void | Promise<void>;
  };

  let { workspaceId, change, onClose, onChanged }: Props = $props();

  let detail = $state<GitFileHunks | null>(null);
  let loading = $state(false);
  let busy = $state(false);
  let errorMessage = $state('');
  // Reverter um bloco nao tem desfazer: o primeiro clique so arma a acao.
  let armedRevert = $state<number | null>(null);
  let discardOpen = $state(false);

  const fileName = $derived(change?.path.split('/').at(-1) ?? '');
  const folder = $derived(change?.path.includes('/') ? change.path.slice(0, change.path.lastIndexOf('/')) : '');
  const untracked = $derived(change?.status === '?');

  function headers(): HeadersInit {
    const csrf = getCsrfToken();
    return { 'content-type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) };
  }

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, init);
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || m['git.error_api']());
    return payload.data as T;
  }

  async function load(target: GitChange) {
    loading = true;
    errorMessage = '';
    armedRevert = null;
    try {
      detail = untracked
        ? null
        : await api<GitFileHunks>(`/api/agent-room/workspaces/${workspaceId}/git/hunks?path=${encodeURIComponent(target.path)}&staged=${target.staged}`);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : m['git.error_load']();
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (change) void load(change);
    else detail = null;
  });

  async function applyHunk(index: number, action: GitHunkAction) {
    if (!change || !detail || busy) return;
    busy = true;
    errorMessage = '';
    armedRevert = null;
    try {
      detail = await api<GitFileHunks>(`/api/agent-room/workspaces/${workspaceId}/git/hunk`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ path: change.path, staged: change.staged, index, action, expectedRevision: detail.revision }),
      });
      await onChanged();
      if (!detail.hunks.length) onClose();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : m['git.error_action']();
      if (change) await load(change);
    } finally {
      busy = false;
    }
  }

  async function fileAction(endpoint: 'stage' | 'unstage' | 'discard') {
    if (!change || busy) return;
    busy = true;
    errorMessage = '';
    try {
      await api(`/api/agent-room/workspaces/${workspaceId}/git/${endpoint}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ path: change.path }),
      });
      await onChanged();
      onClose();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : m['git.error_action']();
    } finally {
      busy = false;
    }
  }

  function revert(index: number) {
    if (armedRevert !== index) {
      armedRevert = index;
      return;
    }
    void applyHunk(index, 'revert');
  }
</script>

<Dialog.Root open={change !== null} onOpenChange={(open) => !open && onClose()}>
  <Dialog.Content class="flex h-[82vh] max-h-[82vh] w-[min(1100px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
    <header class="flex flex-wrap items-center gap-2 border-b border-[var(--app-border)] px-4 py-3 pr-12">
      <div class="min-w-0 flex-1">
        <Dialog.Title class="truncate text-sm">
          <span class="git-status git-status-{change?.status === '?' ? 'U' : change?.status}">{change?.status === '?' ? 'U' : change?.status}</span>
          {fileName}
          {#if folder}<span class="ml-1 text-ui-xs font-normal text-[var(--app-text-muted)]">{folder}</span>{/if}
        </Dialog.Title>
        <Dialog.Description class="text-ui-xs">{change?.staged ? m['git.staged']() : m['git.unstaged']()}</Dialog.Description>
      </div>
      {#if change?.staged}
        <Button variant="outline" size="sm" class="h-7 text-ui-xs" disabled={busy} onclick={() => void fileAction('unstage')}><Minus />{m['git.unstage']()}</Button>
      {:else if change}
        {#if !untracked}
          <Button variant="outline" size="sm" class="h-7 text-ui-xs text-[var(--app-danger)]" disabled={busy} onclick={() => (discardOpen = true)}><RotateCcw />{m['git.discard_file']()}</Button>
        {/if}
        <Button size="sm" class="h-7 text-ui-xs" disabled={busy} onclick={() => void fileAction('stage')}><Plus />{m['git.stage']()}</Button>
      {/if}
    </header>

    {#if errorMessage}
      <button class="border-b border-[var(--app-danger)]/30 bg-[var(--app-danger)]/10 px-4 py-2 text-left text-ui-xs text-[var(--app-danger)]" onclick={() => (errorMessage = '')}>{errorMessage}</button>
    {/if}

    <div class="min-h-0 flex-1 overflow-auto bg-[var(--app-canvas)]">
      {#if loading}
        <div class="grid h-full place-items-center"><LoaderCircle class="animate-spin text-[var(--app-text-muted)]" /></div>
      {:else if untracked}
        <p class="p-6 text-center text-ui-xs text-[var(--app-text-muted)]">{m['git.new_file_hint']()}</p>
      {:else if detail?.binary}
        <p class="p-6 text-center text-ui-xs text-[var(--app-text-muted)]">{m['git.binary_hint']()}</p>
      {:else if detail && !detail.hunks.length}
        <p class="p-6 text-center text-ui-xs text-[var(--app-text-muted)]">{m['git.no_hunks']()}</p>
      {:else if detail}
        {#each detail.hunks as hunk (hunk.index)}
          <section class="git-hunk">
            <div class="git-hunk-head">
              <code class="min-w-0 flex-1 truncate">{hunk.header}</code>
              {#if change?.staged}
                <Button variant="ghost" size="sm" class="h-6 px-2 text-ui-xs" disabled={busy} onclick={() => void applyHunk(hunk.index, 'unstage')}><Minus />{m['git.unstage_hunk']()}</Button>
              {:else}
                <Button variant="ghost" size="sm" class="h-6 px-2 text-ui-xs {armedRevert === hunk.index ? 'bg-[var(--app-danger)]/15 text-[var(--app-danger)]' : ''}" disabled={busy} onclick={() => revert(hunk.index)} onblur={() => armedRevert === hunk.index && (armedRevert = null)}>
                  <RotateCcw />{armedRevert === hunk.index ? m['git.revert_hunk_confirm']() : m['git.revert_hunk']()}
                </Button>
                <Button variant="ghost" size="sm" class="h-6 px-2 text-ui-xs" disabled={busy} onclick={() => void applyHunk(hunk.index, 'stage')}><Plus />{m['git.stage_hunk']()}</Button>
              {/if}
            </div>
            <table class="git-hunk-lines">
              <tbody>
                {#each hunk.lines as line, lineIndex (lineIndex)}
                  <tr class="git-line git-line-{line.kind === '+' ? 'add' : line.kind === '-' ? 'del' : 'ctx'}">
                    <td class="git-line-no">{line.oldLine ?? ''}</td>
                    <td class="git-line-no">{line.newLine ?? ''}</td>
                    <td class="git-line-sign">{line.kind === ' ' ? '' : line.kind}</td>
                    <td class="git-line-text">{line.text}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </section>
        {/each}
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={discardOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{m['review_center.discard_title']()}</AlertDialog.Title>
      <AlertDialog.Description>{m['review_center.discard_description']({ file: change?.path ?? '' })}</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>{m['settings.cancel']()}</AlertDialog.Cancel>
      <AlertDialog.Action onclick={() => { discardOpen = false; void fileAction('discard'); }}>{m['review_center.discard_confirm']()}</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  .git-status {
    display: inline-block;
    min-width: 14px;
    margin-right: 6px;
    font-family: ui-monospace, monospace;
    font-weight: 700;
    color: var(--app-warning);
  }

  .git-status-A,
  .git-status-U {
    color: var(--app-success);
  }

  .git-status-D {
    color: var(--app-danger);
  }

  .git-hunk {
    border-bottom: 1px solid var(--app-border);
  }

  .git-hunk-head {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px 4px 12px;
    background: var(--app-surface);
    border-bottom: 1px solid var(--app-border);
    color: var(--app-text-muted);
    font-size: 11px;
  }

  .git-hunk-lines {
    width: 100%;
    border-collapse: collapse;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    line-height: 1.55;
  }

  .git-line-no {
    width: 1%;
    min-width: 42px;
    padding: 0 8px;
    text-align: right;
    color: var(--app-text-muted);
    user-select: none;
    white-space: nowrap;
  }

  .git-line-sign {
    width: 14px;
    color: var(--app-text-muted);
    user-select: none;
  }

  .git-line-text {
    padding-right: 12px;
    white-space: pre;
    color: var(--app-text);
  }

  .git-line-add {
    background: color-mix(in srgb, var(--app-success) 14%, transparent);
  }

  .git-line-add .git-line-sign {
    color: var(--app-success);
  }

  .git-line-del {
    background: color-mix(in srgb, var(--app-danger) 14%, transparent);
  }

  .git-line-del .git-line-sign {
    color: var(--app-danger);
  }
</style>
