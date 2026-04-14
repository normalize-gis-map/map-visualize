"use client";

import { useState } from "react";

import { DashboardBottomPanel } from "@/components/dashboard/dashboard-bottom-panel";
import { DashboardBottomShell } from "@/components/dashboard/dashboard-bottom-shell";
import { DashboardLeftRail } from "@/components/dashboard/dashboard-left-rail";
import { DashboardOverlay } from "@/components/dashboard/dashboard-overlay";
import { DashboardRightInspector } from "@/components/dashboard/dashboard-right-inspector";
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

      <div className="absolute inset-0 z-0">
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
            onRouteClear={() => setRoutePayload(null)}
          />
        )}
      </div>

      <DashboardOverlay>
        <TopAppHeader
          onSelectPlace={setSelectedPlace}
          onRoutesChange={setRoutePayload}
        />

        <DashboardLeftRail>
          <LayerCatalog
            open={catalogOpen}
            onToggle={() => setCatalogOpen((prev) => !prev)}
          />
        </DashboardLeftRail>

        <DashboardBottomPanel>
          <div className={catalogOpen ? "hidden md:block" : "block"}>
            <DashboardBottomShell>
              <AlertDrawer
                open={alertOpen}
                onToggle={() => setAlertOpen((prev) => !prev)}
                data={data}
              />
            </DashboardBottomShell>
          </div>
        </DashboardBottomPanel>

        <DashboardRightInspector selected={false} />
      </DashboardOverlay>
    </main>
  );
}
