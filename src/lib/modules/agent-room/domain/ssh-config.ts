export type SshHost = {
  alias: string;
  hostName: string;
  user: string | null;
  port: number | null;
};

export type SshHostList = {
  configPath: string;
  exists: boolean;
  hosts: SshHost[];
};

export const MAX_SSH_HOSTS = 200;

// Atalhos de Git (Host github.com-work) usam ssh so para autenticar o git; nao
// ha shell para abrir neles.
const GIT_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org', 'ssh.dev.azure.com', 'vs-ssh.visualstudio.com'];

function isGitHost(hostName: string): boolean {
  const host = hostName.toLowerCase();
  return GIT_HOSTS.some((git) => host === git || host.endsWith(`.${git}`));
}

// Um alias vira argumento do ssh: nada de opcao disfarcada (-oProxyCommand=...),
// espaco ou caractere de controle.
export function isSafeSshAlias(alias: string): boolean {
  return /^[A-Za-z0-9_.@][A-Za-z0-9_.@:+-]{0,127}$/.test(alias);
}

/**
 * Le os blocos `Host` de um ssh_config. So nomes concretos viram servidor:
 * padroes com curinga e negacao configuram outros hosts e nao se conectam
 * sozinhos. `Match` encerra o bloco atual e e ignorado, assim como `Include`.
 */
export function parseSshConfig(text: string): SshHost[] {
  const hosts: SshHost[] = [];
  let current: Array<{ alias: string; hostName: string | null; user: string | null; port: number | null }> = [];

  const flush = () => {
    for (const entry of current) {
      const hostName = entry.hostName ?? entry.alias;
      if (isGitHost(hostName) || isGitHost(entry.alias)) continue;
      if (hosts.some((host) => host.alias === entry.alias)) continue;
      hosts.push({ alias: entry.alias, hostName, user: entry.user, port: entry.port });
    }
    current = [];
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(\S+?)\s*(?:=\s*|\s+)(.*)$/);
    if (!match) continue;
    const keyword = match[1].toLowerCase();
    const value = match[2].replace(/\s+#.*$/, '').trim().replace(/^"(.*)"$/, '$1');

    if (keyword === 'host') {
      flush();
      current = value.split(/\s+/)
        .filter((pattern) => pattern && !/[*?!]/.test(pattern) && isSafeSshAlias(pattern))
        .map((alias) => ({ alias, hostName: null, user: null, port: null }));
      continue;
    }
    if (keyword === 'match') {
      flush();
      continue;
    }
    for (const entry of current) {
      if (keyword === 'hostname' && !entry.hostName) entry.hostName = value;
      if (keyword === 'user' && !entry.user) entry.user = value;
      if (keyword === 'port' && entry.port === null) {
        const port = Number(value);
        if (Number.isInteger(port) && port > 0 && port < 65536) entry.port = port;
      }
    }
  }
  flush();
  return hosts.slice(0, MAX_SSH_HOSTS);
}

export function sshHostLabel(host: SshHost): string {
  const target = host.user ? `${host.user}@${host.hostName}` : host.hostName;
  return host.port && host.port !== 22 ? `${target}:${host.port}` : target;
}
