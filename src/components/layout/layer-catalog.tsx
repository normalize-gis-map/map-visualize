"use client";

import { Waves, Route, ShieldAlert, GitBranch } from "lucide-react";
import {
  useFloodStore,
  type LayerKey,
} from "@/src/features/flood/store/flood.store";

const LAYER_ITEMS: Array<{
  key: LayerKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    key: "flood",
    label: "Flood",
    description: "Flood polygons and depth visualization",
    icon: <Waves className="h-4 w-4" />,
  },
  {
    key: "drainage",
    label: "Drainage",
    description: "Drainage network and channels",
    icon: <GitBranch className="h-4 w-4" />,
  },
  {
    key: "roads",
    label: "Roads",
    description: "Main roads and access routes",
    icon: <Route className="h-4 w-4" />,
  },
  {
    key: "riskZones",
    label: "Risk Zones",
    description: "Flood risk classification areas",
    icon: <ShieldAlert className="h-4 w-4" />,
  },
];

export function LayerCatalog() {
  const { visibleLayers, toggleLayer } = useFloodStore();

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Catalog</h2>
        <p className="mt-1 text-sm text-slate-500">
          Control visibility of map layers
        </p>
      </div>

      <div className="space-y-3">
        {LAYER_ITEMS.map((item) => {
          const active = visibleLayers[item.key];

          return (
            <div
              key={item.key}
              className="rounded-2xl border border-slate-200 p-3 transition hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div
                    className={`mt-0.5 rounded-xl p-2 ${
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
                    <div className="text-xs text-slate-500">
                      {item.description}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleLayer(item.key)}
                  className={`relative h-7 w-12 rounded-full transition ${
                    active ? "bg-blue-600" : "bg-slate-300"
                  }`}
                  aria-label={`Toggle ${item.label}`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      active ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
