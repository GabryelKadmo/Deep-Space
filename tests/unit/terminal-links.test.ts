import { describe, expect, it } from 'vitest';
import { externalUrl, findTerminalPaths, findTerminalUrls, logicalLineAt, type BufferLineLike } from '../../src/lib/components/agent-room/terminal-links';

function line(text: string, isWrapped = false, wide: number[] = []): BufferLineLike {
  const cells: Array<{ chars: string; width: number }> = [];
  [...text].forEach((char, index) => {
    if (wide.includes(index)) {
      cells.push({ chars: char, width: 2 }, { chars: '', width: 0 });
    } else {
      cells.push({ chars: char, width: 1 });
    }
  });
  return {
    isWrapped,
    length: cells.length,
    getCell: (x) => cells[x] && { getChars: () => cells[x].chars, getWidth: () => cells[x].width },
  };
}

describe('findTerminalUrls', () => {
  it('finds http and https URLs', () => {
    const text = 'Local: http://localhost:5173/ and https://github.com/GabryelKadmo/Deep-Space/pull/62';
    expect(findTerminalUrls(text).map((span) => span.text)).toEqual([
      'http://localhost:5173/',
      'https://github.com/GabryelKadmo/Deep-Space/pull/62',
    ]);
  });

  it('drops trailing sentence punctuation and unbalanced closers', () => {
    expect(findTerminalUrls('see (https://x.dev/a).').map((span) => span.text)).toEqual(['https://x.dev/a']);
    expect(findTerminalUrls('done: https://x.dev/a, then').map((span) => span.text)).toEqual(['https://x.dev/a']);
  });

  it('keeps balanced parentheses that belong to the URL', () => {
    expect(findTerminalUrls('https://pt.wikipedia.org/wiki/Foo_(bar)').map((span) => span.text)).toEqual([
      'https://pt.wikipedia.org/wiki/Foo_(bar)',
    ]);
  });

  it('ignores other schemes', () => {
    expect(findTerminalUrls('file:///etc/passwd javascript:alert(1)')).toEqual([]);
  });
});

describe('findTerminalPaths', () => {
  it('skips paths that are part of a URL', () => {
    const text = 'https://github.com/a/b src/lib/index.ts:42';
    expect(findTerminalPaths(text, findTerminalUrls(text)).map((span) => span.text)).toEqual(['src/lib/index.ts:42']);
  });
});

describe('externalUrl', () => {
  it('accepts only http and https', () => {
    expect(externalUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(externalUrl('http://localhost:5173')).toBe('http://localhost:5173/');
    expect(externalUrl('javascript:alert(1)')).toBeNull();
    expect(externalUrl('not a url')).toBeNull();
  });
});

describe('logicalLineAt', () => {
  it('joins wrapped rows and maps each character to its cell', () => {
    const rows = [line('see https://exa'), line('mple.com/x done', true)];
    const logical = logicalLineAt((y) => rows[y], 1);
    expect(logical.text).toBe('see https://example.com/x done');
    const [url] = findTerminalUrls(logical.text);
    expect(url.text).toBe('https://example.com/x');
    expect(logical.cells[url.start]).toEqual({ x: 4, y: 0 });
    expect(logical.cells[url.end - 1]).toEqual({ x: 9, y: 1 });
  });

  it('accounts for wide characters before a URL', () => {
    const rows = [line('界 https://a.dev', false, [0])];
    const logical = logicalLineAt((y) => rows[y], 0);
    const [url] = findTerminalUrls(logical.text);
    expect(logical.cells[url.start]).toEqual({ x: 3, y: 0 });
  });
});
