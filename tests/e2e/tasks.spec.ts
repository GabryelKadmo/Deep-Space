import { expect, test } from '@playwright/test';
import { createNodeOnCanvas, openNewWorkspaceDialog } from './helpers';

test.describe('quadro de tarefas (kanban)', () => {
  test('cria, arrasta entre colunas, edita e remove tarefas', async ({ page, request }) => {
    const workspaceName = `E2E kanban ${Date.now()}`;

    await page.goto('/canvas');
    await openNewWorkspaceDialog(page);
    await page.getByPlaceholder('Nome', { exact: true }).fill(workspaceName);
    await page.getByPlaceholder('Diretório de trabalho').fill('/tmp');
    await page.getByRole('button', { name: 'Criar' }).click();
    await page.locator('.workspace-list .workspace-item', { hasText: workspaceName }).click();

    await createNodeOnCanvas(page, 'Tarefas');
    await expect(page.locator('.canvas-tasks')).toHaveCount(1);

    // Cria pela propria coluna: Enter cria e deixa o cartao aberto para a
    // proxima; Esc fecha.
    const board = page.locator('.canvas-tasks');
    const todoColumn = board.locator('.tb-column').first();
    const doingColumn = board.locator('.tb-column').nth(1);
    await expect(todoColumn).toContainText('A fazer');

    await todoColumn.locator('.tb-column-add').click();
    const todoInput = todoColumn.locator('.tb-composer input');
    for (const title of ['Revisar PR do auth', 'Escrever testes do parser']) {
      await todoInput.fill(title);
      await todoInput.press('Enter');
      await expect(todoInput).toHaveValue('');
    }
    await todoInput.press('Escape');
    await expect(board.locator('.tb-composer')).toHaveCount(0);
    await expect(todoColumn.locator('.tb-card')).toHaveCount(2);

    // Criar em outra coluna ja nasce nela, sem passar por "A fazer".
    await doingColumn.locator('.tb-column-add').click();
    await doingColumn.locator('.tb-composer input').fill('Deploy de staging');
    await doingColumn.locator('.tb-composer input').press('Enter');
    await doingColumn.locator('.tb-composer input').press('Escape');
    await expect(doingColumn.locator('.tb-card')).toHaveCount(1);

    // Arrasta a primeira tarefa para "Fazendo" (drag and drop)
    const firstCard = todoColumn.locator('.tb-card').first();
    await firstCard.dragTo(doingColumn);
    await expect(doingColumn.locator('.tb-card')).toHaveCount(2);

    // Edita o titulo com duplo-clique
    const renamed = todoColumn.locator('.tb-card .tb-title').first();
    await renamed.dblclick();
    await board.locator('.tb-edit').fill('Escrever testes do parser (urgente)');
    await page.keyboard.press('Enter');
    await expect(todoColumn.locator('.tb-card .tb-title').first()).toHaveText('Escrever testes do parser (urgente)');

    // Persistiu no backend?
    const list = await request.get('/api/agent-room/workspaces');
    const workspace = ((await list.json()).data as Array<{ id: string; name: string }>).find((item) => item.name === workspaceName)!;
    const tasksResponse = await request.get(`/api/agent-room/workspaces/${workspace.id}/tasks`);
    const tasks = (await tasksResponse.json()).data as Array<{ title: string; status: string }>;
    expect(tasks).toHaveLength(3);
    expect(tasks.map((task) => task.status).sort()).toEqual(['doing', 'doing', 'todo']);

    // Remove uma tarefa pela acao nomeada (outros icones podem vir antes dela).
    await board.locator('.tb-card').first().getByRole('button', { name: 'Remover tarefa' }).click();
    await expect(board.locator('.tb-card')).toHaveCount(2);

    await request.delete(`/api/agent-room/workspaces/${workspace.id}`);
  });
});
