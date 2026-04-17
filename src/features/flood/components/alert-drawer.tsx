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
  mode?: "card" | "popover";
};

export function AlertDrawer({
  open,
  onToggle,
  data,
  mode = "card",
}: AlertDrawerProps) {
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

  const summaryContent = (
    <div className="grid grid-cols-1 gap-2.5">
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-100">
            <Waves className="h-4 w-4" />
          </div>
          <div className="text-[11px] font-semibold tracking-[0.12em] text-cyan-100 uppercase">
            Flood Areas
          </div>
        </div>

        <div className="text-2xl font-bold text-white">{totalAreas}</div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 text-red-200">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="text-[11px] font-semibold tracking-[0.12em] text-red-200 uppercase">
              High
            </div>
          </div>

          <div className="text-xl font-bold text-red-100">{highRiskAreas}</div>
        </div>

        <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 text-amber-100">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="text-[11px] font-semibold tracking-[0.12em] text-amber-100 uppercase">
              Medium
            </div>
          </div>

          <div className="text-xl font-bold text-amber-100">{mediumRiskAreas}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/75 p-3">
        <div className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
          Max Depth
        </div>
        <div className="text-2xl font-bold text-slate-100">{maxDepth.toFixed(1)}m</div>
      </div>
    </div>
  );

  if (mode === "popover") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-100"
          aria-label="Alerts and summary"
        >
          <Bell className="h-4.5 w-4.5" />
          {totalAreas > 0 ? (
            <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
              {Math.min(totalAreas, 99)}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute top-12 right-0 z-50 w-[min(90vw,340px)] rounded-2xl border border-slate-700 bg-slate-950/94 p-3 shadow-2xl backdrop-blur-2xl">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">Alerts & Summary</div>
                <div className="text-xs text-slate-400">Flood impact snapshot</div>
              </div>
              <button
                type="button"
                onClick={onToggle}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
                aria-label="Close alerts"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto pr-1">{summaryContent}</div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px] rounded-2xl border border-slate-700 bg-slate-950/82 shadow-2xl backdrop-blur-xl">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-100">
            <Bell className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-100">Alerts & Summary</div>
            <div className="text-xs text-slate-400">Flood impact snapshot</div>
          </div>
        </div>

        <div className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </div>
      </button>

      {open && (
        <div className="max-h-[42vh] overflow-y-auto border-t border-slate-700 px-4 pt-3 pb-4">
          {summaryContent}
        </div>
      )}
    </div>
  );
}
