export const PINNED_TOOLBAR_ITEMS_SETTING = 'pinnedToolbarItems';
export const MIN_PINNED_TOOLBAR_ITEMS = 4;
export const DEFAULT_PINNED_TOOLBAR_ITEMS = ['terminal', 'console', 'note', 'tasks', 'files', 'git', 'image', 'device', 'usage'];

export function parsePinnedToolbarItems(value: unknown, validIds: readonly string[]): string[] {
  let candidate: unknown = value;

  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value);
    } catch {
      return [...DEFAULT_PINNED_TOOLBAR_ITEMS];
    }
  }

  if (!Array.isArray(candidate)) return [...DEFAULT_PINNED_TOOLBAR_ITEMS];

  const validSet = new Set(validIds);
  const normalized = candidate
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter((id) => validSet.has(id));

  const unique = [...new Set(normalized)];
  return unique.length >= MIN_PINNED_TOOLBAR_ITEMS ? unique : [...DEFAULT_PINNED_TOOLBAR_ITEMS];
}

export function setToolbarItemPinned(
  current: string[],
  itemId: string,
  pinned: boolean
): { ids: string[]; minReached: boolean } {
  if (!pinned) {
    const withoutItem = current.filter((id) => id !== itemId);
    if (withoutItem.length < MIN_PINNED_TOOLBAR_ITEMS) return { ids: current, minReached: true };
    return { ids: withoutItem, minReached: false };
  }

  if (current.includes(itemId)) return { ids: current, minReached: false };
  return { ids: [...current, itemId], minReached: false };
}
