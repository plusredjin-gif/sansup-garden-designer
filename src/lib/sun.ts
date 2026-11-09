import SunCalc from "suncalc";

/** suncalc(천문 공식, API 없음) 기반 일조 계산. 지형·건물 차폐는 미반영 */
const toCompass = (azRad: number) => ((azRad * 180) / Math.PI + 180 + 360) % 360; // suncalc 방위: 남=0,서+ → 북=0 시계
export const altDeg = (r: number) => (r * 180) / Math.PI;

export type SunPos = { altitude: number; azimuth: number }; // 도, 방위(북=0)
export function sunPos(date: Date, lat: number, lon: number): SunPos {
  const p = SunCalc.getPosition(date, lat, lon);
  return { altitude: altDeg(p.altitude), azimuth: toCompass(p.azimuth) };
}

export type DaySun = { date: Date; sunrise: Date; sunset: Date; noon: Date; dayLenH: number; noonAlt: number; riseAz: number; setAz: number };
export function daySun(date: Date, lat: number, lon: number): DaySun {
  const t = SunCalc.getTimes(date, lat, lon);
  return {
    date, sunrise: t.sunrise, sunset: t.sunset, noon: t.solarNoon,
    dayLenH: (t.sunset.getTime() - t.sunrise.getTime()) / 3.6e6,
    noonAlt: sunPos(t.solarNoon, lat, lon).altitude,
    riseAz: sunPos(t.sunrise, lat, lon).azimuth,
    setAz: sunPos(t.sunset, lat, lon).azimuth,
  };
}

export function keyDays(year: number) {
  return [
    { name: "춘분", d: new Date(year, 2, 20, 12) },
    { name: "하지", d: new Date(year, 5, 21, 12) },
    { name: "추분", d: new Date(year, 8, 23, 12) },
    { name: "동지", d: new Date(year, 11, 22, 12) },
  ];
}

export function monthly(year: number, lat: number, lon: number) {
  return Array.from({ length: 12 }, (_, m) => daySun(new Date(year, m, 15, 12), lat, lon));
}

export const hhmm = (d: Date) => (isNaN(d.getTime()) ? "-" : d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }));
