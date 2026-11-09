/** 식물·길드 자료. 파일: public/data/plant_guilds.json (원본: /workspace/permaculture-garden/data/plant_guilds.json)
 *  값 일부는 추정 — 식물별 `estimated` 필드에 추정 항목 이름이 들어 있음. hardiness 는 PFAF UK zone 표기(USDA 아님). */
export type Plant = {
  id: string; ko: string; sci: string; layer: string;
  height_m: number | null; width_m: number | null;
  sun: string[]; hardiness: string | null; region: string;
  functions: string[]; spacing_m: number | null; sources: string[]; estimated: string[];
};
export type GuildMember = { plant: string; role: string; ring_m: number; count_hint: number; note?: string };
export type Guild = { id: string; name: string; center: string; region: string; members: GuildMember[]; sources: string[]; estimated: string[]; note?: string };
export type PlantGuildData = { version: string; generated: string; note: string; plants: Plant[]; guilds: Guild[] };

/** 검증 전 경고가 필요한 길드 (호두: 주글론 타감작용) */
export const UNVERIFIED_GUILDS: Record<string, string> = {
  guild_hodu: "검증 전 — 호두류는 주글론(타감작용)으로 주변 식물 생육을 억제할 수 있어요. 반드시 현장 시험 후 쓰세요.",
};

export const FIELD_KO: Record<string, string> = {
  height_m: "높이", width_m: "폭", hardiness: "내한성", region: "지역", spacing_m: "간격", sun: "햇빛", functions: "기능", layer: "층위",
  members: "구성", ring_m: "거리", count_hint: "개수",
};

let cache: Promise<PlantGuildData> | null = null;
export function loadGuildData(): Promise<PlantGuildData> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/plant_guilds.json`).then((r) => {
    if (!r.ok) throw new Error("식물 길드 자료를 못 읽었어요");
    return r.json();
  });
  return cache;
}

export const fmtNum = (v: number | null | undefined, unit: string) => (v == null ? "정보 없음" : `${v}${unit}`);
