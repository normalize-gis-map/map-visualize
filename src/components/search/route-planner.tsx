"use client";

import { Loader2, Route } from "lucide-react";
import { useMemo, useState } from "react";

import { DropdownPanel } from "@/components/ui/dropdown-panel";
import { PLACES, type PlaceItem } from "@/data/places";
import type { RouteAlternative } from "@/features/map/types/route.types";
import { getDrivingRoutes } from "@/services/routing/route.service";

type RoutePlannerProps = {
  closeSignal: number;
  onRoutesChange: (
    payload: {
      from: PlaceItem;
      to: PlaceItem;
      routes: RouteAlternative[];
      activeIndex: number;
    } | null,
  ) => void;
};

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  const remain = mins % 60;
  return `${hours} giờ ${remain} phút`;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function RoutePlanner({ closeSignal, onRoutesChange }: RoutePlannerProps) {
  const [fromLabel, setFromLabel] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [routes, setRoutes] = useState<RouteAlternative[]>([]);
  const [activeRoute, setActiveRoute] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fromPlace = useMemo(
    () => PLACES.find((item) => item.label === fromLabel) ?? null,
    [fromLabel],
  );
  const toPlace = useMemo(
    () => PLACES.find((item) => item.label === toLabel) ?? null,
    [toLabel],
  );

  const searchId = "hcm-place-options";

  const handlePlan = async () => {
    if (!fromPlace || !toPlace) {
      setError("Chọn đủ điểm đi và điểm đến từ danh sách gợi ý.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const alternatives = await getDrivingRoutes(fromPlace, toPlace);
      setRoutes(alternatives);
      setActiveRoute(0);
      onRoutesChange({
        from: fromPlace,
        to: toPlace,
        routes: alternatives,
        activeIndex: 0,
      });
    } catch (err) {
      setRoutes([]);
      onRoutesChange(null);
      setError(err instanceof Error ? err.message : "Không thể tìm đường.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoute = (index: number) => {
    if (!fromPlace || !toPlace || !routes[index]) return;
    setActiveRoute(index);
    onRoutesChange({
      from: fromPlace,
      to: toPlace,
      routes,
      activeIndex: index,
    });
  };

  return (
    <DropdownPanel
      label="Route"
      icon={<Route className="h-4 w-4" />}
      closeSignal={closeSignal}
      className="w-full sm:w-auto"
    >
      <div className="space-y-2">
        <input
          list={searchId}
          value={fromLabel}
          onChange={(event) => setFromLabel(event.target.value)}
          placeholder="Điểm đi (VD: Quận 1)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <input
          list={searchId}
          value={toLabel}
          onChange={(event) => setToLabel(event.target.value)}
          placeholder="Điểm đến (VD: Huyện Cần Giờ)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <datalist id={searchId}>
          {PLACES.map((place) => (
            <option key={place.key} value={place.label} />
          ))}
        </datalist>

        <button
          type="button"
          onClick={handlePlan}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Tìm đường
        </button>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}

        {routes.length > 0 ? (
          <div className="space-y-2 pt-1">
            {routes.map((route, index) => {
              const active = index === activeRoute;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => handleSelectRoute(index)}
                  className={`w-full rounded-xl border px-3 py-2 text-left ${
                    active
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-800">
                    {active ? "Đường chính" : `Gợi ý ${index + 1}`}
                  </div>
                  <div className="text-xs text-slate-600">
                    {formatDuration(route.durationSeconds)} •{" "}
                    {formatDistance(route.distanceMeters)}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </DropdownPanel>
  );
}
