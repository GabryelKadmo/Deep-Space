import { Controller } from '@beeblock/svelar/routing';
import { FormRequest } from '@beeblock/svelar/forms';
import { consoleCommandService } from '$lib/modules/agent-room/application/services/ConsoleCommandService.js';
import { createConsoleCommandSchema, updateConsoleCommandSchema } from '$lib/modules/agent-room/contracts/schemas/consoleSchemas.js';

function requestOf(schema: unknown) {
  return class extends FormRequest {
    rules() { return schema; }
    authorize() { return true; }
  };
}

export class ConsoleCommandController extends Controller {
  async index(event: any) {
    try {
      return this.json({ data: await consoleCommandService.list(event.params.id) });
    } catch (error) {
      return this.errorResponse(error, 'Falha ao listar comandos.');
    }
  }

  async store(event: any) {
    try {
      const input = await (requestOf(createConsoleCommandSchema)).validate(event);
      return this.json({ data: await consoleCommandService.create(event.params.id, input) }, 201);
    } catch (error) {
      return this.errorResponse(error, 'Falha ao criar comando.');
    }
  }

  async update(event: any) {
    try {
      const input = await (requestOf(updateConsoleCommandSchema)).validate(event);
      return this.json({ data: await consoleCommandService.update(event.params.id, event.params.commandId, input) });
    } catch (error) {
      return this.errorResponse(error, 'Falha ao atualizar comando.');
    }
  }

  async destroy(event: any) {
    try {
      return this.json({ data: await consoleCommandService.remove(event.params.id, event.params.commandId) });
    } catch (error) {
      return this.errorResponse(error, 'Falha ao remover comando.');
    }
  }

  private errorResponse(error: unknown, fallback: string, status = 400) {
    const message = error instanceof Error ? error.message : fallback;
    const notFound = message === 'WORKSPACE_NOT_FOUND' || message === 'CONSOLE_COMMAND_NOT_FOUND';
    return this.json({ error: message }, notFound ? 404 : status);
  }
}
