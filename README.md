<p align="center">
  <img src="deepspace-branding/kraken.png" alt="Deep Space" width="420">
</p>

<h1 align="center">Deep Space</h1>

<p align="center">
  <strong>Your AI team, visible and organized.</strong>
</p>

<p align="center">
  English · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.es.md">Español</a>
</p>

Deep Space turns local AI coding agents into a coordinated team. Run multiple
agents on a persistent visual canvas, give each one a role and a task, share
context, and review the work before it reaches your project.

<p align="center">
  <a href="https://github.com/GabryelKadmo/Deep-Space/releases/latest"><strong>Download Deep Space</strong></a>
  ·
  <a href="#quick-start">Quick start</a>
  ·
  <a href="#development">Build from source</a>
</p>

> Deep Space is local-first. Your projects and raw agent sessions stay on your
> computer. Optional integrations use explicit permissions, and credentials are
> kept in the operating system's encrypted storage.

## Why This Fork Exists

Deep Space began as a series of fixes to problems the upstream project left
unaddressed. The clearest example: pasting into an agent terminal needed a
different shortcut per provider (Alt+V, Shift+Insert, Ctrl+V), because xterm
canceled Ctrl+V and each agent CLI decided on its own what that meant.
[This fix](https://github.com/GabryelKadmo/Deep-Space/commit/1500dd213da8fa79fc6e893f35a94419f92c5a85)
makes native paste work the same way everywhere. The project has since
diverged further, with its own visual identity, interface decisions, and
functionality the original project does not have.

## Quick Start

1. **Download Deep Space** for macOS, Windows, or Linux from the
   [latest release](https://github.com/GabryelKadmo/Deep-Space/releases/latest).
2. **Install and sign in to at least one supported agent CLI**, such as Claude
   Code, Codex CLI, or Kimi Code.
3. **Create a workspace** and point it at the project you want to work on.
4. **Add agents, assign tasks, and connect context** directly on the canvas.

You do not need every provider or deep terminal knowledge. Deep Space detects
the CLIs available on your computer and keeps each provider session separate.

## The Interface At A Glance

| Area | What it is for |
| --- | --- |
| **Canvas** | Arrange agents, tasks, notes, browsers, files, devices, and design documents as connected nodes. |
| **Workbench** | Focus on several live artifacts at once with tabs and resizable splits. |
| **Maestro** | Give one agent the lead so it can propose a team, delegate work, and coordinate delivery. |
| **Tasks** | Track ownership and progress on the shared Kanban board. |
| **Floors** | Isolate parallel changes in Git worktrees before reviewing and landing them. |
| **Review Center** | Inspect diffs, evidence, comments, and approvals before integration. |

## What You Can Do

- **Coordinate multiple providers:** combine Claude Code, Codex CLI, Kimi Code,
  OpenCode, Cursor, Antigravity, Cline, Devin, GitHub Copilot, and plain shells
  in the same workspace.
- **Keep work connected:** attach tasks, notes, files, images, browser portals,
  API requests, design documents, and mobile devices to the agents using them.
- **Review before integrating:** use Git-aware Floors, the Review Center,
  Council decisions, and a code intelligence graph to understand impact.
- **Build beyond code:** research, design, test APIs, operate approved desktop
  apps, inspect mobile apps, work with Figma, and run native image workflows.
- **Continue across sessions:** preserve independent agent conversations,
  workspace layout, saved commands, and optional background automations.
- **Control access:** bound roots, hosts, capabilities, quiet hours, and risky
  actions; use encrypted credentials without exposing their raw values to agents.
- **Work by voice or remotely:** use local speech-to-text and text-to-speech, or
  connect an end-to-end encrypted Remote session with a sanitized workspace view.

## Supported Platforms

| Platform | Architectures | Package |
| --- | --- | --- |
| macOS | Apple Silicon and Intel | DMG and update ZIP |
| Windows | x64 | NSIS installer |
| Linux | x64 | AppImage and RPM |

## Supported Agent CLIs

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Codex CLI](https://github.com/openai/codex)
- [Kimi Code](https://www.kimi.com/code)
- [OpenCode](https://opencode.ai/)
- [Cursor Agent CLI](https://docs.cursor.com/en/cli/overview)
- [Antigravity CLI](https://antigravity.google/docs/cli/getting-started)
- [Cline CLI](https://docs.cline.bot/cli/cli-reference)
- [Devin CLI](https://docs.devin.ai/cli)
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli)

Open **Provider Center** from the canvas cable icon, with `Cmd/Ctrl+2`, or from
the native **Workspace** menu to install, authenticate, and verify providers.

## Development

Requirements: Node.js 24+, npm 11+, and Git.

```bash
git clone https://github.com/GabryelKadmo/Deep-Space.git
cd Deep-Space
npm ci

npm run dev            # SvelteKit development server
npm run electron:dev   # Build and launch the desktop app
```

Useful checks:

```bash
npm test
npm run build
npm run test:e2e
```

Voice works without Docker or Python. On first use, Deep Space asks before
downloading its embedded runtime and local speech models.

## Project Map

Deep Space is built with Svelte 5, SvelteKit, Electron, Svelar, SQLite,
`node-pty`, and `@xyflow/svelte`.

- `src/lib/modules/agent-room/` — agents, persistence, bridge, voice, and PTY
- `src/routes/canvas/` and `src/routes/terminal/` — main workspace views
- `packages/` — CLI, collaboration protocol, relay, and Figma plugin
- `electron/` — desktop lifecycle, notifications, packaging, and updates
- `docs/` — focused technical and operational guides

Read [AGENTS.md](AGENTS.md) before changing the architecture or delivery flow.

## Documentation

- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Desktop releases](docs/releases.md)
- [Computer Control](docs/computer-control.md)
- [Encrypted relay](docs/relay.md)

## License

Deep Space is a fork of [Orkestrai](https://github.com/beeblock/orkestrai) and
is licensed under the [Apache License 2.0](LICENSE). Upstream attribution is
preserved in [NOTICE](NOTICE). Third-party components and downloaded models
remain subject to the licenses in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
