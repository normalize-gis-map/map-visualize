"use client";

import { useState } from "react";

import { AlertDrawer } from "@/components/flood/alert-drawer";
import { LayerCatalog } from "@/components/layout/layer-catalog";
import { TopAppHeader } from "@/components/layout/top-app-header";
import { MapEngineContainer } from "@/components/map/map-engine-container";
import type { PlaceItem } from "@/data/places";
import { useFloodData } from "@/features/flood/hooks/use-flood-data";
import type { RouteAlternative } from "@/features/map/types/route.types";

type RoutePayload = {
  from: PlaceItem;
  to: PlaceItem;
  routes: RouteAlternative[];
  activeIndex: number;
};

export function DashboardShell() {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [routePayload, setRoutePayload] = useState<RoutePayload | null>(null);

  const { data, loading, error } = useFloodData();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-100">
      <h1 className="sr-only">Flood warning monitoring dashboard</h1>

      <div className="h-full w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            Loading map...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-red-600">
            {error}
          </div>
        ) : (
          <MapEngineContainer
            selectedPlace={selectedPlace}
            floodData={data}
            routePayload={routePayload}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-0">
        <TopAppHeader
          onSelectPlace={setSelectedPlace}
          onRoutesChange={setRoutePayload}
        />

        <div className="pointer-events-auto absolute top-[92px] left-3 z-20 md:top-[96px] md:left-4">
          <LayerCatalog
            open={catalogOpen}
            onToggle={() => setCatalogOpen((prev) => !prev)}
          />
        </div>

        <div
          className={`pointer-events-auto absolute bottom-2 left-1/2 z-20 w-[calc(100%-1rem)] -translate-x-1/2 md:right-4 md:bottom-4 md:left-auto md:w-auto md:translate-x-0 ${
            catalogOpen ? "hidden md:block" : ""
          }`}
        >
          <AlertDrawer
            open={alertOpen}
            onToggle={() => setAlertOpen((prev) => !prev)}
            data={data}
          />
        </div>
      </div>
    </main>
  );
}
