import type { GardenFeature } from "../types/garden";
import type { Overlay } from "./MapView";
import { sectorPoly } from "../lib/geo";

/** North correction is clockwise true bearing of drawing-up; OL bearings remain map-up. */
export function drawingBearing(trueBearing: number, northDeg: number): number {
  return ((trueBearing - northDeg) % 360 + 360) % 360;
}

/** Illustrative fan only: no terrain, building, crown-density or seasonal model. */
export function shadeFans(features: GardenFeature[], direction: number, altitude: number): Overlay[] {
  if (altitude <= 1) return [];
  return features.flatMap((tree): Overlay[] => {
    if (tree.kind !== "tree" || tree.geometry.type !== "Point" || !tree.props.heightM || tree.props.canopyM == null) return [];
    const reach = Math.min(200, tree.props.heightM / Math.tan(altitude * Math.PI / 180) + tree.props.canopyM);
    return [{ okind: "shade", label: "그늘 예시 · 정밀 시뮬레이션 아님", geometry: { type: "Polygon", coordinates: [sectorPoly(tree.geometry.coordinates, direction - 20, direction + 20, reach)] } }];
  });
}
