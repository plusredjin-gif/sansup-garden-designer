import type { FeatureLike } from "ol/Feature";
import { Style, Stroke, Fill, Circle as CircleStyle, Text, RegularShape } from "ol/style";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import { getPointResolution } from "ol/proj";
import type { FeatureKind, FeatureProps, MicroType, ToolId } from "../types/garden";
import { fmtM, fmtM2 } from "../lib/geo";

export const KIND_LABEL: Record<FeatureKind, string> = {
  boundary: "경계", zone: "구역", bed: "텃밭", pond: "연못", tree: "나무", path: "길",
  house: "집(기준점)", micro: "미기후", plant: "식물", sector: "섹터", "water-flow": "물흐름", wind: "바람", sun: "해",
};

export const ZONE_COLORS = ["#e53935", "#fb8c00", "#fdd835", "#7cb342", "#00897b", "#5e35b1"];
export const DEFAULT_COLOR: Partial<Record<FeatureKind, string>> = {
  boundary: "#ffeb3b", bed: "#a1662f", pond: "#1e88e5", tree: "#2e7d32", path: "#d7b98e", house: "#c62828", plant: "#66bb6a", sector: "#ff7043", "water-flow": "#29b6f6",
};
export const MICRO: Record<MicroType, { label: string; icon: string; color: string }> = {
  sunny: { label: "양지", icon: "☀", color: "#ffb300" },
  shade: { label: "그늘", icon: "◐", color: "#546e7a" },
  frost: { label: "서리·냉기 고임", icon: "❄", color: "#4fc3f7" },
  windy: { label: "바람 강함", icon: "≋", color: "#90a4ae" },
  wet: { label: "습함", icon: "≈", color: "#0288d1" },
  dry: { label: "건조", icon: "▲", color: "#bf8f3e" },
};

export const DRAW_TYPE: Partial<Record<ToolId, "Polygon" | "LineString" | "Point">> = {
  boundary: "Polygon", zone: "Polygon", bed: "Polygon", pond: "Polygon", path: "LineString", "water-flow": "LineString",
  tree: "Point", house: "Point", micro: "Point", guild: "Point",
};

export const colorOf = (kind: FeatureKind, p: FeatureProps) =>
  p.color || (kind === "zone" ? ZONE_COLORS[p.zone ?? 1] : DEFAULT_COLOR[kind] ?? "#ff7043");

const hexA = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const label = (text: string, opts: Record<string, unknown> = {}) =>
  new Text({
    text, font: "600 12px Pretendard, 'Noto Sans KR', sans-serif", fill: new Fill({ color: "#fff" }),
    stroke: new Stroke({ color: "rgba(0,0,0,.75)", width: 3 }), overflow: true, ...opts,
  });

function mToPx(m: number, resolution: number, coord: number[]) {
  return m / getPointResolution("EPSG:3857", resolution, coord);
}

export function featureStyle(f: FeatureLike, resolution: number, selected: boolean): Style[] {
  const kind = f.get("kind") as FeatureKind;
  const p = (f.get("props") ?? {}) as FeatureProps;
  const geom = f.getGeometry();
  const c = colorOf(kind, p);

  if (kind === "tree" && geom instanceof Point) {
    const xy = geom.getCoordinates();
    const r = p.canopyM == null ? 5 : Math.max(4, mToPx(p.canopyM, resolution, xy));
    return [new Style({
      image: new CircleStyle({ radius: r, fill: new Fill({ color: hexA(c, 0.45) }), stroke: new Stroke({ color: selected ? "#fff" : c, width: selected ? 3 : 2 }) }),
      text: label(`${p.label || "나무"}${p.heightM ? ` ${p.heightM}m` : ""}`, { offsetY: r + 10 }), zIndex: 5,
    }), new Style({ image: new CircleStyle({ radius: 2.5, fill: new Fill({ color: "#3e2723" }) }), zIndex: 6 })];
  }
  if (kind === "plant" && geom instanceof Point) {
    return [new Style({
      image: new CircleStyle({ radius: 6, fill: new Fill({ color: hexA(c, 0.9) }), stroke: new Stroke({ color: selected ? "#fff" : "#1b5e20", width: selected ? 3 : 1.5 }) }),
      text: resolution < 0.07 ? label(p.label || p.role || "", { offsetY: 14, font: "11px sans-serif" }) : undefined, zIndex: 7,
    })];
  }
  if (kind === "house" && geom instanceof Point) {
    return [new Style({
      image: new RegularShape({ points: 4, radius: 12, angle: Math.PI / 4, fill: new Fill({ color: c }), stroke: new Stroke({ color: "#fff", width: selected ? 4 : 2 }) }),
      text: label(p.name || "집", { offsetY: 22 }), zIndex: 8,
    })];
  }
  if (kind === "micro" && geom instanceof Point) {
    const m = MICRO[p.microType ?? "sunny"];
    return [new Style({
      image: new CircleStyle({ radius: 13, fill: new Fill({ color: hexA(m.color, 0.9) }), stroke: new Stroke({ color: "#fff", width: selected ? 4 : 2 }) }),
      text: new Text({ text: m.icon, font: "15px sans-serif", fill: new Fill({ color: "#fff" }) }), zIndex: 8,
    }), new Style({ text: label(p.name || m.label, { offsetY: 24, font: "11px sans-serif" }), zIndex: 8 })];
  }
  if (geom instanceof LineString) {
    const w = kind === "path" ? Math.max(3, mToPx(p.widthM ?? 1, resolution, geom.getCoordinateAt(0.5))) : 3;
    const out: Style[] = [];
    if (selected) out.push(new Style({ stroke: new Stroke({ color: "#fff", width: w + 5 }), zIndex: 2.9 }));
    out.push(new Style({
      stroke: new Stroke({ color: hexA(c, 0.92), width: w, lineCap: "round", lineJoin: "round" }),
      text: label(`${p.name ? p.name + " " : ""}${fmtM(p.lengthM)}${p.widthM ? ` · 폭 ${p.widthM}m` : ""}`, { placement: "line" }),
      zIndex: 3,
    }));
    if (kind === "water-flow") {
      const end = geom.getLastCoordinate(), start = geom.getCoordinates().at(-2);
      if (start) out.push(new Style({ geometry: new Point(end), image: new RegularShape({ points: 3, radius: 10, rotation: Math.PI / 2 - Math.atan2(end[1] - start[1], end[0] - start[0]), fill: new Fill({ color: c }) }), zIndex: 4 }));
    }
    return out;
  }
  if (geom instanceof Polygon) {
    const isB = kind === "boundary", isS = kind === "sector";
    const fillA = isB ? 0.05 : kind === "zone" ? 0.22 : isS ? 0.18 : 0.45;
    const name = kind === "zone" ? `Zone ${p.zone ?? "?"}${p.name ? ` ${p.name}` : ""}` : isS ? p.label || p.name || "섹터" : p.name || KIND_LABEL[kind];
    const out: Style[] = [];
    if (selected) out.push(new Style({ stroke: new Stroke({ color: "#fff", width: 6 }), zIndex: 9 }));
    out.push(new Style({
      stroke: new Stroke({ color: c, width: isB ? 3 : 2, lineDash: isB ? [10, 6] : isS ? [6, 4] : undefined }),
      fill: new Fill({ color: hexA(c, fillA) }),
      text: label(isS ? name : `${name}\n${fmtM2(p.areaM2)}`),
      zIndex: isB ? 1 : kind === "zone" ? 1.5 : isS ? 0.5 : 2,
    }));
    return out;
  }
  return [new Style({ stroke: new Stroke({ color: c, width: 2 }) })];
}

