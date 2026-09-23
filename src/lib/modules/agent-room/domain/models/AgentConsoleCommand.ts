import { Model } from '@beeblock/svelar/orm';

export class AgentConsoleCommand extends Model {
  static table = 'agent_console_commands';
  static primaryKey = 'id';
  static incrementing = false;
  static timestamps = true;
  static fillable = ['id', 'workspace_id', 'folder', 'name', 'command', 'run_on_open', 'position', 'created_at', 'updated_at'];

  static casts = {
    position: 'number' as const,
    run_on_open: 'boolean' as const,
    created_at: 'date' as const,
    updated_at: 'date' as const,
  };

  declare id: string;
  declare workspace_id: string;
  declare folder: string;
  declare name: string;
  declare command: string;
  declare run_on_open: boolean;
  declare position: number;
  declare created_at: Date;
  declare updated_at: Date;
}
