// 產生 jobdex.html（📖 職業圖鑑＋🎮 7 種複習遊戲）：node _build_jobdex.js
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
const WHY = require('./_syl_why.js').why;   // 每一刀為什麼切在這裡
const SA = require('./_syl_anim.js');       // 音節動畫（和 quiz.html 共用）

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
  const o = { n: w.no, z: w.z, ic: w.ic, syl: SYL[e], v: VOW[e] || [], g: SILENT[e] || [], why: WHY(e, SYL[e], VOW[e] || [], SILENT[e] || []) };
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

// 7 種遊戲（一場 1 分 30 秒）。2026/10/9 使用者決定：音節忍者先拿掉（切的位置字典之間不一樣），新增記憶翻牌、打地鼠、拍數節奏。
// 大廳的遊戲卡只放：圖示、名字、一句話（line）；開始畫面放 2～3 行玩法（how）＋ 👀 觀看示範／▶ 開始遊戲。
const META = [
  { id: 'memory', ic: '🃏', name: '記憶翻牌', c: '#9A4FC4', b: '#F3E9F9', line: '翻兩張，配成一對', how: [['🃏', '翻兩張牌：<b>圖示＋中文</b> 配 <b>英文</b>'], ['🧠', '不一樣會翻回去，<b>記住它在哪裡</b>'], ['🎉', '全部配完就過關，下一關牌更多']] },
  { id: 'mole', ic: '🔨', name: '打地鼠', c: '#8A6408', b: '#F7E9BE', line: '敲舉著對的英文的地鼠', how: [['👀', '看上面的<b>圖示和中文</b>'], ['🔨', '地鼠舉著英文冒出來，<b>敲對的那一隻</b>'], ['⚡', '敲錯會扣連對，越來越快！']] },
  { id: 'lava', ic: '🌋', name: '火山大逃亡', c: '#D9692B', b: '#FCEEE4', line: '聽英文，跳上對的石頭', how: [['🔊', '<b>聽</b>英文（按 🔊 可以再聽）'], ['🪨', '點石頭上對的圖示，<b>跳上去</b>'], ['🌋', '岩漿一直漲，動作要快！']] },
  { id: 'dark', ic: '🔦', name: '黑夜搜查', c: '#1B2B4B', b: '#E6EAF2', line: '用手電筒找英文', how: [['🔦', '手指在黑暗中<b>滑一滑</b>＝手電筒'], ['👆', '照到上面那個職業的<b>英文</b>，點它']] },
  { id: 'beat', ic: '🥁', name: '拍數節奏', c: '#2E9358', b: '#E5F4EA', line: '只聽聲音，拍出幾個音節', how: [['🎧', '<b>只聽</b>英文的聲音（看不到字）'], ['🥁', '有幾個音節就<b>拍鼓幾下</b>，再按 ✅'], ['🎉', '答對了，才會出現這個字']] },
  { id: 'detect', ic: '🕵️', name: '職業神探', c: '#CF3F55', b: '#FBE8EB', line: '看線索，抓出是誰', how: [['🧩', '看線索：<b>他的工作</b>、中文第一個字'], ['🔍', '把<b>放大鏡拖到</b>那個人身上＝抓人']] },
  { id: 'magnet', ic: '🧲', name: '興趣磁鐵', c: '#2C6FC9', b: '#E6EFFA', line: '把職業甩進興趣磁鐵', how: [['👆', '按住職業卡，<b>甩進</b>磁鐵（或拖過去放開）'], ['🧲', '丟進它<b>分數最高</b>的那一型']] },
];
// 職業神探：容易搞混的職業（也會做這件事，或圖示、中文第一個字一樣）不放在同一題（2026/10/9）
const CONF = [['doctor', 'nurse', 'veterinarian'], ['psychologist', 'counselor'], ['programmer', 'game tester'], ['mechanic', 'mechanical engineer'],
  ['painter', 'designer'], ['business manager', 'chef'], ['police officer', 'lawyer']];
for (const g of CONF) for (const e of g) if (!ITEMS.some(i => i.e === e)) throw new Error('CONF 的職業不在題目裡：' + e);
// 驚喜卡（照參考頁：連對 3 題就開，二～五選一，只有好事）。效果的種類和數值照參考頁；
// 參考頁的「✂️ 刪掉錯的選項」只給選擇題，這 5 種遊戲沒有選項，所以不放（改用「💡 送你提示」）。
const FX = [
  ['⚡ 電力全開', 'pts', 500], ['🔋 充飽電', 'pts', 1000], ['🌩 雷擊暴衝', 'pts', 2000], ['🧧 神秘紅包', 'lucky', [200, 1000]], ['💰 超級紅包', 'lucky', [100, 5000]],
  ['🎰 幸運拉霸', 'slot', 1], ['🔥 連擊火焰', 'now', 2], ['🎆 煙火綻放', 'now', 3], ['🚀 火箭點火', 'now', 5], ['🌟 超新星', 'mul', [2, 3]],
  ['🧲 磁力吸分', 'mul', [3, 3]], ['🌀 能量漩渦', 'mul', [5, 2]], ['💣 超級炸彈', 'mul', [10, 1]], ['🌌 銀河加持', 'mul', [2, 5]], ['⏰ 多給時間', 'time', 8],
  ['⏳ 時間膠囊', 'gt', 20], ['⌛ 大沙漏', 'gt', 20], ['🛡 免死金牌', 'shield', 1], ['🛡 雙層護盾', 'shield', 2], ['🔗 連鎖反應', 'combo', [3, 4]],
  ['⛓ 超級連鎖', 'combo', [5, 6]], ['💡 送你提示', 'hint', 1], ['🏅 黃金題', 'gold', 1000], ['👑 皇冠題', 'gold', 3000], ['🎯 快手獎', 'fast', 500],
  ['🔥 連對加碼', 'streak', 3], ['🌋 連對爆發', 'streak', 5], ['❄️ 冷凍光束', 'freeze', 5], ['🧊 超級冰凍', 'freeze', 10], ['📈 總分加成', 'pct', 20],
  ['📊 總分大加成', 'pct', 50], ['🌧 分數雨', 'rain', [300, 3]], ['⛈ 分數暴雨', 'rain', [500, 5]], ['💥 總分翻倍', 'dbl', 3000],
];
const SURP = {};
META.forEach((m, k) => { SURP[m.id] = [];
  for (let i = 0; i < 30; i++) { const f = FX[(k * 7 + i) % FX.length]; SURP[m.id].push({ t: f[0], k: f[1], v: f[2], fx: [i % 8, Math.floor(i / 8) % 4] }); } });

