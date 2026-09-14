import { describe, expect, it } from 'vitest';
import { isTerminalCopyShortcut, isTerminalPasteShortcut, shouldSuppressNativeSingleClickSelection, terminalCellAtPoint, terminalSelectionRange } from '$lib/components/agent-room/terminal-selection.js';

describe('terminal selection geometry', () => {
  it('mapeia coordenadas pelo retangulo visual escalado', () => {
    const rect = { left: 100, top: 50, width: 400, height: 200 };
    expect(terminalCellAtPoint({ clientX: 300, clientY: 150 }, rect, 80, 20, 40)).toEqual({ column: 40, row: 50 });
  });

  it('normaliza selecao reversa em varias linhas', () => {
    expect(terminalSelectionRange({ column: 10, row: 8 }, { column: 5, row: 6 }, 80)).toEqual({
      column: 5,
      row: 6,
      length: 166,
    });
  });

  it('so suprime a selecao nativa do xterm no clique unico, fora de modo de rastreamento de mouse', () => {
    const leftSingleClick = { button: 0, detail: 1, shiftKey: false };
    expect(shouldSuppressNativeSingleClickSelection(leftSingleClick, 'none')).toBe(true);
    // Duplo/triplo clique (selecao de palavra/linha) continuam nativos do xterm.
    expect(shouldSuppressNativeSingleClickSelection({ ...leftSingleClick, detail: 2 }, 'none')).toBe(false);
    expect(shouldSuppressNativeSingleClickSelection({ ...leftSingleClick, detail: 3 }, 'none')).toBe(false);
    // So o botao esquerdo.
    expect(shouldSuppressNativeSingleClickSelection({ ...leftSingleClick, button: 2 }, 'none')).toBe(false);
    // TUI com mouse tracking: xterm deve reportar o clique ao programa, exceto com Shift.
    expect(shouldSuppressNativeSingleClickSelection(leftSingleClick, 'x10')).toBe(false);
    expect(shouldSuppressNativeSingleClickSelection({ ...leftSingleClick, shiftKey: true }, 'x10')).toBe(true);
  });

  it('copia com Ctrl/Cmd+C somente quando ha selecao e preserva SIGINT sem selecao', () => {
    const event = { type: 'keydown', key: 'c', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
    expect(isTerminalCopyShortcut(event, true)).toBe(true);
    expect(isTerminalCopyShortcut(event, false)).toBe(false);
    expect(isTerminalCopyShortcut({ ...event, key: 'x' }, true)).toBe(false);
    expect(isTerminalCopyShortcut({ ...event, type: 'keyup' }, true)).toBe(false);
  });

  it('usa o mesmo atalho de colagem em todos os sistemas', () => {
    const event = { type: 'keydown', key: 'v', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
    expect(isTerminalPasteShortcut(event, 'win32')).toBe(true);
    expect(isTerminalPasteShortcut(event, 'Linux x86_64')).toBe(true);
    // Ctrl+Shift+V (terminais do Linux) e Shift+Insert (X11) valem como o mesmo atalho.
    expect(isTerminalPasteShortcut({ ...event, shiftKey: true }, 'win32')).toBe(true);
    expect(isTerminalPasteShortcut({ type: 'keydown', key: 'Insert', ctrlKey: false, metaKey: false, altKey: false, shiftKey: true }, 'win32')).toBe(true);

    // macOS cola com Cmd+V; Ctrl+V continua indo para a CLI, como no VS Code.
    const command = { ...event, ctrlKey: false, metaKey: true };
    expect(isTerminalPasteShortcut(command, 'MacIntel')).toBe(true);
    expect(isTerminalPasteShortcut(event, 'darwin')).toBe(false);
    expect(isTerminalPasteShortcut(command, 'win32')).toBe(false);

    // Alt+V segue reservado para o atalho proprio das CLIs que o documentam.
    expect(isTerminalPasteShortcut({ ...event, ctrlKey: false, altKey: true }, 'win32')).toBe(false);
    expect(isTerminalPasteShortcut({ ...event, type: 'keyup' }, 'win32')).toBe(false);
  });
});
