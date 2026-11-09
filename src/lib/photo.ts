/** 사용자 배경 사진: 순수 계산(헤더 크기 읽기, 배치·정렬 수학, 월드파일). 브라우저 API 없음 → 단위 시험 가능 */
import proj4 from "proj4";
import { fromLonLat, toLonLat } from "ol/proj";
import type { PhotoPlacement, PhotoCrs } from "../types/garden";

export const PHOTO_LIMITS = {
  maxFileBytes: 80 * 1024 * 1024,     // 원본 파일 80MB
  maxDisplayPixels: 32_000_000,       // 화면용 비트맵 3200만 화소(≈5657²) 넘으면 축소
  maxZoomWithPhoto: 25,               // 사진 있을 때 최대 줌 (지상 약 0.0037 m/px @ 위도 37° → 축척 막대 0.5 m)
  maxZoomDefault: 21,
};

export type Dims = { width: number; height: number };

/** PNG IHDR / JPEG SOFn 헤더에서 크기만 읽는다 (전체 디코드 없이) */
export function readImageDims(b: Uint8Array): Dims | null {
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const len = (b[i + 2] << 8) | b[i + 3];
      if ((m >= 0xc0 && m <= 0xcf) && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
      }
      i += 2 + len;
    }
  }
  return null;
}

/** 화면용 축소 크기 (가로세로비 유지) */
export function displaySize(d: Dims, maxPixels = PHOTO_LIMITS.maxDisplayPixels): Dims {
  const px = d.width * d.height;
  if (px <= maxPixels) return d;
  const k = Math.sqrt(maxPixels / px);
  return { width: Math.max(1, Math.floor(d.width * k)), height: Math.max(1, Math.floor(d.height * k)) };
}

type XY = [number, number];
const cosLat = (lat: number) => Math.cos((lat * Math.PI) / 180);

/** 3857 단위 / 원본 사진 1px */
export function unitsPerPx(p: Pick<PhotoPlacement, "mPerPx" | "center">): number {
  return p.mPerPx / cosLat(p.center[1]);
}

/** 사진 픽셀(원본 기준, 좌상단 0,0, y 아래로) → EPSG:3857 */
export function pxToMap(p: PhotoPlacement, [u, v]: XY): XY {
  const s = unitsPerPx(p), phi = (-p.rotationDeg * Math.PI) / 180;
  const lx = (u - p.widthPx / 2) * s, ly = -(v - p.heightPx / 2) * s * (p.aspectY ?? 1);
  const c = fromLonLat(p.center);
  return [c[0] + lx * Math.cos(phi) - ly * Math.sin(phi), c[1] + lx * Math.sin(phi) + ly * Math.cos(phi)];
}

/** EPSG:3857 → 사진 픽셀 */
export function mapToPx(p: PhotoPlacement, [x, y]: XY): XY {
  const s = unitsPerPx(p), phi = (-p.rotationDeg * Math.PI) / 180;
  const c = fromLonLat(p.center), dx = x - c[0], dy = y - c[1];
  const lx = dx * Math.cos(-phi) - dy * Math.sin(-phi), ly = dx * Math.sin(-phi) + dy * Math.cos(-phi);
  return [lx / s + p.widthPx / 2, -ly / (s * (p.aspectY ?? 1)) + p.heightPx / 2];
}

/** 2점 정렬: 사진 위 두 점(px) ↔ 실제 지도 두 점(3857) → 이동·크기·회전 (닮음 변환) */
export function alignTwoPoints(p: PhotoPlacement, img: [XY, XY], map: [XY, XY]): PhotoPlacement {
  const ay = p.aspectY ?? 1;
  const la = img.map(([u, v]) => [u - p.widthPx / 2, -(v - p.heightPx / 2) * ay] as XY);
  const va: XY = [la[1][0] - la[0][0], la[1][1] - la[0][1]];
  const vb: XY = [map[1][0] - map[0][0], map[1][1] - map[0][1]];
  const na = Math.hypot(...va), nb = Math.hypot(...vb);
  if (na < 1e-9 || nb < 1e-9) throw new Error("두 점이 너무 가까워요");
  const s = nb / na, phi = Math.atan2(vb[1], vb[0]) - Math.atan2(va[1], va[0]);
  const rx = la[0][0] * Math.cos(phi) - la[0][1] * Math.sin(phi), ry = la[0][0] * Math.sin(phi) + la[0][1] * Math.cos(phi);
  const c3857: XY = [map[0][0] - s * rx, map[0][1] - s * ry];
  const ll = toLonLat(c3857) as XY;
  let rot = (-phi * 180) / Math.PI;
  rot = ((rot + 540) % 360) - 180;
  return { ...p, center: ll, mPerPx: s * cosLat(ll[1]), rotationDeg: Math.round(rot * 1000) / 1000, source: "2point" };
}

