export function CesiumPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-xl backdrop-blur">
        <div className="text-2xl font-bold">Cesium mode</div>
        <div className="mt-2 max-w-md text-sm text-slate-300">
          Cesium integration is temporarily disabled while MapLibre mode is
          being stabilized. Next step is to configure Cesium assets, widgets
          CSS, and 3D terrain pipeline properly.
        </div>
      </div>
    </div>
  );
}
