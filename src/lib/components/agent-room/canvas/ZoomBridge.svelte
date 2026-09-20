<script lang="ts">
  import { useSvelteFlow, useViewport } from '@xyflow/svelte';

  type ZoomApi = {
    setCenter: (x: number, y: number, options?: { zoom?: number; duration?: number }) => void;
    fitView: (options?: { duration?: number }) => void;
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
    getViewport: () => { x: number; y: number; zoom: number };
    setZoom: (zoom: number, options?: { duration?: number }) => void;
  };

  let { onReady, onZoomChange }: { onReady: (api: ZoomApi) => void; onZoomChange?: (percent: number) => void } = $props();

  const { setCenter, fitView, screenToFlowPosition, getViewport, setZoom } = useSvelteFlow();
  const viewport = useViewport();

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
