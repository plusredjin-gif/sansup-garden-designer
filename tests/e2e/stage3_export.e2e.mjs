import { chromium } from 'playwright';
import fs from 'node:fs';
const SH = '/workspace/permaculture-garden/shots/';
const log = (...a) => console.log(...a);
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('pageerror ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
p.on('dialog', d => d.accept());
await p.goto('http://localhost:4180/app', { waitUntil: 'networkidle' });
await p.fill('input[placeholder="예: 햇살 텃밭"]', '햇살 텃밭');
await p.locator('label:has-text("작성자") input').fill('레드진');
await p.click('button[type=submit]');
// jump map close (판교 부근 시험 좌표)
await p.evaluate(() => { const m = window.__olmap; const x = 127.1107 * 20037508.34 / 180; const y = Math.log(Math.tan((90 + 37.4005) * Math.PI / 360)) * 20037508.34 / Math.PI; m.getView().setCenter([x, y]); m.getView().setZoom(19); });
await p.waitForTimeout(1500);
let box = await p.locator('.map').boundingBox();
const rebox = async () => { box = await p.locator('.map').boundingBox(); };
const P = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
const click = async (fx, fy) => { await rebox(); const [x, y] = P(fx, fy); await p.mouse.click(x, y); await p.waitForTimeout(120); };
const dbl = async (fx, fy) => { await rebox(); const [x, y] = P(fx, fy); await p.mouse.dblclick(x, y); await p.waitForTimeout(250); };
const key = async (k) => { await p.locator('.map').hover(); await p.keyboard.press(k); await p.waitForTimeout(150); };
const auto = () => p.evaluate(() => new Promise((res, rej) => { const r = indexedDB.open('permaculture-garden'); r.onsuccess = () => { const db = r.result; const st = db.transaction(db.objectStoreNames[0]).objectStore(db.objectStoreNames[0]); const g = st.get('current'); g.onsuccess = () => res(g.result?.file ?? null); g.onerror = rej; }; r.onerror = rej; }));
const wait = () => p.waitForTimeout(1300);
const result = {};

// 1) circle zone
await key('z'); await p.click('.shape-picker button:has-text("원")');
await click(0.25, 0.35); await click(0.32, 0.35);
// 2) freehand zone
await key('z'); await p.click('.shape-picker button:has-text("자유곡선")');
{ await rebox(); const [cx, cy] = P(0.55, 0.35); await p.mouse.move(cx + 60, cy); await p.mouse.down();
  for (let i = 1; i <= 40; i++) { const a = i / 40 * 2 * Math.PI; await p.mouse.move(cx + Math.cos(a) * (60 + 12 * Math.sin(5 * a)), cy + Math.sin(a) * 45, { steps: 2 }); }
  await p.mouse.up(); await p.waitForTimeout(300); }
// 3) smooth bed
await key('g'); await p.locator('.shape-picker button', { hasText: /^곡선$/ }).click();
await click(0.70, 0.60); await click(0.82, 0.60); await click(0.82, 0.75); await dbl(0.70, 0.75);
await wait();
let f = await auto();
const zones = f.features.filter(x => x.kind === 'zone'), bed = f.features.find(x => x.kind === 'bed');
result.circle = zones.find(z => z.props.shape?.mode === 'circle')?.props;
result.freehand = zones.find(z => z.props.shape?.mode === 'freehand');
result.freehandVerts = result.freehand?.geometry.coordinates[0].length; result.freehand = result.freehand?.props.areaM2;
result.smooth = { mode: bed?.props.shape?.mode, verts: bed?.geometry.coordinates[0].length, area: bed?.props.areaM2 };
await p.keyboard.press('Escape');
await p.screenshot({ path: SH + '20_stage3_shapes.png' });

// 4) plant picker → tree
await key('t');
await p.fill('input[aria-label="한국 이름 검색"]', '사과');
await p.waitForTimeout(200);
const opts = await p.locator('.plant-options button').allInnerTexts();
result.searchApple = opts.slice(0, 4);
await p.locator('.plant-options button', { hasText: '사과' }).first().click();
await p.screenshot({ path: SH + '20_stage3_plant_picker.png' });
await click(0.42, 0.62);
await wait(); f = await auto();
const tree = f.features.find(x => x.kind === 'tree');
result.tree = tree?.props;

// 5) water arrows
await key('w'); await click(0.15, 0.15); await click(0.22, 0.25); await dbl(0.30, 0.32);
await key('w'); await click(0.60, 0.12); await dbl(0.66, 0.26);
await wait(); f = await auto();
result.arrows = f.features.filter(x => x.kind === 'water-flow').map(x => x.props.lengthM);

// 6) guild stamp + member drag alone / whole
await key('j'); await click(0.45, 0.82);
await wait(); f = await auto();
const gid = f.features.find(x => x.kind === 'plant')?.props.guildId;
const pix = (c) => p.evaluate(([lon, lat]) => { const m = window.__olmap; const x = lon * 20037508.34 / 180; const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) * 20037508.34 / Math.PI; return m.getPixelFromCoordinate([x, y]); }, c);
const snap = (ff) => Object.fromEntries(ff.features.filter(x => x.props.guildId === gid).map(x => [x.id, x.geometry.coordinates.join(',')]));
const before = snap(f);
let member = f.features.find(x => x.kind === 'plant' && x.props.guildId === gid);
await key('v');
let [mx, my] = await pix(member.geometry.coordinates);
await rebox(); await p.mouse.click(box.x + mx, box.y + my); await p.waitForTimeout(400);
// 겹친 식물 중 실제로 선택된 것을 추적
const selId = await p.evaluate(() => { for (const i of window.__olmap.getInteractions().getArray()) if (i.getFeatures && i.getFeatures().getLength()) return i.getFeatures().item(0).getId(); return null; });
member = f.features.find(x => x.id === selId) ?? member; result.selectedKind = member.kind;
[mx, my] = await pix(member.geometry.coordinates);

