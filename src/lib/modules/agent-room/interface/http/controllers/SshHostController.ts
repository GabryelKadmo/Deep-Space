import { Controller } from '@beeblock/svelar/routing';
import { sshHostService } from '$lib/modules/agent-room/application/services/SshHostService.js';

export class SshHostController extends Controller {
  async index() {
    try {
      return this.json({ data: await sshHostService.list() });
    } catch (error) {
      return this.json({ error: error instanceof Error ? error.message : 'SSH_CONFIG_UNREADABLE' }, 500);
    }
  }

  async ensureConfig() {
    try {
      return this.json({ data: await sshHostService.ensureConfig() });
    } catch (error) {
      return this.json({ error: error instanceof Error ? error.message : 'SSH_CONFIG_UNWRITABLE' }, 500);
    }
  }
}
