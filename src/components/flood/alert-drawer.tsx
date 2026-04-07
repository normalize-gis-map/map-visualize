"use client";

import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Waves,
} from "lucide-react";

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
  const mediumRiskAreas =
    data?.features.filter((feature) => feature.properties.severity === "medium")
      .length ?? 0;
  const maxDepth = data
    ? Math.max(...data.features.map((feature) => feature.properties.depth), 0)
    : 0;

  return (
    <div className="w-[min(360px,calc(100vw-1rem))] rounded-[28px] border border-slate-200 bg-white/92 shadow-2xl backdrop-blur sm:w-[300px] sm:max-w-[calc(100vw-2rem)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3.5 py-3.5 text-left sm:px-4 sm:py-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <Bell className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              Alerts & Summary
            </div>
            <div className="text-xs text-slate-500">Flood impact snapshot</div>
          </div>
        </div>

        <div className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100">
          {open ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}
        </div>
      </button>

      {open && (
        <div className="max-h-[42vh] overflow-y-auto border-t border-slate-100 px-3.5 pt-3 pb-4 sm:max-h-none sm:px-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Waves className="h-4 w-4" />
                </div>
                <div className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  Flood Areas
                </div>
              </div>

              <div className="text-2xl font-bold text-slate-900">
                {totalAreas}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-red-100 bg-red-50/70 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-semibold tracking-[0.12em] text-red-600 uppercase">
                    High
                  </div>
                </div>

                <div className="text-xl font-bold text-red-700">
                  {highRiskAreas}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-semibold tracking-[0.12em] text-amber-600 uppercase">
                    Medium
                  </div>
                </div>

                <div className="text-xl font-bold text-amber-700">
                  {mediumRiskAreas}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-2 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Max Depth
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {maxDepth.toFixed(1)}m
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
