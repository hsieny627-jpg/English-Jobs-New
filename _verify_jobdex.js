// 量測 jobdex.html（📖 職業圖鑑＋🎮 5 種複習遊戲）：由 _verify.js 呼叫，也可以單獨跑 NODE_PATH=$(npm root -g) node _verify_jobdex.js
// 1. 資料：頁面上的職業、六型分數、最高型、母音／不發音、音節、30 句工作內容，和 evidence/quiz.json、story.html 一模一樣
// 2. 大廳＋圖鑑：4 種尺寸不橫向捲動、按鈕 ≥ 48px、字 ≥ 16px；每一本的數量；35 張卡的母音紅、不發音灰；興趣成分；三種音節動畫
// 3. 5 種遊戲 ✕ 3 種尺寸（iPad 直、iPad 橫、1920 觸控螢幕）：真的用手指動作答對第一題、連對 3 題開驚喜卡、答錯頁、⭐ 加分題、
//    時間到 ➜ 答錯整理 ➜ 結束畫面；東西都在畫面裡、按鈕 ≥ 48px、不橫向捲動
// 4. 登入：班級打錯立刻清空、座號打錯清掉座號、三個步驟會亮；成績送到 Google 成績表（量測時用假的伺服器，不會送出去）
const fs = require('fs');
const path = require('path');
const dir = __dirname;

