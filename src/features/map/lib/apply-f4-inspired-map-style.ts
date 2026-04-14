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
  1,
  12,
  1.8,
  14,
  3.8,
  16,
  7.2,
  18,
  12.8,
  20,
  18,
];
const MINOR_ROAD_WIDTH = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  0.75,
  12,
  1.2,
  14,
  2.3,
  16,
  4.2,
  18,
  7.4,
  20,
  10.5,
];
const CASING_WIDTH = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  1.8,
  12,
  2.8,
  14,
  5.2,
  16,
  9.4,
  18,
  15.5,
  20,
  22,
];
const LANE_MARKING_WIDTH = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  0.3,
  12,
  0.45,
  14,
  0.85,
  16,
  1.6,
  18,
  2.8,
  20,
  4,
];

const ROAD_NAME_RE =
  /(road|street|highway|transport|motorway|primary|trunk|arterial)/i;
const MAJOR_ROAD_RE = /(motorway|trunk|primary|highway|arterial|major)/i;
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

export function applyF4InspiredMapStyle(map: maplibregl.Map): void {
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
        isCasing ? 0.9 : isMajor ? 0.96 : 0.9,
      );
      setPaintSafe(
        map,
        layerId,
        "line-width",
        isCasing ? CASING_WIDTH : isMajor ? MAJOR_ROAD_WIDTH : MINOR_ROAD_WIDTH,
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

  for (const roadLayer of roadLayers) {
    if (!MAJOR_ROAD_RE.test(roadLayer.id) || CASING_RE.test(roadLayer.id))
      continue;

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
