import Layer from "ol/layer/Layer";
import { apply } from "ol/transform";
import { fromLonLat } from "ol/proj";
import type { FrameState } from "ol/Map";
import type { PhotoPlacement } from "../types/garden";
import { unitsPerPx } from "../lib/photo";

/** 회전·크기 자유로운 사용자 사진 레이어 (ImageStatic 은 회전 불가라 직접 그림) */
export function createPhotoLayer(get: () => { placement: PhotoPlacement | null; bitmap: ImageBitmap | null }) {
  const wrap = document.createElement("div");
  wrap.className = "ol-layer photo-layer";
  wrap.style.position = "absolute"; wrap.style.inset = "0";
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute"; canvas.style.left = "0"; canvas.style.top = "0";
  wrap.appendChild(canvas);
  const layer = new Layer({
    properties: { id: "photo" },
    render(fs: FrameState) {
      const { placement: p, bitmap } = get();
      const [w, h] = fs.size, pr = fs.pixelRatio;
      if (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr)) {
        canvas.width = Math.round(w * pr); canvas.height = Math.round(h * pr);
      }
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!p || !bitmap || !p.visible) return wrap;
      wrap.style.opacity = String(p.opacity);
      const c = apply(fs.coordinateToPixelTransform, fromLonLat(p.center).slice() as number[]);
      const k = (unitsPerPx(p) * (p.widthPx / bitmap.width)) / fs.viewState.resolution;
      ctx.setTransform(pr, 0, 0, pr, 0, 0);
      ctx.translate(c[0], c[1]);
      ctx.rotate(((p.rotationDeg) * Math.PI) / 180 + fs.viewState.rotation);
      ctx.scale(k, k * (p.aspectY ?? 1));
      ctx.imageSmoothingEnabled = k < 4; // 아주 확대하면 픽셀 그대로
      ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
      return wrap;
    },
  });
  return layer;
}
