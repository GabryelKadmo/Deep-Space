import { describe, expect, it } from 'vitest';
import { cn } from '$lib/utils.js';

describe('cn', () => {
  it('mantem a cor de texto da variante quando um tamanho text-ui-* e adicionado', () => {
    expect(cn('bg-primary text-primary-foreground', 'h-7 text-ui-xs')).toBe('bg-primary text-primary-foreground h-7 text-ui-xs');
  });

  it('continua resolvendo conflitos de tamanho e de cor separadamente', () => {
    expect(cn('text-sm', 'text-ui-sm')).toBe('text-ui-sm');
    expect(cn('text-primary-foreground text-ui-xs', 'text-red-500')).toBe('text-ui-xs text-red-500');
  });
});
