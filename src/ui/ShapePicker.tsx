import { Circle, Pentagon, Square, Pencil, Spline } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ShapeMode } from "../types/garden";
export const SHAPES: [ShapeMode, LucideIcon, string, string][] = [
  ["polygon", Pentagon, "다각형", "클릭으로 점을 찍고 더블클릭으로 끝내요"],
  ["rectangle", Square, "사각형", "대각선 두 모서리를 클릭해요"],
  ["circle", Circle, "원", "중심과 가장자리를 클릭해요 · 속성에서 반경 편집"],
  ["freehand", Pencil, "자유곡선", "누른 채 드래그 후 놓아요 · 꼭짓점 자동 단순화"],
  ["smooth", Spline, "곡선", "다각형처럼 점을 찍으면 모서리를 부드럽게 해요"],
];
export default function ShapePicker({ mode, onChange }: { mode: ShapeMode; onChange: (s: ShapeMode) => void }) {
  return <div className="shape-picker" role="group" aria-label="영역 모양">{SHAPES.map(([id, Icon, name, hint]) =>
    <button key={id} type="button" aria-pressed={mode === id} title={`${name} — ${hint}`} onClick={() => onChange(id)}><Icon size={16} />{name}</button>)}</div>;
}
