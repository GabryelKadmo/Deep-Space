export type GitHunkLine = { kind: ' ' | '+' | '-'; text: string; oldLine: number | null; newLine: number | null };

export type GitHunk = {
  index: number;
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: GitHunkLine[];
  /** Texto exato do hunk no diff (cabecalho @@ + linhas), usado para montar o patch. */
  raw: string;
};

export type ParsedGitDiff = { fileHeader: string; hunks: GitHunk[]; binary: boolean };

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

/** Diff unificado de um arquivo (`git diff -- <path>`) em cabecalho + hunks. */
export function parseGitDiff(diff: string): ParsedGitDiff {
  const lines = diff.replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  const header: string[] = [];
  const hunks: GitHunk[] = [];
  let current: { hunk: GitHunk; raw: string[]; oldLine: number; newLine: number } | null = null;
  const close = () => {
    if (!current) return;
    current.hunk.raw = `${current.raw.join('\n')}\n`;
    hunks.push(current.hunk);
    current = null;
  };

  for (const line of lines) {
    const match = HUNK_HEADER.exec(line);
    if (match) {
      close();
      const oldStart = Number(match[1]);
      const newStart = Number(match[3]);
      current = {
        hunk: {
          index: hunks.length,
          header: line,
          oldStart,
          oldLines: match[2] === undefined ? 1 : Number(match[2]),
          newStart,
          newLines: match[4] === undefined ? 1 : Number(match[4]),
          lines: [],
          raw: '',
        },
        raw: [line],
        oldLine: oldStart,
        newLine: newStart,
      };
      continue;
    }
    if (!current) {
      header.push(line);
      continue;
    }
    current.raw.push(line);
    const kind = line[0];
    if (kind === '+') {
      current.hunk.lines.push({ kind: '+', text: line.slice(1), oldLine: null, newLine: current.newLine });
      current.newLine += 1;
    } else if (kind === '-') {
      current.hunk.lines.push({ kind: '-', text: line.slice(1), oldLine: current.oldLine, newLine: null });
      current.oldLine += 1;
    } else if (kind === ' ') {
      current.hunk.lines.push({ kind: ' ', text: line.slice(1), oldLine: current.oldLine, newLine: current.newLine });
      current.oldLine += 1;
      current.newLine += 1;
    }
    // "\ No newline at end of file" fica so no raw, que o git apply entende.
  }
  close();
  const fileHeader = header.length ? `${header.join('\n')}\n` : '';
  return { fileHeader, hunks, binary: header.some((line) => line.startsWith('Binary files ')) };
}

/** Patch com um unico hunk, pronto para `git apply`. */
export function hunkPatch(parsed: ParsedGitDiff, index: number): string {
  const hunk = parsed.hunks[index];
  if (!hunk || !parsed.fileHeader) throw new Error('Bloco nao encontrado no diff atual.');
  return parsed.fileHeader + hunk.raw;
}
