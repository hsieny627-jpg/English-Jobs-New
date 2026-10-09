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
    ok(r.links === 1 + 1 + 4 + 36 + 2 + 10 + 4, `${name}：首頁連結數 ${r.links}`);
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
    else if (href === 'jobdex.html') ok(await vis('hub') && await p.$$eval('.gcard', c => c.length) === 5, `${href}：沒有出現職業圖鑑＋5 種遊戲`);
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
    for (const l of aud.letters) ok(l.ok && l.site_ok, `母音／不發音和 Cambridge 對不上，或 story.html 沒更新：${l.word}`);
    const st = require('fs').readFileSync(path.join(__dirname, 'story.html'), 'utf8') + require('fs').readFileSync(path.join(__dirname, 'games.html'), 'utf8');
    for (const bad of ['veterinae', '管馬的人', '畫出來', '像「爺」', '拱門', 'pro</b> 先']) ok(!st.includes(bad), `還有改正前的寫法：${bad}`);
  }
  // 職業興趣探險：原文核對全部通過；四種尺寸走完 30 題＋5 次圖鑑挑戰，每個畫面不超出、按鈕夠大、字夠大、不用捲動就看得到按鈕
  {
    const fsx = require('fs');
    const Q = JSON.parse(fsx.readFileSync(path.join(__dirname, 'evidence', 'quiz.json'), 'utf8'));
    for (const i of Q.items) ok(i.ok, `測驗第 ${i.n} 題：O*NET 原文或興趣分數不符 ${i.url}`);
    for (const c of Q.claims) ok(c.ok, `測驗研究說法找不到原文：${c.name} ${c.url}`);
    for (const [e, j] of Object.entries(Q.jobs)) ok(j.ok, `${e}：O*NET 興趣分數不完整或歸類根據不符`);
    for (const x of Q.no_data) ok(x.ok, `${x.e}：職稱資料庫和說明不符`);
    ok(Q.titles_db.ok, '職稱資料庫筆數不對');
    ok(Q.balanced && Q.items.length === 30, '測驗題目不是六型各 5 題');
    ok(Q.engineers.length === 34 && Q.engineers.every(e => e.ok), '工程師 34 種的前 3 名不全是 R I C');
    const html = fsx.readFileSync(path.join(__dirname, 'quiz.html'), 'utf8');
    for (const no of ['教育部', '教育局', '國小沒有正式測驗', 'class="isl"', '小島', '愛動手', '動手做 <small>']) ok(!html.includes(no), `quiz.html 不應該出現：${no}`);
    for (const t of ['實用型', 'Realistic', '研究型', 'Investigative', '藝術型', 'Artistic', '社會型', 'Social', '企業型', 'Enterprising', '事務型', 'Conventional', '不算進興趣分數', '羅盤告訴你可以先往哪裡探索，不是終點'])
      ok(html.includes(t), `quiz.html 少了：${t}`);
    const stub = () => { window.speechSynthesis.speak = u => setTimeout(() => u.onend && u.onend(), 5); window.speechSynthesis.cancel = () => {}; };
    const q = await browser.newPage();
    await q.addInitScript(stub);
    const qe = []; q.on('pageerror', e => qe.push(e.message));
    await q.goto(url('story.html'));
    const words = await q.evaluate(() => W.map(d => d.e));
    const scr = () => q.evaluate(() => document.body.dataset.s);
    for (const [w, hh, name] of sizes) {
      await q.setViewportSize({ width: w, height: hh });
      await q.goto(url('quiz.html'));
      const chk = sel => q.evaluate(sel => {
        const root = document.querySelector(sel), rr = root.getBoundingClientRect();
        const vis = e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
        return { over: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          out: [...root.querySelectorAll('*')].filter(e => vis(e) && !e.closest('.tw,svg,.fly,.train') && e.getBoundingClientRect().right > Math.min(rr.right, innerWidth) + 2).map(e => e.className || e.tagName).slice(0, 3),
          small: [...root.querySelectorAll('button,a')].filter(e => vis(e) && !e.closest('.tw') && (e.getBoundingClientRect().height < 48 || e.getBoundingClientRect().width < 48)).map(e => e.textContent.trim()).slice(0, 3),
          tiny: [...root.querySelectorAll('*')].filter(e => vis(e) && !e.closest('#ev,svg') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.textContent.trim()).slice(0, 3),
          body: [...root.querySelectorAll('.qz,.three p,.why div,.rc h3,.say1x,.psay,.think')].filter(vis).map(e => parseFloat(getComputedStyle(e).fontSize)) };
      }, sel);
      const look = async (sel, what) => { const r = await chk(sel);
        ok(!r.over, `${name}：${what}會橫向捲動`); ok(!r.out.length, `${name}：${what}超出畫面 ${r.out.join('、')}`);
        ok(!r.small.length, `${name}：${what}按鈕太小 ${r.small.join('、')}`); ok(!r.tiny.length, `${name}：${what}字太小 ${r.tiny.join('、')}`);
        if (w >= 768 && w <= 1024) ok(r.body.every(f => f >= 22), `${name}：${what}內文小於 22px ${r.body.join(',')}`); };
      const inView = async (sel, what) => { const b = await q.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return r.bottom; }, sel);
        ok(b <= hh + 1, `${name}：${what}要往下捲才看得到（${Math.round(b)} > ${hh}）`); };
      await look('#start', '測驗開場');
      ok((await q.$eval('#start', e => e.textContent)).includes('僅供參考'), `${name}：開場沒有「僅供參考」`);
      ok(await q.$$eval('#start .rc', x => x.length) === 3 && await q.$$eval('#start .tc', x => x.length) === 6 && await q.$$eval('#start .three .card', x => x.length) === 3, `${name}：開場不是 3 張研究卡＋六型＋三句話`);
      await q.click('#go'); await q.waitForTimeout(3700);
      ok(await scr() === 'mission' && await q.$$eval('#map1 .st', x => x.length) === 5, `${name}：沒有出現探險地圖 5 個站`);
      await look('#mission', '探險地圖'); await inView('#sail', '「出發」');
      await q.click('#sail');
      for (let k = 0; k < 30; k++) {
        ok(await q.evaluate(() => document.getElementById('next').disabled), `${name}：第 ${k + 1} 題還沒選就可以下一題`);
        await q.click(`.fc[data-v="${(k % 4) + 1}"]`);
        await q.waitForTimeout(k === 0 ? 1600 : (k === 29 || w === 1024) ? 800 : 120);
        ok(!(await q.evaluate(() => document.getElementById('next').disabled)), `${name}：第 ${k + 1} 題唸完英文「下一題」沒有亮`);
        if (k === 0 || k === 29 || w === 1024) { await look('#quiz', `第 ${k + 1} 題`); await inView('#next', `第 ${k + 1} 題「下一題」`); }
        const r = await q.evaluate(() => ({ re: document.getElementById('re').textContent, zh: document.getElementById('qz').textContent, flip: document.getElementById('flip').classList.contains('on') }));
        ok(r.re === Q.items[k].e && r.zh === Q.items[k].zh && r.flip, `${name}：第 ${k + 1} 題內容和 evidence/quiz.json 不一樣或卡片沒翻面`);
        if (k === 1) { // 回上一題：不用再聽，「下一題」直接可以按
          await q.click('#back'); ok(!(await q.evaluate(() => document.getElementById('next').disabled)), `${name}：回上一題還要再聽一次`); await q.click('#next'); }
        await q.click('#next');
        if (k % 6 === 5) {
          await q.waitForTimeout(1100);
          ok(await scr() === 'mid' && await q.$$eval('#map2 .st.lit', x => x.length) === (k + 1) / 6, `${name}：第 ${(k + 1) / 6} 站完成沒有點亮`);
          await look('#mid', '關卡完成'); await inView('#chal', '「開始圖鑑挑戰」');
          await q.click('#chal'); await q.waitForTimeout(400);
          for (let c = 0; c < 3; c++) {
            await look('#chal-s', '圖鑑挑戰'); await inView('#copts', '挑戰選項');
            const lvjobs = await q.$$eval('.copt', b => b.map(x => x.dataset.e));
            ok(lvjobs.length >= 4 && lvjobs.every(e => Q.items.slice(k - 5, k + 1).some(i => i.e === e)), `${name}：挑戰選項不是這一站解鎖的職業`);
            await q.click(c === 1 ? '.copt:not([data-ok])' : '.copt[data-ok]');
            if (c === 1) ok(await q.$('.copt.ans') !== null && (await q.$eval('#cfb', e => e.textContent)).includes('正確答案'), `${name}：答錯沒有顯示正確答案`);
            await inView('#cnext', '挑戰「下一題」');
            await q.click('#cnext'); await q.waitForTimeout(150);
          }
          ok(await scr() === 'refl' && (await q.$eval('#rscore', e => e.textContent)).includes('2 / 3'), `${name}：挑戰答對數不對或沒有「想一想」`);
          ok(await q.$$eval('#rlist .card', x => x.length) === 6, `${name}：想一想沒有列出 6 件事`);
          await look('#refl', '想一想'); await inView('#cont', '「繼續」');
          await q.click('#cont'); await q.waitForTimeout(200);
        }
      }
      await q.waitForTimeout(2800);
      ok(await scr() === 'res', `${name}：30 題後沒有出現結果`);
      await look('#res', '結果頁');
      ok((await q.$eval('.warn', e => e.textContent)).includes('僅供參考'), `${name}：結果頁沒有「僅供參考」`);
      ok(await q.$$eval('#tops .tg', g => g.length) >= 1 && await q.$$eval('#bars .bar', b => b.length) === 6 && await q.$('#cmpr .ndl') !== null, `${name}：結果頁沒有羅盤／六型／推薦`);
      await q.evaluate(() => document.querySelectorAll('details.tg').forEach(d => d.open = true));
      await look('#res', '結果頁（全部打開）');
      // 職業圖鑑：六欄、每張卡在分數最高的欄
      const dex = await q.$$eval('.dcolw', cs => cs.map(c => [...c.querySelectorAll('.dc')].map(d => d.dataset.e)));
      ok(dex.length === 6, `${name}：職業圖鑑不是 6 欄`);
      if (w === 1920) {
        const want = { R: [], I: [], A: [], S: [], E: [], C: [] };
        for (const [e, j] of Object.entries(Q.jobs)) { const mx = Math.max(...Object.values(j.scores)); for (const t of 'RIASEC') if (j.scores[t] === mx) want[t].push(e); }
        'RIASEC'.split('').forEach((t, i) => ok(JSON.stringify([...dex[i]].sort()) === JSON.stringify(want[t].sort()), `職業圖鑑 ${t} 欄放錯：${dex[i].join(',')}`));
        ok(await q.$$eval('.dc .tie', x => x.length) === 4, '同分（獸醫、機師）沒有兩欄都標「同分」');
        const cols = await q.$eval('#dex', d => getComputedStyle(d).gridTemplateColumns.split(' ').length);
        ok(cols === 6, `1920 職業圖鑑不是 6 欄並排（${cols}）`);
      }
      if (w === 375) ok(await q.$eval('#dex', d => getComputedStyle(d).gridTemplateColumns.split(' ').length) === 2, '手機職業圖鑑不是 2 欄');
      // 興趣成分＋三種音節動畫
      await q.click('.dc[data-e="teacher"]'); await q.waitForTimeout(2000);
      await look('#panel', '興趣成分');
      const sh = await q.evaluate(() => ({ bars: document.querySelectorAll('.pb').length, med: [...document.querySelectorAll('.pb .md')].map(m => m.textContent).join(''), say: document.getElementById('psayt').textContent, first: document.querySelector('.pb').dataset.t }));
      ok(sh.bars === 6 && sh.med === '🥇🥈🥉' && sh.first === 'S' && sh.say.includes('老師最常做的是『社會型』的事：幫助、教別人（100 分）'), `${name}：老師的興趣成分不對 ${JSON.stringify(sh)}`);
      for (const m of ['clap', 'train', 'cut']) {
        await q.click(`.sbtn button[data-m="${m}"]`); await q.waitForTimeout(m === 'train' ? 3600 : m === 'cut' ? 2700 : 3000);
        ok((await q.$eval('#sres', e => e.textContent)).includes('teach · er ＝ 2 個音節'), `${name}：音節動畫 ${m} 最後沒有顯示「teach · er ＝ 2 個音節」`);
        await look('#panel', `音節動畫 ${m}`);
      }
      await q.click('#xbtn');
      ok(!(await q.evaluate(() => document.getElementById('sheet').classList.contains('on'))), `${name}：興趣成分關不掉`);
    }
    // 每一張職業卡打開後，連到同一個字的單字卡；esports player 要註明分數是全部運動員一起算
    const es = await q.$$eval('#res .dc, #res button.jt', as => [...new Set(as.map(a => a.dataset.e))]);
    ok(es.length === Object.keys(Q.jobs).length, `結果頁職業 ${es.length} 個，應該 ${Object.keys(Q.jobs).length} 個`);
    for (const e of es) { const r = await q.evaluate(e => { openSheet(e); const h = document.getElementById('plink').getAttribute('href'); const t = document.getElementById('panel').textContent; closeSheet(); return { h, t }; }, e);
      ok(words[+r.h.split('#w')[1] - 1] === e, `測驗 ${e} 連到的單字卡不是 ${e}`);
      if (e === 'esports player') ok(r.t.includes('全部運動員一起算'), 'esports player 沒有註明分數是全部運動員一起算'); }
    const ex = await q.$$eval('#extra .jt', as => as.map(a => [a.dataset.e, a.getAttribute('href')]));
    ok(ex.map(x => x[0]).sort().join() === 'YouTuber,content creator,influencer', `「也可以認識」應該是 YouTuber、content creator、influencer：${ex.map(x => x[0])}`);
    for (const [e, href] of ex) ok(words[+href.split('#w')[1] - 1] === e, `測驗結果 ${e} 連到的單字卡不是 ${e}`);
    ok(!(await q.$eval('#res', e => e.innerHTML)).includes('fortune teller'), '測驗結果頁不應該出現 fortune teller');
    // 母音紅、不發音灰：lawyer 的 y 不是紅色；business 的 i 是灰色
    ok(await q.evaluate(() => VOW.lawyer.indexOf(3) < 0 && SILENT['business manager'][0] === 3), '母音／不發音資料沒有改正（lawyer y、business i）');
    // 8 秒保險：語音一直不結束，「下一題」最多 8 秒也要亮
    {
      const z = await browser.newPage({ viewport: { width: 1024, height: 768 } });
      await z.addInitScript(() => { window.speechSynthesis.speak = () => {}; window.speechSynthesis.cancel = () => {}; });
      await z.goto(url('quiz.html')); await z.click('#go'); await z.waitForTimeout(3600); await z.click('#sail'); await z.click('.fc[data-v="5"]');
      await z.waitForTimeout(3000); ok(await z.evaluate(() => document.getElementById('next').disabled), '語音還沒唸完「下一題」就亮了');
      await z.waitForTimeout(5300); ok(!(await z.evaluate(() => document.getElementById('next').disabled)), '語音卡住時 8 秒後「下一題」沒有亮');
      await z.close();
    }
    // 計分：全部「不確定」＝一樣多；只喜歡 🎨 ＝ 🎨 最高
    const run = async f => { await q.goto(url('quiz.html')); await q.evaluate(() => { start(); document.getElementById('sail').click(); });
      for (let k = 0; k < 30; k++) { const t = await q.evaluate(k => ITEMS[k].t, k); await q.evaluate(([v, k]) => { pick(v); unlock(k); next(); }, [f(t), k]);
        if (k % 6 === 5) await q.evaluate(() => { chal(); for (let c = 0; c < 3; c++) { chPick(document.querySelector('.copt[data-ok]')); chNext(); } cont(); }); }
      return q.evaluate(() => ({ top: document.getElementById('top').textContent, tops: [...document.querySelectorAll('#tops .tg')].map(g => g.dataset.t), oth: document.querySelectorAll('#others .tg').length })); };
    let r = await run(() => 3);
    ok(r.top.includes('一樣多') && r.tops.length === 0 && r.oth === 6, `計分：全部不確定，結果不對 ${JSON.stringify(r)}`);
    r = await run(t => t === 'A' ? 5 : t === 'S' ? 4 : 1);
    ok(r.tops.join('') === 'AS' && r.oth === 4, `計分：喜歡 🎨、其次 🤝，結果不對 ${JSON.stringify(r)}`);
    r = await run(t => t === 'R' ? 5 : 2);
    ok(r.tops.join('') === 'R', `計分：只喜歡 🔧，結果不對 ${JSON.stringify(r)}`);
    await q.goto(url('quiz.html#ev')); await q.waitForTimeout(150);
    ok(await q.$eval('#ev', d => d.open) && await q.$$eval('#ev tbody tr', t => t.length) >= 9 + 6 + 30 + 32 + 3 + 4 + 34, 'quiz.html#ev：沒有打開證據或表格不完整');
    ok(await q.$('a.homeln[href="index.html"]').then(e => e && e.isVisible()), 'quiz.html：看不到 🏠 首頁');
    ok(!qe.length, `測驗頁錯誤 ${qe.join(' ')}`);
    await q.close();
  }
  // 沒有 # 的舊入口照常從挑戰 1 開始
  await p.goto(url('story.html')); ok(await vis('Q1'), 'story.html：沒有從挑戰 1 開始');
  await p.goto(url('games.html')); ok(await vis('home'), 'games.html：沒有出現遊戲選單');
  ok(await p.$('a[href="story.html"]') !== null, 'games.html：回單字小故事連結不對');
  ok(!errs.length, '頁面錯誤：' + errs.join(' '));
  // 📖 職業圖鑑＋5 種複習遊戲（jobdex.html）
  const jx = await require('./_verify_jobdex.js')(browser, url);
  n += jx.n; fail += jx.fail;
  await browser.close();
  console.log(fail ? `量測 ${n} 項，${fail} 項失敗` : `量測 ${n} 項，0 失敗`);
  process.exit(fail ? 1 : 0);
})();
