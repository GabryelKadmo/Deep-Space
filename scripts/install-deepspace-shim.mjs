import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

/** true quando o runtime.json atual pertence a outro processo ainda vivo. */
function runtimeFileHeldByLiveInstance(file) {
  let pid;
  try {
    pid = Number(JSON.parse(readFileSync(file, 'utf8'))?.pid);
  } catch {
    return false; // sem arquivo, ilegivel ou sem pid: livre
  }
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM = existe, mas de outro dono; ESRCH = morreu e o posto esta vago.
    return error?.code === 'EPERM';
  }
}

/**
 * Anuncia a URL atual da API em ~/.deepspace/runtime.json: a porta do app
 * empacotado e LIVRE (muda a cada execucao), entao o apiUrl gravado no
 * workspace.json pode ficar obsoleto — a CLI le este arquivo primeiro.
 *
 * O arquivo e da maquina inteira, entao quem chegou primeiro e continua vivo
 * fica com ele: subir o servidor de dev (ou um preview) enquanto o app esta
 * aberto apontava a CLI de TODOS os agentes para a instancia nova, e cada
 * comando da ponte morria com "token de bridge invalido". Para forcar o
 * anuncio mesmo assim: DEEPSPACE_ANNOUNCE_RUNTIME=1.
 */
export function writeDeepSpaceRuntimeFile(apiUrlOrMetadata) {
  try {
    const dir = resolve(homedir(), '.deepspace');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = resolve(dir, 'runtime.json');
    if (process.env.DEEPSPACE_ANNOUNCE_RUNTIME !== '1' && runtimeFileHeldByLiveInstance(file)) return;
    const metadata = typeof apiUrlOrMetadata === 'string'
      ? { apiUrl: apiUrlOrMetadata }
      : { ...apiUrlOrMetadata };
    writeFileSync(
      file,
      JSON.stringify({ ...metadata, updatedAt: new Date().toISOString() }, null, 2),
      { mode: 0o600 },
    );
    chmodSync(file, 0o600);
  } catch (error) {
    console.warn('[deepspace] falha ao gravar runtime.json:', error?.message ?? error);
  }
}