export type OverlayKind = "sun" | "sunrise" | "sunset" | "shade" | "wind" | "road" | "noise-ring" | "slope" | "swale" | "measure" | "pick-img" | "pick-map";
export function overlayStyle(f: FeatureLike): Style[] {
  const k = f.get("okind") as OverlayKind, t = (f.get("label") as string | undefined) ?? "";
  const geom = f.getGeometry();
  const arrowHead = (color: string): Style[] => {
    if (!(geom instanceof LineString)) return [];
    const cs = geom.getCoordinates(), a = cs[cs.length - 2], b = cs[cs.length - 1];
    const rot = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return [new Style({ geometry: new Point(b), image: new RegularShape({ points: 3, radius: 9, rotation: Math.PI / 2 - rot, fill: new Fill({ color }) }) })];
  };
  const line = (color: string, width: number, dash?: number[]) => new Style({ stroke: new Stroke({ color, width, lineDash: dash }), text: t ? label(t, { placement: "line", offsetY: -10 }) : undefined });
  switch (k) {
    case "sun": return [line("#ffca28", 4), ...arrowHead("#ffca28")];
    case "sunrise": return [line("#ff9800", 2, [6, 5])];
    case "sunset": return [line("#ef5350", 2, [6, 5])];
    case "shade": return [new Style({ fill: new Fill({ color: "rgba(20,20,40,.42)" }), stroke: new Stroke({ color: "rgba(20,20,40,.6)", width: 1 }) })];
    case "wind": return [new Style({ fill: new Fill({ color: "rgba(144,202,249,.5)" }), stroke: new Stroke({ color: "#1565c0", width: 1.5 }), text: t ? label(t, { font: "11px sans-serif" }) : undefined })];
    case "road": return [new Style({ stroke: new Stroke({ color: "rgba(244,67,54,.85)", width: 4 }) })];
    case "noise-ring": return [line("rgba(244,67,54,.85)", 1.5, [4, 4])];
    case "slope": return [line("#29b6f6", 4), ...arrowHead("#29b6f6")];
    case "swale": return [new Style({ stroke: new Stroke({ color: "#00e5ff", width: 3, lineDash: [12, 6] }), text: t ? label(t, { placement: "line", offsetY: 12 }) : undefined })];
    case "pick-img": return [new Style({ image: new CircleStyle({ radius: 7, fill: new Fill({ color: "#e040fb" }), stroke: new Stroke({ color: "#fff", width: 2 }) }), text: label(t, { offsetY: -16 }) })];
    case "pick-map": return [new Style({ image: new RegularShape({ points: 4, radius: 9, angle: Math.PI / 4, fill: new Fill({ color: "#00e676" }), stroke: new Stroke({ color: "#000", width: 2 }) }), text: label(t, { offsetY: -16 }) })];
    case "measure": return [new Style({ stroke: new Stroke({ color: "#fff", width: 3, lineDash: [6, 4] }), fill: new Fill({ color: "rgba(255,255,255,.15)" }), image: new CircleStyle({ radius: 4, fill: new Fill({ color: "#fff" }) }), text: label(t, { font: "700 14px sans-serif" }) })];
  }
  return [];
}
