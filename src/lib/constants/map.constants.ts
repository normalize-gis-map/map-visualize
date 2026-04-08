export const DEFAULT_CENTER = {
  lat: 10.8231,
  lng: 106.6297,
};

export const DEFAULT_ZOOM = 11;

export const MAP_STYLE_2D =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const MAP_STYLE_25D = "https://tiles.openfreemap.org/styles/liberty";
export const MAP_GLYPHS_FALLBACK =
  "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

export const CESIUM_ASSET_BASE_URL =
  "https://cesium.com/downloads/cesiumjs/releases/1.140/Build/Cesium/";

export const FLOOD_COLORS = {
  low: "#60a5fa",
  medium: "#f59e0b",
  high: "#ef4444",
} as const;
