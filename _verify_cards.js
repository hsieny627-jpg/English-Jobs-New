/* _verify_cards.js — 📇 單字卡（story.html）記成績的量測（2026-10-17）。假的成績系統：AI-Agent-Open-Code/score/_gas_stub.js 跑真的 Code.gs，絕對不送到真的成績表。
 *   NODE_PATH=$(npm root -g) node _verify_cards.js    （AI-Agent-Open-Code 要放在旁邊：../AI-Agent-Open-Code）
 * 量：沒登入有〔🔑 登入 記 練習〕、5 碼登入（打錯班級擋下來）、第 1 站 6 張都看完 ＝ 送一筆 🎧（g4l_job-s1）、離開這一頁 ＝ 送一筆 👀（g4v_job）、
 *     老師任務只開第 1 站 ＝ 第 7 張（第 2 站）🔒、按鈕 ≧ 48px、字 ≧ 20px、三種尺寸不左右捲 */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const AI = [path.join(__dirname, '..', 'AI-Agent-Open-Code'), '/home/user/AI-Agent-Open-Code'].find(d => fs.existsSync(path.join(d, 'score', '_gas_stub.js')));
if (!AI) { console.log('找不到 AI-Agent-Open-Code（假的成績系統）'); process.exit(1); }
const { make } = require(path.join(AI, 'score', '_gas_stub.js'));
const URL0 = 'https://script.test/exec', E = []; let n = 0;
(async () => {
  const br = await chromium.launch();
  for (const vp of [[1024, 768], [820, 1180], [1920, 1080]]) {
    const tag = vp.join('✕'), G = make({ TEACHER_PW: 'pw' }), ctx = await br.newContext({ viewport: { width: vp[0], height: vp[1] } });
    await ctx.addInitScript(u => { Object.defineProperty(window, 'SCORE_URL', { get: () => u, set: () => {}, configurable: true }); window.speechSynthesis && (window.speechSynthesis.speak = () => {}); }, URL0);
    await ctx.route(URL0 + '**', async r => { const q = Object.fromEntries(new URL(r.request().url()).searchParams);
      const body = r.request().method() === 'POST' ? G.post(r.request().postData()) : G.get(q);
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) }); });
    await ctx.route(/script\.google\.com/, r => r.abort());
    /* 老師派任務：只開第 1 站（現在～1 小時後） */
    G.post({ a: 'task', pw: 'pw', op: 'set', t: { id: 't1', name: '字卡', g: 4, cls: ['402'], items: ['g4l_job-s1'], nm: {}, from: Date.now() - 6e4, to: Date.now() + 36e5 } });
    const p = await ctx.newPage(); p.on('pageerror', x => E.push(tag + ' JS 錯誤：' + x.message));
    await p.goto('file://' + path.join(__dirname, 'story.html')); await p.waitForTimeout(600);
    const c0 = await p.evaluate(() => { const b = document.querySelector('#scj button'); return b ? { t: b.textContent, h: b.getBoundingClientRect().height, f: parseFloat(getComputedStyle(b).fontSize) } : null; });
    if (!c0 || !/登入/.test(c0.t) || c0.h < 48 || c0.f < 20) E.push(tag + '：沒登入沒有〔🔑 登入 記 練習〕（或太小）' + JSON.stringify(c0));
    await p.click('[data-scj="in"]');
    for (const k of '50601') await p.click('[data-scjk="' + k + '"]');
    if (!/沒有 506 班/.test(await p.textContent('#scjm'))) E.push(tag + '：打錯班級 沒有擋');
    for (const k of '40201') await p.click('[data-scjk="' + k + '"]');
    await p.waitForTimeout(600);
    if (!/40201/.test(await p.textContent('#scj'))) E.push(tag + '：登入以後 右上角 沒有 5 碼');
    await p.goto('file://' + path.join(__dirname, 'story.html') + '#w1'); await p.waitForTimeout(500);
    /* 第 1 站：第 1～6 張，每一張點 6 下（6 步）走完 */
    for (let k = 0; k < 6; k++) for (let s = 0; s < 6; s++) { await p.click('#card', { position: { x: 30, y: 30 } }); await p.waitForTimeout(40); }
    await p.waitForTimeout(800);
    const L = G.books['紀錄'].d.slice(1).map(r => r[G.ctx.SC.CI['題組']] + '|' + r[G.ctx.SC.CI['玩法']]);
    if (!L.some(x => /^g4l_job-s1\|聽完字卡/.test(x))) E.push(tag + '：第 1 站 6 張 看完 沒有 送 🎧（' + L.join('、') + '）');
    /* 現在是第 7 張（第 2 站）：任務沒開 ➜ 🔒 */
    const lk = await p.evaluate(() => ({ em: document.getElementById('em').textContent, cap: document.getElementById('cap').textContent }));
    if (lk.em !== '🔒' || !/指定 別的/.test(lk.cap)) E.push(tag + '：任務 只開 第 1 站，第 7 張 沒有 鎖：' + JSON.stringify(lk));
    await p.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await p.waitForTimeout(800);
    const L2 = G.books['紀錄'].d.slice(1).map(r => r[G.ctx.SC.CI['題組']]);
    if (L2.indexOf('g4v_job') < 0) E.push(tag + '：離開 這一頁 沒有 送 👀 看字卡（' + L2.join('、') + '）');
    const ox = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ox > 1) E.push(tag + '：左右捲 ' + ox + 'px');
    n += 8; await ctx.close();
  }
  await br.close();
  E.forEach(x => console.log('✗ ' + x));
  console.log('單字卡 記成績 量測 ' + n + ' 項，' + E.length + ' 個失敗');
  process.exit(E.length ? 1 : 0);
})();
