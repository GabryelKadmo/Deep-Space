import {
  Bot, Boxes, Briefcase, Building2, Cloud, CodeXml, Coffee, Cpu, Database, Flame, Flower2, Folder,
  Gamepad2, Gem, Globe, Heart, Home, LayoutTemplate, Leaf, Music, Palette, Plane, Rocket, Shield,
  ShoppingBag, Star, UserRound, Wrench, Zap,
} from '@lucide/svelte';
import KrakenIcon from './KrakenIcon.svelte';

/**
 * Icones de workspace (lucide). O campo Workspace.icon guarda o NOME do icone
 * (ex.: 'rocket'). Valores legados (emoji) continuam renderizando como texto —
 * ver WorkspaceIcon.svelte.
 */
export const WORKSPACE_ICONS = [
  { name: 'folder', component: Folder },
  { name: 'rocket', component: Rocket },
  { name: 'zap', component: Zap },
  { name: 'bot', component: Bot },
  { name: 'code', component: CodeXml },
  { name: 'briefcase', component: Briefcase },
  { name: 'globe', component: Globe },
  { name: 'database', component: Database },
  { name: 'cloud', component: Cloud },
  { name: 'cpu', component: Cpu },
  { name: 'shield', component: Shield },
  { name: 'gem', component: Gem },
  { name: 'flame', component: Flame },
  { name: 'star', component: Star },
  { name: 'heart', component: Heart },
  { name: 'home', component: Home },
  { name: 'leaf', component: Leaf },
  { name: 'palette', component: Palette },
  { name: 'music', component: Music },
  { name: 'gamepad', component: Gamepad2 },
  { name: 'coffee', component: Coffee },
  { name: 'plane', component: Plane },
  { name: 'shopping', component: ShoppingBag },
  { name: 'wrench', component: Wrench },
  { name: 'boxes', component: Boxes },
  { name: 'landing', component: LayoutTemplate },
  { name: 'flower', component: Flower2 },
  { name: 'building', component: Building2 },
  { name: 'user', component: UserRound },
  { name: 'kraken', component: KrakenIcon },
] as const;

export type WorkspaceIconName = (typeof WORKSPACE_ICONS)[number]['name'];

const BY_NAME = new Map(WORKSPACE_ICONS.map((icon) => [icon.name, icon.component]));

/** Componente do icone pelo nome (null = Folder padrao; nao-lucide = null). */
export function workspaceIconComponent(name: string | null | undefined) {
  if (!name) return Folder;
  return BY_NAME.get(name as WorkspaceIconName) ?? null;
}

/** true quando o valor e um emoji legado (nao um nome lucide conhecido). */
export function isLegacyEmojiIcon(value: string | null | undefined): boolean {
  return Boolean(value) && !BY_NAME.has(value as WorkspaceIconName);
}

/**
 * Todos os icones do pacote @lucide/svelte (a lista curada acima usa so uns
 * 30), carregados sob demanda por nome (kebab-case, o mesmo mostrado em
 * lucide.dev) — usado pelos icones "extras" que o usuario adiciona em
 * Configuracoes. import.meta.glob resolve os arquivos no build (funciona em
 * dev e produção); um import() dinamico com string simples nao resolveria
 * fora do dev server.
 */
const dynamicLucideModules = import.meta.glob('/node_modules/@lucide/svelte/dist/icons/*.svelte');

function toKebabCase(input: string): string {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

const dynamicIconResolutionCache = new Map<string, Promise<unknown>>();

/** Resolve um nome de icone lucide arbitrario; null se o nome nao existir. */
export function resolveDynamicLucideIcon(name: string): Promise<unknown> {
  const kebab = toKebabCase(name);
  const cached = dynamicIconResolutionCache.get(kebab);
  if (cached) return cached;
  const loader = dynamicLucideModules[`/node_modules/@lucide/svelte/dist/icons/${kebab}.svelte`];
  const promise = loader
    ? loader().then((module) => (module as { default: unknown }).default)
    : Promise.resolve(null);
  dynamicIconResolutionCache.set(kebab, promise);
  return promise;
}

/** Normaliza um nome de icone custom pro mesmo formato usado na resolucao/cache. */
export function normalizeCustomIconName(name: string): string {
  return toKebabCase(name);
}
