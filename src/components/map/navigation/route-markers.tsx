import { Bike, Car, Footprints } from "lucide-react";
import type { Position } from "geojson";
import { Marker } from "react-map-gl/maplibre";

type TrafficSample = {
  id: string;
  lng: number;
  lat: number;
  bearing: number;
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
              <div className="relative h-5 w-5">
                <div className="absolute inset-x-0 bottom-0 h-3 rounded-[3px] bg-blue-100 shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                <div className="absolute inset-x-1 top-0 h-2 rounded-[2px] bg-white/90" />
                <div className="absolute bottom-0.5 left-0.5 h-1.5 w-1.5 rounded-full bg-slate-900" />
                <div className="absolute right-0.5 bottom-0.5 h-1.5 w-1.5 rounded-full bg-slate-900" />
              </div>
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
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-white/70 bg-slate-800/85 text-[10px] text-white shadow-lg"
            style={{ transform: `rotate(${car.bearing}deg)` }}
          >
            <div
              className={`h-4 w-4 rounded-[4px] ${
                Number(car.id.split("-").pop()) % 2 === 0
                  ? "bg-sky-300"
                  : "bg-rose-300"
              }`}
            />
          </div>
        </Marker>
      ))}
    </>
  );
}
