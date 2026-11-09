import Polygon from "ol/geom/Polygon";
import LineString from "ol/geom/LineString";
import type { AreaShape, GeoPolygon, Geometry, ShapeMode } from "../types/garden";
import { circle, distM } from "./geo";

export const AREA_TOOLS = ["boundary", "zone", "bed", "pond"];
export function circlePolygon(center: [number, number], radiusM: number): GeoPolygon {
  return { type: "Polygon", coordinates: [circle(center, radiusM, 96)] };
}

/** Two Chaikin passes in map coordinates; stored as an ordinary editable polygon. */
export function smoothPolygon(poly: Polygon): Polygon {
  const rings = poly.getCoordinates().map((ring) => {
    let points = ring.slice(0, -1);
    for (let pass = 0; pass < 2; pass++) {
      const next: number[][] = [];
      points.forEach((a, i) => {
        const b = points[(i + 1) % points.length];
        next.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]);
        next.push([a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
      });
      points = next;
    }
    return [...points, points[0]];
  });
  return new Polygon(rings);
}

export function finishPolygon(poly: Polygon, mode: ShapeMode, tolerance: number): Polygon {
  const simplified = mode === "freehand" ? new Polygon(poly.getCoordinates().map((ring) => {
    const line = new LineString(ring).simplify(tolerance);
    const reduced = line instanceof LineString ? line.getCoordinates() : ring;
    return reduced.length >= 4 ? reduced : ring;
  })) : poly;
  const candidate = simplified instanceof Polygon && simplified.getArea() > 0 ? simplified : poly;
  return mode === "smooth" ? smoothPolygon(candidate) : candidate;
}

/** Keep circle parameters after translation; a vertex edit deliberately detaches them. */
export function editedShape(shape: AreaShape | undefined, geometry: Geometry, operation: "translate" | "modify", delta: [number, number]): AreaShape | undefined {
  if (!shape) return undefined;
  if (operation === "modify") return { mode: "polygon" };
  if (shape.mode !== "circle" || geometry.type !== "Polygon") return shape;
  return { ...shape, center: [shape.center[0] + delta[0], shape.center[1] + delta[1]] };
}

export function drawnCircle(center: [number, number], edge: [number, number]): { geometry: GeoPolygon; shape: AreaShape } {
  const radiusM = distM(center, edge);
  return { geometry: circlePolygon(center, radiusM), shape: { mode: "circle", center, radiusM } };
}
