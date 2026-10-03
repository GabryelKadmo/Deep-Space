import { describe, expect, it } from 'vitest';
import { interactiveShellLaunch, shellFromCommand, terminalShellOptions } from '$lib/modules/agent-room/domain/console-commands.js';

describe('terminal shell', () => {
  it('offers the platform shells without the automatic choice', () => {
    expect(terminalShellOptions('win32')).toEqual(['powershell', 'gitbash', 'wsl', 'cmd']);
    expect(terminalShellOptions('darwin')).toEqual(['bash', 'zsh', 'sh']);
  });

  it('opens PowerShell with the execution policy released for that process only', () => {
    expect(interactiveShellLaunch('powershell', 'win32')).toEqual({ command: 'powershell.exe', args: ['-NoLogo', '-ExecutionPolicy', 'Bypass'] });
  });

  it('opens Git Bash as an interactive login shell and CMD and WSL bare', () => {
    expect(interactiveShellLaunch('gitbash', 'win32').command).toMatch(/\\Git\\bin\\bash\.exe$/);
    expect(interactiveShellLaunch('gitbash', 'win32').args).toEqual(['--login', '-i']);
    expect(interactiveShellLaunch('wsl', 'win32')).toEqual({ command: 'wsl.exe', args: [] });
    expect(interactiveShellLaunch('cmd', 'win32').args).toEqual([]);
    expect(interactiveShellLaunch('zsh', 'darwin')).toEqual({ command: '/bin/zsh', args: [] });
  });

  it('recognises the shell of a terminal saved before the choice existed', () => {
    expect(shellFromCommand('powershell.exe')).toBe('powershell');
    expect(shellFromCommand('C:\\Windows\\system32\\cmd.exe')).toBe('cmd');
    expect(shellFromCommand('wsl.exe')).toBe('wsl');
    expect(shellFromCommand('C:\\Program Files\\Git\\bin\\bash.exe')).toBe('gitbash');
    expect(shellFromCommand('/bin/zsh')).toBe('zsh');
    expect(shellFromCommand('/usr/bin/bash')).toBe('bash');
    expect(shellFromCommand('claude')).toBeNull();
  });
});
