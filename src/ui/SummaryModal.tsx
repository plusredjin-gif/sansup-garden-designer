import { Printer, X } from "lucide-react";
import type { GardenFile } from "../types/garden";
import type { Climate } from "../lib/weather";
import type { NoiseResult } from "../lib/noise";
import type { Slope } from "../lib/analysis";
import { analysisCenter } from "../lib/analysis";
import { daySun, keyDays, hhmm } from "../lib/sun";
import { compass8, fmtM, fmtM2 } from "../lib/geo";
import { KIND_LABEL, MICRO } from "../map/drawTools";
import { SRC } from "./AnalysisPanel";
import { SECTOR_LABEL } from "./PropertyPanel";

type Props = { file: GardenFile; climate: Climate | null; noise: NoiseResult | null; slope: Slope | null; onClose: () => void };

export default function SummaryModal({ file, climate, noise, slope, onClose }: Props) {
  const { pt: c, from } = analysisCenter(file);
  const fs = file.features, a = file.analysis ?? {};
  const kinds = [...new Set(fs.map((f) => f.kind))];
  const y = new Date().getFullYear();
  const ids = a.catchmentIds ?? [], coef = a.runoffCoef ?? 0.8;
  const catch_ = (a.roofAreaM2 ?? 0) + fs.filter((f) => ids.includes(f.id)).reduce((s, f) => s + (f.props.areaM2 ?? 0), 0);
  const soils = fs.filter((f) => f.props.soil);
  return (
    <div className="modal-back print-root" onMouseDown={onClose}>
      <div className="modal summary" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head no-print">
          <h2>분석 요약</h2>
          <div><button className="btn primary" onClick={() => window.print()}><Printer size={14} /> 인쇄</button> <button className="x" onClick={onClose}><X size={18} /></button></div>
        </div>
        <h1>{file.meta.name || "이름없는정원"} — 대지 분석 요약</h1>
        <p>{file.meta.author && `작성 ${file.meta.author} · `}{file.meta.addressText ?? ""} · 기준점 {from} ({c[1].toFixed(5)}, {c[0].toFixed(5)}) · {new Date().toLocaleDateString("ko-KR")}</p>
        <h3>도면</h3>
        <table className="tbl"><thead><tr><th>종류</th><th>개수</th><th>면적/길이 합</th></tr></thead><tbody>
          {kinds.map((k) => { const g = fs.filter((f) => f.kind === k); const ar = g.reduce((s, f) => s + (f.props.areaM2 ?? 0), 0), ln = g.reduce((s, f) => s + (f.props.lengthM ?? 0), 0);
            return <tr key={k}><td>{KIND_LABEL[k]}</td><td>{g.length}</td><td>{ar ? fmtM2(ar) : ln ? fmtM(ln) : "-"}</td></tr>; })}
        </tbody></table>
        {fs.some((f) => f.kind === "zone") && <p>구역: {fs.filter((f) => f.kind === "zone").map((z) => `Zone ${z.props.zone}${z.props.name ? `(${z.props.name})` : ""} ${fmtM2(z.props.areaM2)}`).join(" · ")}</p>}
        <h3>일조 <small>({SRC.sun})</small></h3>
        <table className="tbl"><thead><tr><th></th><th>일출</th><th>일몰</th><th>낮 길이</th><th>남중고도</th></tr></thead><tbody>
          {keyDays(y).map(({ name, d }) => { const s = daySun(d, c[1], c[0]); return <tr key={name}><td>{name}</td><td>{hhmm(s.sunrise)}</td><td>{hhmm(s.sunset)}</td><td>{s.dayLenH.toFixed(1)}h</td><td>{s.noonAlt.toFixed(0)}°</td></tr>; })}
        </tbody></table>
        <h3>기상·물 <small>({SRC.climate})</small></h3>
        {climate ? (
          <>
            <p>{climate.years[0]}~{climate.years[1]} 평균 연 강수량 {climate.annualPrecipMm} mm · 주풍향 {climate.prevailing.dir} {climate.prevailing.pct}% · 서리 위험 달 {climate.months.filter((m) => m.frostDays >= 3).map((m) => `${m.m}월`).join(" ") || "없음"}</p>
            <p>월 강수량(mm): {climate.months.map((m) => `${m.m}월 ${m.precipMm}`).join(", ")}</p>
            {catch_ > 0 && <p>빗물: 집수 {fmtM2(catch_)} × 유출계수 {coef} → 연 약 {(catch_ * climate.annualPrecipMm / 1000 * coef).toFixed(1)} ㎥ (최대치, 계산값)</p>}
          </>
        ) : <p className="dim">기상 자료를 아직 불러오지 않았어요 (분석 → 기상·빗물).</p>}
        <h3>소음 <small>({SRC.noise})</small></h3>
        {noise ? <p>추정 등급 <b>{noise.level}</b> — {noise.reason}</p> : <p className="dim">불러오지 않음.</p>}
        <h3>경사·물흐름 <small>({SRC.elev})</small></h3>
        {slope ? <p>고도 {slope.center} m · 경사 {slope.slopePct}% · 내리막 {compass8(slope.downhillDeg)} ({slope.downhillDeg}°) · 스웨일 후보는 등고선 방향(추정)</p> : <p className="dim">불러오지 않음.</p>}
        <h3>섹터</h3>
        <p>{fs.filter((f) => f.kind === "sector").map((s) => `${SECTOR_LABEL[s.props.sectorType ?? "other"]} ${s.props.fromDeg}°→${s.props.toDeg}°${s.props.auto ? "(자동)" : "(직접)"}`).join(" · ") || "-"}</p>
        <h3>미기후 (직접 표시)</h3>
        <p>{fs.filter((f) => f.kind === "micro").map((m) => `${MICRO[m.props.microType ?? "sunny"].label}${m.props.name ? `: ${m.props.name}` : ""}`).join(" · ") || "-"}</p>
        <h3>토양 (직접 기록)</h3>
        <p>{soils.map((f) => `${f.props.name || KIND_LABEL[f.kind]}: ${f.props.soil}`).join(" · ") || "-"}</p>
        <h3>식물·길드</h3>
        <p>{[...new Set(fs.filter((f) => f.props.guildId).map((f) => f.props.guildId))].length}개 길드 스탬프 · 식물 점 {fs.filter((f) => f.kind === "plant").length}개 (조합·거리·개수는 자료상 추정)</p>
        <p className="src">지도: 브이월드(국토교통부). 위성 화면은 파일에 저장하지 않아요.</p>
      </div>
    </div>
  );
}
