import { useDriveSync } from "./cloud/useDriveSync";
import { hasGoogleClient, reconnect, signIn, signOut } from "./cloud/googleAuth";
import type { DriveFile } from "./cloud/drive";
import Mascot from "./ui/Mascot";
import { APP_TITLE } from "./ui/BrandLogo";
import { CloudUpload, CloudDownload, LogOut, LogIn } from "lucide-react";
import PhotoPanel, { type PickStep } from "./ui/PhotoPanel";
import { alignTwoPoints, fitToExtent, guessCrs, mapToPx, parseWorldFile, placementFromWorldFile, PHOTO_LIMITS, pxToMap, type WorldFile } from "./lib/photo";
import { blobToDataUrl, dataUrlToBlob, decodePhoto, loadPhotoBlob, savePhotoBlob, type LoadedPhoto } from "./lib/photoStore";
import type { PhotoCrs, PhotoPlacement } from "./types/garden";
import { fromLonLat, toLonLat } from "ol/proj";
import type { Overlay } from "./map/MapView";
import ExportMenu from "./ui/ExportMenu";
import { exportDrawing, type ExportFormat } from "./lib/exportDrawing";
import ShapePicker from "./ui/ShapePicker";
import PlantPicker, { plantingProps } from "./ui/PlantPicker";
import { AREA_TOOLS, circlePolygon } from "./lib/shapes";
import { moveFeature } from "./lib/featureEdits";
import type { ShapeMode, AreaShape } from "./types/garden";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AnalysisSettings, FeatureProps, GardenFeature, GardenFile, Geometry, MicroType, SectorType, ToolId } from "./types/garden";
import PropertyPanel from "./ui/PropertyPanel";
import LayerPanel from "./ui/LayerPanel";
import AnalysisPanel, { type Tab } from "./ui/AnalysisPanel";
import SummaryModal from "./ui/SummaryModal";
import { History } from "./lib/history";
import { dest, measured, newId, sectorPoly } from "./lib/geo";
import { analysisCenter, autoSectors, buildOverlays, computeSlope, slopeSamplePoints, zoneTemplate, type Slope } from "./lib/analysis";
import { fetchClimate, fetchElevations, type Climate } from "./lib/weather";
import { fetchNoise, type NoiseResult } from "./lib/noise";
import { loadGuildData, UNVERIFIED_GUILDS, type PlantGuildData } from "./lib/guilds";
import { MICRO, ZONE_COLORS } from "./map/drawTools";
import { TOOLS, SITE_TOOLS } from "./ui/DrawToolbar";
import { useMemo } from "react";
import TopMenu from "./ui/TopMenu";
import DrawToolbar from "./ui/DrawToolbar";
import BasicInfoModal from "./ui/BasicInfoModal";
import SearchPopover from "./ui/SearchPopover";
import StatusBar from "./ui/StatusBar";
import MapView, { type MapHandle } from "./map/MapView";
import { hasKey } from "./lib/vworld";
import { downloadGarden, loadAutosave, parseGardenFile, saveAutosave } from "./lib/storage";
import { emptyGarden, hasBbox } from "./lib/newGarden";
import { sanitizeFilename } from "./lib/filename";

type Async<T> = { data: T | null; loading: boolean; error?: string };
const idle = { data: null, loading: false };
const KEYMAP: Record<string, ToolId> = Object.fromEntries([...TOOLS, ...SITE_TOOLS].map(([id, , , k]) => [k.toLowerCase(), id]));

type ModalState = null | { kind: "new" } | { kind: "edit" };

