"use client";

import dynamic from "next/dynamic";

import type { PlaceItem } from "@/data/places";
import { useFloodStore } from "@/features/flood/store/flood.store";
import { MapLibreMap } from "./maplibre-map";

const CesiumMap = dynamic(
  () => import("./cesium-map").then((mod) => mod.CesiumMap),
  { ssr: false },
);

type MapEngineContainerProps = {
  selectedPlace: PlaceItem | null;
};

export function MapEngineContainer({ selectedPlace }: MapEngineContainerProps) {
  const { mapEngine } = useFloodStore();

  if (mapEngine === "cesium") {
    return <CesiumMap selectedPlace={selectedPlace} />;
  }

  return <MapLibreMap selectedPlace={selectedPlace} />;
}
