import { useState } from "react";
import { Sun, CloudRain, Volume2, Mountain, Compass, X, Printer, Loader2 } from "lucide-react";
import type { AnalysisSettings, GardenFile, SectorType } from "../types/garden";
import type { Climate } from "../lib/weather";
import type { NoiseResult } from "../lib/noise";
import type { Slope } from "../lib/analysis";
import { analysisCenter, analysisDate, defaultDate } from "../lib/analysis";
import { daySun, keyDays, monthly, sunPos, hhmm } from "../lib/sun";
import { compass8, fmtM2 } from "../lib/geo";
import { SECTOR_LABEL } from "./PropertyPanel";
import { KIND_LABEL } from "../map/drawTools";

export type Tab = "sun" | "climate" | "noise" | "slope" | "sector";
type Async<T> = { data: T | null; loading: boolean; error?: string };
type Props = {
  file: GardenFile;
  tab: Tab; setTab: (t: Tab) => void;
  setAnalysis: (a: Partial<AnalysisSettings>) => void;
  climate: Async<Climate>; noise: Async<NoiseResult>; slope: Async<Slope>;
  fetchClimate: () => void; fetchNoise: () => void; fetchSlope: () => void;
  autoSectors: () => void; addSector: (t: SectorType, from: number, to: number, range: number) => void;
  zoneTemplate: (radii: number[]) => void;
  onSummary: () => void; onClose: () => void;
};

export const SRC = {
  sun: "천문 계산(suncalc 공식) · 계산값 — 지형·건물 차폐 미반영",
  climate: "Open-Meteo 과거기상 API (ERA5 재분석, CC BY 4.0) · 격자 재분석값, 관측소 실측 아님",
  elev: "Open-Meteo 고도 API (Copernicus DEM GLO-90, 약 90m 격자) · 추정",
  noise: "© OpenStreetMap 기여자 (Overpass API) · 도로 종류×거리 기반 추정, dB 아님",
};

