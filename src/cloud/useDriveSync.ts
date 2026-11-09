import { useCallback, useEffect, useRef, useState } from "react";
import type { GardenFile } from "../types/garden";
import { useAuth } from "./googleAuth";
import { ensureFolder, listGardens, saveGarden, uploadBlob, downloadText, downloadBlob, type DriveFile } from "./drive";
import { gardenFilename, parseGardenFile } from "../lib/storage";
import { loadPhotoBlob, savePhotoBlob } from "../lib/photoStore";

export type DriveStatus = { kind: "off" | "idle" | "saving" | "saved" | "error"; at?: Date; message?: string };
const AUTOSAVE_MS = 4000;

/** 로그인 상태면 드라이브에 디바운스 자동저장. 로컬 IndexedDB 자동저장은 그대로(대체 수단) */
export function useDriveSync(file: GardenFile, setFile: (fn: (f: GardenFile) => GardenFile) => void, loaded: boolean) {
  const { session, needsReconnect } = useAuth();
  const [status, setStatus] = useState<DriveStatus>({ kind: "off" });
  const lastSaved = useRef<string>("");
  const fileRef = useRef(file); fileRef.current = file;
  const busy = useRef(false);

  const saveNow = useCallback(async (): Promise<DriveFile | null> => {
    const s = session;
    const f0 = fileRef.current;
    if (!s || !f0.meta.name.trim() || busy.current) return null;
    busy.current = true;
    setStatus({ kind: "saving" });
    try {
      const folder = await ensureFolder(s.user.email);
      let f = f0;
      // 사진은 별도 파일로 한 번만 올리고 id 로 참조
      if (f.photo && !f.photo.driveFileId) {
        const blob = await loadPhotoBlob(f.photo.id);
        if (blob) {
          const pid = await uploadBlob(folder, `${f.photo.name}`, blob);
          f = { ...f, photo: { ...f.photo, driveFileId: pid } };
          setFile((cur) => (cur.photo?.id === f.photo?.id ? { ...cur, photo: { ...cur.photo!, driveFileId: pid } } : cur));
        }
      }
      const { photoData: _d, ...clean } = f;
      const json = JSON.stringify(clean, null, 2);
      const saved = await saveGarden(folder, gardenFilename(f), json, f.cloud?.driveFileId);
      lastSaved.current = JSON.stringify({ ...clean, cloud: { driveFileId: saved.id } });
      if (saved.id !== f.cloud?.driveFileId) setFile((cur) => ({ ...cur, cloud: { ...cur.cloud, driveFileId: saved.id } }));
      setStatus({ kind: "saved", at: new Date() });
      return saved;
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
      return null;
    } finally { busy.current = false; }
  }, [session, setFile]);

  // 디바운스 자동저장 (내용이 바뀐 경우만)
  useEffect(() => {
    if (!session) { setStatus({ kind: "off" }); return; }
    if (!loaded || needsReconnect || !file.meta.name.trim()) return;
    const { photoData: _d, ...clean } = file;
    if (JSON.stringify(clean) === lastSaved.current) return;
    const t = setTimeout(() => { void saveNow(); }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [file, session, loaded, needsReconnect, saveNow]);

  const list = useCallback(async () => {
    if (!session) return [];
    return listGardens(await ensureFolder(session.user.email));
  }, [session]);

  /** 드라이브 파일 열기. 사진이 이 브라우저에 없으면 드라이브에서 받아 IndexedDB 에 */
  const open = useCallback(async (id: string): Promise<GardenFile> => {
    const parsed = parseGardenFile(await downloadText(id));
    const { photoData, ...g } = parsed;
    if (g.photo) {
      const local = await loadPhotoBlob(g.photo.id);
      if (!local) {
        if (photoData) await savePhotoBlob(g.photo.id, await (await fetch(photoData)).blob());
        else if (g.photo.driveFileId) await savePhotoBlob(g.photo.id, await downloadBlob(g.photo.driveFileId));
      }
    }
    const out: GardenFile = { ...g, cloud: { ...g.cloud, driveFileId: id } };
    lastSaved.current = JSON.stringify(out);
    return out;
  }, []);

  return { session, needsReconnect, status, saveNow, list, open };
}
