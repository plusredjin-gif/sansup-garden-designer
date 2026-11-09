import type { GardenFile } from "../types/garden";
import { hasKey } from "./vworld";
import { basemapInfo } from "../map/basemap";

export function emptyGarden(meta: Partial<GardenFile["meta"]> = {}): GardenFile {
  const now = new Date().toISOString();
  const info = basemapInfo(hasKey());
  return {
    schemaVersion: 1,
    meta: { name: "", createdAt: now, updatedAt: now, northDeg: 0, ...meta },
    place: {
      center: { lon: 127.5, lat: 36.2 },
      bbox: { west: 0, south: 0, east: 0, north: 0 },
      zoom: 7,
      basemap: { provider: info.provider, attribution: info.attribution },
    },
    features: [],
    ui: { activeLayerIds: ["satellite"] },
  };
}

export function hasBbox(f: GardenFile): boolean {
  const b = f.place.bbox;
  return b.east !== b.west && b.north !== b.south;
}
