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
    ok(r.links === 4 + 23 + 2 + 10 + 4 + 13, `${name}：首頁連結數 ${r.links}`);
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
    if (href === 'rank-tw.html') ok(await p.$$eval('.row', r => r.length) === 20, `${href}：排行榜不是 20 列`);
    else if (/^c[1-4]$/.test(hash)) ok(await vis('Q' + hash[1]), `${href}：沒有出現挑戰 ${hash[1]}`);
    else if (href === 'word-check.html') ok(await p.$$eval('tbody tr', r => r.length) === 37, `${href}：考證表不是 37 列`);
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
    await q.evaluate(() => { location.hash = 'w22'; }); await q.click('#why');
    ok((await q.$eval('#link', e => e.href)).includes('content'), '第 22 張出處連結不對');
    await q.click('#menu');
    ok(await q.$$eval('#grid .gi', b => b.length) === 36 && await q.$$eval('#grid .gh', g => g.length) === 2 && await q.$('#grid .gh') !== null, '全部單字沒有 36 個／分組不對');
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
    const pairs = await q.$$eval('tbody tr', rs => rs.filter(r => r.querySelector('.go')).map(r => [r.querySelector('td.w b').textContent, r.querySelector('.go').getAttribute('href')]));
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
  // 沒有 # 的舊入口照常從挑戰 1 開始
  await p.goto(url('story.html')); ok(await vis('Q1'), 'story.html：沒有從挑戰 1 開始');
  await p.goto(url('games.html')); ok(await vis('home'), 'games.html：沒有出現遊戲選單');
  ok(await p.$('a[href="story.html"]') !== null, 'games.html：回單字小故事連結不對');
  ok(!errs.length, '頁面錯誤：' + errs.join(' '));
  await browser.close();
  console.log(fail ? `量測 ${n} 項，${fail} 項失敗` : `量測 ${n} 項，0 失敗`);
  process.exit(fail ? 1 : 0);
})();
