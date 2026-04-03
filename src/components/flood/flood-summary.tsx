import { Waves, AlertTriangle, Ruler } from "lucide-react";
import type { FloodGeoJson } from "@/src/features/flood/types/flood.types";

export function FloodSummary({ data }: { data: FloodGeoJson | null }) {
  const total = data?.features.length ?? 0;
  const high =
    data?.features.filter((f) => f.properties.severity === "high").length ?? 0;
  const max = data
    ? Math.max(...data.features.map((f) => f.properties.depth), 0)
    : 0;

  const cards = [
    {
      label: "Flood Areas",
      value: total,
      icon: <Waves className="h-5 w-5 text-blue-600" />,
      valueClass: "text-slate-900",
    },
    {
      label: "High Risk Areas",
      value: high,
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      valueClass: "text-red-600",
    },
    {
      label: "Max Depth",
      value: `${max} m`,
      icon: <Ruler className="h-5 w-5 text-violet-600" />,
      valueClass: "text-slate-900",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500">
              {card.label}
            </div>
            <div className="rounded-xl bg-slate-50 p-2">{card.icon}</div>
          </div>

          <div className={`mt-4 text-4xl font-bold ${card.valueClass}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
