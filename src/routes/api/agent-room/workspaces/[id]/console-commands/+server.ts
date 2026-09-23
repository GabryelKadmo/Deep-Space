import { ConsoleCommandController } from '$lib/modules/agent-room/interface/http/controllers/ConsoleCommandController.js';

const ctrl = new ConsoleCommandController();
export const GET = ctrl.handle('index');
export const POST = ctrl.handle('store');
