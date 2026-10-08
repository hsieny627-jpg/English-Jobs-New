// 量測：node _verify.js（只印失敗項＋一行總結）
// 首頁四種螢幕尺寸不能橫向捲動、按鈕夠大；首頁每一個連結都要打開正確的畫面；每一頁都有 🏠 首頁。
const { chromium } = require('playwright');
const path = require('path');
const url = f => 'file://' + path.join(__dirname, f);
const sizes = [[375, 667, '手機'], [768, 1024, 'iPad 直'], [1024, 768, 'iPad 橫'], [1920, 1080, '教室觸控螢幕']];
let fail = 0, n = 0;
const bad = m => { fail++; console.log('❌ ' + m); };
const ok = (c, m) => { n++; if (!c) bad(m); };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  for (const [w, h, name] of sizes) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url('index.html'));
    const r = await p.evaluate(() => {
      const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
      const small = [...document.querySelectorAll('a')].filter(a => { const b = a.getBoundingClientRect(); return b.height < 48 || b.width < 100; }).map(a => a.textContent.trim());
      const tiny = [...document.querySelectorAll('.t span, nav a')].filter(s => parseFloat(getComputedStyle(s).fontSize) < 16).map(s => s.textContent);
      const clip = [...document.querySelectorAll('.t .en,.t .tt')].filter(s => s.scrollWidth > s.parentElement.clientWidth).map(s => s.textContent);
      return { over: sw > cw, small, tiny, clip, links: document.querySelectorAll('a.t').length };
    });
    ok(!r.over, `${name}：首頁會橫向捲動`);
    ok(!r.small.length, `${name}：按鈕太小 ${r.small.join('、')}`);
    ok(!r.tiny.length, `${name}：字太小 ${r.tiny.join('、')}`);
    ok(!r.clip.length, `${name}：字超出卡片 ${r.clip.join('、')}`);
    ok(r.links === 1 + 4 + 36 + 2 + 10 + 4, `${name}：首頁連結數 ${r.links}`);
    ok(!errs.length, `${name}：首頁錯誤 ${errs.join(' ')}`);
    await p.close();
  }

  // 每一個連結打開後看到的畫面
  const p = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url('index.html'));
  const hrefs = await p.$$eval('a.t', as => as.map(a => a.getAttribute('href')));
  const vis = id => p.evaluate(id => { const e = document.getElementById(id); return !!e && e.offsetParent !== null; }, id);
  for (const href of hrefs) {
    await p.goto(url(href)); await p.waitForTimeout(150);
    const hash = href.split('#')[1] || '';
    let m;
    if (href === 'quiz.html') ok(await vis('start'), `${href}：沒有出現職業興趣探險開場`);
    else if (href === 'rank-tw.html') ok(await p.$$eval('.row', r => r.length) === 20, `${href}：排行榜不是 20 列`);
    else if (/^c[1-4]$/.test(hash)) ok(await vis('Q' + hash[1]), `${href}：沒有出現挑戰 ${hash[1]}`);
    else if (href === 'rank-mix.html') ok(await p.$$eval('tbody tr', r => r.length) === 36, `${href}：排序頁不是 36 列`);
    else if (href === 'word-check.html') ok(await p.$$eval('#words-table tbody tr', r => r.length) === 37, `${href}：考證表不是 37 列`);
    else if ((m = hash.match(/^w(\d+)$/))) {
      const hd = await p.$eval('#hd', e => e.textContent);
      ok(await vis('card') && hd.includes('第 ' + m[1] + ' 張'), `${href}：沒有出現第 ${m[1]} 張單字卡（${hd}）`);
    } else if (hash === 'rev') ok(await vis('V') && (await p.$eval('#vt', e => e.textContent)).includes('36'), `${href}：沒有出現複習全部 36 個字`);
    else if ((m = hash.match(/^adv(\d)$/))) ok(await vis('P') && await p.$eval('.tb.on', e => e.dataset.t) === m[1], `${href}：沒有出現大人榜單 ${m[1]}`);
    else if ((m = hash.match(/^g(\d+)$/))) ok(await vis('play') && await p.evaluate(() => G && G.id) === +m[1] - 1, `${href}：沒有開始遊戲 ${m[1]}`);
    else bad(href + '：不認得的連結');
    ok(await p.$('a.homeln[href="index.html"]').then(e => e && e.isVisible()), `${href}：看不到 🏠 首頁`);
  }
  // 34 張單字卡：六個步驟都點一遍，不能出錯、不能超出畫面；音節拼回來要等於單字
  for (const [w, hh] of [[375, 667], [1024, 768]]) {
    const q = await browser.newPage({ viewport: { width: w, height: hh } });
    const qe = []; q.on('pageerror', e => qe.push(e.message));
    await q.goto(url('story.html#w1'));
    const total = await q.evaluate(() => W.length);
    ok(total === 36, `單字卡數量 ${total}`);
    for (let k = 0; k < total; k++) {
      await q.evaluate(k => { location.hash = 'w' + (k + 1); }, k);
      for (let s = 0; s < 6; s++) {
        if (s) await q.click('#fwd');
        const r = await q.evaluate(() => ({ over: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          card: [...document.querySelectorAll('#card *')].some(e => e.getBoundingClientRect().right > document.getElementById('card').getBoundingClientRect().right + 2) }));
        ok(!r.over && !r.card, `${w}px 第 ${k + 1} 張第 ${s + 1} 步超出畫面`);
      }
      const d = await q.evaluate(k => { const d = W[k]; const syl = (SYL[d.e] || '').replace(/-/g, '');
        const parts = d.p.map((x, i) => ((d.sp || []).includes(i) ? ' ' : '') + x[0]).join('');
        return { e: d.e, syl, parts, tip: !!TIP[d.e], ev: !!(d.ev && d.ev.url) }; }, k);
      ok(d.syl === d.e, `${d.e}：音節拼回來是 ${d.syl}`);
      ok(d.parts === d.e, `${d.e}：拆字拼回來是 ${d.parts}`);
      ok(d.tip && d.ev, `${d.e}：缺記憶技巧或出處`);
    }
    await q.evaluate(() => { location.hash = 'w' + (W.findIndex(d => d.e === 'content creator') + 1); }); await q.click('#why');
    ok((await q.$eval('#link', e => e.href)).includes('content'), '第 22 張出處連結不對');
    await q.click('#menu');
    ok(await q.$$eval('#grid .gi', b => b.length) === 36 && await q.$$eval('#grid .gh', g => g.length) === 3 && await q.$('#grid .gh') !== null, '全部單字沒有 36 個／分組不對');
    ok(!qe.length, `${w}px 單字卡錯誤 ${qe.join(' ')}`);
    await q.close();
  }
  // 排行榜頁：四種尺寸不橫向捲動；名次照國語日報原始統計圖；單字卡連結指到同一個字
  for (const [w, hh, name] of sizes) {
    const q = await browser.newPage({ viewport: { width: w, height: hh } });
    await q.goto(url('rank-tw.html'));
    const r = await q.evaluate(() => ({ over: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      small: [...document.querySelectorAll('.go,.homeln')].filter(a => a.getBoundingClientRect().height < 44).length,
      rows: [...document.querySelectorAll('.list')].map(l => [...l.querySelectorAll('.row')].map(x => x.querySelector('.rk').firstChild.textContent + x.querySelector('.zh').textContent).join('|')) }));
    ok(!r.over, `${name}：排行榜頁會橫向捲動`);
    ok(!r.small, `${name}：排行榜頁按鈕太小`);
    ok(r.rows[0] === '1職業運動員|2電競選手|3直播主／網紅／Podcaster／YouTuber|4醫師|5麵包糕點師|6程式設計師（如App、線上遊戲）|7畫家／插畫家／漫畫家／電腦動畫|8歌手／樂團／演員|9電腦工程師|10髮型師／造型師／美甲師', `${name}：小學生名次和原始統計圖不一樣`);
    ok(r.rows[1] === '1職業運動員|2機械工程師|3醫師|4畫家／插畫家／漫畫家／電腦動畫|4廚師|6程式設計師（如App、線上遊戲）|7心理輔導師|7麵包糕點師|9獸醫|9電腦工程師', `${name}：中學生名次和原始統計圖不一樣`);
    await q.close();
  }
  {
    const q = await browser.newPage();
    await q.goto(url('rank-tw.html'));
    const pairs = await q.$$eval('.row', rs => rs.filter(r => r.querySelector('.go')).map(r => [r.querySelector('.en').dataset.e, r.querySelector('.go').getAttribute('href')]));
    for (const [e, href] of pairs) {
      await q.goto(url(href)); await q.waitForTimeout(80);
      const n = +href.split('#w')[1];
      ok(await q.evaluate(n => W[n - 1].e, n) === e, `排行榜 ${e} 連到的單字卡不是 ${e}`);
      await q.goto(url('rank-tw.html'));
    }
    await q.close();
  }
  // 考證頁：四種尺寸不橫向捲動（表格自己左右滑）；每個「單字卡 ▶」指到同一個字
  for (const [w, hh, name] of sizes) {
    const q = await browser.newPage({ viewport: { width: w, height: hh } });
    await q.goto(url('word-check.html'));
    ok(!(await q.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), `${name}：考證頁會橫向捲動`);
    await q.close();
  }
  {
    const q = await browser.newPage();
    await q.goto(url('word-check.html'));
    const pairs = await q.$$eval('#words-table tbody tr', rs => rs.filter(r => r.querySelector('.go')).map(r => [r.querySelector('td.w b').textContent, r.querySelector('.go').getAttribute('href')]));
    ok(pairs.length === 36, `考證頁單字卡連結 ${pairs.length} 個`);
    await q.goto(url('story.html'));
    const words = await q.evaluate(() => W.map(d => d.e));
    for (const [e, href] of pairs) ok(words[+href.split('#w')[1] - 1] === e, `考證頁 ${e} 連到的單字卡不是 ${e}`);
    await q.close();
  }
  // 也可以說：三張卡最後一步要出現，點 🔊 不換頁，證據連結要對
  for (const [w, hh] of [[375, 667], [1024, 768]]) {
    const q = await browser.newPage({ viewport: { width: w, height: hh } });
    for (const [e, alt] of [['professional athlete', 'pro athlete'], ['hairstylist', 'hairdresser'], ['computer engineer', 'software engineer']]) {
      await q.goto(url('story.html#w1'));
      const n = await q.evaluate(e => W.findIndex(d => d.e === e) + 1, e);
      await q.evaluate(n => { location.hash = 'w' + n; }, n);
      for (let s = 0; s < 5; s++) await q.click('#fwd');
      const t = await q.$eval('.aka', x => x.textContent).catch(() => '');
      ok(t.includes(alt), `${w}px ${e}：沒有出現「也可以說 ${alt}」`);
      await q.click('.akw');
      ok((await q.$eval('#hd', x => x.textContent)).includes('第 ' + n + ' 張') && await q.$('.aka') !== null, `${w}px ${e}：點 🔊 換頁了`);
      const id = await q.$eval('.aka a[href^="word-check.html#"]', a => a.getAttribute('href').split('#')[1]);
      const c = await browser.newPage(); await c.goto(url('word-check.html'));
      ok(await c.$('#' + id) !== null, `${e}：完整考證連結找不到 #${id}`); await c.close();
      const over = await q.evaluate(() => [...document.querySelectorAll('.aka *')].some(x => x.getBoundingClientRect().right > document.getElementById('card').getBoundingClientRect().right + 2));
      ok(!over, `${w}px ${e}：也可以說超出卡片`);
    }
    await q.close();
  }
  // 四榜綜合：單字卡順序要和 evidence/mix.json 一樣；排序頁 36 列、每個「單字卡 ▶」指到同一個字
  {
    const mix = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'evidence', 'mix.json'), 'utf8'));
    const q = await browser.newPage();
    await q.goto(url('story.html'));
    const words = await q.evaluate(() => W.map(d => d.e));
    ok(JSON.stringify(words) === JSON.stringify(mix.order), '單字卡順序和四榜綜合不一樣');
    ok(await q.evaluate(() => W.every((d, i) => d.no === i + 1)), '單字卡編號不連續');
    for (const [w, hh, name] of sizes) {
      await q.setViewportSize({ width: w, height: hh });
      await q.goto(url('rank-mix.html'));
      ok(!(await q.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), `${name}：排序頁會橫向捲動`);
    }
    const pairs = await q.$$eval('tbody tr', rs => rs.map(r => [r.querySelector('td.w b').textContent, r.querySelector('.go').getAttribute('href')]));
    ok(pairs.length === 36, `排序頁 ${pairs.length} 列`);
    for (const [e, href] of pairs) ok(words[+href.split('#w')[1] - 1] === e, `排序頁 ${e} 連到的單字卡不是 ${e}`);
    await q.close();
  }
  // 查證結果：evidence/audit.json 每一條說法、每一個音節都要找到證據（python3 _audit.py 重抓原文）
  {
    const aud = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'evidence', 'audit.json'), 'utf8'));
    for (const c of aud.claims) ok(c.ok, `查證失敗：${c.card}「${c.claim}」 ${c.url}`);
    for (const s of aud.syllables) ok(s.ok, `音節和字典不一樣：${s.word} ${s.site} /${s.ipa}/`);
    const st = require('fs').readFileSync(path.join(__dirname, 'story.html'), 'utf8') + require('fs').readFileSync(path.join(__dirname, 'games.html'), 'utf8');
    for (const bad of ['veterinae', '管馬的人', '畫出來', '像「爺」', '拱門', 'pro</b> 先']) ok(!st.includes(bad), `還有改正前的寫法：${bad}`);
  }
  // 職業興趣探險：原文核對全部通過；四種尺寸 30 題每一題不超出、按鈕夠大、字夠大；結果頁連結指到同一個字；計分
  {
    const fsx = require('fs');
    const Q = JSON.parse(fsx.readFileSync(path.join(__dirname, 'evidence', 'quiz.json'), 'utf8'));
    for (const i of Q.items) ok(i.ok, `測驗第 ${i.n} 題：O*NET 原文或興趣分數不符 ${i.url}`);
    for (const c of Q.claims) ok(c.ok, `測驗研究說法找不到原文：${c.name} ${c.url}`);
    for (const [e, j] of Object.entries(Q.jobs)) ok(j.ok, `${e}：O*NET 興趣分數不完整`);
    ok(Q.balanced && Q.items.length === 30, '測驗題目不是六型各 5 題');
    const q = await browser.newPage();
    const qe = []; q.on('pageerror', e => qe.push(e.message));
    await q.goto(url('story.html'));
    const words = await q.evaluate(() => W.map(d => d.e));
    for (const [w, hh, name] of sizes) {
      await q.setViewportSize({ width: w, height: hh });
      await q.goto(url('quiz.html'));
      const chk = sel => q.evaluate(sel => {
        const root = document.querySelector(sel), rr = root.getBoundingClientRect();
        return { over: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          out: [...root.querySelectorAll('*')].filter(e => e.offsetParent !== null && !e.closest('.tw,svg') && e.getBoundingClientRect().right > rr.right + 2).map(e => e.className || e.tagName).slice(0, 3),
          small: [...root.querySelectorAll('button,a')].filter(e => e.offsetParent !== null && (e.getBoundingClientRect().height < 48 || e.getBoundingClientRect().width < 48)).map(e => e.textContent.trim()).slice(0, 3),
          tiny: [...root.querySelectorAll('*')].filter(e => e.offsetParent !== null && !e.closest('#ev,svg') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.textContent.trim()).slice(0, 3) };
      }, sel);
      const look = async (sel, what) => { const r = await chk(sel);
        ok(!r.over, `${name}：${what}會橫向捲動`); ok(!r.out.length, `${name}：${what}超出畫面 ${r.out.join('、')}`);
        ok(!r.small.length, `${name}：${what}按鈕太小 ${r.small.join('、')}`); ok(!r.tiny.length, `${name}：${what}字太小 ${r.tiny.join('、')}`); };
      await look('#start', '測驗開場');
      ok((await q.$eval('#start', e => e.textContent)).includes('僅供參考'), `${name}：開場沒有「僅供參考」`);
      await q.click('#go');
      for (let k = 0; k < 30; k++) {
        if (await q.evaluate(() => document.getElementById('mid').classList.contains('on'))) { await q.waitForTimeout(900); await look('#mid', '中場'); await q.click('#cont'); }
        ok(await q.evaluate(() => !document.getElementById('next').disabled) === false, `${name}：第 ${k + 1} 題還沒選就可以下一題`);
        await q.click(`.fc[data-v="${(k % 4) + 1}"]`);
        await q.waitForTimeout(500);
        await look('#quiz', `第 ${k + 1} 題`);
        const nb = await q.evaluate(() => document.getElementById('next').getBoundingClientRect().bottom);
        ok(nb <= hh, `${name}：第 ${k + 1} 題「下一題」要往下捲才看得到（${Math.round(nb)} > ${hh}）`);
        const r = await q.evaluate(k => ({ re: document.getElementById('re').textContent, zh: document.getElementById('qz').textContent, it: ITEMS[k] }), k);
        ok(r.re === Q.items[k].e && r.zh === Q.items[k].zh, `${name}：第 ${k + 1} 題內容和 evidence/quiz.json 不一樣`);
        await q.click('#next');
      }
      await q.waitForTimeout(1500);
      ok(await q.evaluate(() => document.getElementById('res').classList.contains('on')), `${name}：30 題後沒有出現結果`);
      await look('#res', '結果頁');
      ok((await q.$eval('.warn', e => e.textContent)).includes('僅供參考'), `${name}：結果頁沒有「僅供參考」`);
      ok(await q.$$eval('#tops .tg', g => g.length) >= 1 && await q.$$eval('#bars .bar', b => b.length) === 6, `${name}：結果頁沒有六型或沒有推薦小島`);
      await q.evaluate(() => document.querySelectorAll('details.tg').forEach(d => d.open = true));
      await look('#res', '結果頁（全部打開）');
    }
    // 結果頁每一張職業卡都連到同一個字的單字卡
    const pairs = await q.$$eval('#res .jt', as => as.map(a => [a.dataset.e, a.getAttribute('href')]));
    ok(pairs.length > 60, `結果頁職業卡只有 ${pairs.length} 張`);
    for (const [e, href] of pairs) ok(words[+href.split('#w')[1] - 1] === e, `測驗結果 ${e} 連到的單字卡不是 ${e}`);
    ok(!pairs.some(([e]) => e === 'fortune teller'), '測驗結果不應該出現 fortune teller');
    // 計分：全部「不確定」＝一樣多；只喜歡 🎨 ＝ 🎨 最高
    const run = async f => { await q.goto(url('quiz.html')); await q.click('#go');
      for (let k = 0; k < 30; k++) { if (await q.evaluate(() => document.getElementById('mid').classList.contains('on'))) await q.click('#cont');
        const t = await q.evaluate(k => ITEMS[k].t, k); await q.click(`.fc[data-v="${f(t)}"]`); await q.click('#next'); }
      return q.evaluate(() => ({ top: document.getElementById('top').textContent, tops: [...document.querySelectorAll('#tops .tg')].map(g => g.dataset.t), oth: document.querySelectorAll('#others .tg').length })); };
    let r = await run(() => 3);
    ok(r.top.includes('一樣多') && r.tops.length === 0 && r.oth === 6, `計分：全部不確定，結果不對 ${JSON.stringify(r)}`);
    r = await run(t => t === 'A' ? 5 : t === 'S' ? 4 : 1);
    ok(r.tops.join('') === 'AS' && r.oth === 4, `計分：喜歡 🎨、其次 🤝，結果不對 ${JSON.stringify(r)}`);
    r = await run(t => t === 'R' ? 5 : 2);
    ok(r.tops.join('') === 'R', `計分：只喜歡 🔧，結果不對 ${JSON.stringify(r)}`);
    await q.goto(url('quiz.html#ev')); await q.waitForTimeout(150);
    ok(await q.$eval('#ev', d => d.open) && await q.$$eval('#ev tbody tr', t => t.length) >= 30 + 29 + 7, 'quiz.html#ev：沒有打開證據或表格不完整');
    ok(await q.$('a.homeln[href="index.html"]').then(e => e && e.isVisible()), 'quiz.html：看不到 🏠 首頁');
    ok(!qe.length, `測驗頁錯誤 ${qe.join(' ')}`);
    await q.close();
  }
  // 沒有 # 的舊入口照常從挑戰 1 開始
  await p.goto(url('story.html')); ok(await vis('Q1'), 'story.html：沒有從挑戰 1 開始');
  await p.goto(url('games.html')); ok(await vis('home'), 'games.html：沒有出現遊戲選單');
  ok(await p.$('a[href="story.html"]') !== null, 'games.html：回單字小故事連結不對');
  ok(!errs.length, '頁面錯誤：' + errs.join(' '));
  await browser.close();
  console.log(fail ? `量測 ${n} 項，${fail} 項失敗` : `量測 ${n} 項，0 失敗`);
  process.exit(fail ? 1 : 0);
})();
