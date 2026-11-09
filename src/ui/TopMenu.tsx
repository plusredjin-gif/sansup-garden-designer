import { FilePlus, FolderOpen, Save, FileDown, Info, Search, Scan, Undo2, Redo2, Layers, Settings, BarChart3, ClipboardList, ImageUp } from "lucide-react";
import IconButton from "./IconButton";
import BrandLogo, { APP_TITLE } from "./BrandLogo";

type Props = {
  name: string;
  author?: string;
  saveState: string;
  areaMode: boolean;
  searchOpen: boolean;
  layersOpen: boolean;
  settingsOpen: boolean;
  mock: boolean;
  canUndo: boolean; canRedo: boolean; analysisOpen: boolean; exportOpen?: boolean; photoOpen?: boolean; account?: React.ReactNode; onHome?: () => void; exportMenu?: React.ReactNode;
  on: {
    newGarden: () => void; open: () => void; save: () => void; info: () => void;
    search: () => void; area: () => void; layers: () => void; settings: () => void;
    undo: () => void; redo: () => void; analysis: () => void; summary: () => void; export: () => void; photo: () => void;
  };
};

const Sep = () => <div className="sep" />;

export default function TopMenu(p: Props) {
  return (
    <header className="topbar">
      <a className="brand" href="/" onClick={(e) => { if (p.onHome) { e.preventDefault(); p.onHome(); } }} title="첫 화면으로"><BrandLogo height={24} /> <span>{APP_TITLE}</span></a>
      <nav className="menu">
        <div className="group" aria-label="파일">
          <IconButton icon={FilePlus} label="새 정원" shortcut="Ctrl+N" onClick={p.on.newGarden} />
          <IconButton icon={FolderOpen} label="열기" shortcut="Ctrl+O" onClick={p.on.open} />
          <IconButton icon={Save} label="저장" shortcut="Ctrl+S" onClick={p.on.save} />
          <span className="export-wrap"><IconButton icon={FileDown} label="내보내기" shortcut="Ctrl+E" active={p.exportOpen} tip="내보내기 (Ctrl+E) — PNG / PDF" onClick={p.on.export} />{p.exportMenu}</span>
        </div>
        <Sep />
        <div className="group" aria-label="장소">
          <IconButton icon={Info} label="기본정보" shortcut="Ctrl+I" onClick={p.on.info} />
          <IconButton icon={Search} label="주소검색" shortcut="Ctrl+K" active={p.searchOpen} onClick={p.on.search} />
          <IconButton icon={Scan} label="영역지정" shortcut="Ctrl+B" active={p.areaMode} onClick={p.on.area} />
        </div>
        <Sep />
        <div className="group" aria-label="편집">
          <IconButton icon={Undo2} label="되돌리기" shortcut="Ctrl+Z" disabled={!p.canUndo} onClick={p.on.undo} />
          <IconButton icon={Redo2} label="다시하기" shortcut="Ctrl+Y" disabled={!p.canRedo} onClick={p.on.redo} />
        </div>
        <Sep />
        <div className="group" aria-label="분석">
          <IconButton icon={BarChart3} label="분석" shortcut="A" active={p.analysisOpen} onClick={p.on.analysis} />
          <IconButton icon={ClipboardList} label="분석 요약" tip="분석 요약 — 인쇄용" onClick={p.on.summary} />
        </div>
        <Sep />
        <div className="group" aria-label="보기">
          <IconButton icon={ImageUp} label="배경 사진" active={p.photoOpen} tip="배경 사진 — 고해상도 항공·드론 사진 올리기·맞추기" onClick={p.on.photo} />
          <IconButton icon={Layers} label="레이어" shortcut="L" active={p.layersOpen} onClick={p.on.layers} />
          <IconButton icon={Settings} label="설정" shortcut="," active={p.settingsOpen} onClick={p.on.settings} />
        </div>
      </nav>
      <div className="title-area">
        {p.mock && <span className="badge-mock" title="VITE_VWORLD_KEY가 없어 Esri 위성과 데모 검색을 씁니다">목업: 브이월드 키 없음</span>}
        <span className="garden-name">{p.name || "이름없는정원"}{p.author ? ` · ${p.author}` : ""}</span>
        <span className="save-state">{p.saveState}</span>
        {p.account}
      </div>
    </header>
  );
}
