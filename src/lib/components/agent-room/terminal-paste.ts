import { MAX_WORKSPACE_ATTACHMENTS, uploadWorkspaceAttachment } from './workspace-attachments.js';

/**
 * Arquivos (print da tela, imagem, PDF) presentes numa colagem. O clipboard
 * do sistema entrega a imagem como File; quando ha texto junto (copia de uma
 * pagina, por exemplo) o texto vence, que e o comportamento de um terminal.
 */
export function clipboardPasteFiles(clipboard: DataTransfer | null): File[] {
  if (clipboard?.getData('text/plain').trim()) return [];
  return Array.from(clipboard?.files ?? []).slice(0, MAX_WORKSPACE_ATTACHMENTS);
}

/**
 * Caminhos prontos para o prompt da CLI: aspas apenas quando ha espaco, para
 * que o agente leia o arquivo inteiro, e um espaco final para o usuario
 * continuar escrevendo a instrucao.
 */
export function terminalPathTokens(paths: string[]): string {
  const tokens = paths.filter(Boolean).map((path) => (/\s/.test(path) ? `"${path}"` : path));
  return tokens.length ? `${tokens.join(' ')} ` : '';
}

/**
 * Guarda os arquivos colados no workspace e devolve os caminhos relativos, o
 * mesmo contrato que o composer do canvas ja usa para entregar anexos aos
 * agentes (.orkestrai/attachments/...).
 */
export async function storePastedTerminalFiles(workspaceId: string, files: File[]): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    const attachment = await uploadWorkspaceAttachment(workspaceId, file);
    if (attachment.path) paths.push(attachment.path);
  }
  return paths;
}
