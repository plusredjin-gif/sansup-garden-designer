import { MousePointer2, Pentagon, LayoutGrid, Square, Droplets, TreeDeciduous, Route, Ruler, Trash2, House, CloudSun, Flower2, ArrowDownRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import IconButton from "./IconButton";
import type { ToolId } from "../types/garden";

export const TOOLS: [ToolId, LucideIcon, string, string][] = [
  ["select", MousePointer2, "선택", "V"], ["boundary", Pentagon, "경계", "B"], ["zone", LayoutGrid, "구역", "Z"],
  ["bed", Square, "텃밭", "G"], ["pond", Droplets, "연못", "P"], ["tree", TreeDeciduous, "나무", "T"],
  ["path", Route, "길", "H"], ["measure", Ruler, "측정", "M"],
];
export const SITE_TOOLS: [ToolId, LucideIcon, string, string][] = [
  ["water-flow", ArrowDownRight, "물흐름", "W"], ["house", House, "집", "U"], ["micro", CloudSun, "미기후", "K"], ["guild", Flower2, "길드", "J"],
];
const TIP: Partial<Record<ToolId, string>> = {
  select: "선택·이동·꼭짓점 편집", boundary: "대지 외곽 폴리곤 (더블클릭 끝)", zone: "Zone 0~5 자유 폴리곤", bed: "텃밭 베드 폴리곤",
  pond: "연못 수면 폴리곤", tree: "나무 점 + 수관 반경", path: "길 선 (더블클릭 끝)", measure: "임시 거리·면적 측정",
  "water-flow": "물흐름 방향 화살표 (순서대로 클릭, 더블클릭 끝)",
  house: "집·기준점 (존 템플릿·섹터 기준)", micro: "미기후 표시 (양지·그늘·서리 등)", guild: "식물 길드 스탬프",
};

type Props = { tool: ToolId; onTool: (t: ToolId) => void; canDelete: boolean; onDelete: () => void; deleteMode: boolean };

export default function DrawToolbar({ tool, onTool, canDelete, onDelete, deleteMode }: Props) {
  const btn = ([id, icon, label, key]: (typeof TOOLS)[number]) => (
    <IconButton key={id} icon={icon} label={label} active={tool === id} tip={`${label} (${key}) — ${TIP[id]}`} onClick={() => onTool(id)} />
  );
  return (
    <aside className="drawbar" aria-label="그리기 도구">
      {TOOLS.map(btn)}
      <IconButton icon={Trash2} label="삭제" active={deleteMode}
        tip={canDelete ? "삭제 (Del) — 선택한 객체 삭제" : "삭제 (Del) — 누른 뒤 지우고 싶은 객체를 클릭"}
        onClick={() => (canDelete ? onDelete() : onTool(deleteMode ? "select" : "delete"))} />
      <div className="drawbar-sep" title="퍼머컬처 분석 도구" />
      {SITE_TOOLS.map(btn)}
    </aside>
  );
}
