export type TerminalTextSpan = { start: number; end: number; text: string };

type BufferCellLike = { getChars(): string; getWidth(): number };
export type BufferLineLike = { isWrapped: boolean; length: number; getCell(x: number): BufferCellLike | undefined };
export type LogicalLine = { text: string; cells: Array<{ x: number; y: number }> };

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"'`]+/g;
const PATH_PATTERN = /(?:\.|~)?\/?(?:[\w.@+-]+\/)+[\w.@+-]+(?::\d+)?/g;
const TRAILING_PUNCTUATION = /[.,;:!?'"]+$/;
const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

// Uma frase como "veja (https://x.dev/a)." nao pode levar o ")." para a URL,
// mas https://pt.wikipedia.org/wiki/Foo_(bar) precisa manter o seu ")".
function trimUrl(raw: string): string {
  let url = raw;
  for (;;) {
    const withoutPunctuation = url.replace(TRAILING_PUNCTUATION, '');
    const last = withoutPunctuation.at(-1) ?? '';
    const opener = CLOSERS[last];
    if (opener && withoutPunctuation.split(opener).length <= withoutPunctuation.split(last).length - 1) {
      url = withoutPunctuation.slice(0, -1);
      continue;
    }
    return withoutPunctuation;
  }
}

export function findTerminalUrls(text: string): TerminalTextSpan[] {
  const spans: TerminalTextSpan[] = [];
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0]);
    if (url.length > 'https://'.length) spans.push({ start: match.index, end: match.index + url.length, text: url });
  }
  return spans;
}

// A busca de caminhos tambem casa o "//github.com/a/b" de dentro de uma URL;
// sem descartar essas sobreposicoes, Ctrl+clique num link tentava abrir arquivo.
export function findTerminalPaths(text: string, urls: TerminalTextSpan[]): TerminalTextSpan[] {
  const spans: TerminalTextSpan[] = [];
  for (const match of text.matchAll(PATH_PATTERN)) {
    const start = match.index;
    const end = start + match[0].length;
    if (urls.some((url) => start < url.end && end > url.start)) continue;
    spans.push({ start, end, text: match[0] });
  }
  return spans;
}

export function externalUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

// URLs longas quebram em varias linhas do terminal; a linha logica junta as
// linhas quebradas e guarda a celula de cada caractere (um caractere largo
// ocupa duas celulas), para devolver ao xterm uma faixa exata.
export function logicalLineAt(getLine: (y: number) => BufferLineLike | undefined, y: number): LogicalLine {
  let first = y;
  while (first > 0 && getLine(first)?.isWrapped) first -= 1;
  let last = y;
  while (getLine(last + 1)?.isWrapped) last += 1;

  let text = '';
  const cells: LogicalLine['cells'] = [];
  for (let row = first; row <= last; row += 1) {
    const line = getLine(row);
    if (!line) continue;
    for (let x = 0; x < line.length; x += 1) {
      const cell = line.getCell(x);
      if (!cell || cell.getWidth() === 0) continue;
      const chars = cell.getChars() || ' ';
      text += chars;
      for (let unit = 0; unit < chars.length; unit += 1) cells.push({ x, y: row });
    }
  }
  return { text, cells };
}
