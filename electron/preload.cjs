/**
 * Preload do Electron: expoe uma ponte minima e segura para o renderer.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deepspaceDesktop', {
  /** Abre o seletor nativo de pastas (com opcao de criar nova pasta). */
  pickDirectory: () => ipcRenderer.invoke('deepspace:pick-directory'),
  /** Seleciona uma collection, contrato OpenAPI ou ambiente local para o API Client. */
  pickApiCollection: (kind) => ipcRenderer.invoke('deepspace:pick-api-collection', kind),
  /** Seleciona onde criar uma nova collection Bruno/OpenCollection exportada. */
  pickApiExportDirectory: () => ipcRenderer.invoke('deepspace:pick-api-export-directory'),
  /** Abre a origem importada no Bruno/Postman instalado. */
  openApiCollection: (kind, path) => ipcRenderer.invoke('deepspace:open-api-collection', kind, path),
  platform: process.platform,
  /** Versao atual do app (ex.: "0.0.1"). */
  appVersion: () => ipcRenderer.invoke('deepspace:app-version'),
  automationSecretStatus: (key) => ipcRenderer.invoke('deepspace:automation-secret-status', key),
  saveAutomationSecret: (key, value) => ipcRenderer.invoke('deepspace:automation-secret-save', key, value),
  deleteAutomationSecret: (key) => ipcRenderer.invoke('deepspace:automation-secret-delete', key),
  /** Gmail OAuth uses system browser + loopback PKCE and stores tokens directly in the OS vault. */
  connectGoogleOAuth: (input) => ipcRenderer.invoke('deepspace:oauth-google-connect', input),
  /** Checagem manual de atualizacao (a automatica roda no boot + a cada 6h). */
  checkForUpdates: () => ipcRenderer.invoke('deepspace:update-check'),
  /** Ultimo estado conhecido, inclusive se o renderer montou depois do check do boot. */
  updateState: () => ipcRenderer.invoke('deepspace:update-state'),
  /** Reinicia e instala a versao ja baixada quando a plataforma permite troca segura. */
  installUpdate: () => ipcRenderer.invoke('deepspace:update-install'),
  /** Abre URL https no navegador do sistema (fallback de download manual). */
  openExternal: (url) => ipcRenderer.invoke('deepspace:open-external', url),
  /** Abre um arquivo local no aplicativo padrão do sistema. */
  openPath: (path) => ipcRenderer.invoke('deepspace:open-path', path),
  /** Copia texto pelo clipboard nativo, inclusive no Chromium do Windows. */
  writeClipboardText: (value) => ipcRenderer.invoke('deepspace:clipboard-write', value),
  openFigmaPluginFolder: () => ipcRenderer.invoke('deepspace:figma-plugin-folder'),
  /** Mantém o menu nativo no mesmo idioma selecionado dentro do app. */
  setMenuLocale: (locale) => ipcRenderer.invoke('deepspace:menu-locale', locale),
  /** Executa uma acao validada da barra customizada do Windows. */
  runMenuCommand: (action) => ipcRenderer.invoke('deepspace:menu-command', action),
  setTitlebarTheme: (theme) => ipcRenderer.invoke('deepspace:titlebar-theme', theme),
  /** Estado e ciclo de vida do Core local que sustenta o modo 24/7. */
  coreStatus: () => ipcRenderer.invoke('deepspace:core-status'),
  portalSurface: (input) => ipcRenderer.invoke('deepspace:portal-surface', input),
  portalLayout: (input) => ipcRenderer.send('deepspace:portal-layout', input),
  onPortalState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('deepspace:portal-state', listener);
    return () => ipcRenderer.removeListener('deepspace:portal-state', listener);
  },
  configureCore: (preferences) => ipcRenderer.invoke('deepspace:core-configure', preferences),
  restartCore: () => ipcRenderer.invoke('deepspace:core-restart'),
  /** Consome uma vez um convite E2EE recebido via deepspace:// sem persisti-lo. */
  consumeCollaborationInvite: () => ipcRenderer.invoke('deepspace:collaboration-invite-consume'),
  onCollaborationInvite: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('deepspace:collaboration-invite', listener);
    return () => ipcRenderer.removeListener('deepspace:collaboration-invite', listener);
  },
  /** Ações do menu nativo são executadas pelo renderer para reutilizar os fluxos do canvas. */
  onMenuAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('deepspace:menu-action', listener);
    return () => ipcRenderer.removeListener('deepspace:menu-action', listener);
  },
  /** Converte links de nova aba de um webview em outro Portal no mesmo canvas. */
  onPortalOpenRequest: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('deepspace:portal-open-request', listener);
    return () => ipcRenderer.removeListener('deepspace:portal-open-request', listener);
  },
  /** Eventos do updater: available/manual/downloading/downloaded/none/error. Retorna unsubscribe. */
  onUpdate: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('deepspace:update', listener);
    return () => ipcRenderer.removeListener('deepspace:update', listener);
  },
});
