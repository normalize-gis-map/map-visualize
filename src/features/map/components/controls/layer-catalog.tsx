"use client";

import {
  Bike,
  Building2,
  Car,
  Clock3,
  CloudRain,
  CloudSnow,
  PanelLeftClose,
  PersonStanding,
  Sailboat,
  Sun,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  useFloodStore,
  type LayerKey,
  type TimeMode,
  type TransportMode,
  type WeatherMode,
} from "@/features/map/store/map.store";

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
    description: "Control 3D building visibility for the active scene.",
  },
  {
    id: "transportation",
    label: "Transportation",
    icon: <Car className="h-4 w-4" />,
    layerKey: "roads",
    description: "Enable mobility overlays by transportation type.",
  },
  {
    id: "weather",
    label: "Weather",
    icon: <CloudRain className="h-4 w-4" />,
    layerKey: "flood",
    description: "Apply weather mode to map tone and environment cues.",
  },
  {
    id: "time",
    label: "Time",
    icon: <Clock3 className="h-4 w-4" />,
    layerKey: "riskZones",
    description: "Adjust time-of-day ambiance and exposure profile.",
  },
];

const TRANSPORT_OPTIONS: Array<{
  id: TransportMode;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "cars", label: "Cars", icon: <Car className="h-4 w-4" /> },
  { id: "boats", label: "Boats", icon: <Sailboat className="h-4 w-4" /> },
  { id: "bike", label: "Bike", icon: <Bike className="h-4 w-4" /> },
  {
    id: "people",
    label: "People",
    icon: <PersonStanding className="h-4 w-4" />,
  },
];

const WEATHER_OPTIONS: Array<{
  id: WeatherMode;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "sun", label: "Sun", icon: <Sun className="h-4 w-4" /> },
  { id: "rain", label: "Rain", icon: <CloudRain className="h-4 w-4" /> },
  { id: "snow", label: "Snow", icon: <CloudSnow className="h-4 w-4" /> },
];

const TIME_OPTIONS: Array<{ id: TimeMode; label: string; icon: React.ReactNode }> = [
  { id: "live", label: "Live", icon: <Clock3 className="h-4 w-4" /> },
  { id: "night", label: "Night", icon: <CloudSnow className="h-4 w-4" /> },
  { id: "morning", label: "Morning", icon: <Sun className="h-4 w-4" /> },
  { id: "noon", label: "Noon", icon: <Sun className="h-4 w-4" /> },
  { id: "evening", label: "Evening", icon: <CloudRain className="h-4 w-4" /> },
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
      <div className="flex flex-col gap-1.5">
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

function OptionCard({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-16 items-center gap-2 rounded-xl border px-3 text-left text-xs font-semibold transition ${
        active
          ? "border-cyan-300/65 bg-cyan-400/20 text-cyan-100 shadow-[0_0_16px_-10px_rgba(34,211,238,1)]"
          : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500"
      }`}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/80">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function FloatingPanel({
  category,
  onClose,
}: {
  category: (typeof CATEGORY_ITEMS)[number];
  onClose: () => void;
}) {
  const {
    visibleLayers,
    toggleLayer,
    transportVisibility,
    toggleTransportMode,
    weatherMode,
    setWeatherMode,
    timeMode,
    setTimeMode,
  } = useFloodStore();

  const active = visibleLayers[category.layerKey];

  const renderCategoryContent = () => {
    if (category.id === "buildings") {
      return (
        <div className="space-y-3">
          <p className="text-xs leading-5 text-slate-400">{category.description}</p>
          <button
            type="button"
            onClick={() => toggleLayer(category.layerKey)}
            className={`flex h-12 w-full items-center justify-center rounded-xl border text-sm font-semibold transition ${
              active
                ? "border-cyan-300/65 bg-cyan-400/20 text-cyan-100"
                : "border-slate-700 bg-slate-900/70 text-slate-200"
            }`}
          >
            {active ? "Buildings: Visible" : "Buildings: Hidden"}
          </button>
        </div>
      );
    }

    if (category.id === "transportation") {
      return (
        <div className="space-y-3">
          <p className="text-xs leading-5 text-slate-400">{category.description}</p>
          <div className="grid grid-cols-2 gap-2">
            {TRANSPORT_OPTIONS.map((option) => (
              <OptionCard
                key={option.id}
                active={transportVisibility[option.id]}
                label={option.label}
                icon={option.icon}
                onClick={() => toggleTransportMode(option.id)}
              />
            ))}
          </div>
        </div>
      );
    }

    if (category.id === "weather") {
      return (
        <div className="space-y-3">
          <p className="text-xs leading-5 text-slate-400">{category.description}</p>
          <div className="grid grid-cols-3 gap-2">
            {WEATHER_OPTIONS.map((option) => (
              <OptionCard
                key={option.id}
                active={weatherMode === option.id}
                label={option.label}
                icon={option.icon}
                onClick={() => {
                  setWeatherMode(option.id);
                  if (!visibleLayers.flood) {
                    toggleLayer("flood");
                  }
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-xs leading-5 text-slate-400">{category.description}</p>
        <div className="grid grid-cols-2 gap-2">
          {TIME_OPTIONS.map((option) => (
            <OptionCard
              key={option.id}
              active={timeMode === option.id}
              label={option.label}
              icon={option.icon}
              onClick={() => {
                setTimeMode(option.id);
                if (!visibleLayers.riskZones) {
                  toggleLayer("riskZones");
                }
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[280px] rounded-xl border border-slate-700/75 bg-slate-950/88 p-3.5 shadow-2xl backdrop-blur-2xl sm:w-[300px]">
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-700/70 pb-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
            Control Group
          </p>
          <h2 className="text-base font-semibold text-white">{category.label}</h2>
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

      {renderCategoryContent()}
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
        <div className="fixed inset-x-2 bottom-16 z-40 md:hidden">
          <FloatingPanel category={selectedCategory} onClose={onToggle} />
        </div>
      ) : null}
    </div>
  );
}
