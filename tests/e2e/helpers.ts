import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Makes provider-dependent canvas scenarios deterministic on clean CI hosts.
 * Provider detection itself is covered separately; these tests exercise the
 * creation flow and must not depend on a developer CLI being installed.
 */
export async function mockInstalledProvider(page: Page, providerId: string) {
  await page.route('**/api/agent-room/status**', async (route) => {
    const response = await route.fetch();
    const payload = await response.json() as {
      data?: { providers?: Array<{ id: string; installed: boolean; detail?: string }> };
    };
    if (payload.data?.providers) {
      payload.data.providers = payload.data.providers.map((provider) => provider.id === providerId
        ? { ...provider, installed: true, detail: 'E2E provider fixture' }
        : provider);
    }
    await route.fulfill({ response, json: payload });
  });
}

/** Seleciona um provider no menu compacto de agentes da toolbar. */
export async function selectAgentTool(page: Page, providerName: string) {
  await expect(page.locator('.svelte-flow__pane')).toBeVisible();
  await page.getByTestId('agent-toolbar-menu').click();
  await page.getByRole('menuitem').filter({ hasText: providerName }).click();
}

/**
 * Clica num botao/item de menu pelo texto: direto na barra se estiver
 * fixado, ou pelo menu "mais ferramentas" quando nao estiver — a barra e
 * customizavel, entao nem toda ferramenta/painel fica sempre visivel.
 * Retorna o locator do botao fixado (pra checagens extras, ex.: classe
 * "ativo"), ou null quando o clique saiu pelo menu overflow.
 */
export async function clickToolbarOrOverflow(page: Page, buttonName: string | RegExp, scope = '.toolbar button') {
  const button = page.locator(scope).filter({ hasText: buttonName });
  if (await button.count()) {
    await button.click();
    return button;
  }

  await page.getByTestId('toolbar-overflow-menu').click();
  await page.getByRole('menuitem').filter({ hasText: buttonName }).click();
  return null;
}

/** Seleciona uma ferramenta icon-only pelo texto interno, independente do tooltip traduzido. */
export async function selectCanvasTool(page: Page, buttonName: string) {
  const pane = page.locator('.svelte-flow__pane');
  await expect(pane).toBeVisible();

  // A paleta global pode terminar uma animacao de abertura enquanto o canvas
  // carrega. Feche qualquer overlay residual antes de armar a ferramenta.
  if (await page.locator('[role="dialog"]:visible').count()) await page.keyboard.press('Escape');

  const button = await clickToolbarOrOverflow(page, buttonName);
  if (button) await expect(button).toHaveClass(/bg-\[var\(--app-accent-soft\)\]/);
}

/**
 * Cria um no no canvas: clica na ferramenta da toolbar e depois clica no
 * fundo do canvas (o no nasce com tamanho padrao nessa posicao). Terminais
 * e agentes abrem o dialogo de criacao — confirma com o nome padrao.
 * O lookup e escopado na .toolbar para nao colidir com nomes de workspace.
 */
export async function createNodeOnCanvas(page: Page, buttonName: string, position = { x: 600, y: 400 }) {
  const dialog = page.locator('[role="dialog"]');
  // Garante que o dialog da criacao ANTERIOR ja fechou (animacao de saida)
  // — senao o waitFor abaixo resolve no dialog velho e o novo fica aberto.
  await dialog.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {});
  await selectCanvasTool(page, buttonName);
  await page.locator('.svelte-flow__pane').click({ position });
  try {
    await dialog.waitFor({ state: 'visible', timeout: 2_000 });
    await dialog.getByRole('button', { name: 'Criar agente' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  } catch {
    // nos sem dialogo (nota, arquivos...) nascem direto
  }
}

/**
 * Arrasta do handle de um no ate o handle de outro para criar uma conexao.
 * Os handles so ficam clicaveis (pointer-events) quando o :hover do node
 * shell ativa, pra sumirem quando o mouse nao esta por perto; um
 * mouse.move() direto pras coordenadas do handle "atravessa" ele antes do
 * hover ativar (pointer-events ainda none) e a interacao cai no elemento
 * por baixo — diferente de um usuario real, cujo mouse ja passou pelo corpo
 * do no a caminho da borda. Por isso entra pelo corpo do no primeiro.
 */
export async function dragConnectHandles(page: Page, sourceNode: Locator, targetNode: Locator) {
  const sourceNodeBox = (await sourceNode.boundingBox())!;
  await page.mouse.move(sourceNodeBox.x + sourceNodeBox.width / 2, sourceNodeBox.y + sourceNodeBox.height / 2);

  const sourceHandle = sourceNode.locator('.svelte-flow__handle').first();
  const sourceBox = (await sourceHandle.boundingBox())!;
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2, { steps: 5 });
  await page.mouse.down();

  // Handles do alvo tambem so ficam clicaveis com o :hover do node shell —
  // entra pelo corpo do no antes de mirar no handle exato pra soltar.
  const targetNodeBox = (await targetNode.boundingBox())!;
  await page.mouse.move(targetNodeBox.x + targetNodeBox.width / 2, targetNodeBox.y + targetNodeBox.height / 2, { steps: 5 });
  const targetHandle = targetNode.locator('.svelte-flow__handle').first();
  const targetBox = (await targetHandle.boundingBox())!;
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
  await page.mouse.up();
}
