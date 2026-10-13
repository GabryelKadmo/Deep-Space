import { describe, expect, it, vi } from 'vitest';

const uploadWorkspaceAttachment = vi.fn();
vi.mock('$lib/components/agent-room/workspace-attachments.js', () => ({
  MAX_WORKSPACE_ATTACHMENTS: 5,
  uploadWorkspaceAttachment: (...args: unknown[]) => uploadWorkspaceAttachment(...args),
}));

const { clipboardPasteFiles, droppedHostPaths, storePastedTerminalFiles, terminalPathFor, terminalPathTokens } = await import(
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
    expect(terminalPathTokens(['.deepspace/attachments/a.png'])).toBe('.deepspace/attachments/a.png ');
    expect(terminalPathTokens(['.deepspace/attachments/meu print.png'])).toBe('".deepspace/attachments/meu print.png" ');
    expect(terminalPathTokens([])).toBe('');
  });

  it('guarda cada arquivo colado no workspace e devolve os caminhos', async () => {
    uploadWorkspaceAttachment.mockImplementation(async (_workspaceId: string, file: File) => ({
      kind: 'file',
      path: `.deepspace/attachments/${file.name}`,
    }));
    const files = [new File(['a'], 'a.png'), new File(['b'], 'b.png')];
    await expect(storePastedTerminalFiles('ws-1', files)).resolves.toEqual([
      '.deepspace/attachments/a.png',
      '.deepspace/attachments/b.png',
    ]);
    expect(uploadWorkspaceAttachment).toHaveBeenCalledWith('ws-1', files[0]);
  });
});

describe('arquivos soltos no terminal', () => {
  const file = (name: string) => new File(['x'], name);

  it('usa o caminho real de cada arquivo vindo do disco', () => {
    const paths = droppedHostPaths([file('a.png'), file('b.txt')], (dropped) => `C:/Users/me/${dropped.name}`);
    expect(paths).toEqual(['C:/Users/me/a.png', 'C:/Users/me/b.txt']);
  });

  it('cai para a copia no workspace quando algum arquivo nao tem caminho', () => {
    expect(droppedHostPaths([file('a.png'), file('web.png')], (dropped) => (dropped.name === 'a.png' ? '/tmp/a.png' : ''))).toBeNull();
    expect(droppedHostPaths([file('a.png')], undefined)).toBeNull();
  });

  it('converte o disco do Windows para /mnt num terminal WSL e deixa o resto como esta', () => {
    const windowsPath = String.raw`C:\Users\me\My Project\shot.png`;
    expect(terminalPathFor(windowsPath, 'wsl')).toBe('/mnt/c/Users/me/My Project/shot.png');
    expect(terminalPathFor(windowsPath, 'native')).toBe(windowsPath);
    expect(terminalPathFor('/home/me/shot.png', 'wsl')).toBe('/home/me/shot.png');
    expect(terminalPathTokens([terminalPathFor(windowsPath, 'wsl')])).toBe('"/mnt/c/Users/me/My Project/shot.png" ');
  });
});
