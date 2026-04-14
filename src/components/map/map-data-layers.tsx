import type { FeatureCollection } from "geojson";
import { Layer, Source } from "react-map-gl/maplibre";

import drainageData from "@/data/geojson/drainage-sample.json";
import riskZonesData from "@/data/geojson/risk-zones-sample.json";

type Props = {
  visibleLayers: {
    riskZones: boolean;
    drainage: boolean;
    flood: boolean;
  };
  activeFloodData: FeatureCollection;
  mapMode: "2d" | "2.5d" | "3d";
  selectedId: string;
  hoveredId: string;
};

export function MapDataLayers({
  visibleLayers,
  activeFloodData,
  mapMode,
  selectedId,
  hoveredId,
}: Props) {
  return (
    <>
      {visibleLayers.riskZones && (
        <Source id="risk-zones" type="geojson" data={riskZonesData as FeatureCollection}>
          <Layer
            id="risk-zones-fill"
            type="fill"
            paint={{
              "fill-color": [
                "match",
                ["get", "level"],
                "high",
                "#ef4444",
                "medium",
                "#f59e0b",
                "low",
                "#60a5fa",
                "#94a3b8",
              ],
              "fill-opacity": 0.18,
            }}
          />
        </Source>
      )}

      {visibleLayers.drainage && (
        <Source id="drainage" type="geojson" data={drainageData as FeatureCollection}>
          <Layer
            id="drainage-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": "#0ea5e9",
              "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.6, 15, 4.5],
              "line-opacity": 0.8,
              "line-blur": 0.25,
              "line-dasharray": [1, 0],
            }}
          />
        </Source>
      )}

      {visibleLayers.flood && (
        <Source id="flood" type="geojson" data={activeFloodData}>
          {mapMode === "2.5d" ? (
            <Layer
              id="flood-extrusion"
              type="fill-extrusion"
              paint={{
                "fill-extrusion-color": [
                  "match",
                  ["get", "severity"],
                  "low",
                  "#60a5fa",
                  "medium",
                  "#f59e0b",
                  "high",
                  "#ef4444",
                  "#60a5fa",
                ],
                "fill-extrusion-height": ["interpolate", ["linear"], ["get", "depth"], 0, 0, 2, 1200],
                "fill-extrusion-opacity": [
                  "case",
                  ["==", ["get", "id"], selectedId],
                  1,
                  ["==", ["get", "id"], hoveredId],
                  0.95,
                  0.8,
                ],
              }}
            />
          ) : (
            <Layer
              id="flood-fill"
              type="fill"
              paint={{
                "fill-color": [
                  "match",
                  ["get", "severity"],
                  "low",
                  "#60a5fa",
                  "medium",
                  "#f59e0b",
                  "high",
                  "#ef4444",
                  "#60a5fa",
                ],
                "fill-opacity": [
                  "case",
                  ["==", ["get", "id"], selectedId],
                  0.68,
                  ["==", ["get", "id"], hoveredId],
                  0.58,
                  0.42,
                ],
              }}
            />
          )}

          <Layer
            id="flood-outline"
            type="line"
            paint={{
              "line-color": "#1e293b",
              "line-width": 1.5,
            }}
          />
        </Source>
      )}
    </>
  );
}
