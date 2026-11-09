import type { AnalysisSettings, FeatureKind, GardenFeature } from "../types/garden";
import { KIND_LABEL } from "../map/drawTools";

const KINDS: FeatureKind[] = ["boundary", "zone", "bed", "pond", "tree", "path", "house", "micro", "plant", "sector", "water-flow"];
type OvKey = keyof NonNullable<AnalysisSettings["overlays"]>;
const OVS: [OvKey, string][] = [["sun", "해 방향"], ["shade", "그늘 부채 (예시)"], ["wind", "바람장미"], ["noise", "소음(도로)"], ["slope", "물흐름·경사"]];

type Props = {
  showSat: boolean; setShowSat: (v: boolean) => void;
  hidden: string[]; setHidden: (h: string[]) => void;
  overlays: AnalysisSettings["overlays"]; setOverlay: (k: OvKey, v: boolean) => void;
  features: GardenFeature[]; selectedId: string | null; onPick: (id: string) => void;
};

export default function LayerPanel(p: Props) {
  const ov = p.overlays ?? {};
  return (
    <section>
      <h3>레이어</h3>
      <label><input type="checkbox" checked={p.showSat} onChange={(e) => p.setShowSat(e.target.checked)} /> 위성</label>
      <label><input type="checkbox" checked={!["tree", "plant"].some((k) => p.hidden.includes(k))} onChange={(e) => p.setHidden(e.target.checked ? p.hidden.filter((k) => k !== "tree" && k !== "plant") : [...new Set([...p.hidden, "tree", "plant"])])} /> 식물 전체 (나무·길드 식물)</label>
      {KINDS.map((k) => {
        const n = p.features.filter((f) => f.kind === k).length;
        return (
          <label key={k}><input type="checkbox" checked={!p.hidden.includes(k)}
            onChange={(e) => p.setHidden(e.target.checked ? p.hidden.filter((x) => x !== k) : [...p.hidden, k])} /> {KIND_LABEL[k]} <small className="dim">{n || ""}</small></label>
        );
      })}
      <h3>분석 겹쳐보기</h3><p className="hint">해·그늘은 북향 보정을 반영한 설명용 예시이며 정밀 시뮬레이션이 아니에요.</p>
      {OVS.map(([k, l]) => <label key={k}><input type="checkbox" checked={!!ov[k]} onChange={(e) => p.setOverlay(k, e.target.checked)} /> {l}</label>)}
      <h3>목록</h3>
      <ul className="list">
        {p.features.filter((f) => f.kind !== "plant").map((f) => (
          <li key={f.id} className={f.id === p.selectedId ? "on" : ""} onClick={() => p.onPick(f.id)}>
            {f.kind === "zone" ? `Zone ${f.props.zone}` : KIND_LABEL[f.kind]} {f.props.name || f.props.label || ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
