/** 파일 확장자: {sanitize(meta.name) || "이름없는정원"}.garden.json */
export type GardenFile = {
  schemaVersion: 1;
  meta: {
    name: string;            // 정원 이름(필수). UI에서는 빈 값 저장 막고, 파일명 fallback은 "이름없는정원"
    author?: string;         // 작성자
    createdAt: string;       // ISO, 생성 시 고정
    updatedAt: string;       // ISO, 편집·저장 때마다 갱신
    addressText?: string;    // 주소/지번 표시용(검색·수동 입력)
    areaM2?: number;         // 경계 feature 면적 합(자동). 경계 없으면 undefined
    purpose?: string;        // 목적·메모 (구 notes와 동일 역할; notes는 purpose로 통합)
    notes?: string;          // 하위호환: 있으면 purpose로 읽어와도 됨
    climateZone?: string;    // 기후대/지역(선택) 예: "온대 중부"
    northDeg: number;        // 화면 위쪽이 실제 북에서 몇 도 꺾였는지 (0=북이 위)
  };
  place: {
    query?: string;           // 검색에 쓴 주소/지번
    addressRoad?: string;
    addressParcel?: string;
    center: { lon: number; lat: number }; // EPSG:4326
    bbox: { west: number; south: number; east: number; north: number };
    zoom: number;
    /** 위성 픽셀은 저장하지 않음. 타일은 열 때 VWorld에서 다시 로드 */
    basemap: {
      provider: "vworld-satellite" | "mock-esri";
      attribution: string;
    };
  };
  features: GardenFeature[];
  plantsCatalogRef?: string; // 나중에 산숲정원 데이터 버전 키
  ui?: {
    activeLayerIds: string[];
    hiddenKinds?: string[]; // stage 3: absent means all drawing kinds visible
    lastTool?: ToolId;
  };
  analysis?: AnalysisSettings;
  /** 사용자 배경 사진 배치값. 사진 원본은 IndexedDB(키=photo.id) 또는 photoData 에 */
  photo?: PhotoPlacement;
  /** 내보낸 파일에 사진을 넣기로 한 경우만: data URL (클 수 있음) */
  photoData?: string;
  /** 구글 드라이브 연결 (로그인한 경우만) */
  cloud?: { driveFileId?: string };
};

export type PhotoCrs = "EPSG:4326" | "EPSG:3857" | "EPSG:5186" | "EPSG:5185" | "EPSG:5187" | "EPSG:5179";
export type PhotoPlacement = {
  id: string;
  name: string;            // 원본 파일 이름 (다시 연결할 때 안내)
  widthPx: number;         // 원본 픽셀 크기
  heightPx: number;
  fileBytes?: number;
  center: [number, number]; // 사진 중심 lon/lat
  mPerPx: number;          // 지상 해상도 (원본 1px 당 m)
  rotationDeg: number;     // 시계방향
  aspectY?: number;        // 세로 픽셀 크기 / 가로 (경위도 월드파일 등 정사각이 아닌 픽셀). 기본 1
  opacity: number;         // 0~1
  visible: boolean;
  hideSatellite?: boolean;
  source: "manual" | "worldfile" | "2point";
  crs?: PhotoCrs;          // 월드파일 좌표계
  driveFileId?: string;    // 드라이브에 올린 사진 파일 id (같은 폴더)
};

export type ToolId =
  | "select" | "boundary" | "zone" | "bed" | "pond"
  | "tree" | "path" | "measure" | "delete"
  | "house" | "micro" | "guild" | "sector" | "water-flow";

/** 그림 객체 종류. sector/water-flow 는 분석 그룹에서 생성 */
export type FeatureKind =
  | "boundary" | "zone" | "bed" | "pond" | "tree" | "path"
  | "house" | "micro" | "plant" | "sector" | "water-flow" | "wind" | "sun";

export type GeoPolygon = { type: "Polygon"; coordinates: number[][][] }; // [lon,lat] EPSG:4326
export type GeoLine = { type: "LineString"; coordinates: number[][] };
export type GeoPoint = { type: "Point"; coordinates: [number, number] };
export type Geometry = GeoPolygon | GeoLine | GeoPoint;

export type ShapeMode = "polygon" | "rectangle" | "circle" | "freehand" | "smooth";
export type AreaShape =
  | { mode: "circle"; center: [number, number]; radiusM: number }
  | { mode: Exclude<ShapeMode, "circle"> };

export type MicroType = "sunny" | "shade" | "frost" | "windy" | "wet" | "dry";
export type SectorType = "sun-summer" | "sun-winter" | "wind" | "noise" | "view" | "fire" | "wildlife" | "cold-air" | "other";

/** 공통 속성 — 기획서 4장 props 를 모두 포함하는 느슨한 형태 */
export type FeatureProps = {
  name?: string;
  shape?: AreaShape;
  note?: string;
  color?: string;
  areaM2?: number;          // 폴리곤 자동
  lengthM?: number;         // 선 자동
  zone?: 0 | 1 | 2 | 3 | 4 | 5;
  plantIds?: string[];
  plantId?: string;
  label?: string;
  canopyM?: number;         // 나무 수관 반경
  heightM?: number;         // 나무 높이(그늘 계산)
  widthM?: number;          // 길 폭
  soil?: string;            // 토양 메모(수동)
  microType?: MicroType;
  sectorType?: SectorType;
  fromDeg?: number;         // 섹터 방위(북=0, 시계방향)
  toDeg?: number;
  rangeM?: number;
  auto?: boolean;           // 분석에서 자동 생성
  guildId?: string;         // 길드 스탬프 묶음
  role?: string;            // 길드 역할(질소고정 등)
};

export type GardenFeature = {
  id: string;
  kind: FeatureKind;
  geometry: Geometry;
  props: FeatureProps;
};

/** 분석 설정만 저장 (가져온 원자료는 저장하지 않음) */
export type AnalysisSettings = {
  date?: string;            // YYYY-MM-DD 그늘·해 계산 날짜
  hour?: number;            // 0~24 (소수 가능)
  overlays?: { sun?: boolean; shade?: boolean; wind?: boolean; noise?: boolean; slope?: boolean };
  climateYears?: number;    // 기상 평년 기간(년)
  roofAreaM2?: number;      // 빗물 집수 면적(수동)
  catchmentIds?: string[];  // 집수면으로 쓸 객체
  runoffCoef?: number;      // 유출계수
  noiseRadiusM?: number;
};

/** 브라우저 자동저장용 (IndexedDB) — 파일과 동일 스키마 */
export type AutosaveRecord = {
  id: "current";
  file: GardenFile;
  savedAt: string;
};
