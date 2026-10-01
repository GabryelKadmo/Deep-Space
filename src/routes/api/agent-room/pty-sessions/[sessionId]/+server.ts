import { json } from '@sveltejs/kit';
import { ptySessionManager } from '$lib/modules/agent-room/infrastructure/pty/PtySessionManager.js';

/** O Console guarda o id da sessao de cada comando, e o app fechado leva a sessao junto. */
export function GET({ params }) {
  const info = ptySessionManager.get(params.sessionId);
  return json({ data: { exists: Boolean(info), running: Boolean(info && !info.exited) } });
}

/** Encerra a sessao de um comando do Console sem precisar do terminal montado. */
export function DELETE({ params }) {
  const killed = ptySessionManager.kill(params.sessionId);
  return json({ data: { killed } });
}
