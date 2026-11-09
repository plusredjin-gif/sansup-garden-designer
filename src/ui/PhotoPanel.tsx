import { Crosshair, ImageUp, Maximize, Move, X } from "lucide-react";
import type { PhotoCrs, PhotoPlacement } from "../types/garden";
import { CRS_LABEL, PHOTO_LIMITS, fmtRes } from "../lib/photo";

export type PickStep = { img: [number, number][]; map: [number, number][] } | null;
type Props = {
  photo: PhotoPlacement | undefined;
  display: { width: number; height: number } | null;
  missing: boolean;
  busy: boolean;
  mode: "none" | "move" | "pick";
  pick: PickStep;
  hasWorldFile: boolean;
  onFiles: (files: File[]) => void;
  onChange: (p: Partial<PhotoPlacement>) => void;
  onScale: (k: number) => void;
  onFit: () => void;
  onMode: (m: "none" | "move" | "pick") => void;
  onCrs: (c: PhotoCrs) => void;
  onRemove: () => void;
  onClose: () => void;
};

const ACCEPT = "image/jpeg,image/png,.jpg,.jpeg,.png,.jgw,.pgw,.jpgw,.pngw,.wld,.tif,.tiff";
const SRC: Record<PhotoPlacement["source"], string> = { manual: "직접 배치", worldfile: "월드파일 좌표", "2point": "2점 정렬" };

