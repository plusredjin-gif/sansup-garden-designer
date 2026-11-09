/** Open-Meteo 과거기상(ERA5 재분석) — 키 없음, 브라우저 CORS 허용.
 *  출처: Open-Meteo.com (CC BY 4.0), 원자료 ECMWF ERA5. 관측소 실측이 아닌 재분석(격자 약 9~25km) 값. */
export type Climate = {
  years: [number, number];
  gridLat: number; gridLon: number; elevation: number;
  months: { m: number; precipMm: number; tMean: number; tMin: number; tMax: number; frostDays: number }[];
  annualPrecipMm: number;
  wind: { dir: string; deg: number; pct: number }[]; // 8방위 빈도(일 최빈 풍향)
  prevailing: { dir: string; deg: number; pct: number };
};

const DIRS = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];

export async function fetchClimate(lat: number, lon: number, years = 10): Promise<Climate> {
  const endY = new Date().getFullYear() - 1, startY = endY - years + 1;
  const u = new URL("https://archive-api.open-meteo.com/v1/archive");
  u.search = new URLSearchParams({
    latitude: lat.toFixed(4), longitude: lon.toFixed(4),
    start_date: `${startY}-01-01`, end_date: `${endY}-12-31`,
    daily: "temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_direction_10m_dominant",
    timezone: "Asia/Seoul",
  }).toString();
  const r = await fetch(u);
  if (!r.ok) throw new Error(`Open-Meteo 오류 ${r.status}`);
  const j = await r.json();
  const d = j.daily as Record<string, (number | null)[]> & { time: string[] };
  const acc = Array.from({ length: 12 }, () => ({ p: 0, t: 0, tn: 0, tx: 0, n: 0, frost: 0 }));
  const wind = new Array(8).fill(0);
  d.time.forEach((t, i) => {
    const m = Number(t.slice(5, 7)) - 1, a = acc[m];
    a.p += d.precipitation_sum[i] ?? 0; a.t += d.temperature_2m_mean[i] ?? 0;
    a.tn += d.temperature_2m_min[i] ?? 0; a.tx += d.temperature_2m_max[i] ?? 0; a.n++;
    if ((d.temperature_2m_min[i] ?? 99) < 0) a.frost++;
    const w = d.wind_direction_10m_dominant[i];
    if (w != null) wind[Math.round(w / 45) % 8]++;
  });
  const months = acc.map((a, m) => ({
    m: m + 1, precipMm: Math.round(a.p / years), tMean: +(a.t / a.n).toFixed(1),
    tMin: +(a.tn / a.n).toFixed(1), tMax: +(a.tx / a.n).toFixed(1), frostDays: Math.round(a.frost / years),
  }));
  const tot = wind.reduce((s, v) => s + v, 0) || 1;
  const w8 = wind.map((v, i) => ({ dir: DIRS[i], deg: i * 45, pct: Math.round((v / tot) * 100) }));
  return {
    years: [startY, endY], gridLat: j.latitude, gridLon: j.longitude, elevation: j.elevation,
    months, annualPrecipMm: months.reduce((s, m) => s + m.precipMm, 0),
    wind: w8, prevailing: [...w8].sort((a, b) => b.pct - a.pct)[0],
  };
}

/** Open-Meteo 고도 API (Copernicus DEM GLO-90, 약 90m 격자) */
export async function fetchElevations(pts: number[][]): Promise<number[]> {
  const u = new URL("https://api.open-meteo.com/v1/elevation");
  u.search = new URLSearchParams({
    latitude: pts.map((p) => p[1].toFixed(5)).join(","),
    longitude: pts.map((p) => p[0].toFixed(5)).join(","),
  }).toString();
  const r = await fetch(u);
  if (!r.ok) throw new Error(`고도 API 오류 ${r.status}`);
  return (await r.json()).elevation as number[];
}
