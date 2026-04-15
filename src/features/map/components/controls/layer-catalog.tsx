"use client";

import {
  Building2,
  Car,
  Clock3,
  CloudRain,
  PanelLeftClose,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useFloodStore, type LayerKey } from "@/features/map/store/map.store";

type LayerCatalogProps = {
  open: boolean;
  onToggle: () => void;
};

type CategoryId = "buildings" | "transportation" | "weather" | "time";

const CATEGORY_ITEMS: Array<{
  id: CategoryId;
  label: string;
  icon: React.ReactNode;
  layerKey: LayerKey;
  description: string;
}> = [
  {
    id: "buildings",
    label: "Buildings",
    icon: <Building2 className="h-4 w-4" />,
    layerKey: "buildings",
    description: "3D building extrusions",
  },
  {
    id: "transportation",
    label: "Transportation",
    icon: <Car className="h-4 w-4" />,
    layerKey: "roads",
    description: "Road network overlays",
  },
  {
    id: "weather",
    label: "Weather",
    icon: <CloudRain className="h-4 w-4" />,
    layerKey: "flood",
    description: "Live weather / flood overlays",
  },
  {
    id: "time",
    label: "Time",
    icon: <Clock3 className="h-4 w-4" />,
    layerKey: "riskZones",
    description: "Temporal risk zoning layer",
  },
];

function FloatingToolbar({
  active,
  onPick,
}: {
  active: CategoryId;
  onPick: (category: CategoryId) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-700/75 bg-slate-950/82 p-2 shadow-xl backdrop-blur-2xl">
      <div className="flex flex-col gap-2 md:gap-1.5">
        {CATEGORY_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item.id)}
            title={item.label}
            aria-label={item.label}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
              active === item.id
                ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-100 shadow-[0_0_20px_-12px_rgba(34,211,238,1)]"
                : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500"
            }`}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function FloatingPanel({
  category,
  onClose,
}: {
  category: (typeof CATEGORY_ITEMS)[number];
  onClose: () => void;
}) {
  const { visibleLayers, toggleLayer } = useFloodStore();
  const active = visibleLayers[category.layerKey];

  return (
    <div className="w-[248px] rounded-xl border border-slate-700/75 bg-slate-950/86 p-3 shadow-2xl backdrop-blur-2xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Layer
          </p>
          <h2 className="text-sm font-semibold text-white">{category.label}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close layer panel"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-3 text-xs leading-5 text-slate-400">{category.description}</p>

      <button
        type="button"
        onClick={() => toggleLayer(category.layerKey)}
        className={`inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition ${
          active
            ? "bg-cyan-500 text-slate-950"
            : "border border-slate-700 bg-slate-900/70 text-slate-200"
        }`}
      >
        {active ? "Visible" : "Enable layer"}
      </button>
    </div>
  );
}

export function LayerCatalog({ open, onToggle }: LayerCatalogProps) {
  const [selected, setSelected] = useState<CategoryId>("buildings");

  const selectedCategory = useMemo(
    () => CATEGORY_ITEMS.find((item) => item.id === selected) ?? CATEGORY_ITEMS[0],
    [selected],
  );

  const handlePick = (category: CategoryId) => {
    if (!open) {
      onToggle();
      setSelected(category);
      return;
    }

    if (selected === category) {
      onToggle();
      return;
    }

    setSelected(category);
  };

  return (
    <div className="flex items-end gap-2 md:items-start">
      <FloatingToolbar active={selected} onPick={handlePick} />

      {open ? (
        <div className="hidden md:block">
          <FloatingPanel category={selectedCategory} onClose={onToggle} />
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-x-3 bottom-16 z-40 md:hidden">
          <FloatingPanel category={selectedCategory} onClose={onToggle} />
        </div>
      ) : null}
    </div>
  );
}
