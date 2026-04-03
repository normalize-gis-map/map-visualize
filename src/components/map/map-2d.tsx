"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Map, {
  Layer,
  NavigationControl,
  Source,
  type MapRef,
} from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import floodData from "@/src/data/geojson/flood-sample.json";
import { MapLegend } from "./map-legend";
import { useFloodStore } from "@/src/features/flood/store/flood.store";

type Map2DProps = {
  mapRef: React.RefObject<MapRef | null>;
};

export function Map2D({ mapRef }: Map2DProps) {
  const { mapMode, visibleLayers } = useFloodStore();

  const isFlat = mapMode === "2d";
  const isExtrusion = mapMode === "2.5d" || mapMode === "3d";

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 106.6297,
          latitude: 10.8231,
          zoom: 11,
          pitch: mapMode === "2d" ? 0 : mapMode === "2.5d" ? 45 : 60,
          bearing: mapMode === "3d" ? -18 : 0,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://demotiles.maplibre.org/style.json"
      >
        <NavigationControl position="top-right" />

        {visibleLayers.flood && (
          <Source
            id="flood-source"
            type="geojson"
            data={floodData as FeatureCollection}
          >
            {isExtrusion ? (
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
                  "fill-extrusion-height": ["*", ["get", "depth"], 1000],
                  "fill-extrusion-opacity": 0.8,
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
                  "fill-opacity": 0.55,
                }}
              />
            )}

            <Layer
              id="flood-outline"
              type="line"
              paint={{
                "line-color": "#0f172a",
                "line-width": 1.2,
              }}
            />
          </Source>
        )}
      </Map>

      {visibleLayers.flood && <MapLegend />}

      <div className="pointer-events-none absolute right-4 top-4 rounded-xl bg-white/90 px-3 py-2 text-xs font-medium text-slate-600 shadow backdrop-blur">
        {isFlat
          ? "2D view"
          : mapMode === "2.5d"
            ? "2.5D extrusion"
            : "3D-lite view"}
      </div>
    </div>
  );
}
