import type { Position } from "geojson";
import { Bike, Footprints } from "lucide-react";
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

const MAPLIBRE_GLB_VARIANTS = [
  "https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/ToyCar/glTF-Binary/ToyCar.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/VC/glTF-Binary/VC.glb",
] as const;

function pickModelById(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return MAPLIBRE_GLB_VARIANTS[hash % MAPLIBRE_GLB_VARIANTS.length];
}

type Props = {
  coordinates: Position[];
  navCoordinate: [number, number] | null;
  navHeading: number;
  navMode: "car" | "bike" | "walk";
  mapLibreCar3D: boolean;
  trafficCars: TrafficSample[];
  ambientTraffic: Array<{
    id: string;
    lng: number;
    lat: number;
    bearing: number;
    direction: "forward" | "backward";
  }>;
  mapZoom: number;
};

export function RouteMarkers({
  coordinates,
  navCoordinate,
  navHeading,
  navMode,
  mapLibreCar3D,
  trafficCars,
  ambientTraffic,
  mapZoom,
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

  if (!coordinates.length && !ambientTraffic.length) return null;

  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];
  const zoomScale = Math.min(1.8, Math.max(0.75, 0.75 + (mapZoom - 12) * 0.18));

  return (
    <>
      {start && end ? (
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
        </>
      ) : null}

      {navCoordinate ? (
        <Marker longitude={navCoordinate[0]} latitude={navCoordinate[1]} anchor="center">
          <div
            className="flex h-10 w-10 items-center justify-center"
            style={{ transform: `rotate(${navHeading}deg) scale(${zoomScale})` }}
          >
            {mapLibreCar3D && navMode === "car" ? (
              modelViewerReady ? (
                <model-viewer
                  src={MAPLIBRE_GLB_VARIANTS[0]}
                  disable-zoom
                  disable-pan
                  camera-controls={false}
                  style={{
                    width: "30px",
                    height: "30px",
                    pointerEvents: "none",
                    filter: "grayscale(100%) contrast(0.85)",
                  }}
                />
              ) : (
                <div className="relative h-7 w-4 rounded-md border border-white/80 bg-slate-900 shadow-[0_5px_10px_rgba(15,23,42,0.42)]">
                  <div className="absolute top-0.5 left-0.5 right-0.5 h-2 rounded-sm bg-sky-300/85" />
                  <div className="absolute bottom-0.5 left-1/2 h-2 w-1.5 -translate-x-1/2 rounded-sm bg-slate-700" />
                  <div className="absolute -top-0.5 left-1/2 h-1.5 w-2 -translate-x-1/2 rounded-full bg-cyan-300" />
                  <div className="absolute -bottom-0.5 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-rose-500" />
                </div>
              )
            ) : navMode === "car" ? (
              <div className="relative h-7 w-4 rounded-md border border-white/80 bg-blue-700 shadow-[0_5px_10px_rgba(37,99,235,0.35)]">
                <div className="absolute top-0.5 left-0.5 right-0.5 h-2 rounded-sm bg-blue-200/90" />
                <div className="absolute -top-0.5 left-1/2 h-1.5 w-2 -translate-x-1/2 rounded-full bg-cyan-300" />
                <div className="absolute -bottom-0.5 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-rose-400" />
              </div>
            ) : navMode === "bike" ? (
              <Bike className="h-4 w-4" />
            ) : (
              <Footprints className="h-4 w-4" />
            )}
          </div>
        </Marker>
      ) : null}

      {coordinates.length
        ? trafficCars.map((car) => (
        <Marker key={car.id} longitude={car.lng} latitude={car.lat} anchor="center">
          <div
            className="relative flex h-8 w-8 items-center justify-center"
            style={{ transform: `rotate(${car.bearing}deg) scale(${zoomScale * 0.9})` }}
          >
            {modelViewerReady ? (
              <model-viewer
                src={pickModelById(car.id)}
                disable-zoom
                disable-pan
                camera-controls={false}
                style={{
                  width: "24px",
                  height: "24px",
                  pointerEvents: "none",
                  filter:
                    car.vehicleType === "bike"
                      ? "grayscale(100%) brightness(0.92)"
                      : "grayscale(100%) contrast(0.85)",
                }}
              />
            ) : (
              <div className="relative h-6 w-3.5 rounded-md border border-white/70 bg-slate-900 shadow-[0_4px_8px_rgba(15,23,42,0.35)]">
                <div
                  className={`absolute top-0.5 left-0.5 right-0.5 h-1.5 rounded-sm ${
                    car.direction === "forward" ? "bg-sky-300" : "bg-amber-300"
                  }`}
                />
                <div
                  className={`absolute -top-0.5 left-1/2 h-1 w-1.5 -translate-x-1/2 rounded-full ${
                    car.direction === "forward" ? "bg-cyan-300" : "bg-orange-200"
                  }`}
                />
                <div
                  className={`absolute -bottom-0.5 left-1/2 h-1 w-1.5 -translate-x-1/2 rounded-full ${
                    car.direction === "forward" ? "bg-rose-400" : "bg-emerald-300"
                  }`}
                />
              </div>
            )}
          </div>
        </Marker>
          ))
        : null}

      {ambientTraffic.map((vehicle) => (
        <Marker
          key={vehicle.id}
          longitude={vehicle.lng}
          latitude={vehicle.lat}
          anchor="center"
        >
          <div
            className="relative flex h-7 w-7 items-center justify-center opacity-90"
            style={{ transform: `rotate(${vehicle.bearing}deg) scale(${zoomScale * 0.8})` }}
          >
            {modelViewerReady ? (
              <model-viewer
                src={pickModelById(vehicle.id)}
                disable-zoom
                disable-pan
                camera-controls={false}
                style={{
                  width: "20px",
                  height: "20px",
                  pointerEvents: "none",
                  filter: "grayscale(100%) contrast(0.85)",
                }}
              />
            ) : (
              <div className="relative h-5 w-3 rounded-[6px] border border-white/60 bg-slate-800/95 shadow-[0_3px_7px_rgba(15,23,42,0.35)]">
                <div
                  className={`absolute top-0.5 left-0.5 right-0.5 h-1 rounded-sm ${
                    vehicle.direction === "forward" ? "bg-sky-300" : "bg-amber-300"
                  }`}
                />
                <div className="absolute -bottom-0.5 left-1/2 h-1 w-1.5 -translate-x-1/2 rounded-full bg-rose-400" />
              </div>
            )}
          </div>
        </Marker>
      ))}
    </>
  );
}
