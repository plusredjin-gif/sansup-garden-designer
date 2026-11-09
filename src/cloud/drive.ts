/** 사용자 본인 구글 드라이브 '정원설계' 폴더에 저장 (drive.file 범위: 이 앱이 만든 파일만). 서버 DB 없음 */
import { getToken } from "./googleAuth";

export const FOLDER_NAME = "정원설계";
const API = "https://www.googleapis.com/drive/v3";
const UP = "https://www.googleapis.com/upload/drive/v3";
export type DriveFile = { id: string; name: string; modifiedTime?: string; size?: string };

async function dfetch(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getToken();
  const r = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` } });
  if (r.status === 401 && retry) { await getToken(true); return dfetch(url, init, false); }
  if (!r.ok) {
    let msg = `드라이브 오류 ${r.status}`;
    try { const j = (await r.json()) as { error?: { message?: string } }; if (j.error?.message) msg += `: ${j.error.message}`; } catch { /* 본문 없음 */ }
    const e = new Error(msg) as Error & { status?: number }; e.status = r.status; throw e;
  }
  return r;
}
const q = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

let folderCache: { email: string; id: string } | null = null;
export async function ensureFolder(email: string): Promise<string> {
  if (folderCache?.email === email) return folderCache.id;
  const query = `name='${q(FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const r = await dfetch(`${API}/files?${new URLSearchParams({ q: query, fields: "files(id,name)", spaces: "drive", pageSize: "1" })}`);
  const found = ((await r.json()) as { files?: DriveFile[] }).files?.[0];
  const id = found?.id ?? ((await (await dfetch(`${API}/files?fields=id`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  })).json()) as { id: string }).id;
  folderCache = { email, id };
  return id;
}

export async function listGardens(folderId: string): Promise<DriveFile[]> {
  const query = `'${q(folderId)}' in parents and trashed=false and name contains '.garden.json'`;
  const r = await dfetch(`${API}/files?${new URLSearchParams({ q: query, orderBy: "modifiedTime desc", pageSize: "20", fields: "files(id,name,modifiedTime,size)" })}`);
  return ((await r.json()) as { files?: DriveFile[] }).files ?? [];
}

function multipart(meta: object, body: string | Blob, type: string): { body: Blob; type: string } {
  const b = `sanstree${Math.random().toString(36).slice(2)}`;
  return {
    type: `multipart/related; boundary=${b}`,
    body: new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${type}\r\n\r\n`, body, `\r\n--${b}--`]),
  };
}

/** .garden.json 만들기/덮어쓰기. 없어진 파일(404)이면 새로 만듦 */
export async function saveGarden(folderId: string, name: string, json: string, fileId?: string): Promise<DriveFile> {
  const fields = "id,name,modifiedTime,size";
  if (fileId) {
    const m = multipart({ name }, json, "application/json");
    try {
      const r = await dfetch(`${UP}/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=${fields}`, { method: "PATCH", headers: { "Content-Type": m.type }, body: m.body });
      return (await r.json()) as DriveFile;
    } catch (e) { if ((e as { status?: number }).status !== 404) throw e; }
  }
  const m = multipart({ name, mimeType: "application/json", parents: [folderId] }, json, "application/json");
  const r = await dfetch(`${UP}/files?uploadType=multipart&fields=${fields}`, { method: "POST", headers: { "Content-Type": m.type }, body: m.body });
  return (await r.json()) as DriveFile;
}

/** 큰 배경 사진: 같은 폴더에 별도 파일 (재개 가능 업로드) */
export async function uploadBlob(folderId: string, name: string, blob: Blob): Promise<string> {
  const type = blob.type || "application/octet-stream";
  const init = await dfetch(`${UP}/files?uploadType=resumable&fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": type, "X-Upload-Content-Length": String(blob.size) },
    body: JSON.stringify({ name, parents: [folderId], mimeType: type }),
  });
  const loc = init.headers.get("Location");
  if (!loc) throw new Error("드라이브 업로드 주소를 받지 못했어요");
  const r = await dfetch(loc, { method: "PUT", headers: { "Content-Type": type }, body: blob });
  return ((await r.json()) as { id: string }).id;
}

export async function downloadText(id: string): Promise<string> {
  return (await dfetch(`${API}/files/${encodeURIComponent(id)}?alt=media`)).text();
}
export async function downloadBlob(id: string): Promise<Blob> {
  return (await dfetch(`${API}/files/${encodeURIComponent(id)}?alt=media`)).blob();
}
