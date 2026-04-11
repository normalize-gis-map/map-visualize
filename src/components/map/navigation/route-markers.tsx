import type { Position } from "geojson";
import { Bike, Car, Footprints } from "lucide-react";
import { useEffect, useState } from "react";
import { Marker } from "react-map-gl/maplibre";

type TrafficSample = {
  id: string;
  lng: number;
  lat: number;
  bearing: number;
  direction: "forward" | "backward";
  vehicleType: "car" | "bike";
};

type Props = {
  coordinates: Position[];
  navCoordinate: [number, number] | null;
  navHeading: number;
  navMode: "car" | "bike" | "walk";
  mapLibreCar3D: boolean;
  trafficCars: TrafficSample[];
};

export function RouteMarkers({
  coordinates,
  navCoordinate,
  navHeading,
  navMode,
  mapLibreCar3D,
  trafficCars,
}: Props) {
  const [modelViewerReady, setModelViewerReady] = useState(
    () => typeof window !== "undefined" && Boolean(customElements.get("model-viewer")),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (customElements.get("model-viewer")) return;

    const scriptId = "google-model-viewer-script";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setModelViewerReady(true), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "module";
    script.src = "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";
    script.onload = () => setModelViewerReady(true);
    document.head.appendChild(script);
  }, []);

  if (!coordinates.length) return null;

  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];

  return (
    <>
      <Marker longitude={start[0]} latitude={start[1]} anchor="bottom">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-xs font-bold text-white shadow-lg">
          A
        </div>
      </Marker>

      <Marker longitude={end[0]} latitude={end[1]} anchor="bottom">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-xs font-bold text-white shadow-lg">
          B
        </div>
      </Marker>

      {navCoordinate ? (
        <Marker longitude={navCoordinate[0]} latitude={navCoordinate[1]} anchor="center">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg"
            style={{ transform: `rotate(${navHeading}deg)` }}
          >
            {mapLibreCar3D && navMode === "car" ? (
              modelViewerReady ? (
                <model-viewer
                  src="https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb"
                  disable-zoom
                  disable-pan
                  camera-controls={false}
                  auto-rotate
                  rotation-per-second="20deg"
                  style={{ width: "28px", height: "28px", pointerEvents: "none" }}
                />
              ) : (
                <Car className="h-4 w-4" />
              )
            ) : navMode === "car" ? (
              <Car className="h-4 w-4" />
            ) : navMode === "bike" ? (
              <Bike className="h-4 w-4" />
            ) : (
              <Footprints className="h-4 w-4" />
            )}
          </div>
        </Marker>
      ) : null}

      {trafficCars.map((car) => (
        <Marker key={car.id} longitude={car.lng} latitude={car.lat} anchor="center">
          <div
            className="relative flex h-7 w-7 items-center justify-center rounded-[7px] border border-white/70 bg-slate-900/85 text-[10px] text-white shadow-lg"
            style={{ transform: `rotate(${car.bearing}deg)` }}
          >
            {car.vehicleType === "bike" ? (
              <div className="relative h-4 w-4">
                <div className="absolute top-0.5 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-slate-100" />
                <div className="absolute bottom-0 left-0.5 h-1.5 w-1.5 rounded-full border border-slate-900 bg-white" />
                <div className="absolute right-0.5 bottom-0 h-1.5 w-1.5 rounded-full border border-slate-900 bg-white" />
              </div>
            ) : (
              <div
                className={`h-4 w-4 rounded-[4px] ${
                  car.direction === "forward" ? "bg-sky-300" : "bg-amber-300"
                }`}
              />
            )}
            <div className="absolute top-0.5 left-1/2 h-0.5 w-2 -translate-x-1/2 rounded-full bg-white/85" />
            <div
              className={`absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                car.direction === "forward" ? "bg-rose-400" : "bg-emerald-300"
              }`}
            />
          </div>
        </Marker>
      ))}
    </>
  );
}
