import localforage from "localforage";
import type { AutosaveRecord, GardenFile } from "../types/garden";
import { sanitizeFilename } from "./filename";

const store = localforage.createInstance({ name: "permaculture-garden", storeName: "autosave" });

export async function saveAutosave(file: GardenFile): Promise<void> {
  const rec: AutosaveRecord = { id: "current", file, savedAt: new Date().toISOString() };
  await store.setItem("current", rec);
}

export async function loadAutosave(): Promise<GardenFile | null> {
  const rec = await store.getItem<AutosaveRecord>("current");
  return rec?.file ?? null;
}

export function gardenFilename(file: GardenFile): string {
  return `${sanitizeFilename(file.meta.name)}.garden.json`;
}

export function downloadGarden(file: GardenFile): GardenFile {
  const out: GardenFile = { ...file, meta: { ...file.meta, updatedAt: new Date().toISOString() } };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = gardenFilename(out);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return out;
}

export function parseGardenFile(text: string): GardenFile {
  const f = JSON.parse(text);
  if (f?.schemaVersion !== 1 || !f.meta || !f.place) throw new Error("정원 파일 형식이 아니에요.");
  if (!f.meta.purpose && f.meta.notes) f.meta.purpose = f.meta.notes;
  f.features ??= [];
  return f as GardenFile;
}
