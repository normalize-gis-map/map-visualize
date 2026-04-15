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
        <Source
          id="risk-zones"
          type="geojson"
          data={riskZonesData as FeatureCollection}
        >
          <Layer
            id="risk-zones-fill"
            type="fill"
            paint={{
              "fill-color": [
                "match",
                ["get", "level"],
                "high",
                "#dc2626",
                "medium",
                "#d97706",
                "low",
                "#3b82f6",
                "#64748b",
              ],
              "fill-opacity": 0.12,
            }}
          />
        </Source>
      )}

      {visibleLayers.drainage && (
        <Source
          id="drainage"
          type="geojson"
          data={drainageData as FeatureCollection}
        >
          <Layer
            id="drainage-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": "#64748b",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                9,
                1.6,
                15,
                4.5,
              ],
              "line-opacity": 0.75,
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
                  "#dc2626",
                  "#60a5fa",
                ],
                "fill-extrusion-height": [
                  "interpolate",
                  ["linear"],
                  ["get", "depth"],
                  0,
                  0,
                  2,
                  1200,
                ],
                "fill-extrusion-opacity": 0.72,
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
                  "#dc2626",
                  "#60a5fa",
                ],
                "fill-opacity": [
                  "case",
                  ["==", ["get", "id"], selectedId],
                  0.68,
                  ["==", ["get", "id"], hoveredId],
                  0.58,
                  0.36,
                ],
              }}
            />
          )}

          <Layer
            id="flood-outline"
            type="line"
            paint={{
              "line-color": "#334155",
              "line-width": 1.25,
              "line-opacity": 0.7,
            }}
          />
        </Source>
      )}
    </>
  );
}
