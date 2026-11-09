import Mascot from "./Mascot";
import { useState } from "react";
import { X } from "lucide-react";
import type { GardenFile } from "../types/garden";

type Meta = GardenFile["meta"];
type Props = {
  title: string;
  meta: Meta;
  onCancel: () => void;
  onOk: (m: Meta) => void;
};

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR") : "-");

export default function BasicInfoModal({ title, meta, onCancel, onOk }: Props) {
  const [m, setM] = useState<Meta>({ ...meta });
  const set = <K extends keyof Meta>(k: K, v: Meta[K]) => setM((s) => ({ ...s, [k]: v }));
  const ok = m.name.trim().length > 0;
  return (
    <div className="modal-back" onMouseDown={onCancel}>
      <form
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (ok) onOk({ ...m, name: m.name.trim() }); }}
      >
        <div className="modal-head"><h2><Mascot pose="wave" size={48} className="modal-mascot" />{title}</h2><button type="button" className="x" onClick={onCancel} title="닫기 (Esc)"><X size={18} /></button></div>
        <label>정원 이름 <b className="req">*</b>
          <input autoFocus value={m.name} onChange={(e) => set("name", e.target.value)} placeholder="예: 햇살 텃밭" />
        </label>
        <label>작성자<input value={m.author ?? ""} onChange={(e) => set("author", e.target.value)} /></label>
        <div className="row2">
          <label>작성일<input readOnly value={fmt(m.createdAt)} /></label>
          <label>수정일<input readOnly value={fmt(m.updatedAt)} /></label>
        </div>
        <label>주소/지번<input value={m.addressText ?? ""} onChange={(e) => set("addressText", e.target.value)} placeholder="주소검색으로 자동 입력" /></label>
        <label>면적(㎡)<input readOnly value={m.areaM2 != null ? m.areaM2.toLocaleString("ko-KR") + " ㎡ (영역 기준)" : "경계 없음"} /></label>
        <label>목적·메모<textarea rows={3} value={m.purpose ?? ""} onChange={(e) => set("purpose", e.target.value)} /></label>
        <div className="row2">
          <label>기후대/지역 (선택)<input value={m.climateZone ?? ""} onChange={(e) => set("climateZone", e.target.value)} placeholder="예: 온대 중부" /></label>
          <label>북향 보정(°)<input type="number" value={m.northDeg} onChange={(e) => set("northDeg", Number(e.target.value) || 0)} /></label>
        </div>
        {!ok && <p className="hint">정원 이름을 넣어야 확인할 수 있어요.</p>}
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onCancel}>취소</button>
          <button type="submit" className="btn primary" disabled={!ok}>확인</button>
        </div>
      </form>
    </div>
  );
}
