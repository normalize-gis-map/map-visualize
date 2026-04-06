"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";

import type { PlaceItem } from "@/data/places";

export function useMapFlyToPlace(
  map: maplibregl.Map | null,
  selectedPlace: PlaceItem | null,
) {
  useEffect(() => {
    if (!map || !selectedPlace) return;

    if (selectedPlace.bounds) {
      map.fitBounds(selectedPlace.bounds, {
        padding: 60,
        duration: 1400,
      });
      return;
    }

    map.flyTo({
      center: selectedPlace.center,
      zoom: selectedPlace.zoom,
      duration: 1400,
    });
  }, [map, selectedPlace]);
}
