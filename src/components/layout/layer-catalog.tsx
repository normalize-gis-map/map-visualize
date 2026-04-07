"use client";

import {
  Building2,
  GitBranch,
  Layers3,
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

function ToggleSwitch({
  active,
  disabled,
  onClick,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        disabled
          ? "cursor-not-allowed bg-slate-200"
          : active
            ? "bg-blue-600"
            : "bg-slate-300"
      }`}
      aria-label={`Toggle ${label}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
          active ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function LayerItem({
  item,
  active,
  onToggle,
  buildingOpacity,
  onBuildingOpacityChange,
}: {
  item: (typeof LAYER_ITEMS)[number];
  active: boolean;
  onToggle: () => void;
  buildingOpacity: number;
  onBuildingOpacityChange: (value: number) => void;
}) {
  const isBuildings = item.key === "buildings";

  return (
    <div
      className={`group rounded-3xl border p-3 transition-all ${
        item.disabled
          ? "border-slate-200 bg-slate-50/90 opacity-70"
          : active
            ? "border-blue-200 bg-blue-50/70 shadow-sm"
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition ${
            active
              ? "bg-blue-100 text-blue-600"
              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70"
          }`}
        >
          {item.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {item.label}
                </div>

                {item.disabled ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase ring-1 ring-slate-200">
                    Soon
                  </span>
                ) : active ? (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-blue-700 uppercase ring-1 ring-blue-200">
                    On
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase ring-1 ring-slate-200">
                    Off
                  </span>
                )}
              </div>

              <div className="mt-1 text-xs leading-5 text-slate-500">
                {item.description}
              </div>
            </div>

            <ToggleSwitch
              active={active}
              disabled={item.disabled}
              onClick={onToggle}
              label={item.label}
            />
          </div>

          {isBuildings && !item.disabled ? (
            <div
              className={`mt-3 rounded-2xl border px-3 py-3 transition ${
                active
                  ? "border-blue-100 bg-white/80"
                  : "border-slate-200 bg-slate-50/80"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  Building opacity
                </span>
                <span className="text-[11px] font-semibold text-slate-700">
                  {Math.round(buildingOpacity * 100)}%
                </span>
              </div>

              <input
                type="range"
                min={0.1}
                max={1}
                step={0.01}
                value={buildingOpacity}
                onChange={(e) =>
                  onBuildingOpacityChange(Number(e.target.value))
                }
                disabled={!active}
                className="w-full accent-blue-600 disabled:cursor-not-allowed"
                aria-label="Adjust building opacity"
              />

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Light</span>
                <span>Solid</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DesktopCollapsedRail({ onToggle }: { onToggle: () => void }) {
  const { visibleLayers, toggleLayer } = useFloodStore();

  return (
    <div className="hidden md:block">
      <div className="rounded-[24px] border border-slate-200 bg-white/90 p-2 shadow-xl backdrop-blur">
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
                aria-label={item.label}
              >
                {item.icon}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DesktopPanel({ onToggle }: { onToggle: () => void }) {
  const { visibleLayers, toggleLayer, buildingOpacity, setBuildingOpacity } =
    useFloodStore();

  return (
    <div className="hidden md:block">
      <aside className="w-[320px] max-w-[calc(100vw-2rem)] rounded-[28px] border border-slate-200 bg-white/92 p-4 shadow-2xl backdrop-blur">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <Layers3 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Layers
                </h2>
                <p className="text-sm text-slate-500">
                  Control visible map datasets
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100"
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
              buildingOpacity={buildingOpacity}
              onBuildingOpacityChange={setBuildingOpacity}
            />
          ))}
        </div>
      </aside>
    </div>
  );
}

function MobileTrigger({ onToggle }: { onToggle: () => void }) {
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-medium text-slate-700 shadow-xl backdrop-blur"
      >
        <Layers3 className="h-4 w-4" />
        Layers
      </button>
    </div>
  );
}

function MobileSheet({ onToggle }: { onToggle: () => void }) {
  const { visibleLayers, toggleLayer, buildingOpacity, setBuildingOpacity } =
    useFloodStore();

  return (
    <div className="md:hidden">
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        onClick={onToggle}
      />

      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border-t border-slate-200 bg-white px-4 pt-3 pb-5 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200" />

        <div className="mb-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">Layers</h2>
            <p className="text-sm text-slate-500">Map dataset controls</p>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100"
            aria-label="Close layers"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] space-y-3 overflow-y-auto pb-2">
          {LAYER_ITEMS.map((item) => (
            <LayerItem
              key={item.key}
              item={item}
              active={visibleLayers[item.key]}
              onToggle={() => toggleLayer(item.key)}
              buildingOpacity={buildingOpacity}
              onBuildingOpacityChange={setBuildingOpacity}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LayerCatalog({ open, onToggle }: LayerCatalogProps) {
  if (!open) {
    return (
      <>
        <DesktopCollapsedRail onToggle={onToggle} />
        <MobileTrigger onToggle={onToggle} />
      </>
    );
  }

  return (
    <>
      <DesktopPanel onToggle={onToggle} />
      <MobileSheet onToggle={onToggle} />
    </>
  );
}
