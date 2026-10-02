<script lang="ts">
  import { useStore, useSvelteFlow, useViewport } from '@xyflow/svelte';

  type ZoomApi = {
    setCenter: (x: number, y: number, options?: { zoom?: number; duration?: number }) => void;
    fitView: (options?: { duration?: number }) => void;
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
    getViewport: () => { x: number; y: number; zoom: number };
    setZoom: (zoom: number, options?: { duration?: number }) => void;
  };

  let { onReady, onZoomChange, minZoom, maxZoom }: {
    onReady: (api: ZoomApi) => void;
    onZoomChange?: (percent: number) => void;
    minZoom: number;
    maxZoom: number;
  } = $props();

  const { setCenter, fitView, screenToFlowPosition, getViewport, setZoom } = useSvelteFlow();
  const viewport = useViewport();
  const store = useStore();

  // O SvelteFlow so le minZoom/maxZoom ao montar: mudar as props depois nao
  // chega ao d3-zoom. Com o zoom travado ao abrir o app, destravar deixava o
  // canvas preso em 100% (menu, rodas e atalhos sem efeito) ate recarregar.
  $effect(() => {
    store.setMinZoom(minZoom);
    store.setMaxZoom(maxZoom);
  });

  $effect(() => {
    onReady({
      setCenter: (x, y, options) => setCenter(x, y, options),
      fitView: (options) => fitView(options),
      screenToFlowPosition: (position) => screenToFlowPosition(position),
      getViewport: () => getViewport(),
      setZoom: (zoom, options) => setZoom(zoom, options),
    });
  });

  $effect(() => {
    onZoomChange?.(Math.round(viewport.current.zoom * 100));
  });
</script>