const TABS: [Tab, typeof Sun, string][] = [["sun", Sun, "일조"], ["climate", CloudRain, "기상·빗물"], ["noise", Volume2, "소음"], ["slope", Mountain, "경사·물"], ["sector", Compass, "섹터·존"]];
const Src = ({ t }: { t: string }) => <p className="src">출처: {t}</p>;
const Btn = ({ loading, onClick, children }: { loading: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button className="btn" disabled={loading} onClick={onClick}>{loading && <Loader2 size={14} className="spin" />} {children}</button>
);

export default function AnalysisPanel(p: Props) {
  const a = p.file.analysis ?? {}, ov = a.overlays ?? {};
  const { pt: c, from } = analysisCenter(p.file);
  const setOv = (k: keyof NonNullable<AnalysisSettings["overlays"]>, v: boolean) => p.setAnalysis({ overlays: { ...ov, [k]: v } });
  const Toggle = ({ k, label }: { k: keyof NonNullable<AnalysisSettings["overlays"]>; label: string }) => (
    <label className="chk"><input type="checkbox" checked={!!ov[k]} onChange={(e) => setOv(k, e.target.checked)} /> {label}</label>
  );
  return (
    <aside className="analysis" aria-label="분석">
      <div className="props-head">
        <h3>분석 <small>기준점: {from} ({c[1].toFixed(4)}, {c[0].toFixed(4)})</small></h3>
        <div>
          <button className="x" title="분석 요약 (인쇄)" onClick={p.onSummary}><Printer size={16} /></button>
          <button className="x" title="닫기" onClick={p.onClose}><X size={16} /></button>
        </div>
      </div>
      <div className="tabs">
        {TABS.map(([id, Icon, label]) => (
          <button key={id} className={p.tab === id ? "on" : ""} title={label} onClick={() => p.setTab(id)}><Icon size={16} /> {label}</button>
        ))}
      </div>
      {p.tab === "sun" && <SunTab {...p} c={c} Toggle={Toggle} />}
      {p.tab === "climate" && <ClimateTab {...p} Toggle={Toggle} />}
      {p.tab === "noise" && (
        <section>
          <Btn loading={p.noise.loading} onClick={p.fetchNoise}>주변 도로·철도 불러오기 (반경 600m)</Btn>
          {p.noise.error && <p className="hint err">{p.noise.error}</p>}
          {p.noise.data && (
            <>
              <div className={`level lv-${p.noise.data.level}`}>소음 노출 추정: <b>{p.noise.data.level}</b></div>
              <p className="hint">가장 큰 요인: {p.noise.data.reason}</p>
              <table className="tbl"><thead><tr><th>종류</th><th>이름</th><th>거리</th><th>방향</th></tr></thead>
                <tbody>{p.noise.data.roads.slice(0, 8).map((r, i) => <tr key={i}><td>{r.label}</td><td>{r.name ?? "-"}</td><td>{r.distM}m</td><td>{compass8(r.bearing)}</td></tr>)}</tbody></table>
              {!p.noise.data.roads.length && <p className="hint">반경 안에 큰 도로·철도가 없어요.</p>}
              <Toggle k="noise" label="지도에 도로·거리띠(50/150/300m) 표시" />
              <p className="hint">등급 기준(추정): 도로 가중치(고속·간선 4, 주요 3, 보조 2, 일반 1, 철도 3) × 거리띠(&lt;50m 3, &lt;150m 2, &lt;300m 1). 실제 소음 측정값이 아니에요. 공식 소음지도(환경부 국가소음정보시스템)는 브라우저에서 바로 쓸 수 있는 공개 API를 찾지 못했어요.</p>
            </>
          )}
          <Src t={SRC.noise} />
        </section>
      )}
      {p.tab === "slope" && (
        <section>
          <Btn loading={p.slope.loading} onClick={p.fetchSlope}>고도·경사 불러오기</Btn>
          {p.slope.error && <p className="hint err">{p.slope.error}</p>}
          {p.slope.data && (
            <>
              <div className="kv"><span>기준점 고도</span><b>{p.slope.data.center} m</b></div>
              <div className="kv"><span>평균 경사</span><b>{p.slope.data.slopePct}%</b></div>
              <div className="kv"><span>내리막(물 흐름) 방향</span><b>{compass8(p.slope.data.downhillDeg)} ({p.slope.data.downhillDeg}°)</b></div>
              <div className="kv"><span>경사면 향(사면 방위)</span><b>{compass8(p.slope.data.downhillDeg)}향</b></div>
              <Profile pts={p.slope.data.profile} />
              <Toggle k="slope" label="지도에 물흐름 화살표·스웨일 후보 표시" />
              <p className="hint">스웨일(빗물 도랑) 후보선은 내리막에 직각(등고선 방향)으로 그린 제안이에요. 90m 격자라 작은 대지 안의 굴곡은 못 잡아요. 현장 수평 측량으로 확인하세요.</p>
            </>
          )}
          <Src t={SRC.elev} />
          <h4>토양</h4>
          <p className="hint">흙토람(농촌진흥청)은 브라우저에서 바로 부를 수 있는 공개 API를 확인하지 못해 연결하지 않았어요. 사이트에서 조회한 뒤, 각 구역 속성의 「토양 메모」에 직접 적어 주세요.</p>
          <a className="btn" href="https://soil.rda.go.kr" target="_blank" rel="noreferrer">흙토람 열기</a>
        </section>
      )}
      {p.tab === "sector" && <SectorTab {...p} />}
    </aside>
  );
}

function SunTab(p: Props & { c: number[]; Toggle: (x: { k: "sun" | "shade"; label: string }) => React.JSX.Element }) {
  const a = p.file.analysis ?? {};
  const when = analysisDate(a), [lon, lat] = [p.c[0], p.c[1]];
  const ds = daySun(when, lat, lon), sp = sunPos(when, lat, lon);
  const y = when.getFullYear();
  const trees = p.file.features.filter((f) => f.kind === "tree");
  return (
    <section>
      <div className="row2">
        <label>날짜<input type="date" value={a.date ?? defaultDate()} onChange={(e) => p.setAnalysis({ date: e.target.value })} /></label>
        <label>시각 {Math.floor(a.hour ?? 12)}:{String(Math.round(((a.hour ?? 12) % 1) * 60)).padStart(2, "0")}
          <input type="range" min={5} max={20} step={0.25} value={a.hour ?? 12} onChange={(e) => p.setAnalysis({ hour: Number(e.target.value) })} /></label>
      </div>
      <div className="kv"><span>일출 · 일몰</span><b>{hhmm(ds.sunrise)} · {hhmm(ds.sunset)}</b></div>
      <div className="kv"><span>낮 길이</span><b>{ds.dayLenH.toFixed(1)}시간</b></div>
      <div className="kv"><span>지금 해 고도 · 방위</span><b>{sp.altitude.toFixed(1)}° · {Math.round(sp.azimuth)}° ({compass8(sp.azimuth)})</b></div>
      <div className="kv"><span>남중 고도</span><b>{ds.noonAlt.toFixed(1)}°</b></div>
      <p.Toggle k="sun" label="지도에 해 방향·일출/일몰 방위 표시" />
      <p.Toggle k="shade" label={`나무 그늘 표시 (높이 넣은 나무 ${trees.filter((t) => t.props.heightM).length}/${trees.length}그루)`} />
      <h4>절기별</h4>
      <table className="tbl"><thead><tr><th></th><th>일출</th><th>일몰</th><th>낮</th><th>남중고도</th><th>일출~일몰 방위</th></tr></thead>
        <tbody>{keyDays(y).map(({ name, d }) => { const s = daySun(d, lat, lon); return (
          <tr key={name}><td>{name}</td><td>{hhmm(s.sunrise)}</td><td>{hhmm(s.sunset)}</td><td>{s.dayLenH.toFixed(1)}h</td><td>{s.noonAlt.toFixed(0)}°</td><td>{Math.round(s.riseAz)}°~{Math.round(s.setAz)}°</td></tr>); })}</tbody></table>
      <h4>월별 (15일 기준)</h4>
      <Bars vals={monthly(y, lat, lon).map((m) => m.dayLenH)} fmt={(v) => `${v.toFixed(1)}h`} color="#ffb300" unit="낮 길이" />
      <p className="hint">그늘 부채는 북향 보정·높이·수관 반경을 이용한 설명용 예시예요. 지형·건물·수관 밀도를 반영하지 않는 단순 추정이며 정밀 시뮬레이션이 아니에요. 높이와 폭이 없는 식물은 그늘을 만들지 않아요.</p>
      <Src t={SRC.sun} />
    </section>
  );
}

function ClimateTab(p: Props & { Toggle: (x: { k: "wind"; label: string }) => React.JSX.Element }) {
  const a = p.file.analysis ?? {};
  const cl = p.climate.data;
  const polys = p.file.features.filter((f) => f.geometry.type === "Polygon" && f.kind !== "sector" && f.kind !== "zone");
  const ids = a.catchmentIds ?? [];
  const coef = a.runoffCoef ?? 0.8;
  const area = (a.roofAreaM2 ?? 0) + polys.filter((f) => ids.includes(f.id)).reduce((s, f) => s + (f.props.areaM2 ?? 0), 0);
  return (
    <section>
      <Btn loading={p.climate.loading} onClick={p.fetchClimate}>최근 10년 기상 불러오기</Btn>
      {p.climate.error && <p className="hint err">{p.climate.error}</p>}
      {cl && (
        <>
          <p className="hint">{cl.years[0]}~{cl.years[1]}년 평균 · 격자 ({cl.gridLat.toFixed(2)}, {cl.gridLon.toFixed(2)}) 고도 {cl.elevation}m</p>
          <div className="kv"><span>연 강수량</span><b>{cl.annualPrecipMm.toLocaleString()} mm</b></div>
          <Bars vals={cl.months.map((m) => m.precipMm)} fmt={(v) => `${v}`} color="#42a5f5" unit="월 강수량 mm" />
          <Bars vals={cl.months.map((m) => m.tMean)} fmt={(v) => `${v}`} color="#ef6c00" unit="월 평균기온 ℃" signed />
          <div className="kv"><span>서리 위험 달 (최저 0℃ 미만 날 ≥3일)</span><b>{cl.months.filter((m) => m.frostDays >= 3).map((m) => `${m.m}월`).join(" ") || "없음"}</b></div>
          <div className="kv"><span>가장 추운 달 평균 최저</span><b>{Math.min(...cl.months.map((m) => m.tMin))}℃</b></div>
          <div className="kv"><span>주풍향 (일 최빈 풍향 빈도)</span><b>{cl.prevailing.dir} {cl.prevailing.pct}%</b></div>
          <p.Toggle k="wind" label="지도에 바람장미 표시" />
          <h4>빗물 모으기 계산</h4>
          <p className="hint">집수면 면적 × 월 강수량 × 유출계수. 지붕 등은 면적을 직접 넣거나, 그린 도형을 고르세요.</p>
          <div className="row2">
            <label>지붕 등 면적 ㎡<input type="number" min={0} value={a.roofAreaM2 ?? ""} onChange={(e) => p.setAnalysis({ roofAreaM2: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>
            <label>유출계수<input type="number" min={0} max={1} step={0.05} value={coef} onChange={(e) => p.setAnalysis({ runoffCoef: Number(e.target.value) })} /></label>
          </div>
          {polys.map((f) => (
            <label key={f.id} className="chk"><input type="checkbox" checked={ids.includes(f.id)}
              onChange={(e) => p.setAnalysis({ catchmentIds: e.target.checked ? [...ids, f.id] : ids.filter((x) => x !== f.id) })} /> {f.props.name || KIND_LABEL[f.kind]} ({fmtM2(f.props.areaM2)})</label>
          ))}
          <div className="kv"><span>집수 면적</span><b>{fmtM2(area)}</b></div>
          {area > 0 && (
            <>
              <div className="kv"><span>연간 모을 수 있는 양</span><b>{(area * cl.annualPrecipMm / 1000 * coef).toFixed(1)} ㎥ (≈ {Math.round(area * cl.annualPrecipMm * coef).toLocaleString()} L)</b></div>
              <Bars vals={cl.months.map((m) => +(area * m.precipMm / 1000 * coef).toFixed(1))} fmt={(v) => `${v}`} color="#26a69a" unit="월 집수량 ㎥" />
            </>
          )}
          <p className="hint">유출계수 0.8은 지붕 기준 흔히 쓰는 가정값이에요(수정 가능). 증발·첫 빗물 버림 등은 빼지 않은 최대치예요.</p>
        </>
      )}
      <Src t={SRC.climate} />
    </section>
  );
}

function SectorTab(p: Props) {
  const [st, setSt] = useState<SectorType>("view");
  const [from, setFrom] = useState(0), [to, setTo] = useState(45), [range, setRange] = useState(60);
  const [radii, setRadii] = useState([2, 8, 20, 40, 70, 110]);
  const sectors = p.file.features.filter((f) => f.kind === "sector");
  const hasHouse = p.file.features.some((f) => f.kind === "house");
  return (
    <section>
      <h4>섹터 (외부 에너지·영향 방향)</h4>
      <button className="btn" onClick={p.autoSectors}>해·바람·소음 섹터 자동 채우기</button>
      <p className="hint">해는 계산값, 바람은 「기상」, 소음은 「소음」 탭에서 불러온 뒤에 채워져요. 자동 섹터는 다시 누르면 새로 바뀌어요.</p>
      <div className="row2">
        <label>종류<select value={st} onChange={(e) => setSt(e.target.value as SectorType)}>
          {Object.entries(SECTOR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>거리 m<input type="number" value={range} onChange={(e) => setRange(Number(e.target.value))} /></label>
      </div>
      <div className="row2">
        <label>시작 방위°<input type="number" value={from} onChange={(e) => setFrom(Number(e.target.value))} /></label>
        <label>끝 방위°<input type="number" value={to} onChange={(e) => setTo(Number(e.target.value))} /></label>
      </div>
      <button className="btn" onClick={() => p.addSector(st, from, to, range)}>섹터 직접 추가</button>
      <ul className="list">{sectors.map((s) => <li key={s.id}>{s.props.label || SECTOR_LABEL[s.props.sectorType ?? "other"]} <small>{s.props.fromDeg}°→{s.props.toDeg}°{s.props.auto ? " · 자동" : ""}</small></li>)}</ul>
      <h4>존 빠른 시작 (템플릿)</h4>
      <p className="hint">{hasHouse ? "집" : "기준점(집 도구로 찍으면 거기)"}에서 동심원을 만들어 편집 가능한 구역 폴리곤으로 넣어요. 그다음 「선택」으로 모양을 자유롭게 고치세요. 구역은 「구역」 도구로 직접 그려도 돼요.</p>
      <div className="radii">{radii.map((r, i) => (
        <label key={i}>Z{i}<input type="number" min={0} value={r} onChange={(e) => setRadii(radii.map((x, j) => (j === i ? Number(e.target.value) : x)))} /></label>
      ))}</div>
      <button className="btn" onClick={() => p.zoneTemplate(radii)}>존 템플릿 넣기 (반경 m)</button>
    </section>
  );
}

function Bars({ vals, fmt, color, unit, signed }: { vals: number[]; fmt: (v: number) => string; color: string; unit: string; signed?: boolean }) {
  const max = Math.max(...vals.map(Math.abs), 1), H = 70;
  const min = signed ? Math.min(0, ...vals) : 0, span = (signed ? Math.max(...vals, 0) - min : max) || 1;
  return (
    <figure className="bars">
      <figcaption>{unit}</figcaption>
      <svg viewBox={`0 0 ${12 * 22} ${H + 26}`} width="100%">
        {vals.map((v, i) => {
          const h = (Math.abs(v) / span) * H, zeroY = signed ? H - (-min / span) * H : H;
          const y = v >= 0 ? zeroY - h : zeroY;
          return (<g key={i}><rect x={i * 22 + 3} y={y + 10} width={16} height={Math.max(h, 0.5)} fill={color} rx={2} />
            <text x={i * 22 + 11} y={v >= 0 ? y + 8 : y + h + 18} fontSize="8" textAnchor="middle">{fmt(v)}</text>
            <text x={i * 22 + 11} y={H + 24} fontSize="8" textAnchor="middle" fill="#667">{i + 1}월</text></g>);
        })}
      </svg>
    </figure>
  );
}

function Profile({ pts }: { pts: { d: number; z: number }[] }) {
  if (pts.length < 2) return null;
  const zs = pts.map((p) => p.z), lo = Math.min(...zs), hi = Math.max(...zs), W = 260, H = 70;
  const dmax = pts[pts.length - 1].d, dmin = pts[0].d;
  const xy = pts.map((p) => [((p.d - dmin) / (dmax - dmin)) * W, H - ((p.z - lo) / (hi - lo || 1)) * (H - 10) - 5]);
  return (
    <figure className="bars"><figcaption>내리막 방향 단면 (±300m, {lo}~{hi}m)</figcaption>
      <svg viewBox={`0 0 ${W} ${H + 14}`} width="100%">
        <polyline points={xy.map((p) => p.join(",")).join(" ")} fill="none" stroke="#6d4c41" strokeWidth="2" />
        <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="#c62828" strokeDasharray="3 3" />
        <text x={2} y={H + 12} fontSize="9">위쪽 300m</text><text x={W - 2} y={H + 12} fontSize="9" textAnchor="end">아래쪽 300m</text>
      </svg>
    </figure>
  );
}
