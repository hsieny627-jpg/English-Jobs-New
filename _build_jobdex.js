// 產生 jobdex.html（📖 職業圖鑑＋🎮 5 種複習遊戲）：node _build_jobdex.js
// 資料全部沿用 quiz 已經核對過的：evidence/quiz.json（O*NET 六型分數、30 題工作內容）、evidence/audit.json（母音、不發音）、
// story.html 的單字（中文、圖示、第幾張卡、音節 SYL、母音 VOW、不發音 SILENT）。這裡不手寫任何職業資料。
// 遊戲框架照參考頁 https://hsieny627-jpg.github.io/AI-Agent-Open-Code/sentences/games.html（卡包樣式、翻卡的話抄在 _jobdex_ref.json）。
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const story = fs.readFileSync(path.join(dir, 'story.html'), 'utf8');
const Q = JSON.parse(fs.readFileSync(path.join(dir, 'evidence', 'quiz.json'), 'utf8'));
const AUD = JSON.parse(fs.readFileSync(path.join(dir, 'evidence', 'audit.json'), 'utf8'));
const REF = JSON.parse(fs.readFileSync(path.join(dir, '_jobdex_ref.json'), 'utf8'));

const font = story.match(/@font-face\{[^}]*\}/)[0];
const words = [...story.matchAll(/\{no:(\d+),e:'([^']+)',z:'([^']+)',ic:'([^']+)'/g)].map(m => ({ no: +m[1], e: m[2], z: m[3], ic: m[4] }));
const W = Object.fromEntries(words.map(w => [w.e, w]));
const SYL = JSON.parse(story.match(/const SYL=(\{.*?\});/)[1]);
const VOW = JSON.parse(story.match(/const VOW=(\{.*?\});/)[1]);
const SILENT = JSON.parse(story.match(/const SILENT=(\{.*?\});/)[1]);
const bad = Q.items.filter(i => !i.ok).length + Q.claims.filter(c => !c.ok).length + Object.values(Q.jobs).filter(j => !j.ok).length
  + Q.no_data.filter(x => !x.ok).length + (Q.titles_db.ok ? 0 : 1) + AUD.letters.filter(l => !(l.ok && l.site_ok)).length;
if (bad || !Q.balanced || Q.items.length !== 30) throw new Error('evidence/quiz.json 或 audit.json 有沒通過的項目，先跑 python3 _quiz_check.py、python3 _audit.py');

// 六型：和 quiz.html 同一份（大考中心名稱、顏色）
const TY = {
  R: { ic: '🔧', f: '實用型', en: 'Realistic', d: '喜歡動手做、修東西', act: '動手做、修東西', c: '#D9692B', bg: '#FCEEE4' },
  I: { ic: '🔬', f: '研究型', en: 'Investigative', d: '喜歡觀察、研究', act: '觀察、研究', c: '#2C6FC9', bg: '#E6EFFA' },
  A: { ic: '🎨', f: '藝術型', en: 'Artistic', d: '喜歡創作、表演', act: '創作、表演', c: '#9A4FC4', bg: '#F3E9F9' },
  S: { ic: '🤝', f: '社會型', en: 'Social', d: '喜歡幫助、教別人', act: '幫助、教別人', c: '#2E9358', bg: '#E5F4EA' },
  E: { ic: '📣', f: '企業型', en: 'Enterprising', d: '喜歡帶領、說服別人', act: '帶領、說服別人', c: '#CF3F55', bg: '#FBE8EB' },
  C: { ic: '📋', f: '事務型', en: 'Conventional', d: '喜歡照步驟整理資料', act: '照步驟整理資料', c: '#14868A', bg: '#E1F3F3' },
};
const ORDER = 'RIASEC';
// 圖鑑收的字：有 O*NET 分數的 ＋ quiz 列在「也可以認識」的（YouTuber、content creator、influencer）；fortune teller 不放（CLAUDE.md）
const EXTRA = Q.no_data.filter(x => x.show).map(x => x.e);
const LIST = words.filter(w => Q.jobs[w.e] || EXTRA.includes(w.e)).map(w => w.e);
const J = {};
for (const e of LIST) {
  const w = W[e], j = Q.jobs[e];
  if (!SYL[e] || SYL[e].replace(/-/g, '') !== e) throw new Error('音節拼回來不等於單字：' + e);
  const o = { n: w.no, z: w.z, ic: w.ic, syl: SYL[e], v: VOW[e] || [], g: SILENT[e] || [] };
  if (j) { const mx = Math.max(...Object.values(j.scores));
    Object.assign(o, { s: j.scores, top: ORDER.split('').filter(t => j.scores[t] === mx), top3: j.top3, url: j.url, code: j.code, note: j.note || '' }); }
  J[e] = o;
}
// 圖鑑分本：依 O*NET 最高分那一型（同分兩本都放）；還沒有分數的放 X
const BOOK = { all: LIST.slice() };
for (const t of ORDER) BOOK[t] = LIST.filter(e => J[e].s && J[e].top.includes(t)).sort((a, b) => J[b].s[t] - J[a].s[t]);
BOOK.X = LIST.filter(e => !J[e].s);
const ITEMS = Q.items.map(i => ({ t: i.t, ic: i.ic, zh: i.zh, e: i.e }));
for (const i of ITEMS) if (!J[i.e] || !J[i.e].top3.includes(i.t)) throw new Error('題目的職業或類型不對：' + i.e);
const RATED = Math.floor(Q.titles_db.rated / 100) * 100;

// 5 種遊戲（2026/10/9 使用者同意的規劃；一場 1 分 30 秒）
const META = [
  { id: 'magnet', ic: '🧲', name: '興趣磁鐵', c: '#2C6FC9', b: '#E6EFFA', rule: '職業卡從上面掉下來，用手指把它甩進分數最高的那一型磁鐵。', learn: '英文單字＋六種興趣', how: [['👆', '按住職業卡，往磁鐵的方向<b>甩出去</b>（或拖到磁鐵上放開）'], ['🧲', '丟進它<b>分數最高</b>的那一型；兩型同分，兩個都對'], ['⚡', '越掉越快！最後 15 秒「磁暴」，分數 ✕ 2']] },
  { id: 'dark', ic: '🔦', name: '黑夜搜查', c: '#8A6408', b: '#F7E9BE', rule: '一片漆黑！手指當手電筒照來照去，找到上面那個職業的英文。', learn: '看英文認字', how: [['🔦', '手指在黑暗中<b>滑一滑</b>＝手電筒'], ['👀', '照到上面那個職業的<b>英文</b>，再<b>點它</b>一下'], ['💡', '連對越多，手電筒的光越大']] },
  { id: 'ninja', ic: '🥷', name: '音節忍者', c: '#1B2B4B', b: '#E6EAF2', rule: '英文字飛出來，用手指一刀切在音節中間（doc｜tor）。', learn: '音節', how: [['🗡️', '手指從上往下<b>劃過</b>字，切在音節中間（doc｜tor）'], ['🥁', '每個音節都切開，就會一拍一拍唸給你聽'], ['🙅', '只有 1 個音節的字（nurse），按「不用切」']] },
  { id: 'detect', ic: '🕵️', name: '職業神探', c: '#CF3F55', b: '#FBE8EB', rule: '線索一條一條亮起來，把放大鏡拖到你覺得是的那個人身上。', learn: '英文＋職業的工作內容', how: [['🧩', '線索一條一條亮：① 興趣類型 ② 他的工作 ③ 中文名字第一個字'], ['🔍', '把<b>放大鏡拖到</b>嫌疑人身上＝抓人；點名牌可以聽英文'], ['⚡', '越早抓對，分數越高']] },
  { id: 'lava', ic: '🌋', name: '火山大逃亡', c: '#D9692B', b: '#FCEEE4', rule: '聽英文，跳上對的石頭往上爬；岩漿一直往上漲！', learn: '聽力', how: [['🔊', '<b>聽</b>英文（可以按 🔊 再聽）'], ['🪨', '點石頭上對的圖示，<b>跳上去</b>往上爬'], ['🌋', '岩漿一直漲，動作要快！']] },
];
// 驚喜卡（照參考頁：連對 3 題就開，二～五選一，只有好事）。效果的種類和數值照參考頁；
// 參考頁的「✂️ 刪掉錯的選項」只給選擇題，這 5 種遊戲沒有選項，所以不放（改用「💡 送你提示」）。
const FX = [
  ['⚡ 電力全開', 'pts', 500], ['🔋 充飽電', 'pts', 1000], ['🌩 雷擊暴衝', 'pts', 2000], ['🧧 神秘紅包', 'lucky', [200, 1000]], ['💰 超級紅包', 'lucky', [100, 5000]],
  ['🎰 幸運拉霸', 'slot', 1], ['🔥 連擊火焰', 'now', 2], ['🎆 煙火綻放', 'now', 3], ['🚀 火箭點火', 'now', 5], ['🌟 超新星', 'mul', [2, 3]],
  ['🧲 磁力吸分', 'mul', [3, 3]], ['🌀 能量漩渦', 'mul', [5, 2]], ['💣 超級炸彈', 'mul', [10, 1]], ['🌌 銀河加持', 'mul', [2, 5]], ['⏰ 多給時間', 'time', 8],
  ['⏳ 時間膠囊', 'gt', 20], ['⌛ 大沙漏', 'gt', 40], ['🛡 免死金牌', 'shield', 1], ['🛡 雙層護盾', 'shield', 2], ['🔗 連鎖反應', 'combo', [3, 4]],
  ['⛓ 超級連鎖', 'combo', [5, 6]], ['💡 送你提示', 'hint', 1], ['🏅 黃金題', 'gold', 1000], ['👑 皇冠題', 'gold', 3000], ['🎯 快手獎', 'fast', 500],
  ['🔥 連對加碼', 'streak', 3], ['🌋 連對爆發', 'streak', 5], ['❄️ 冷凍光束', 'freeze', 5], ['🧊 超級冰凍', 'freeze', 10], ['📈 總分加成', 'pct', 20],
  ['📊 總分大加成', 'pct', 50], ['🌧 分數雨', 'rain', [300, 3]], ['⛈ 分數暴雨', 'rain', [500, 5]], ['💥 總分翻倍', 'dbl', 3000],
];
const SURP = {};
META.forEach((m, k) => { SURP[m.id] = [];
  for (let i = 0; i < 30; i++) { const f = FX[(k * 7 + i) % FX.length]; SURP[m.id].push({ t: f[0], k: f[1], v: f[2], fx: [i % 8, Math.floor(i / 8) % 4] }); } });

const HOW = '<div class="how"><b>🤔 分數怎麼來的？</b><ol><li>研究「興趣」的大學教授和受過訓練的專家，先替 269 種工作打分數。</li><li>電腦讀每個工作的說明和「每天要做的事」，跟著專家的分數學打分數。</li><li>電腦學會以後，替 ' + Q.titles_db.rated + ' 種工作都打好分數。</li></ol><a href="https://www.onetcenter.org/reports/ML_OIPs.html" target="_blank" rel="noopener">出處：O*NET 研究報告 ↗</a></div>'; // 和 quiz.html 同一段
if (!Q.claims.some(c => /269/.test(c.quotes.join(' ')) || /269/.test(c.name))) throw new Error('「269 種工作」在 quiz.json 的 CLAIMS 找不到原文，先跑 python3 _quiz_check.py');

// 遊戲卡上的圖示（簡潔線條，不用卡通圖）
const GI = {
  magnet: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M14 10v22a18 18 0 0 0 36 0V10"/><path d="M14 10h10v22a8 8 0 0 0 16 0V10h10" /><path d="M14 20h10M40 20h10" stroke-width="4"/></svg>',
  dark: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="M8 38l14-14 18 18-14 14z"/><path d="M22 24l8-8 18 18-8 8"/><path d="M44 12l6-6M50 20l8-2M38 8l2-6"/></svg>',
  ninja: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M10 54L46 18"/><path d="M42 10l12 12"/><path d="M50 6l8 8"/><path d="M6 30c10-2 18-8 24-18" stroke-width="3" stroke-dasharray="4 6"/></svg>',
  detect: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="26" cy="26" r="16"/><path d="M38 38l18 18"/><path d="M18 26a8 8 0 0 1 8-8" stroke-width="3"/></svg>',
  lava: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="M4 56L24 20h16l20 36z"/><path d="M24 20c2-8 14-8 16 0"/><path d="M28 10c0-4 8-4 8 0" stroke-width="3"/><path d="M16 44c6 4 10-4 16 0s10-4 16 0" stroke-width="3"/></svg>',
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const css = fs.readFileSync(path.join(dir, '_jobdex.css'), 'utf8');
const app = fs.readFileSync(path.join(dir, '_jobdex_app.js'), 'utf8');
const DATA = { TY, ORDER, J, BOOK, ITEMS, META: META.map(m => Object.assign({}, m, { svg: GI[m.id] })), SURP, SKIN: REF.SKIN, JOKE: REF.JOKE, OPENA: REF.OPENA, HOW, RATED };

const bookTabs = [['all', '📖 全部', '#1B2B4B']].concat(ORDER.split('').map(t => [t, TY[t].ic + ' ' + TY[t].f, TY[t].c])).concat([['X', '❔ 還沒有分數', '#5B6782']]);

const html = `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>職業圖鑑＋複習遊戲</title>
<style>
${font}
${css}
</style>
</head>
<body data-s="hub">
<main class="app" id="hubwrap">
 <div class="top"><a class="homeln" href="index.html">🏠 首頁</a><span id="scme"></span></div>
 <section class="scr on" id="hub">
  <div class="hero">
   <span class="kick">📖 職業圖鑑 ＋ 🎮 5 種複習遊戲</span>
   <h1>職業英文 大挑戰</h1>
   <p>每一場 1 分 30 秒。答得越快，分數越高；連對 3 題開 🎁 驚喜卡！</p>
  </div>
  <div class="sec" id="games">
   <h2 class="h2">🎮 複習遊戲</h2>
   <p class="one">點一個開始</p>
   <div class="ggrid" id="grid"></div>
  </div>
  <div class="sec" id="dex">
   <h2 class="h2">📖 職業圖鑑</h2>
   <p class="one">分成幾本，一次學一本。點職業卡，看它的「興趣成分」和音節。</p>
   <div class="tabs" id="tabs">${bookTabs.map(([k, l, c]) => `<button data-b="${k}" style="--c:${c}">${l} <small>${BOOK[k].length}</small></button>`).join('')}</div>
   <div class="bookh" id="bookh"></div>
   <div class="dex" id="dexg"></div>
   <details class="hows" style="margin-top:24px"><summary>🤔 興趣分數怎麼來的？</summary>${HOW}</details>
   <p class="dexn">美國勞動部的 O*NET 替 ${RATED} 多種工作打了六種興趣的分數。每個職業放在它<b>分數最高</b>的那一本；兩型同分，兩本都放（卡片上標「同分」）。YouTuber、網紅、內容創作者還沒有自己的分數，放在「還沒有分數」。</p>
  </div>
 </section>
 <section class="scr" id="book"></section>
</main>

<div id="play">
 <div id="hud">
  <span id="gname"></span>
  <span id="gclock">⏳ 1:30</span>
  <span id="gring"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="42"/><circle class="fg" id="gfg" cx="50" cy="50" r="42"/></svg><span id="gnum">15</span></span>
  <span class="tags" id="tagsL"></span>
  <span class="gsb"><span class="gb1"><b id="gsc">0</b><em>🏆 總分</em></span><span><b id="gstreak">—</b><em>連對</em></span><span><b id="gsurp">🎁 0</b><em>驚喜卡</em></span></span>
  <span id="gpop"></span>
 </div>
 <div id="arena"></div>
</div>

<section id="gend">
 <h2 id="gendh">🏁 這一場結束！</h2>
 <div class="sc" id="gendsc">0</div>
 <div class="ln" id="gendln"></div>
 <div class="rev" id="gendrev"></div>
 <div class="rowbtn">
  <button id="missBtn">📌 答錯整理</button>
  <button id="gscore" hidden>📊 我的成績</button>
  <button class="go2" id="retry">🔁 再玩一次</button>
  <button id="backhub">🎮 換一個遊戲</button>
 </div>
</section>

<nav id="bar">
 <button id="quit">⬅ 回遊戲大廳</button>
 <span class="grp" id="rateGrp"><span class="glbl">🗣 語速</span><button data-r="0.5">0.5</button><button data-r="0.6">0.6</button><button data-r="0.7">0.7</button><button data-r="0.8">0.8</button><button data-r="0.9">0.9</button><button data-r="1">1.0</button></span>
 <a href="index.html" class="homeln2">🏠 首頁</a>
</nav>

<div id="sheet" role="dialog" aria-modal="true"><div class="panel" id="panel"></div></div>
<div id="gain"></div><div id="pick"></div><div id="burst"></div>
<script src="score-url.js"></script>
<script>
const D=${JSON.stringify(DATA)};
${app}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'jobdex.html'), html);
console.log('jobdex.html：' + LIST.length + ' 個職業，' + ORDER.split('').map(t => TY[t].f + ' ' + BOOK[t].length).join('、') + '、還沒有分數 ' + BOOK.X.length + '；題目 ' + ITEMS.length + ' 句');
