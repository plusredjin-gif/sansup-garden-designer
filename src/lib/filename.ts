export function sanitizeFilename(name: string | undefined): string {
  const s = (name ?? "").trim().replace(/[\\/:*?"<>|]/g, "").trim();
  return s || "이름없는정원";
}
