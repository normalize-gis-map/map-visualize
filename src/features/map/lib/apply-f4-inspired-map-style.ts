import type maplibregl from "maplibre-gl";

import {
  BUILDING_EDGE_COLOR,
  ROAD_CASING_COLOR,
  ROAD_MAIN_COLOR,
  ROAD_MINOR_COLOR,
} from "@/lib/constants/map.constants";

const LANE_MARKING_WIDTH = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  0.2,
  12,
  0.32,
  14,
  0.56,
  16,
  0.95,
  18,
  1.5,
  20,
  2.2,
];

const ROAD_NAME_RE =
  /(road|street|highway|transport|motorway|primary|trunk|arterial|secondary|tertiary|residential|service|living|unclassified|local)/i;
const MAJOR_ROAD_RE = /(motorway|trunk|primary|highway|arterial|major)/i;
const MEDIUM_ROAD_RE = /(secondary|tertiary|collector)/i;
const LOCAL_ROAD_RE = /(residential|service|living|unclassified|local)/i;
const CASING_RE = /(casing|outline|border)/i;
const RAIL_TRANSIT_HATCH_RE = /(rail|transit|hatching|hatch)/i;

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

function getRoadWidthExpression(
  kind: "major" | "medium" | "local" | "casing",
): unknown {
  switch (kind) {
    case "major":
      return [
        "interpolate",
        ["linear"],
        ["zoom"],
        12,
        2.2,
        14,
        4.5,
        16,
        9,
        18,
        16,
        20,
        26,
      ];
    case "medium":
      return [
        "interpolate",
        ["linear"],
        ["zoom"],
        12,
        1.8,
        14,
        3.8,
        16,
        7.5,
        18,
        13,
        20,
        20,
      ];
    case "local":
      return [
        "interpolate",
        ["linear"],
        ["zoom"],
        12,
        1.5,
        14,
        3.2,
        16,
        6.5,
        18,
        11,
        20,
        17,
      ];
    case "casing":
      return [
        "interpolate",
        ["linear"],
        ["zoom"],
        12,
        2.5,
        14,
        4.8,
        16,
        8.8,
        18,
        14.5,
        20,
        21,
      ];
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

    if (layer.type === "fill-extrusion" && /building/i.test(id)) {
      setPaintSafe(map, layerId, "fill-extrusion-opacity", 0.88);
      setPaintSafe(map, layerId, "fill-extrusion-vertical-gradient", true);
      continue;
    }

    if (layer.type === "line" && ROAD_NAME_RE.test(id)) {
      const isCasing = CASING_RE.test(id);
      const isRailTransitHatch = RAIL_TRANSIT_HATCH_RE.test(id);
      const isMajor = MAJOR_ROAD_RE.test(id);
      const isMedium = MEDIUM_ROAD_RE.test(id);
      const isLocal = LOCAL_ROAD_RE.test(id);
      const widthKind: "major" | "medium" | "local" | "casing" = isCasing
        ? "casing"
        : isMajor
          ? "major"
          : isMedium
            ? "medium"
            : isLocal
              ? "local"
              : "local";

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
        isRailTransitHatch
          ? 0.72
          : isCasing
            ? 0.92
            : isMajor
              ? 0.97
              : isMedium
                ? 0.94
                : 0.9,
      );
      setPaintSafe(
        map,
        layerId,
        "line-width",
        isRailTransitHatch
          ? [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              0.7,
              14,
              1.1,
              16,
              1.7,
              18,
              2.4,
              20,
              3,
            ]
          : getRoadWidthExpression(widthKind),
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
      laneLayerCount += 1;
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
