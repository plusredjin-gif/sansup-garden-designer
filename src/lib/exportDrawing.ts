import type OlMap from "ol/Map";
import { getPointResolution } from "ol/proj";
import type { FeatureKind, GardenFile } from "../types/garden";
import { sanitizeFilename } from "./filename";
import { KIND_LABEL, DEFAULT_COLOR, ZONE_COLORS } from "../map/drawTools";

export type ExportFormat = "png" | "pdf";
export type ExportResult = { filename: string; withSatellite: boolean; note?: string; width: number; height: number };

export const exportFilename = (name: string | undefined, fmt: ExportFormat) => `${sanitizeFilename(name)}_도면.${fmt}`;

/** Text printed at the bottom of every export. VWorld credit is always included (map/address service). */
export function creditLines(file: GardenFile, withSatellite: boolean, today = new Date()): string[] {
  const vworld = file.place.basemap.provider === "vworld-satellite";
  const bg = withSatellite
    ? (vworld ? "배경: 브이월드(국토교통부) 위성영상" : `배경: ${file.place.basemap.attribution}`)
    : "배경 위성영상 제외 (도면만)";
  const ph = file.photo?.visible ? ` · 배경 사진: 사용자 제공 (${file.photo.name})` : "";
  return [
    `${sanitizeFilename(file.meta.name)}${file.meta.author ? ` · 작성자 ${file.meta.author}` : ""} · ${today.toLocaleDateString("ko-KR")}`,
    `출처: 브이월드(국토교통부) · ${bg}${ph} · 개인 다운로드용, 서버 저장 없음`,
  ];
}

const SAT_ID = "satellite";

