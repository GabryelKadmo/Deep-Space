<p align="center">
  <img src="deepspace-branding/kraken.png" alt="Deep Space" width="420">
</p>

<h1 align="center">Deep Space</h1>

<p align="center">
  <strong>Seu time de IA, visível e organizado.</strong>
</p>

<p align="center">
  <a href="README.md">English</a> · Português (Brasil) · <a href="README.es.md">Español</a>
</p>

O Deep Space transforma agentes de programação locais em um time coordenado.
Execute vários agentes em um canvas visual persistente, dê uma função e uma
tarefa para cada um, compartilhe contexto e revise o trabalho antes que ele
chegue ao projeto.

<p align="center">
  <a href="https://github.com/GabryelKadmo/Deep-Space/releases/latest"><strong>Baixar o Deep Space</strong></a>
  ·
  <a href="#comece-agora">Comece agora</a>
  ·
  <a href="#desenvolvimento">Compilar o projeto</a>
</p>

> O Deep Space é local-first. Seus projetos e as sessões completas dos agentes
> ficam no seu computador. Integrações opcionais usam permissões explícitas, e
> as credenciais ficam no armazenamento criptografado do sistema operacional.

## Por Que Este Fork Existe

O Deep Space começou como uma série de correções para problemas que o projeto
de origem deixou sem resposta. O exemplo mais claro: colar em um terminal de
agente exigia um atalho diferente por provedor (Alt+V, Shift+Insert, Ctrl+V),
porque o xterm cancelava o Ctrl+V e cada CLI de agente decidia por conta
própria o que aquilo significava.
[Esta correção](https://github.com/GabryelKadmo/Deep-Space/commit/1500dd213da8fa79fc6e893f35a94419f92c5a85)
faz colar nativo funcionar do mesmo jeito em todo lugar. O projeto seguiu
divergindo desde então, com identidade visual própria, decisões de interface
e funcionalidades que o projeto original não tem.

## Comece Agora

1. **Baixe o Deep Space** para macOS, Windows ou Linux na
   [release mais recente](https://github.com/GabryelKadmo/Deep-Space/releases/latest).
2. **Instale e autentique ao menos uma CLI de agente compatível**, como Claude
   Code, Codex CLI ou Kimi Code.
3. **Crie um workspace** e escolha o projeto em que deseja trabalhar.
4. **Adicione agentes, atribua tarefas e conecte o contexto** diretamente no
   canvas.

Você não precisa instalar todos os providers nem dominar o terminal. O Deep
Space detecta as CLIs disponíveis no computador e mantém cada sessão separada.

## A Interface Em Poucas Palavras

| Área | Para que serve |
| --- | --- |
| **Canvas** | Organize agentes, tarefas, notas, navegadores, arquivos, dispositivos e documentos de design como nodes conectados. |
| **Workbench** | Trabalhe com vários artefatos ao vivo usando abas e divisões redimensionáveis. |
| **Maestro** | Escolha um agente líder para propor o time, delegar trabalho e coordenar a entrega. |
| **Tarefas** | Acompanhe responsáveis e progresso no quadro Kanban compartilhado. |
| **Andares** | Isole mudanças paralelas em worktrees Git antes de revisar e integrar. |
| **Central de Revisão** | Confira diffs, evidências, comentários e aprovações antes da integração. |

## O Que Você Pode Fazer

- **Coordenar vários providers:** combine Claude Code, Codex CLI, Kimi Code,
  OpenCode, Cursor, Antigravity, Cline, Devin, GitHub Copilot e shells comuns
  no mesmo workspace.
- **Manter tudo conectado:** ligue tarefas, notas, arquivos, imagens, portais,
  requests de API, documentos de design e dispositivos aos agentes que os usam.
- **Revisar antes de integrar:** use Andares com Git, a Central de Revisão,
  decisões do Council e o grafo de código para entender o impacto das mudanças.
- **Trabalhar além do código:** pesquise, crie designs, teste APIs, opere apps
  autorizados, inspecione apps móveis, use Figma e gere imagens.
- **Continuar entre sessões:** preserve conversas independentes, o layout do
  workspace, comandos salvos e automações opcionais em segundo plano.
- **Controlar o acesso:** limite pastas, hosts, capacidades, horários e ações de
  risco; use credenciais criptografadas sem expor os valores aos agentes.
- **Usar voz ou acesso remoto:** dite e ouça respostas com modelos locais ou
  conecte uma sessão Remote criptografada de ponta a ponta com visão sanitizada.

## Plataformas Compatíveis

| Plataforma | Arquiteturas | Pacote |
| --- | --- | --- |
| macOS | Apple Silicon e Intel | DMG e ZIP de atualização |
| Windows | x64 | Instalador NSIS |
| Linux | x64 | AppImage e RPM |

## CLIs De Agentes Compatíveis

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Codex CLI](https://github.com/openai/codex)
- [Kimi Code](https://www.kimi.com/code)
- [OpenCode](https://opencode.ai/)
- [Cursor Agent CLI](https://docs.cursor.com/en/cli/overview)
- [Antigravity CLI](https://antigravity.google/docs/cli/getting-started)
- [Cline CLI](https://docs.cline.bot/cli/cli-reference)
- [Devin CLI](https://docs.devin.ai/cli)
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli)

Abra a **Central de Providers** pelo ícone de cabo no canvas, com
`Cmd/Ctrl+2`, ou pelo menu nativo **Workspace** para instalar, autenticar e
verificar providers.

## Desenvolvimento

Requisitos: Node.js 24+, npm 11+ e Git.

```bash
git clone https://github.com/GabryelKadmo/Deep-Space.git
cd Deep-Space
npm ci

npm run dev            # servidor de desenvolvimento do SvelteKit
npm run electron:dev   # compila e abre o aplicativo desktop
```

Verificações úteis:

```bash
npm test
npm run build
npm run test:e2e
```

A voz funciona sem Docker ou Python. No primeiro uso, o Deep Space pede
confirmação antes de baixar o runtime embarcado e os modelos locais de voz.

## Mapa Do Projeto

O Deep Space utiliza Svelte 5, SvelteKit, Electron, Svelar, SQLite,
`node-pty` e `@xyflow/svelte`.

- `src/lib/modules/agent-room/` — agentes, persistência, ponte, voz e PTY
- `src/routes/canvas/` e `src/routes/terminal/` — principais visualizações
- `packages/` — CLI, protocolo de colaboração, relay e plugin do Figma
- `electron/` — ciclo de vida desktop, notificações, pacotes e atualizações
- `docs/` — guias técnicos e operacionais focados

Leia [AGENTS.md](AGENTS.md) antes de alterar a arquitetura ou o fluxo de entrega.

## Documentação

- [Como contribuir](CONTRIBUTING.md)
- [Política de segurança](SECURITY.md)
- [Releases desktop](docs/releases.md)
- [Controle do computador](docs/computer-control.md)
- [Relay criptografado](docs/relay.md)

## Licença

O Deep Space é um fork do [Orkestrai](https://github.com/beeblock/orkestrai) e é
licenciado sob a [Apache License 2.0](LICENSE). A atribuição ao projeto de
origem está preservada no [NOTICE](NOTICE). Componentes de terceiros e modelos
baixados continuam sujeitos às licenças listadas em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
