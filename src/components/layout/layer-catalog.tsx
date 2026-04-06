"use client";

import {
  Building2,
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen,
  Route,
  ShieldAlert,
  Waves,
  X,
} from "lucide-react";

import {
  useFloodStore,
  type LayerKey,
} from "@/features/flood/store/flood.store";

type LayerCatalogProps = {
  open: boolean;
  onToggle: () => void;
};

const LAYER_ITEMS: Array<{
  key: LayerKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
}> = [
  {
    key: "flood",
    label: "Flood",
    description: "Flood polygons and depth",
    icon: <Waves className="h-4 w-4" />,
  },
  {
    key: "buildings",
    label: "Buildings",
    description: "3D building extrusions",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    key: "drainage",
    label: "Drainage",
    description: "Drainage channels",
    icon: <GitBranch className="h-4 w-4" />,
  },
  {
    key: "roads",
    label: "Roads",
    description: "Custom road network",
    icon: <Route className="h-4 w-4" />,
    disabled: true,
  },
  {
    key: "riskZones",
    label: "Risk Zones",
    description: "Flood risk classification",
    icon: <ShieldAlert className="h-4 w-4" />,
  },
];

function LayerItem({
  item,
  active,
  onToggle,
}: {
  item: (typeof LAYER_ITEMS)[number];
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 transition ${
        item.disabled
          ? "border-slate-200 bg-slate-50 opacity-60"
          : active
            ? "border-blue-200 bg-blue-50/70"
            : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div
            className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              active
                ? "bg-blue-100 text-blue-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {item.icon}
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">
              {item.label}
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              {item.description}
            </div>
            {item.disabled ? (
              <div className="mt-1 text-[11px] font-medium text-slate-400">
                Coming soon
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={item.disabled}
          onClick={onToggle}
          className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${
            item.disabled
              ? "cursor-not-allowed bg-slate-200"
              : active
                ? "bg-blue-600"
                : "bg-slate-300"
          }`}
          aria-label={`Toggle ${item.label}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
              active ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export function LayerCatalog({ open, onToggle }: LayerCatalogProps) {
  const { visibleLayers, toggleLayer } = useFloodStore();

  if (!open) {
    return (
      <>
        <div className="hidden md:block">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-2 shadow-xl backdrop-blur">
            <button
              type="button"
              onClick={onToggle}
              className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl text-slate-700 transition hover:bg-slate-100"
              aria-label="Open layers"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              {LAYER_ITEMS.map((item) => {
                const active = visibleLayers[item.key];

                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => toggleLayer(item.key)}
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                      item.disabled
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
                        : active
                          ? "border-blue-200 bg-blue-50 text-blue-600"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                    title={item.label}
                  >
                    {item.icon}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="md:hidden">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-medium text-slate-700 shadow-xl backdrop-blur"
          >
            Layers
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="hidden w-[320px] md:block">
        <aside className="rounded-[28px] border border-slate-200 bg-white/92 p-4 shadow-2xl backdrop-blur">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Layers
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage visible map datasets
              </p>
            </div>

            <button
              type="button"
              onClick={onToggle}
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100"
              aria-label="Collapse layers"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            {LAYER_ITEMS.map((item) => (
              <LayerItem
                key={item.key}
                item={item}
                active={visibleLayers[item.key]}
                onToggle={() => toggleLayer(item.key)}
              />
            ))}
          </div>
        </aside>
      </div>

      <div className="md:hidden">
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={onToggle}
        />
        <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border-t border-slate-200 bg-white p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Layers</h2>
              <p className="text-sm text-slate-500">Map dataset controls</p>
            </div>

            <button
              type="button"
              onClick={onToggle}
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pb-4">
            {LAYER_ITEMS.map((item) => (
              <LayerItem
                key={item.key}
                item={item}
                active={visibleLayers[item.key]}
                onToggle={() => toggleLayer(item.key)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
