import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import PointerInteraction from "ol/interaction/Pointer";
import { getPointResolution } from "ol/proj";
import { createPhotoLayer } from "./photoLayer";
import OlMap from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { fromExtent } from "ol/geom/Polygon";
import Polygon from "ol/geom/Polygon";
import LineString from "ol/geom/LineString";
import DragBox from "ol/interaction/DragBox";
import DragPan from "ol/interaction/DragPan";
import Draw, { createBox } from "ol/interaction/Draw";
import CircleGeometry from "ol/geom/Circle";
import { drawnCircle, finishPolygon } from "../lib/shapes";
import Select from "ol/interaction/Select";
import Translate from "ol/interaction/Translate";
import Modify from "ol/interaction/Modify";
import type Interaction from "ol/interaction/Interaction";
import { click, altKeyOnly } from "ol/events/condition";
import { fromLonLat, toLonLat, transformExtent } from "ol/proj";
import { getArea, getLength } from "ol/sphere";
import { Style, Stroke, Fill } from "ol/style";
import { defaults as defaultControls } from "ol/control";
import { createSatelliteLayer } from "./basemap";
import { featureStyle, overlayStyle, DRAW_TYPE, type OverlayKind } from "./drawTools";
import { fromOl, toOl, fmtM, fmtM2 } from "../lib/geo";
import type { GardenFile, GardenFeature, Geometry, ToolId, ShapeMode, AreaShape, PhotoPlacement } from "../types/garden";

type BBox = GardenFile["place"]["bbox"];
export type Overlay = { geometry: Geometry; okind: OverlayKind; label?: string };

export type MapHandle = {
  flyTo: (lon: number, lat: number, zoom?: number) => void;
  fitBbox: (b: BBox) => void;
  getMap: () => OlMap | null;
  extent3857: () => [number, number, number, number] | null;
};

type Props = {
  useVworld: boolean;
  center: { lon: number; lat: number };
  zoom: number;
  bbox?: BBox;
  areaMode: boolean;
  showSatellite: boolean;
  features: GardenFeature[];
  hiddenKinds: string[];
  overlays: Overlay[];
  tool: ToolId;
  measureMode: "line" | "area";
  shapeMode: ShapeMode;
  selectedId: string | null;
  onBbox: (b: BBox, areaM2: number) => void;
  onView: (center: { lon: number; lat: number }, zoom: number) => void;
  onCreate: (tool: ToolId, g: Geometry, shape?: AreaShape) => void;
  onGeom: (id: string, g: Geometry, operation: "translate" | "modify") => void;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onMeasure: (text: string | null) => void;
  photo: PhotoPlacement | null;
  photoBitmap: ImageBitmap | null;
  photoMode: "none" | "move" | "pick";
  maxZoom: number;
  onPhotoDrag: (dx: number, dy: number) => void;
  onPhotoPick: (coord3857: [number, number]) => void;
};

/** 0.5 m · 1 m 처럼 m 단위로 읽히는 축척 막대 */
const NICE = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
export function scaleBar(mPerPx: number, maxPx = 140): { m: number; px: number; label: string } {
  const m = [...NICE].reverse().find((x) => x / mPerPx <= maxPx) ?? NICE[0];
  const label = m >= 1000 ? `${m / 1000} km` : `${m} m`;
  return { m, px: m / mPerPx, label };
}

