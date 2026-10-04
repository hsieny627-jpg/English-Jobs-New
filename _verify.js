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
    ok(r.links === 4 + 22 + 10 + 3, `${name}：首頁連結數 ${r.links}`);
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
    const hash = href.split('#')[1];
    let m;
    if (/^c[1-4]$/.test(hash)) ok(await vis('Q' + hash[1]), `${href}：沒有出現挑戰 ${hash[1]}`);
    else if ((m = hash.match(/^w(\d+)$/))) {
      const hd = await p.$eval('#hd', e => e.textContent);
      ok(await vis('card') && hd.includes('第 ' + m[1] + ' 張'), `${href}：沒有出現第 ${m[1]} 張單字卡（${hd}）`);
    } else if (hash === 'rev') ok(await vis('V') && (await p.$eval('#vt', e => e.textContent)).includes('21'), `${href}：沒有出現複習 21 個字`);
    else if ((m = hash.match(/^adv(\d)$/))) ok(await vis('P') && await p.$eval('.tb.on', e => e.dataset.t) === m[1], `${href}：沒有出現大人榜單 ${m[1]}`);
    else if ((m = hash.match(/^g(\d+)$/))) ok(await vis('play') && await p.evaluate(() => G && G.id) === +m[1] - 1, `${href}：沒有開始遊戲 ${m[1]}`);
    else bad(href + '：不認得的連結');
    ok(await p.$('a.homeln[href="index.html"]').then(e => e && e.isVisible()), `${href}：看不到 🏠 首頁`);
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
