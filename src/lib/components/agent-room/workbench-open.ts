import type { WorkbenchSplitDirection } from './workbench-layout.js';

export const WORKBENCH_OPEN_REQUEST = 'deepspace:workbench-open';

export type WorkbenchOpenRequestDetail = {
  workspaceId: string;
  nodeId: string;
  direction: WorkbenchSplitDirection | null;
};
