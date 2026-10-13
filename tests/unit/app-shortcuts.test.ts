import { describe, expect, it } from 'vitest';
import { menuShortcutAction, shouldEscapeToCanvas } from '$lib/components/agent-room/app-shortcuts.js';

const key = (overrides: Partial<{ key: string; code: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }>) => ({
  key: '', code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...overrides,
});

describe('atalhos do app no navegador', () => {
  it('Ctrl+, abre as Configuracoes (Cmd+, no mac)', () => {
    expect(menuShortcutAction(key({ key: ',', ctrlKey: true }), false)).toBe('settings');
    expect(menuShortcutAction(key({ key: ',', metaKey: true }), true)).toBe('settings');
    expect(menuShortcutAction(key({ key: ',', metaKey: true }), false)).toBeNull();
    expect(menuShortcutAction(key({ key: ',' }), false)).toBeNull();
  });

  it('Ctrl+Alt+letra abre os paineis do canvas pela tecla fisica', () => {
    expect(menuShortcutAction(key({ key: 'µ', code: 'KeyU', ctrlKey: true, altKey: true }), false)).toBe('usage');
    expect(menuShortcutAction(key({ code: 'KeyO', ctrlKey: true, altKey: true }), false)).toBe('ports');
    expect(menuShortcutAction(key({ code: 'KeyU', ctrlKey: true, altKey: true, shiftKey: true }), false)).toBeNull();
  });
});

describe('Esc volta para o canvas', () => {
  const base = { key: 'Escape', pathname: '/settings', editableTarget: false, layerOpen: false, modifiers: false };

  it('volta das paginas do app', () => {
    for (const pathname of ['/settings', '/providers', '/docs', '/skills', '/remote', '/admin']) {
      expect(shouldEscapeToCanvas({ ...base, pathname })).toBe(true);
    }
  });

  it('nao age no canvas, no Workbench, no login, em campo de texto ou com algo aberto', () => {
    expect(shouldEscapeToCanvas({ ...base, pathname: '/canvas' })).toBe(false);
    expect(shouldEscapeToCanvas({ ...base, pathname: '/terminal' })).toBe(false);
    expect(shouldEscapeToCanvas({ ...base, pathname: '/login' })).toBe(false);
    expect(shouldEscapeToCanvas({ ...base, editableTarget: true })).toBe(false);
    expect(shouldEscapeToCanvas({ ...base, layerOpen: true })).toBe(false);
    expect(shouldEscapeToCanvas({ ...base, modifiers: true })).toBe(false);
    expect(shouldEscapeToCanvas({ ...base, key: 'Enter' })).toBe(false);
  });
});