const HOW = '<div class="how"><b>🤔 分數怎麼來的？</b><ol><li>研究「興趣」的大學教授和受過訓練的專家，先替 269 種工作打分數。</li><li>電腦讀每個工作的說明和「每天要做的事」，跟著專家的分數學打分數。</li><li>電腦學會以後，替 ' + Q.titles_db.rated + ' 種工作都打好分數。</li></ol><a href="https://www.onetcenter.org/reports/ML_OIPs.html" target="_blank" rel="noopener">出處：O*NET 研究報告 ↗</a></div>'; // 和 quiz.html 同一段
if (!Q.claims.some(c => /269/.test(c.quotes.join(' ')) || /269/.test(c.name))) throw new Error('「269 種工作」在 quiz.json 的 CLAIMS 找不到原文，先跑 python3 _quiz_check.py');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const css = fs.readFileSync(path.join(dir, '_jobdex.css'), 'utf8');
const app = fs.readFileSync(path.join(dir, '_jobdex_app.js'), 'utf8');
const DATA = { TY, ORDER, J, BOOK, ITEMS, META, CONF, SURP, SKIN: REF.SKIN, JOKE: REF.JOKE, OPENA: REF.OPENA, HOW, RATED };

const bookTabs = [['all', '📖 全部', '#1B2B4B']].concat(ORDER.split('').map(t => [t, TY[t].ic + ' ' + TY[t].f.replace('型', ''), TY[t].c])).concat([['X', '❔ 沒分數', '#5B6782']]);

const html = `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>職業圖鑑＋複習遊戲</title>
<style>
/* 英文不合字（2026/10/9）：Andika 會把 fi、ffi 合成一個字，紅色的 i 就變黑色 */
*{font-variant-ligatures:none;font-feature-settings:"liga" 0,"clig" 0}
${font}
${css}
${SA.CSS}
</style>
</head>
<body data-s="hub">
<main class="app" id="hubwrap">
 <div class="top"><span id="scme"></span></div>
 <section class="scr on" id="hub">
  <h1 class="ttl">職業英文</h1>
  <div class="seg" id="seg"><button data-v="games" class="on">🎮 遊戲</button><button data-v="dex">📖 圖鑑</button></div>
  <div class="pane on" id="games"><div class="ggrid" id="grid"></div></div>
  <div class="pane" id="dex">
   <div class="tabs" id="tabs">${bookTabs.map(([k, l, c]) => `<button data-b="${k}" style="--c:${c}">${l} <small>${BOOK[k].length}</small></button>`).join('')}</div>
   <div class="bookh" id="bookh"></div>
   <div class="autobar"><button class="go gold" id="autoBtn">▶ 從第一張自動播放<small>每個字唸 3 次</small></button></div>
   <div class="dex" id="dexg"></div>
   <details class="hows teach"><summary>📚 給老師看：圖鑑怎麼分本、分數怎麼來的</summary><p class="dexn">美國勞動部的 O*NET 替 ${RATED} 多種工作打了六種興趣的分數。每個職業放在它<b>分數最高</b>的那一本；兩型同分，兩本都放（卡片上標「同分」）。YouTuber、網紅、內容創作者還沒有自己的分數，放在「還沒有分數」。</p>${HOW}</details>
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
 <button id="quit">⬅ 返回</button>
 <span class="grp" id="rateGrp"><button data-r="0.6">🐢 慢</button><button data-r="0.9">🐇 正常</button></span>
 <button id="muteBtn" class="mute" aria-pressed="false">🔔 音效 開</button>
 <a href="index.html" class="homeln2">🏠 首頁</a>
</nav>

<div id="sheet" role="dialog" aria-modal="true"><div class="panel" id="panel"></div></div>
<div id="gain"></div><div id="pick"></div><div id="burst"></div>
<script src="score-url.js"></script>
<script src="audio/syl/aud.js"></script>
<script>
const D=${JSON.stringify(DATA)};
${SA.JS}
${app}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'jobdex.html'), html);
console.log('jobdex.html：' + LIST.length + ' 個職業，' + ORDER.split('').map(t => TY[t].f + ' ' + BOOK[t].length).join('、') + '、還沒有分數 ' + BOOK.X.length + '；題目 ' + ITEMS.length + ' 句');
