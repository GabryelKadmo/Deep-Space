# Deep Space — Agent Guidelines

## Fork Identity (read this first)

- This repository is **Deep Space**, a fork of [Orkestrai](https://github.com/beeblock/orkestrai) under Apache 2.0. Attribution lives in `NOTICE`; `LICENSE` keeps the upstream copyright and must not be edited.
- Remotes in a full working copy: `origin` is `GabryelKadmo/Deep-Space` (the product), and the fork `GabryelKadmo/orkestrai` plus `beeblock/orkestrai` exist only as mirrors for pulling upstream work. Never push product branches to the mirrors.
- **Nothing is named after the upstream project any more.** The bridge was kept on the old naming for a while, on the argument that renaming breaks provisioned workspaces and the agent instructions cached inside them; that argument protects other people's installs, and with no published release there were none. The rename covered the `deepspace` CLI command, `.deepspace/`, `DEEPSPACE_*`, the `deepspaceDesktop` preload bridge, the `deepspace:` protocol and IPC channels, `packages/deepspace-*`, the `@deepspace/*` workspace scope, the theme ids and the glued identifiers. A workspace provisioned before it is repaired by `ensureProvisioned` on the next open, but the old directory is left behind rather than deleted.
- The only remaining mentions of the upstream name are attribution and must not be touched: `NOTICE`, `LICENSE`, the READMEs, the fork note in the changelog, and links to `beeblock/orkestrai`. `GabryelKadmo/orkestrai` is a real mirror repository, not a stale name.
- Renaming a workspace package scope needs `npm install` afterwards: the old `node_modules/@scope` symlink survives and the build fails to resolve the new one while the stale directory sits there.
- Release artifacts must stay spaceless (`DeepSpace-*`) even though `productName` is `Deep Space`: GitHub rewrites spaces in release asset names, which breaks the match against `latest-*.yml` and silently kills auto-update. Any shell step that touches `Deep Space.app` needs quoting.
- `deepspace-branding/` still holds the upstream logo, and the READMEs render it. Apache 2.0 does not grant trademark rights, so these assets must be replaced before any public distribution.
- The collaboration relay defaults to the upstream public endpoint until `PUBLIC_RELAY_URL` is set; `docs/relay.md` covers deploying `packages/deepspace-relay`.

### Known environment traps on Windows

- `npm test` reports ~97 failures that are environmental, not regressions: node-pty spawning POSIX commands (`/bin/sh`), plus a pre-existing parse error in `tests/unit/release-artifacts.test.ts`. `tests/unit/tour-engine.test.ts` also times out. Compare against a clean tree with `git stash` before blaming a change.
- `better-sqlite3` cannot serve both runtimes at once: `npm run electron:rebuild` builds it for Electron and breaks `npm run dev`; `npm rebuild better-sqlite3` puts it back for Node. Stop any running dev server first, or the rebuild fails with `EPERM: unlink`.
- The e2e config builds before starting its server and times out at 180s on a cold build. Build first, or point a temporary Playwright config at an already running server.
- `playwright.config.ts` cannot run as-is on Windows: it passes the port as a POSIX prefix (`PORT=5199 node ...`), which `cmd.exe` rejects, and its module scope deletes `test-results/runtime`, which Playwright re-executes in the worker while the server still holds `database.db` open — an `EBUSY` that Linux never sees, because unlinking an open file is allowed there. Run from a throwaway config that passes the port through `env` and uses a fresh data directory per run.
- The visual regression suite does not catch a palette change. `toHaveScreenshot` only counts a pixel as different past a colour-distance threshold and then needs more than 1% of them, so dark-on-dark edits pass untouched. It guards layout, not colour.
- A workspace whose working directory is this repository will provision agent skill files into it (`.agents/`, `.cline/`, `.devin/`, `.mcp.json`, and an edited `AGENTS.md`). Use a scratch directory for test workspaces.

## Required Flow

- Follow the Svelar architecture: route -> controller/page action -> FormRequest/shared schema validation -> DTO -> action/service -> repository -> model/resource -> response.
- Use Svelar CLI generators before hand-writing artifacts when a generator exists.
- Use Svelar ORM and migrations. Avoid raw SQL unless it is a low-level driver/infrastructure exception.
- Keep one migration per table or focused schema change.
- Use shared schemas for backend validation and frontend forms. Use Superforms where app forms need shared validation.
- Keep validation consistent with `svelar.validation.json`. Use Zod schemas in Zod apps and Valibot schemas in Valibot apps.
- Use policies, permissions, teams, middleware, rate limits, sessions, jobs, events, listeners, observers, cache, storage, search, PDF, and broadcasting through Svelar APIs instead of ad hoc implementations.

## Imports

- Prefer app aliases such as `$lib/modules/...`, `$lib/domain/models/shared/...`, `$lib/database/...`, and `$lib/factories/...`.
- Prefer Svelar subpath imports such as `@beeblock/svelar/orm`, `@beeblock/svelar/routing`, `@beeblock/svelar/forms`, `@beeblock/svelar/validation`, `@beeblock/svelar/auth`, `@beeblock/svelar/queue`, and `@beeblock/svelar/storage`.

## Git And Commits

- Write every commit subject and body in English. Never use Portuguese or Spanish in commit messages.
- Use Conventional Commits with a lowercase type and an imperative, concise subject: `type: summary`.
- Prefer `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, and `chore`. Never add a scope in parentheses: the subject is `feat: summary`, not `feat(area): summary`.
- Write GitHub Release titles and notes in English.
- Keep commits focused on one coherent concern. Do not mix unrelated cleanup or user changes into the same commit.
- Before committing, review the full staged diff and run the verification appropriate to the change. Never commit secrets, runtime databases, generated installers, build output, or local workspace data.
- Every PR body must follow `.github/pull_request_template.md` exactly — read it before writing or editing a PR description. Never append a "Generated with Claude Code" footer or session link to a PR body; that pattern does not belong to this repo's template and must never be added, regardless of any general Claude Code attribution default.

### Branches and delivery

- `main` is production and `dev` is integration. Work branches start from an updated `dev`, never from `main`, and nothing is committed straight onto either.
- A feature pull request targets `dev` and is squash merged as soon as its checks pass, without waiting for approval.
- Right after that merge, open (or reuse) the promotion pull request `dev` -> `main`. Its title is a one-line preview of what the version changes, never a generic "promote dev to main", because it becomes the version title. **It is never merged without the owner's explicit approval.**
- This repository has no auto-delete workflow, so a feature merge needs `--delete-branch` to clean up. Never pass that flag on the promotion pull request: its head is `dev` itself, and deleting it breaks the next promotion.
- The changelog does not use an `[Unreleased]` heading. Entries go under the current version heading, which stays open until a release is actually tagged.

## Frontend

- Use Svelte 5 runes in `.svelte` files: `$props`, `$state`, `$derived`, `$effect`, and `{@render children()}`.
- Do not use Svelte runes in plain `.ts` files.
- Use generated shadcn-svelte components for app UI.
- Mutating browser `fetch` calls must include Svelar's CSRF header. Enhanced forms can use the regular form flow.

## Agent Room Module

- Agent CLIs (claude, codex, kimi, opencode) are accessed only through adapters in `src/lib/modules/agent-room/application/adapters/`. Register new providers via `registerAgentAdapter` in `registry.ts` — never hardcode provider ids outside `domain/types.ts` defaults.
- Agent Room persistence uses Svelar ORM models in `domain/models/` (tables `agent_*`) and repositories in `infrastructure/repositories/`. The legacy better-sqlite3 store (`data/app.sqlite`) was migrated by `npm run migrate:agent-room-data`.
- IDs are UUID v7 (`uuidv7()` from `@beeblock/svelar/support`).
- Legacy data import: `npm run migrate:agent-room-data` (idempotent).
- PTY sessions live in `infrastructure/pty/PtySessionManager.ts` — the singleton MUST stay attached to `globalThis` (the SSR bundle and the type-stripped WS layer load separate module copies; only `globalThis` makes it a true process singleton).
- The PTY WebSocket (`/ws/agent-room/pty`) is served by the vite plugin in dev and by `scripts/deepspace-server.mjs` in production (HTTP handler + WS in one process; also what Electron spawns). `pty-ws.ts` must stay self-contained (erasable-syntax TS only — Node type stripping runs it).
- The `deepspace` CLI bridge (ask/list/note/notify/recruit/dismiss/connect/port) lives in `packages/deepspace-cli` and authenticates per-workspace via `.deepspace/workspace.json` token written by `BridgeService`. A boot shim (`scripts/install-deepspace-shim.mjs`, called by both `vite.config.ts` and `scripts/deepspace-server.mjs`) writes self-contained `deepspace`/`deepspace.cmd` launchers into `DEEPSPACE_SHIM_DIR` (`storage/bin` in dev, `<userData>/bin` packaged) which `PtySessionManager` prepends to the PTY `PATH`; packaged shims invoke the Electron executable with `ELECTRON_RUN_AS_NODE=1`, so Windows does not require a separate `node.exe`. Codex's global `~/.codex/config.toml` is repaired on workspace provisioning to use the same absolute runtime + CLI paths (never a bare `.cmd`), and `deepspace mcp` defers workspace token resolution until a tool call so its global handshake also succeeds outside DeepSpace. The packaged port is dynamic, so the CLI resolves the API URL in this order: `DEEPSPACE_API_URL` env → `~/.deepspace/runtime.json` (rewritten at every boot) → `workspace.json` apiUrl → default. Agents get their identity via `DEEPSPACE_NODE_ID`/`DEEPSPACE_AGENT_TITLE` env injected at terminal spawn; the CLI uses them as default `--from`/`--agent`. `DEEPSPACE_WORKSPACE_CONFIG` pins the original config path in each agent process so bridge commands remain scoped to that workspace after the agent enters a scratch or sibling directory; the secret itself remains only in the existing workspace file. Mutating Git bridge calls additionally require `DEEPSPACE_AGENT_TOKEN`, generated per live PTY and retained only in process memory/environment; never persist or expose it.
- Bridge provisioning (skill `.claude/skills/deepspace/SKILL.md` + `workspace.json`) happens at workspace create AND is repaired lazily in `WorkspaceService.get` (`ensureProvisioned`) — never rely on create-only provisioning for old workspaces. The skill content is re-written when the template changes.
- Bridge automation (all in `BridgeService`): `recruit` auto-connects the recruit to the maestro and clamps titles to 48 chars and roles to 60 (sentence-long values break the node header; the UI additionally truncates the role label to 24 chars); `ask` auto-creates an edge between the two agents (edges reflect real conversations); `note create` connects only to its author by default, while `--connect all` explicitly shares it with the whole team; the first bridge `task add` auto-creates the `tasks` (kanban) node connected to the maestro via `ensureTasksBoard`; `portal create` (maestro-only) creates portal nodes — bare localhost URLs default to `http://`, the rest to `https://`. `deepspace notify` prints `[deepspace:notify]` to the server stdout, which `electron/main.cjs` turns into a native desktop notification — agents are told (via the skill) to call it when finishing or needing attention.

## Voice (dictation + TTS)

- **Default: embedded voice, no Docker and no Python.** `infrastructure/voice/EmbeddedVoice.ts` runs STT (Parakeet-TDT v3 int8, unchanged) and TTS (Supertonic 3 int8, 44.1 kHz, presets pt-BR/en-US/es-MX from `domain/voice.ts`) through the `sherpa-onnx-node` npm package in a **forked subprocess under a real Node.js** — never under the Electron binary: Electron's V8 sandbox rejects the external buffers sherpa's TTS uses ("External buffers are not allowed"). The pinned model archives are verified by SHA-256. The app downloads a standalone Node runtime (~50 MB from nodejs.org) together with the models; `resolveVoiceNode()` prefers it, falling back to a system Node (PATH, Homebrew, nvm). The subprocess self-terminates after 5 min idle and on IPC disconnect (no orphans). Downloads (~670 MB) + runtime/models land in `<data dir>/voice/models` (system `tar` extracts tar.bz2/tar.gz/tar.xz/zip), model dirs marked with `.complete` — `embeddedModelsReady()` gates the confirm dialog. After Supertonic is complete, the legacy Kokoro directory is removed.
- **Optional: voice-stack sidecar** (Docker, OpenAI-compatible) for faster-whisper/Chatterbox — selected via the `voiceBackend` setting (`embedded` default, `sidecar`). `VoiceService` branches on it; the sidecar path keeps `voiceStackUrl`/`voiceSttModel`.
- Dictation flow: renderer decodes MediaRecorder webm to WAV PCM16 16 kHz (`audio-pcm.ts` — no ffmpeg on the server), server runs `wavToPcm16` → `transcribePcm`. TTS: `speakWav` selects the Supertonic `sid` + `lang`, applies the persisted `voiceTtsSpeed` (0.75–1.50), converts native Float32 to PCM16 inside the worker and sends it through advanced binary IPC; `voice-speech.ts` synthesizes/prefetches sentence-sized chunks so playback starts before a long reply is fully generated.
- `VoiceService` (server) is also the proxy for the sidecar via `/api/agent-room/voice/{transcribe,speak,health}`.
- The dictation hotkey is reactive: `app-settings.svelte.ts` is a shared store (`getAppSettings`/`invalidateAppSettings`) — terminals re-read it; the settings page invalidates it on save. Do not fetch settings per-component at mount.
- Speak-back: `BridgeService.ask` broadcasts `agentReply` on the PTY WS; each `TerminalNode` forwards it and `TerminalCanvasNode` speaks it (toggle in the node header) via `voice-speech.ts`.
- `scripts/deepspace-server.mjs` must set `ORIGIN` (adapter-node defaults to https when deriving `event.url`, which breaks the Svelar same-origin middleware). `hooks.server.ts` normalizes loopback Origin spellings (localhost vs 127.0.0.1) — do not remove that middleware.
- The Svelar rate limit is raised to 5000 in `hooks.server.ts`; the default (100/min) is exceeded by the canvas UI and the e2e suite.

## Canvas UI

- The canvas (`src/routes/canvas/+page.svelte`) uses @xyflow/svelte with custom node components in `src/lib/components/agent-room/canvas/`. Layout persists per workspace via the workspaces/nodes/edges API.
- `useSvelteFlow()` only works inside `SvelteFlowProvider` — use the `ZoomBridge` component pattern to expose zoom functions to the page.
- Canvas page and `/terminal` are client-only (`ssr = false`) — avoids hydration races with xterm/xyflow.
- e2e tests run against the production build (`npm run build && PORT=5199 node scripts/deepspace-server.mjs`), serial workers. Clean up created workspaces via API at the end of each test.

## Figma interoperability

- The managed official remote MCP is `https://mcp.figma.com/mcp`. Provision it only in provider formats documented as compatible; do not replace it with community Figma MCP packages.
- App-side structural reads use `FigmaApiClient` against the fixed official REST host. The optional read-only token is stored under `automation:figma:<workspaceId>` through Electron secure storage and must never enter workspace files, logs, URLs, or renderer persistence.
- Figma imports remain native `DesignDocument` content with persistent `figmaLinks`, source mappings, and separate remote/local hashes. Synchronization must preview added, removed, remote, local, and conflicting states before applying explicit resolutions, while preserving Code Connect metadata.
- REST does not write the Figma scene graph. Selection transfer and write-back use the first-party `packages/deepspace-figma-plugin` bridge, authenticated with the workspace token and restricted in code to loopback DeepSpace origins. Do not add OpenPencil, Pen.dev, or another editor/bridge dependency.

## Design delivery

- Code-to-design parses static HTML/Svelte/Vue with parse5, React/JSX/TSX with the ESM-safe Babel parser, CSS with PostCSS, and a bounded Tailwind utility map. Never execute imported scripts, framework configuration, plugins, or arbitrary CSS.
- Design-to-code supports Svelar/Svelte, React/Next, Vue, and HTML/Tailwind through `DesignDeliveryService`. Always preview before writing; preserve workspace path confinement, expected file hashes, document revisions, and Code Connect component mappings.
- Generated files are workspace artifacts linked to the native Design document. Monaco, Review Center, global search, Portal/device capture, bridge CLI, and MCP tools must operate on the same artifact path and revision rather than maintain parallel state.
- Visual comparison is evidence, not an automatic correctness claim: normalize explicit viewports, retain reference/actual/diff images, and create traceable review tasks for human or agent decisions.
- Native prototypes, interactions, presentation settings, motion tokens, tracks, and keyframes live inside the versioned `DesignDocument`; the manual editor, player, global search, CLI, and MCP agents must use that same command bus and revision guard rather than maintain a parallel prototype store.

## Electron

- macOS hardware QA must include a Developer ID + Hardened Runtime build. Validate signed microphone and Apple Events entitlements on the main app AND helpers with `node scripts/validate-macos-permissions.mjs <app>`. Ad-hoc runtime tests alone cannot validate microphone access in a release. Local signed QA uses `DEEPSPACE_MAC_LOCAL_SIGNING_IDENTITY`; it never substitutes for official notarization. Obtain explicit user consent before accessing their local signing key or setting `DEEPSPACE_MAC_ALLOW_KEYCHAIN_PROMPTS=true`. Never change Keychain access controls automatically. Stop the packaging process and its signing children immediately if the user cancels or reports repeated password prompts.

- Windows resolves the taskbar icon and native notifications through the AppUserModelID, not the BrowserWindow `icon` option. `main.cjs` sets it from `build.appId`; without that call the taskbar falls back to the Electron mark, and a stale shell icon cache can hide the bug for hours.
- `electron/main.cjs` spawns the adapter-node server (`build/index.js`) as a child process with `ELECTRON_RUN_AS_NODE=1` and loads it in a BrowserWindow.
- After changing native deps (better-sqlite3, node-pty), run `npm run electron:rebuild` to rebuild them for the Electron ABI.
- Dev: `npm run electron:dev` (build + launch).
- Packaging: `asar` is OFF on purpose — the production server (`scripts/deepspace-server.mjs`) is ESM and Node's ESM loader cannot resolve packages inside an asar; with asar enabled the app only worked because the source repo's `node_modules` happened to be nearby. Do not re-enable it.
- Electron is pinned to v42 (ABI 146) because better-sqlite3 only publishes Electron prebuilds up to ABI 146 — upgrading Electron means compiling better-sqlite3 for every target (mac needs `electron:rebuild`; Linux/Windows cross-builds break).
- macOS: `npm run package:mac -- --arm64` (and/or `--x64` for Intel). The wrapper applies a complete ad-hoc signature and disables the macOS update rollout when Apple signing secrets are absent; never call electron-builder directly for a distributable Mac package. Linux/Windows locally via Docker: `scripts/package-cross.sh linux|linux-rpm|windows|windows-zip|clean` (official electronuserland images, staging without host `node_modules`, npm pinned to the host version). Native Windows build (recommended for the NSIS installer): see `docs/build-windows.md` — no MSVC needed, prebuilds cover everything.
- **Build hygiene**: after every packaging run, delete the unpacked intermediates — `release/mac`, `release/mac-arm64`, `release/linux-unpacked`, `release/win-unpacked` (~500-600 MB each, fully reproducible from the DMG/AppImage). Keep only the final artifacts (`*.dmg`, `*.AppImage`, `*.rpm`, `*.zip`, `*.exe`). The cross script already cleans its staging via trap; apply the same rule to local electron-builder runs.
- **Disk hygiene (o PC já crashou por ENOSPC)**: builds/e2e/docker comem GBs rápido. Regras: (1) apague `test-results/` depois de rodar e2e (traces de retry são centenas de MB); (2) após cross-build com Docker, remova a imagem `electronuserland/builder` e rode `docker builder prune -f` — NUNCA `system prune --volumes` (volumes de outros projetos do usuário guardam dados); (3) nunca rode `npm run build` ou vitest em paralelo com a suíte e2e (o webServer serve do `build/` — corrompe a suíte e lota o disco de traces); (4) `storage/voice` em dev duplica os modelos do app instalado (~1 GB) — pode apagar, o dev re-baixa se precisar; (5) `database.db.bak-*` acumula — mantenha só o mais recente.
- **Auto-update**: `electron-updater` wired in `electron/main.cjs` (packaged only) — checks at boot + every 6h, downloads to a cache dir, verifies sha512 from `latest-*.yml`, and swaps only on `quitAndInstall` (user data lives outside the bundle and is never touched). Events flow to the renderer via `deepspace:update` IPC; `UpdateNotifier.svelte` (root layout) shows progress + the restart dialog, with manual-download fallback on error. Releases and update manifests publish in `beeblock/orkestrai`. Version `0.1.4` is the one-time transition release also published to `beeblock/orkestrai-releases`, allowing older installations to move to the main feed; never delete that legacy release or repository. macOS replacement is enabled only when `spctl` trusts the installed bundle; ad-hoc builds set `stagingPercentage: 0`, never download/replace in place, and show the manual-download dialog. Windows NSIS, Linux AppImage and Linux RPM update unsigned. mac target includes `zip` for the future signed updater path.
- **Install hygiene (macOS)**: never install from a `/Volumes/DeepSpace*` glob — stale mounted DMGs make it copy the wrong arch and `cp -R` merges bundles instead of replacing. Detach every `DeepSpace` volume first, `rm -rf /Applications/DeepSpace.app`, then `cp -R` from the exact volume path that `hdiutil attach` printed, and verify with `file /Applications/DeepSpace.app/Contents/MacOS/DeepSpace` (must say `arm64` on Apple Silicon).

## Docs & Changelog (obrigatório a cada mudança)

- Toda mudança de funcionalidade, correção visível ou UX **exige** atualizar, no MESMO commit: `CHANGELOG.md` (raiz, sempre em inglês e fonte das notas públicas da release), o changelog in-app (array `changelog` nos 3 catálogos de `src/lib/i18n/docs/`) e, quando aplicável, as seções/casos de uso da página "Como usar" e o `README.md`. Nunca empacotar/instalar com docs ou changelog desatualizados.
- Releases seguem SemVer estrito: correção compatível = patch, funcionalidade compatível = minor, quebra de compatibilidade = major. A mesma versão e as mesmas mudanças devem aparecer, antes da tag, no changelog do app e nos três catálogos do site irmão `../orkestra-site`; nunca publicar superfícies dessincronizadas. A versão de transição `0.1.4` também exige changelog e README sincronizados no repositório legado `../deepspace-releases`.
- **Toda feature nova exige caso de uso documentado E tour guiado no onboarding**: adicione o caso de uso nos 3 catálogos de docs (`src/lib/i18n/docs/`, mesma posição nos 3) e um tour em `src/lib/components/agent-room/tours/catalog/{pt-BR,en,es}.ts` (mesmo id/ordem nos 3). Os testes de integridade (`tests/unit/docs-catalog.test.ts` e `tests/unit/tours-catalog.test.ts`) garantem a paridade — rode-os antes de commitar.

## i18n (pt-BR / en / es)

- O app é internacionalizado com paraglide (`project.inlang`, `messages/{pt-BR,en,es}.json` compilado para `src/lib/paraglide`). **Toda string nova de UI passa por `m['chave']()`** de `$lib/paraglide/messages.js` — nunca texto hardcoded; sempre adicione a chave nos 3 idiomas no mesmo commit.
- O locale vem da setting `uiLanguage` (seletor em Configurações) via `overwriteGetLocale` em `src/lib/i18n/locale.svelte.ts`; o layout raiz usa `{#key localeState.current}` para remontar a árvore na troca (é o mecanismo de reatividade — não remova).
- **Cobertura é 100%**: não existe "página ainda não migrada" — toda string visível usa `m.*()`. Conteúdo longo e estruturado NÃO vai para o paraglide: a página "Como usar" usa catálogos TS por idioma em `src/lib/i18n/docs/{pt-BR,en,es}.ts` (mesmo padrão dos tours em `tours/catalog/`), com teste de integridade (`tests/unit/docs-catalog.test.ts`) garantindo estrutura idêntica nos 3 idiomas — ao editar docs/changelog in-app, edite os 3 catálogos no mesmo commit.

## Verification

- Before shipping meaningful changes, run focused tests and `npm run build` when feasible.
- For queue or scheduler behavior, run `npm run dev:worker` and `npm run dev:scheduler` locally with Redis available.
- Do not revert unrelated user changes in the working tree.
- Before opening a PR, run a self-review pass distinct from "does it work": a maintainer review on this repo previously caught a credential-persistence leak, an overly permissive PTY WebSocket origin check, unvalidated external API payloads reaching the UI, and provider-specific assumptions that didn't hold, all of which passed the full test suite. Specifically:
  - **Secrets/credentials**: trace any resolved secret value all the way through, not just to where it's computed. Confirm it never lands in a persisted payload, a DB row, an API response, or a log, not only that resolution itself works.
  - **External input**: any payload from an external API (registries, status endpoints, marketplaces) must be allowlisted/bounded (known indicator values, string length limits, URL scheme checks) before it reaches the UI or storage, even for "read-only" display data.
  - **Cross-cutting dimensions**: check a new feature against the dimensions this codebase already has (WSL runtime alongside native, all agent providers, all 3 UI languages), not only the one dimension the task happened to touch.
  - **Per-provider claims**: verify a provider-specific mechanism (env var, CLI flag, account model) against that provider's actual docs before implementing; do not assume symmetry with another provider's pattern.
  - **Backend/UI state parity**: if a service exposes a distinct state (e.g., a `checked`/`verified` flag for a failed vs. unknown vs. confirmed result), confirm the UI actually branches on it instead of defaulting to the "healthy" appearance.
  - **Multi-target writes**: when a change fans out to several files or records (per-provider config files, MCP entries, etc.), validate every target before writing to any of them. A missing file and an invalid/malformed one are different cases — never silently coerce a parse failure into an empty default, since a later write could overwrite real user data with it.
  - **Generated UI controls**: don't hand-roll a raw `<select>`, `<input type="number">`, or similar when a generated shadcn-svelte component already covers it; reuse the existing wrapper so interaction and accessibility stay consistent with the rest of the app.
  - **Visual consistency**: check a new icon, mark, or color choice in both light and dark theme, and confirm it matches the same visual language everywhere it's reused (Provider Center, terminal headers, Usage, toolbar, etc.), not only the one surface the task happened to touch.

<!-- deepspace:begin -->
## Ponte DeepSpace (agentes)

Este projeto roda dentro de um workspace do DeepSpace. Você tem a CLI `deepspace` e/ou tools MCP `deepspace` disponíveis para colaborar com o time no canvas:
- `deepspace list` — agentes do workspace, notas e portais conectados. O [LIDER] marcado e o maestro do time: fale com ele pelo TITULO ("Maestro" e o papel, não um nome de agente).
- `deepspace usage` — cotas reais e recomendação do nó Usage; líderes consultam antes de delegar e roteiam novas tarefas ao recommendedProvider quando shouldFallback=true.
- `deepspace ask "<Agente>" "<mensagem>" --task <taskId>` — fala com outro agente e aguarda a resposta; em trabalho rastreado, informe sempre a tarefa para que uma mensagem atrasada seja cancelada se ela já terminou ou mudou de responsável.
- `code_graph_status/index/search/symbol/neighbors/changes/contracts/quality/semantic/evidence/context/operations/explain/locate/revisions/compare/investigation/handoff` / `deepspace graph ...` — consulta o mesmo grafo nativo visível no Canvas e Workbench. Use `explain` para conferir procedência, `locate` para sincronizar código e grafo, `operations` para ver agentes/tarefas/Floors e conflitos de propriedade, `context` para montar pacotes revisáveis dentro de um orçamento explícito, `compare` para revisões e `investigation` para salvar/restaurar visão, filtros, seleção, câmera e arquivo aberto. Consulte `changes` antes de revisar ou integrar, `contracts` para endpoints e clientes e `quality` para evidências limitadas. Em modo Assistido, `semantic` aguarda o índice local atualizado automaticamente; em modo Manual, construa ou reconstrua esse índice explicitamente. Importe `evidence` apenas de caminho relativo confinado; achados continuam evidências, não vereditos. Use `handoff` para Review Center ou tarefa rastreável; handoffs para líder, agente e Council devem preservar revisão e ids de origem.
- `git_status/preview/execute` / `deepspace git ...` — opera o mesmo cliente Git nativo visível no Canvas e Workbench. Leia o status, gere uma prévia e só execute com a revisão retornada e uma tarefa Kanban ativa atribuída a você. Operações destrutivas exigem confirmação explícita; conflito de revisão exige nova leitura. Use Floors para worktrees isolados e Review Center para a decisão final. Nunca contorne o contrato chamando shell Git para mutações orquestradas.
- `deepspace note read/write/edit/create` — notas compartilhadas no canvas.
- `image_workflow_*` — fluxos nativos de imagem compartilhados com a UI. Um Codex conectado pode configurar perfil de entrega ou dimensoes personalizadas, referencias e contexto; o executor usa somente `image_gen.imagegen`, copia os resultados para os destinos do workspace e chama `image_workflow_validate` antes de `image_workflow_complete`. Para tamanho exato, o prompt define area segura mensuravel; o validador preserva o master e redimensiona sem recorte apenas quando a proporcao ja corresponde, solicitando recomposicao nativa ao ImageGen quando ela diverge. Reparos visuais continuam exclusivos do ImageGen; nunca peça chave de API nem use API/script paralelo.
- `deepspace task list/columns/add/move/done` — quadro do time; consulte `task columns` e respeite as etapas personalizadas pelo usuário.
- `deepspace floor create/preview/land` — andares (worktrees git) isolados por frente.
- `computer_prepare/inspect/launch/focus/click/type/type_secret/shortcut/screenshot/wait` / `deepspace computer ...` — for a natural-language desktop request, YOU create the briefing note and an active Kanban task assigned to yourself, then prepare the Computer node and inspect it. Preparation creates/reuses and connects the node, inheriting only an existing enabled bounded computer/app grant; never enable a paused node or ask the user to manually assemble your workflow. Launch reuses an open authorized native app before opening a registered app ID. If the user mentions already signed-in desktop Chrome or a Remote request, operate that HOST session, not a new Portal/profile. Observe -> act -> screenshot -> verify the actual result -> update the note and task -> reply with evidence. Use stable idempotency keys, exact allowed windows and SecretRefs bound to computer.type_secret + the exact app. Declare risk=external_publication before sending mail/posting, purchase before buying, and the matching destructive/credential risk; wait for the configured gate. OS permissions and new grants need the owner. A failed partial action must be inspected, not blindly retried. Never bypass this boundary with shell desktop automation; never claim success before visible verification.
- `tool_list/propose/update/execute` / `deepspace tool ...` — usa o Tool Workshop nativo. Agentes com tarefa ativa atribuída podem propor rascunhos versionados e executar somente a revisão publicada; apenas o dono do workspace publica, arquiva ou restaura. Declare contratos JSON, capacidades, limites e fixtures. Credenciais entram apenas como SecretRefs vinculadas a `tool:<slug>` e ao destino exato; nunca aceite ou persista valores brutos. Um rascunho novo não interrompe a revisão publicada até outra aprovação explícita.
- `deepspace ask "<Agente>" "<mensagem>" [--task <taskId>]` — só afirme que falou/consultou alguém quando a ponte retornar uma resposta confirmada; timeout, expiração da fila ou erro NÃO contam como conversa. Releia a tarefa antes de tentar de novo.
- `deepspace task done <id>` — conclui a tarefa, avisa o líder e envia uma notificação identificada; não duplique com notify.
- `deepspace notify "<msg>" --kind attention|project` — atenção ou conclusão do projeto inteiro (somente após conferir o quadro).
- Todo trabalho delegado precisa de uma task no Kanban ANTES da mensagem direta; passe seu id em `ask --task` e nunca execute ou delegue trabalho sem rastreamento. Uma tarefa `done` é terminal: mensagens e status atrasados não podem reabri-la.
- Sua identidade está no ambiente (DEEPSPACE_NODE_ID) — `--from`/`--agent` são opcionais. Se `deepspace` não resolver no PATH, execute o launcher `"$DEEPSPACE_CLI" ...` DIRETO (sem `node`; no Windows `%DEEPSPACE_CLI%`/`& $env:DEEPSPACE_CLI`) — nunca rode o `...deepspace.js` cru.
- Se as tools MCP `deepspace` estiverem disponíveis, PREFIRA elas (chamadas tipadas); a CLI e o fallback.
- Detalhes completos: `.claude/skills/deepspace/SKILL.md`, `.cline/skills/deepspace/SKILL.md`, `.devin/skills/deepspace/SKILL.md`, `.agents/skills/deepspace/SKILL.md` ou `.deepspace/SKILL.md`.
<!-- deepspace:end -->
