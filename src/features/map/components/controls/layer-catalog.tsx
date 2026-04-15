"use client";

import {
  Bike,
  Building2,
  Car,
  Clock3,
  CloudRain,
  PanelLeftClose,
  PersonStanding,
  Sailboat,
  Sun,
  Umbrella,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useFloodStore, type LayerKey } from "@/features/map/store/map.store";

type LayerCatalogProps = {
  open: boolean;
  onToggle: () => void;
};

type CategoryId = "buildings" | "transportation" | "weather" | "time";
type TransportMode = "cars" | "boats" | "bike" | "people";
type WeatherMode = "sun" | "rain" | "snows";
type TimeMode = "live" | "night" | "morning" | "noon" | "evening";

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
    description: "3D building visibility controls",
  },
  {
    id: "transportation",
    label: "Transportation",
    icon: <Car className="h-4 w-4" />,
    layerKey: "roads",
    description: "Mobility overlays and transport filters",
  },
  {
    id: "weather",
    label: "Weather",
    icon: <CloudRain className="h-4 w-4" />,
    layerKey: "flood",
    description: "Weather scenario and flood context",
  },
  {
    id: "time",
    label: "Time",
    icon: <Clock3 className="h-4 w-4" />,
    layerKey: "riskZones",
    description: "Temporal display presets",
  },
];

const TRANSPORT_OPTIONS: Array<{
  id: TransportMode;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "cars", label: "Cars", icon: <Car className="h-3.5 w-3.5" /> },
  {
    id: "boats",
    label: "Boats",
    icon: <Sailboat className="h-3.5 w-3.5" />,
  },
  { id: "bike", label: "Bike", icon: <Bike className="h-3.5 w-3.5" /> },
  {
    id: "people",
    label: "People",
    icon: <PersonStanding className="h-3.5 w-3.5" />,
  },
];

const WEATHER_OPTIONS: Array<{
  id: WeatherMode;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "sun", label: "Sun", icon: <Sun className="h-3.5 w-3.5" /> },
  { id: "rain", label: "Rain", icon: <Umbrella className="h-3.5 w-3.5" /> },
  {
    id: "snows",
    label: "Snows",
    icon: <CloudRain className="h-3.5 w-3.5" />,
  },
];

const TIME_OPTIONS: TimeMode[] = ["live", "night", "morning", "noon", "evening"];

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

function OptionChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
        active
          ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-100"
          : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500"
      }`}
    >
      {icon}
      {label}
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
  const { visibleLayers, toggleLayer, trafficDensity, setTrafficDensity } =
    useFloodStore();
  const [transportModes, setTransportModes] = useState<TransportMode[]>(["cars"]);
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("rain");
  const [timeMode, setTimeMode] = useState<TimeMode>("live");
  const active = visibleLayers[category.layerKey];

  const toggleTransportMode = (mode: TransportMode) => {
    setTransportModes((prev) =>
      prev.includes(mode) ? prev.filter((item) => item !== mode) : [...prev, mode],
    );

    if (mode === "cars") {
      setTrafficDensity(
        transportModes.includes("cars") ? "off" : trafficDensity === "off" ? "light" : trafficDensity,
      );
    }
  };

  const renderCategoryContent = () => {
    if (category.id === "buildings") {
      return (
        <>
          <p className="mb-3 text-xs leading-5 text-slate-400">{category.description}</p>
          <OptionChip
            active={active}
            onClick={() => toggleLayer(category.layerKey)}
            label={active ? "Visible" : "Hidden"}
            icon={<Building2 className="h-3.5 w-3.5" />}
          />
          <p className="mt-3 text-[11px] text-slate-500">
            Additional building controls can be connected here later.
          </p>
        </>
      );
    }

    if (category.id === "transportation") {
      return (
        <>
          <p className="mb-3 text-xs leading-5 text-slate-400">{category.description}</p>
          <div className="flex flex-wrap gap-2">
            {TRANSPORT_OPTIONS.map((option) => (
              <OptionChip
                key={option.id}
                active={transportModes.includes(option.id)}
                onClick={() => toggleTransportMode(option.id)}
                label={option.label}
                icon={option.icon}
              />
            ))}
          </div>
        </>
      );
    }

    if (category.id === "weather") {
      return (
        <>
          <p className="mb-3 text-xs leading-5 text-slate-400">{category.description}</p>
          <div className="flex flex-wrap gap-2">
            {WEATHER_OPTIONS.map((option) => (
              <OptionChip
                key={option.id}
                active={weatherMode === option.id}
                onClick={() => {
                  setWeatherMode(option.id);
                  toggleLayer(category.layerKey);
                }}
                label={option.label}
                icon={option.icon}
              />
            ))}
          </div>
        </>
      );
    }

    return (
      <>
        <p className="mb-3 text-xs leading-5 text-slate-400">{category.description}</p>
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((option) => (
            <OptionChip
              key={option}
              active={timeMode === option}
              onClick={() => {
                setTimeMode(option);
                if (!visibleLayers[category.layerKey]) {
                  toggleLayer(category.layerKey);
                }
              }}
              label={option[0].toUpperCase() + option.slice(1)}
            />
          ))}
        </div>
      </>
    );
  };

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
        <div className="fixed inset-x-3 bottom-16 z-40 md:hidden">
          <FloatingPanel category={selectedCategory} onClose={onToggle} />
        </div>
      ) : null}
    </div>
  );
}
