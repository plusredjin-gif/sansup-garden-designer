import { X } from "lucide-react";
import type { FeatureProps, GardenFeature, MicroType, SectorType } from "../types/garden";
import { KIND_LABEL, MICRO, ZONE_COLORS, colorOf } from "../map/drawTools";
import { fmtM, fmtM2 } from "../lib/geo";
import { FIELD_KO, fmtNum, type Plant } from "../lib/guilds";

export const SECTOR_LABEL: Record<SectorType, string> = {
  "sun-summer": "여름 해", "sun-winter": "겨울 해", wind: "계절풍", noise: "소음", view: "시선·조망",
  fire: "산불·화재 위험", wildlife: "야생동물", "cold-air": "냉기 유입", other: "기타",
};

type Props = { plant?: Plant; feature: GardenFeature; onChange: (p: FeatureProps) => void; onClose: () => void; onDelete: () => void; onRadius: (radius: number) => void; wholeGuild: boolean; onWholeGuild: (v: boolean) => void };

export default function PropertyPanel({ plant, feature: f, onChange, onClose, onDelete, onRadius, wholeGuild, onWholeGuild }: Props) {
  const p = f.props;
  const set = <K extends keyof FeatureProps>(k: K, v: FeatureProps[K]) => onChange({ ...p, [k]: v });
  const num = (k: "canopyM" | "heightM" | "widthM", label: string, step = 0.5) => (
    <label>{label}<input type="number" min={0} step={step} value={p[k] ?? ""} onChange={(e) => set(k, e.target.value === "" ? undefined : Number(e.target.value))} /></label>
  );
  return (
    <aside className="props" aria-label="속성">
      <div className="props-head">
        <h3>속성 · {KIND_LABEL[f.kind]}</h3>
        <button className="x" title="닫기 (Esc)" onClick={onClose}><X size={16} /></button>
      </div>
      {f.kind === "tree" || f.kind === "plant"
        ? <label>이름·식물<input value={p.label ?? ""} placeholder="예: 사과나무" onChange={(e) => set("label", e.target.value)} /></label>
        : f.kind === "sector"
          ? <label>라벨<input value={p.label ?? ""} onChange={(e) => set("label", e.target.value)} /></label>
          : <label>이름<input value={p.name ?? ""} placeholder={KIND_LABEL[f.kind]} onChange={(e) => set("name", e.target.value)} /></label>}
      {f.kind === "zone" && (
        <label>존 번호
          <div className="zone-pick">
            {[0, 1, 2, 3, 4, 5].map((z) => (
              <button key={z} type="button" className={p.zone === z ? "on" : ""} style={{ background: ZONE_COLORS[z] }}
                title={`Zone ${z}`} onClick={() => set("zone", z as FeatureProps["zone"])}>{z}</button>
            ))}
          </div>
        </label>
      )}
      {f.kind === "micro" && (
        <label>미기후 종류
          <select value={p.microType ?? "sunny"} onChange={(e) => set("microType", e.target.value as MicroType)}>
            {Object.entries(MICRO).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
          </select>
        </label>
      )}
      {f.kind === "sector" && (
        <>
          <label>섹터 종류
            <select value={p.sectorType ?? "other"} onChange={(e) => set("sectorType", e.target.value as SectorType)}>
              {Object.entries(SECTOR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="row2">
            <label>시작 방위°<input type="number" value={p.fromDeg ?? 0} onChange={(e) => set("fromDeg", Number(e.target.value))} /></label>
            <label>끝 방위°<input type="number" value={p.toDeg ?? 0} onChange={(e) => set("toDeg", Number(e.target.value))} /></label>
          </div>
          {p.auto && <p className="hint">분석에서 자동으로 만든 섹터예요.</p>}
        </>
      )}
      {f.kind === "tree" && <div className="row2">{num("canopyM", "수관 반경 m")}{num("heightM", "높이 m")}</div>}
      {f.kind === "path" && num("widthM", "폭 m", 0.1)}
      {f.kind === "plant" && p.role && <p className="hint">길드 역할: {p.role}</p>}
      {plant && <PlantCard pl={plant} />}
      {p.guildId && <label><input type="checkbox" checked={wholeGuild} onChange={(e) => onWholeGuild(e.target.checked)} />길드 전체 함께 이동 (끄면 선택한 식물만)</label>}
      {p.shape?.mode === "circle" && <label>원 반경 m<input type="number" min={0.1} step={0.5} value={Math.round(p.shape.radiusM * 100) / 100} onChange={(e) => { const radius = Number(e.target.value); if (Number.isFinite(radius) && radius > 0) onRadius(radius); }} /></label>}
      {f.geometry.type === "Polygon" && <p className="hint">드래그: 이동 · Alt+드래그: 꼭짓점 편집 (원은 일반 다각형으로 전환)</p>}
      {f.geometry.type === "Polygon" && <div className="measure-row">면적 <b>{fmtM2(p.areaM2)}</b></div>}
      {(f.kind === "path" || f.kind === "water-flow") && <div className="measure-row">길이 <b>{fmtM(p.lengthM)}</b></div>}
      <label>색<input type="color" value={colorOf(f.kind, p)} onChange={(e) => set("color", e.target.value)} /></label>
      {(f.geometry.type === "Polygon") && f.kind !== "sector" && (
        <label>토양 메모<input value={p.soil ?? ""} placeholder="예: 점토질, 배수 나쁨 (직접 관찰)" onChange={(e) => set("soil", e.target.value)} /></label>
      )}
      <label>메모<textarea rows={3} value={p.note ?? ""} onChange={(e) => set("note", e.target.value)} /></label>
      <button className="btn danger" onClick={onDelete}>삭제</button>
    </aside>
  );
}

const Est = ({ on }: { on: boolean }) => (on ? <span className="est" title="자료에서 추정값으로 표시된 항목">추정</span> : null);

export function PlantCard({ pl }: { pl: Plant }) {
  const e = (k: string) => pl.estimated.includes(k);
  return (
    <div className="plant-card">
      <b>{pl.ko}</b> <i>{pl.sci}</i>
      <div>층위: {pl.layer} · 지역: {pl.region} <Est on={e("region")} /></div>
      <div>높이 {fmtNum(pl.height_m, "m")} <Est on={e("height_m")} /> · 폭 {fmtNum(pl.width_m, "m")} <Est on={e("width_m")} /></div>
      <div>간격 {fmtNum(pl.spacing_m, "m")} <Est on={e("spacing_m")} /> · 햇빛 {pl.sun.join("/") || "정보 없음"} <Est on={e("sun")} /></div>
      <div>내한성 {pl.hardiness ?? "정보 없음"} <Est on={e("hardiness")} /> <small>(PFAF UK zone, USDA 아님)</small></div>
      <div>기능: {pl.functions.join(", ")} <Est on={e("functions")} /></div>
      {pl.estimated.length > 0 && <small className="dim">추정 항목: {pl.estimated.map((k) => FIELD_KO[k] ?? k).join(", ")}</small>}
      <details><summary>출처</summary><ul>{pl.sources.map((s) => <li key={s}>{s}</li>)}</ul></details>
    </div>
  );
}