module.exports = async function (browser, url) {
  let fail = 0, n = 0;
  const bad = m => { fail++; console.log('❌ jobdex ' + m); };
  const ok = (c, m) => { n++; if (!c) bad(m); };
  const story = fs.readFileSync(path.join(dir, 'story.html'), 'utf8');
  const Q = JSON.parse(fs.readFileSync(path.join(dir, 'evidence', 'quiz.json'), 'utf8'));
  const SYL = JSON.parse(story.match(/const SYL=(\{.*?\});/)[1]);
  const VOW = JSON.parse(story.match(/const VOW=(\{.*?\});/)[1]);
  const SILENT = JSON.parse(story.match(/const SILENT=(\{.*?\});/)[1]);
  const words = [...story.matchAll(/\{no:(\d+),e:'([^']+)',z:'([^']+)',ic:'([^']+)'/g)].map(m => ({ no: +m[1], e: m[2], z: m[3], ic: m[4] }));
  const html = fs.readFileSync(path.join(dir, 'jobdex.html'), 'utf8');
  for (const no of ['教育部', '教育局', 'fortune teller']) ok(!html.includes(no), `不應該出現：${no}`);
  const stub = () => { window.speechSynthesis.speak = u => setTimeout(() => u.onend && u.onend(), 5); window.speechSynthesis.cancel = () => {}; };
  const newPage = async (w, h, scoreOff = true) => {
    const p = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: false });
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.addInitScript(stub);
    if (scoreOff) await p.addInitScript(() => { window.__SCORE_TEST_OFF = 1; });
    await p.route(/script\.google\.com/, r => r.abort());   // 量測絕對不送到真的成績表
    return p;
  };

  // ── 1. 資料 ──
  {
    const p = await newPage(1024, 768);
    await p.goto(url('jobdex.html'));
    const D = await p.evaluate(() => D);
    const keep = words.filter(w => Q.jobs[w.e] || Q.no_data.some(x => x.e === w.e && x.show));
    ok(Object.keys(D.J).length === 35 && keep.length === 35, `職業數不是 35：${Object.keys(D.J).length}`);
    for (const w of keep) {
      const j = D.J[w.e], q = Q.jobs[w.e];
      if (!j) { bad('少了 ' + w.e); continue; }
      ok(j.z === w.z && j.ic === w.ic && j.n === w.no, `${w.e} 中文／圖示／卡號和 story.html 不一樣`);
      ok(j.syl === SYL[w.e] && j.syl.replace(/-/g, '') === w.e, `${w.e} 音節和 story.html 不一樣`);
      ok(JSON.stringify(j.v) === JSON.stringify(VOW[w.e] || []) && JSON.stringify(j.g) === JSON.stringify(SILENT[w.e] || []), `${w.e} 母音／不發音和 story.html 不一樣`);
      if (q) {
        const mx = Math.max(...Object.values(q.scores));
        ok(JSON.stringify(j.s) === JSON.stringify(q.scores) && j.code === q.code && j.url === q.url, `${w.e} 六型分數和 evidence/quiz.json 不一樣`);
        ok(JSON.stringify(j.top) === JSON.stringify('RIASEC'.split('').filter(t => q.scores[t] === mx)), `${w.e} 最高型算錯`);
      } else ok(!j.s, `${w.e} 不應該有分數`);
    }
    for (const t of 'RIASEC') {
      const exp = keep.filter(w => Q.jobs[w.e] && Q.jobs[w.e].scores[t] === Math.max(...Object.values(Q.jobs[w.e].scores))).map(w => w.e).sort();
      ok(JSON.stringify(D.BOOK[t].slice().sort()) === JSON.stringify(exp), `圖鑑 ${t} 本的職業不對`);
    }
    ok(JSON.stringify(D.BOOK.X.slice().sort()) === JSON.stringify(['YouTuber', 'content creator', 'influencer'].sort()), '「還沒有分數」那本不對');
    ok(JSON.stringify(D.ITEMS) === JSON.stringify(Q.items.map(i => ({ t: i.t, ic: i.ic, zh: i.zh, e: i.e }))), '神探的 30 句工作內容和 evidence/quiz.json 不一樣');
    ok(Object.values(D.SURP).every(s => s.length === 30) && D.SKIN.length === 38, '驚喜卡不是每個遊戲 30 張／卡包樣式不是 38 種');
    await p.close();
  }

  // ── 2. 大廳＋圖鑑 ──
  const geom = async (p, sel) => p.evaluate(sel => {
    const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const small = [...document.querySelectorAll(sel)].filter(vis).filter(b => { const r = b.getBoundingClientRect(); return r.height < 47.5 || r.width < 47.5; }).map(b => b.textContent.trim().slice(0, 20));
    return { over: sw > cw + 1, small };
  }, sel);
  for (const [w, h, name] of [[375, 667, '手機'], [768, 1024, 'iPad 直'], [1024, 768, 'iPad 橫'], [1920, 1080, '教室觸控螢幕']]) {
    const p = await newPage(w, h);
    await p.goto(url('jobdex.html')); await p.waitForTimeout(200);
    let g = await geom(p, '#hub button, #hub a, #bar button, #bar a, .homeln');
    ok(!g.over, `${name}：大廳會橫向捲動`); ok(!g.small.length, `${name}：大廳按鈕太小 ${g.small.join('、')}`);
    const tiny = await p.$$eval('.gcard .gr, .dcz, .dce, .tabs button, #bar button', es => es.filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).length);
    ok(!tiny, `${name}：大廳有 ${tiny} 個字小於 16px`);
    ok(await p.$$eval('.gcard', c => c.length) === 5, `${name}：遊戲不是 5 個`);
    const tabs = await p.$$eval('#tabs button', bs => bs.map(b => [b.dataset.b, +b.querySelector('small').textContent]));
    ok(JSON.stringify(tabs) === JSON.stringify([['all', 35], ['R', 13], ['I', 2], ['A', 6], ['S', 6], ['E', 4], ['C', 3], ['X', 3]]), `${name}：圖鑑每一本的數量不對 ${JSON.stringify(tabs)}`);
    if (w === 1024) {
      // 35 張卡的母音紅、不發音灰
      const cards = await p.$$eval('#dexg .dc', cs => cs.map(c => { const e = c.dataset.e, out = { e, v: [], g: [], txt: '' }; let i = 0;
        for (const nd of c.querySelector('.dce').childNodes) { const t = nd.textContent; if (nd.nodeType === 1 && nd.classList.contains('lv')) out.v.push(i); if (nd.nodeType === 1 && nd.classList.contains('lg')) out.g.push(i); out.txt += nd.nodeType === 1 && nd.classList.contains('sp') ? ' ' : t; i += t.length; }
        return out; }));
      ok(cards.length === 35, '圖鑑「全部」不是 35 張');
      for (const c of cards) ok(c.txt === c.e && JSON.stringify(c.v) === JSON.stringify(VOW[c.e] || []) && JSON.stringify(c.g) === JSON.stringify(SILENT[c.e] || []), `圖鑑 ${c.e}：母音紅／不發音灰不對`);
      for (const [b, k] of tabs) { await p.click(`#tabs button[data-b="${b}"]`); ok(await p.$$eval('#dexg .dc', c => c.length) === k, `圖鑑 ${b} 本張數不對`); }
      await p.click('#tabs button[data-b="all"]');
      // 每一張卡打開：興趣成分 6 條（分數＝O*NET）、三種音節動畫
      for (const c of cards) {
        await p.click(`#dexg .dc[data-e="${c.e}"] .dci`); await p.waitForTimeout(60);
        const s = await p.evaluate(() => ({ bars: [...document.querySelectorAll('.pb')].map(b => [b.dataset.t, +b.querySelector('.pv').textContent]), link: document.querySelector('.plink a').getAttribute('href') }));
        const q = Q.jobs[c.e];
        if (q) ok(s.bars.length === 6 && s.bars.every(([t, v]) => q.scores[t] === v), `${c.e}：興趣成分分數不對`);
        else ok(s.bars.length === 0, `${c.e}：沒有分數卻有長條`);
        ok(s.link === 'story.html#w' + words.find(w => w.e === c.e).no, `${c.e}：單字卡連結不對`);
        if (['doctor', 'nurse', 'police officer', 'veterinarian'].includes(c.e)) for (const m of ['clap', 'train', 'cut']) {
          await p.click(`.sbtn button[data-m="${m}"]`); await p.waitForTimeout(6800);
          const r = await p.$eval('#sres', e => e.textContent);
          ok(r.includes(SYL[c.e].split(' ').map(x => x.split('-').join(' · ')).join('　')) && r.includes(SYL[c.e].split(/[- ]/).length + ' 個音節'), `${c.e} ${m}：音節動畫結果不對（${r}）`);
        }
        await p.click('#xbtn');
      }
      // 網址直接進入
      await p.goto(url('jobdex.html#dex-A')); await p.waitForTimeout(150);
      ok(await p.$eval('#tabs button.on', b => b.dataset.b) === 'A' && await p.$$eval('#dexg .dc', c => c.length) === 6, 'jobdex.html#dex-A：沒有打開藝術型那一本');
      for (const id of ['magnet', 'dark', 'ninja', 'detect', 'lava']) {
        await p.goto(url('jobdex.html#' + id)); await p.waitForTimeout(150);
        ok(await p.$eval('#book', e => e.classList.contains('on')) && (await p.$$eval('#book [data-bk]', b => b.length)) === (id === 'magnet' ? 1 : id === 'detect' ? 7 : 8), `jobdex.html#${id}：沒有出現選一本的畫面`);
      }
      ok(await p.$('a.homeln[href="index.html"]').then(e => e && e.isVisible()), 'jobdex.html：看不到 🏠 首頁');
    }
    ok(!p.errs.length, `${name}：大廳錯誤 ${p.errs.join(' ')}`);
    await p.close();
  }

  // ── 3. 5 種遊戲 ✕ 3 種尺寸 ──
  const inArena = async (p, sel) => p.evaluate(sel => { const a = document.getElementById('arena').getBoundingClientRect();
    return [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.left < a.left - 1 || r.right > a.right + 1 || r.top < a.top - 1 || r.bottom > a.bottom + 1); }).map(e => e.textContent.trim().slice(0, 16) || e.className); }, sel);
  const st = p => p.evaluate(() => { const s = JX.state(); s.cur = typeof s.cur === 'string' ? s.cur : (s.cur && s.cur.e) || s.cur; return s; });
  const waitQ = async (p, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(p); if (s.qOn && !s.busy) return s; await p.waitForTimeout(80); } return null; };
  const center = r => [r.x + r.width / 2, r.y + r.height / 2];
  // 真的用手指（滑鼠）答對一題
  const realRight = async (p, id, fling) => {
    const m = p.mouse;
    if (id === 'magnet') {
      const r = await p.evaluate(fl => { const c = JX.GAMES.magnet.card, e = c.e, t = D.J[e].top[0], cb = c.el.getBoundingClientRect(), mb = document.querySelector('.mag[data-t="' + t + '"]').getBoundingClientRect(); return { c: [cb.x + cb.width / 2, cb.y + cb.height / 2], m: [mb.x + mb.width / 2, mb.y + mb.height / 2] }; });
      await m.move(...r.c); await m.down();
      if (fling) { const dx = r.m[0] - r.c[0], dy = r.m[1] - r.c[1], L = Math.hypot(dx, dy); await m.move(r.c[0] + dx / L * 40, r.c[1] + dy / L * 40, { steps: 2 }); await m.move(r.c[0] + dx / L * 90, r.c[1] + dy / L * 90, { steps: 2 }); }
      else await m.move(...r.m, { steps: 6 });
      await m.up();
    } else if (id === 'dark') {
      const r = await p.evaluate(() => { const g = JX.GAMES.dark, t = g.P.find(x => x.e === g.e); return [...(b => [b.x + b.width / 2, b.y + b.height / 2])(t.el.getBoundingClientRect())]; });
      await m.move(r[0], r[1], { steps: 4 });
      const r2 = await p.evaluate(() => { const g = JX.GAMES.dark, t = g.P.find(x => x.e === g.e); return [...(b => [b.x + b.width / 2, b.y + b.height / 2])(t.el.getBoundingClientRect())]; });
      await m.move(...r2); await m.down(); await m.up();
    } else if (id === 'ninja') {
      const need = await p.evaluate(() => { const g = JX.GAMES.ninja, a = document.getElementById('arena').getBoundingClientRect(), w = document.getElementById('njw').getBoundingClientRect();
        return { gaps: g.gaps().filter(x => g.need.has(x.i)).map(x => x.x + a.left), top: w.top, bottom: w.bottom }; });
      if (!need.gaps.length) await p.click('#nocut');
      for (const x of need.gaps) {
        const g2 = await p.evaluate(() => { const g = JX.GAMES.ninja, a = document.getElementById('arena').getBoundingClientRect(); return g.gaps().filter(x => g.need.has(x.i) && !g.cuts.has(x.i)).map(x => x.x + a.left)[0]; });
        if (g2 == null) break;
        await m.move(g2, need.top - 30); await m.down(); await m.move(g2, need.bottom + 30, { steps: 5 }); await m.up(); await p.waitForTimeout(80);
      }
    } else if (id === 'detect') {
      const r = await p.evaluate(() => { const g = JX.GAMES.detect, L = document.getElementById('lens').getBoundingClientRect(), s = [...document.querySelectorAll('.sus')].find(x => x.dataset.e === g.e).getBoundingClientRect(); return { l: [L.x + L.width / 2, L.y + L.height / 2], s: [s.x + s.width / 2, s.y + s.height / 2] }; });
      await m.move(...r.l); await m.down(); await m.move(...r.s, { steps: 8 }); await m.up();
    } else if (id === 'lava') {
      const r = await p.evaluate(() => { const g = JX.GAMES.lava, s = g.ST.find(x => x.e === g.e).el.getBoundingClientRect(); return [s.x + s.width / 2, s.y + s.height / 2]; });
      await m.move(...r); await m.down(); await m.up();
    }
  };
  const games = ['magnet', 'dark', 'ninja', 'detect', 'lava'];
  const play = async ([w, h, name], k0) => {
    const p = await newPage(w, h);
    await p.goto(url('jobdex.html')); await p.waitForTimeout(150);
    for (const id of games) {
      const tag = `${name} ${id}`;
      await p.evaluate(id => { location.hash = id; }, id); await p.waitForTimeout(200);
      let g = await geom(p, '#book button, #bar button, #bar a');
      ok(!g.over && !g.small.length, `${tag}：選一本的畫面橫向捲動或按鈕太小 ${g.small.join('、')}`);
      await p.click('#book [data-bk="all"]');
      let s = await waitQ(p);
      if (!s) { bad(`${tag}：第一題沒有出現`); continue; }
      ok(s.qt >= 5 && s.qt <= 15 && Math.abs(s.gLeft - 90) < 1, `${tag}：時間不對（每題 ${s.qt} 秒、整場 ${s.gLeft} 秒）`);
      g = await geom(p, '#hud button, #arena button, #bar button, #bar a, #lens');
      ok(!g.over && !g.small.length, `${tag}：遊戲畫面橫向捲動或按鈕太小 ${g.small.join('、')}`);
      const out = await inArena(p, '.mag, .plate, #njw, .sus, .stone, .ledge, .lens, .nocut, .ask, .clue, .climber');
      ok(!out.length, `${tag}：有東西超出遊戲畫面 ${out.join('、')}`);
      // ① 真的用手指答對
      await realRight(p, id, k0 === 0); await p.waitForTimeout(150);
      s = await st(p);
      ok(s.right === 1 && s.wrong === 0 && s.score >= 100, `${tag}：用手指答對第一題沒有成功 ${JSON.stringify(s)}`);
      // ② 再連對 2 題 ➜ 🎁 驚喜卡
      for (let k = 0; k < 2; k++) { if (!(await waitQ(p))) break; await p.evaluate(() => JX.GAMES[JX.state().gid].cheat(true)); }
      let t0 = Date.now(), pk = false; while (Date.now() - t0 < 6000) { if (await p.$eval('#pick', e => e.classList.contains('on'))) { pk = true; break; } await p.waitForTimeout(100); }
      ok(pk, `${tag}：連對 3 題沒有開驚喜卡`);
      if (pk) {
        await p.waitForTimeout(700);
        g = await geom(p, '#pick .c3'); ok(!g.over && !g.small.length, `${tag}：驚喜卡太小或超出畫面`);
        const nC = await p.$$eval('#pick .c3', c => c.length); ok(nC >= 2 && nC <= 5, `${tag}：驚喜卡不是 2～5 選 1`);
        const gl = (await st(p)).gLeft; await p.click('#pick .c3'); await p.waitForTimeout(2000);
        ok(await p.$eval('#pick .pres', e => e.textContent.length > 0), `${tag}：驚喜卡翻開沒有寫拿到什麼`);
        const gl2 = (await st(p)).gLeft; ok(gl2 >= gl - 0.2, `${tag}：開驚喜卡的時候時間還在跑`);
      }
      // ③ 答錯 ➜ 答錯頁（倒數 8 秒才出現 ⭐ 加分、▶ 繼續；時間不跑）
      if (!(await waitQ(p, 9000))) { bad(`${tag}：驚喜卡之後沒有下一題`); continue; }
      await p.evaluate(() => JX.GAMES[JX.state().gid].cheat(false));
      await p.waitForSelector('#miss.on', { timeout: 4000 }).catch(() => {});
      ok(await p.$eval('#miss', e => e.classList.contains('on')).catch(() => false), `${tag}：答錯沒有出現答錯頁`);
      const mi = await p.evaluate(() => ({ a: document.querySelector('#miss .ma').textContent, q: document.querySelector('#miss .mq').textContent, btn: !!document.querySelector('#miss .nxt'), cur: JX.state().cur, gl: JX.state().gLeft }));
      ok(!mi.btn, `${tag}：答錯頁一開始就有「繼續」（要倒數 8 秒）`);
      const e = mi.cur;
      if (id === 'magnet') { const q = Q.jobs[e], mx = Math.max(...Object.values(q.scores)); ok('RIASEC'.split('').filter(t => q.scores[t] === mx).every(t => mi.a.includes({ R: '實用型', I: '研究型', A: '藝術型', S: '社會型', E: '企業型', C: '事務型' }[t])), `${tag}：答錯頁的正確型不對（${e}）`); }
      if (id === 'detect') ok(Q.items.some(i => mi.q.includes(i.zh.slice(0, 6))), `${tag}：答錯頁的線索不是核對過的句子`);
      if (id === 'ninja') ok(mi.a.replace(/[｜（].*$/, '') !== '' && mi.a.includes(SYL[e].split(/[- ]/).length + ' 個音節'), `${tag}：答錯頁的音節不對`);
      if (id === 'dark' || id === 'lava') ok(mi.a.includes(e), `${tag}：答錯頁的正確答案不對`);
      await p.waitForTimeout(8600);
      ok(await p.$('#miss .nxt') !== null && await p.$('#miss .bon') !== null, `${tag}：倒數 8 秒後沒有出現 ⭐ 加分、▶ 繼續`);
      g = await geom(p, '#miss button'); ok(!g.small.length, `${tag}：答錯頁按鈕太小`);
      ok(Math.abs((await st(p)).gLeft - mi.gl) < 0.3, `${tag}：答錯頁的時候時間還在跑`);
      if (k0 === 1) {
        // ⭐ 加分：再看 8 秒 ➜ 同一題用遊戲本來的玩法再玩一次 ➜ 答對 ＋1000
        await p.click('#miss .bon'); await p.waitForTimeout(8700);
        s = await st(p); ok(s.bonusMode && s.qOn && s.cur === e, `${tag}：加分題沒有用同一題開始 ${JSON.stringify(s)}`);
        const sc0 = s.score; await realRight(p, id, false); await p.waitForTimeout(1500);
        ok(await p.$eval('#miss', e => e.classList.contains('on') && e.textContent.includes('＋1000')), `${tag}：加分題答對沒有 ＋1000`);
        ok((await st(p)).score === sc0 + 1000, `${tag}：加分題分數不是 500 ✕ 2`);
      }
      await p.click('#miss .nxt');
      s = await waitQ(p, 4000); ok(!!s, `${tag}：按「繼續」之後沒有下一題`);
      // ④ 時間到 ➜ 答錯整理 ➜ 結束畫面
      await p.evaluate(() => JX.setLeft(0.05)); await p.waitForTimeout(600);
      ok(await p.$eval('#missAll', e => e.classList.contains('on')), `${tag}：時間到沒有出現答錯整理`);
      g = await geom(p, '#missAll button'); ok(!g.over && !g.small.length, `${tag}：答錯整理按鈕太小`);
      ok(await p.$$eval('#missAll .mcard', c => c.length) >= 1, `${tag}：答錯整理沒有卡片`);
      await p.click('#mAllOk'); await p.waitForTimeout(200);
      ok(await p.evaluate(() => document.body.dataset.s === 'end' && /\d/.test(document.getElementById('gendsc').textContent)), `${tag}：沒有結束畫面`);
      g = await geom(p, '#gend button, #bar button, #bar a'); ok(!g.over && !g.small.length, `${tag}：結束畫面按鈕太小 ${g.small.join('、')}`);
      ok(await p.$('#retry').then(b => b.isVisible()) && await p.$('#backhub').then(b => b.isVisible()), `${tag}：沒有「再玩一次」「換一個遊戲」`);
      await p.click('#backhub'); await p.waitForTimeout(150);
      ok(await p.evaluate(() => document.body.dataset.s === 'hub'), `${tag}：換一個遊戲沒有回到大廳`);
    }
    ok(!p.errs.length, `${name}：遊戲錯誤 ${p.errs.join(' ')}`);
    await p.close();
  };
  await Promise.all([[768, 1024, 'iPad 直'], [1024, 768, 'iPad 橫'], [1920, 1080, '教室觸控螢幕']].map((s, k) => play(s, k)));

  // ── 4. 登入＋成績（假的伺服器） ──
  {
    const p = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.addInitScript(stub);
    const posts = [];
    await p.route(/script\.google\.com/, async r => {
      const req = r.request(), u = req.url();
      if (req.method() === 'POST') { posts.push(JSON.parse(req.postData())); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ saved: true, boards: true, me: { count: 1 }, gtop: { list: [{ id: '30405', acc: 80, rk: 1 }], rk: 1, best: { acc: 80 } } }) }); }
      if (/a=who/.test(u)) return r.fulfill({ contentType: 'application/json', body: '{"roster":false}' });
      return r.fulfill({ contentType: 'application/json', body: '{"boards":false}' });
    });
    await p.goto(url('jobdex.html')); await p.waitForTimeout(150);
    ok((await p.$eval('#scme', e => e.textContent)).includes('還沒登入'), '登入：大廳沒有顯示「還沒登入」');
    await p.evaluate(() => { location.hash = 'dark'; }); await p.waitForTimeout(150);
    await p.click('#book [data-bk="all"]'); await p.waitForTimeout(200);
    ok(await p.$eval('#scov', e => e.classList.contains('on')) && await p.$('#scGrp') !== null, '登入：開始遊戲前沒有先登入');
    const now = () => p.evaluate(() => ({ box: [...document.querySelectorAll('#scGrp i')].map(i => i.textContent).join(''), step: [1, 2, 3].find(k => document.getElementById('scSt' + k).classList.contains('now')), msg: document.getElementById('scMsg').textContent, err: document.getElementById('scMsg').classList.contains('err') }));
    let r = await now(); ok(r.step === 1 && r.box === '' && r.msg.includes('班級'), '登入：一開始沒有亮「① 打班級」');
    let gl = await geom(p, '.sckey button, .scnav button'); ok(!gl.small.length && !gl.over, '登入：按鈕太小或橫向捲動');
    for (const k of '99') await p.click(`.sckey [data-k="${k}"]`);
    r = await now(); ok(r.box === '99' && r.step === 1, '登入：打 2 個數字不對');
    await p.click('.sckey [data-k="9"]');
    r = await now(); ok(r.box === '' && r.err && r.msg.includes('沒有 999 班') && r.msg.includes('清掉') && r.step === 1, `登入：班級打錯沒有立刻清空 ${JSON.stringify(r)}`);
    for (const k of '304') await p.click(`.sckey [data-k="${k}"]`);
    r = await now(); ok(r.box === '304' && r.step === 2 && r.msg.includes('座號'), `登入：打完班級沒有亮「② 打座號」${JSON.stringify(r)}`);
    for (const k of '45') await p.click(`.sckey [data-k="${k}"]`);
    r = await now(); ok(r.box === '304' && r.err && r.msg.includes('沒有 45 號'), `登入：座號打錯沒有清掉座號 ${JSON.stringify(r)}`);
    await p.click('.sckey [data-k="ok"]'); r = await now(); ok(r.err && r.box === '304', '登入：沒打完就按 ✅ 沒有提醒');
    for (const k of '05') await p.click(`.sckey [data-k="${k}"]`);
    r = await now(); ok(r.box === '30405' && r.step === 3 && await p.$eval('.okb', b => b.classList.contains('ready')), '登入：打完沒有亮「③ 按 ✅」');
    await p.click('.sckey [data-k="ok"]'); await p.waitForTimeout(800);
    ok(!(await p.$eval('#scov', e => e.classList.contains('on'))) && await p.evaluate(() => document.body.dataset.s === 'play'), '登入：按 ✅ 之後沒有開始遊戲');
    for (let k = 0; k < 12; k++) { if (!(await waitQ(p, 9000))) break; await p.evaluate(() => JX.GAMES.dark.cheat(true)); await p.waitForTimeout(1200);
      if (await p.$eval('#pick', e => e.classList.contains('on'))) { await p.click('#pick .c3'); await p.waitForTimeout(5400); } }
    await p.evaluate(() => JX.setLeft(0.05)); await p.waitForTimeout(4000);
    ok(posts.length === 1 && posts[0].r.id === '30405' && /^g3gm_job-dark$/.test(posts[0].r.set) && posts[0].r.qs.length >= 10 && posts[0].r.m === 'g', `成績：沒有送出正確的一筆 ${JSON.stringify(posts.map(x => x.r && x.r.set))}`);
    ok(await p.$eval('#scov', e => e.classList.contains('on')) && await p.$('#scn') !== null, '成績：遊戲結束沒有出現成績畫面');
    ok(!(await p.$eval('#gscore', b => b.hidden)), '成績：沒有「📊 我的成績」按鈕');
    ok(!p.errs.length, `登入頁錯誤 ${p.errs.join(' ')}`);
    await p.close();
  }
  return { n, fail };
};

if (require.main === module) {
  const { chromium } = require('playwright');
  (async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
    const r = await module.exports(browser, f => 'file://' + path.join(__dirname, f));
    await browser.close();
    console.log(r.fail ? `量測 ${r.n} 項，${r.fail} 項失敗` : `量測 ${r.n} 項，0 失敗`);
    process.exit(r.fail ? 1 : 0);
  })();
}
