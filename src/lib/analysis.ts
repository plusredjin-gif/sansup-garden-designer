import { drawingBearing, shadeFans } from "../map/permacultureLayers";
import type { AnalysisSettings, GardenFeature, GardenFile, SectorType } from "../types/garden";
import type { Overlay } from "../map/MapView";
import type { Climate } from "./weather";
import type { NoiseResult } from "./noise";
import { sunPos, daySun, keyDays } from "./sun";
import { dest, circle, sectorPoly, centroid, newId, compass8, areaM2 } from "./geo";

export type Slope = { center: number; slopePct: number; downhillDeg: number; profile: { d: number; z: number }[]; spacingM: number };

/** 분석 기준점: 집 > 경계 중심 > 지도 위치 */
export function analysisCenter(file: GardenFile): { pt: [number, number]; from: string } {
  const house = file.features.find((f) => f.kind === "house");
  if (house) return { pt: centroid(house.geometry), from: "집(기준점)" };
  const b = file.features.find((f) => f.kind === "boundary");
  if (b) return { pt: centroid(b.geometry), from: "경계 중심" };
  return { pt: [file.place.center.lon, file.place.center.lat], from: "지도 중심" };
}

export const defaultDate = () => new Date().toISOString().slice(0, 10);
export function analysisDate(a?: AnalysisSettings): Date {
  const [y, m, d] = (a?.date ?? defaultDate()).split("-").map(Number);
  const h = a?.hour ?? 12;
  return new Date(y, m - 1, d, Math.floor(h), Math.round((h % 1) * 60));
}

export function buildOverlays(file: GardenFile, climate: Climate | null, noise: NoiseResult | null, slope: Slope | null): Overlay[] {
  const a = file.analysis ?? {}, ov = a.overlays ?? {};
  const { pt: c } = analysisCenter(file);
  const out: Overlay[] = [];
  const when = analysisDate(a);
  const sp = sunPos(when, c[1], c[0]);
  if (ov.sun) {
    const ds = daySun(when, c[1], c[0]);
    out.push({ okind: "sunrise", geometry: { type: "LineString", coordinates: [c, dest(c, drawingBearing(ds.riseAz, file.meta.northDeg), 45)] }, label: `일출 ${Math.round(ds.riseAz)}°` });
    out.push({ okind: "sunset", geometry: { type: "LineString", coordinates: [c, dest(c, drawingBearing(ds.setAz, file.meta.northDeg), 45)] }, label: `일몰 ${Math.round(ds.setAz)}°` });
    if (sp.altitude > 0) out.push({ okind: "sun", geometry: { type: "LineString", coordinates: [dest(c, drawingBearing(sp.azimuth, file.meta.northDeg), 55), c] }, label: `해 입사 (예시) ${Math.round(sp.azimuth)}° 고도 ${Math.round(sp.altitude)}°` });
  }
  if (ov.shade) out.push(...shadeFans(file.features, drawingBearing(sp.azimuth + 180, file.meta.northDeg), sp.altitude));
  if (ov.wind && climate) {
    for (const w of climate.wind) {
      if (w.pct <= 0) continue;
      out.push({ okind: "wind", geometry: { type: "Polygon", coordinates: [sectorPoly(c, w.deg - 18, w.deg + 18, 8 + w.pct * 1.6)] }, label: w.pct >= 10 ? `${w.dir} ${w.pct}%` : undefined });
    }
  }
  if (ov.noise && noise) {
    for (const r of noise.roads) out.push({ okind: "road", geometry: { type: "LineString", coordinates: r.coords } });
    for (const m of [50, 150, 300]) out.push({ okind: "noise-ring", geometry: { type: "LineString", coordinates: circle(c, m, 72) }, label: `${m}m` });
  }
  if (ov.slope && slope) {
    out.push({ okind: "slope", geometry: { type: "LineString", coordinates: [c, dest(c, slope.downhillDeg, 60)] }, label: `내리막 ${compass8(slope.downhillDeg)} · 경사 ${slope.slopePct}% (추정)` });
    out.push({ okind: "swale", geometry: { type: "LineString", coordinates: [dest(c, slope.downhillDeg - 90, 35), dest(c, slope.downhillDeg + 90, 35)] }, label: "스웨일 후보 (등고선 방향, 추정)" });
  }
  return out;
}

