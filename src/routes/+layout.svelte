<script lang="ts">
  import '../app.css';
  import { Toaster, toast, Seo } from '@beeblock/svelar/ui';
  import { getCsrfToken, registerToast } from '@beeblock/svelar/http';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import UpdateNotifier from '$lib/components/agent-room/UpdateNotifier.svelte';
  import GlobalDictation from '$lib/components/agent-room/GlobalDictation.svelte';
  import DesktopTitlebar from '$lib/components/agent-room/DesktopTitlebar.svelte';
  import GlobalCommandPalette from '$lib/components/agent-room/GlobalCommandPalette.svelte';
  import TourGuidePanel from '$lib/components/agent-room/tours/TourGuidePanel.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { initLocaleRuntime, localeState } from '$lib/i18n/locale.svelte.js';
  import { appSettingsStore } from '$lib/components/agent-room/app-settings.svelte.js';
  import { applyAppTheme } from '$lib/components/agent-room/app-themes.js';
  import { isEditableTarget, menuShortcutAction, shouldEscapeToCanvas } from '$lib/components/agent-room/app-shortcuts.js';
  import { OPEN_LAYER_SELECTOR } from '$lib/components/agent-room/managed-portal-surface.js';

  type DesktopMenuBridge = {
    platform?: string;
    setMenuLocale?: (locale: string) => Promise<string>;
    onMenuAction?: (callback: (action: string) => void) => () => void;
    setTitlebarTheme?: (theme: { background: string; foreground: string }) => Promise<boolean>;
  };

  const desktopMenu = typeof window !== 'undefined'
    ? (window as unknown as { deepspaceDesktop?: DesktopMenuBridge }).deepspaceDesktop
    : undefined;
  const windowsDesktop = desktopMenu?.platform === 'win32';

  $effect(() => {
    void desktopMenu?.setMenuLocale?.(localeState.current);
  });

  // Wire apiFetch error handling to the toast UI
  registerToast((variant: string, title: string, opts?: any) => {
    const fn = (toast as any)[variant] ?? toast;
    fn(title, opts);
  });

  let { children } = $props();
  let localeReady = $state(false);

  $effect(() => {
    const theme = applyAppTheme(appSettingsStore.values);
    void desktopMenu?.setTitlebarTheme?.({ background: theme.tokens.sidebar, foreground: theme.tokens.textSoft });
  });

  onMount(() => {
    // Nao libere interacao antes da preferencia inicial chegar: caso contrario
    // o remount de locale pode descartar um clique feito durante o startup.
    void initLocaleRuntime().finally(() => {
      applyAppTheme(appSettingsStore.values);
      localeReady = true;
    });
    const canvasActions = new Set(['new-workspace', 'presets', 'organize', 'floors', 'roles', 'usage', 'ports']);
    const runMenuAction = (action: string) => {
      if (action === 'canvas') void goto('/canvas');
      else if (action === 'terminals') void goto('/terminal');
      else if (action === 'providers') void goto('/providers');
      else if (action === 'remote') void goto('/remote');
      else if (action === 'settings') void goto('/settings');
      else if (action === 'docs') void goto('/docs');
      else if (action === 'changelog') void goto('/docs#changelog');
      else if (action === 'command-palette') window.dispatchEvent(new CustomEvent('deepspace:global-search'));
      else if (canvasActions.has(action)) {
        if (location.pathname !== '/canvas') {
          sessionStorage.setItem('deepspace.menu-action', action);
          void goto('/canvas');
        } else {
          window.dispatchEvent(new CustomEvent('deepspace:menu-action', { detail: action }));
        }
      }
    };
    const unsubscribeMenu = desktopMenu?.onMenuAction?.(runMenuAction);

    // No app desktop o menu nativo ja atende os atalhos; no navegador (preview,
    // acesso remoto) e o proprio app. O Esc vale nos dois: so depois que
    // dialogos, menus e campos de texto tiveram a chance de usa-lo.
    const mac = navigator.platform.toLowerCase().includes('mac');
    const handleAppShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!desktopMenu?.onMenuAction) {
        const action = menuShortcutAction(event, mac);
        if (action) {
          event.preventDefault();
          runMenuAction(action);
          return;
        }
      }
      if (shouldEscapeToCanvas({
        key: event.key,
        pathname: location.pathname,
        editableTarget: isEditableTarget(event.target),
        layerOpen: document.querySelector(OPEN_LAYER_SELECTOR) !== null,
        modifiers: event.ctrlKey || event.metaKey || event.altKey || event.shiftKey,
      })) {
        event.preventDefault();
        void goto('/canvas');
      }
    };
    window.addEventListener('keydown', handleAppShortcut);

    const syncCsrfToken = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if ((form.method || 'GET').toUpperCase() !== 'POST') return;

      const token = getCsrfToken();
      if (!token) return;

      let field = form.querySelector<HTMLInputElement>('input[name="_csrf"]');
      if (!field) {
        field = document.createElement('input');
        field.type = 'hidden';
        field.name = '_csrf';
        form.prepend(field);
      }
      field.value = token;
    };

    document.addEventListener('submit', syncCsrfToken, true);
    return () => {
      unsubscribeMenu?.();
      window.removeEventListener('keydown', handleAppShortcut);
      document.removeEventListener('submit', syncCsrfToken, true);
    };
  });
</script>

<!-- Site-wide SEO defaults — override per page with another <Seo> -->
<Seo
  title="Deep Space Agent Room"
  description={m['app.seo_description']()}
  ogSiteName="Deep Space Agent Room"
  ogType="website"
/>

<!-- Tooltip.Provider global: qualquer pagina pode usar Tooltip shadcn -->
<Tooltip.Provider>
  <!-- #key no locale: ao trocar de idioma, a arvore inteira remonta e todo
       m.*() reavalia — i18n reativo garantido por construcao. -->
  {#if localeReady}
    {#key localeState.current}
      {#if windowsDesktop}<DesktopTitlebar />{/if}
      <div class="app-content" class:desktop-content={windowsDesktop}>
        {@render children()}
      </div>
      <GlobalDictation />
      <GlobalCommandPalette />
      <TourGuidePanel />
    {/key}
  {/if}
</Tooltip.Provider>

<Toaster position="bottom-right" class="pb-[calc(var(--toast-bottom-offset,0px)+1rem)]!" />
<UpdateNotifier />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .app-content {
    height: 100dvh;
    min-height: 0;
  }

  .app-content.desktop-content {
    height: calc(100dvh - 36px);
    border-top: 1px solid var(--app-border);
    overflow: auto;
  }
</style>
