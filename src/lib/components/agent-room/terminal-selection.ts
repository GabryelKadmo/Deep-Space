export type TerminalCell = { column: number; row: number };

export function terminalCellAtPoint(
  point: { clientX: number; clientY: number },
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  cols: number,
  rows: number,
  viewportY: number
): TerminalCell {
  const column = Math.max(0, Math.min(cols - 1, Math.floor(((point.clientX - rect.left) / rect.width) * cols)));
  const visibleRow = Math.max(0, Math.min(rows - 1, Math.floor(((point.clientY - rect.top) / rect.height) * rows)));
  return { column, row: viewportY + visibleRow };
}

export function terminalSelectionRange(start: TerminalCell, end: TerminalCell, cols: number) {
  const startOffset = start.row * cols + start.column;
  const endOffset = end.row * cols + end.column;
  const first = Math.min(startOffset, endOffset);
  const last = Math.max(startOffset, endOffset);
  return {
    column: first % cols,
    row: Math.floor(first / cols),
    length: last - first + 1,
  };
}

/**
 * O xterm tem seu proprio SelectionService escutando "mousedown" nativo, que
 * recalcula a faixa com metricas de fonte nao escaladas (alheias ao
 * transform:scale() do canvas) e sobrescreve visualmente a selecao correta
 * do overlay baseado em pointerdown/pointermove. So bloqueamos o clique
 * unico (detail===1) na mesma condicao em que o overlay assume a selecao;
 * duplo/triplo clique (palavra/linha) continuam nativos do xterm, que le
 * event.detail do proprio navegador — nao depende de ver o mousedown
 * anterior, entao bloquear so o clique 1 nao quebra a contagem.
 */
export function shouldSuppressNativeSingleClickSelection(
  event: Pick<MouseEvent, 'button' | 'detail' | 'shiftKey'>,
  mouseTrackingMode: string
): boolean {
  if (event.button !== 0 || event.detail !== 1) return false;
  return mouseTrackingMode === 'none' || event.shiftKey;
}

export function isTerminalCopyShortcut(event: Pick<KeyboardEvent, 'type' | 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>, hasSelection: boolean) {
  return event.type === 'keydown'
    && hasSelection
    && (event.ctrlKey || event.metaKey)
    && !event.altKey
    && !event.shiftKey
    && event.key.toLowerCase() === 'c';
}

function isMacTerminalPlatform(platform: string): boolean {
  const value = platform.toLowerCase();
  return value.startsWith('mac') || value === 'darwin';
}

/**
 * Atalho unico de colagem em todos os sistemas, no lugar do atalho proprio de
 * cada CLI (Ctrl+V, Alt+V, Shift+Insert...). Sem isso o xterm avalia a tecla,
 * cancela o evento com preventDefault e o navegador nunca dispara o "paste"
 * nativo: a CLI recebe so o caractere de controle e decide sozinha o que fazer,
 * que e a origem da divergencia entre providers. Retornar false no handler do
 * xterm mantem o paste nativo do Chromium, igual ao terminal do VS Code.
 *
 * Alt+V continua livre para as CLIs que ja documentam esse atalho proprio.
 */
export function isTerminalPasteShortcut(
  event: Pick<KeyboardEvent, 'type' | 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
  platform: string
) {
  if (event.type !== 'keydown' || event.altKey) return false;
  if (event.key === 'Insert') return event.shiftKey && !event.ctrlKey && !event.metaKey;
  if (event.key.toLowerCase() !== 'v') return false;
  return isMacTerminalPlatform(platform)
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey;
}
