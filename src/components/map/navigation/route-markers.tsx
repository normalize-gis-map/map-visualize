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
  ghost = false,
}: {
  compact?: boolean;
  ghost?: boolean;
}) {
  const bodyClass = compact ? "h-[18px] w-[11px]" : "h-[24px] w-[14px]";

  return (
    <div className={`relative ${bodyClass} [transform-style:preserve-3d]`}>
      <div
        className={`absolute inset-0 rounded-[7px] border border-slate-300/90 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 shadow-[0_5px_9px_rgba(15,23,42,0.3)] ${ghost ? "opacity-70" : "opacity-100"}`}
      />
      <div
        className={`absolute top-[10%] right-[15%] left-[15%] h-[36%] rounded-[5px] border border-slate-200/85 bg-gradient-to-b from-white to-slate-100 ${ghost ? "opacity-65" : "opacity-95"}`}
      />
      <div
        className={`absolute top-[52%] right-[14%] left-[14%] h-[34%] rounded-[5px] bg-gradient-to-b from-slate-300 to-slate-400 ${ghost ? "opacity-68" : "opacity-88"}`}
      />
      <div className="absolute inset-x-[23%] -top-[4%] h-[2px] rounded-full bg-slate-100/85" />
      <div className="absolute inset-x-[25%] -bottom-[4%] h-[2px] rounded-full bg-slate-600/90" />
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
  const zoomScale = Math.min(2.6, Math.max(0.78, 0.8 + (mapZoom - 11) * 0.24));
  const simplifiedTraffic = mapZoom < 13.6;

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
            className="flex h-10 w-10 items-center justify-center transition-transform duration-220 ease-out"
            style={{
              transform: `rotate(${navHeading}deg) scale(${zoomScale})`,
            }}
          >
            {navMode === "car" ? (
              <Vehicle3D ghost={simplifiedTraffic && !mapLibreCar3D} />
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
                className="relative flex h-9 w-9 items-center justify-center transition-transform duration-150 ease-out"
                style={{
                  transform: `rotate(${car.bearing}deg) scale(${zoomScale * 0.95})`,
                }}
              >
                <Vehicle3D compact ghost={simplifiedTraffic} />
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
            className="relative flex h-8 w-8 items-center justify-center opacity-72 transition-transform duration-180 ease-out"
            style={{
              transform: `rotate(${vehicle.bearing}deg) scale(${zoomScale * 0.84})`,
            }}
          >
            <Vehicle3D compact ghost />
          </div>
        </Marker>
      ))}
    </>
  );
}