/** 자동 섹터: 여름·겨울 해(일출→일몰), 계절풍(최빈 풍향), 소음(가장 영향 큰 도로 방향) */
export function autoSectors(file: GardenFile, climate: Climate | null, noise: NoiseResult | null, rangeM = 60): GardenFeature[] {
  const { pt: c } = analysisCenter(file);
  const y = new Date().getFullYear();
  const kd = keyDays(y);
  const mk = (sectorType: SectorType, label: string, fromDeg: number, toDeg: number, color: string): GardenFeature => ({
    id: newId(), kind: "sector",
    geometry: { type: "Polygon", coordinates: [sectorPoly(c, fromDeg, toDeg, rangeM)] },
    props: { sectorType, label, fromDeg: Math.round(fromDeg), toDeg: Math.round(toDeg), rangeM, auto: true, color },
  });
  const out: GardenFeature[] = [];
  const su = daySun(kd[1].d, c[1], c[0]), wi = daySun(kd[3].d, c[1], c[0]);
  out.push(mk("sun-summer", `여름 해 (하지 ${Math.round(su.riseAz)}°→${Math.round(su.setAz)}°)`, su.riseAz, su.setAz, "#ffb300"));
  out.push(mk("sun-winter", `겨울 해 (동지 ${Math.round(wi.riseAz)}°→${Math.round(wi.setAz)}°)`, wi.riseAz, wi.setAz, "#ff7043"));
  if (climate) {
    const p = climate.prevailing;
    out.push(mk("wind", `계절풍 ${p.dir} (${p.pct}%, ERA5)`, p.deg - 22.5, p.deg + 22.5, "#42a5f5"));
  }
  if (noise?.roads.length) {
    const r = noise.roads[0];
    out.push(mk("noise", `소음 ${r.label} ${r.distM}m (추정)`, r.bearing - 30, r.bearing + 30, "#e53935"));
  }
  return out;
}

/** 존 템플릿: 집에서 동심원 → 편집 가능한 폴리곤으로 변환 (큰 것부터 추가) */
export function zoneTemplate(file: GardenFile, radii: number[]): GardenFeature[] {
  const { pt: c } = analysisCenter(file);
  return radii.map((r, i) => ({ r, z: i })).filter((x) => x.r > 0).reverse().map(({ r, z }) => {
    const g = { type: "Polygon" as const, coordinates: [circle(c, r, 36)] };
    return { id: newId(), kind: "zone" as const, geometry: g, props: { zone: z as 0 | 1 | 2 | 3 | 4 | 5, name: "템플릿", areaM2: areaM2(g) } };
  });
}

/** 고도 3×3 + 내리막 단면 → 경사·방향 (Copernicus 90m DEM, 추정) */
export function slopeSamplePoints(c: number[], s = 90): number[][] {
  const grid: number[][] = [];
  for (const dy of [1, 0, -1]) for (const dx of [-1, 0, 1]) grid.push(dest(dest(c, 0, dy * s), 90, dx * s));
  return grid;
}
export function computeSlope(c: number[], z: number[], s = 90): Omit<Slope, "profile"> {
  // z 배열: 위(북)행부터 [NW,N,NE, W,C,E, SW,S,SE]
  const gx = ((z[2] + 2 * z[5] + z[8]) - (z[0] + 2 * z[3] + z[6])) / (8 * s); // 동쪽으로 증가
  const gy = ((z[0] + 2 * z[1] + z[2]) - (z[6] + 2 * z[7] + z[8])) / (8 * s); // 북쪽으로 증가
  const slopePct = Math.round(Math.hypot(gx, gy) * 1000) / 10;
  const downhillDeg = (Math.atan2(-gx, -gy) * 180 / Math.PI + 360) % 360;
  return { center: z[4], slopePct, downhillDeg: Math.round(downhillDeg), spacingM: s };
}
