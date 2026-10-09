// 產生職涯探索測驗 quiz.html：python3 _quiz_check.py 核對原文之後，再跑 node _build_quiz.js
// 題目、職業興趣分數、研究出處都從 evidence/quiz.json 讀；單字（中文、圖示、第幾張卡）從 story.html 讀。
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const story = fs.readFileSync(path.join(dir, 'story.html'), 'utf8');
const Q = JSON.parse(fs.readFileSync(path.join(dir, 'evidence', 'quiz.json'), 'utf8'));

const font = story.match(/@font-face\{[^}]*\}/)[0];
const words = [...story.matchAll(/\{no:(\d+),e:'([^']+)',z:'([^']+)',ic:'([^']+)'/g)]
  .map(m => ({ no: +m[1], e: m[2], z: m[3], ic: m[4] }));
const W = Object.fromEntries(words.map(w => [w.e, w]));
const bad = Q.items.filter(i => !i.ok).length + Q.claims.filter(c => !c.ok).length + Object.values(Q.jobs).filter(j => !j.ok).length;
if (bad || !Q.balanced || Q.items.length !== 30) throw new Error('evidence/quiz.json 有沒通過的項目，先跑 python3 _quiz_check.py');
for (const i of Q.items) if (!W[i.e]) throw new Error('題目的職業不在單字卡裡：' + i.e);

// 六型：學生看的說法（大字）＋台灣正式名稱（小字，大考中心興趣量表）＋從 O*NET 定義改寫的一句話
const TY = {
  R: { ic: '🔧', k: '動手做', f: '實用型', c: '#E8743B', bg: '#FFE6D6', d: '用工具做東西、修東西，活動身體，在戶外工作' },
  I: { ic: '🔬', k: '愛探索', f: '研究型', c: '#2F6FDE', bg: '#DCE8FB', d: '研究東西、動物和植物、生病的原因，或人為什麼會這樣做' },
  A: { ic: '🎨', k: '愛創作', f: '藝術型', c: '#B24FD0', bg: '#F3E1FA', d: '畫畫、表演、寫作、做料理、做音樂、設計東西' },
  S: { ic: '🤝', k: '愛幫助', f: '社會型', c: '#2FA35A', bg: '#DCF0C8', d: '幫助、教導、照顧別人，為別人服務' },
  E: { ic: '📣', k: '愛帶領', f: '企業型', c: '#D4452E', bg: '#FFE0DA', d: '帶領大家、和別人談條件、推銷東西、說服別人' },
  C: { ic: '📋', k: '愛整理', f: '事務型', c: '#1E8C8C', bg: '#D5F1EF', d: '照著步驟和規則，把資料整理得清清楚楚' },
};
const ORDER = 'RIASEC';
// 結果頁每一型列哪些職業：O*NET 興趣分數前 3 名有這一型；📋 事務型只列前 2 名（太多學生不會看）
const JOBS = {};
for (const t of ORDER) {
  const max = t === 'C' ? 2 : 3;
  JOBS[t] = words.filter(w => Q.jobs[w.e] && Q.jobs[w.e].top3.slice(0, max).includes(t))
    .sort((a, b) => Q.jobs[a.e].top3.indexOf(t) - Q.jobs[b.e].top3.indexOf(t) || Q.jobs[b.e].scores[t] - Q.jobs[a.e].scores[t])
    .map(w => w.e);
}
const EXTRA = Q.no_data.filter(x => x.show).map(x => x.e);
const ITEMS = Q.items.map(i => ({ t: i.t, ic: i.ic, zh: i.zh, e: i.e }));
const FACES = [['😍', '好喜歡', 5], ['🙂', '喜歡', 4], ['😐', '不確定', 3], ['🙁', '不喜歡', 2], ['😖', '很不喜歡', 1]];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const card = e => { const w = W[e]; return `<a class="jt" href="story.html#w${w.no}" data-e="${esc(e)}"><span class="ji">${w.ic}</span><span class="je">${esc(e)}</span><span class="jz">${esc(w.z)}</span><span class="jgo">學這個字 ▶</span></a>`; };

const evItems = Q.items.map(i => `<tr><td>${i.n}</td><td>${TY[i.t].ic} ${TY[i.t].f}</td><td>${i.ic} ${esc(i.zh)}</td><td><b>${esc(i.e)}</b></td>
<td>${i.q.map(q => '“' + esc(q) + '”').join('<br>')}</td><td>${TY[i.t].f.slice(0, 2)} ${i.score}（第 ${i.rank} 高）<br><a href="${i.url}" target="_blank" rel="noopener">O*NET ${i.code}</a></td></tr>`).join('\n');
const evJobs = words.filter(w => Q.jobs[w.e]).map(w => { const j = Q.jobs[w.e];
  return `<tr><td>${w.ic} <b>${esc(w.e)}</b> ${esc(w.z)}</td><td>${ORDER.split('').map(t => (j.top3.includes(t) ? '<b>' : '') + TY[t].f.slice(0, 2) + ' ' + j.scores[t] + (j.top3.includes(t) ? '</b>' : '')).join('、')}</td><td><a href="${j.url}" target="_blank" rel="noopener">${j.code}</a></td></tr>`; }).join('\n');
const evNo = Q.no_data.map(x => `<tr><td>${W[x.e].ic} <b>${esc(x.e)}</b> ${esc(W[x.e].z)}</td><td>${esc(x.why)}</td><td>${x.show ? '結果頁列在「這些職業也可以認識」' : '結果頁不列（沒有任何職業研究資料）；單字卡照舊'}</td></tr>`).join('\n');
const evClaims = Q.claims.map(c => `<tr><td>${esc(c.name)}</td><td>${c.quotes.map(q => '“' + esc(q) + '”').join('<br>')}</td><td><a href="${c.url}" target="_blank" rel="noopener">原文</a></td></tr>`).join('\n');
const evDefs = ORDER.split('').map(t => `<tr><td>${TY[t].ic} ${TY[t].k}（${TY[t].f}）</td><td>${TY[t].d}</td><td>“${esc(Q.defs[t])}”</td></tr>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>職業興趣探險</title>
<style>
${font}
:root{--bg:#FFF7E8;--card:#fff;--ink:#23201C;--soft:#6F665B;--line:#F0E2C8;--sea:#2F8FD8;--gold:#FFC93C}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font-family:'AndikaEmbed',"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;-webkit-text-size-adjust:100%;overflow-x:hidden}
button{font-family:inherit;color:inherit}
.app{max-width:1100px;margin:0 auto;padding:12px 16px 40px}
.homeln{display:inline-flex;align-items:center;min-height:48px;padding:0 16px;border-radius:14px;border:3px solid var(--line);background:#fff;color:var(--ink);font-size:20px;font-weight:700;text-decoration:none}
.top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.evln{font-size:18px;color:var(--soft);min-height:48px;display:inline-flex;align-items:center;padding:0 12px}
.scr{display:none}.scr.on{display:block;animation:fadein .35s ease}
@keyframes fadein{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.big{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:72px;padding:10px 34px;border-radius:22px;border:0;background:var(--sea);color:#fff;font-size:28px;font-weight:700;cursor:pointer;box-shadow:0 6px 0 #1C6AA8;-webkit-tap-highlight-color:transparent;text-decoration:none}
.big:active{transform:translateY(4px);box-shadow:0 2px 0 #1C6AA8}
.ghost{min-height:56px;padding:8px 20px;border-radius:16px;border:3px solid var(--line);background:#fff;font-size:21px;font-weight:700;cursor:pointer}
.ghost:disabled{opacity:.35;cursor:default}
/* 開場 */
#start{text-align:center}
h1{font-size:clamp(34px,5vw,54px);margin:14px 0 4px}
.lead{font-size:clamp(21px,2.6vw,28px);color:var(--soft);margin:0 0 10px}
.sea{position:relative;margin:10px auto 18px;max-width:820px;height:clamp(150px,22vw,220px);border-radius:30px;background:linear-gradient(#BFE6FF,#7CC4F2 60%,#3F9EE0);overflow:hidden}
.isl{position:absolute;bottom:14%;display:flex;flex-direction:column;align-items:center;animation:bob 3s ease-in-out infinite}
.isl b{font-size:clamp(34px,5vw,54px);line-height:1}
.isl i{font-style:normal;margin-top:4px;padding:2px 10px;border-radius:12px;background:#fff;font-size:clamp(16px,1.9vw,20px);font-weight:700}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.rules{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:900px;margin:0 auto 20px}
.rules div{background:#fff;border:3px solid var(--line);border-radius:20px;padding:14px 10px;font-size:clamp(19px,2.2vw,24px);font-weight:700;line-height:1.4}
.rules span{display:block;font-size:40px}
.note{max-width:900px;margin:18px auto 0;background:#FFF0C2;border:3px solid #F2D27A;border-radius:18px;padding:12px 16px;font-size:clamp(18px,2vw,22px);line-height:1.6;text-align:left}
.note b{color:#9A5B00}
/* 題目 */
.prog{display:flex;align-items:center;gap:12px;margin:8px 0}
.track{position:relative;flex:1;height:22px;border-radius:11px;background:#DCEBF7}
.fill{position:absolute;left:0;top:0;bottom:0;border-radius:11px;background:linear-gradient(90deg,#7CC4F2,var(--sea));transition:width .4s}
.boat{position:absolute;top:50%;font-size:34px;transform:translate(-50%,-62%);transition:left .4s}
.pn{font-size:21px;font-weight:700;white-space:nowrap}
.qc{background:#fff;border:4px solid var(--line);border-radius:30px;padding:clamp(10px,2vh,26px) clamp(12px,3vw,30px);text-align:center;box-shadow:0 8px 0 var(--line)}
.qc.in{animation:slidein .4s cubic-bezier(.2,1.2,.4,1)}
@keyframes slidein{from{opacity:0;transform:translateX(60px) rotate(2deg)}to{opacity:1;transform:none}}
.qlv{display:inline-block;font-size:19px;font-weight:700;color:var(--soft);background:var(--bg);border-radius:12px;padding:4px 12px}
.qi{font-size:clamp(56px,min(12vw,12vh),130px);line-height:1.1;margin:2px 0}
.qz{font-size:clamp(26px,min(4vw,5vh),48px);font-weight:700;line-height:1.3;min-height:2.6em;display:flex;align-items:center;justify-content:center}
.qa{font-size:clamp(19px,min(2.4vw,3vh),28px);color:var(--soft);margin:2px 0 10px}
.faces{display:grid;grid-template-columns:repeat(5,1fr);gap:clamp(6px,1.2vw,14px)}
.fc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:clamp(84px,min(13vw,14vh),150px);border-radius:22px;border:4px solid var(--line);background:#FFFDF8;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .12s,border-color .12s,background .12s;padding:6px 2px}
.fc b{font-size:clamp(38px,min(6vw,7vh),72px);line-height:1.1}
.fc span{font-size:clamp(16px,2vw,22px);font-weight:700;white-space:nowrap}
.fc:active{transform:scale(.94)}
.fc.sel{border-color:var(--sea);background:#E4F2FD;animation:pop .35s}
@keyframes pop{40%{transform:scale(1.12)}100%{transform:scale(1)}}
.rev{display:none;margin-top:12px;border-radius:22px;padding:8px 14px;background:#EAF4FF;border:3px solid #B4D8F5;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
.rev.on{display:flex;animation:flip .45s ease}
@keyframes flip{from{opacity:0;transform:rotateX(80deg)}to{opacity:1;transform:none}}
.ri{font-size:clamp(38px,6vh,56px)}
.rt{text-align:left;font-size:clamp(19px,2.2vw,24px);line-height:1.35}
.rt .re{display:block;font-size:clamp(30px,4vw,42px);font-weight:700;color:#1B4A9E}
.say{min-width:64px;min-height:64px;border-radius:50%;border:3px solid #B4D8F5;background:#fff;font-size:30px;cursor:pointer}
.nav{display:flex;justify-content:space-between;gap:12px;margin-top:12px}
/* 中場 */
#mid{text-align:center}
.badge{font-size:clamp(100px,16vw,160px);line-height:1.1;animation:tpop .8s cubic-bezier(.3,1.7,.5,1)}
@keyframes tpop{0%{transform:scale(.2) rotate(-30deg)}100%{transform:scale(1) rotate(0)}}
.mt{font-size:clamp(30px,4vw,44px);font-weight:700;margin:8px 0}
.ms{font-size:clamp(21px,2.4vw,26px);color:var(--soft);margin-bottom:18px}
.shelf{display:flex;justify-content:center;gap:10px;margin:0 0 20px;font-size:44px}
.shelf span{opacity:.18}.shelf span.got{opacity:1}
.fx{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9}
.fx i{position:absolute;top:-30px;width:14px;height:20px;border-radius:3px;animation:fall 1.8s ease-in forwards}
@keyframes fall{to{transform:translateY(110vh) rotate(540deg)}}
/* 結果 */
.warn{background:#FFF0C2;border:4px solid #F2D27A;border-radius:22px;padding:14px 18px;font-size:clamp(20px,2.3vw,25px);line-height:1.55;margin:12px 0}
.warn b{color:#9A5B00}
.rh{font-size:clamp(30px,4vw,44px);text-align:center;margin:14px 0 4px}
.map{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:center;background:#fff;border:4px solid var(--line);border-radius:28px;padding:16px}
.hex{width:100%;max-width:440px;margin:0 auto;display:block}
.hex .shape{transform-origin:200px 200px;transform:scale(0);transition:transform 1.2s cubic-bezier(.2,1.3,.4,1)}
.hex.go .shape{transform:scale(1)}
.bars{display:flex;flex-direction:column;gap:10px}
.bar{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:center;font-size:clamp(19px,2.1vw,23px);font-weight:700}
.bar small{font-size:16px;color:var(--soft);font-weight:400}
.bt{height:22px;border-radius:11px;background:#F2EEE6;overflow:hidden;grid-column:1/-1}
.bt i{display:block;height:100%;width:0;border-radius:11px;transition:width 1.2s ease}
.say1{text-align:center;font-size:clamp(23px,2.8vw,32px);font-weight:700;line-height:1.5;margin:18px 0 6px}
.sub{text-align:center;font-size:clamp(19px,2.2vw,23px);color:var(--soft);margin:0 0 10px;line-height:1.5}
.tg{border-radius:26px;padding:16px;margin-top:16px}
.tg h3{margin:0 0 4px;font-size:clamp(26px,3.2vw,34px)}
.tg h3 small{font-size:clamp(17px,1.9vw,20px);font-weight:400;color:var(--soft)}
.tg p{margin:0 0 12px;font-size:clamp(19px,2.2vw,23px);line-height:1.5}
.jg{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.jt{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:150px;padding:10px 6px;border-radius:20px;background:#fff;border:3px solid rgba(0,0,0,.08);color:var(--ink);text-decoration:none;text-align:center;opacity:0;transform:scale(.6);transition:transform .35s cubic-bezier(.3,1.6,.5,1),opacity .35s}
.jt.on{opacity:1;transform:none}
.jt:active{transform:scale(.95)}
.ji{font-size:46px;line-height:1.15}.je{font-size:23px;font-weight:700;line-height:1.15}.jz{font-size:18px;color:var(--soft)}
.jgo{font-size:16px;font-weight:700;color:var(--sea);margin-top:2px}
details.tg summary{cursor:pointer;list-style:none;min-height:56px;display:flex;align-items:center;gap:10px;font-size:clamp(24px,2.8vw,30px);font-weight:700}
details.tg summary::-webkit-details-marker{display:none}
details.tg summary::after{content:'▼';font-size:18px;margin-left:auto}
details.tg[open] summary::after{content:'▲'}
details.tg summary small{font-size:17px;font-weight:400;color:var(--soft)}
details.tg[open] .jt{opacity:1;transform:none}
.think{background:#fff;border:4px dashed #C8B99A;border-radius:24px;padding:14px 18px;margin-top:18px;font-size:clamp(20px,2.3vw,25px);line-height:1.7}
.think h3{margin:0 0 6px;font-size:clamp(25px,3vw,32px)}
.again{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin:22px 0 6px}
body[data-s=quiz] #ev,body[data-s=mid] #ev,body[data-s=quiz] .evln,body[data-s=mid] .evln{display:none}
/* 給老師看的證據 */
#ev{margin-top:30px;background:#fff;border:3px solid var(--line);border-radius:22px;padding:4px 14px 14px}
#ev>summary{cursor:pointer;min-height:56px;display:flex;align-items:center;font-size:22px;font-weight:700}
#ev h4{font-size:21px;margin:18px 0 8px}
#ev p,#ev li{font-size:17px;line-height:1.65}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
#ev table{border-collapse:collapse;font-size:16px;line-height:1.5;min-width:640px;width:100%}
#ev th,#ev td{border:1px solid #E6D9BF;padding:6px 8px;vertical-align:top;text-align:left}
#ev th{background:#FFF3DA}
#ev a{color:#2F6FDE}
@media (max-width:640px){
 .rules{grid-template-columns:1fr}.rules div{display:flex;align-items:center;gap:10px;text-align:left}.rules span{font-size:34px}
 .map{grid-template-columns:1fr}
 .jg{grid-template-columns:repeat(2,minmax(0,1fr))}
 .je{font-size:20px}
 .qc{padding:12px 8px;border-radius:24px}
 .faces{gap:4px}
 .fc{border-width:3px;border-radius:16px;padding:6px 0}
 .fc span{white-space:normal;font-size:16px;line-height:1.15;text-align:center}
 .qi{font-size:52px}
 .qz{font-size:23px}
 .qa{font-size:18px;margin-bottom:6px}
 .fc{min-height:74px}.fc b{font-size:34px}
 .rev{gap:8px;padding:6px 10px;margin-top:8px}.rev .ri{font-size:34px}
 .rt{font-size:17px}.rt .re{font-size:25px}
 .say{min-width:52px;min-height:52px;font-size:24px}
 #quiz .big{min-height:56px;font-size:22px;padding:6px 18px}
 #quiz .ghost{min-height:56px;font-size:19px;padding:6px 14px}
 .homeln{min-height:48px;font-size:18px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.fx{display:none}.hex .shape{transform:scale(1)}.jt{opacity:1;transform:none}}
</style>
</head>
<body>
<main class="app">
<div class="top"><a class="homeln" href="index.html">🏠 首頁</a><a class="evln" href="#ev" id="evgo">📚 給老師看的證據</a></div>

<section class="scr on" id="start">
 <h1>🧭 職業興趣探險</h1>
 <p class="lead">30 件工作上會做的事，你喜歡哪些？</p>
 <div class="sea" aria-hidden="true">
${ORDER.split('').map((t, k) => `  <div class="isl" style="left:${3 + k * 16}%;animation-delay:${k * .4}s"><b>${TY[t].ic}</b><i style="color:${TY[t].c}">${TY[t].k}</i></div>`).join('\n')}
 </div>
 <div class="rules">
  <div><span>✅</span>沒有對錯</div>
  <div><span>📝</span>不是考試，不打分數</div>
  <div><span>💗</span>照你「現在」的感覺選</div>
 </div>
 <button class="big" id="go">開始探險 ▶</button>
 <div class="note">⚠️ <b>僅供參考</b>：這個活動只是幫你<b>認識自己現在的興趣</b>、認識更多職業。結果<b>不是</b>告訴你以後一定要做什麼工作。興趣會隨著長大改變，每一種工作男生女生都可以做。</div>
</section>

<section class="scr" id="quiz" aria-live="polite">
 <div class="prog"><div class="track"><div class="fill" id="fill"></div><span class="boat" id="boat">⛵</span></div><span class="pn" id="pn"></span></div>
 <div class="qc" id="qc">
  <span class="qlv" id="lv"></span>
  <div class="qi" id="qi"></div>
  <div class="qz" id="qz"></div>
  <div class="qa">你喜歡做這件事嗎？</div>
  <div class="faces" id="faces">
${FACES.map(([f, t, v]) => `   <button class="fc" data-v="${v}" aria-label="${t}"><b>${f}</b><span>${t}</span></button>`).join('\n')}
  </div>
  <div class="rev" id="rev"><span class="ri" id="ri"></span><span class="rt"><span class="re" id="re"></span><span id="rz"></span></span><button class="say" id="say" aria-label="聽英文">🔊</button></div>
 </div>
 <div class="nav"><button class="ghost" id="back">◀ 上一題</button><button class="big" id="next" disabled>下一題 ▶</button></div>
</section>

<section class="scr" id="mid">
 <div class="badge" id="mb"></div>
 <div class="mt" id="mt"></div>
 <div class="ms" id="ms"></div>
 <div class="shelf" id="shelf">${[1, 2, 3, 4, 5].map(k => `<span>🏅</span>`).join('')}</div>
 <button class="big" id="cont">繼續探險 ▶</button>
</section>

<section class="scr" id="res">
 <div class="warn">⚠️ <b>僅供參考</b>：這是你<b>今天</b>的興趣，不是你以後一定要做的工作。研究發現，小學生的興趣還會一直改變；喜歡做的事也不等於能力，能力可以慢慢練出來。</div>
 <h2 class="rh">🗺️ 我的興趣地圖</h2>
 <p class="sub">每個人六種興趣都有，只是多少不一樣</p>
 <div class="map">
  <svg class="hex" id="hex" viewBox="0 0 400 400" role="img" aria-label="六種興趣的地圖"></svg>
  <div class="bars" id="bars"></div>
 </div>
 <div class="say1" id="top"></div>
 <p class="sub" id="topsub"></p>
 <div id="tops"></div>
 <h2 class="rh" style="margin-top:26px">🏝️ 其他小島也可以去看看</h2>
 <div id="others"></div>
 <details class="tg" style="background:#FFF3DA" id="extra">
  <summary>🌟 這些職業也可以認識 <small>（還沒有正式的興趣研究資料）</small></summary>
  <div class="jg">${EXTRA.map(card).join('')}</div>
 </details>
 <div class="think">
  <h3>💬 想一想、說一說</h3>
  1️⃣ 哪一題你最喜歡？為什麼？<br>
  2️⃣ 和老師、家人聊聊你的發現。<br>
  3️⃣ 點職業卡，去學這個職業的英文單字！
 </div>
 <div class="again"><button class="big" id="again">🔄 再玩一次</button><a class="ghost" style="display:inline-flex;align-items:center;text-decoration:none;color:var(--ink)" href="index.html">🏠 回首頁</a></div>
</section>

<details id="ev">
 <summary>📚 給老師看的證據（研究、課綱、每一題的出處）</summary>
 <h4>這是什麼</h4>
 <p>參考美國勞動部 <b>O*NET 興趣量表 30 題迷你版</b>的架構（何倫 Holland 六種興趣，每型 5 題、輪流出題），把題目改寫成四年級看得懂的句子。每一題都是網站上 36 個職業之一的真實工作內容（O*NET 逐字原文），而且那個職業的 O*NET 興趣分數前幾名一定有這一型。
 <b>改寫以後不是經過驗證的正式量表，是「探索活動」，僅供職涯發展參考。</b></p>
 <h4>怎麼計分、怎麼呈現</h4>
 <ul>
  <li>作答：5 個表情（O*NET 用表情符號作答的研究）。😍 5 分、🙂 4、😐 3、🙁 2、😖 1；每型 5 題，最少 5 分、最多 25 分。</li>
  <li>六型全部顯示（六角形＋長條），不只給一個答案；說法是「你<b>今天</b>最常按「喜歡」的是…」，不說「你是…型的人」。</li>
  <li>列出最高分的型（同分並列）；只有一型最高時，再加上第二高的型（第二高有 3 型以上同分就不加）。六型一樣高，或最高分不到 11 分（平均是「不喜歡」），會出現另外的鼓勵說法。</li>
  <li>職業清單寫「可以去認識」，不寫「適合你」；不問性別、不問名字、不存任何資料。</li>
  <li>結果頁每一型列出的職業：O*NET 興趣分數前 3 名有這一型（📋 事務型只列前 2 名）。</li>
 </ul>
 <h4>研究和課綱（每一句都用 <code>_quiz_check.py</code> 抓原文自動核對）</h4>
 <div class="tw"><table><thead><tr><th>說法</th><th>原文</th><th>出處</th></tr></thead><tbody>
${evClaims}
 </tbody></table></div>
 <h4>六種興趣：學生看的說法 ↔ O*NET 定義</h4>
 <div class="tw"><table><thead><tr><th>型</th><th>學生看的說法</th><th>O*NET 原文</th></tr></thead><tbody>
${evDefs}
 </tbody></table></div>
 <h4>30 題：題目 ↔ O*NET 工作內容原文</h4>
 <div class="tw"><table><thead><tr><th>#</th><th>型</th><th>題目</th><th>職業</th><th>O*NET 工作內容（原文）</th><th>這一型的興趣分數</th></tr></thead><tbody>
${evItems}
 </tbody></table></div>
 <h4>29 個職業的 O*NET 興趣分數（粗體＝前 3 名）</h4>
 <div class="tw"><table><thead><tr><th>職業</th><th>六型分數</th><th>O*NET</th></tr></thead><tbody>
${evJobs}
 </tbody></table></div>
 <h4>O*NET 查不到直接資料的職業</h4>
 <div class="tw"><table><thead><tr><th>職業</th><th>原因</th><th>網站怎麼處理</th></tr></thead><tbody>
${evNo}
 </tbody></table></div>
</details>
</main>
<div class="fx" id="fx"></div>
<script>
const TY=${JSON.stringify(TY)};
const ORDER='${ORDER}';
const ITEMS=${JSON.stringify(ITEMS)};
const JOBS=${JSON.stringify(JOBS)};
const WD=${JSON.stringify(Object.fromEntries(words.map(w => [w.e, [w.no, w.z, w.ic]])))};
const $=id=>document.getElementById(id);
let ans=[],cur=0;
function speak(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='en-US';u.rate=.85;speechSynthesis.speak(u)}catch(e){}}
function show(id){document.body.dataset.s=id;document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id===id));window.scrollTo(0,0)}
function confetti(){const fx=$('fx');fx.innerHTML='';const cs=['#FFC93C','#2F8FD8','#E8743B','#2FA35A','#B24FD0','#D4452E'];
 for(let k=0;k<40;k++){const i=document.createElement('i');i.style.left=Math.random()*100+'%';i.style.background=cs[k%6];i.style.animationDelay=Math.random()*.6+'s';fx.appendChild(i)}
 setTimeout(()=>fx.innerHTML='',2600)}
function render(){
 const it=ITEMS[cur],qc=$('qc');
 qc.classList.remove('in');void qc.offsetWidth;qc.classList.add('in');
 $('pn').textContent='第 '+(cur+1)+' / '+ITEMS.length+' 題';
 const p=cur/ITEMS.length*100;$('fill').style.width=p+'%';$('boat').style.left=Math.max(3,p)+'%';
 $('lv').textContent='第 '+(Math.floor(cur/6)+1)+' 關';
 $('qi').textContent=it.ic;$('qz').textContent=it.zh;
 document.querySelectorAll('.fc').forEach(b=>b.classList.toggle('sel',+b.dataset.v===ans[cur]));
 const w=WD[it.e];$('ri').textContent=w[2];$('re').textContent=it.e;$('rz').textContent=w[1]+'會做這件事';
 $('rev').classList.toggle('on',!!ans[cur]);$('next').disabled=!ans[cur];
 $('next').textContent=cur===ITEMS.length-1?'看結果 ▶':'下一題 ▶';
 $('back').disabled=cur===0;
}
function pick(v){
 const first=!ans[cur];ans[cur]=v;render();
 if(first)speak(ITEMS[cur].e);
}
function next(){
 if(!ans[cur])return;
 if(cur===ITEMS.length-1){result();return}
 cur++;
 if(cur%6===0){mid(cur/6);return}
 render();
}
function mid(k){
 const bs=['🏝️','🐚','🗺️','⭐','🏆'];
 $('mb').textContent=bs[k-1];$('mt').textContent='第 '+k+' 關完成！';
 $('ms').textContent='已經探險 '+k*6+' 題，還有 '+(ITEMS.length-k*6)+' 題';
 [...$('shelf').children].forEach((s,i)=>s.classList.toggle('got',i<k));
 show('mid');confetti();
}
function score(){const s={};for(const t of ORDER)s[t]=0;ITEMS.forEach((it,i)=>s[it.t]+=ans[i]||0);return s}
function tile(e){const w=WD[e];return '<a class="jt" href="story.html#w'+w[0]+'" data-e="'+e+'"><span class="ji">'+w[2]+'</span><span class="je">'+e+'</span><span class="jz">'+w[1]+'</span><span class="jgo">學這個字 ▶</span></a>'}
function group(t,open){const y=TY[t];
 const head='<h3>'+y.ic+' '+y.k+' <small>（'+y.f+'）</small></h3><p>'+y.d+'。<br>可以去認識這些職業：</p>';
 return open?'<section class="tg" style="background:'+y.bg+'" data-t="'+t+'">'+head+'<div class="jg">'+JOBS[t].map(tile).join('')+'</div></section>'
 :'<details class="tg" style="background:'+y.bg+'" data-t="'+t+'"><summary>'+y.ic+' '+y.k+' <small>（'+y.f+'）</small></summary><p>'+y.d+'。</p><div class="jg">'+JOBS[t].map(tile).join('')+'</div></details>'}
function hex(s){
 const c=200,R=150,pt=(k,r)=>[c+r*Math.sin(Math.PI/3*k),c-r*Math.cos(Math.PI/3*k)];
 let g='';
 for(const f of [1,.6,.2])g+='<polygon points="'+[0,1,2,3,4,5].map(k=>pt(k,R*f).join(',')).join(' ')+'" fill="'+(f===1?'#FBF7EF':'none')+'" stroke="#E6D9BF" stroke-width="2"/>';
 for(let k=0;k<6;k++){const [x,y]=pt(k,R);g+='<line x1="200" y1="200" x2="'+x+'" y2="'+y+'" stroke="#E6D9BF" stroke-width="2"/>'}
 const sh=[...ORDER].map((t,k)=>pt(k,R*Math.max(.08,(s[t]-5)/20)).join(',')).join(' ');
 g+='<polygon class="shape" points="'+sh+'" fill="rgba(47,143,216,.35)" stroke="#2F8FD8" stroke-width="4" stroke-linejoin="round"/>';
 [...ORDER].forEach((t,k)=>{const [x,y]=pt(k,R+30);g+='<text x="'+x+'" y="'+(y+12)+'" text-anchor="middle" font-size="34">'+TY[t].ic+'</text>'});
 $('hex').innerHTML=g;$('hex').classList.remove('go');
 setTimeout(()=>$('hex').classList.add('go'),80);
}
function result(){
 const s=score(),vals=ORDER.split('').map(t=>s[t]),max=Math.max(...vals);
 let top=ORDER.split('').filter(t=>s[t]===max);
 if(top.length===1){const sec=Math.max(...vals.filter(v=>v<max)),two=ORDER.split('').filter(t=>s[t]===sec);if(two.length<=2)top=top.concat(two)}
 const flat=vals.every(v=>v===max);
 if(flat)top=[];
 hex(s);
 $('bars').innerHTML=ORDER.split('').map(t=>'<div class="bar" data-t="'+t+'"><span>'+TY[t].ic+' '+TY[t].k+' <small>'+TY[t].f+'</small></span><span style="text-align:right">'+s[t]+' 分</span><div class="bt"><i style="background:'+TY[t].c+'" data-w="'+(s[t]/25*100)+'"></i></div></div>').join('');
 setTimeout(()=>document.querySelectorAll('.bt i').forEach(i=>i.style.width=i.dataset.w+'%'),80);
 const nm=top.map(t=>TY[t].ic+' '+TY[t].k).join('、');
 $('top').innerHTML=flat?'你六種興趣今天一樣多！':'你今天最常按「喜歡」的是：<br>'+nm;
 $('topsub').textContent=flat?'每一座小島都可以去看看，慢慢找出你最喜歡的。':max<=10?'今天好像都不太喜歡也沒關係，興趣會慢慢出現，多認識不同的工作就會發現。':'這些小島上的職業，可以先去認識看看（不是一定要做這些工作喔）。';
 $('tops').innerHTML=top.map(t=>group(t,true)).join('');
 $('others').innerHTML=ORDER.split('').filter(t=>!top.includes(t)).map(t=>group(t,false)).join('');
 show('res');confetti();
 document.querySelectorAll('#tops .jt').forEach((a,i)=>setTimeout(()=>a.classList.add('on'),400+i*90));
}
function start(){ans=[];cur=0;show('quiz');render()}
$('go').onclick=start;$('again').onclick=start;
document.querySelectorAll('.fc').forEach(b=>b.onclick=()=>pick(+b.dataset.v));
$('next').onclick=next;
$('back').onclick=()=>{if(cur>0){cur--;render()}};
$('cont').onclick=()=>{show('quiz');render()};
$('say').onclick=()=>speak(ITEMS[cur].e);
$('evgo').onclick=e=>{e.preventDefault();$('ev').open=true;$('ev').scrollIntoView()};
function evHash(){if(location.hash==='#ev'){$('ev').open=true;setTimeout(()=>$('ev').scrollIntoView(),50)}}
evHash();addEventListener('hashchange',evHash);
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'quiz.html'), html);
console.log('quiz.html 完成：' + ITEMS.length + ' 題、結果頁職業 ' + ORDER.split('').map(t => t + JOBS[t].length).join(' ') + '、也可以認識 ' + EXTRA.length + ' 個');
