import test from "node:test";
import assert from "node:assert/strict";
import { fromLonLat, toLonLat } from "ol/proj";
import proj4 from "proj4";
import { alignTwoPoints, displaySize, fitToExtent, guessCrs, mapToPx, parseWorldFile, placementFromWorldFile, pxToMap, readImageDims, unitsPerPx, PHOTO_LIMITS } from "../src/lib/photo";
import { scaleBar } from "../src/map/MapView";
import { creditLines } from "../src/lib/exportDrawing";
import type { GardenFile, PhotoPlacement } from "../src/types/garden";

const base: PhotoPlacement = { id: "p", name: "drone.jpg", widthPx: 8000, heightPx: 6000, center: [127.11, 37.4], mPerPx: 0.03, rotationDeg: 12, opacity: 1, visible: true, source: "manual" };
const close = (a: number, b: number, eps: number, msg = "") => assert(Math.abs(a - b) < eps, `${msg} ${a} vs ${b}`);

test("PNG/JPEG header dimensions without decoding", () => {
  const png = new Uint8Array(32); png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  new DataView(png.buffer).setUint32(16, 8000); new DataView(png.buffer).setUint32(20, 6000);
  assert.deepEqual(readImageDims(png), { width: 8000, height: 6000 });
  // SOI, APP0(len 16), SOF0 h=6000 w=8000
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, ...new Array(14).fill(0), 0xff, 0xc0, 0, 17, 8, 0x17, 0x70, 0x1f, 0x40, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(readImageDims(jpg), { width: 8000, height: 6000 });
  assert.equal(readImageDims(new Uint8Array([1, 2, 3])), null);
});

test("display downscale respects pixel cap and aspect", () => {
  const d = displaySize({ width: 8000, height: 8000 });
  assert(d.width * d.height <= PHOTO_LIMITS.maxDisplayPixels);
  assert.equal(d.width, d.height);
  assert.deepEqual(displaySize({ width: 4000, height: 3000 }), { width: 4000, height: 3000 });
});

test("pxToMap / mapToPx round trip and ground scale", () => {
  for (const uv of [[0, 0], [8000, 6000], [1234, 4321]] as [number, number][]) {
    const back = mapToPx(base, pxToMap(base, uv));
    close(back[0], uv[0], 1e-6); close(back[1], uv[1], 1e-6);
  }
  // 1000 px along the image x-axis = 30 m on the ground (geodesic check via 3857 scale)
  const a = pxToMap(base, [4000, 3000]), b = pxToMap(base, [5000, 3000]);
  const ground = Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.cos(37.4 * Math.PI / 180);
  close(ground, 30, 0.01, "ground m");
  close(unitsPerPx(base), 0.03 / Math.cos(37.4 * Math.PI / 180), 1e-12);
});

test("2-point alignment recovers a known placement (scale, rotation, center)", () => {
  const truth: PhotoPlacement = { ...base, center: [127.1123, 37.4011], mPerPx: 0.025, rotationDeg: -33 };
  const img: [[number, number], [number, number]] = [[500, 700], [7400, 5200]];
  const map = img.map((u) => pxToMap(truth, u)) as [[number, number], [number, number]];
  const got = alignTwoPoints(base, img, map);
  close(got.mPerPx, 0.025, 1e-6, "mPerPx"); close(got.rotationDeg, -33, 1e-3, "rot");
  close(got.center[0], 127.1123, 1e-9); close(got.center[1], 37.4011, 1e-9);
  assert.equal(got.source, "2point");
  assert.throws(() => alignTwoPoints(base, [[1, 1], [1, 1]], map));
});

test("fit to view centers image inside extent", () => {
  const c = fromLonLat([127.11, 37.4]);
  const ext: [number, number, number, number] = [c[0] - 100, c[1] - 50, c[0] + 100, c[1] + 50];
  const p = fitToExtent(base, ext);
  close(p.center[0], 127.11, 1e-9); assert.equal(p.rotationDeg, 0);
  const tl = pxToMap(p, [0, 0]), br = pxToMap(p, [8000, 6000]);
  assert(tl[0] >= ext[0] && br[0] <= ext[2] && br[1] >= ext[1] && tl[1] <= ext[3]);
});

test("world file: WGS84 and Korean central TM (EPSG:5186) georeference", () => {
  const wf = parseWorldFile("0.000001\n0\n0\n-0.000001\n127.1\n37.41\n");
  assert.equal(guessCrs(wf), "EPSG:4326");
  const p = placementFromWorldFile({ ...base, widthPx: 1000, heightPx: 800 }, wf, "EPSG:4326");
  const tl = toLonLat(pxToMap(p, [0.5, 0.5]));
  close(tl[0], 127.1, 1e-7); close(tl[1], 37.41, 1e-7);
  close(p.rotationDeg, 0, 0.01);
  const br = toLonLat(pxToMap(p, [999.5, 799.5]));
  close(br[0], 127.1 + 999e-6, 1e-7); close(br[1], 37.41 - 799e-6, 1e-7);
  assert(p.aspectY && Math.abs(p.aspectY - 1 / Math.cos(37.41 * Math.PI / 180)) < 0.01);
  const back = mapToPx(p, pxToMap(p, [10, 20])); close(back[1], 20, 1e-6);
  // 5186: 0.1 m pixels, origin near 127.1E 37.4N
  const [x, y] = proj4("EPSG:4326", "EPSG:5186", [127.1, 37.4]);
  const tm = parseWorldFile(`0.1\n0\n0\n-0.1\n${x}\n${y}`);
  assert.equal(guessCrs(tm), "EPSG:5186");
  const q = placementFromWorldFile({ ...base, widthPx: 2000, heightPx: 2000 }, tm, "EPSG:5186");
  close(q.mPerPx, 0.1, 0.002, "TM m/px");
  const o = toLonLat(pxToMap(q, [0.5, 0.5]));
  close(o[0], 127.1, 2e-6); close(o[1], 37.4, 2e-6);
  assert.throws(() => parseWorldFile("1 2 3"));
});

test("scale bar reads 0.5 m / 1 m at high zoom", () => {
  assert.equal(scaleBar(0.004).label, "0.5 m");
  assert.equal(scaleBar(0.008).label, "1 m");
  assert.equal(scaleBar(0.3).label, "20 m");
});

test("export credit names user photo", () => {
  const f = { schemaVersion: 1, meta: { name: "a", createdAt: "", updatedAt: "", northDeg: 0 }, place: { center: { lon: 0, lat: 0 }, zoom: 1, bbox: { west: 0, east: 0, north: 0, south: 0 }, basemap: { provider: "vworld-satellite", attribution: "" } }, features: [], photo: base } satisfies GardenFile;
  const l = creditLines(f, false)[1];
  assert(l.includes("사용자 제공 (drone.jpg)") && l.includes("브이월드(국토교통부)"));
});
