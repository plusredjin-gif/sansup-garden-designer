/** Google Identity Services 토큰 클라이언트 (브라우저만, 서버 없음). 회원가입 없이 동의 → 토큰. */
import { useSyncExternalStore } from "react";

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
export const SCOPES = "openid email profile https://www.googleapis.com/auth/drive.file";
export const hasGoogleClient = () => GOOGLE_CLIENT_ID.length > 0;

export type GoogleUser = { email: string; name?: string; picture?: string };
export type Session = { token: string; expiresAt: number; user: GoogleUser };
export type AuthState = { session: Session | null; needsReconnect: boolean; lastEmail?: string };

type TokenResponse = { access_token?: string; expires_in?: number | string; error?: string; error_description?: string };
type TokenClient = { requestAccessToken: (o?: { prompt?: string; login_hint?: string }) => void; callback: (r: TokenResponse) => void };
type GoogleNS = { accounts: { oauth2: {
  initTokenClient: (c: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { type: string; message?: string }) => void }) => TokenClient;
  revoke: (token: string, done?: () => void) => void;
} } };
const g = () => (window as unknown as { google?: GoogleNS }).google;

const SESSION_KEY = "sanstree-session";   // sessionStorage: 탭 안에서만 (토큰 1시간)
const LAST_KEY = "sanstree-last-user";    // localStorage: 다시 연결 안내용 이메일만

function readSession(): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null") as Session | null;
    return s && typeof s.token === "string" && typeof s.expiresAt === "number" && s.user?.email ? s : null;
  } catch { return null; }
}

let state: AuthState = { session: readSession(), needsReconnect: false, lastEmail: localStorage.getItem(LAST_KEY) ?? undefined };
const subs = new Set<() => void>();
function set(next: Partial<AuthState>) { state = { ...state, ...next }; subs.forEach((f) => f()); }
export const getAuth = () => state;
export function useAuth(): AuthState {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);
}

let gisLoading: Promise<void> | null = null;
export function loadGis(): Promise<void> {
  if (g()?.accounts?.oauth2) return Promise.resolve();
  gisLoading ??= new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => res(); s.onerror = () => { gisLoading = null; rej(new Error("구글 로그인 스크립트를 불러오지 못했어요")); };
    document.head.appendChild(s);
  });
  return gisLoading;
}

let client: TokenClient | null = null;
let pending: { res: (r: TokenResponse) => void; rej: (e: Error) => void } | null = null;

async function requestToken(prompt: "consent" | "" | "select_account", hint?: string): Promise<TokenResponse> {
  if (!hasGoogleClient()) throw new Error("NO_CLIENT_ID");
  await loadGis();
  const ns = g();
  if (!ns) throw new Error("구글 로그인 준비 실패");
  client ??= ns.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID, scope: SCOPES,
    callback: (r) => { const p = pending; pending = null; if (!p) return; if (r.error || !r.access_token) p.rej(new Error(r.error_description || r.error || "토큰 없음")); else p.res(r); },
    error_callback: (e) => { const p = pending; pending = null; p?.rej(new Error(e.message || e.type || "로그인 창이 닫혔어요")); },
  });
  return new Promise((res, rej) => { pending = { res, rej }; client!.requestAccessToken({ prompt, login_hint: hint }); });
}

async function fetchUser(token: string): Promise<GoogleUser> {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`사용자 정보 오류 ${r.status}`);
  const u = (await r.json()) as { email?: unknown; name?: unknown; picture?: unknown };
  if (typeof u.email !== "string") throw new Error("이메일을 받지 못했어요");
  return { email: u.email, name: typeof u.name === "string" ? u.name : undefined, picture: typeof u.picture === "string" ? u.picture : undefined };
}

function store(r: TokenResponse, user: GoogleUser): Session {
  const s: Session = { token: r.access_token!, expiresAt: Date.now() + Number(r.expires_in ?? 3600) * 1000, user };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  localStorage.setItem(LAST_KEY, user.email);
  set({ session: s, needsReconnect: false, lastEmail: user.email });
  return s;
}

/** 첫 로그인: 구글 동의 화면 한 번 → 바로 작업화면 */
export async function signIn(): Promise<Session> {
  const r = await requestToken(state.lastEmail ? "" : "consent", state.lastEmail);
  return store(r, await fetchUser(r.access_token!));
}

/** 만료 시 조용히 다시 요청 → 실패하면 '다시 연결' 안내 */
let refreshing: Promise<string> | null = null;
export function getToken(force = false): Promise<string> {
  const s = state.session;
  if (s && !force && s.expiresAt - 60_000 > Date.now()) return Promise.resolve(s.token);
  if (!s) return Promise.reject(new Error("NOT_SIGNED_IN"));
  refreshing ??= requestToken("", s.user.email)
    .then((r) => store(r, s.user).token)
    .catch((e) => { set({ needsReconnect: true }); throw new Error(`RECONNECT: ${(e as Error).message}`); })
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function reconnect(): Promise<void> {
  const r = await requestToken("", state.session?.user.email ?? state.lastEmail);
  store(r, state.session?.user ?? (await fetchUser(r.access_token!)));
}

export function signOut() {
  const t = state.session?.token;
  if (t) try { g()?.accounts.oauth2.revoke(t); } catch { /* 이미 만료 */ }
  sessionStorage.removeItem(SESSION_KEY);
  set({ session: null, needsReconnect: false });
}
