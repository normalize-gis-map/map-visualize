"use client";

import {
  AlertTriangle,
  Building2,
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
  if (tone === "danger") return "bg-red-50 text-red-700 ring-1 ring-red-200";
  if (tone === "warning")
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  if (tone === "info") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
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
      offset={20}
      maxWidth="320px"
      className="[&_.maplibregl-popup-content]:overflow-hidden [&_.maplibregl-popup-content]:rounded-3xl [&_.maplibregl-popup-content]:border [&_.maplibregl-popup-content]:border-slate-200 [&_.maplibregl-popup-content]:bg-white [&_.maplibregl-popup-content]:p-0 [&_.maplibregl-popup-content]:shadow-2xl [&_.maplibregl-popup-tip]:border-t-white"
    >
      <div className="w-[280px] max-w-[280px]">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              {getVariantIcon(variant)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5"
            >
              <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                {field.label}
              </span>

              <span
                className={`inline-flex max-w-[120px] items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${getToneClass(field.tone)}`}
              >
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
