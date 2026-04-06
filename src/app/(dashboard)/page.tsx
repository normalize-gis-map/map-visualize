"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { AlertDrawer } from "@/components/flood/alert-drawer";
import { LayerCatalog } from "@/components/layout/layer-catalog";
import { MapSwitcher } from "@/components/map/map-switcher";
import { SearchPanel } from "@/components/search/search-panel";
import type { PlaceItem } from "@/data/places";
import { useFloodData } from "@/features/flood/hooks/use-flood-data";
import { useFloodStore } from "@/features/flood/store/flood.store";

const MapLibreMap = dynamic(
  () => import("@/components/map/maplibre-map").then((mod) => mod.MapLibreMap),
  { ssr: false },
);

const CesiumPlaceholder = dynamic(
  () =>
    import("@/components/map/cesium-placeholder").then(
      (mod) => mod.CesiumPlaceholder,
    ),
  { ssr: false },
);

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);

  const { data, loading, error } = useFloodData();
  const { mapEngine } = useFloodStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-100">
      <div className="h-full w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            Loading map...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-red-600">
            {error}
          </div>
        ) : mapEngine === "maplibre" ? (
          <MapLibreMap selectedPlace={selectedPlace} />
        ) : (
          <CesiumPlaceholder />
        )}
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute top-4 right-4 left-4 z-20 mx-auto max-w-2xl">
          <SearchPanel onSelectPlace={setSelectedPlace} />
        </div>

        <div className="pointer-events-auto absolute top-24 left-4 z-20">
          <LayerCatalog
            open={catalogOpen}
            onToggle={() => setCatalogOpen((prev) => !prev)}
          />
        </div>

        <div className="pointer-events-auto absolute top-24 right-4 z-20 flex flex-col gap-3">
          <MapSwitcher />
        </div>

        <div className="pointer-events-auto absolute right-4 bottom-4 z-20">
          <AlertDrawer
            open={alertOpen}
            onToggle={() => setAlertOpen((prev) => !prev)}
            data={data}
          />
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
          <div className="text-sm font-semibold text-slate-900">
            Flood Warning GIS Platform
          </div>
          <div className="text-xs text-slate-500">
            Full-screen flood monitoring
          </div>
        </div>
      </div>
    </main>
  );
}
