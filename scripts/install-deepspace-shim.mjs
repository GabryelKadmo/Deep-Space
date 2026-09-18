import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

/**
 * Shim da CLI `deepspace` no PATH dos terminais: os agentes invocam
 * `deepspace ...` na shell, entao o binario precisa existir fora do repo/app
 * (o pacote empacotado nao instala nada globalmente). Regravado a cada boot
 * (dev pelo vite.config, empacotado pelo deepspace-server.mjs).
 * Exporta DEEPSPACE_SHIM_DIR para o PtySessionManager incluir no PATH do PTY.
 */
export function installDeepSpaceShim() {
  try {
    const cliEntry = resolve('packages/deepspace-cli/bin/deepspace.js');
    if (!existsSync(cliEntry)) return null;
    const runtime = process.execPath;
    const electronRuntime = Boolean(process.versions.electron);
    if (!electronRuntime) {
      process.env.DEEPSPACE_CLI_CONSOLE_RUNTIME = runtime;
    } else if (process.platform === 'win32' && !process.env.DEEPSPACE_CLI_CONSOLE_RUNTIME) {
      try {
        const systemNode = execFileSync('where.exe', ['node.exe'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 2_000,
        }).split(/\r?\n/).map((entry) => entry.trim()).find((entry) => entry && existsSync(entry));
        if (systemNode) process.env.DEEPSPACE_CLI_CONSOLE_RUNTIME = systemNode;
      } catch {
        // Packaged Windows builds inject the bundled console runtime instead.
      }
    }
    const configuredConsoleRuntime = process.env.DEEPSPACE_CLI_CONSOLE_RUNTIME;
    const launcherRuntime = configuredConsoleRuntime && existsSync(configuredConsoleRuntime)
      ? configuredConsoleRuntime
      : runtime;
    const launcherUsesElectron = launcherRuntime === runtime && electronRuntime;
    const shimDir = process.env.DEEPSPACE_DATA_DIR
      ? resolve(process.env.DEEPSPACE_DATA_DIR, 'bin')
      : resolve('storage', 'bin');
    mkdirSync(shimDir, { recursive: true });
    const posixShim = resolve(shimDir, 'deepspace');
    const cmdShim = resolve(shimDir, 'deepspace.cmd');
    const shellQuote = (value) => `'${value.replace(/'/g, `'"'"'`)}'`;
    const electronEnv = launcherUsesElectron ? 'ELECTRON_RUN_AS_NODE=1 ' : '';
    writeFileSync(posixShim, `#!/bin/sh\n${electronEnv}exec ${shellQuote(launcherRuntime)} ${shellQuote(cliEntry)} "$@"\n`);
    chmodSync(posixShim, 0o755);
    writeFileSync(
      cmdShim,
      `@echo off\r\n${launcherUsesElectron ? 'set "ELECTRON_RUN_AS_NODE=1"\r\n' : ''}"${launcherRuntime}" "${cliEntry}" %*\r\n`
    );
    process.env.DEEPSPACE_SHIM_DIR = shimDir;
    // DEEPSPACE_CLI = launcher que o agente pode executar DIRETO (sem prefixo de
    // runtime). No Windows apontar para o .js cru fazia o shell abri-lo pela
    // associacao de arquivo (.js -> Windows Script Host, "Caractere invalido" no
    // shebang `#!`); o launcher .cmd/sh invoca o runtime correto internamente.
    process.env.DEEPSPACE_CLI = process.platform === 'win32' ? cmdShim : posixShim;
    // DEEPSPACE_CLI_JS = caminho do .js cru, para quem o passa como ARGUMENTO de
    // um runtime (configs MCP: `<electron/node> <js> mcp`).
    process.env.DEEPSPACE_CLI_JS = cliEntry;
    process.env.DEEPSPACE_CLI_RUNTIME = launcherRuntime;
    process.env.DEEPSPACE_CLI_RUNTIME_IS_ELECTRON = launcherUsesElectron ? '1' : '0';
    return shimDir;
  } catch (error) {
    console.warn('[deepspace] falha ao instalar o shim da CLI:', error?.message ?? error);
    return null;
  }
}

/**
 * Anuncia a URL atual da API em ~/.deepspace/runtime.json: a porta do app
 * empacotado e LIVRE (muda a cada execucao), entao o apiUrl gravado no
 * workspace.json pode ficar obsoleto — a CLI le este arquivo primeiro.
 */
export function writeDeepSpaceRuntimeFile(apiUrlOrMetadata) {
  try {
    const dir = resolve(homedir(), '.deepspace');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const metadata = typeof apiUrlOrMetadata === 'string'
      ? { apiUrl: apiUrlOrMetadata }
      : { ...apiUrlOrMetadata };
    writeFileSync(
      resolve(dir, 'runtime.json'),
      JSON.stringify({ ...metadata, updatedAt: new Date().toISOString() }, null, 2),
      { mode: 0o600 },
    );
    chmodSync(resolve(dir, 'runtime.json'), 0o600);
  } catch (error) {
    console.warn('[deepspace] falha ao gravar runtime.json:', error?.message ?? error);
  }
}
