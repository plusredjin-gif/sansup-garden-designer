import { chromium } from 'playwright';
import fs from 'node:fs';
const SH = '/workspace/permaculture-garden/shots/', PH = '/tmp/pw/photo/';
const R = {}; const errs = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
p.on('pageerror', e => errs.push('pageerror ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 120)); });
let dialogAccept = true; p.on('dialog', d => (dialogAccept ? d.accept() : d.dismiss()));
const tileZ = []; p.on('request', r => { const m = r.url().match(/vworld\.kr\/req\/wmts\/[^/]+\/[^/]+\/Satellite\/(\d+)\//); if (m) tileZ.push(+m[1]); });
const SITE = [127.1107, 37.4005];
const goSite = (z = 19) => p.evaluate(([[lon, lat], z]) => { const m = window.__olmap; m.getView().setCenter([lon * 20037508.34 / 180, Math.log(Math.tan((90 + lat) * Math.PI / 360)) * 20037508.34 / Math.PI]); m.getView().setZoom(z); }, [SITE, z]);
const auto = () => p.evaluate(() => new Promise((res) => { const r = indexedDB.open('permaculture-garden'); r.onsuccess = () => { const db = r.result; const t = db.transaction('autosave'); const g = t.objectStore('autosave').get('current'); g.onsuccess = () => res(g.result?.file ?? null); }; }));
const status = () => p.locator('footer, .status').first().innerText().catch(() => '');
// px of image point → screen px, replicating pxToMap
const imgToScreen = (ph, [u, v]) => p.evaluate(([ph, u, v]) => {
  const m = window.__olmap, R = 20037508.34;
  const c = [ph.center[0] * R / 180, Math.log(Math.tan((90 + ph.center[1]) * Math.PI / 360)) * R / Math.PI];
  const s = ph.mPerPx / Math.cos(ph.center[1] * Math.PI / 180), phi = -ph.rotationDeg * Math.PI / 180;
  const lx = (u - ph.widthPx / 2) * s, ly = -(v - ph.heightPx / 2) * s * (ph.aspectY ?? 1);
  return m.getPixelFromCoordinate([c[0] + lx * Math.cos(phi) - ly * Math.sin(phi), c[1] + lx * Math.sin(phi) + ly * Math.cos(phi)]);
}, [ph, u, v]);

await p.goto('http://localhost:4180/app', { waitUntil: 'networkidle' });
await p.fill('input[placeholder="예: 햇살 텃밭"]', '사진 시험 정원'); await p.locator('label:has-text("작성자") input').fill('레드진');
await p.click('button[type=submit]');
await goSite(19); await p.waitForTimeout(1500);
// a zone so drawings appear over the photo
const box0 = await p.locator('.map').boundingBox();
await p.locator('.map').hover(); await p.keyboard.press('z');
await p.locator('.shape-picker button', { hasText: /^원$/ }).click();
await p.mouse.click(box0.x + 500, box0.y + 400); await p.mouse.click(box0.x + 560, box0.y + 400); await p.waitForTimeout(400);
await p.keyboard.press('Escape');

// 1) upload 8000x8000 / 32.8MB JPEG; record long tasks
await p.evaluate(() => { window.__lt = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); });
await p.click('button[aria-label^="배경 사진"]');
const t0 = Date.now();
await p.locator('input[aria-label="사진 올리기"]').setInputFiles(PH + 'big_8000.jpg');
await p.waitForFunction(() => /배경 사진 big_8000/.test(document.body.innerText), null, { timeout: 60000 });
R.uploadMs = Date.now() - t0;
R.longTasksMs = await p.evaluate(() => window.__lt.sort((a, b) => b - a).slice(0, 5));
R.panel = (await p.locator('.photo-panel').innerText()).split('\n').filter(l => /원본|화면용|지상|배치/.test(l));
await p.waitForTimeout(800);
await p.screenshot({ path: SH + '22_photo_uploaded.png' });
let f = await auto();
R.placement1 = f.photo && { w: f.photo.widthPx, h: f.photo.heightPx, mPerPx: +f.photo.mPerPx.toFixed(4), src: f.photo.source };

// 2) 2-point alignment: image (1000,1000)->screen A, (7000,7000)->screen B
await p.click('.photo-panel button:has-text("2점 정렬")');
let box = await p.locator('.map').boundingBox();
for (const uv of [[1000, 1000], [7000, 7000]]) { const s = await imgToScreen(f.photo, uv); await p.mouse.click(box.x + s[0], box.y + s[1]); await p.waitForTimeout(250); }
R.pickHint = await p.locator('.pick-hint').innerText();
const A = [300, 250], B = [720, 600];
await p.mouse.click(box.x + A[0], box.y + A[1]); await p.waitForTimeout(250);
await p.screenshot({ path: SH + '22_photo_align_pick.png' });
await p.mouse.click(box.x + B[0], box.y + B[1]); await p.waitForTimeout(1300);
f = await auto();
const a2 = await imgToScreen(f.photo, [1000, 1000]), b2 = await imgToScreen(f.photo, [7000, 7000]);
R.align = { src: f.photo.source, rot: f.photo.rotationDeg, mPerPx: +f.photo.mPerPx.toFixed(5), errA: +Math.hypot(a2[0] - A[0], a2[1] - A[1]).toFixed(2), errB: +Math.hypot(b2[0] - B[0], b2[1] - B[1]).toFixed(2), res: await p.locator('[data-testid=photo-res]').innerText() };
// opacity + hide satellite
await p.locator('input[aria-label="사진 투명도"]').fill('0.85');
await p.locator('label:has-text("위성(브이월드) 숨기고") input').check();
await p.waitForTimeout(600);
await p.screenshot({ path: SH + '22_photo_aligned.png' });

// 3) zoom in to 0.5 m scale via + button
const tilesBefore = tileZ.length;
await p.locator('.photo-panel').evaluate(() => {});
for (let i = 0; i < 9; i++) { await p.click('.ol-zoom-in'); await p.waitForTimeout(350); }
await p.waitForTimeout(800);
R.zoom = await p.evaluate(() => { const v = window.__olmap.getView(); return { zoom: v.getZoom(), maxZoom: v.getMaxZoom(), res3857: v.getResolution() }; });
R.scaleBar = await p.locator('.scale-bar').innerText();
R.groundPerPx = Number(await p.locator('.scale-bar').getAttribute('data-ground'));
await p.screenshot({ path: SH + '22_photo_zoom_05m.png' });
// satellite on to verify overzoom requests stay <= 19
await p.locator('label:has-text("위성(브이월드) 숨기고") input').uncheck(); await p.waitForTimeout(1500);
R.maxTileZ = Math.max(...tileZ); R.tileReqDuringZoom = tileZ.length - tilesBefore;
await p.screenshot({ path: SH + '22_photo_zoom_05m_satellite.png' });
await p.locator('label:has-text("위성(브이월드) 숨기고") input').check();
await goSite(19); await p.waitForTimeout(1200);

// 4) reload persistence
f = await auto(); const before = JSON.stringify(f.photo);
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
f = await auto();
R.reload = { samePlacement: JSON.stringify(f.photo) === before, painted: await p.evaluate(() => { const c = document.querySelector('.photo-layer canvas'); if (!c) return 'no-canvas'; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) n++; return n; }) };
await p.screenshot({ path: SH + '22_photo_after_reload.png' });

// 5) export PNG includes photo
await p.keyboard.press('Control+e'); await p.waitForTimeout(200);
let [dl] = await Promise.all([p.waitForEvent('download'), p.click('.export-menu button:has-text("PNG")')]);
await dl.saveAs(SH + '22_photo_export.png'); R.exportName = dl.suggestedFilename();

// 6) .garden.json: embed (accept) and placement-only (dismiss)
dialogAccept = true;
[dl] = await Promise.all([p.waitForEvent('download'), p.keyboard.press('Control+s')]);
await dl.saveAs('/tmp/pw/photo/embed.garden.json');
dialogAccept = false;
[dl] = await Promise.all([p.waitForEvent('download'), p.keyboard.press('Control+s')]);
await dl.saveAs('/tmp/pw/photo/noembed.garden.json');
dialogAccept = true;
const ej = JSON.parse(fs.readFileSync('/tmp/pw/photo/embed.garden.json', 'utf8')), nj = JSON.parse(fs.readFileSync('/tmp/pw/photo/noembed.garden.json', 'utf8'));
R.files = { embedMB: +(fs.statSync('/tmp/pw/photo/embed.garden.json').size / 1048576).toFixed(1), embedHasData: !!ej.photoData, noEmbedMB: +(fs.statSync('/tmp/pw/photo/noembed.garden.json').size / 1048576).toFixed(3), noEmbedHasPhoto: !!nj.photo && !nj.photoData };
f = await auto(); R.autosaveHasNoPhotoData = !f.photoData;

// 7) fresh browser profile: open both files
for (const [name, file] of [['embed', '/tmp/pw/photo/embed.garden.json'], ['noembed', '/tmp/pw/photo/noembed.garden.json']]) {
  const c2 = await b.newContext({ viewport: { width: 1400, height: 900 } }); const q = await c2.newPage(); q.on('dialog', d => d.accept());
  await q.goto('http://localhost:4180/app', { waitUntil: 'networkidle' });
  await q.click('.modal button:has-text("취소")').catch(() => {});
  await q.locator('input[type=file][accept*="garden.json"]').setInputFiles(file);
  await q.waitForTimeout(4000);
  await q.click('button[aria-label^="배경 사진"]'); await q.waitForTimeout(300);
  const txt = await q.locator('.photo-panel').innerText();
  R['open_' + name] = { missingWarning: txt.includes('다시 연결'), painted: await q.evaluate(() => { const c = document.querySelector('.photo-layer canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) n++; return n; }) };
  if (name === 'noembed') {
    await q.screenshot({ path: SH + '22_photo_relink_prompt.png' });
    await q.locator('input[aria-label="사진 다시 연결"]').setInputFiles(PH + 'big_8000.jpg');
    await q.waitForTimeout(5000);
    R.relinked = { missing: (await q.locator('.photo-panel').innerText()).includes('다시 연결') };
  }
  await c2.close();
}

// 8) world file placement in fresh profile
{
  const c3 = await b.newContext({ viewport: { width: 1400, height: 900 } }); const q = await c3.newPage();
  await q.goto('http://localhost:4180/app', { waitUntil: 'networkidle' });
  await q.fill('input[placeholder="예: 햇살 텃밭"]', '월드파일'); await q.click('button[type=submit]');
  await q.click('button[aria-label^="배경 사진"]');
  await q.locator('input[aria-label="사진 올리기"]').setInputFiles([PH + 'wf_test.png', PH + 'wf_test.pgw']);
  await q.waitForFunction(() => /월드파일 좌표로 배치/.test(document.body.innerText), null, { timeout: 20000 });
  await q.waitForTimeout(2500);
  const g = await q.evaluate(() => new Promise((res) => { const r = indexedDB.open('permaculture-garden'); r.onsuccess = () => { const g = r.result.transaction('autosave').objectStore('autosave').get('current'); g.onsuccess = () => res(g.result.file.photo); }; }));
  R.worldfile = { src: g.source, crs: g.crs, center: g.center.map(x => +x.toFixed(7)), expectCenter: [127.1100005 - 0.0000005 + 0.0005, 37.4009995 + 0.0000005 - 0.0004].map(x => +x.toFixed(7)), mPerPx: +g.mPerPx.toFixed(4), aspectY: g.aspectY };
  await q.screenshot({ path: SH + '22_photo_worldfile.png' });
  await c3.close();
}
R.errors = errs.slice(0, 6);
fs.writeFileSync('/tmp/pw/photo/result.json', JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
await b.close();
