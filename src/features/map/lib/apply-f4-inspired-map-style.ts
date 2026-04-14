import type maplibregl from "maplibre-gl";

import {
  BUILDING_BASE_COLOR,
  BUILDING_EDGE_COLOR,
  LAND_BASE_COLOR,
  ROAD_CASING_COLOR,
  ROAD_MAIN_COLOR,
  ROAD_MINOR_COLOR,
  WATER_BASE_COLOR,
} from "@/lib/constants/map.constants";

const MAJOR_ROAD_WIDTH = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  1.15,
  12,
  2.4,
  14,
  4.8,
  16,
  8.8,
  18,
  14.8,
  20,
  22,
];

const MEDIUM_ROAD_WIDTH = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  0.95,
  12,
  1.8,
  14,
  3.6,
  16,
  6.3,
  18,
  10,
  20,
  14,
];

const LOCAL_ROAD_WIDTH = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  0.72,
  12,
  1.25,
  14,
  2.45,
  16,
  4.4,
  18,
  7,
  20,
  9.6,
];

const CASING_WIDTH = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  1.9,
  12,
  3.25,
  14,
  5.9,
  16,
  10.4,
  18,
  17,
  20,
  24,
];

const LANE_MARKING_WIDTH = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  0.32,
  12,
  0.5,
  14,
  0.94,
  16,
  1.85,
  18,
  3.1,
  20,
  4.4,
];

const ROAD_NAME_RE =
  /(road|street|highway|transport|motorway|primary|trunk|arterial|secondary|tertiary|residential|service|local)/i;
const MAJOR_ROAD_RE = /(motorway|trunk|primary|highway|arterial|major)/i;
const MEDIUM_ROAD_RE = /(secondary|collector)/i;
const LOCAL_ROAD_RE = /(tertiary|residential|service|living|local)/i;
const CASING_RE = /(casing|outline|border)/i;

function setPaintSafe(
  map: maplibregl.Map,
  layerId: string,
  prop: string,
  value: unknown,
) {
  try {
    if (!map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, prop, value as never);
  } catch {
    // ignore unsupported paint properties per layer type
  }
}

