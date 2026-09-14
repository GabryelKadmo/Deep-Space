import { describe, expect, it, vi } from 'vitest';

const uploadWorkspaceAttachment = vi.fn();
vi.mock('$lib/components/agent-room/workspace-attachments.js', () => ({
  MAX_WORKSPACE_ATTACHMENTS: 5,
  uploadWorkspaceAttachment: (...args: unknown[]) => uploadWorkspaceAttachment(...args),
}));

const { clipboardPasteFiles, storePastedTerminalFiles, terminalPathTokens } = await import(
  '$lib/components/agent-room/terminal-paste.js'
);

describe('colagem de arquivos no terminal', () => {
  const transfer = (files: File[], text = '') =>
    ({ files, getData: () => text }) as unknown as DataTransfer;

  it('so trata a colagem como anexo quando ha arquivo e nenhum texto', () => {
    const file = new File(['x'], 'print.png', { type: 'image/png' });
    expect(clipboardPasteFiles(transfer([file]))).toEqual([file]);
    expect(clipboardPasteFiles(transfer([]))).toEqual([]);
    expect(clipboardPasteFiles(null)).toEqual([]);
    expect(clipboardPasteFiles(transfer(Array(9).fill(file)))).toHaveLength(5);
    // Copia de uma pagina traz imagem e texto juntos: num terminal, texto vence.
    expect(clipboardPasteFiles(transfer([file], 'npm run build'))).toEqual([]);
  });

  it('entrega caminhos prontos para o prompt da CLI', () => {
    expect(terminalPathTokens(['.orkestrai/attachments/a.png'])).toBe('.orkestrai/attachments/a.png ');
    expect(terminalPathTokens(['.orkestrai/attachments/meu print.png'])).toBe('".orkestrai/attachments/meu print.png" ');
    expect(terminalPathTokens([])).toBe('');
  });

  it('guarda cada arquivo colado no workspace e devolve os caminhos', async () => {
    uploadWorkspaceAttachment.mockImplementation(async (_workspaceId: string, file: File) => ({
      kind: 'file',
      path: `.orkestrai/attachments/${file.name}`,
    }));
    const files = [new File(['a'], 'a.png'), new File(['b'], 'b.png')];
    await expect(storePastedTerminalFiles('ws-1', files)).resolves.toEqual([
      '.orkestrai/attachments/a.png',
      '.orkestrai/attachments/b.png',
    ]);
    expect(uploadWorkspaceAttachment).toHaveBeenCalledWith('ws-1', files[0]);
  });
});
