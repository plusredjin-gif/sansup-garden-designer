/** 사진 원본은 사용자 브라우저 IndexedDB 에만 (서버 저장 없음). 키 = placement.id */
import localforage from "localforage";
import { displaySize, readImageDims, PHOTO_LIMITS, type Dims } from "./photo";

const store = localforage.createInstance({ name: "permaculture-garden", storeName: "photos" });

export const savePhotoBlob = (id: string, blob: Blob) => store.setItem(id, blob).then(() => undefined);
export const loadPhotoBlob = (id: string) => store.getItem<Blob>(id);

export type LoadedPhoto = { id: string; bitmap: ImageBitmap; original: Dims; display: Dims };

/** 헤더로 크기를 먼저 읽고, 큰 사진은 디코드 단계에서 바로 축소 (메인 스레드 멈춤 최소화) */
export async function decodePhoto(id: string, blob: Blob): Promise<LoadedPhoto> {
  if (blob.size > PHOTO_LIMITS.maxFileBytes) throw new Error(`사진이 너무 커요 (${(blob.size / 1048576).toFixed(0)}MB, 최대 ${PHOTO_LIMITS.maxFileBytes / 1048576}MB)`);
  const head = new Uint8Array(await blob.slice(0, 256 * 1024).arrayBuffer());
  let original = readImageDims(head);
  let bitmap: ImageBitmap;
  if (original) {
    const d = displaySize(original);
    bitmap = d.width === original.width
      ? await createImageBitmap(blob)
      : await createImageBitmap(blob, { resizeWidth: d.width, resizeHeight: d.height, resizeQuality: "high" });
  } else {
    bitmap = await createImageBitmap(blob);
    original = { width: bitmap.width, height: bitmap.height };
  }
  return { id, bitmap, original, display: { width: bitmap.width, height: bitmap.height } };
}

export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
}
export async function dataUrlToBlob(u: string): Promise<Blob> { return (await fetch(u)).blob(); }
