import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Os tamanhos text-ui-* do tema (app.css) sao fonte, nao cor. Sem registrar,
// o twMerge os tratava como cor e apagava a cor de texto da variante: botao
// com text-ui-xs ficava com texto claro sobre fundo claro.
const twMerge = extendTailwindMerge({ extend: { theme: { text: ["ui-xs", "ui-sm", "ui-md", "ui-lg"] } } });

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
