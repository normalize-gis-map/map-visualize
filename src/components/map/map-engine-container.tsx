"use client";

import dynamic from "next/dynamic";

import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import type { RouteAlternative } from "@/features/map/types/route.types";
import { useFloodStore } from "@/features/map/store/map.store";
import { MapLibreMap } from "./maplibre-map";

const CesiumMap = dynamic(
  () => import("./cesium-map").then((mod) => mod.CesiumMap),
  { ssr: false },
);

type MapEngineContainerProps = {
  selectedPlace: PlaceItem | null;
  floodData: FloodGeoJson | null;
  routePayload: {
    from: PlaceItem;
    to: PlaceItem;
    routes: RouteAlternative[];
    activeIndex: number;
  } | null;
};

export function MapEngineContainer({
  selectedPlace,
  floodData,
  routePayload,
}: MapEngineContainerProps) {
  const { mapEngine, hasHydrated } = useFloodStore();
  const safeMapEngine = hasHydrated ? mapEngine : "maplibre";

  if (safeMapEngine === "cesium") {
    return <CesiumMap selectedPlace={selectedPlace} floodData={floodData} />;
  }

  return (
    <MapLibreMap
      selectedPlace={selectedPlace}
      floodData={floodData}
      routePayload={routePayload}
    />
  );
}
