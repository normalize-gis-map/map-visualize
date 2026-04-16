import type maplibregl from "maplibre-gl";
import { useEffect } from "react";

import { AMBIENT_TRAFFIC_ROUTE_SCAN, MAP_DETAIL_ZOOM } from "@/features/map/constants/map-detail.constants";
import type { AmbientTrafficRoute } from "@/features/map/hooks/use-ambient-traffic";

type Params = {
  mapInstance: maplibregl.Map | null;
  trafficVisualizationEnabled: boolean;
  trafficDensity: "off" | "light" | "full";
  detailPreset: "balanced" | "high";
  setAmbientNetworkRoutes: React.Dispatch<React.SetStateAction<AmbientTrafficRoute[]>>;
  roadRefreshTickRef: React.MutableRefObject<number>;
  estimateRouteLengthMeters: (coordinates: [number, number][]) => number;
  classifyRoadClass: (className: string) => "major" | "medium" | "local";
};

export function useMaplibreRoadNetwork({
  mapInstance,
  trafficVisualizationEnabled,
  trafficDensity,
  detailPreset,
  setAmbientNetworkRoutes,
  roadRefreshTickRef,
  estimateRouteLengthMeters,
  classifyRoadClass,
}: Params) {
  useEffect(() => {
    if (!mapInstance || !trafficVisualizationEnabled || trafficDensity === "off") return;

    const refreshRoadNetwork = () => {
      const now = performance.now();
      if (now - roadRefreshTickRef.current < AMBIENT_TRAFFIC_ROUTE_SCAN.throttleMs) return;
      roadRefreshTickRef.current = now;

      if (mapInstance.getZoom() < MAP_DETAIL_ZOOM.LOW) {
        setAmbientNetworkRoutes((prev) => (prev.length ? [] : prev));
        return;
      }

      const style = mapInstance.getStyle();
      const currentZoom = mapInstance.getZoom();
      const roadLayerIds =
        style.layers
          ?.filter((layer) => layer.type === "line" && layer.id.toLowerCase().includes("road"))
          .map((layer) => layer.id) ?? [];

      if (!roadLayerIds.length) return;

      const features = mapInstance.queryRenderedFeatures(undefined, {
        layers: roadLayerIds.slice(0, AMBIENT_TRAFFIC_ROUTE_SCAN.layers),
      });

      const serviceSelectionMod = currentZoom >= MAP_DETAIL_ZOOM.CLOSE ? 3 : 5;
      const maxCollected =
        currentZoom >= MAP_DETAIL_ZOOM.CLOSE
          ? detailPreset === "high"
            ? 120
            : 96
          : currentZoom >= MAP_DETAIL_ZOOM.MID
            ? detailPreset === "high"
              ? 84
              : 64
            : 36;
      const minLengthMeters =
        currentZoom >= MAP_DETAIL_ZOOM.CLOSE
          ? 90
          : currentZoom >= MAP_DETAIL_ZOOM.MID
            ? 130
            : 190;

      const classifyByFeature = (className: string, layerId: string) => {
        const lowerClass = className.toLowerCase();
        const lowerLayer = layerId.toLowerCase();
        const majorByClass =
          lowerClass.includes("motorway") ||
          lowerClass.includes("trunk") ||
          lowerClass.includes("primary") ||
          lowerClass.includes("motorway_link");
        const majorByLayer =
          lowerLayer.includes("bridge_motorway") ||
          lowerLayer.includes("bridge_trunk_primary") ||
          lowerLayer.includes("tunnel_motorway") ||
          lowerLayer.includes("tunnel_trunk_primary");
        if (majorByClass || majorByLayer) return "major" as const;
        if (lowerClass.includes("secondary") || lowerClass.includes("tertiary")) {
          return "medium" as const;
        }
        return classifyRoadClass(lowerClass);
      };

      const collected = features
        .flatMap((feature) => {
          const geometry = feature.geometry;
          const className = String(
            (feature.properties?.class as string | undefined) ??
              (feature.properties?.type as string | undefined) ??
              "",
          ).toLowerCase();
          const layerId = feature.layer?.id?.toLowerCase() ?? "";

          const isMotorway = className.includes("motorway");
          const isTrunk = className.includes("trunk");
          const isPrimary = className.includes("primary");
          const isMotorwayLink = className.includes("motorway_link");
          const isBridgeOrTunnelMajor =
            layerId.includes("bridge_motorway") ||
            layerId.includes("bridge_trunk_primary") ||
            layerId.includes("tunnel_motorway") ||
            layerId.includes("tunnel_trunk_primary");
          const isSecondary = className.includes("secondary");
          const isTertiary = className.includes("tertiary");
          const isResidential = className.includes("residential");
          const isService = className.includes("service");

          const isEligible =
            isMotorway ||
            isTrunk ||
            isPrimary ||
            isMotorwayLink ||
            isBridgeOrTunnelMajor ||
            isSecondary ||
            isTertiary ||
            isResidential ||
            isService;
          if (!isEligible || !geometry) return [];

          if (geometry.type === "LineString") {
            const lengthMeters = estimateRouteLengthMeters(geometry.coordinates as [number, number][]);
            if (lengthMeters < minLengthMeters) return [];

            if (isService) {
              const keep =
                Math.floor((geometry.coordinates[0]?.[0] ?? 0) * 10000) % serviceSelectionMod === 0;
              if (!keep) return [];
            }

            return [
              {
                coordinates: geometry.coordinates,
                roadClass: classifyByFeature(className, layerId),
                lengthMeters,
              } satisfies AmbientTrafficRoute,
            ];
          }

          if (geometry.type === "MultiLineString") {
            return geometry.coordinates.map((coordinates) => {
              const lengthMeters = estimateRouteLengthMeters(coordinates as [number, number][]);
                return {
                  coordinates,
                  roadClass: classifyByFeature(className, layerId),
                  lengthMeters,
                } satisfies AmbientTrafficRoute;
              });
          }

          return [];
        })
        .filter((route) => route.coordinates.length > 3 && (route.lengthMeters ?? 0) >= minLengthMeters)
        .map((route) => {
          const classScore = route.roadClass === "major" ? 1.62 : route.roadClass === "medium" ? 1.02 : 0.8;
          const zoomScore = currentZoom >= MAP_DETAIL_ZOOM.CLOSE ? 1.08 : 0.94;
          const lengthScore = Math.min(1.4, Math.max(0.35, (route.lengthMeters ?? 0) / 520));
          return {
            route,
            score: classScore * lengthScore * zoomScore,
          };
        })
        .sort((a, b) => b.score - a.score);

      const majorTarget = Math.max(1, Math.round(maxCollected * 0.45));
      const mediumTarget = Math.max(1, Math.round(maxCollected * 0.35));
      const localTarget = Math.max(1, maxCollected - majorTarget - mediumTarget);
      const majorEntries = collected.filter((entry) => entry.route.roadClass === "major");
      const mediumEntries = collected.filter((entry) => entry.route.roadClass === "medium");
      const localEntries = collected.filter((entry) => entry.route.roadClass === "local");

      const selected = [
        ...majorEntries.slice(0, majorTarget),
        ...mediumEntries.slice(0, mediumTarget),
        ...localEntries.slice(0, localTarget),
      ];
      const selectedIds = new Set(selected.map((entry) => `${entry.route.coordinates[0]?.[0]}:${entry.route.coordinates[0]?.[1]}`));
      const fallback = collected.filter(
        (entry) => !selectedIds.has(`${entry.route.coordinates[0]?.[0]}:${entry.route.coordinates[0]?.[1]}`),
      );
      const finalRoutes = [...selected, ...fallback]
        .slice(0, maxCollected)
        .map((entry) => entry.route);

      setAmbientNetworkRoutes(finalRoutes);
    };

    refreshRoadNetwork();
    mapInstance.on("moveend", refreshRoadNetwork);
    mapInstance.on("style.load", refreshRoadNetwork);

    return () => {
      mapInstance.off("moveend", refreshRoadNetwork);
      mapInstance.off("style.load", refreshRoadNetwork);
    };
  }, [
    classifyRoadClass,
    detailPreset,
    estimateRouteLengthMeters,
    mapInstance,
    roadRefreshTickRef,
    setAmbientNetworkRoutes,
    trafficDensity,
    trafficVisualizationEnabled,
  ]);
}
