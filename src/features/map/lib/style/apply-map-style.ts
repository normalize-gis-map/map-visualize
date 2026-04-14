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
const NON_ROAD_OR_DECOR_RE =
  /(path|pedestrian|footway|cycle|track|trail|steps|runway|taxiway|platform|ferry|hatching|hatch)/i;

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

function withOptionalFilter(
  layerDef: Record<string, unknown>,
  sourceFilter: unknown,
) {
  if (Array.isArray(sourceFilter)) {
    layerDef.filter = sourceFilter;
  }
  return layerDef;
}

function getCloseZoomRoadWidthPatch(
  baseWidth: unknown,
  kind: "major" | "medium" | "local",
): unknown {
  const zoomMultiplier =
    kind === "major"
      ? ["interpolate", ["linear"], ["zoom"], 13, 1, 15, 1.04, 17, 1.13, 19, 1.26]
      : kind === "medium"
        ? ["interpolate", ["linear"], ["zoom"], 13, 1, 15, 1.02, 17, 1.09, 19, 1.2]
        : ["interpolate", ["linear"], ["zoom"], 13, 1, 15, 1, 17, 1.05, 19, 1.12];
  return ["*", baseWidth, zoomMultiplier];
}

export function applyMapStyle(
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
  const firstParkFillLayer = style.layers.find(
    (layer) => layer.type === "fill" && /(park|green|grass)/i.test(layer.id),
  ) as any;

  for (const layer of style.layers) {
    const layerId = layer.id;
    const id = layerId.toLowerCase();

    if (layer.type === "fill-extrusion" && /building/i.test(id)) {
      setPaintSafe(map, layerId, "fill-extrusion-color", [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "render_height"], ["get", "height"], 0],
        0,
        "#d7dde6",
        25,
        "#c7d0dc",
        80,
        "#b8c2cf",
      ]);
      setPaintSafe(map, layerId, "fill-extrusion-opacity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        13,
        0.82,
        16,
        0.88,
        19,
        0.92,
      ]);
      setPaintSafe(map, layerId, "fill-extrusion-vertical-gradient", true);
      continue;
    }

    if (layer.type === "fill" && /(water|ocean|river|lake)/i.test(id)) {
      setPaintSafe(map, layerId, "fill-color", [
        "interpolate",
        ["linear"],
        ["zoom"],
        8,
        "#7cbce3",
        13,
        "#70b2dd",
        17,
        "#66abd8",
      ]);
      setPaintSafe(map, layerId, "fill-opacity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        8,
        0.88,
        13,
        0.92,
        17,
        0.95,
      ]);
      continue;
    }

    if (layer.type === "fill" && /(park|green|grass)/i.test(id)) {
      setPaintSafe(map, layerId, "fill-opacity", 0.92);
      continue;
    }

    if (layer.type === "line" && ROAD_NAME_RE.test(id)) {
      const isCasing = CASING_RE.test(id);
      const isRailTransitHatch = RAIL_TRANSIT_HATCH_RE.test(id);
      const isDecorativeTransport = NON_ROAD_OR_DECOR_RE.test(id);
      const isMajor = MAJOR_ROAD_RE.test(id);
      const isMedium = MEDIUM_ROAD_RE.test(id);
      const isLocal = LOCAL_ROAD_RE.test(id);
      const shouldPatchRoadFamily =
        !isRailTransitHatch &&
        !isDecorativeTransport &&
        (isMajor || isMedium || isLocal || isCasing);
      if (!shouldPatchRoadFamily) continue;

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

      const layerPaint =
        (layer as maplibregl.LayerSpecification & {
          paint?: Record<string, unknown>;
        }).paint ?? {};
      const baseWidth = layerPaint["line-width"];
      if (!baseWidth || isCasing) continue;
      if (isMajor || isMedium || isLocal) {
        const widthKind: "major" | "medium" | "local" = isMajor
          ? "major"
          : isMedium
            ? "medium"
            : "local";
        setPaintSafe(
          map,
          layerId,
          "line-width",
          getCloseZoomRoadWidthPatch(baseWidth, widthKind),
        );
      }
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

  if (firstParkFillLayer && !map.getLayer("map-park-grass")) {
    try {
      const layerDef = withOptionalFilter(
        {
          id: "map-park-grass",
          type: "fill",
          source: firstParkFillLayer.source,
          "source-layer":
            "source-layer" in firstParkFillLayer
              ? firstParkFillLayer["source-layer"]
              : undefined,
          paint: {
            "fill-color": "#78a95f",
            "fill-opacity": 0.11,
          },
        } as any,
        firstParkFillLayer.filter,
      );
      map.addLayer(
        layerDef as any,
        firstParkFillLayer.id,
      );
    } catch {}
  }

  if (firstParkFillLayer && !map.getLayer("map-park-grass-depth")) {
    try {
      const layerDef = withOptionalFilter(
        {
          id: "map-park-grass-depth",
          type: "line",
          source: firstParkFillLayer.source,
          "source-layer":
            "source-layer" in firstParkFillLayer
              ? firstParkFillLayer["source-layer"]
              : undefined,
          paint: {
            "line-color": "#5f8e4b",
            "line-opacity": 0.14,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              0.2,
              16,
              0.5,
              20,
              0.9,
            ],
          },
        } as any,
        firstParkFillLayer.filter,
      );
      map.addLayer(
        layerDef as any,
        firstParkFillLayer.id,
      );
    } catch {}
  }

  const laneDetailEnabled = options?.laneDetailEnabled ?? true;
  const laneLayerCap = options?.detailPreset === "high" ? 4 : 2;

  let laneLayerCount = 0;
  for (const roadLayer of roadLayers) {
    if (!laneDetailEnabled) continue;
    if (!MAJOR_ROAD_RE.test(roadLayer.id) || CASING_RE.test(roadLayer.id))
      continue;
    if (laneLayerCount >= laneLayerCap) continue;

    const laneLayerId = `${roadLayer.id}__map_lane_marking`;
    if (map.getLayer(laneLayerId)) continue;

    try {
      const layerDef = withOptionalFilter(
        {
          id: laneLayerId,
          type: "line",
          source: roadLayer.source,
          "source-layer":
            "source-layer" in roadLayer ? roadLayer["source-layer"] : undefined,
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
        roadLayer.filter,
      );
      map.addLayer(
        layerDef as any,
        roadLayer.id,
      );
      laneLayerCount += 1;
    } catch {}
  }

  const firstBuildingLayer = style.layers.find(
    (layer) => layer.type === "fill-extrusion" && /building/i.test(layer.id),
  ) as any;
  if (firstBuildingLayer && !map.getLayer("map-building-shadow")) {
    try {
      map.addLayer(
        {
          id: "map-building-shadow",
          type: "fill",
          source: firstBuildingLayer.source,
          "source-layer":
            "source-layer" in firstBuildingLayer
              ? firstBuildingLayer["source-layer"]
              : undefined,
          paint: {
            "fill-color": "#111827",
            "fill-opacity": [
              "interpolate",
              ["linear"],
              ["coalesce", ["get", "render_height"], ["get", "height"], 0],
              0,
              0.04,
              20,
              0.08,
              60,
              0.14,
            ],
            "fill-translate": [2, 2],
            "fill-translate-anchor": "map",
          },
        } as any,
        firstBuildingLayer.id,
      );
    } catch {}
  }

  if (firstBuildingLayer && !map.getLayer("map-building-edge")) {
    try {
      map.addLayer(
        {
          id: "map-building-edge",
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
