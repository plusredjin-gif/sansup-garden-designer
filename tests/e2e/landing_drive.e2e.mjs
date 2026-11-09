import { chromium } from 'playwright';
import fs from 'node:fs';
const SH = '/workspace/permaculture-garden/shots/';
const R = {}; const errs = [];
const ok = (k, v) => { R[k] = v; };
const b = await chromium.launch();
const watch = (p, tag) => { p.on('pageerror', e => errs.push(`${tag} pageerror ${e.message}`)); p.on('console', m => { if (m.type() === 'error' && !/vworld|Failed to load resource/.test(m.text())) errs.push(`${tag} console ${m.text().slice(0, 140)}`); }); };

// ---------- A) 실제 빌드(클라이언트 ID 없음) ----------
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); watch(p, 'A');
  await p.goto('http://localhost:4180/', { waitUntil: 'networkidle' });
  ok('A_title', await p.title());
  ok('A_h1', await p.locator('h1').innerText());
  ok('A_featureCards', await p.locator('.lp-card').count());
  ok('A_logoLoaded', await p.locator('.lp-head img.brand-logo, .lp-head img').first().evaluate(i => i.complete && i.naturalWidth));
  ok('A_footerLink', await p.locator('.lp-foot a').getAttribute('href'));
  ok('A_loginText', (await p.locator('#login').innerText()).includes('drive.file'));
  ok('A_mascots', await p.locator('img.mascot, .lp img[src*="/mascot/"]').evaluateAll(es => es.map(i => `${i.getAttribute('src').split('/').pop()}:${i.complete && i.naturalWidth > 0 && getComputedStyle(i).display !== 'none'}`)));
  ok('A_heroShotLoaded', await p.locator('.lp-hero-shot img').evaluate(i => i.naturalWidth));
  await p.screenshot({ path: SH + '23_landing_desktop.png' });
  await p.screenshot({ path: SH + '24_landing_mascot_desktop.png' });
  await p.screenshot({ path: SH + '24_landing_mascot_desktop_full.png', fullPage: true });
  await p.screenshot({ path: SH + '23_landing_desktop_full.png', fullPage: true });
  await p.getByRole('button', { name: '구글로 시작하기' }).click();
  ok('A_setupMsg', await p.locator('.lp-setup').innerText());
  await p.screenshot({ path: SH + '23_landing_noclient.png' });
  await p.getByRole('button', { name: '로그인 없이 써보기' }).first().click();
  await p.waitForURL('**/app'); ok('A_url', p.url());
  ok('A_modalMascot', await p.locator('.modal-mascot').evaluate(i => i.naturalWidth > 0).catch(() => false));
  await p.screenshot({ path: SH + '24_editor_new_modal_mascot.png' });
  await p.fill('input[placeholder="예: 햇살 텃밭"]', '체험 정원'); await p.click('button[type=submit]');
  await p.waitForTimeout(800);
  ok('A_topbarBrand', await p.locator('.brand').innerText());
  ok('A_editorTitle', await p.title());
  ok('A_loginBtnInEditor', await p.locator('.account button').innerText());
  await p.locator('.account button').click(); await p.waitForTimeout(300);
  ok('A_editorNoClientMsg', await p.locator('body').innerText().then(t => t.includes('VITE_GOOGLE_CLIENT_ID')));
  await p.screenshot({ path: SH + '23_landing_editor_nologin.png' });
  // 새로고침 후 로컬 자동저장 유지
  await p.waitForTimeout(1500); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  ok('A_localAutosaveName', await p.title());
  await p.locator('.brand').click(); await p.waitForURL('http://localhost:4180/'); ok('A_brandBackToLanding', await p.locator('h1').innerText());
  await ctx.close();
}
// ---------- B) 모바일 ----------
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); watch(p, 'B');
  await p.goto('http://localhost:4180/', { waitUntil: 'networkidle' });
  ok('B_noHScroll', await p.evaluate(() => document.querySelector('.lp').scrollWidth <= innerWidth));
  ok('B_heroCols', await p.locator('.lp-hero').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length));
  ok('B_cardCols', await p.locator('.lp-grid').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length));
  ok('B_mascotsVisible', await p.locator('.lp img[src*="/mascot/"]').evaluateAll(es => es.filter(i => i.naturalWidth > 0 && getComputedStyle(i).display !== 'none').length));
  await p.screenshot({ path: SH + '23_landing_mobile.png' });
  await p.screenshot({ path: SH + '24_landing_mascot_mobile.png' });
  await p.screenshot({ path: SH + '24_landing_mascot_mobile_full.png', fullPage: true });
  await p.screenshot({ path: SH + '23_landing_mobile_full.png', fullPage: true });
  await ctx.close();
}
// ---------- C) 테스트 클라이언트 ID 빌드 + 가짜 GIS/드라이브 ----------
{
  const drive = { files: new Map(), seq: 0, calls: [] };
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: `
    window.__gis = { prompts: [], fail: sessionStorage.getItem('gisfail') === '1', revoked: [] };
    window.google = { accounts: { oauth2: {
      initTokenClient(c) { window.__gis.clientId = c.client_id; window.__gis.scope = c.scope;
        const t = { callback: c.callback, requestAccessToken(o) { window.__gis.prompts.push(o?.prompt ?? null);
          setTimeout(() => window.__gis.fail ? c.error_callback?.({ type: 'popup_failed_to_open' }) : t.callback({ access_token: 'tok' + window.__gis.prompts.length, expires_in: 3600 }), 60); } };
        return t; },
      revoke(tk, d) { window.__gis.revoked.push(tk); d && d(); } } } };` }));
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'Location' };
  await ctx.route('https://www.googleapis.com/**', async (route) => {
    const req = route.request(); const u = new URL(req.url()); const m = req.method();
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const auth = req.headers()['authorization'] || '';
    drive.calls.push(`${m} ${u.pathname}${u.searchParams.get('uploadType') ? '?' + u.searchParams.get('uploadType') : ''}`);
    const json = (o, s = 200, h = {}) => route.fulfill({ status: s, headers: { ...cors, 'content-type': 'application/json', ...h }, body: JSON.stringify(o) });
    if (!auth.startsWith('Bearer tok')) return json({ error: { message: 'bad token' } }, 401);
    if (u.pathname === '/oauth2/v3/userinfo') return json({ email: 'tester@example.com', name: '시험 사용자', picture: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2226%22 height=%2226%22%3E%3Ccircle cx=%2213%22 cy=%2213%22 r=%2213%22 fill=%22%234f8a61%22/%3E%3C/svg%3E' });
    const now = () => new Date().toISOString();
    if (u.pathname === '/drive/v3/files' && m === 'GET') {
      const q = u.searchParams.get('q');
      const all = [...drive.files.values()];
      const hit = q.includes('vnd.google-apps.folder') ? all.filter(f => f.folder && f.name === '정원설계') : all.filter(f => !f.folder && f.name.includes('.garden.json') && q.includes(`'${f.parent}' in parents`));
      return json({ files: hit.map(({ id, name, modifiedTime }) => ({ id, name, modifiedTime })) });
    }
    if (u.pathname === '/drive/v3/files' && m === 'POST') { const b = JSON.parse(req.postData()); const id = 'fold' + (++drive.seq); drive.files.set(id, { id, name: b.name, folder: true, modifiedTime: now() }); return json({ id }); }
    const parseMp = (buf) => { const s = buf.toString('utf8'); const parts = s.split(/--sanstree[a-z0-9]+/); const meta = JSON.parse(parts[1].split('\r\n\r\n')[1]); const body = parts[2].split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''); return { meta, body }; };
    if (u.pathname === '/upload/drive/v3/files' && u.searchParams.get('uploadType') === 'multipart' && m === 'POST') { const { meta, body } = parseMp(req.postDataBuffer()); const id = 'g' + (++drive.seq); drive.files.set(id, { id, name: meta.name, parent: meta.parents?.[0], body, mime: meta.mimeType, modifiedTime: now() }); return json({ id, name: meta.name, modifiedTime: now() }); }
    let mm;
    if ((mm = u.pathname.match(/^\/upload\/drive\/v3\/files\/([^/]+)$/)) && m === 'PATCH') { const f = drive.files.get(mm[1]); if (!f) return json({ error: { message: 'nf' } }, 404); const { meta, body } = parseMp(req.postDataBuffer()); Object.assign(f, { name: meta.name, body, modifiedTime: now() }); return json({ id: f.id, name: f.name, modifiedTime: f.modifiedTime }); }
    if (u.pathname === '/upload/drive/v3/files' && u.searchParams.get('uploadType') === 'resumable' && m === 'POST') { const meta = JSON.parse(req.postData()); const id = 'p' + (++drive.seq); drive.files.set(id, { id, name: meta.name, parent: meta.parents?.[0], pending: true }); return route.fulfill({ status: 200, headers: { ...cors, location: `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=${id}` }, body: '' }); }
    if (u.pathname === '/upload/drive/v3/files' && m === 'PUT') { const id = u.searchParams.get('upload_id'); const f = drive.files.get(id); f.bin = req.postDataBuffer(); f.pending = false; return json({ id }); }
    if ((mm = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/)) && u.searchParams.get('alt') === 'media') { const f = drive.files.get(mm[1]); if (!f) return json({ error: { message: 'nf' } }, 404); return route.fulfill({ status: 200, headers: cors, body: f.bin ?? f.body }); }
    return json({ error: { message: 'unmocked ' + u.pathname } }, 400);
  });
  const p = await ctx.newPage(); watch(p, 'C');
  await p.goto('http://localhost:4181/', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: '구글로 시작하기' }).click();
  await p.waitForURL('**/app', { timeout: 8000 }); ok('C_afterLoginUrl', p.url());
  ok('C_gis', await p.evaluate(() => window.__gis));
  await p.fill('input[placeholder="예: 햇살 텃밭"]', '드라이브 정원'); await p.click('button[type=submit]');
  ok('C_email', await p.locator('.account .email').textContent()); ok('C_logoutRightGap', await p.getByRole('button', { name: '로그아웃' }).evaluate(b => innerWidth - b.getBoundingClientRect().right)); ok('C_topbarFits', await p.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: innerWidth, bar: document.querySelector('.topbar').scrollWidth, barW: document.querySelector('.topbar').clientWidth })));
  // 그림 하나 그리고 사진 하나 올려서 자동저장(4초) 기다림
  const box = await p.locator('.map').boundingBox();
  await p.locator('.map').hover(); await p.keyboard.press('z');
  await p.locator('.shape-picker button', { hasText: /^원$/ }).click();
  await p.mouse.click(box.x + 600, box.y + 400); await p.mouse.click(box.x + 660, box.y + 400); await p.waitForTimeout(300); await p.keyboard.press('Escape');
  await p.click('button[aria-label^="배경 사진"]');
  await p.locator('input[aria-label="사진 올리기"]').setInputFiles('/tmp/pw/photo/wf_test.png');
  await p.waitForTimeout(1500);
  await p.waitForFunction(() => /드라이브 (오전 |오후 )?\d/.test(document.querySelector('.save-state')?.textContent || ''), null, { timeout: 15000 }).catch(async (e) => { console.log('SAVESTATE', await p.locator('.save-state').innerText(), JSON.stringify(drive.calls), errs); await p.screenshot({ path: '/tmp/pw/dbg_drive.png' }); throw e; });
  ok('C_saveState', await p.locator('.save-state').innerText());
  const gardens = [...drive.files.values()].filter(f => f.name?.endsWith('.garden.json'));
  const photos = [...drive.files.values()].filter(f => f.bin);
  const g0 = JSON.parse(gardens[0].body);
  ok('C_driveFolder', [...drive.files.values()].filter(f => f.folder).map(f => f.name));
  ok('C_driveGardens', gardens.map(f => ({ name: f.name, parent: f.parent, features: g0.features.length, photoRef: g0.photo?.driveFileId, hasPhotoData: 'photoData' in g0 })));
  ok('C_drivePhotos', photos.map(f => ({ id: f.id, bytes: f.bin.length, parent: f.parent })));
  // 수정 → 덮어쓰기 (PATCH)
  await p.keyboard.press('Escape');
  await p.getByRole('button', { name: '드라이브에 저장' }).click(); await p.waitForTimeout(800);
  ok('C_patchCalls', drive.calls.filter(c => c.startsWith('PATCH')).length);
  ok('C_gardenFileCount', [...drive.files.values()].filter(f => f.name?.endsWith('.garden.json')).length);
  // 다른 브라우저(새 프로필)에서 드라이브로 열기 → 사진도 내려받기
  await p.screenshot({ path: SH + '23_landing_editor_drive.png' });
  // 같은 컨텍스트에서 IndexedDB 사진 지우고(시험용 브라우저 데이터) 드라이브에서 열기
  ok('C_photosBeforeClear', await p.evaluate(() => new Promise(res => { const r = indexedDB.open('permaculture-garden'); r.onsuccess = () => { const t = r.result.transaction('photos', 'readwrite'); const st = t.objectStore('photos'); const c = st.count(); c.onsuccess = () => { const n = c.result; st.clear(); t.oncomplete = () => { r.result.close(); res(n); }; }; }; })));
  await p.getByRole('button', { name: '드라이브에서 열기' }).click();
  await p.locator('.drive-panel li button').first().waitFor({ timeout: 5000 });
  ok('C_listItems', await p.locator('.drive-panel li button').allInnerTexts());
  await p.screenshot({ path: SH + '23_landing_drive_list.png' });
  const mediaBefore = drive.calls.filter(c => c.includes('/files/p')).length;
  await p.locator('.drive-panel li button').first().click(); await p.waitForTimeout(1500);
  ok('C_openedMsg', await p.locator('body').innerText().then(t => /드라이브에서 .* 열었어요/.test(t)));
  ok('C_photoDownloadedFromDrive', drive.calls.filter(c => c.includes('/files/p')).length - mediaBefore);
  ok('C_photoPaintedAfterOpen', await p.locator('[data-testid=photo-res]').count());
  ok('C_photosAfterOpen', await p.evaluate(() => new Promise(res => { const r = indexedDB.open('permaculture-garden'); r.onsuccess = () => { const c = r.result.transaction('photos').objectStore('photos').count(); c.onsuccess = () => { r.result.close(); res(c.result); }; }; })));
  // 토큰 만료 ① 조용한 재요청 성공
  const expire = (fail) => p.evaluate((fail) => { const k = 'sanstree-session'; const s = JSON.parse(sessionStorage.getItem(k)); s.expiresAt = Date.now() - 1000; sessionStorage.setItem(k, JSON.stringify(s)); sessionStorage.setItem('gisfail', fail ? '1' : '0'); }, fail);
  await expire(false); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await p.getByRole('button', { name: '드라이브에서 열기' }).click();
  await p.locator('.drive-panel li button').first().waitFor({ timeout: 5000 });
  ok('C_silentRefresh', { prompts: await p.evaluate(() => window.__gis.prompts), banner: await p.locator('.reconnect').count(), listed: await p.locator('.drive-panel li button').count() });
  // ② 조용한 재요청 실패 → 다시 연결 배너
  await expire(true); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await p.getByRole('button', { name: '드라이브에서 열기' }).click();
  await p.locator('.reconnect').waitFor({ timeout: 5000 }).catch(() => {});
  ok('C_reconnectBanner', await p.locator('.reconnect').count());
  ok('C_listErrShown', await p.locator('.drive-panel .err').count());
  await p.screenshot({ path: SH + '23_landing_reconnect.png' });
  await p.evaluate(() => { window.__gis.fail = false; });
  await p.locator('.reconnect button').click(); await p.waitForTimeout(700);
  ok('C_reconnectGone', (await p.locator('.reconnect').count()) === 0);
  await p.getByRole('button', { name: '로그아웃' }).click(); await p.waitForTimeout(300);
  ok('C_afterLogout', await p.locator('.account').innerText());
  ok('C_revoked', await p.evaluate(() => window.__gis.revoked));
  ok('C_driveCalls', drive.calls);
  await ctx.close();
}
R.errors = errs;
fs.writeFileSync('/tmp/pw/landing.json', JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
await b.close();
