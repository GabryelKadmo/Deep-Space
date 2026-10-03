import { describe, expect, it } from 'vitest';
import { isSafeSshAlias, parseSshConfig, sshHostLabel } from '$lib/modules/agent-room/domain/ssh-config.js';

const CONFIG = `# Conta Pessoal
Host github.com-personal
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_personal

# SSH VPS
Host myhubs
    HostName 66.94.111.157
    User root
    Port 22
    IdentityFile ~/.ssh/id_ed25519_personal

Host vps-sso
    HostName 10.10.10.10
    User kadmo
    Port 2222

Host *
    ServerAliveInterval 30

Host web-? !bad prod-a prod-b
    User deploy
    HostName=prod.example.com

Match host whatever
    User ignored
`;

describe('parseSshConfig', () => {
  const hosts = parseSshConfig(CONFIG);

  it('lists concrete hosts with user, address and port, and leaves Git shortcuts out', () => {
    expect(hosts.map((host) => host.alias)).toEqual(['myhubs', 'vps-sso', 'prod-a', 'prod-b']);
    expect(hosts[0]).toEqual({ alias: 'myhubs', hostName: '66.94.111.157', user: 'root', port: 22 });
    expect(hosts[1]).toEqual({ alias: 'vps-sso', hostName: '10.10.10.10', user: 'kadmo', port: 2222 });
  });

  it('skips wildcard and negated patterns but keeps the concrete names on the same line', () => {
    expect(hosts.find((host) => host.alias === 'prod-b')).toEqual({ alias: 'prod-b', hostName: 'prod.example.com', user: 'deploy', port: null });
  });

  it('does not leak Match blocks into the previous host', () => {
    expect(hosts.find((host) => host.alias === 'prod-b')?.user).toBe('deploy');
  });

  it('falls back to the alias as address when HostName is missing', () => {
    expect(parseSshConfig('Host box\n  User me')).toEqual([{ alias: 'box', hostName: 'box', user: 'me', port: null }]);
  });
});

describe('isSafeSshAlias', () => {
  it('rejects names that ssh would read as an option or that carry spaces', () => {
    expect(isSafeSshAlias('vps-sso')).toBe(true);
    expect(isSafeSshAlias('-oProxyCommand=calc')).toBe(false);
    expect(isSafeSshAlias('a b')).toBe(false);
    expect(parseSshConfig('Host -oProxyCommand=x\n  HostName h')).toEqual([]);
  });
});

describe('sshHostLabel', () => {
  it('shows the port only when it is not the default', () => {
    expect(sshHostLabel({ alias: 'a', hostName: '10.0.0.1', user: 'root', port: 22 })).toBe('root@10.0.0.1');
    expect(sshHostLabel({ alias: 'a', hostName: '10.0.0.1', user: null, port: 2222 })).toBe('10.0.0.1:2222');
  });
});
