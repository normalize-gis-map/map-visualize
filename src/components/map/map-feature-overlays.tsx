import { FeaturePopup } from "@/components/map/feature-popup";
import { RouteMarkers } from "@/components/map/navigation/route-markers";
import type { SelectedFeature } from "@/features/map/hooks/use-selected-features";
import type { RouteAlternative } from "@/features/map/types/route.types";
import {
  formatLevelTone,
  formatMeters,
  formatScore,
  formatSeverityTone,
  formatStatusTone,
} from "@/utils/formatters";

type Props = {
  selectedFlood: SelectedFeature | null;
  selectedBuilding: SelectedFeature | null;
  selectedDrainage: SelectedFeature | null;
  selectedRiskZone: SelectedFeature | null;
  resetSelections: () => void;
  activeRoute: RouteAlternative | null;
  navCoordinate: [number, number] | null;
  navHeading: number;
  navMode: "car" | "bike" | "walk";
  mapLibreCar3D: boolean;
  trafficCars: Array<{
    id: string;
    lng: number;
    lat: number;
    bearing: number;
    direction: "forward" | "backward";
    vehicleType: "car" | "bike";
  }>;
  ambientTraffic: Array<{
    id: string;
    lng: number;
    lat: number;
    bearing: number;
    direction: "forward" | "backward";
  }>;
};

export function MapFeatureOverlays({
  selectedFlood,
  selectedBuilding,
  selectedDrainage,
  selectedRiskZone,
  resetSelections,
  activeRoute,
  navCoordinate,
  navHeading,
  navMode,
  mapLibreCar3D,
  trafficCars,
  ambientTraffic,
}: Props) {
  return (
    <>
      {selectedFlood && (
        <FeaturePopup
          longitude={selectedFlood.lngLat.lng}
          latitude={selectedFlood.lngLat.lat}
          title={selectedFlood.properties.areaName}
          subtitle={selectedFlood.properties.district}
          variant="flood"
          onClose={resetSelections}
          anchor={selectedFlood.anchor}
          fields={[
            {
              label: "Depth",
              value: formatMeters(selectedFlood.properties.depth),
              tone: "info",
            },
            {
              label: "Severity",
              value: selectedFlood.properties.severity,
              tone: formatSeverityTone(selectedFlood.properties.severity),
            },
            {
              label: "Risk score",
              value: formatScore(selectedFlood.properties.riskScore),
            },
          ]}
        />
      )}

      {selectedBuilding && (
        <FeaturePopup
          longitude={selectedBuilding.lngLat.lng}
          latitude={selectedBuilding.lngLat.lat}
          title="Building"
          subtitle="3D extrusion"
          variant="building"
          onClose={resetSelections}
          anchor={selectedBuilding.anchor}
          fields={[
            {
              label: "Height",
              value: formatMeters(selectedBuilding.properties.render_height),
              tone: "info",
            },
            {
              label: "Base",
              value: formatMeters(selectedBuilding.properties.render_min_height),
            },
          ]}
        />
      )}

      {selectedDrainage && (
        <FeaturePopup
          longitude={selectedDrainage.lngLat.lng}
          latitude={selectedDrainage.lngLat.lat}
          title="Drainage"
          subtitle="Water channel"
          variant="drainage"
          onClose={resetSelections}
          anchor={selectedDrainage.anchor}
          fields={[
            {
              label: "Status",
              value: selectedDrainage.properties.status,
              tone: formatStatusTone(selectedDrainage.properties.status),
            },
          ]}
        />
      )}

      {selectedRiskZone && (
        <FeaturePopup
          longitude={selectedRiskZone.lngLat.lng}
          latitude={selectedRiskZone.lngLat.lat}
          title={selectedRiskZone.properties.label}
          subtitle="Flood risk"
          variant="risk"
          onClose={resetSelections}
          anchor={selectedRiskZone.anchor}
          fields={[
            {
              label: "Level",
              value: selectedRiskZone.properties.level,
              tone: formatLevelTone(selectedRiskZone.properties.level),
            },
          ]}
        />
      )}

      {activeRoute ? (
        <RouteMarkers
          coordinates={activeRoute.geometry.coordinates}
          navCoordinate={navCoordinate}
          navHeading={navHeading}
          navMode={navMode}
          mapLibreCar3D={mapLibreCar3D}
          trafficCars={trafficCars}
          ambientTraffic={ambientTraffic}
        />
      ) : null}
    </>
  );
}
