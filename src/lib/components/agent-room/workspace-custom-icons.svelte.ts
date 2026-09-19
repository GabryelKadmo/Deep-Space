import { getAppSettings, updateAppSettings } from './app-settings.svelte.js';
import { normalizeCustomIconName, resolveDynamicLucideIcon } from './workspace-icons.js';

/**
 * Icones lucide extras que o usuario adiciona em Configuracoes por nome
 * (ex.: "banana", achado em lucide.dev). Persistidos como um array JSON na
 * chave de settings customWorkspaceIcons; resolvidos sob demanda e mantidos
 * num cache reativo pra WorkspaceIcon.svelte e os seletores de icone
 * mostrarem assim que carregam, sem recarregar a pagina.
 */

const SETTINGS_KEY = 'customWorkspaceIcons';

let names = $state<string[]>([]);
let components = $state<Record<string, unknown>>({});
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

async function resolveAll(iconNames: string[]) {
  const entries = await Promise.all(iconNames.map(async (name) => [name, await resolveDynamicLucideIcon(name)] as const));
  const next: Record<string, unknown> = {};
  for (const [name, component] of entries) if (component) next[name] = component;
  components = next;
}

export async function ensureCustomIconsLoaded(): Promise<void> {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const settings = await getAppSettings();
    names = parseNames(settings[SETTINGS_KEY]);
    await resolveAll(names);
    loaded = true;
  })();
  return loadingPromise;
}

export function customIconNames(): string[] {
  return names;
}

/** Componente do icone extra pelo nome, ou null se ainda nao carregado/invalido. */
export function getCustomIconComponent(name: string): unknown {
  return components[normalizeCustomIconName(name)] ?? null;
}

export type AddCustomIconResult = 'added' | 'duplicate' | 'invalid';

export async function addCustomIcon(rawName: string): Promise<AddCustomIconResult> {
  const name = normalizeCustomIconName(rawName);
  if (!name) return 'invalid';
  await ensureCustomIconsLoaded();
  if (names.includes(name)) return 'duplicate';
  const component = await resolveDynamicLucideIcon(name);
  if (!component) return 'invalid';
  const nextNames = [...names, name];
  await updateAppSettings({ [SETTINGS_KEY]: JSON.stringify(nextNames) });
  names = nextNames;
  components = { ...components, [name]: component };
  return 'added';
}

export async function removeCustomIcon(name: string): Promise<void> {
  const nextNames = names.filter((existing) => existing !== name);
  await updateAppSettings({ [SETTINGS_KEY]: JSON.stringify(nextNames) });
  names = nextNames;
  const { [name]: _removed, ...rest } = components;
  components = rest;
}
