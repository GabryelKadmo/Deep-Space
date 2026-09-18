import { Migration } from '@beeblock/svelar/database';

export default class AddIconToAgentWorkspaceGroupsTable extends Migration {
  async up() {
    await this.schema.table('agent_workspace_groups', (table) => {
      table.string('icon').nullable();
    });
  }

  async down() {
    await this.schema.table('agent_workspace_groups', (table) => {
      table.dropColumn('icon');
    });
  }
}
