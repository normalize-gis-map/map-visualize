export function MapLegend() {
  const items = [
    { color: "#60a5fa", label: "Low (0 - 0.5m)" },
    { color: "#f59e0b", label: "Medium (0.5 - 1.2m)" },
    { color: "#ef4444", label: "High (> 1.2m)" },
  ];

  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 text-sm font-semibold text-slate-900">
        Flood Severity
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-md"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