/** Compose all visible OL layer canvases (standard OL export recipe). Throws SecurityError if tainted. */
function compose(map: OlMap): HTMLCanvasElement {
  const size = map.getSize() ?? [800, 600];
  const out = document.createElement("canvas");
  out.width = size[0]; out.height = size[1];
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#1e2a24"; ctx.fillRect(0, 0, out.width, out.height);
  const vp: HTMLElement | undefined = map.getViewport();
  vp?.querySelectorAll<HTMLCanvasElement>(".ol-layer canvas, canvas.ol-layer").forEach((c) => {
    if (!c.width) return;
    const parent = c.parentElement as HTMLElement | null;
    const opacity = parent?.style.opacity || c.style.opacity;
    ctx.globalAlpha = opacity === "" ? 1 : Number(opacity);
    const m = c.style.transform.match(/^matrix\(([^)]*)\)$/);
    const t = m ? m[1].split(",").map(Number) : [c.width && parseFloat(c.style.width) ? parseFloat(c.style.width) / c.width : 1, 0, 0, 1, 0, 0];
    ctx.setTransform(t[0], t[1], t[2], t[3], t[4], t[5]);
    ctx.drawImage(c, 0, 0);
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  out.toDataURL("image/png").length; // tainted canvas → SecurityError
  return out;
}

function renderOnce(map: OlMap): Promise<void> {
  return new Promise((res) => { map.once("rendercomplete", () => res()); map.renderSync(); });
}

function niceScale(map: OlMap): { px: number; label: string } {
  const v = map.getView(), res = v.getResolution() ?? 1, c = v.getCenter() ?? [0, 0];
  const mPerPx = getPointResolution(v.getProjection(), res, c);
  const target = mPerPx * 120;
  const pow = 10 ** Math.floor(Math.log10(target));
  const m = [1, 2, 5, 10].map((k) => k * pow).filter((x) => x <= target).pop() ?? pow;
  return { px: m / mPerPx, label: m >= 1000 ? `${m / 1000} km` : `${m} m` };
}

function legend(file: GardenFile, hidden: string[]): [string, string][] {
  const kinds = [...new Set(file.features.map((f) => f.kind))].filter((k) => !hidden.includes(k)) as FeatureKind[];
  const items: [string, string][] = kinds.map((k) => [KIND_LABEL[k], k === "zone" ? ZONE_COLORS[1] : DEFAULT_COLOR[k] ?? "#ff7043"]);
  if (file.analysis?.overlays?.shade) items.push(["그늘 (예시)", "rgba(20,20,40,.7)"]);
  if (file.analysis?.overlays?.sun) items.push(["해 방향", "#ffca28"]);
  return items;
}

export async function buildExportCanvas(map: OlMap, file: GardenFile, hidden: string[]): Promise<{ canvas: HTMLCanvasElement; withSatellite: boolean; note?: string }> {
  await renderOnce(map);
  let body: HTMLCanvasElement, withSatellite = true, note: string | undefined;
  const sat = map.getLayers().getArray().find((l) => l.get("id") === SAT_ID);
  if (sat && !sat.getVisible()) withSatellite = false;
  try { body = compose(map); } catch {
    withSatellite = false;
    note = "위성 타일이 브라우저 보안(CORS) 때문에 그림에 넣을 수 없어 도면만 내보냈어요.";
    const was = sat?.getVisible();
    sat?.setVisible(false); await renderOnce(map);
    try { body = compose(map); } finally { sat?.setVisible(!!was); }
  }
  const footerH = 70, W = body.width, H = body.height + footerH;
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(body, 0, 0);
  const font = "Pretendard, 'Noto Sans KR', 'Noto Sans CJK KR', sans-serif";
  // north arrow (screen-up == map north; northDeg only rotates analysis)
  ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(W - 46, 10, 36, 44);
  ctx.fillStyle = "#fff"; ctx.font = `700 14px ${font}`; ctx.textAlign = "center"; ctx.fillText("N", W - 28, 28);
  ctx.beginPath(); ctx.moveTo(W - 28, 32); ctx.lineTo(W - 34, 48); ctx.lineTo(W - 22, 48); ctx.fill();
  // legend
  const items = legend(file, hidden);
  if (items.length) {
    const lh = 18, bw = 130, bh = 10 + items.length * lh;
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(10, 10, bw, bh);
    ctx.textAlign = "left"; ctx.font = `12px ${font}`;
    items.forEach(([t, c], i) => { ctx.fillStyle = c; ctx.fillRect(18, 18 + i * lh, 12, 10); ctx.fillStyle = "#fff"; ctx.fillText(t, 36, 27 + i * lh); });
  }
  // footer
  ctx.fillStyle = "#fff"; ctx.fillRect(0, body.height, W, footerH);
  const sc = niceScale(map), y0 = body.height + 18;
  ctx.fillStyle = "#111"; ctx.fillRect(W - 20 - sc.px, y0, sc.px, 5);
  ctx.font = `700 12px ${font}`; ctx.textAlign = "right"; ctx.fillStyle = "#2e5d43";
  ctx.fillText("산숲정원디자이너 · by 더하기나무", W - 20, body.height + 62);
  ctx.fillStyle = "#111";
  ctx.font = `12px ${font}`; ctx.textAlign = "right"; ctx.fillText(`축척 ${sc.label}`, W - 20, y0 + 20);
  ctx.textAlign = "left"; ctx.font = `600 14px ${font}`;
  const lines = creditLines(file, withSatellite);
  ctx.fillText(lines[0], 14, body.height + 24);
  ctx.font = `12px ${font}`; ctx.fillStyle = "#333";
  ctx.fillText(lines[1], 14, body.height + 44);
  if (note) { ctx.fillStyle = "#b00020"; ctx.fillText(note, 14, body.height + 62); }
  return { canvas: out, withSatellite, note };
}

function download(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function exportDrawing(map: OlMap, file: GardenFile, hidden: string[], fmt: ExportFormat): Promise<ExportResult> {
  const { canvas, withSatellite, note } = await buildExportCanvas(map, file, hidden);
  const filename = exportFilename(file.meta.name, fmt);
  if (fmt === "png") {
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG 생성 실패"))), "image/png"));
    download(blob, filename);
  } else {
    const { jsPDF } = await import("jspdf");
    const landscape = canvas.width >= canvas.height;
    const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 8;
    const s = Math.min((pw - 2 * m) / canvas.width, (ph - 2 * m) / canvas.height);
    const w = canvas.width * s, h = canvas.height * s;
    pdf.setProperties({ title: `${sanitizeFilename(file.meta.name)} 도면`, author: file.meta.author ?? "", subject: "출처: 브이월드(국토교통부)", creator: "산숲정원디자이너 (by 더하기나무)" });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pw - w) / 2, (ph - h) / 2, w, h);
    download(pdf.output("blob"), filename);
  }
  return { filename, withSatellite, note, width: canvas.width, height: canvas.height };
}
