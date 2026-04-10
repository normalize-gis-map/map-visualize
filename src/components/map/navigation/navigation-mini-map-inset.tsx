import type { FeatureCollection, LineString } from "geojson";
import Map, { Layer, Source } from "react-map-gl/maplibre";

import { MAP_STYLE_2D } from "@/lib/constants/map.constants";

type Props = {
  visible: boolean;
  routeGeometry: LineString | null;
  fromCenter: [number, number] | null;
  navCoordinate: [number, number] | null;
  mapZoom: number;
};

export function NavigationMiniMapInset({
  visible,
  routeGeometry,
  fromCenter,
  navCoordinate,
  mapZoom,
}: Props) {
  if (!visible || !routeGeometry) return null;

  const miniRouteCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: routeGeometry,
        properties: {},
      },
    ],
  };

  const miniNavCollection: FeatureCollection | null = navCoordinate
    ? {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: navCoordinate,
            },
            properties: {},
          },
        ],
      }
    : null;

  return (
    <div className="absolute right-3 bottom-3 z-30 hidden h-36 w-28 overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-2xl backdrop-blur md:block">
      <Map
        initialViewState={{
          longitude: fromCenter?.[0] ?? 106.73,
          latitude: fromCenter?.[1] ?? 10.82,
          zoom: 13,
          pitch: 0,
          bearing: 0,
        }}
        mapStyle={MAP_STYLE_2D}
        interactive={false}
        dragPan={false}
        doubleClickZoom={false}
        scrollZoom={false}
        touchZoomRotate={false}
        longitude={navCoordinate?.[0] ?? fromCenter?.[0] ?? 106.73}
        latitude={navCoordinate?.[1] ?? fromCenter?.[1] ?? 10.82}
        zoom={navCoordinate ? Math.max(12.5, mapZoom - 1.6) : 13}
        pitch={0}
        bearing={0}
        style={{ width: "100%", height: "100%" }}
      >
        <Source id="mini-route" type="geojson" data={miniRouteCollection}>
          <Layer
            id="mini-route-line"
            type="line"
            paint={{
              "line-color": "#2563eb",
              "line-width": 3.2,
              "line-opacity": 0.9,
            }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />
        </Source>
        {miniNavCollection ? (
          <Source id="mini-nav" type="geojson" data={miniNavCollection}>
            <Layer
              id="mini-nav-dot"
              type="circle"
              paint={{
                "circle-radius": 4.8,
                "circle-color": "#f43f5e",
                "circle-stroke-width": 1.4,
                "circle-stroke-color": "#ffffff",
              }}
            />
          </Source>
        ) : null}
      </Map>
    </div>
  );
}
