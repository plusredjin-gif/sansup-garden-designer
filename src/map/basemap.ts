import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { satelliteTileUrlTemplate } from "../lib/vworld";

export function basemapInfo(useVworld: boolean) {
  return useVworld
    ? { provider: "vworld-satellite" as const, attribution: "브이월드(국토교통부)" }
    : { provider: "mock-esri" as const, attribution: "목업 바탕: Esri World Imagery (Esri, Maxar, Earthstar Geographics)" };
}

export function createSatelliteLayer(useVworld: boolean): TileLayer<XYZ> {
  const info = basemapInfo(useVworld);
  const source = new XYZ({
    url: useVworld
      ? satelliteTileUrlTemplate()
      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attributions: info.attribution,
    maxZoom: 19,
    minZoom: 6,
    crossOrigin: "anonymous",
  });
  return new TileLayer({ source, properties: { id: "satellite" } });
}
