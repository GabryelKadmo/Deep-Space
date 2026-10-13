import { describe, expect, it } from 'vitest';
import { hunkPatch, parseGitDiff } from '$lib/modules/agent-room/domain/git-hunks.js';

const DIFF = [
  'diff --git a/src/app.ts b/src/app.ts',
  'index 1111111..2222222 100644',
  '--- a/src/app.ts',
  '+++ b/src/app.ts',
  '@@ -1,3 +1,3 @@',
  ' const a = 1;',
  '-const b = 2;',
  '+const b = 3;',
  ' const c = 4;',
  '@@ -10,2 +10,3 @@ function tail() {',
  ' keep();',
  '+added();',
  ' end();',
  '\\ No newline at end of file',
  '',
].join('\n');

describe('hunks de um diff git', () => {
  it('separa cabecalho e blocos com numeros de linha', () => {
    const parsed = parseGitDiff(DIFF);
    expect(parsed.binary).toBe(false);
    expect(parsed.fileHeader.split('\n')[0]).toBe('diff --git a/src/app.ts b/src/app.ts');
    expect(parsed.hunks).toHaveLength(2);
    expect(parsed.hunks[0]).toMatchObject({ index: 0, oldStart: 1, oldLines: 3, newStart: 1, newLines: 3 });
    expect(parsed.hunks[0].lines.map((line) => `${line.kind}${line.oldLine ?? '-'}/${line.newLine ?? '-'}`)).toEqual([' 1/1', '-2/-', '+-/2', ' 3/3']);
    expect(parsed.hunks[1].lines.map((line) => line.kind)).toEqual([' ', '+', ' ']);
  });

  it('monta um patch so com o bloco pedido, preservando o marcador de fim de arquivo', () => {
    const parsed = parseGitDiff(DIFF);
    const patch = hunkPatch(parsed, 1);
    expect(patch.startsWith('diff --git a/src/app.ts b/src/app.ts\n')).toBe(true);
    expect(patch).toContain('@@ -10,2 +10,3 @@ function tail() {\n keep();\n+added();\n end();\n\\ No newline at end of file\n');
    expect(patch).not.toContain('const b = 3');
  });

  it('marca arquivos binarios e recusa bloco inexistente', () => {
    const binary = parseGitDiff('diff --git a/logo.png b/logo.png\nindex 1..2 100644\nBinary files a/logo.png and b/logo.png differ\n');
    expect(binary.binary).toBe(true);
    expect(binary.hunks).toEqual([]);
    expect(() => hunkPatch(binary, 0)).toThrow();
  });

  it('aceita CRLF e cabecalho sem contagem de linhas', () => {
    const parsed = parseGitDiff('diff --git a/x b/x\r\n--- a/x\r\n+++ b/x\r\n@@ -5 +5 @@\r\n-old\r\n+new\r\n');
    expect(parsed.hunks[0]).toMatchObject({ oldStart: 5, oldLines: 1, newStart: 5, newLines: 1 });
  });
});
