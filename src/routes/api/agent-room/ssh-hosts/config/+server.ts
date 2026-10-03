import { SshHostController } from '$lib/modules/agent-room/interface/http/controllers/SshHostController.js';

const ctrl = new SshHostController();
export const POST = ctrl.handle('ensureConfig');
