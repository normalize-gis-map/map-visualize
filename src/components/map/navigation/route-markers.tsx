import type { Position } from "geojson";
import { Bike, Footprints } from "lucide-react";
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
  ambientTraffic: Array<{
    id: string;
    lng: number;
    lat: number;
    bearing: number;
    direction: "forward" | "backward";
  }>;
  mapZoom: number;
};

function Vehicle3D({
  compact = false,
  simplified = false,
}: {
  compact?: boolean;
  simplified?: boolean;
}) {
  const sizeClass = compact ? "h-3.5 w-2.4" : "h-4.5 w-3";
  if (simplified) {
    return (
      <div
        className={`rounded-full border border-slate-300/90 bg-slate-100/95 ${compact ? "h-2.5 w-1.6" : "h-3.5 w-2"} shadow-[0_1px_2px_rgba(15,23,42,0.2)]`}
      />
    );
  }

  return (
    <div
      className={`relative ${sizeClass} [transform-style:preserve-3d]`}
      style={{ transform: "rotateX(56deg)" }}
    >
      <div
        className="absolute inset-0 rounded-[7px] bg-gradient-to-b from-slate-100 to-slate-300 shadow-[0_8px_10px_rgba(2,6,23,0.3)]"
      />
      <div
        className="absolute top-[10%] left-[14%] right-[14%] h-[40%] rounded-[5px] bg-gradient-to-b from-white to-slate-100 opacity-95"
      />
      <div
        className="absolute -right-[12%] top-[8%] bottom-[8%] w-[18%] rounded-r-[6px] bg-gradient-to-b from-slate-200 to-slate-400 opacity-90"
      />
      <div className="absolute -top-[6%] left-1/2 h-1 w-1.5 -translate-x-1/2 rounded-full bg-white/95" />
      <div className="absolute -bottom-[5%] left-1/2 h-1 w-1.5 -translate-x-1/2 rounded-full bg-slate-300/95" />
    </div>
  );
}

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
  if (!coordinates.length && !ambientTraffic.length) return null;

  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];
  const zoomScale = Math.min(1.25, Math.max(0.45, (mapZoom - 11.5) * 0.2));
  const simplifiedTraffic = mapZoom < 15;

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
        <Marker
          longitude={navCoordinate[0]}
          latitude={navCoordinate[1]}
          anchor="center"
          pitchAlignment="map"
          rotationAlignment="map"
        >
          <div
            className="flex h-10 w-10 items-center justify-center"
            style={{ transform: `rotate(${navHeading}deg) scale(${zoomScale})` }}
          >
            {navMode === "car" ? (
              <Vehicle3D simplified={simplifiedTraffic && !mapLibreCar3D} />
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
            <Marker
              key={car.id}
              longitude={car.lng}
              latitude={car.lat}
              anchor="center"
              pitchAlignment="map"
              rotationAlignment="map"
            >
              <div
                className="relative flex h-8 w-8 items-center justify-center"
                style={{ transform: `rotate(${car.bearing}deg) scale(${zoomScale * 0.9})` }}
              >
                <Vehicle3D
                  compact
                  simplified={simplifiedTraffic}
                />
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
          pitchAlignment="map"
          rotationAlignment="map"
        >
          <div
            className="relative flex h-7 w-7 items-center justify-center opacity-90"
            style={{ transform: `rotate(${vehicle.bearing}deg) scale(${zoomScale * 0.8})` }}
          >
            <Vehicle3D compact simplified={simplifiedTraffic} />
          </div>
        </Marker>
      ))}
    </>
  );
}
