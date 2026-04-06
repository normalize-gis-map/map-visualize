import floodSample from "@/data/geojson/flood-sample.json";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";

export async function getFloodGeoJson(): Promise<FloodGeoJson> {
  return floodSample as FloodGeoJson;
}
