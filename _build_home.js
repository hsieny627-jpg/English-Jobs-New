// 產生首頁 index.html：node _build_home.js
// 單字、遊戲清單直接從 story.html、games.html 讀，改那兩頁之後重跑一次就會同步。
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const story = fs.readFileSync(path.join(dir, 'story.html'), 'utf8');
const games = fs.readFileSync(path.join(dir, 'games.html'), 'utf8');

const font = story.match(/@font-face\{[^}]*\}/)[0];
const tw = story.match(/\.tw\{[^}]*\}/)[0];
const words = [...story.matchAll(/\{no:(\d+),e:'([^']+)',z:'([^']+)',ic:'([^']+)'/g)]
  .map(m => ({ no: +m[1], e: m[2], z: m[3], ic: m[4] }));
const gameList = [...games.matchAll(/\{id:(\d+),ic:'([^']+)',t:'([^']+)',d:'([^']+)'/g)]
  .map(m => ({ id: +m[1], ic: m[2], t: m[3], d: m[4] }));
const kids = words.filter(w => w.no <= 21), adults = words.filter(w => w.no > 21);
if (kids.length !== 21 || adults.length !== 13) throw new Error('單字應該是 21＋13 個，讀到 ' + kids.length + '＋' + adults.length);
if (gameList.length !== 10) throw new Error('遊戲應該是 10 個，讀到 ' + gameList.length);

const challenges = [
  { h: 'c1', n: 1, ic: '<i class="tw"></i>', who: '台灣小學生', src: '國語日報 2026' },
  { h: 'c2', n: 2, ic: '🌍', who: '全球中學生', src: 'OECD PISA 2018' },
  { h: 'c3', n: 3, ic: '<i class="tw"></i>', who: '台灣的大人', src: '1111 人力銀行 2026' },
  { h: 'c4', n: 4, ic: '🌏', who: '全球的大人', src: 'Remitly 2026' },
];
const boards = [
  { href: 'rank-tw.html', ic: '<i class="tw"></i>', t: '台灣中小學生 Top 10', d: '2026 最新＋證據出處' },
  { href: 'story.html#adv0', ic: '🧑‍💼', t: '台灣大人榜', d: '前 5 名' },
  { href: 'story.html#adv1', ic: '🌏', t: '全球大人榜', d: '前 10 名' },
  { href: 'story.html#adv2', ic: '🏅', t: '四榜綜合', d: '四份調查合起來' },
];

const wordTiles = list => list.map(w => '  ' + tile('story.html#w' + w.no, '',
  `<span class="no">${w.no}</span><span class="ic">${w.ic}</span><span class="en">${w.e}</span><span class="zh">${w.z}</span>`,
  `單字 ${w.no}：${w.e} ${w.z}`)).join('\n');
const tile = (href, cls, inner, label) =>
  `<a class="t ${cls}" href="${href}" aria-label="${label}">${inner}</a>`;

const html = `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>職業英文單字</title>
<style>
${font}
:root{--bg:#FFF7E8;--card:#fff;--ink:#23201C;--soft:#7A7166;--line:#F0E2C8;
--c1:#15233A;--c1t:#FFD24A;--c2:#FF7A45;--c2bg:#FFE3D6;--c3:#2F6FDE;--c3bg:#DCE8FB;--c4:#2FA35A;--c4bg:#DCF0C8}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font-family:'AndikaEmbed',"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;-webkit-text-size-adjust:100%;overflow-x:hidden}
${tw}
.app{max-width:1100px;margin:0 auto;padding:16px 16px 40px}
h1{margin:6px 0 2px;font-size:34px;text-align:center}
.sub{text-align:center;font-size:20px;color:var(--soft);margin-bottom:12px}
nav{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px 0;background:var(--bg)}
nav a{display:flex;align-items:center;justify-content:center;gap:6px;min-height:56px;border-radius:16px;font-size:20px;font-weight:700;text-decoration:none;color:#fff}
nav .n1{background:var(--c1);color:var(--c1t)}nav .n2{background:var(--c2)}nav .n3{background:var(--c3)}nav .n4{background:var(--c4)}
section{margin-top:18px;border-radius:24px;padding:16px;scroll-margin-top:80px}
h2{margin:0 0 12px;font-size:26px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
h2 small{font-size:17px;font-weight:400;color:var(--soft)}
.s1{background:var(--c1);color:#fff}.s1 h2{color:var(--c1t)}.s1 h2 small{color:#C9D3E3}
.s2{background:var(--c2bg)}.s2 h2{color:#B03A10}
.s3{background:var(--c3bg)}.s3 h2{color:#1B4A9E}
.s4{background:var(--c4bg)}.s4 h2,.s4 h3{color:#2C6010}
h3{margin:18px 0 12px;font-size:24px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}h3 small{font-size:17px;font-weight:400;color:var(--soft)}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.g4{grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
.t{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:124px;padding:10px 6px;border-radius:18px;background:var(--card);border:3px solid var(--line);color:var(--ink);text-decoration:none;text-align:center;-webkit-tap-highlight-color:transparent;transition:transform .12s}
.t:active{transform:scale(.96)}
.t .no{position:absolute;top:6px;left:8px;min-width:28px;height:28px;border-radius:14px;background:var(--bg);color:var(--soft);font-size:16px;font-weight:700;line-height:28px}
.t .ic{font-size:40px;line-height:1.15}
.t .en{font-size:22px;font-weight:700;line-height:1.15}
.t .zh{font-size:18px;color:var(--soft)}
.t .tt{font-size:22px;font-weight:700}
.t .dd{font-size:17px;color:var(--soft)}
.ch{background:#1F3150;border-color:#2E4670;color:#fff}
.ch .no{background:var(--c1t);color:var(--c1)}
.ch .tt{font-size:24px}.ch .q{font-size:19px;color:#FFE9A8}.ch .dd{color:#AEBBD0;font-size:16px}
.s2 .t{border-color:#FFC9AE}.s3 .t{border-color:#B9D0F4}.s4 .t{border-color:#B8DE9C}
.t.all{background:#FFF1E9;border-style:dashed}
.foot{margin-top:22px;text-align:center;font-size:16px;color:var(--soft);line-height:1.6}
@media (max-width:520px){
 h1{font-size:28px}.sub{font-size:18px}
 nav{grid-template-columns:repeat(2,1fr)}nav a{min-height:50px;font-size:19px}
 .g{grid-template-columns:repeat(2,1fr)}.g4{grid-template-columns:1fr 1fr}
 .t .en{font-size:20px}
}
</style>
</head>
<body>
<main class="app">
<h1>💼 職業英文單字</h1>
<div class="sub">選一個主題，點下去就開始上課 👇</div>
<nav aria-label="主題">
 <a class="n1" href="#challenge">🏆 挑戰</a><a class="n2" href="#words">🔤 單字</a><a class="n3" href="#games">🎮 遊戲</a><a class="n4" href="#boards">📊 排行榜</a>
</nav>

<section class="s1" id="challenge">
 <h2>🏆 挑戰：最想做的工作是哪一個？<small>4 題猜猜看</small></h2>
 <div class="g g4">
${challenges.map(c => '  ' + tile('story.html#' + c.h, 'ch',
  `<span class="no">${c.n}</span><span class="ic">${c.ic}</span><span class="tt">${c.who}</span><span class="q">最想做什麼？</span><span class="dd">${c.src}</span>`,
  `挑戰 ${c.n}：${c.who}最想做什麼`)).join('\n')}
 </div>
</section>

<section class="s2" id="words">
 <h2>🔤 單字卡<small>學生最想做的 21 個職業，點一個直接開始</small></h2>
 <div class="g">
${wordTiles(kids)}
  ${tile('story.html#rev', 'all', `<span class="ic">📝</span><span class="tt">複習</span><span class="dd">全部 ${words.length} 個字抽 5 題</span>`, `複習全部 ${words.length} 個單字`)}
 </div>
</section>

<section class="s3" id="games">
 <h2>🎮 遊戲<small>10 種，點一個直接開始</small></h2>
 <div class="g">
${gameList.map(g => '  ' + tile('games.html#g' + (g.id + 1), '',
  `<span class="no">${g.id + 1}</span><span class="ic">${g.ic}</span><span class="tt">${g.t}</span><span class="dd">${g.d}</span>`,
  `遊戲 ${g.id + 1}：${g.t}`)).join('\n')}
 </div>
</section>

<section class="s4" id="boards">
 <h2>📊 排行榜<small>學生和大人最想做什麼？</small></h2>
 <div class="g">
${boards.map(b => '  ' + tile(b.href, '',
  `<span class="ic">${b.ic}</span><span class="tt">${b.t}</span><span class="dd">${b.d}</span>`, b.t)).join('\n')}
 </div>
 <h3>🔤 大人榜單的單字卡<small>${adults.length} 個職業</small></h3>
 <div class="g">
${wordTiles(adults)}
 </div>
</section>

<div class="foot">資料：國語日報 2026｜OECD PISA 2018｜1111 人力銀行 2026｜Remitly 2026<br>字源：Online Etymology Dictionary、Merriam-Webster、Cambridge Dictionary</div>
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('index.html 完成：' + kids.length + '＋' + adults.length + ' 個單字、' + gameList.length + ' 個遊戲');
