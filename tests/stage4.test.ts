import test from "node:test";
import assert from "node:assert/strict";
import { exportFilename, creditLines } from "../src/lib/exportDrawing";
import type { GardenFile } from "../src/types/garden";
const file = (name: string, author?: string, provider: "vworld-satellite" | "mock-esri" = "vworld-satellite"): GardenFile => ({ schemaVersion: 1, meta: { name, author, createdAt: "", updatedAt: "", northDeg: 0 }, place: { center: { lon: 127, lat: 37 }, zoom: 18, bbox: { west: 0, east: 0, north: 0, south: 0 }, basemap: { provider, attribution: provider === "mock-esri" ? "목업 바탕: Esri" : "브이월드(국토교통부)" } }, features: [] });
test("filenames follow sanitizeFilename + _도면", () => {
  assert.equal(exportFilename("햇살 텃밭", "png"), "햇살 텃밭_도면.png");
  assert.equal(exportFilename("", "pdf"), "이름없는정원_도면.pdf");
  assert.equal(exportFilename("   ", "png"), "이름없는정원_도면.png");
  assert.equal(exportFilename('a/b:c*?"<>|', "pdf"), "abc_도면.pdf");
});
test("credit always names 브이월드(국토교통부), garden and author", () => {
  const [l1, l2] = creditLines(file("햇살 텃밭", "레드진"), true, new Date(2026, 10, 9));
  assert(l1.includes("햇살 텃밭") && l1.includes("레드진"));
  assert(l2.includes("브이월드(국토교통부)") && l2.includes("위성영상") && l2.includes("서버 저장 없음"));
  const [e1, e2] = creditLines(file(""), false);
  assert(e1.startsWith("이름없는정원") && !e1.includes("작성자"));
  assert(e2.includes("브이월드(국토교통부)") && e2.includes("도면만"));
  assert(creditLines(file("x", undefined, "mock-esri"), true)[1].includes("Esri"));
});
