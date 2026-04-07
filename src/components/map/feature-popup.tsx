"use client";

import {
  AlertTriangle,
  Building2,
  CircleDashed,
  GitBranch,
  MapPinned,
  ShieldAlert,
  Waves,
} from "lucide-react";
import { Popup } from "react-map-gl/maplibre";

type PopupField = {
  label: string;
  value: string | number;
  tone?: "default" | "info" | "warning" | "danger";
};

type FeaturePopupProps = {
  longitude: number;
  latitude: number;
  title: string;
  subtitle?: string;
  fields: PopupField[];
  onClose: () => void;
  variant?: "flood" | "building" | "drainage" | "risk" | "default";
};

function getVariantIcon(variant: FeaturePopupProps["variant"]) {
  if (variant === "flood") return <Waves className="h-4 w-4" />;
  if (variant === "building") return <Building2 className="h-4 w-4" />;
  if (variant === "drainage") return <GitBranch className="h-4 w-4" />;
  if (variant === "risk") return <ShieldAlert className="h-4 w-4" />;
  return <MapPinned className="h-4 w-4" />;
}

function getToneClass(tone?: PopupField["tone"]) {
  if (tone === "danger")
    return "border-red-200 bg-red-50/90 text-red-700 shadow-red-100";
  if (tone === "warning")
    return "border-amber-200 bg-amber-50/90 text-amber-700 shadow-amber-100";
  if (tone === "info")
    return "border-blue-200 bg-blue-50/90 text-blue-700 shadow-blue-100";
  return "border-slate-200 bg-slate-50/90 text-slate-700 shadow-slate-100";
}

function getToneDotClass(tone?: PopupField["tone"]) {
  if (tone === "danger") return "text-red-500";
  if (tone === "warning") return "text-amber-500";
  if (tone === "info") return "text-blue-500";
  return "text-slate-400";
}

export function FeaturePopup({
  longitude,
  latitude,
  title,
  subtitle,
  fields,
  onClose,
  variant = "default",
}: FeaturePopupProps) {
  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      closeButton
      closeOnClick={true}
      closeOnMove={true}
      onClose={onClose}
      offset={24}
      maxWidth="340px"
      className="[&_.maplibregl-popup-close-button]:top-2 [&_.maplibregl-popup-close-button]:right-2 [&_.maplibregl-popup-close-button]:h-7 [&_.maplibregl-popup-close-button]:w-7 [&_.maplibregl-popup-close-button]:rounded-full [&_.maplibregl-popup-close-button]:text-slate-500 [&_.maplibregl-popup-close-button]:transition [&_.maplibregl-popup-close-button]:hover:bg-slate-100 [&_.maplibregl-popup-content]:overflow-hidden [&_.maplibregl-popup-content]:rounded-3xl [&_.maplibregl-popup-content]:border [&_.maplibregl-popup-content]:border-slate-200/90 [&_.maplibregl-popup-content]:bg-white/95 [&_.maplibregl-popup-content]:p-0 [&_.maplibregl-popup-content]:shadow-[0_16px_60px_-20px_rgba(15,23,42,0.42)] [&_.maplibregl-popup-content]:backdrop-blur [&_.maplibregl-popup-tip]:border-t-white/95"
    >
      <div className="w-[300px] max-w-[300px]">
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-4 text-white">
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-sm ring-1 ring-white/20">
              {getVariantIcon(variant)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-1 text-xs text-slate-300">{subtitle}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-2.5 bg-slate-50/70 px-3.5 py-3.5">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm"
            >
              <div className="min-w-0">
                <span className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                  {field.label}
                </span>
              </div>

              <span
                className={`inline-flex max-w-[140px] items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${getToneClass(field.tone)}`}
              >
                <CircleDashed
                  className={`h-3.5 w-3.5 shrink-0 ${getToneDotClass(field.tone)}`}
                  fill="currentColor"
                />
                {field.tone === "danger" ? (
                  <AlertTriangle className="mr-1 h-3.5 w-3.5 shrink-0" />
                ) : null}
                <span className="truncate">{field.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Popup>
  );
}
