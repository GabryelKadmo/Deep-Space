import { Migration } from '@beeblock/svelar/database';

export default class CreateAgentConsoleCommandsTable extends Migration {
  async up() {
    await this.schema.createTable('agent_console_commands', (table) => {
      table.uuid('id').primary();
      table.uuid('workspace_id').references('id', 'agent_workspaces');
      table.text('folder').default('');
      table.text('name');
      table.text('command');
      table.boolean('run_on_open').default(false);
      table.integer('position').default(0);
      table.timestamp('created_at');
      table.timestamp('updated_at');
      table.index(['workspace_id', 'position']);
    });
  }

  async down() { await this.schema.dropTableIfExists('agent_console_commands'); }
}