export default function App({ onHome }: { onHome?: () => void } = {}) {
  const useVworld = hasKey();
  const [file, setFile] = useState<GardenFile>(() => emptyGarden());
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [areaMode, setAreaMode] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSat, setShowSat] = useState(true);
  const [saveState, setSaveState] = useState("");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState({ lon: 127.5, lat: 36.2, zoom: 7 });
  const mapRef = useRef<MapHandle>(null);
  const hist = useRef(new History());
  const [, bump] = useState(0);
  const [tool, setTool] = useState<ToolId>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hidden = useMemo(() => file.ui?.hiddenKinds ?? [], [file.ui?.hiddenKinds]);
  const setHidden = (kinds: string[]) => setFile((f) => ({ ...f, ui: { activeLayerIds: f.ui?.activeLayerIds ?? ["satellite"], ...f.ui, hiddenKinds: kinds } }));
  const [shapeMode, setShapeMode] = useState<ShapeMode>("polygon");
  const [plantId, setPlantId] = useState("");
  const [wholeGuild, setWholeGuild] = useState(false);
  const [measureMode, setMeasureMode] = useState<"line" | "area">("line");
  const [zoneNo, setZoneNo] = useState<0 | 1 | 2 | 3 | 4 | 5>(1);
  const [microType, setMicroType] = useState<MicroType>("sunny");
  const [guildId, setGuildId] = useState("guild_sagwa");
  const [gd, setGd] = useState<PlantGuildData | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("sun");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoImg, setPhotoImg] = useState<LoadedPhoto | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMissing, setPhotoMissing] = useState(false);
  const [photoMode, setPhotoMode] = useState<"none" | "move" | "pick">("none");
  const [pick, setPick] = useState<PickStep>(null);
  const [worldFile, setWorldFile] = useState<WorldFile | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [climate, setClimate] = useState<Async<Climate>>(idle);
  const [noise, setNoise] = useState<Async<NoiseResult>>(idle);
  const [slope, setSlope] = useState<Async<Slope>>(idle);
  useEffect(() => { loadGuildData().then(setGd).catch((e) => setMsg(String(e.message))); }, []);
  const plants = useMemo(() => Object.fromEntries((gd?.plants ?? []).map((p) => [p.id, p])), [gd]);

  /** 도면 변경 — 되돌리기 기록 */
  const editFeatures = useCallback((fn: (fs: GardenFeature[]) => GardenFeature[]) => {
    setFile((f) => {
      const next = fn(f.features);
      if (next === f.features) return f;
      hist.current.push(f.features); bump((n) => n + 1);
      return { ...f, features: next, meta: { ...f.meta, updatedAt: new Date().toISOString(), areaM2: next.filter((x) => x.kind === "boundary").reduce((s, x) => s + (x.props.areaM2 ?? 0), 0) || f.meta.areaM2 } };
    });
  }, []);
  const undo = useCallback(() => setFile((f) => { const p = hist.current.undo(f.features); bump((n) => n + 1); return p ? { ...f, features: p } : f; }), []);
  const redo = useCallback(() => setFile((f) => { const p = hist.current.redo(f.features); bump((n) => n + 1); return p ? { ...f, features: p } : f; }), []);
  const del = useCallback((id: string) => {
    editFeatures((fs) => { const t = fs.find((x) => x.id === id); const g = t?.props.guildId && t.kind === "tree" ? t.props.guildId : null; return fs.filter((x) => x.id !== id && !(g && x.props.guildId === g)); });
    setSelectedId(null);
  }, [editFeatures]);
  const setAnalysis = (a: Partial<AnalysisSettings>) => setFile((f) => ({ ...f, analysis: { ...f.analysis, ...a } }));

  function onCreate(t: ToolId, g: Geometry, shape?: AreaShape) {
    if (t === "guild") return stampGuild(g);
    const kind = t as GardenFeature["kind"];
    const props: FeatureProps = { shape };
    if (kind === "zone") { props.zone = zoneNo; props.color = ZONE_COLORS[zoneNo]; }
    if (kind === "tree") Object.assign(props, plantingProps(plants[plantId]));
    if (kind === "path") props.widthM = 1;
    if (kind === "micro") { props.microType = microType; props.label = MICRO[microType].label; }
    if (kind === "house") props.name = "집";
    const nf: GardenFeature = { id: newId(), kind, geometry: g, props: measured(kind, g, props) };
    editFeatures((fs) => (kind === "house" ? [...fs.filter((x) => x.kind !== "house"), nf] : [...fs, nf]));
    setSelectedId(nf.id); setTool("select");
  }

  function stampGuild(g: Geometry) {
    const guild = gd?.guilds.find((x) => x.id === guildId);
    if (!guild || g.type !== "Point") return;
    const c = g.coordinates as number[], stamp = newId(), ct = plants[guild.center];
    const out: GardenFeature[] = [{
      id: newId(), kind: "tree", geometry: g,
      props: { name: guild.name, label: ct?.ko ?? guild.center, plantId: guild.center, guildId: stamp, role: "중심 나무",
        heightM: ct?.height_m ?? undefined, canopyM: ct?.width_m ? ct.width_m / 2 : 2 },
    }];
    guild.members.forEach((m, mi) => {
      const n = Math.max(1, m.count_hint), off = (mi * 360) / guild.members.length / 3;
      for (let i = 0; i < n; i++) {
        const pt = dest(c, off + (i * 360) / n, m.ring_m);
        out.push({ id: newId(), kind: "plant", geometry: { type: "Point", coordinates: pt }, props: { label: plants[m.plant]?.ko ?? m.plant, plantId: m.plant, role: m.role, guildId: stamp } });
      }
    });
    editFeatures((fs) => [...fs, ...out]);
    setSelectedId(out[0].id); setTool("select");
    setMsg(`${guild.name} 스탬프 (조합·거리·개수는 추정)${UNVERIFIED_GUILDS[guild.id] ? " — 검증 전 길드" : ""}`);
  }

  const center = analysisCenter(file).pt;
  const doClimate = () => { setClimate({ data: null, loading: true }); fetchClimate(center[1], center[0], file.analysis?.climateYears ?? 10).then((d) => setClimate({ data: d, loading: false })).catch((e) => setClimate({ data: null, loading: false, error: e.message })); };
  const doNoise = () => { setNoise({ data: null, loading: true }); fetchNoise(center[0], center[1], file.analysis?.noiseRadiusM ?? 600).then((d) => setNoise({ data: d, loading: false })).catch((e) => setNoise({ data: null, loading: false, error: e.message })); };
  const doSlope = async () => {
    setSlope({ data: null, loading: true });
    try {
      const grid = slopeSamplePoints(center);
      const z = await fetchElevations(grid);
      const s = computeSlope(center, z);
      const prof = Array.from({ length: 11 }, (_, i) => dest(center, s.downhillDeg, -150 + i * 30));
      const pz = await fetchElevations(prof);
      setSlope({ data: { ...s, profile: pz.map((v, i) => ({ d: -150 + i * 30, z: v })) }, loading: false });
    } catch (e) { setSlope({ data: null, loading: false, error: (e as Error).message }); }
  };
  const overlays = useMemo(() => {
    const base = buildOverlays(file, climate.data, noise.data, slope.data);
    const ph = file.photo;
    if (!pick || !ph) return base;
    const pt = (c: number[]) => ({ type: "Point" as const, coordinates: toLonLat(c) as [number, number] });
    const marks: Overlay[] = [
      ...pick.img.map((u, i) => ({ okind: "pick-img" as const, geometry: pt(pxToMap(ph, u)), label: `사진${i + 1}` })),
      ...pick.map.map((c, i) => ({ okind: "pick-map" as const, geometry: pt(c), label: `지도${i + 1}` })),
    ];
    return [...base, ...marks];
  }, [file, climate.data, noise.data, slope.data, pick]);
  const selected = file.features.find((f) => f.id === selectedId) ?? null;
  const fileInput = useRef<HTMLInputElement>(null);

  // 시작 시 자동저장 복구
  useEffect(() => {
    loadAutosave().then((f) => {
      if (f) {
        setFile(f);
        setTimeout(() => {
          if (hasBbox(f)) mapRef.current?.fitBbox(f.place.bbox);
          else mapRef.current?.flyTo(f.place.center.lon, f.place.center.lat, f.place.zoom);
        }, 50);
        setMsg("자동저장에서 복구했어요");
      } else {
        setModal({ kind: "new" });
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // 이름 → 탭 제목
  useEffect(() => {
    document.title = `${sanitizeFilename(file.meta.name)} — ${APP_TITLE}`;
  }, [file.meta.name]);

  // 디바운스 자동저장
  useEffect(() => {
    if (!loaded) return;
    setSaveState("저장 중…");
    const t = setTimeout(() => {
      saveAutosave(file).then(() => setSaveState("자동저장됨")).catch(() => setSaveState("자동저장 실패"));
    }, 800);
    return () => clearTimeout(t);
  }, [file, loaded]);

  const drive = useDriveSync(file, setFile, loaded);
  const [driveOpen, setDriveOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[] | null>(null);
  const [driveErr, setDriveErr] = useState("");
  const refreshDrive = useCallback(() => { setDriveErr(""); setDriveFiles(null); drive.list().then(setDriveFiles).catch((e) => setDriveErr((e as Error).message)); }, [drive.list]);
  async function openFromDrive(id: string, name: string) {
    try {
      const g = await drive.open(id);
      setPhotoImg(null);
      setFile(g); hist.current.clear(); setSelectedId(null); setDriveOpen(false);
      if (hasBbox(g)) mapRef.current?.fitBbox(g.place.bbox);
      else mapRef.current?.flyTo(g.place.center.lon, g.place.center.lat, g.place.zoom);
      setMsg(`드라이브에서 ${name} 열었어요`);
    } catch (e) { setMsg(`드라이브 열기 실패: ${(e as Error).message}`); }
  }
  async function googleLogin() {
    if (!hasGoogleClient()) { setMsg("구글 로그인 설정 전이에요 (VITE_GOOGLE_CLIENT_ID 필요 · docs/구글로그인_설정.md). 지금은 이 브라우저에만 저장돼요."); return; }
    try { await signIn(); setMsg("구글 드라이브에 연결했어요 — 자동저장돼요"); } catch (e) { setMsg(`로그인 실패: ${(e as Error).message}`); }
  }
  const driveLabel = drive.status.kind === "saving" ? " · 드라이브 저장 중…" : drive.status.kind === "saved" ? ` · 드라이브 ${drive.status.at?.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}` : drive.status.kind === "error" ? " · 드라이브 저장 실패" : "";
  const account = drive.session ? (
    <div className="account">
      {drive.session.user.picture && <img className="avatar" src={drive.session.user.picture} alt="" title={drive.session.user.email} referrerPolicy="no-referrer" />}
      <span className="email" title={drive.session.user.email}>{drive.session.user.email}</span>
      <button className="btn" aria-label="드라이브에 저장" title="드라이브에 저장 (정원설계 폴더)" onClick={() => { void drive.saveNow().then((r) => r && setMsg(`드라이브에 ${r.name} 저장`)); }}><CloudUpload size={16} /><span className="lbl">드라이브에 저장</span></button>
      <button className="btn" aria-label="드라이브에서 열기" title="드라이브에서 열기" onClick={() => { setDriveOpen(true); refreshDrive(); }}><CloudDownload size={16} /><span className="lbl">드라이브에서 열기</span></button>
      <button className="btn" aria-label="로그아웃" title="로그아웃 (이 브라우저 자동저장은 남아요)" onClick={() => { signOut(); setMsg("로그아웃했어요 — 이 브라우저 자동저장은 그대로예요"); }}><LogOut size={16} /><span className="lbl">로그아웃</span></button>
    </div>
  ) : (
    <div className="account"><button className="btn" onClick={googleLogin} title="구글 드라이브에 저장하려면 로그인"><LogIn size={15} /> 구글 로그인</button></div>
  );

  const touch = (f: GardenFile): GardenFile => ({ ...f, meta: { ...f.meta, updatedAt: new Date().toISOString() } });

  const newGarden = useCallback(() => {
    if (file.meta.name && !confirm("지금 정원을 닫고 새 정원을 만들까요? (저장 안 한 내용은 자동저장만 남아요)")) return;
    setModal({ kind: "new" });
  }, [file.meta.name]);

  const save = useCallback(() => {
    if (!file.meta.name.trim()) { setModal({ kind: "edit" }); setMsg("저장하려면 정원 이름을 먼저 넣어 주세요"); return; }
    void (async () => {
      let photoData: string | undefined;
      if (file.photo && !photoMissing) {
        const blob = await loadPhotoBlob(file.photo.id);
        if (blob && confirm(`배경 사진(${(blob.size / 1048576).toFixed(1)}MB)을 정원 파일에 함께 넣을까요?\n\n확인: 사진까지 한 파일로 (파일이 커져요)\n취소: 배치값과 사진 이름만 저장 — 다른 컴퓨터에서 열면 사진을 다시 연결해요`)) {
          photoData = await blobToDataUrl(blob);
        }
      }
      const out = downloadGarden(photoData ? { ...file, photoData } : file);
      const { photoData: _drop, ...kept } = out;
      setFile(kept);
      setMsg(`${sanitizeFilename(out.meta.name)}.garden.json 저장${photoData ? " (사진 포함)" : file.photo ? " (사진은 배치값만)" : ""}`);
    })();
  }, [file, photoMissing]);

  const open = useCallback(() => fileInput.current?.click(), []);
  const doExport = useCallback(async (fmt: ExportFormat) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    setExportBusy(true); setSelectedId(null);
    try {
      const r = await exportDrawing(map, file, hidden, fmt);
      setMsg(`${r.filename} 내보냄${r.note ? ` — ${r.note}` : ""}`);
    } catch (e) { setMsg(`내보내기 실패: ${(e as Error).message}`); }
    finally { setExportBusy(false); setExportOpen(false); }
  }, [file, hidden]);

  const setPhoto = (fn: (p: PhotoPlacement) => PhotoPlacement) =>
    setFile((f) => (f.photo ? { ...f, photo: fn(f.photo) } : f));

  // 배치에 맞는 사진 원본을 IndexedDB 에서 불러오기 (시작·열기·새로고침)
  const photoId = file.photo?.id;
  useEffect(() => {
    if (!photoId) { setPhotoImg(null); setPhotoMissing(false); return; }
    if (photoImg?.id === photoId) return;
    let alive = true;
    setPhotoBusy(true);
    loadPhotoBlob(photoId).then(async (b) => {
      if (!alive) return;
      if (!b) { setPhotoImg(null); setPhotoMissing(true); return; }
      const img = await decodePhoto(photoId, b);
      if (alive) { setPhotoImg(img); setPhotoMissing(false); }
    }).catch((e) => setMsg(`사진 불러오기 실패: ${(e as Error).message}`)).finally(() => alive && setPhotoBusy(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId]);

  async function onPhotoFiles(files: File[]) {
    const img = files.find((f) => /\.(jpe?g|png)$/i.test(f.name) || /^image\/(jpeg|png)$/.test(f.type));
    const wfFile = files.find((f) => /\.(jgw|pgw|jpgw|pngw|wld)$/i.test(f.name));
    if (!img) {
      setMsg(files.some((f) => /\.tiff?$/i.test(f.name)) ? "GeoTIFF는 아직 못 읽어요. JPG+월드파일(.jgw)로 변환해 올려 주세요." : "JPG 또는 PNG 사진을 골라 주세요.");
      return;
    }
    if (img.size > PHOTO_LIMITS.maxFileBytes) { setMsg(`사진이 너무 커요 (최대 ${PHOTO_LIMITS.maxFileBytes / 1048576}MB)`); return; }
    const relink = photoMissing && file.photo && file.photo.name === img.name;
    const id = relink && file.photo ? file.photo.id : newId();
    setPhotoBusy(true);
    try {
      const loaded = await decodePhoto(id, img);
      await savePhotoBlob(id, img);
      const base = { id, name: img.name, widthPx: loaded.original.width, heightPx: loaded.original.height, fileBytes: img.size, opacity: 1, visible: true, source: "manual" as const };
      let placement: PhotoPlacement;
      let wf: WorldFile | null = null;
      if (relink && file.photo) placement = { ...file.photo, fileBytes: img.size };
      else if (wfFile) {
        wf = parseWorldFile(await wfFile.text());
        placement = placementFromWorldFile(base, wf, guessCrs(wf));
      } else {
        const ext = mapRef.current?.extent3857();
        if (!ext) throw new Error("지도가 아직 준비되지 않았어요");
        placement = fitToExtent(base, ext);
      }
      setWorldFile(wf);
      setPhotoImg(loaded); setPhotoMissing(false);
      setFile((f) => touch({ ...f, photo: placement }));
      if (wf) mapRef.current?.flyTo(placement.center[0], placement.center[1], 19);
      setMsg(`배경 사진 ${img.name} (${loaded.original.width}×${loaded.original.height}px${loaded.display.width < loaded.original.width ? `, 화면용 ${loaded.display.width}×${loaded.display.height}` : ""})${wf ? " · 월드파일 좌표로 배치" : " · 화면에 맞춰 놓음"}`);
    } catch (e) { setMsg(`사진 올리기 실패: ${(e as Error).message}`); }
    finally { setPhotoBusy(false); }
  }

  function onPhotoPick(c: [number, number]) {
    const ph = file.photo;
    if (!ph) return;
    setPick((s) => {
      const st = s ?? { img: [], map: [] };
      if (st.img.length < 2) return { ...st, img: [...st.img, mapToPx(ph, c)] };
      const next = { ...st, map: [...st.map, c] };
      if (next.map.length === 2) {
        try {
          const aligned = alignTwoPoints(ph, [next.img[0], next.img[1]], [next.map[0], next.map[1]]);
          setFile((f) => touch({ ...f, photo: aligned }));
          setMsg(`2점 정렬 완료 · 해상도 ${aligned.mPerPx.toFixed(3)} m/px · 회전 ${aligned.rotationDeg.toFixed(1)}°`);
        } catch (e) { setMsg((e as Error).message); }
        setPhotoMode("none");
        return null;
      }
      return next;
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const parsed = parseGardenFile(await f.text());
      const { photoData, ...g } = parsed;
      if (photoData && g.photo) { await savePhotoBlob(g.photo.id, await dataUrlToBlob(photoData)); setPhotoImg(null); }
      setFile(g); hist.current.clear(); setSelectedId(null);
      if (hasBbox(g)) mapRef.current?.fitBbox(g.place.bbox);
      else mapRef.current?.flyTo(g.place.center.lon, g.place.center.lat, g.place.zoom);
      setMsg(`${f.name} 열었어요`);
    } catch (err) {
      alert((err as Error).message || "파일을 열 수 없어요.");
    }
  }

  // 단축키
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input,textarea");
      if (e.key === "Escape") { setSearchOpen(false); setAreaMode(false); setModal(null); setSummaryOpen(false); setExportOpen(false); setPhotoMode("none"); setPick(null); setTool("select"); return; }
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        const map: Record<string, () => void> = {
          s: save, o: open, n: newGarden, e: () => setExportOpen((v) => !v), k: () => setSearchOpen((v) => !v),
          b: () => setAreaMode((v) => !v), i: () => setModal({ kind: "edit" }),
          z: e.shiftKey ? redo : undo, y: redo,
        };
        if (typing && (k === "z" || k === "y")) return;
        if (map[k]) { e.preventDefault(); map[k](); }
        return;
      }
      if (typing || modal || (e.target as HTMLElement)?.closest("select,button")) return;
      if (e.key === "l" || e.key === "L") setLayersOpen((v) => !v);
      if (e.key === ",") setSettingsOpen((v) => !v);
      if (e.key === "Delete" || e.key === "Backspace") { if (selectedId) del(selectedId); else setTool("delete"); return; }
      if (e.key === "a" || e.key === "A") { setAnalysisOpen((v) => !v); return; }
      const t = KEYMAP[e.key.toLowerCase()];
      if (t) setTool(t);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [save, open, newGarden, modal, undo, redo, del, selectedId]);

  return (
    <div className="app">
      <TopMenu
        name={file.meta.name} author={file.meta.author} saveState={saveState + driveLabel} account={account} onHome={onHome}
        areaMode={areaMode} searchOpen={searchOpen} layersOpen={layersOpen} settingsOpen={settingsOpen}
        mock={!useVworld} canUndo={hist.current.canUndo} canRedo={hist.current.canRedo} analysisOpen={analysisOpen} exportOpen={exportOpen} photoOpen={photoOpen}
        exportMenu={exportOpen ? <ExportMenu busy={exportBusy} onExport={doExport} onClose={() => !exportBusy && setExportOpen(false)} filenameBase={sanitizeFilename(file.meta.name)} /> : null}
        on={{
          export: () => setExportOpen((v) => !v), photo: () => setPhotoOpen((v) => !v), undo, redo, analysis: () => setAnalysisOpen((v) => !v), summary: () => setSummaryOpen(true),
          newGarden, open, save,
          info: () => setModal({ kind: "edit" }),
          search: () => setSearchOpen((v) => !v),
          area: () => setAreaMode((v) => !v),
          layers: () => setLayersOpen((v) => !v),
          settings: () => setSettingsOpen((v) => !v),
        }}
      />
      <input ref={fileInput} type="file" accept=".json,.garden.json,application/json" hidden onChange={onFile} />
      {drive.needsReconnect && (
        <div className="reconnect" role="alert">구글 연결이 만료됐어요. 변경 내용은 이 브라우저에 저장 중이에요.
          <button className="btn" onClick={() => { void reconnect().then(() => setMsg("다시 연결했어요")).catch((e) => setMsg(`다시 연결 실패: ${(e as Error).message}`)); }}>다시 연결</button></div>
      )}
      {!loaded && <div className="boot"><div><Mascot pose="cheer" size={110} /><span>정원을 불러오는 중…</span></div></div>}
      <div className="body">
        <DrawToolbar tool={tool} onTool={(t) => { setTool(t); if (t !== "select") setSelectedId(null); }} canDelete={!!selectedId} onDelete={() => selectedId && del(selectedId)} deleteMode={tool === "delete"} />
        <main className="map-wrap">
          <MapView
            ref={mapRef} useVworld={useVworld}
            center={file.place.center} zoom={file.place.zoom}
            bbox={hasBbox(file) ? file.place.bbox : undefined}
            areaMode={areaMode} showSatellite={showSat && !(file.photo?.visible && file.photo.hideSatellite && photoImg)}
            features={file.features} hiddenKinds={hidden} overlays={overlays} tool={tool} measureMode={measureMode} shapeMode={shapeMode} selectedId={selectedId}
            photo={file.photo ?? null} photoBitmap={photoImg?.bitmap ?? null} photoMode={photoMode}
            maxZoom={file.photo && photoImg ? PHOTO_LIMITS.maxZoomWithPhoto : PHOTO_LIMITS.maxZoomDefault}
            onPhotoDrag={(dx, dy) => setPhoto((ph) => { const c = fromLonLat(ph.center); return { ...ph, center: toLonLat([c[0] + dx, c[1] + dy]) as [number, number], source: ph.source === "worldfile" ? "manual" : ph.source }; })}
            onPhotoPick={onPhotoPick}
            onCreate={onCreate}
            onGeom={(id, g, operation) => editFeatures((fs) => moveFeature(fs, id, g, wholeGuild, operation))}
            onSelect={setSelectedId} onDelete={del}
            onMeasure={(t) => t && setMsg(t)}
            onView={(c, z) => {
              setView({ ...c, zoom: z });
              setFile((f) => ({ ...f, place: { ...f.place, center: c, zoom: z } }));
            }}
            onBbox={(b, a) => {
              setFile((f) => touch({ ...f, place: { ...f.place, bbox: b }, meta: { ...f.meta, areaM2: a } }));
              setAreaMode(false);
              setMsg(`설계 영역 지정: 약 ${a.toLocaleString("ko-KR")} ㎡`);
            }}
          />
          {tool !== "select" && !areaMode && (
            <div className="tool-opts">
              {AREA_TOOLS.includes(tool) && <ShapePicker mode={shapeMode} onChange={setShapeMode} />}
              {tool === "tree" && <small>식물 선택 패널에서 고른 뒤 지도 클릭</small>}
              {tool === "zone" && <>Zone 번호 {[0, 1, 2, 3, 4, 5].map((z) => <button key={z} className={`zchip ${zoneNo === z ? "on" : ""}`} style={{ background: ZONE_COLORS[z] }} onClick={() => setZoneNo(z as 0)}>{z}</button>)}</>}
              {tool === "micro" && <select value={microType} onChange={(e) => setMicroType(e.target.value as MicroType)}>{Object.entries(MICRO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>}
              {tool === "measure" && <><button className={`btn ${measureMode === "line" ? "on" : ""}`} onClick={() => setMeasureMode("line")}>거리</button><button className={`btn ${measureMode === "area" ? "on" : ""}`} onClick={() => setMeasureMode("area")}>면적</button></>}
              {tool === "guild" && gd && (() => { const g = gd.guilds.find((x) => x.id === guildId); return <>
                <select value={guildId} onChange={(e) => setGuildId(e.target.value)}>{gd.guilds.map((x) => <option key={x.id} value={x.id}>{x.name}{x.region === "남부" ? " [남부형]" : ""}{UNVERIFIED_GUILDS[x.id] ? " [검증 전]" : ""}</option>)}</select>
                {g?.region === "남부" && <span className="tag south" title="자료상 남부(따뜻한 지역)용 길드. 중부 내륙은 월동 확인 필요">남부형</span>}
                <span className="est" title="조합·거리·개수는 일반 관행에 따른 추정">추정</span>
                {g && UNVERIFIED_GUILDS[g.id] && <span className="warn">⚠ {UNVERIFIED_GUILDS[g.id]}</span>}
                <small>지도에서 중심 나무 자리를 클릭</small></>; })()}
              {(AREA_TOOLS.includes(tool) || tool === "path" || tool === "water-flow") && <small>{AREA_TOOLS.includes(tool) && shapeMode === "freehand" ? "누른 채 드래그 후 놓기" : AREA_TOOLS.includes(tool) && ["circle", "rectangle"].includes(shapeMode) ? "두 점 클릭" : "클릭으로 점 찍고 더블클릭으로 끝"} · Esc 취소</small>}
              {tool === "delete" && <small>지울 객체를 클릭하세요</small>}
            </div>
          )}
          {areaMode && <div className="map-hint">지도를 드래그해서 설계 영역을 그리세요 (Esc 취소)</div>}
          {searchOpen && (
            <SearchPopover
              onClose={() => setSearchOpen(false)}
              onPick={(r, q) => {
                mapRef.current?.flyTo(r.lon, r.lat, 18);
                setFile((f) => touch({
                  ...f,
                  meta: { ...f.meta, addressText: r.road || r.parcel || r.title },
                  place: { ...f.place, query: q || r.title, addressRoad: r.road, addressParcel: r.parcel, center: { lon: r.lon, lat: r.lat } },
                }));
                setSearchOpen(false);
                setMsg(`이동: ${r.title}`);
              }}
            />
          )}
        </main>
        {(layersOpen || settingsOpen || selected || analysisOpen || tool === "tree" || photoOpen || driveOpen) && (
          <aside className="side">
            {driveOpen && (
              <section className="drive-panel" aria-label="드라이브에서 열기">
                <div className="props-head"><h3>드라이브 · 정원설계 폴더</h3><button className="x" onClick={() => setDriveOpen(false)} title="닫기">✕</button></div>
                {driveErr && <p className="err">{driveErr}</p>}
                {!driveFiles && !driveErr && <p className="hint">목록 불러오는 중…</p>}
                {driveFiles && !driveFiles.length && <p className="hint">아직 저장한 정원이 없어요.</p>}
                <ul>{driveFiles?.map((d) => <li key={d.id}><button onClick={() => openFromDrive(d.id, d.name)}>{d.name}<small>{d.modifiedTime ? new Date(d.modifiedTime).toLocaleString("ko-KR") : ""}</small></button></li>)}</ul>
                <button className="btn" onClick={refreshDrive}>새로 고침</button>
              </section>
            )}
            {photoOpen && <PhotoPanel photo={file.photo} display={photoImg?.display ?? null} missing={photoMissing} busy={photoBusy}
              mode={photoMode} pick={pick} hasWorldFile={!!worldFile}
              onFiles={onPhotoFiles}
              onChange={(c) => setPhoto((ph) => ({ ...ph, ...c }))}
              onScale={(k) => setPhoto((ph) => ({ ...ph, mPerPx: ph.mPerPx * k, source: "manual" }))}
              onFit={() => { const ext = mapRef.current?.extent3857(); if (ext) setPhoto((ph) => ({ ...fitToExtent(ph, ext), aspectY: ph.aspectY, opacity: ph.opacity, visible: ph.visible, hideSatellite: ph.hideSatellite })); }}
              onMode={(m) => { setPhotoMode(m); setPick(m === "pick" ? { img: [], map: [] } : null); if (m !== "none") { setTool("select"); setSelectedId(null); } }}
              onCrs={(crs: PhotoCrs) => worldFile && setPhoto((ph) => ({ ...placementFromWorldFile(ph, worldFile, crs), opacity: ph.opacity, visible: ph.visible, hideSatellite: ph.hideSatellite }))}
              onRemove={() => { setFile((f) => { const { photo: _p, ...rest } = f; return touch(rest); }); setPhotoImg(null); setPhotoMode("none"); setPick(null); }}
              onClose={() => { setPhotoOpen(false); setPhotoMode("none"); setPick(null); }} />}
            {tool === "tree" && <PlantPicker plants={gd?.plants ?? []} selectedId={plantId} onPick={setPlantId} />}
            {selected && <PropertyPanel feature={selected} plant={selected.props.plantId ? plants[selected.props.plantId] : undefined}
              onChange={(pr) => editFeatures((fs) => fs.map((x) => (x.id === selected.id ? { ...x, props: pr } : x)))}
              wholeGuild={wholeGuild} onWholeGuild={setWholeGuild}
              onRadius={(radiusM) => editFeatures((fs) => fs.map((x) => {
                if (x.id !== selected.id || x.props.shape?.mode !== "circle") return x;
                const geometry = circlePolygon(x.props.shape.center, radiusM);
                return { ...x, geometry, props: measured(x.kind, geometry, { ...x.props, shape: { ...x.props.shape, radiusM } }) };
              }))}
              onClose={() => setSelectedId(null)} onDelete={() => del(selected.id)} />}
            {analysisOpen && <AnalysisPanel file={file} tab={tab} setTab={setTab} setAnalysis={setAnalysis}
              climate={climate} noise={noise} slope={slope} fetchClimate={doClimate} fetchNoise={doNoise} fetchSlope={doSlope}
              autoSectors={() => editFeatures((fs) => [...fs.filter((x) => !(x.kind === "sector" && x.props.auto)), ...autoSectors(file, climate.data, noise.data)])}
              addSector={(t: SectorType, from, to, range) => editFeatures((fs) => [...fs, { id: newId(), kind: "sector", geometry: { type: "Polygon", coordinates: [sectorPoly(center, from, to, range)] }, props: { sectorType: t, fromDeg: from, toDeg: to, rangeM: range } }])}
              zoneTemplate={(r) => editFeatures((fs) => [...fs, ...zoneTemplate(file, r)])}
              onSummary={() => setSummaryOpen(true)} onClose={() => setAnalysisOpen(false)} />}
            {layersOpen && <LayerPanel showSat={showSat} setShowSat={setShowSat} hidden={hidden} setHidden={setHidden}
              overlays={file.analysis?.overlays} setOverlay={(k, v) => setAnalysis({ overlays: { ...file.analysis?.overlays, [k]: v } })}
              features={file.features} selectedId={selectedId} onPick={(id) => { setTool("select"); setSelectedId(id); }} />}
            {settingsOpen && (
              <section>
                <h3>설정</h3>
                <label>북향 보정(°)
                  <input type="number" value={file.meta.northDeg}
                    onChange={(e) => setFile((f) => touch({ ...f, meta: { ...f.meta, northDeg: Number(e.target.value) || 0 } }))} />
                </label>
                <p className="hint">단위·테마는 다음 단계에서.</p>
              </section>
            )}
          </aside>
        )}
      </div>
      <StatusBar zoom={view.zoom} lon={view.lon} lat={view.lat} areaM2={file.meta.areaM2} mock={!useVworld} message={msg} />
      {summaryOpen && <SummaryModal file={file} climate={climate.data} noise={noise.data} slope={slope.data} onClose={() => setSummaryOpen(false)} />}
      {modal && (
        <BasicInfoModal
          title={modal.kind === "new" ? "새 정원 — 기본정보" : "기본정보"}
          meta={modal.kind === "new" ? emptyGarden().meta : file.meta}
          onCancel={() => setModal(null)}
          onOk={(m) => {
            if (modal.kind === "new") {
              const now = new Date().toISOString();
              setFile({ ...emptyGarden(), meta: { ...m, createdAt: now, updatedAt: now } }); hist.current.clear(); setSelectedId(null);
              mapRef.current?.flyTo(127.5, 36.2, 7);
            } else {
              setFile((f) => touch({ ...f, meta: { ...m, areaM2: f.meta.areaM2 } }));
            }
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
