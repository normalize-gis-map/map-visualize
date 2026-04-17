import type maplibregl from "maplibre-gl";

export function resolveWaterBeforeLayerId(style: maplibregl.StyleSpecification | undefined): string | undefined {
  return style?.layers?.find((layer) => /(bridge|road|street|highway|label|symbol)/i.test(layer.id))
    ?.id;
}

export function ensureWaterLayerOrder(map: maplibregl.Map, layerId: string): void {
  const beforeId = resolveWaterBeforeLayerId(map.getStyle());
  if (!beforeId || !map.getLayer(layerId)) return;

  try {
    map.moveLayer(layerId, beforeId);
  } catch {}
}
