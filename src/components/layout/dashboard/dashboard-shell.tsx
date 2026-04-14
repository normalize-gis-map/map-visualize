"use client";

import { useState } from "react";

import { DashboardLeftRail } from "@/components/dashboard/dashboard-left-rail";
import { DashboardOverlay } from "@/components/dashboard/dashboard-overlay";
import { DashboardRightInspector } from "@/components/dashboard/dashboard-right-inspector";
import { TopAppHeader } from "@/components/layout/header/top-app-header";
import { MapEngineContainer } from "@/components/map/engines/map-engine-container";
import type { PlaceItem } from "@/data/places";
import { AlertDrawer } from "@/features/flood/components/alert-drawer";
import { useFloodData } from "@/features/flood/hooks/use-flood-data";
import { LayerCatalog } from "@/features/map/components/controls/layer-catalog";
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
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <h1 className="sr-only">Flood warning monitoring dashboard</h1>

      <div className="absolute inset-0 z-0">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-300">
            Loading map...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-red-300">
            {error}
          </div>
        ) : (
          <MapEngineContainer
            selectedPlace={selectedPlace}
            floodData={data}
            routePayload={routePayload}
            onRouteClear={() => setRoutePayload(null)}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.18),transparent_36%),radial-gradient(circle_at_left,rgba(30,64,175,0.14),transparent_40%)]" />

      <DashboardOverlay>
        <TopAppHeader
          onSelectPlace={setSelectedPlace}
          onRoutesChange={setRoutePayload}
          alertOpen={alertOpen}
          onToggleAlert={() => setAlertOpen((prev) => !prev)}
          floodData={data}
        />

        <DashboardLeftRail>
          <LayerCatalog
            open={catalogOpen}
            onToggle={() => setCatalogOpen((prev) => !prev)}
          />
        </DashboardLeftRail>

        <div className="pointer-events-none absolute right-3 bottom-4 left-3 z-30 flex justify-end md:right-5 md:bottom-6 md:left-auto">
          <div className="pointer-events-auto w-full max-w-[340px] md:w-auto">
            <AlertDrawer
              open={alertOpen}
              onToggle={() => setAlertOpen((prev) => !prev)}
              data={data}
              mode="card"
            />
          </div>
        </div>

        <DashboardRightInspector selected={false} />
      </DashboardOverlay>
    </main>
  );
}
