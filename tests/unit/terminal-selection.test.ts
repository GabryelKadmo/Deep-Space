import { describe, expect, it } from 'vitest';
import { isTerminalCopyShortcut, isTerminalPasteShortcut, shouldSuppressNativeSingleClickSelection, terminalCellAtPoint, terminalSelectionRange, wordRangeAtCell } from '$lib/components/agent-room/terminal-selection.js';

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

  it('so suprime a selecao nativa do xterm em clique unico/duplo/triplo, fora de modo de rastreamento de mouse (ou com Shift)', () => {
    const leftSingleClick = { button: 0, detail: 1, shiftKey: false };
    expect(shouldSuppressNativeSingleClickSelection(leftSingleClick, 'none')).toBe(true);
    // Duplo/triplo clique (selecao de palavra/linha) tambem sao suprimidos,
    // na mesma condicao do clique unico (ver wordRangeAtCell/selectLines).
    expect(shouldSuppressNativeSingleClickSelection({ ...leftSingleClick, detail: 2 }, 'none')).toBe(true);
    expect(shouldSuppressNativeSingleClickSelection({ ...leftSingleClick, detail: 3 }, 'none')).toBe(true);
    // So o botao esquerdo.
    expect(shouldSuppressNativeSingleClickSelection({ ...leftSingleClick, button: 2 }, 'none')).toBe(false);
    // TUI com mouse tracking: o clique deve continuar sendo reportado ao
    // programa, exceto com Shift (aí a selecao de texto assume).
    expect(shouldSuppressNativeSingleClickSelection(leftSingleClick, 'any')).toBe(false);
    expect(shouldSuppressNativeSingleClickSelection({ ...leftSingleClick, shiftKey: true }, 'any')).toBe(true);
  });

  it('acha a palavra na celula clicada pelo texto real da linha', () => {
    const line = 'const value = 1';
    //             0123456789...
    expect(wordRangeAtCell(line, 2)).toEqual({ start: 0, length: 5 }); // "const"
    expect(wordRangeAtCell(line, 8)).toEqual({ start: 6, length: 5 }); // "value"
    expect(wordRangeAtCell(line, 5)).toBeNull(); // espaco entre as palavras
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
