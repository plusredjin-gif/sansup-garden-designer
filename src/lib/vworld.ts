export type SearchResult = {
  title: string;
  road?: string;
  parcel?: string;
  lon: number;
  lat: number;
  source: "vworld" | "demo";
};

export function getKey(): string | undefined {
  const k = import.meta.env.VITE_VWORLD_KEY;
  return k && k.trim() && !k.includes("발급받은") ? k.trim() : undefined;
}

export function hasKey(): boolean {
  return !!getKey();
}

export function satelliteTileUrlTemplate(): string {
  return `https://api.vworld.kr/req/wmts/1.0.0/${getKey()}/Satellite/{z}/{y}/{x}.jpeg`;
}

/** 키 없을 때 쓰는 목업용 데모 장소 (좌표는 대략값) */
const DEMO_PLACES: SearchResult[] = [
  { title: "판교로 242 (판교 테크노밸리)", road: "경기도 성남시 분당구 판교로 242", lon: 127.1107, lat: 37.4005, source: "demo" },
  { title: "서울숲", road: "서울특별시 성동구 뚝섬로 273", lon: 127.0374, lat: 37.5444, source: "demo" },
  { title: "홍천군청", road: "강원특별자치도 홍천군 홍천읍 장대로 4", lon: 127.8886, lat: 37.6971, source: "demo" },
  { title: "제주 한림공원", road: "제주특별자치도 제주시 한림읍 한림로 300", lon: 126.2394, lat: 33.3893, source: "demo" },
];

/** 브이월드 검색 API는 CORS 헤더가 없고, 해외(클라우드플레어) 서버 접속도 막는다.
 *  그래서 브라우저에서 JSONP(callback=)로 바로 부른다. */
function jsonp(url: string, timeoutMs = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const cb = `__vw_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const s = document.createElement("script");
    const w = window as any;
    const done = () => { delete w[cb]; s.remove(); clearTimeout(t); };
    const t = setTimeout(() => { done(); reject(new Error("timeout")); }, timeoutMs);
    w[cb] = (data: any) => { done(); resolve(data); };
    s.onerror = () => { done(); reject(new Error("network")); };
    s.src = `${url}&callback=${cb}`;
    document.head.appendChild(s);
  });
}

async function vworldSearch(query: string, category: "road" | "parcel"): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    service: "search", request: "search", version: "2.0", type: "address", category,
    format: "json", errorformat: "json", crs: "EPSG:4326", size: "10", query,
    key: getKey()!, domain: location.hostname,
  });
  const json = await jsonp(`https://api.vworld.kr/req/search?${params}`);
  const items: any[] = json?.response?.result?.items ?? [];
  return items.map((it) => ({
    title: it.address?.road || it.address?.parcel || query,
    road: it.address?.road || undefined,
    parcel: it.address?.parcel || undefined,
    lon: Number(it.point.x),
    lat: Number(it.point.y),
    source: "vworld" as const,
  }));
}

export async function searchAddress(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  if (!hasKey()) {
    const hit = DEMO_PLACES.filter((p) => (p.title + p.road).includes(q));
    return hit.length ? hit : DEMO_PLACES;
  }
  const road = await vworldSearch(q, "road");
  if (road.length) return road;
  return vworldSearch(q, "parcel");
}
