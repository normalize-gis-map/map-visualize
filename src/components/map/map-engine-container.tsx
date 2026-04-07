"use client";

import dynamic from "next/dynamic";

import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import { useFloodStore } from "@/features/flood/store/flood.store";
import { MapLibreMap } from "./maplibre-map";

const CesiumMap = dynamic(
  () => import("./cesium-map").then((mod) => mod.CesiumMap),
  { ssr: false },
);

type MapEngineContainerProps = {
  selectedPlace: PlaceItem | null;
  floodData: FloodGeoJson | null;
};

export function MapEngineContainer({
  selectedPlace,
  floodData,
}: MapEngineContainerProps) {
  const { mapEngine } = useFloodStore();

  if (mapEngine === "cesium") {
    return <CesiumMap selectedPlace={selectedPlace} floodData={floodData} />;
  }

  return <MapLibreMap selectedPlace={selectedPlace} floodData={floodData} />;
}
