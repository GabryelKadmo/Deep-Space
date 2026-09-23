import { z } from 'zod';
import {
  MAX_CONSOLE_COMMAND_FOLDER,
  MAX_CONSOLE_COMMAND_LENGTH,
  MAX_CONSOLE_COMMAND_NAME,
} from '$lib/modules/agent-room/domain/console-commands.js';

export const createConsoleCommandSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do comando.').max(MAX_CONSOLE_COMMAND_NAME),
  command: z.string().trim().min(1, 'Informe o comando.').max(MAX_CONSOLE_COMMAND_LENGTH),
  folder: z.string().trim().max(MAX_CONSOLE_COMMAND_FOLDER).optional(),
  runOnOpen: z.boolean().optional(),
});

export const updateConsoleCommandSchema = z.object({
  name: z.string().trim().min(1).max(MAX_CONSOLE_COMMAND_NAME).optional(),
  command: z.string().trim().min(1).max(MAX_CONSOLE_COMMAND_LENGTH).optional(),
  folder: z.string().trim().max(MAX_CONSOLE_COMMAND_FOLDER).optional(),
  runOnOpen: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export type CreateConsoleCommandInput = z.infer<typeof createConsoleCommandSchema>;
export type UpdateConsoleCommandInput = z.infer<typeof updateConsoleCommandSchema>;
