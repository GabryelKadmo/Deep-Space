import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseSshConfig, type SshHostList } from '../../domain/ssh-config.js';

const MAX_CONFIG_BYTES = 512 * 1024;

const CONFIG_TEMPLATE = [
  '# Um bloco Host por servidor. Depois de salvar, recarregue o no Servidores.',
  '#',
  '# Host minha-vps',
  '#     HostName 203.0.113.10',
  '#     User deploy',
  '#     Port 22',
  '#     IdentityFile ~/.ssh/id_ed25519',
  '',
].join('\n');

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

  /**
   * Garante que o ~/.ssh/config exista para o atalho de edicao. Nunca
   * sobrescreve: com o arquivo ja presente, so devolve o caminho. A pasta e o
   * arquivo nascem restritos ao usuario, como o OpenSSH exige.
   */
  async ensureConfig(): Promise<{ configPath: string; created: boolean }> {
    const directory = join(homedir(), '.ssh');
    const configPath = join(directory, 'config');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    try {
      await writeFile(configPath, CONFIG_TEMPLATE, { flag: 'wx', mode: 0o600 });
      return { configPath, created: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return { configPath, created: false };
      throw new Error('SSH_CONFIG_UNWRITABLE');
    }
  }
}

export const sshHostService = new SshHostService();
