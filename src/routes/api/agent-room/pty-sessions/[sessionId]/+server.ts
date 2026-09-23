import { json } from '@sveltejs/kit';
import { ptySessionManager } from '$lib/modules/agent-room/infrastructure/pty/PtySessionManager.js';

/** Encerra a sessao de um comando do Console sem precisar do terminal montado. */
export function DELETE({ params }) {
  const killed = ptySessionManager.kill(params.sessionId);
  return json({ data: { killed } });
}
