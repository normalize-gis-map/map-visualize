import type { FeatureCollection } from "geojson";
import { Layer, Source } from "react-map-gl/maplibre";

type Props = {
  routeCollection: FeatureCollection | null;
  viewMode: "map" | "drive3d";
  safeProgress: number;
  progressFadeStart: number;
  remainingProgressEnd: number;
};

export function RouteVisualLayers({
  routeCollection,
  viewMode,
  safeProgress,
  progressFadeStart,
  remainingProgressEnd,
}: Props) {
  if (!routeCollection) return null;
  const p0 = Number.isFinite(safeProgress) ? Math.max(0, Math.min(safeProgress, 0.998)) : 0;
  const p1 = Math.max(
    p0 + 0.0001,
    Number.isFinite(progressFadeStart)
      ? Math.max(0, Math.min(progressFadeStart, 0.999))
      : p0 + 0.0005,
  );
  const p2 = Math.max(
    p1 + 0.0001,
    Number.isFinite(remainingProgressEnd)
      ? Math.max(0, Math.min(remainingProgressEnd, 0.9995))
      : p1 + 0.018,
  );

  return (
    <Source id="routes" type="geojson" data={routeCollection} lineMetrics>
      <Layer
        id="route-casing"
        type="line"
        paint={{
          "line-color": ["case", ["==", ["get", "isPrimary"], 1], "#0f172a", "#475569"],
          "line-width": ["case", ["==", ["get", "isPrimary"], 1], 12, 8],
          "line-opacity": [
            "case",
            ["==", ["get", "isPrimary"], 1],
            viewMode === "drive3d" ? 0.08 : 0.32,
            viewMode === "drive3d" ? 0 : 0.12,
          ],
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id="route-alternatives"
        type="line"
        paint={{
          "line-color": ["case", ["==", ["get", "isPrimary"], 1], "#1d4ed8", "#93c5fd"],
          "line-width": ["case", ["==", ["get", "isPrimary"], 1], 9, 5],
          "line-opacity": [
            "case",
            ["==", ["get", "isPrimary"], 1],
            viewMode === "drive3d" ? 0 : 0.95,
            viewMode === "drive3d" ? 0 : 0.45,
          ],
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id="route-glow"
        type="line"
        filter={["==", ["get", "isPrimary"], 1]}
        paint={{
          "line-color": "#60a5fa",
          "line-width": 20,
          "line-opacity": 0.12,
          "line-blur": 1.1,
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id="route-progress-highlight"
        type="line"
        filter={["==", ["get", "isPrimary"], 1]}
        paint={{
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,
            "rgba(56,189,248,0)",
            p0,
            "rgba(56,189,248,0)",
            p1,
            "#38bdf8",
            p2,
            "#38bdf8",
            1,
            "rgba(125,211,252,0.75)",
          ],
          "line-width": 10,
          "line-opacity": 1,
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id="route-drive3d-guide"
        type="line"
        filter={["==", ["get", "isPrimary"], 1]}
        paint={{
          "line-color": "#67e8f9",
          "line-width": 3.5,
          "line-opacity": viewMode === "drive3d" ? 0.95 : 0,
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id="route-direction-arrows"
        type="symbol"
        filter={["==", ["get", "isPrimary"], 1]}
        layout={{
          "symbol-placement": "line",
          "symbol-spacing": 55,
          "text-field": "▶",
          "text-size": 12,
          "text-keep-upright": false,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        }}
        paint={{
          "text-color": "#1e40af",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
          "text-opacity": viewMode === "drive3d" ? 0 : 0.95,
        }}
      />
    </Source>
  );
}
