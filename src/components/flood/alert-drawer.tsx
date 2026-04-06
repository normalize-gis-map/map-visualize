"use client";

import { Bell, ChevronDown, ChevronUp } from "lucide-react";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";

type AlertDrawerProps = {
  open: boolean;
  onToggle: () => void;
  data: FloodGeoJson | null;
};

export function AlertDrawer({ open, onToggle, data }: AlertDrawerProps) {
  const totalAreas = data?.features.length ?? 0;
  const highRiskAreas =
    data?.features.filter((feature) => feature.properties.severity === "high")
      .length ?? 0;
  const maxDepth = data
    ? Math.max(...data.features.map((feature) => feature.properties.depth), 0)
    : 0;

  return (
    <div className="w-[320px] rounded-3xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-red-500" />
          <span className="text-sm font-semibold text-slate-900">
            Flood Alerts
          </span>
        </div>

        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-200 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">Flood Areas</span>
            <strong className="text-slate-900">{totalAreas}</strong>
          </div>

          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">High Risk Areas</span>
            <strong className="text-red-600">{highRiskAreas}</strong>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Max Depth</span>
            <strong className="text-slate-900">{maxDepth} m</strong>
          </div>
        </div>
      )}
    </div>
  );
}
