import * as m from '$lib/paraglide/messages.js';

// O servidor grava "system:process_exited:<codigo>" com o nome do processo no
// outcome; itens antigos ainda trazem o texto cru "PTY exited with code N".
const PROCESS_EXIT = /^(?:system:process_exited:|PTY exited with code )(-?\d+)$/;

export function processExitCode(action: string | null | undefined): number | null {
  const match = action?.match(PROCESS_EXIT);
  return match ? Number(match[1]) : null;
}

export function processExitLabel(code: number, name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed
    ? m['activity.process_exited']({ name: trimmed, code })
    : m['activity.process_exited_unnamed']({ code });
}

// Nos do Scripts criados antes da troca de nome guardaram o titulo "Console".
export function nodeDisplayTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  return title === 'Console' ? m['console.title']() : title;
}