export default function PhotoPanel(p: Props) {
  const ph = p.photo;
  const input = (label: string) => (
    <label className="btn photo-upload"><ImageUp size={16} /> {label}
      <input type="file" accept={ACCEPT} multiple hidden aria-label={label} onChange={(e) => { const fs = [...(e.target.files ?? [])]; e.target.value = ""; if (fs.length) p.onFiles(fs); }} />
    </label>
  );
  const pickHint = () => {
    const s = p.pick; if (!s) return "";
    if (s.img.length < 2) return `사진 위 기준점 ${s.img.length + 1}/2 을 클릭하세요 (예: 건물 모서리)`;
    return `그 점의 실제 지도 위치 ${s.map.length + 1}/2 를 클릭하세요 (사진 투명도를 낮추면 쉬워요)`;
  };
  return (
    <section className="photo-panel" aria-label="배경 사진">
      <div className="props-head"><h3>배경 사진</h3><button className="x" title="닫기" onClick={p.onClose}><X size={16} /></button></div>
      {!ph && <>
        {input("사진 올리기")}
        <p className="hint">JPG/PNG 항공·드론·지도 사진. 같은 이름의 월드파일(.jgw/.pgw)을 함께 고르면 좌표대로 놓여요. 없으면 지금 화면에 맞춰 놓고 이동·크기·회전·2점 정렬로 맞춰요.</p>
        <p className="hint">한도: 파일 {PHOTO_LIMITS.maxFileBytes / 1048576}MB, 화면용은 {(PHOTO_LIMITS.maxDisplayPixels / 1e4).toLocaleString()}만 화소 넘으면 자동 축소. GeoTIFF(.tif)는 아직 못 읽어요 → JPG+월드파일로 변환해 주세요 (예: <code>gdal_translate -of JPEG -co WORLDFILE=YES</code>).</p>
        <p className="hint">사진은 이 브라우저(IndexedDB)에만 저장되고 서버로 보내지 않아요.</p>
      </>}
      {p.busy && <p className="hint">사진 읽는 중…</p>}
      {ph && <>
        <div className="kv"><span>파일</span><b title={ph.name}>{ph.name}</b></div>
        <div className="kv"><span>원본</span><b>{ph.widthPx.toLocaleString()}×{ph.heightPx.toLocaleString()} px{ph.fileBytes ? ` · ${(ph.fileBytes / 1048576).toFixed(1)}MB` : ""}</b></div>
        {p.display && p.display.width < ph.widthPx && <div className="kv"><span>화면용</span><b>{p.display.width}×{p.display.height} px (축소)</b></div>}
        <div className="kv"><span>지상 해상도</span><b data-testid="photo-res">{fmtRes(ph.mPerPx)}</b></div>
        <div className="kv"><span>배치</span><b>{SRC[ph.source]}{ph.crs ? ` · ${CRS_LABEL[ph.crs]}` : ""}</b></div>
        {p.missing && <div className="warn">⚠ 이 브라우저에 사진 원본이 없어요. 배치값만 있어요 — 같은 사진({ph.name})을 다시 연결하세요.{input("사진 다시 연결")}</div>}
        {ph.source === "worldfile" && p.hasWorldFile && (
          <label>월드파일 좌표계
            <select value={ph.crs} onChange={(e) => p.onCrs(e.target.value as PhotoCrs)}>
              {Object.entries(CRS_LABEL).map(([k, v]) => <option key={k} value={k}>{k} {v}</option>)}
            </select>
          </label>
        )}
        <label><input type="checkbox" checked={ph.visible} onChange={(e) => p.onChange({ visible: e.target.checked })} /> 사진 보이기</label>
        <label><input type="checkbox" checked={!!ph.hideSatellite} onChange={(e) => p.onChange({ hideSatellite: e.target.checked })} /> 위성(브이월드) 숨기고 사진만</label>
        <label>투명도 {Math.round(ph.opacity * 100)}%
          <input type="range" min={0.1} max={1} step={0.05} value={ph.opacity} aria-label="사진 투명도" onChange={(e) => p.onChange({ opacity: Number(e.target.value) })} />
        </label>
        <label>회전 {ph.rotationDeg.toFixed(1)}°
          <input type="range" min={-180} max={180} step={0.5} value={ph.rotationDeg} aria-label="사진 회전" onChange={(e) => p.onChange({ rotationDeg: Number(e.target.value), source: "manual" })} />
        </label>
        <div className="row2">
          <label>해상도 m/px<input type="number" min={0.001} step={0.001} value={Number(ph.mPerPx.toFixed(4))} aria-label="사진 해상도 m/px" onChange={(e) => { const v = Number(e.target.value); if (v > 0) p.onChange({ mPerPx: v, source: "manual" }); }} /></label>
          <div className="btn-row"><button className="btn" title="5% 작게" onClick={() => p.onScale(0.95)}>－</button><button className="btn" title="5% 크게" onClick={() => p.onScale(1.05)}>＋</button></div>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={p.onFit} title="지금 보이는 화면에 맞추기"><Maximize size={14} /> 화면에 맞추기</button>
          <button className={`btn ${p.mode === "move" ? "on" : ""}`} onClick={() => p.onMode(p.mode === "move" ? "none" : "move")} title="지도를 끌면 사진이 움직여요"><Move size={14} /> {p.mode === "move" ? "이동 끝" : "끌어서 이동"}</button>
          <button className={`btn ${p.mode === "pick" ? "on" : ""}`} onClick={() => p.onMode(p.mode === "pick" ? "none" : "pick")} title="사진의 두 점과 실제 지도 두 점을 차례로 클릭"><Crosshair size={14} /> {p.mode === "pick" ? "정렬 취소" : "2점 정렬"}</button>
        </div>
        {p.mode === "pick" && <p className="hint pick-hint">{pickHint()}</p>}
        {p.mode === "move" && <p className="hint">지도를 끌어 사진을 옮기세요. 끝나면 '이동 끝'.</p>}
        <div className="btn-row">{input("사진 바꾸기")}<button className="btn" onClick={p.onRemove} title="도면에서 사진 연결만 빼요 (원본 파일은 그대로)">도면에서 빼기</button></div>
        <p className="hint">사진이 있으면 지도를 더 확대할 수 있어요 (축척 0.5 m 이하). 위성 타일은 최대 해상도에서 늘려 보여요.</p>
      </>}
    </section>
  );
}
