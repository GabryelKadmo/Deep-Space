export type Box = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };
export type PanelSide = 'right' | 'left' | 'top' | 'bottom';

const GAP = 14;
const MARGIN = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Posiciona o painel do tour junto ao alvo, no primeiro lado em que ele cabe inteiro.
 * Alvo alto (a sidebar) recebe o painel ao lado; alvo baixo (um botao, a barra do
 * rodape) recebe acima ou abaixo, para o painel nao cobrir os vizinhos da mesma fileira.
 */
export function placeTourPanel(target: Box, panel: Size, viewport: Size): { top: number; left: number; side: PanelSide } {
  const fits: Record<PanelSide, boolean> = {
    right: target.left + target.width + GAP + panel.width <= viewport.width - MARGIN,
    left: target.left - GAP - panel.width >= MARGIN,
    top: target.top - GAP - panel.height >= MARGIN,
    bottom: target.top + target.height + GAP + panel.height <= viewport.height - MARGIN,
  };
  const lowerHalf = target.top + target.height / 2 > viewport.height / 2;
  const order: PanelSide[] = target.height >= panel.height / 2
    ? ['right', 'left', 'bottom', 'top']
    : lowerHalf ? ['top', 'bottom', 'right', 'left'] : ['bottom', 'top', 'right', 'left'];
  const side = order.find((candidate) => fits[candidate]) ?? order[0];
  const maxLeft = viewport.width - MARGIN - panel.width;
  const maxTop = viewport.height - MARGIN - panel.height;
  if (side === 'right' || side === 'left') {
    return {
      side,
      left: clamp(side === 'right' ? target.left + target.width + GAP : target.left - GAP - panel.width, MARGIN, maxLeft),
      top: clamp(target.top + target.height / 2 - panel.height / 2, MARGIN, maxTop),
    };
  }
  return {
    side,
    left: clamp(target.left + target.width / 2 - panel.width / 2, MARGIN, maxLeft),
    top: clamp(side === 'top' ? target.top - GAP - panel.height : target.top + target.height + GAP, MARGIN, maxTop),
  };
}

/** Primeiro elemento visivel marcado com `data-tour="<id>"` (o mesmo controle pode existir em dois lugares). */
export function findTourTarget(id: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(id)}"]`)) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden') return element;
  }
  return null;
}
