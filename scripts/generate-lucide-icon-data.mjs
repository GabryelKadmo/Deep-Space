#!/usr/bin/env node
/**
 * Gera um unico JSON com os dados brutos (iconNode) de todo icone do
 * @lucide/svelte instalado, pra permitir a busca de icones extras por nome
 * sem importar (e sem o bundler compilar) os ~1500 componentes .svelte do
 * pacote. Cada arquivo de icone e so um wrapper fino em volta de um array
 * "iconNode" (formato ja compativel com JSON); DynamicLucideIcon.svelte
 * renderiza esse array do mesmo jeito que o componente base do lucide faz.
 *
 * Rode de novo (`node scripts/generate-lucide-icon-data.mjs`) sempre que
 * @lucide/svelte for atualizado.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const iconsDir = path.resolve('node_modules/@lucide/svelte/dist/icons');
const outputPath = path.resolve('src/lib/components/agent-room/lucide-icon-data.json');

const iconNodePattern = /const iconNode = (\[[\s\S]*?\]);/;

const data = {};
for (const file of readdirSync(iconsDir)) {
  if (!file.endsWith('.svelte')) continue;
  const name = file.slice(0, -'.svelte'.length);
  const content = readFileSync(path.join(iconsDir, file), 'utf8');
  const match = content.match(iconNodePattern);
  if (!match) {
    console.warn(`skip ${file}: iconNode not found`);
    continue;
  }
  data[name] = JSON.parse(match[1]);
}

writeFileSync(outputPath, JSON.stringify(data));
console.log(`Wrote ${Object.keys(data).length} lucide icons to ${outputPath}`);
