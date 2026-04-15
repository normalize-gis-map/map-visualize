import type { Feature, Geometry, Position } from "geojson";
import type maplibregl from "maplibre-gl";

export type WaterMaskSnapshot = {
  waterFeatures: Array<Feature<Geometry>>;
  bridgeFeatures: Array<Feature<Geometry>>;
};

function isWaterLayer(layerId: string, layerType: string) {
  return layerType === "fill" && /(water|ocean|river|lake|canal|channel)/i.test(layerId);
}

function isBridgeLayer(layerId: string, layerType: string) {
  return layerType === "line" && /(bridge|viaduct|flyover)/i.test(layerId);
}

export function getMaskLayerIds(style: maplibregl.StyleSpecification | undefined) {
  if (!style?.layers?.length) return { waterLayerIds: [], bridgeLayerIds: [] as string[] };

  const waterLayerIds = style.layers
    .filter((layer) => isWaterLayer(layer.id, layer.type))
    .map((layer) => layer.id)
    .slice(0, 6);

  const bridgeLayerIds = style.layers
    .filter((layer) => isBridgeLayer(layer.id, layer.type))
    .map((layer) => layer.id)
    .slice(0, 6);

  return { waterLayerIds, bridgeLayerIds };
}

export function buildWaterMaskSnapshot(
  map: maplibregl.Map,
  waterLayerIds: string[],
  bridgeLayerIds: string[],
): WaterMaskSnapshot {
  const canvas = map.getCanvas();
  const pad = 96;
  const queryBox: [[number, number], [number, number]] = [
    [-pad, -pad],
    [canvas.width + pad, canvas.height + pad],
  ];

  const waterFeatures = waterLayerIds.length
    ? (map.queryRenderedFeatures(queryBox, {
        layers: waterLayerIds,
      }) as Array<Feature<Geometry>>)
    : [];

  const bridgeFeatures = bridgeLayerIds.length
    ? (map.queryRenderedFeatures(queryBox, {
        layers: bridgeLayerIds,
      }) as Array<Feature<Geometry>>)
    : [];

  return {
    waterFeatures,
    bridgeFeatures,
  };
}

function eachPolygonRing(geometry: Geometry, callback: (ring: Position[]) => void) {
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring) => callback(ring));
    return;
  }
  if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => callback(ring)));
  }
}

export function clipToWaterMask(
  context: CanvasRenderingContext2D,
  map: maplibregl.Map,
  waterFeatures: Array<Feature<Geometry>>,
) {
  context.beginPath();

  for (const feature of waterFeatures.slice(0, 80)) {
    const geometry = feature.geometry;
    if (!geometry) continue;

    eachPolygonRing(geometry, (ring) => {
      if (ring.length < 3) return;
      const step = ring.length > 260 ? 2 : 1;
      let started = false;

      for (let i = 0; i < ring.length; i += step) {
        const point = ring[i];
        if (!point) continue;
        const projected = map.project([point[0], point[1]]);
        if (!started) {
          context.moveTo(projected.x, projected.y);
          started = true;
        } else {
          context.lineTo(projected.x, projected.y);
        }
      }

      if (started) context.closePath();
    });
  }

  context.clip("evenodd");
}

function traceBridgeLine(
  context: CanvasRenderingContext2D,
  map: maplibregl.Map,
  line: Position[],
) {
  if (line.length < 2) return;

  context.beginPath();
  line.forEach((point, index) => {
    const projected = map.project([point[0], point[1]]);
    if (index === 0) {
      context.moveTo(projected.x, projected.y);
    } else {
      context.lineTo(projected.x, projected.y);
    }
  });
  context.stroke();
}

export function carveBridgeCorridors(
  context: CanvasRenderingContext2D,
  map: maplibregl.Map,
  bridgeFeatures: Array<Feature<Geometry>>,
  zoom: number,
) {
  if (!bridgeFeatures.length) return;

  context.save();
  context.globalCompositeOperation = "destination-out";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(0, 0, 0, 1)";
  context.lineWidth = zoom >= 16 ? 14 : zoom >= 14 ? 11 : 8;

  for (const feature of bridgeFeatures.slice(0, 120)) {
    const geometry = feature.geometry;
    if (!geometry) continue;

    if (geometry.type === "LineString") {
      traceBridgeLine(context, map, geometry.coordinates);
      continue;
    }
    if (geometry.type === "MultiLineString") {
      geometry.coordinates.forEach((line) => traceBridgeLine(context, map, line));
    }
  }

  context.restore();
}
