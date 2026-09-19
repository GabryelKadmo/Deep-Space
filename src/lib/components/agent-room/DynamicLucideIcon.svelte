<script lang="ts">
  /**
   * Mesma renderizacao do Icon.svelte base do @lucide/svelte, mas recebendo
   * o array iconNode direto (dados de src/lib/components/agent-room/lucide-icon-data.json)
   * em vez de importar o componente .svelte gerado pra cada icone — usado
   * pelos icones extras que o usuario adiciona por nome em Configuracoes,
   * pra nao precisar compilar os ~1800 componentes do pacote no bundle.
   */
  type IconNode = Array<[string, Record<string, string>]>;

  type Props = { iconNode: IconNode; size?: number };

  let { iconNode, size = 24 }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#each iconNode as [tag, attrs]}
    <svelte:element this={tag} {...attrs} />
  {/each}
</svg>
