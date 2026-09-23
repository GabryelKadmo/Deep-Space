import { ConsoleCommandController } from '$lib/modules/agent-room/interface/http/controllers/ConsoleCommandController.js';

const ctrl = new ConsoleCommandController();
export const PATCH = ctrl.handle('update');
export const DELETE = ctrl.handle('destroy');
