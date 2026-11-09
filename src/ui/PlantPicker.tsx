import { useState } from "react";
import { Search } from "lucide-react";
import type { Plant } from "../lib/guilds";
import { fmtNum } from "../lib/guilds";
import { PlantCard } from "./PropertyPanel";
export function matchingPlants(plants: Plant[], query: string): Plant[] {
  return plants.filter((p) => p.ko.replace(/\s/g, "").includes(query.replace(/\s/g, "")));
}
export function plantingProps(plant?: Plant) {
  return plant ? { plantId: plant.id, label: plant.ko, canopyM: plant.width_m == null ? undefined : plant.width_m / 2, heightM: plant.height_m ?? undefined }
    : { canopyM: 2, heightM: 4 };
}
export default function PlantPicker({ plants, selectedId, onPick }: { plants: Plant[]; selectedId: string; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const selected = plants.find((p) => p.id === selectedId);
  const matches = matchingPlants(plants, query);
  return <section className="plant-picker" aria-label="식물 선택">
    <h3>나무·식물 선택 <small>{plants.length}종</small></h3>
    <label className="plant-search"><Search size={16} /><input aria-label="한국 이름 검색" placeholder="한국 이름 검색" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
    <div className="plant-options" role="group" aria-label="식물 목록">
      <button type="button" aria-pressed={!selectedId} onClick={() => onPick("")}>직접 입력 (반경 2m·높이 4m 임시값)</button>
      {matches.map((p) => <button type="button" key={p.id} aria-pressed={selectedId === p.id} onClick={() => onPick(p.id)}>
        <b>{p.ko}</b> · 폭 {fmtNum(p.width_m, "m")} {p.estimated.length > 0 && <span className="est">추정</span>}
        {p.region.includes("남부") && <span className="tag south">남부형</span>}
      </button>)}
      {!matches.length && <p>검색 결과가 없어요</p>}
    </div>
    {selected && <PlantCard pl={selected} />}
    <p className="hint">식물 선택 후 지도 클릭 · 수관 반경 = 자료 폭 ÷ 2. 폭이 없으면 작은 표식으로만 표시하며 현장 확인이 필요해요.</p>
  </section>;
}
