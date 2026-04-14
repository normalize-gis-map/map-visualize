export const DEFAULT_CENTER = {
  lat: 10.8231,
  lng: 106.6297,
};

export const DEFAULT_ZOOM = 11;

export const MAP_STYLE_2D =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const MAP_STYLE_25D = "https://tiles.openfreemap.org/styles/liberty";
export const MAP_GLYPHS_FALLBACK =
  "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf";

export const MAP_25D_DEFAULT_PITCH = 52;
export const MAP_25D_DEFAULT_BEARING = -14;
export const MAP_25D_NEAR_PITCH = 64;
export const MAP_25D_FAR_PITCH = 10;

export const BUILDING_BASE_COLOR = "#f3f4f6";
export const BUILDING_TOP_COLOR = "#e5e7eb";
export const BUILDING_EDGE_COLOR = "#d1d5db";

export const ROAD_MAIN_COLOR = "#6b7280";
export const ROAD_MINOR_COLOR = "#9ca3af";
export const ROAD_CASING_COLOR = "#f8fafc";
export const LAND_BASE_COLOR = "#f5f5f4";
export const WATER_BASE_COLOR = "#cbd5e1";

export const TRAFFIC_MIN_SCALE = 0.8;
export const TRAFFIC_MAX_SCALE = 1.6;

export const CESIUM_ASSET_BASE_URL =
  "https://cesium.com/downloads/cesiumjs/releases/1.140/Build/Cesium/";

export const FLOOD_COLORS = {
  low: "#60a5fa",
  medium: "#f59e0b",
  high: "#ef4444",
} as const;
