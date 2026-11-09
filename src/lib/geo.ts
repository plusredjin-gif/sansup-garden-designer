import { getArea, getLength, getDistance } from "ol/sphere";
import Polygon from "ol/geom/Polygon";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import type OlGeometry from "ol/geom/Geometry";
import { fromLonLat, toLonLat } from "ol/proj";
import type { FeatureProps, GardenFeature, Geometry } from "../types/garden";

const R = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** 4326 GeoJSON-ish → OL geometry(3857) */
export function toOl(g: Geometry): OlGeometry {
  if (g.type === "Point") return new Point(fromLonLat(g.coordinates));
  if (g.type === "LineString") return new LineString(g.coordinates.map((c) => fromLonLat(c)));
  return new Polygon(g.coordinates.map((r) => r.map((c) => fromLonLat(c))));
}

const r6 = (c: number[]) => [Math.round(c[0] * 1e7) / 1e7, Math.round(c[1] * 1e7) / 1e7];

/** OL geometry(3857) → 4326 */
export function fromOl(g: OlGeometry): Geometry {
  if (g instanceof Point) return { type: "Point", coordinates: r6(toLonLat(g.getCoordinates())) as [number, number] };
  if (g instanceof LineString) return { type: "LineString", coordinates: g.getCoordinates().map((c) => r6(toLonLat(c))) };
  if (g instanceof Polygon) return { type: "Polygon", coordinates: g.getCoordinates().map((r) => r.map((c) => r6(toLonLat(c)))) };
  throw new Error("지원하지 않는 도형");
}

/** 측지 면적(㎡)·길이(m) — ol/sphere (turf.area 와 같은 구면 근사) */
export const areaM2 = (g: Geometry) => (g.type === "Polygon" ? Math.round(getArea(toOl(g)) * 10) / 10 : 0);
export const lengthM = (g: Geometry) => (g.type === "LineString" ? Math.round(getLength(toOl(g)) * 10) / 10 : 0);
export const distM = (a: number[], b: number[]) => getDistance(a, b);

/** 자동 측정값 갱신 */
export function measured(kind: GardenFeature["kind"], g: Geometry, p: FeatureProps): FeatureProps {
  if (g.type === "Polygon") return { ...p, areaM2: areaM2(g) };
  if (g.type === "LineString" && (kind === "path" || kind === "water-flow")) return { ...p, lengthM: lengthM(g) };
  return p;
}

/** lon/lat 에서 방위(북=0 시계) bearing, 거리 m 만큼 이동 */
export function dest([lon, lat]: number[], bearingDeg: number, m: number): [number, number] {
  const d = m / R, b = rad(bearingDeg), p1 = rad(lat), l1 = rad(lon);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [deg(l2), deg(p2)];
}

export function bearing(a: number[], b: number[]): number {
  const p1 = rad(a[1]), p2 = rad(b[1]), dl = rad(b[0] - a[0]);
  const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export function circle(c: number[], m: number, n = 48): number[][] {
  const ring = Array.from({ length: n }, (_, i) => dest(c, (360 * i) / n, m));
  return [...ring, ring[0]];
}

/** 부채꼴(섹터) 폴리곤 — from→to 시계방향 */
export function sectorPoly(c: number[], fromDeg: number, toDeg: number, m: number): number[][] {
  let span = ((toDeg - fromDeg) % 360 + 360) % 360;
  if (span === 0) span = 360;
  const steps = Math.max(4, Math.round(span / 5));
  const arc = Array.from({ length: steps + 1 }, (_, i) => dest(c, fromDeg + (span * i) / steps, m));
  return [c, ...arc, c];
}

/** 점 집합의 볼록 껍질 (그늘 폴리곤용) */
export function hull(pts: number[][]): number[][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: number[][] = [], up: number[][] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  const h = [...lo.slice(0, -1), ...up.slice(0, -1)];
  return [...h, h[0]];
}

export function centroid(g: Geometry): [number, number] {
  if (g.type === "Point") return g.coordinates;
  const pts = g.type === "Polygon" ? g.coordinates[0].slice(0, -1) : g.coordinates;
  const s = pts.reduce((a, c) => [a[0] + c[0], a[1] + c[1]], [0, 0]);
  return [s[0] / pts.length, s[1] / pts.length];
}

export const fmtM2 = (v?: number) => (v == null ? "-" : `${v.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} ㎡`);
export const fmtM = (v?: number) => (v == null ? "-" : `${v.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} m`);
export const compass8 = (d: number) => ["북", "북동", "동", "남동", "남", "남서", "서", "북서"][Math.round((((d % 360) + 360) % 360) / 45) % 8];
export const newId = () => Math.random().toString(36).slice(2, 10);
