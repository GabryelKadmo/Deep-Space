import { ConsoleCommandController } from '$lib/modules/agent-room/interface/http/controllers/ConsoleCommandController.js';

const ctrl = new ConsoleCommandController();
export const POST = ctrl.handle('import');
