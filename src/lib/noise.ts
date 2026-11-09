import { distM, bearing } from "./geo";

/** OSM(Overpass) 주변 도로·철도 → 거리 기반 소음 '추정'.
 *  dB 수치는 만들지 않음. 등급은 도로 종류 × 거리로 정한 정성 구분. 출처: © OpenStreetMap 기여자(ODbL). */
export type Road = { cls: string; label: string; name?: string; coords: number[][]; distM: number; bearing: number };
export type NoiseResult = { roads: Road[]; level: "높음" | "보통" | "낮음" | "매우 낮음"; reason: string; source: string };

const CLASS: Record<string, { label: string; w: number }> = {
  motorway: { label: "고속도로", w: 4 }, trunk: { label: "간선도로", w: 4 }, primary: { label: "주요 도로", w: 3 },
  secondary: { label: "보조 간선", w: 2 }, tertiary: { label: "일반 도로", w: 1 },
  rail: { label: "철도", w: 3 }, subway: { label: "지하철(지상구간)", w: 2 }, light_rail: { label: "경전철", w: 2 },
};
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

function nearest(c: number[], coords: number[][]): { d: number; p: number[] } {
  let best = { d: Infinity, p: coords[0] };
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i], b = coords[i + 1];
    for (let t = 0; t <= 1; t += 0.1) {
      const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const d = distM(c, p);
      if (d < best.d) best = { d, p };
    }
  }
  return best;
}

export async function fetchNoise(lon: number, lat: number, radius = 600): Promise<NoiseResult> {
  const q = `[out:json][timeout:25];(way(around:${radius},${lat},${lon})[highway~"^(motorway|trunk|primary|secondary|tertiary)$"];way(around:${radius},${lat},${lon})[railway~"^(rail|subway|light_rail)$"][tunnel!~"yes"];);out geom tags;`;
  let j: { elements: { tags?: Record<string, string>; geometry?: { lat: number; lon: number }[] }[] } | null = null;
  let lastErr = "";
  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep, { method: "POST", body: new URLSearchParams({ data: q }), signal: AbortSignal.timeout(20000) });
      if (r.ok) { j = await r.json(); break; }
      lastErr = `HTTP ${r.status}`;
    } catch (e) { lastErr = (e as Error).message; }
  }
  if (!j) throw new Error(`OSM 도로 정보를 못 가져왔어요 (${lastErr})`);
  const roads: Road[] = j.elements.filter((e) => e.geometry?.length).map((e) => {
    const cls = e.tags?.highway ?? e.tags?.railway ?? "";
    const coords = e.geometry!.map((g) => [g.lon, g.lat]);
    const n = nearest([lon, lat], coords);
    return { cls, label: CLASS[cls]?.label ?? cls, name: e.tags?.name, coords, distM: Math.round(n.d), bearing: Math.round(bearing([lon, lat], n.p)) };
  }).sort((a, b) => a.distM - b.distM);
  // 정성 등급: 가중치/거리 밴드 (추정)
  let score = 0, why = "반경 안에 큰 도로·철도 없음";
  for (const r of roads) {
    const w = CLASS[r.cls]?.w ?? 1;
    const band = r.distM < 50 ? 3 : r.distM < 150 ? 2 : r.distM < 300 ? 1 : 0.3;
    const s = w * band;
    if (s > score) { score = s; why = `${r.label}${r.name ? `(${r.name})` : ""} ${r.distM}m ${["북", "북동", "동", "남동", "남", "남서", "서", "북서"][Math.round(r.bearing / 45) % 8]}쪽`; }
  }
  const level = score >= 6 ? "높음" : score >= 3 ? "보통" : score >= 1 ? "낮음" : "매우 낮음";
  return { roads, level, reason: why, source: "© OpenStreetMap 기여자 (Overpass API) · 거리 기반 추정" };
}
