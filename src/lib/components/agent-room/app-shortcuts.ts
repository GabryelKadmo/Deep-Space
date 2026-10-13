type ShortcutKey = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>;

/**
 * Atalhos do menu nativo que o proprio app trata quando roda fora do Electron
 * (preview, acesso pelo navegador). Os que o navegador reserva (Ctrl+N, Ctrl+1)
 * ficam de fora: ele nao entrega essas teclas para a pagina.
 */
export function menuShortcutAction(event: ShortcutKey, mac: boolean): string | null {
  const primary = mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!primary) return null;
  if (event.key === ',' && !event.altKey && !event.shiftKey) return 'settings';
  if (event.altKey && !event.shiftKey) {
    const byCode: Record<string, string> = { KeyU: 'usage', KeyR: 'roles', KeyF: 'floors', KeyO: 'ports' };
    return byCode[event.code] ?? null;
  }
  return null;
}

// Paginas que tem o proprio uso do Esc (terminais, editores) ou que sao do login.
const ESCAPE_KEEPS = ['/canvas', '/terminal', '/login', '/register', '/forgot-password', '/reset-password', '/otp-login', '/verify-email'];

/** Esc numa pagina do app (Configuracoes, Providers, Como usar...) volta para o canvas. */
export function shouldEscapeToCanvas(input: { key: string; pathname: string; editableTarget: boolean; layerOpen: boolean; modifiers: boolean }): boolean {
  if (input.key !== 'Escape' || input.modifiers || input.editableTarget || input.layerOpen) return false;
  if (input.pathname === '/') return false;
  return !ESCAPE_KEEPS.some((path) => input.pathname === path || input.pathname.startsWith(`${path}/`));
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest('.xterm, .monaco-editor')) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