const MapView = forwardRef<MapHandle, Props>(function MapView(p, ref) {
  const div = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const satRef = useRef<ReturnType<typeof createSatelliteLayer> | null>(null);
  const boxSrc = useRef(new VectorSource());
  const featSrc = useRef(new VectorSource());
  const ovSrc = useRef(new VectorSource());
  const measSrc = useRef(new VectorSource());
  const featLayer = useRef<VectorLayer | null>(null);
  const dragRef = useRef<DragBox | null>(null);
  const toolInts = useRef<Interaction[]>([]);
  const selectRef = useRef<Select | null>(null);
  const clickKey = useRef<((e: unknown) => void) | null>(null);
  const photoLayer = useRef<ReturnType<typeof createPhotoLayer> | null>(null);
  const [scale, setScale] = useState<{ px: number; label: string; ground: number } | null>(null);
  const cb = useRef(p);
  cb.current = p;

  useEffect(() => {
    const sat = createSatelliteLayer(p.useVworld);
    satRef.current = sat;
    const boxLayer = new VectorLayer({
      source: boxSrc.current,
      style: new Style({ stroke: new Stroke({ color: "#ffeb3b", width: 2, lineDash: [8, 6] }), fill: new Fill({ color: "rgba(255,235,59,0.05)" }) }),
    });
    const fl = new VectorLayer({
      source: featSrc.current,
      style: (f, res) => featureStyle(f, res, f.getId() === cb.current.selectedId),
      declutter: false,
      properties: { id: "features" },
    });
    featLayer.current = fl;
    const ov = new VectorLayer({ source: ovSrc.current, style: (f) => overlayStyle(f), zIndex: 4 });
    const ms = new VectorLayer({ source: measSrc.current, style: (f) => overlayStyle(f), zIndex: 6 });
    fl.setZIndex(5);
    const ph = createPhotoLayer(() => ({ placement: cb.current.photo, bitmap: cb.current.photoBitmap }));
    ph.setZIndex(1);
    photoLayer.current = ph;
    const map = new OlMap({
      target: div.current!,
      layers: [sat, ph, boxLayer, ov, fl, ms],
      controls: defaultControls({ attributionOptions: { collapsible: false } }),
      view: new View({ center: fromLonLat([p.center.lon, p.center.lat]), zoom: p.zoom, minZoom: 6, maxZoom: p.maxZoom }),
    });
    const upd = () => {
      const v = map.getView(), r = v.getResolution(), c = v.getCenter();
      if (!r || !c) return;
      const g = getPointResolution(v.getProjection(), r, c);
      const sb = scaleBar(g);
      setScale({ px: sb.px, label: sb.label, ground: g });
    };
    map.getView().on("change:resolution", upd);
    map.on("moveend", upd);
    map.on("moveend", () => {
      const v = map.getView();
      const [lon, lat] = toLonLat(v.getCenter()!);
      cb.current.onView({ lon, lat }, Math.round((v.getZoom() ?? 0) * 10) / 10);
    });
    const drag = new DragBox();
    drag.on("boxend", () => {
      const geom = drag.getGeometry();
      boxSrc.current.clear();
      boxSrc.current.addFeature(new Feature(geom.clone()));
      const [west, south, east, north] = transformExtent(geom.getExtent(), "EPSG:3857", "EPSG:4326");
      cb.current.onBbox({ west, south, east, north }, Math.round(getArea(geom)));
    });
    dragRef.current = drag;
    mapRef.current = map;
    (window as unknown as { __olmap: OlMap }).__olmap = map; // 테스트·디버그용
    return () => map.setTarget(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 도면 객체 → 소스 재구성
  useEffect(() => {
    const src = featSrc.current;
    src.clear();
    src.addFeatures(p.features.filter((f) => !p.hiddenKinds.includes(f.kind)).map((g) => {
      const f = new Feature({ geometry: toOl(g.geometry), kind: g.kind, props: g.props });
      f.setId(g.id);
      return f;
    }));
    syncSelection();
  }, [p.features, p.hiddenKinds]);

  // 선택만 바뀌면 소스는 그대로 두고 선택 집합만 맞춘다 (드래그 중 객체 교체 방지)
  function syncSelection() {
    const sel = selectRef.current;
    if (!sel) return;
    const f = cb.current.selectedId ? featSrc.current.getFeatureById(cb.current.selectedId) : null;
    const cur = sel.getFeatures();
    if (cur.getLength() === 1 && cur.item(0) === f) return;
    cur.clear();
    if (f) cur.push(f);
    featLayer.current?.changed();
  }
  useEffect(() => { syncSelection(); }, [p.selectedId]);

  useEffect(() => { photoLayer.current?.changed(); }, [p.photo, p.photoBitmap]);
  useEffect(() => {
    const v = mapRef.current?.getView();
    if (!v) return;
    // setMaxZoom 은 진행 중인 flyTo 애니메이션을 끊으므로 끝난 뒤에 적용
    let t: ReturnType<typeof setTimeout> | undefined;
    const apply = () => {
      if (v.getAnimating()) { t = setTimeout(apply, 200); return; }
      if (v.getMaxZoom() === p.maxZoom) return;
      v.setMaxZoom(p.maxZoom);
      if ((v.getZoom() ?? 0) > p.maxZoom) v.setZoom(p.maxZoom);
    };
    apply();
    return () => clearTimeout(t);
  }, [p.maxZoom]);

  useEffect(() => {
    ovSrc.current.clear();
    ovSrc.current.addFeatures(p.overlays.map((o) => new Feature({ geometry: toOl(o.geometry), okind: o.okind, label: o.label })));
  }, [p.overlays]);

  // 도구 전환
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    toolInts.current.forEach((i) => map.removeInteraction(i));
    toolInts.current = [];
    selectRef.current = null;
    if (clickKey.current) { map.un("singleclick", clickKey.current as never); clickKey.current = null; }
    if (p.tool !== "measure") { measSrc.current.clear(); cb.current.onMeasure(null); }
    if (p.areaMode) return;
    const add = (i: Interaction) => { map.addInteraction(i); toolInts.current.push(i); };
    if (p.photoMode === "move") {
      let last: number[] | null = null;
      add(new PointerInteraction({
        handleDownEvent: (e) => { last = e.coordinate; return true; },
        handleDragEvent: (e) => { if (last) { cb.current.onPhotoDrag(e.coordinate[0] - last[0], e.coordinate[1] - last[1]); last = e.coordinate; } },
        handleUpEvent: () => { last = null; return false; },
      }));
      return;
    }
    if (p.photoMode === "pick") {
      const h = (e: unknown) => { const c = (e as { coordinate: number[] }).coordinate; cb.current.onPhotoPick([c[0], c[1]]); };
      map.on("singleclick", h as never);
      clickKey.current = h;
      return;
    }
    const t = p.tool;

    if (t === "select") {
      const sel = new Select({ layers: [featLayer.current!], style: null as never, condition: click, hitTolerance: 6 });
      sel.on("select", () => {
        const f = sel.getFeatures().item(0);
        cb.current.onSelect(f ? String(f.getId()) : null);
      });
      const emit = (fs: Feature[], operation: "translate" | "modify") => fs.forEach((f) => cb.current.onGeom(String(f.getId()), fromOl(f.getGeometry()!), operation));
      const tr = new Translate({ features: sel.getFeatures(), condition: (event) => !event.originalEvent.altKey });
      tr.on("translateend", (e) => emit(e.features.getArray() as Feature[], "translate"));
      const mod = new Modify({ features: sel.getFeatures(), condition: altKeyOnly, deleteCondition: () => false });
      mod.on("modifyend", (e) => emit(e.features.getArray() as Feature[], "modify"));
      add(sel); add(mod); add(tr);
      selectRef.current = sel;
      const f = cb.current.selectedId ? featSrc.current.getFeatureById(cb.current.selectedId) : null;
      if (f) sel.getFeatures().push(f);
    } else if (t === "delete") {
      const h = (e: unknown) => {
        const ev = e as { pixel: number[] };
        const f = map.forEachFeatureAtPixel(ev.pixel, (x) => x, { layerFilter: (l) => l === featLayer.current, hitTolerance: 6 });
        if (f) cb.current.onDelete(String(f.getId()));
      };
      map.on("singleclick", h as never);
      clickKey.current = h;
    } else if (t === "measure") {
      const d = new Draw({ type: p.measureMode === "area" ? "Polygon" : "LineString", source: measSrc.current });
      d.on("drawstart", () => measSrc.current.clear());
      d.on("drawend", (e) => {
        const g = e.feature.getGeometry()!;
        const txt = g instanceof Polygon ? `면적 ${fmtM2(Math.round(getArea(g) * 10) / 10)}` : g instanceof LineString ? `거리 ${fmtM(Math.round(getLength(g) * 10) / 10)}` : "";
        e.feature.set("okind", "measure");
        e.feature.set("label", txt);
        cb.current.onMeasure(txt);
      });
      add(d);
    } else {
      const type = DRAW_TYPE[t];
      if (type) {
        const area = type === "Polygon", mode = p.shapeMode;
        const d = new Draw({
          type: area && (mode === "circle" || mode === "rectangle") ? "Circle" : type,
          geometryFunction: area && mode === "rectangle" ? createBox() : undefined,
          freehand: area && mode === "freehand", stopClick: true,
        });
        d.on("drawend", (e) => {
          const geometry = e.feature.getGeometry();
          if (geometry instanceof CircleGeometry) {
            const c = geometry.getCenter(), ll = toLonLat(c), edge = toLonLat([c[0] + geometry.getRadius(), c[1]]);
            const result = drawnCircle([ll[0], ll[1]], [edge[0], edge[1]]);
            if (result.shape.mode === "circle" && result.shape.radiusM > 0) cb.current.onCreate(t, result.geometry, result.shape);
          } else if (geometry instanceof Polygon) {
            const finished = finishPolygon(geometry, mode, (map.getView().getResolution() ?? 1) * 2);
            if (finished.getArea() > 0) cb.current.onCreate(t, fromOl(finished), mode === "circle" ? undefined : { mode });
          } else if (geometry) cb.current.onCreate(t, fromOl(geometry));
        });
        add(d);
      }
    }
  }, [p.tool, p.measureMode, p.shapeMode, p.areaMode, p.photoMode]);

  useEffect(() => {
    const map = mapRef.current, drag = dragRef.current;
    if (!map || !drag) return;
    map.getInteractions().forEach((i) => { if (i instanceof DragPan) i.setActive(!p.areaMode); });
    if (p.areaMode) map.addInteraction(drag);
    else map.removeInteraction(drag);
  }, [p.areaMode]);

  useEffect(() => { satRef.current?.setVisible(p.showSatellite); }, [p.showSatellite]);

  useEffect(() => {
    boxSrc.current.clear();
    const b = p.bbox;
    if (b && b.east !== b.west) {
      const ext = transformExtent([b.west, b.south, b.east, b.north], "EPSG:4326", "EPSG:3857");
      boxSrc.current.addFeature(new Feature(fromExtent(ext)));
    }
  }, [p.bbox]);

  useImperativeHandle(ref, () => ({
    flyTo(lon, lat, zoom = 17) {
      mapRef.current?.getView().animate({ center: fromLonLat([lon, lat]), zoom, duration: 900 });
    },
    getMap: () => mapRef.current,
    extent3857: () => { const m = mapRef.current; const sz = m?.getSize(); return m && sz ? (m.getView().calculateExtent(sz) as [number, number, number, number]) : null; },
    fitBbox(b) {
      const ext = transformExtent([b.west, b.south, b.east, b.north], "EPSG:4326", "EPSG:3857");
      mapRef.current?.getView().fit(ext, { padding: [60, 60, 60, 60], duration: 600 });
    },
  }));

  const cursor = p.areaMode || (p.tool !== "select" && p.tool !== "delete") ? "area-mode" : p.tool === "delete" ? "del-mode" : "";
  return (
    <>
      <div ref={div} className={`map ${cursor} ${p.photoMode !== "none" ? "photo-" + p.photoMode : ""}`} />
      {scale && (
        <div className="scale-bar" title={`화면 1px ≈ ${scale.ground < 1 ? (scale.ground * 100).toFixed(1) + " cm" : scale.ground.toFixed(2) + " m"}`} data-ground={scale.ground}>
          <div className="scale-bar-line" style={{ width: scale.px }} />
          <span>{scale.label}</span>
        </div>
      )}
    </>
  );
});

export default MapView;
