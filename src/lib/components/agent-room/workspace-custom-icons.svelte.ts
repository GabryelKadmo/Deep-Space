import { getAppSettings, updateAppSettings } from './app-settings.svelte.js';
import { getLucideIconNode, normalizeCustomIconName, type LucideIconNode } from './workspace-icons.js';

/**
 * Icones lucide extras que o usuario adiciona em Configuracoes por nome
 * (ex.: "banana", achado em lucide.dev). Persistidos como um array JSON na
 * chave de settings customWorkspaceIcons; a busca do iconNode e sincrona
 * (dados de lucide-icon-data.json ja no bundle), so a lista de nomes
 * precisa ser carregada dos settings.
 */

const SETTINGS_KEY = 'customWorkspaceIcons';

let names = $state<string[]>([]);
let loaded = false;
let loadingPromise: Promise<void> | null = null;

function parseNames(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export async function ensureCustomIconsLoaded(): Promise<void> {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const settings = await getAppSettings();
    names = parseNames(settings[SETTINGS_KEY]);
    loaded = true;
  })();
  return loadingPromise;
}

export function customIconNames(): string[] {
  return names;
}

/** iconNode do icone extra pelo nome, ou null se ainda nao adicionado/invalido. */
export function getCustomIconNode(name: string): LucideIconNode | null {
  if (!names.includes(normalizeCustomIconName(name))) return null;
  return getLucideIconNode(name);
}

export type AddCustomIconResult = 'added' | 'duplicate' | 'invalid';

export async function addCustomIcon(rawName: string): Promise<AddCustomIconResult> {
  const name = normalizeCustomIconName(rawName);
  if (!name) return 'invalid';
  await ensureCustomIconsLoaded();
  if (names.includes(name)) return 'duplicate';
  if (!getLucideIconNode(name)) return 'invalid';
  const nextNames = [...names, name];
  await updateAppSettings({ [SETTINGS_KEY]: JSON.stringify(nextNames) });
  names = nextNames;
  return 'added';
}

export async function removeCustomIcon(name: string): Promise<void> {
  const nextNames = names.filter((existing) => existing !== name);
  await updateAppSettings({ [SETTINGS_KEY]: JSON.stringify(nextNames) });
  names = nextNames;
}
