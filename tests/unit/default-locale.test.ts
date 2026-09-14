import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('default locale', () => {
  it('falls back to English when the splash gets no locale', () => {
    const project = JSON.parse(readFileSync('project.inlang/settings.json', 'utf8')) as { baseLocale: string };
    const splash = readFileSync('electron/splash.html', 'utf8');

    expect(project.baseLocale).toBe('en');
    expect(splash).toContain('<html lang="en">');
    expect(splash).toContain('aria-label="Loading..."');
    // O texto servido sem parametro é o do markup, então ele precisa ser o
    // idioma base: é o que aparece quando o locale do sistema é desconhecido.
    expect(splash).toMatch(/data-tagline[^>]*>Many agents\. One space\.</);
  });

  it('carries the translated taglines as data attributes, not as the default', () => {
    const splash = readFileSync('electron/splash.html', 'utf8');

    expect(splash).toContain('data-pt-BR="Múltiplos agentes. Um só espaço."');
    expect(splash).toContain('data-es="Múltiples agentes. Un solo espacio."');
  });
});
