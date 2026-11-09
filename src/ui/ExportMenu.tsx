import { FileImage, FileText } from "lucide-react";
import type { ExportFormat } from "../lib/exportDrawing";

type Props = { busy: boolean; onExport: (f: ExportFormat) => void; onClose: () => void; filenameBase: string };
export default function ExportMenu({ busy, onExport, onClose, filenameBase }: Props) {
  return (
    <div className="export-menu" role="menu" aria-label="내보내기" onMouseLeave={onClose}>
      <button role="menuitem" disabled={busy} title={`${filenameBase}_도면.png`} onClick={() => onExport("png")}><FileImage size={16} /> PNG 이미지</button>
      <button role="menuitem" disabled={busy} title={`${filenameBase}_도면.pdf`} onClick={() => onExport("pdf")}><FileText size={16} /> PDF (A4)</button>
      <small>현재 화면 + 그린 레이어 · 하단에 출처(브이월드) 표기 · 내 컴퓨터에만 저장</small>
    </div>
  );
}
