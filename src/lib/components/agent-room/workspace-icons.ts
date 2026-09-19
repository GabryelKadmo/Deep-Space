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
 * Dados brutos (iconNode) de todo icone do pacote @lucide/svelte instalado
 * (a lista curada acima usa so uns 30), gerados por
 * scripts/generate-lucide-icon-data.mjs — usados pelos icones "extras" que
 * o usuario adiciona em Configuracoes. Importar isso como um JSON so evita
 * o bundler ter que compilar/gerar um chunk pra cada um dos ~1800
 * componentes .svelte do pacote so pra permitir a busca por nome; import()
 * dinamico por nome tambem so resolveria no dev server, nao no build de
 * producao.
 */
import lucideIconData from './lucide-icon-data.json';

export type LucideIconNode = Array<[string, Record<string, string>]>;

function toKebabCase(input: string): string {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/** iconNode de um icone lucide arbitrario pelo nome; null se o nome nao existir. */
export function getLucideIconNode(name: string): LucideIconNode | null {
  const kebab = toKebabCase(name);
  return (lucideIconData as Record<string, LucideIconNode>)[kebab] ?? null;
}

/** Normaliza um nome de icone custom pro mesmo formato usado na busca acima. */
export function normalizeCustomIconName(name: string): string {
  return toKebabCase(name);
}