export function applyF4InspiredMapStyle(
  map: maplibregl.Map,
  options?: { laneDetailEnabled?: boolean; detailPreset?: "balanced" | "high" },
): void {
  const style = map.getStyle();
  if (!style?.layers?.length) return;

  try {
    (map as maplibregl.Map & { setFog?: (config: unknown) => void }).setFog?.({
      color: "#f8fafc",
      "high-color": "#eef2f7",
      "space-color": "#f8fafc",
      "horizon-blend": 0.12,
      range: [0.8, 8],
    });
  } catch {}

  try {
    (
      map as maplibregl.Map & { setLight?: (config: unknown) => void }
    ).setLight?.({
      anchor: "viewport",
      color: "#ffffff",
      intensity: 0.38,
      position: [1.2, 150, 35],
    });
  } catch {}

  const roadLayers = style.layers.filter(
    (layer) => layer.type === "line" && ROAD_NAME_RE.test(layer.id),
  ) as Array<any>;

  for (const layer of style.layers) {
    const layerId = layer.id;
    const id = layerId.toLowerCase();

    if (layer.type === "background" && /(background|land)/i.test(id)) {
      setPaintSafe(map, layerId, "background-color", LAND_BASE_COLOR);
      continue;
    }

    if (layer.type === "fill" && /(water|ocean|river|lake)/i.test(id)) {
      setPaintSafe(map, layerId, "fill-color", WATER_BASE_COLOR);
      setPaintSafe(map, layerId, "fill-opacity", 0.9);
      continue;
    }

    if (layer.type === "fill" && /(land|park|earth)/i.test(id)) {
      setPaintSafe(map, layerId, "fill-color", LAND_BASE_COLOR);
      continue;
    }

    if (layer.type === "fill-extrusion" && /building/i.test(id)) {
      setPaintSafe(map, layerId, "fill-extrusion-color", BUILDING_BASE_COLOR);
      setPaintSafe(map, layerId, "fill-extrusion-opacity", 0.94);
      setPaintSafe(map, layerId, "fill-extrusion-vertical-gradient", true);
      continue;
    }

    if (layer.type === "line" && ROAD_NAME_RE.test(id)) {
      const isCasing = CASING_RE.test(id);
      const isMajor = MAJOR_ROAD_RE.test(id);
      const isMedium = MEDIUM_ROAD_RE.test(id);
      const isLocal = LOCAL_ROAD_RE.test(id);

      setPaintSafe(
        map,
        layerId,
        "line-color",
        isCasing
          ? ROAD_CASING_COLOR
          : isMajor
            ? ROAD_MAIN_COLOR
            : ROAD_MINOR_COLOR,
      );
      setPaintSafe(
        map,
        layerId,
        "line-opacity",
        isCasing ? 0.92 : isMajor ? 0.97 : isMedium ? 0.94 : 0.9,
      );
      setPaintSafe(
        map,
        layerId,
        "line-width",
        isCasing
          ? CASING_WIDTH
          : isMajor
            ? MAJOR_ROAD_WIDTH
            : isMedium
              ? MEDIUM_ROAD_WIDTH
              : isLocal
                ? LOCAL_ROAD_WIDTH
                : LOCAL_ROAD_WIDTH,
      );
      continue;
    }

    if (
      layer.type === "symbol" &&
      /(label|place|poi|roadname|name)/i.test(id)
    ) {
      setPaintSafe(map, layerId, "text-color", "#111827");
      setPaintSafe(map, layerId, "text-halo-color", "#ffffff");
      setPaintSafe(map, layerId, "text-halo-width", 0.9);
      setPaintSafe(map, layerId, "text-opacity", 0.78);
    }
  }

  const laneDetailEnabled = options?.laneDetailEnabled ?? true;
  const laneLayerCap = options?.detailPreset === "high" ? 4 : 2;

  let laneLayerCount = 0;
  for (const roadLayer of roadLayers) {
    if (!laneDetailEnabled) continue;
    if (!MAJOR_ROAD_RE.test(roadLayer.id) || CASING_RE.test(roadLayer.id))
      continue;
    if (laneLayerCount >= laneLayerCap) continue;

    const laneLayerId = `${roadLayer.id}__f4_lane_marking`;
    if (map.getLayer(laneLayerId)) continue;

    try {
      map.addLayer(
        {
          id: laneLayerId,
          type: "line",
          source: roadLayer.source,
          "source-layer":
            "source-layer" in roadLayer ? roadLayer["source-layer"] : undefined,
          filter: roadLayer.filter,
          minzoom: 13.5,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#f8fafc",
            "line-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              0.22,
              14,
              0.38,
              17,
              0.5,
              20,
              0.56,
            ],
            "line-width": LANE_MARKING_WIDTH,
            "line-dasharray": [0.55, 1.55],
          },
        } as any,
        roadLayer.id,
      );
    } catch {}
  }

  const firstBuildingLayer = style.layers.find(
    (layer) => layer.type === "fill-extrusion" && /building/i.test(layer.id),
  ) as any;
  if (firstBuildingLayer && !map.getLayer("f4-building-edge")) {
    try {
      map.addLayer(
        {
          id: "f4-building-edge",
          type: "line",
          source: firstBuildingLayer.source,
          "source-layer":
            "source-layer" in firstBuildingLayer
              ? firstBuildingLayer["source-layer"]
              : undefined,
          paint: {
            "line-color": BUILDING_EDGE_COLOR,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              0.2,
              16,
              0.5,
              18,
              0.9,
            ],
            "line-opacity": 0.7,
          },
        } as any,
        firstBuildingLayer.id,
      );
    } catch {}
  }
}