/** 현재 화면(3857 extent)에 꼭 맞게 */
export function fitToExtent(p: Omit<PhotoPlacement, "center" | "mPerPx" | "rotationDeg">, ext: [number, number, number, number]): PhotoPlacement {
  const cx = (ext[0] + ext[2]) / 2, cy = (ext[1] + ext[3]) / 2;
  const s = Math.min((ext[2] - ext[0]) / p.widthPx, (ext[3] - ext[1]) / p.heightPx) * 0.9;
  const ll = toLonLat([cx, cy]) as XY;
  return { ...p, center: ll, mPerPx: s * cosLat(ll[1]), rotationDeg: 0, source: "manual" };
}

/* ---------- 월드파일 (.jgw/.pgw/.wld) ---------- */
proj4.defs("EPSG:5186", "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs");
proj4.defs("EPSG:5185", "+proj=tmerc +lat_0=38 +lon_0=125 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs");
proj4.defs("EPSG:5187", "+proj=tmerc +lat_0=38 +lon_0=129 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs");
proj4.defs("EPSG:5179", "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs");

export const CRS_LABEL: Record<PhotoCrs, string> = {
  "EPSG:4326": "WGS84 경위도", "EPSG:3857": "웹 메르카토르", "EPSG:5186": "중부원점 TM (GRS80)",
  "EPSG:5185": "서부원점 TM", "EPSG:5187": "동부원점 TM", "EPSG:5179": "UTM-K",
};

export type WorldFile = { A: number; D: number; B: number; E: number; C: number; F: number };
export function parseWorldFile(text: string): WorldFile {
  const n = text.trim().split(/\s+/).map(Number);
  if (n.length < 6 || n.some((x) => !Number.isFinite(x))) throw new Error("월드파일 형식이 아니에요 (숫자 6줄)");
  const [A, D, B, E, C, F] = n;
  return { A, D, B, E, C, F };
}

/** 좌표 크기로 좌표계 추정 (사용자가 바꿀 수 있음) */
export function guessCrs(w: WorldFile): PhotoCrs {
  const { C: x, F: y } = w;
  if (Math.abs(x) <= 180 && Math.abs(y) <= 90) return "EPSG:4326";
  if (x > 1.2e7 && x < 1.5e7 && y > 3.5e6 && y < 5.5e6) return "EPSG:3857";
  if (x > 6e5 && x < 1.5e6 && y > 1.4e6 && y < 2.4e6) return "EPSG:5179";
  return "EPSG:5186";
}

function crsToLonLat(crs: PhotoCrs, xy: XY): XY {
  if (crs === "EPSG:4326") return xy;
  if (crs === "EPSG:3857") return toLonLat(xy) as XY;
  return proj4(crs, "EPSG:4326", xy) as XY;
}

/** 월드파일(픽셀 중심 기준) → 배치. 대각선 두 모서리로 닮음 변환 */
export function placementFromWorldFile(base: Omit<PhotoPlacement, "center" | "mPerPx" | "rotationDeg">, w: WorldFile, crs: PhotoCrs): PhotoPlacement {
  const at = (u: number, v: number): XY => [w.A * (u - 0.5) + w.B * (v - 0.5) + w.C, w.D * (u - 0.5) + w.E * (v - 0.5) + w.F];
  const m = (u: number, v: number) => fromLonLat(crsToLonLat(crs, at(u, v))) as XY;
  const W = base.widthPx, H = base.heightPx;
  const tl = m(0, 0), tr = m(W, 0), bl = m(0, H), ctr = m(W / 2, H / 2);
  const ux = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) / W;   // 3857 단위/px (가로)
  const uy = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]) / H;   // 세로
  const phi = Math.atan2(tr[1] - tl[1], tr[0] - tl[0]);
  const ll = toLonLat(ctr) as XY;
  let rot = ((-phi * 180) / Math.PI + 540) % 360 - 180;
  rot = Math.round(rot * 1000) / 1000;
  const aspectY = Math.round((uy / ux) * 1e6) / 1e6;
  return { ...base, center: ll, mPerPx: ux * cosLat(ll[1]), rotationDeg: rot, aspectY: Math.abs(aspectY - 1) < 1e-4 ? undefined : aspectY, source: "worldfile", crs };
}

/** 지상 해상도 표시용 */
export const fmtRes = (m: number) => (m >= 1 ? `${m.toFixed(2)} m/px` : `${(m * 100).toFixed(1)} cm/px`);