await p.mouse.move(box.x + mx, box.y + my); await p.mouse.down(); await p.mouse.move(box.x + mx + 40, box.y + my + 10, { steps: 8 }); await p.mouse.up();
await wait(); f = await auto();
const afterAlone = snap(f);
result.aloneMoved = Object.keys(before).filter(k => before[k] !== afterAlone[k]).length;
const wholeBox = p.locator('label:has-text("길드 전체 함께 이동") input');
result.wholeCheckboxVisible = await wholeBox.isVisible();
await wholeBox.check();
const m2 = f.features.find(x => x.id === member.id);
[mx, my] = await pix(m2.geometry.coordinates);
await p.mouse.move(box.x + mx, box.y + my); await p.mouse.down(); await p.mouse.move(box.x + mx - 30, box.y + my - 30, { steps: 8 }); await p.waitForTimeout(100); await p.mouse.up();
await wait(); f = await auto();
const afterWhole = snap(f);
result.wholeMoved = Object.keys(afterAlone).filter(k => afterAlone[k] !== afterWhole[k]).length;
result.guildSize = Object.keys(before).length;
await p.screenshot({ path: SH + '20_stage3_guild_move.png' });
await p.keyboard.press('Escape');
// undo restores? 1 step
await p.keyboard.press('Control+z'); await wait(); f = await auto();
result.undoRestoresAlone = JSON.stringify(snap(f)) === JSON.stringify(afterAlone);
await p.keyboard.press('Control+y'); await wait();

// 7) layers: sun + shade on, hide water-flow
await key('l');
await p.locator('label:has-text("해 방향") input').check();
await p.locator('label:has-text("그늘 부채") input').check();
await p.getByRole('checkbox', { name: /^물흐름 \d/ }).uncheck();
await wait(); f = await auto();
result.hiddenKinds = f.ui?.hiddenKinds; result.overlays = f.analysis?.overlays;
await p.screenshot({ path: SH + '20_stage3_layers_water_hidden.png' });
await p.getByRole('checkbox', { name: /^물흐름 \d/ }).check();
await wait();
await p.screenshot({ path: SH + '20_stage3_water_shade_layers.png' });
const countBefore = (await auto()).features.length;

// 8) reload persistence
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
f = await auto();
result.reload = { count: f.features.length, expected: countBefore, circleMode: f.features.find(x => x.props.shape?.mode === 'circle') ? 'circle' : null, name: f.meta.name };
result.statusMsg = await p.locator('.status, footer').first().innerText().catch(() => '');
await p.screenshot({ path: SH + '20_stage3_after_reload.png' });

// 9) export PNG / PDF
await p.keyboard.press('Control+e'); await p.waitForTimeout(200);
await p.screenshot({ path: SH + '21_export_menu.png' });
let [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('.export-menu button:has-text("PNG")')]);
result.pngName = dl.suggestedFilename();
await dl.saveAs(SH + '21_export_sample.png');
await p.waitForTimeout(500);
result.statusAfterPng = await p.evaluate(() => document.body.innerText.match(/[^\n]*내보냄[^\n]*/)?.[0] ?? '');
await p.keyboard.press('Control+e'); await p.waitForTimeout(200);
[dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('.export-menu button:has-text("PDF")')]);
result.pdfName = dl.suggestedFilename();
await dl.saveAs(SH + '21_export_sample.pdf');
// empty-name filename
await p.keyboard.press('Control+i'); await p.fill('input[placeholder="예: 햇살 텃밭"]', ''); 
result.emptyNameSubmitDisabled = await p.locator('button[type=submit]').isDisabled();
await p.keyboard.press('Escape');
result.tileReq = await p.evaluate(() => performance.getEntriesByType('resource').filter(e => /vworld|arcgis/.test(e.name)).length);
result.errors = errs.slice(0, 8);
fs.writeFileSync('/tmp/pw/s3.json', JSON.stringify(result, null, 1));
log(JSON.stringify(result, null, 1));
await b.close();
