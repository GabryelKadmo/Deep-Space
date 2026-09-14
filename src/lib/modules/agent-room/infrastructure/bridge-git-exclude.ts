const GENERATED_BRIDGE_ENTRIES = [
  '.deepspace/',
  '.claude/skills/deepspace/',
  '.cline/skills/deepspace/',
  '.devin/skills/deepspace/',
  '.agents/skills/deepspace/',
] as const;

const LEGACY_USER_OWNED_ENTRIES = [
  '.mcp.json',
  '.cursor/mcp.json',
  '.cline/mcp.json',
  '.devin/mcp_config.json',
  '.agents/mcp_config.json',
  'opencode.json',
  'AGENTS.md',
] as const;

/**
 * Removes only the exact contiguous block written by old Deep Space releases.
 * Independently maintained user excludes with the same names stay untouched.
 */
export function updateDeepSpaceGitExclude(current: string): string {
  const eol = current.includes('\r\n') ? '\r\n' : '\n';
  const oldBlock = [...GENERATED_BRIDGE_ENTRIES, ...LEGACY_USER_OWNED_ENTRIES].join(eol);
  let next = current.replace(oldBlock, GENERATED_BRIDGE_ENTRIES.join(eol));
  const lines = next.split(/\r?\n/);
  const additions = GENERATED_BRIDGE_ENTRIES.filter((entry) => !lines.includes(entry));
  if (additions.length) next = `${next.replace(/(?:\r?\n)?$/, eol)}${additions.join(eol)}${eol}`;
  return next;
}
