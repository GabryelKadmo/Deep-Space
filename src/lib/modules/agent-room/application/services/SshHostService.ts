import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseSshConfig, type SshHostList } from '../../domain/ssh-config.js';

const MAX_CONFIG_BYTES = 512 * 1024;

export class SshHostService {
  /** Le so os blocos Host do ~/.ssh/config da maquina do app; chaves e o resto ficam fora. */
  async list(): Promise<SshHostList> {
    const configPath = join(homedir(), '.ssh', 'config');
    let text: string;
    try {
      text = await readFile(configPath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { configPath, exists: false, hosts: [] };
      throw new Error('SSH_CONFIG_UNREADABLE');
    }
    return { configPath, exists: true, hosts: parseSshConfig(text.slice(0, MAX_CONFIG_BYTES)) };
  }
}

export const sshHostService = new SshHostService();
