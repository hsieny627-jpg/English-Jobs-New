// 產生職業興趣探險 quiz.html：python3 _quiz_check.py 核對原文之後，再跑 node _build_quiz.js
// 題目、職業興趣分數、研究出處都從 evidence/quiz.json 讀；單字（中文、圖示、第幾張卡、音節、母音、不發音）從 story.html 讀。
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const story = fs.readFileSync(path.join(dir, 'story.html'), 'utf8');
const Q = JSON.parse(fs.readFileSync(path.join(dir, 'evidence', 'quiz.json'), 'utf8'));
const AUD = JSON.parse(fs.readFileSync(path.join(dir, 'evidence', 'audit.json'), 'utf8'));

const font = story.match(/@font-face\{[^}]*\}/)[0];
const words = [...story.matchAll(/\{no:(\d+),e:'([^']+)',z:'([^']+)',ic:'([^']+)'/g)]
  .map(m => ({ no: +m[1], e: m[2], z: m[3], ic: m[4] }));
const W = Object.fromEntries(words.map(w => [w.e, w]));
const SYL = JSON.parse(story.match(/const SYL=(\{.*?\});/)[1]);
const VOW = JSON.parse(story.match(/const VOW=(\{.*?\});/)[1]);
const SILENT = JSON.parse(story.match(/const SILENT=(\{.*?\});/)[1]);
const bad = Q.items.filter(i => !i.ok).length + Q.claims.filter(c => !c.ok).length + Object.values(Q.jobs).filter(j => !j.ok).length
  + Q.no_data.filter(x => !x.ok).length + (Q.titles_db.ok ? 0 : 1) + AUD.letters.filter(l => !(l.ok && l.site_ok)).length;
if (bad || !Q.balanced || Q.items.length !== 30) throw new Error('evidence/quiz.json 或 audit.json 有沒通過的項目，先跑 python3 _quiz_check.py、python3 _audit.py');
for (const i of Q.items) if (!W[i.e]) throw new Error('題目的職業不在單字卡裡：' + i.e);

// 六型：大考中心正式名稱＋英文原文＋一句說明（2026/10/9 使用者同意）；顏色全頁固定
const TY = {
  R: { ic: '🔧', f: '實用型', en: 'Realistic', d: '喜歡動手做、修東西', act: '動手做、修東西', c: '#D9692B', bg: '#FCEEE4' },
  I: { ic: '🔬', f: '研究型', en: 'Investigative', d: '喜歡觀察、研究', act: '觀察、研究', c: '#2C6FC9', bg: '#E6EFFA' },
  A: { ic: '🎨', f: '藝術型', en: 'Artistic', d: '喜歡創作、表演', act: '創作、表演', c: '#9A4FC4', bg: '#F3E9F9' },
  S: { ic: '🤝', f: '社會型', en: 'Social', d: '喜歡幫助、教別人', act: '幫助、教別人', c: '#2E9358', bg: '#E5F4EA' },
  E: { ic: '📣', f: '企業型', en: 'Enterprising', d: '喜歡帶領、說服別人', act: '帶領、說服別人', c: '#CF3F55', bg: '#FBE8EB' },
  C: { ic: '📋', f: '事務型', en: 'Conventional', d: '喜歡照步驟整理資料', act: '照步驟整理資料', c: '#14868A', bg: '#E1F3F3' },
};
const ORDER = 'RIASEC';
const SC = Object.fromEntries(words.filter(w => Q.jobs[w.e]).map(w => { const j = Q.jobs[w.e];
  return [w.e, { s: j.scores, top3: j.top3, url: j.url, code: j.code, note: j.note || '' }]; }));
// 第 6 題的說明（給學生和老師）
const NOTE6 = '第 6 題要考「事務型」（喜歡照步驟、把事情整理好）。美國勞動部的資料：程式設計師的六種分數裡，事務型 ' + Q.jobs.programmer.scores.C + ' 分最高，所以用程式設計師的工作出題。';
const FUN = { programmer: NOTE6 };
// 結果頁每一型列哪些職業：O*NET 興趣分數前 3 名有這一型；📋 事務型只列前 2 名
const JOBS = {};
for (const t of ORDER) {
  const max = t === 'C' ? 2 : 3;
  JOBS[t] = words.filter(w => SC[w.e] && SC[w.e].top3.slice(0, max).includes(t))
    .sort((a, b) => SC[a.e].top3.indexOf(t) - SC[b.e].top3.indexOf(t) || SC[b.e].s[t] - SC[a.e].s[t])
    .map(w => w.e);
}
// 職業圖鑑：每個職業放在它分數最高的那一欄（同分兩欄都放）
const DEX = {};
for (const t of ORDER) DEX[t] = [];
for (const w of words) if (SC[w.e]) { const s = SC[w.e].s, mx = Math.max(...Object.values(s));
  for (const t of ORDER) if (s[t] === mx) DEX[t].push(w.e); }
for (const t of ORDER) DEX[t].sort((a, b) => SC[b].s[t] - SC[a].s[t]);
const TIE = Object.fromEntries(Object.keys(SC).map(e => { const s = SC[e].s, mx = Math.max(...Object.values(s)); return [e, ORDER.split('').filter(t => s[t] === mx).length > 1]; }));
const EXTRA = Q.no_data.filter(x => x.show).map(x => x.e);
const ITEMS = Q.items.map(i => ({ t: i.t, ic: i.ic, zh: i.zh, e: i.e }));
const QJOBS = [...new Set(ITEMS.map(i => i.e))];
const FACES = [['😍', '好喜歡', 5], ['🙂', '喜歡', 4], ['😐', '不確定', 3], ['🙁', '不喜歡', 2], ['😖', '很不喜歡', 1]];
const RATED = Math.floor(Q.titles_db.rated / 100) * 100;
const claim = k => Q.claims.find(c => c.name.startsWith(k));
const doi = { 'Tracey & Ward 1998': 'https://doi.org/10.1037/0022-0167.45.3.290', 'Tracey 2002': 'https://doi.org/10.1037/0022-0167.49.2.148' };

const HOW = '<div class="how"><b>🤔 分數怎麼來的？</b><ol><li>研究「興趣」的大學教授和受過訓練的專家，先替 269 種工作打分數。</li><li>電腦讀每個工作的說明和「每天要做的事」，跟著專家的分數學打分數。</li><li>電腦學會以後，替 ' + Q.titles_db.rated + ' 種工作都打好分數。</li></ol><a href="https://www.onetcenter.org/reports/ML_OIPs.html" target="_blank" rel="noopener">出處：O*NET 研究報告 ↗</a></div>';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// 母音紅、不發音灰（資料：story.html 的 VOW、SILENT，已對 Cambridge 美式音標）
const colorWord = e => [...e].map((c, i) => c === ' ' ? '<span class="sp"> </span>'
  : (SILENT[e] || []).includes(i) ? `<span class="lg">${esc(c)}</span>` : (VOW[e] || []).includes(i) ? `<span class="lv">${esc(c)}</span>` : esc(c)).join('');
const typeChip = t => `<span class="chip" style="--c:${TY[t].c};--b:${TY[t].bg}">${TY[t].ic} ${TY[t].f}</span>`;
const dexCard = (e, t) => { const w = W[e];
  return `<div class="dc" data-e="${esc(e)}" role="button" tabindex="0" aria-label="${esc(e)} ${esc(w.z)}：看興趣成分">${TIE[e] ? '<span class="tie">同分</span>' : ''}<span class="got" aria-hidden="true">🔓</span>
<span class="dci">${w.ic}</span><span class="dce">${colorWord(e)}</span><span class="dcz">${esc(w.z)}</span>
<span class="dcb"><button class="b48 say1" data-e="${esc(e)}" aria-label="聽 ${esc(e)}">🔊</button><button class="b48 sylb" data-e="${esc(e)}">音節</button></span></div>`; };

const evItems = Q.items.map(i => `<tr><td>${i.n}</td><td>${TY[i.t].ic} ${TY[i.t].f}</td><td>${i.ic} ${esc(i.zh)}</td><td><b>${esc(i.e)}</b></td>
<td>${i.q.map(q => '“' + esc(q) + '”').join('<br>')}</td><td>${TY[i.t].f} ${i.score}（第 ${i.rank} 高）<br><a href="${i.url}" target="_blank" rel="noopener">O*NET ${i.code}</a></td></tr>`).join('\n');
const evJobs = words.filter(w => SC[w.e]).map(w => { const j = SC[w.e];
  return `<tr><td>${w.ic} <b>${esc(w.e)}</b> ${esc(w.z)}</td><td>${ORDER.split('').map(t => (j.top3.includes(t) ? '<b>' : '') + TY[t].f + ' ' + j.s[t] + (j.top3.includes(t) ? '</b>' : '')).join('、')}${j.note ? '<br><small>' + esc(j.note) + '</small>' : ''}</td><td><a href="${j.url}" target="_blank" rel="noopener">${esc(j.code)}</a></td></tr>`; }).join('\n');
const evEng = Q.engineers.map(e => `<tr><td>${esc(e.title)}</td><td>${e.top3.map(t => TY[t].f + ' ' + e.scores[t]).join('、')}</td><td><a href="${e.url}" target="_blank" rel="noopener">${e.code}</a></td></tr>`).join('\n');
const evNo = Q.no_data.map(x => `<tr><td>${W[x.e].ic} <b>${esc(x.e)}</b> ${esc(W[x.e].z)}</td><td>${esc(x.why)}<br><small>資料庫裡的職稱：${x.listed.length ? x.listed.map(l => esc(l[1]) + '（' + l[0] + '）').join('、') : '沒有'}</small></td><td>${x.show ? '結果頁列在「這些職業也可以認識」' : '結果頁不列；單字卡照舊'}</td></tr>`).join('\n');
const evClass = ['esports player', 'entertainer', 'engineer'].map(e => { const j = Q.jobs[e];
  return `<tr><td>${W[e].ic} <b>${e}</b> ${esc(W[e].z)}</td><td>${j.titles ? j.titles.map(t => '“' + esc(t[1]) + '” 列在 ' + t[0]).join('<br>') + '<br>' : ''}${esc(j.note)}</td><td>${j.top3.map(t => TY[t].f + ' ' + j.scores[t]).join('、')}</td></tr>`; }).join('\n');
const evClaims = Q.claims.filter(c => c.page).map(c => `<tr><td>${esc(c.name)}</td><td>${c.quotes.map(q => '“' + esc(q) + '”').join('<br>')}</td><td><a href="${c.url.replace(/^https:\/\/api\.openalex\.org\/works\/doi:/, 'https://doi.org/')}" target="_blank" rel="noopener">原文</a></td></tr>`).join('\n');
const evDefs = ORDER.split('').map(t => `<tr><td>${TY[t].ic} ${TY[t].f} ${TY[t].en}</td><td>${TY[t].d}</td><td>“${esc(Q.defs[t])}”</td></tr>`).join('\n');

const ipC = claim('改編自'), holC = claim('何倫'), trC = claim('Tracey &'), tr2C = claim('Tracey 2002');
const teacher = SC.teacher.s, tMax = Math.max(...Object.values(teacher));

const html = `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>職業興趣探險</title>
<style>
${font}
:root{--navy:#1B2B4B;--navy2:#2E4470;--soft:#5B6782;--line:#DFE4EE;--tint:#F4F6FA;--gold:#D9A520;--gold2:#F7E9BE;--goldt:#8A6408;--vow:#D7362F;--sil:#8C93A3;
--r:20px;--sh:0 1px 2px rgba(27,43,75,.06),0 8px 24px rgba(27,43,75,.07);
--t1:clamp(30px,calc(18px + 2.2vw),52px);--t2:clamp(20px,calc(14px + 1.1vw),28px);--t3:clamp(16px,calc(12px + .6vw),20px);--big:clamp(24px,calc(15px + 1.6vw),38px)}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:#fff;color:var(--navy);font-family:"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;font-size:var(--t2);line-height:1.5;-webkit-text-size-adjust:100%;overflow-x:hidden}
.en,.dce,.rve,.syst,.copt b{font-family:'AndikaEmbed',"PingFang TC","Noto Sans TC",sans-serif}
button{font-family:inherit;color:inherit;font-size:inherit}
a{color:var(--navy2)}
.app{max-width:1600px;margin:0 auto;padding:8px 16px 48px}
.lv{color:var(--vow)}.lg{color:var(--sil);background:#ECEEF2;border-radius:6px;padding:0 2px}.sp{display:inline-block;width:.32em}
/* 上方 */
.top{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:64px}
.homeln,.evln{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 16px;border-radius:14px;border:1px solid var(--line);background:#fff;color:var(--navy);font-size:var(--t3);font-weight:700;text-decoration:none;box-shadow:var(--sh)}
.dexc{display:none;align-items:center;gap:8px;min-height:48px;padding:0 16px;border-radius:14px;background:var(--navy);color:#fff;font-size:var(--t3);font-weight:700}
.dexc b{color:var(--gold);font-size:1.2em}
.dexc.bump{animation:bump .5s;transform-origin:right center}
@keyframes bump{40%{transform:scale(1.18)}}
body[data-s=quiz] .dexc,body[data-s=mid] .dexc,body[data-s=chal] .dexc,body[data-s=refl] .dexc{display:inline-flex}
body[data-s=quiz] .evln,body[data-s=mid] .evln,body[data-s=chal] .evln,body[data-s=refl] .evln,body[data-s=mission] .evln{display:none}
body:not([data-s=start]):not([data-s=res]) #ev{display:none}
/* 共用 */
.scr{display:none}.scr.on{display:block;animation:fadein .4s ease}
@keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.card{background:#fff;border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh)}
.sec{margin:48px 0 0}
.sec>h2,.h2{font-size:var(--t1);line-height:1.25;margin:0 0 8px;text-align:center}
.sec>.one,.one{font-size:var(--t2);color:var(--soft);text-align:center;margin:0 0 24px}
.cap{font-size:var(--t3);color:var(--soft)}
.go{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:72px;padding:8px 40px;border-radius:18px;border:0;background:var(--navy);color:#fff;font-size:var(--big);font-weight:700;cursor:pointer;box-shadow:0 4px 0 #0E1A31,var(--sh);-webkit-tap-highlight-color:transparent;text-decoration:none}
.go:active{transform:translateY(3px);box-shadow:0 1px 0 #0E1A31}
.go:disabled{background:#B7BFCF;box-shadow:none;cursor:default}
.go.gold{background:var(--gold);color:var(--navy);box-shadow:0 4px 0 #A57A10,var(--sh)}
.ghost{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:64px;padding:8px 24px;border-radius:18px;border:2px solid var(--navy);background:#fff;color:var(--navy);font-size:var(--t2);font-weight:700;cursor:pointer;text-decoration:none}
.ghost:disabled{opacity:.3;cursor:default}
.b48{min-width:48px;min-height:48px;padding:0 12px;border-radius:14px;border:1px solid var(--line);background:#fff;font-size:var(--t3);font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent}
.b48:active{transform:scale(.95)}
.chip{display:inline-flex;align-items:center;gap:4px;padding:2px 12px;border-radius:999px;background:var(--b);color:var(--c);font-weight:700;font-size:var(--t3);white-space:nowrap}
/* 開場 */
.hero{text-align:center;padding:24px 0 0}
.hero h1{font-size:clamp(36px,calc(20px + 3vw),64px);margin:0;line-height:1.2;letter-spacing:.02em}
.hero .kick{display:inline-block;font-size:var(--t3);font-weight:700;color:var(--goldt);background:var(--gold2);border-radius:999px;padding:4px 16px;margin-bottom:16px}
.hero p{font-size:var(--t2);color:var(--soft);margin:16px auto 0;max-width:820px}
.compass0{width:clamp(96px,14vw,150px);height:auto;display:block;margin:24px auto 0}
.compass0 .ndl{transform-origin:60px 60px;animation:swing 4s ease-in-out infinite}
@keyframes swing{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(14deg)}}
.g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.rc{padding:24px;display:flex;flex-direction:column;gap:8px}
.rc .ri{font-size:44px;line-height:1}
.rc h3{margin:0;font-size:var(--t2);line-height:1.4}
.rc q{display:block;quotes:none;font-family:Georgia,serif;font-style:italic;color:var(--soft);font-size:var(--t3)}
.rc a{display:inline-flex;align-items:center;min-height:48px;font-size:var(--t3);font-weight:700;margin-top:auto}
.why{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;counter-reset:w}
.why div{padding:24px;text-align:center}
.why b{display:block;font-size:48px;line-height:1.1;margin-bottom:8px}
.why div{font-size:var(--big);font-weight:700}
.nowx{font-style:normal;color:var(--goldt);background:linear-gradient(transparent 60%,var(--gold2) 60%)}
.g6{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}
.tc{padding:24px 8px;text-align:center;border-top:6px solid var(--c);display:flex;flex-direction:column;align-items:center;gap:4px}
.tc .ti{font-size:48px;line-height:1.1}
.tc .tf{font-size:var(--t2);font-weight:700;color:var(--c)}
.tc .te{font-family:'AndikaEmbed',sans-serif;font-size:var(--t3);color:var(--soft)}
.tc .td{font-size:var(--t3);line-height:1.45}
.three{max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.three div{display:flex;gap:16px;align-items:flex-start;padding:24px;font-size:var(--big);font-weight:700;line-height:1.45}
.three span{flex:none;font-size:1.2em;line-height:1.2}
.three em{font-style:normal;color:var(--goldt);background:linear-gradient(transparent 60%,var(--gold2) 60%)}
.startbar{text-align:center;margin:32px 0 0}
.note{max-width:980px;margin:24px auto 0;padding:16px 24px;border-radius:16px;background:var(--tint);font-size:var(--t3);color:var(--soft);text-align:left}
.note b{color:var(--navy)}
/* 地圖 */
.map{position:relative;max-width:1000px;margin:0 auto;padding:16px;background:linear-gradient(#FBF6E8,#F6EED6);border:1px solid #E9DDB8;border-radius:var(--r);box-shadow:var(--sh)}
.map svg{display:block;width:100%;height:auto}
.map.unfold{animation:unfold 1s cubic-bezier(.2,1,.3,1) both}
@keyframes unfold{from{transform:perspective(900px) rotateX(70deg) scaleY(.2);opacity:0}to{transform:none;opacity:1}}
.route{fill:none;stroke:var(--navy2);stroke-width:6;stroke-dasharray:14 12;stroke-linecap:round}
.st circle{fill:#fff;stroke:var(--navy);stroke-width:5}
.st text{font-size:30px;font-weight:700;fill:var(--navy);text-anchor:middle;font-family:"PingFang TC","Noto Sans TC",sans-serif}
.st.lit circle{fill:var(--gold);stroke:#A57A10}
.st.pop{animation:spop .5s cubic-bezier(.3,1.7,.5,1) both}
@keyframes spop{from{transform:scale(0)}}
.st{transform-box:fill-box;transform-origin:center}
.mis{text-align:center}
.mis .cmp{width:clamp(72px,11vh,140px);display:block;margin:8px auto}
.mis .map{max-width:min(1000px,100vh);padding:8px 16px}
.mis .brief p{margin:0}
.mis .h2{font-size:var(--t2);font-weight:700;margin:0 0 8px}
.mis .cmp .ndl{transform-origin:60px 60px;animation:locate 1.6s cubic-bezier(.2,.9,.3,1) both}
@keyframes locate{0%{transform:rotate(0)}80%{transform:rotate(1060deg)}100%{transform:rotate(1080deg)}}
.mis .brief{max-width:1000px;margin:16px auto 0;padding:16px 24px;text-align:left;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 24px;font-size:var(--t3)}
@media (max-width:720px){.mis .brief{grid-template-columns:minmax(0,1fr)}}
.mis .startbar{margin-top:16px}
.mis .brief div{display:flex;gap:12px;align-items:flex-start}
.mis .brief span{flex:none;font-size:1.3em;line-height:1.2}
.hide0{opacity:0}
.show1{animation:fadein .5s ease both}
/* 題目 */
.strip{display:flex;align-items:center;gap:8px;margin:0 0 16px}
.rail{position:relative;flex:1;height:48px}
.rail::before{content:'';position:absolute;left:12px;right:12px;top:50%;border-top:4px dashed #B9C2D3}
.rail .fill{position:absolute;left:12px;top:50%;height:4px;margin-top:-2px;background:var(--gold);border-radius:2px;transition:width .5s}
.rail .sn{position:absolute;top:50%;width:32px;height:32px;margin:-16px 0 0 -16px;border-radius:50%;background:#fff;border:3px solid var(--navy);font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center}
.rail .sn.lit{background:var(--gold);border-color:#A57A10}
.rail .ship{position:absolute;top:50%;font-size:32px;line-height:1;transform:translate(-50%,-78%);transition:left .5s cubic-bezier(.3,1.3,.5,1)}
.rail .goal{position:absolute;right:-8px;top:50%;transform:translateY(-50%);font-size:28px}
.pn{font-size:var(--t3);font-weight:700;white-space:nowrap;color:var(--soft)}
.qwrap{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
.qc{padding:clamp(12px,2.2vh,32px) clamp(12px,2.4vw,32px);text-align:center}
.qc.in{animation:slidein .45s cubic-bezier(.2,1.2,.4,1)}
@keyframes slidein{from{opacity:0;transform:translateX(48px)}to{opacity:1;transform:none}}
.qlv{display:inline-block;font-size:var(--t3);font-weight:700;color:var(--goldt);background:var(--gold2);border-radius:999px;padding:2px 16px}
.qi{font-size:clamp(52px,min(10vw,10vh),112px);line-height:1.15;margin:8px 0 0}
.qz{font-size:clamp(23px,min(3.6vw,4.6vh),46px);font-weight:700;line-height:1.35;min-height:2.7em;display:flex;align-items:center;justify-content:center}
.qa{font-size:var(--t3);color:var(--soft);margin:0 0 8px}
.faces{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:clamp(4px,1vw,16px)}
.fc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:clamp(80px,min(12vw,15vh),160px);border-radius:18px;border:2px solid var(--line);background:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .12s,border-color .12s,background .12s;padding:4px 2px}
.fc b{font-size:clamp(34px,min(5.6vw,6.4vh),68px);line-height:1.1}
.fc span{font-size:var(--t3);font-weight:700;white-space:nowrap}
.fc:active{transform:scale(.94)}
.fc.sel{border-color:var(--gold);background:#FFF8E3;box-shadow:0 0 0 3px var(--gold2);animation:pop .35s}
@keyframes pop{40%{transform:scale(1.1)}}
.flip{perspective:1400px;min-height:clamp(120px,17vh,190px)}
.flip .in{position:relative;width:100%;height:100%;min-height:inherit;transition:transform .7s cubic-bezier(.3,1.25,.5,1);transform-style:preserve-3d}
.flip.on .in{transform:rotateY(180deg)}
.flip.now .in{transition:none}
.face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:var(--r);display:flex;align-items:center;justify-content:center;gap:16px;padding:12px 16px}
.front{background:repeating-linear-gradient(45deg,var(--navy) 0 18px,var(--navy2) 18px 36px);color:#fff;flex-direction:column;gap:4px;border:3px solid var(--gold)}
.front b{font-size:clamp(36px,6vh,60px);line-height:1}
.front span{font-size:var(--t3);font-weight:700}
.back{transform:rotateY(180deg);background:#fff;border:3px solid var(--gold);box-shadow:var(--sh)}
.rvi{font-size:clamp(44px,8vh,84px);line-height:1}
.rvt{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}
.rve{font-size:clamp(30px,min(4.4vw,6vh),56px);font-weight:700;line-height:1.1;letter-spacing:.02em}
.rvz{font-size:var(--t3);color:var(--soft)}
.rvs{min-height:48px;padding:0 16px;border-radius:14px;border:2px solid var(--navy);background:#fff;font-size:var(--t3);font-weight:700;cursor:pointer}
.nav{display:flex;justify-content:space-between;gap:16px;margin-top:16px}
#back{border-width:3px}
#next{min-width:min(50%,360px)}
.fly{position:fixed;z-index:30;pointer-events:none;font-size:56px;line-height:1}
@media (min-width:900px) and (min-aspect-ratio:1/1){
 .qwrap{grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)}
 .flip{min-height:0}
 .face{flex-direction:column;gap:8px;text-align:center}
 .rvt{align-items:center}
}
/* 關卡、挑戰、反思 */
.cen{text-align:center}
.medal{font-size:clamp(88px,14vw,150px);line-height:1.1;animation:tpop .8s cubic-bezier(.3,1.7,.5,1)}
@keyframes tpop{0%{transform:scale(.2) rotate(-30deg)}100%{transform:none}}
.mt{font-size:var(--t1);font-weight:700;margin:8px 0}
.ms{font-size:var(--t2);color:var(--soft);margin:0 0 24px}
.cq{font-size:var(--t1);font-weight:700;margin:8px 0}
.chn{font-size:var(--t3);color:var(--soft)}
.bigsay{min-width:120px;min-height:120px;border-radius:50%;border:0;background:var(--navy);color:#fff;font-size:56px;cursor:pointer;box-shadow:0 0 0 8px var(--gold2);margin:16px 0}
.bigsay.ring{animation:ring 1s ease}
@keyframes ring{30%{box-shadow:0 0 0 20px var(--gold2)}}
.copts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;max-width:900px;margin:0 auto}
.copt{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:clamp(120px,18vh,170px);border-radius:var(--r);border:2px solid var(--line);background:#fff;box-shadow:var(--sh);cursor:pointer;padding:8px;-webkit-tap-highlight-color:transparent}
.copt i{font-style:normal;font-size:clamp(44px,7vh,68px);line-height:1.1}
.copt span{font-size:var(--t3);font-weight:700}
.copt.ok{border-color:#2E9358;background:#E9F7EE;animation:pop .4s}
.copt.no{border-color:#CF3F55;background:#FBE8EB;animation:shake .4s}
.copt.ans{border-color:#2E9358;box-shadow:0 0 0 4px #BFE6CC}
.copt[disabled]{cursor:default}
@keyframes shake{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
.cfb{min-height:56px;font-size:var(--t2);font-weight:700;margin:16px 0 0}
.cfb .w{display:block;font-family:'AndikaEmbed',sans-serif;font-size:var(--big)}
.cnote{font-size:var(--t3);color:var(--soft);margin:16px 0 0}
.rlist{max-width:900px;margin:0 auto 24px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;text-align:left}
.rlist div{padding:12px 16px;display:flex;gap:12px;align-items:center;font-size:var(--t3)}
.rlist span{font-size:36px;line-height:1}
.think{max-width:900px;margin:0 auto 24px;padding:24px;font-size:var(--big);font-weight:700;border:2px dashed var(--gold);background:#FFFBEF}
.think small{display:block;font-size:var(--t3);font-weight:400;color:var(--soft)}
.fx{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:40}
.fx i{position:absolute;top:-30px;width:12px;height:18px;border-radius:3px;animation:fall 1.8s ease-in forwards}
@keyframes fall{to{transform:translateY(110vh) rotate(540deg)}}
#mid .map{max-width:min(1000px,88vh)}
.strip{padding-left:12px}
@media (max-height:860px){
 .medal{font-size:clamp(64px,11vh,110px)}
 .mt{margin:0}.ms{margin:0 0 12px}
 #mid .map{max-width:min(1000px,72vh);padding:8px}
 #mid .startbar,#refl .startbar{margin-top:16px}
 .bigsay{min-width:88px;min-height:88px;font-size:40px;margin:8px 0}
 .cq{font-size:var(--t2);margin:4px 0}
 .copt{min-height:clamp(96px,14vh,140px)}
 .copt i{font-size:clamp(40px,6vh,60px)}
 .cfb{margin-top:8px}
 .rlist div{padding:8px 16px}
 .think{padding:16px 24px;margin-bottom:16px}
}
#chal-s{overflow:hidden}
/* 結果 */
.warn{max-width:1100px;margin:8px auto 0;padding:16px 24px;border-radius:16px;background:var(--gold2);border:1px solid #E8D18A;font-size:var(--t2)}
.warn b{color:var(--goldt)}
.cbox{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:center;padding:24px}
.cmpr{width:100%;max-width:480px;margin:0 auto;display:block}
.cmpr .ndl{transform-origin:200px 200px;transition:transform 2.4s cubic-bezier(.15,.9,.25,1)}
.cmpr .shape{transform-origin:200px 200px;transform:scale(0);transition:transform 1.2s cubic-bezier(.2,1.3,.4,1)}
.cmpr.grow .shape{transform:scale(1)}
.cmpr .ti{transition:transform .4s}
.cmpr .glow{opacity:0;transition:opacity .6s}
.cmpr.grow .glow{opacity:1}
.tag{text-align:center;font-size:var(--t2);font-weight:700;color:var(--goldt);margin:16px 0 0}
.bars{display:flex;flex-direction:column;gap:12px}
.bar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 8px;align-items:center;font-size:var(--t2);font-weight:700}
.bar small{font-family:'AndikaEmbed',sans-serif;font-size:var(--t3);color:var(--soft);font-weight:400}
.bt{height:20px;border-radius:10px;background:var(--tint);overflow:hidden;grid-column:1/-1}
.bt i{display:block;height:100%;width:0;border-radius:10px;transition:width 1.2s ease}
.say1x{text-align:center;font-size:var(--t1);font-weight:700;line-height:1.4;margin:32px 0 8px}
.sub{text-align:center;font-size:var(--t2);color:var(--soft);margin:0 0 16px}
.tg{border-radius:var(--r);padding:24px;margin-top:16px;background:var(--b);border:1px solid var(--line)}
.tg h3{margin:0 0 4px;font-size:var(--t1);color:var(--c)}
.tg h3 small{font-family:'AndikaEmbed',sans-serif;font-size:var(--t3);color:var(--soft);font-weight:400}
.tg p{margin:0 0 16px}
.jg{display:grid;grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:12px}
.jt{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:148px;padding:12px 8px;border-radius:16px;background:#fff;border:1px solid var(--line);box-shadow:var(--sh);text-align:center;cursor:pointer;opacity:0;transform:scale(.7);transition:transform .35s cubic-bezier(.3,1.6,.5,1),opacity .35s}
.jt.on,details[open] .jt{opacity:1;transform:none}
.jt .ji{font-size:44px;line-height:1.15}.jt .je{font-size:var(--t2);font-weight:700;line-height:1.2}.jt .jz{font-size:var(--t3);color:var(--soft)}
details.tg summary{cursor:pointer;list-style:none;min-height:56px;display:flex;align-items:center;gap:8px;font-size:var(--t2);font-weight:700;color:var(--c)}
details.tg summary::-webkit-details-marker{display:none}
details.tg summary::after{content:'▼';font-size:16px;margin-left:auto;color:var(--soft)}
details.tg[open] summary::after{content:'▲'}
details.tg summary small{font-family:'AndikaEmbed',sans-serif;font-size:var(--t3);font-weight:400;color:var(--soft)}
.again{display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin:48px 0 8px}
/* 職業圖鑑 */
.demo{display:grid;grid-template-columns:minmax(0,1.3fr) auto minmax(0,1fr);gap:16px;align-items:center;padding:24px;margin:0 0 24px}
.demo .dh{grid-column:1/-1;margin:0;font-size:var(--t2);font-weight:700}
.dbar{display:grid;grid-template-columns:7.5em minmax(0,1fr) 3em;gap:8px;align-items:center;font-size:var(--t3);margin:4px 0}
.dbar i{display:block;height:16px;border-radius:8px;background:var(--c);width:0;transition:width 1s ease}
.demo.go .dbar i{width:calc(var(--w) * 1%)}
.dbar.max{font-weight:700}
.demo.go .dbar.max i{box-shadow:0 0 0 3px var(--gold2);animation:glow 1s 1.1s 2}
@keyframes glow{50%{box-shadow:0 0 0 6px var(--gold)}}
.darr{font-size:40px;color:var(--gold)}
.dcol{border-radius:16px;border:2px solid var(--c);background:var(--b);padding:12px;text-align:center;min-height:150px;position:relative}
.dcol b{display:block;color:var(--c)}
.dchip{display:inline-flex;align-items:center;gap:4px;margin-top:8px;padding:4px 12px;border-radius:12px;background:#fff;border:1px solid var(--line);font-family:'AndikaEmbed',sans-serif;font-weight:700;opacity:0}
.demo.go .dchip{animation:flyin 1s 1.8s cubic-bezier(.3,1.3,.5,1) both}
@keyframes flyin{from{opacity:0;transform:translateX(-160px) scale(.6)}to{opacity:1;transform:none}}
.demo .rp{grid-column:1/-1;justify-self:start}
.dex{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;align-items:start}
.dcolh{position:relative;border-radius:16px 16px 0 0;background:var(--c);color:#fff;text-align:center;padding:12px 4px}
.dcolh b{display:block;font-size:var(--t2)}
.dcolh small{font-family:'AndikaEmbed',sans-serif;font-size:var(--t3);opacity:.9}
.dcolb{display:flex;flex-direction:column;gap:12px;padding:12px 0 0}
.dc{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:16px;background:#fff;border:1px solid var(--line);border-top:4px solid var(--c);box-shadow:var(--sh);text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
.dc:active{transform:scale(.97)}
.dci{font-size:44px;line-height:1.1}
.dce{font-size:clamp(18px,calc(12px + .55vw),24px);font-weight:700;line-height:1.2}
.dcz{font-size:var(--t3);color:var(--soft)}
.dcb{display:flex;gap:8px;justify-content:center;margin-top:4px}
.tie{position:absolute;left:8px;top:8px;font-size:16px;font-weight:700;color:var(--goldt);background:var(--gold2);border-radius:8px;padding:0 8px}
.got{position:absolute;right:8px;top:8px;font-size:16px;display:none}
.dc.un .got{display:block}
.how{margin:24px 0 0;padding:24px;border-radius:var(--r);background:var(--tint);font-size:var(--t2)}
.how ol{margin:8px 0;padding-left:1.6em}.how li{margin:4px 0}
.how a{display:inline-flex;align-items:center;min-height:48px;font-size:var(--t3);font-weight:700}
.dexn{text-align:center;font-size:var(--t3);color:var(--soft);margin:16px 0 0}
/* 興趣成分＋音節（打開職業卡） */
#sheet{position:fixed;inset:0;z-index:50;display:none;background:rgba(27,43,75,.55);padding:16px;overflow-y:auto;-webkit-overflow-scrolling:touch}
#sheet.on{display:block;animation:fadein .25s}
.panel{position:relative;max-width:900px;margin:16px auto;background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 64px rgba(0,0,0,.25)}
.x{position:absolute;right:12px;top:12px;width:56px;height:56px;border-radius:50%;border:1px solid var(--line);background:#fff;font-size:24px;cursor:pointer}
.ph{display:flex;align-items:center;gap:16px;padding-right:56px;flex-wrap:wrap}
.ph .pi{font-size:72px;line-height:1}
.ph .pe{font-family:'AndikaEmbed',sans-serif;font-size:var(--t1);font-weight:700;line-height:1.1}
.ph .pz{font-size:var(--t2);color:var(--soft)}
.hows{margin:0 0 16px}.hows summary{cursor:pointer;min-height:48px;display:flex;align-items:center;font-size:var(--t3);font-weight:700}.hows .how{margin:0;padding:16px;font-size:var(--t3)}
.pexp{margin:16px 0;padding:16px;border-radius:16px;background:var(--tint);font-size:var(--t3)}
.pbars{display:flex;flex-direction:column;gap:8px}
.pb{display:grid;grid-template-columns:2.2em 8.2em minmax(0,1fr) 3.2em;gap:8px;align-items:center;font-size:var(--t2);opacity:0;transform:translateX(-12px);transition:opacity .3s,transform .3s}
.pb.on{opacity:1;transform:none}
.pb .md{font-size:1.2em;text-align:center}
.pb .pn2{font-weight:700;color:var(--c);white-space:nowrap}
.pb .pt{height:22px;border-radius:11px;background:var(--tint);overflow:hidden}
.pb .pt i{display:block;height:100%;width:0;background:var(--c);border-radius:11px;transition:width .9s cubic-bezier(.3,1,.4,1)}
.pb .pv{text-align:right;font-weight:700}
.psay{margin:16px 0 0;font-size:var(--t2);font-weight:700;line-height:1.5}
.pnote{margin:8px 0 0;font-size:var(--t3);color:var(--soft)}
.pnote a{display:inline-flex;align-items:center;min-height:48px}
.pfun{margin:16px 0 0;padding:16px;border-radius:16px;border:1px dashed var(--gold);background:#FFFBEF;font-size:var(--t3)}
.syls{margin:24px 0 0;padding:24px 0 0;border-top:1px solid var(--line)}
.syls h3{margin:0 0 16px;font-size:var(--t2)}
.sbtn{display:flex;gap:12px;flex-wrap:wrap}
.sbtn button{min-height:56px;padding:0 20px;border-radius:16px;border:2px solid var(--navy);background:#fff;font-size:var(--t3);font-weight:700;cursor:pointer}
.sbtn button.on{background:var(--navy);color:#fff}
.syst{position:relative;margin:16px 0 0;min-height:clamp(150px,22vh,220px);border-radius:16px;background:var(--tint);display:flex;align-items:center;justify-content:center;overflow:hidden;padding:24px 8px;font-size:clamp(34px,calc(18px + 2.4vw),60px);font-weight:700}
.sres{min-height:48px;margin:12px 0 0;text-align:center;font-size:var(--t2);font-weight:700}
.sres .en{font-size:1.1em}
.wd{display:inline-flex;align-items:flex-end;white-space:nowrap}
.wgap{display:inline-block;width:.6em}
.sy{position:relative;display:inline-block;transition:margin .5s cubic-bezier(.3,1.4,.5,1),transform .5s cubic-bezier(.3,1.4,.5,1)}
.syst.apart .sy{margin:0 .4em}
.sy.beat{animation:beat .45s ease}
@keyframes beat{40%{transform:translateY(-.35em) scale(1.12)}}
.clap{position:absolute;left:50%;top:-.9em;transform:translateX(-50%);font-size:.6em;animation:clap .6s ease both}
@keyframes clap{0%{opacity:0;transform:translate(-50%,10px) scale(.4)}50%{opacity:1;transform:translate(-50%,0) scale(1.2)}100%{opacity:1;transform:translate(-50%,0) scale(1)}}
.cut{display:inline-block;width:0;align-self:stretch;border-left:3px dashed var(--gold);transform:scaleY(0);transition:transform .3s;margin:0 -1.5px}
.syst.cutting .cut{transform:scaleY(1)}
.train{display:flex;align-items:flex-end;gap:4px;transition:transform 1.4s cubic-bezier(.2,.8,.3,1),gap .6s cubic-bezier(.3,1.4,.5,1)}
.train.out{transform:translateX(120%)}
.train.apart{gap:24px}
.eng{font-size:1.25em;line-height:1}
.car{position:relative;display:flex;flex-direction:column;align-items:center;padding:4px 12px 0;border-radius:12px 12px 4px 4px;background:#fff;border:3px solid var(--navy)}
.car::after{content:'● ●';display:block;font-size:.3em;color:var(--navy);letter-spacing:.3em;margin-top:-2px}
.car .nb{position:absolute;top:-1.1em;left:50%;transform:translateX(-50%) scale(0);font-size:max(16px,.45em);width:1.6em;height:1.6em;border-radius:50%;background:var(--gold);color:var(--navy);display:flex;align-items:center;justify-content:center;transition:transform .3s cubic-bezier(.3,1.8,.5,1)}
.car .nb.on{transform:translateX(-50%) scale(1)}
.sci{position:absolute;top:8px;font-size:.8em;line-height:1;transition:left .5s ease;transform:translateX(-50%) rotate(-90deg)}
.snip{position:absolute;top:8px;font-size:max(16px,.35em);color:var(--goldt);font-weight:700;transform:translateX(-50%);animation:clap .5s ease both}
.syst.split .sy{margin:0 .25em}
.syst.split .sy:nth-child(odd){transform:rotate(-5deg) translateY(-4px)}
.syst.split .sy:nth-child(even){transform:rotate(5deg) translateY(4px)}
.plink{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0 0}
/* 給老師看的證據 */
#ev{margin-top:48px;border:1px solid var(--line);border-radius:var(--r);padding:8px 16px 16px;box-shadow:var(--sh)}
#ev>summary{cursor:pointer;min-height:56px;display:flex;align-items:center;font-size:var(--t2);font-weight:700}
#ev h4{font-size:20px;margin:24px 0 8px}
#ev p,#ev li{font-size:17px;line-height:1.7}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
#ev table{border-collapse:collapse;font-size:16px;line-height:1.5;min-width:640px;width:100%}
#ev th,#ev td{border:1px solid var(--line);padding:8px;vertical-align:top;text-align:left}
#ev th{background:var(--tint)}
#ev small{font-size:16px;color:var(--soft)}
@media (max-width:999px){
 .g6{grid-template-columns:repeat(3,minmax(0,1fr))}
 .dex{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media (max-width:720px){
 .g3,.why{grid-template-columns:minmax(0,1fr)}
 .why div{display:flex;gap:16px;align-items:center;text-align:left;padding:16px}
 .why b{margin:0;font-size:40px}
 .rc{padding:16px}
 .cbox{grid-template-columns:minmax(0,1fr);padding:16px}
 .demo{grid-template-columns:minmax(0,1fr);padding:16px}
 .darr{transform:rotate(90deg);justify-self:center}
 .three div{padding:16px;gap:12px}
}
@media (max-width:600px){
 .app{padding:4px 12px 40px}
 .g6{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
 .dex{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
 .tc{padding:16px 4px}
 .top{min-height:56px}
 .homeln,.evln,.dexc{padding:0 12px}
 .strip{margin-bottom:8px}
 .qwrap{gap:8px}
 .qc{padding:12px 8px}
 .qi{font-size:48px;margin:0}
 .qz{font-size:22px;min-height:2.8em}
 .qa{margin-bottom:4px}
 .faces{gap:4px}
 .fc{min-height:76px;border-radius:14px}.fc b{font-size:32px}
 .fc span{white-space:normal;font-size:16px;line-height:1.15}
 .flip{min-height:112px}
 .face{padding:8px 12px;gap:12px}
 .rvi{font-size:44px}.rve{font-size:28px}
 .nav{margin-top:8px}
 .go{min-height:60px;padding:8px 20px}
 #quiz .go{font-size:22px}
 .ghost{min-height:60px;padding:8px 16px}
 .copts{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
 .bigsay{min-width:72px;min-height:72px;font-size:32px;margin:8px 0;box-shadow:0 0 0 6px var(--gold2)}
 .cq{font-size:20px;margin:0}
 .copt{min-height:84px;padding:4px}.copt i{font-size:36px}
 .cfb{margin-top:8px;min-height:0;font-size:18px}.cfb .w{font-size:24px}
 #chal-s .startbar{margin-top:8px!important}#chal-s .go{min-height:56px}
 .cnote{margin-top:8px}
 .medal{font-size:64px}
 .rlist{gap:4px;margin-bottom:12px}.rlist div{padding:8px;gap:8px;font-size:16px;line-height:1.3}.rlist span{font-size:24px}
 .think{padding:12px 16px;font-size:20px;margin-bottom:12px}
 #refl .mt{font-size:26px}#refl .startbar{margin-top:12px}
 .panel{padding:16px;margin:8px auto}
 .pb{grid-template-columns:1.8em 6.4em minmax(0,1fr) 2.8em;gap:4px;font-size:18px}
 .ph .pi{font-size:56px}
 .dce{font-size:18px}
 .dc{padding:12px 4px}
 .dcolh{padding:8px 2px}
}
@media (min-width:1600px){:root{--t2:32px;--t3:24px;--big:42px;--t1:56px}.rail .sn{width:40px;height:40px;margin:-20px 0 0 -20px;font-size:20px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.fx{display:none}.cmpr .shape{transform:scale(1)}.jt{opacity:1;transform:none}.pb{opacity:1;transform:none}}
</style>
</head>
<body data-s="start">
<main class="app">
<div class="top"><a class="homeln" href="index.html">🏠 首頁</a><a class="evln" href="#ev" id="evgo">📚 給老師看的證據</a><div class="dexc" id="dexc" aria-live="polite">📖 職業圖鑑 <b id="dexn">0</b> / ${QJOBS.length}</div></div>

<section class="scr on" id="start">
 <div class="hero">
  <span class="kick">🧭 職業探險家任務</span>
  <h1>職業興趣探險</h1>
  <svg class="compass0" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" fill="#fff" stroke="#1B2B4B" stroke-width="5"/><circle cx="60" cy="60" r="44" fill="none" stroke="#D9A520" stroke-width="2"/><g class="ndl"><polygon points="60,18 68,60 52,60" fill="#D9A520"/><polygon points="60,102 68,60 52,60" fill="#1B2B4B"/></g><circle cx="60" cy="60" r="6" fill="#fff" stroke="#1B2B4B" stroke-width="3"/></svg>
  <p>30 件工作上真的會做的事，你喜歡哪些？走完 5 個關卡站，收集職業、學會英文，最後打開你的「興趣羅盤」。</p>
 </div>

 <section class="sec" aria-labelledby="h-res">
  <h2 id="h-res">研究根據</h2>
  <p class="one">這個活動不是隨便出題，每一個部分都有出處。</p>
  <div class="g3">
   <div class="card rc"><span class="ri">🇺🇸</span><h3>改編自美國勞動部 O*NET「職業興趣量表」</h3><q>“${esc(ipC.quotes[0])}”</q><a href="https://www.onetcenter.org/IP.html" target="_blank" rel="noopener">onetcenter.org/IP.html ↗</a></div>
   <div class="card rc"><span class="ri">📚</span><h3>何倫 Holland 六種興趣理論：研究歷史很長、輔導老師很常使用</h3><q>“${esc(holC.quotes[1])}”<br>“${esc(holC.quotes[2])}”</q><a href="https://www.onetcenter.org/IP.html" target="_blank" rel="noopener">onetcenter.org/IP.html ↗</a></div>
   <div class="card rc"><span class="ri">🔬</span><h3>研究發現：小學生的興趣還在改變</h3><q>“${esc(tr2C.quotes[0])}”</q><a href="${doi['Tracey & Ward 1998']}" target="_blank" rel="noopener">Tracey &amp; Ward 1998 ↗</a><a href="${doi['Tracey 2002']}" target="_blank" rel="noopener" style="margin-top:0">Tracey 2002 ↗</a></div>
  </div>
 </section>

 <section class="sec" aria-labelledby="h-why">
  <h2 id="h-why">為什麼做這個測驗</h2>
  <p class="one">這個測驗幫你做到三件事：</p>
  <div class="why">
   <div class="card"><b>🔍</b>發現自己<em class="nowx">現在</em>最喜歡做哪些事</div>
   <div class="card"><b>🗺️</b>認識很多以前不知道的工作</div>
   <div class="card"><b>🔤</b>學會這些工作的英文</div>
  </div>
 </section>

 <section class="sec" aria-labelledby="h-six">
  <h2 id="h-six">六種興趣</h2>
  <p class="one">每個人六種興趣都有，只是多少不一樣。</p>
  <div class="g6">
${ORDER.split('').map(t => `   <div class="card tc" style="--c:${TY[t].c}"><span class="ti">${TY[t].ic}</span><span class="tf">${TY[t].f}</span><span class="te">${TY[t].en}</span><span class="td">${TY[t].d}</span></div>`).join('\n')}
  </div>
 </section>

 <section class="sec" aria-labelledby="h-three">
  <h2 id="h-three">開始之前，先記住三句話</h2>
  <div class="three">
   <div class="card"><span>1️⃣</span><p style="margin:0">這個測驗幫你發現：你<em>現在</em>最喜歡做哪些事。</p></div>
   <div class="card"><span>2️⃣</span><p style="margin:0">你現在喜歡的事，長大以後可能會不一樣——就像以前喜歡的玩具，現在可能不玩了。</p></div>
   <div class="card"><span>3️⃣</span><p style="margin:0">所以結果不是「你以後一定要做什麼」，而是「可以先去認識哪些工作」。</p></div>
  </div>
  <div class="startbar"><button class="go gold" id="go">🧭 開始探險任務 ▶</button></div>
  <div class="note">⚠️ <b>僅供參考</b>：這是參考 O*NET 興趣量表改寫的<b>探索活動</b>，不是正式的測驗。不問名字、不存資料；每一種工作男生女生都可以做。</div>
 </section>
</section>

<section class="scr mis" id="mission">
 <svg class="cmp" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" fill="#fff" stroke="#1B2B4B" stroke-width="5"/><text x="60" y="22" text-anchor="middle" font-size="14" font-weight="700" fill="#1B2B4B">N</text><circle cx="60" cy="60" r="44" fill="none" stroke="#D9A520" stroke-width="2"/><g class="ndl"><polygon points="60,18 68,60 52,60" fill="#D9A520"/><polygon points="60,102 68,60 52,60" fill="#1B2B4B"/></g><circle cx="60" cy="60" r="6" fill="#fff" stroke="#1B2B4B" stroke-width="3"/></svg>
 <div class="h2" id="loc">🧭 定位中…</div>
 <div class="map hide0" id="map1"></div>
 <div class="card brief hide0" id="brief">
  <div><span>🏝️</span><p>任務：走完 <b>5 個關卡站</b>，每一站有 6 件工作上會做的事。</p></div>
  <div><span>🔓</span><p>每回答一題，卡片就會翻面，<b>解鎖一個職業</b>，收進你的 📖 職業圖鑑。</p></div>
  <div><span>⚡</span><p>每一站最後有「圖鑑挑戰」：聽英文，找出剛剛解鎖的職業。</p></div>
  <div><span>💗</span><p>沒有對錯，照你<b>現在</b>的感覺選。</p></div>
 </div>
 <div class="startbar hide0" id="sailbar"><button class="go gold" id="sail">⛵ 出發！</button></div>
</section>

<section class="scr" id="quiz" aria-live="polite">
 <div class="strip"><div class="rail" id="rail" aria-hidden="true"><div class="fill" id="fill"></div>${[1, 2, 3, 4, 5].map(k => `<span class="sn" style="left:calc(12px + (100% - 24px) * ${k / 5 - 0.1})">${k}</span>`).join('')}<span class="ship" id="ship">⛵</span></div><span class="pn" id="pn"></span></div>
 <div class="qwrap">
  <div class="card qc" id="qc">
   <span class="qlv" id="lv"></span>
   <div class="qi" id="qi"></div>
   <div class="qz" id="qz"></div>
   <div class="qa">你喜歡做這件事嗎？</div>
   <div class="faces" id="faces">
${FACES.map(([f, t, v]) => `    <button class="fc" data-v="${v}" aria-label="${t}"><b>${f}</b><span>${t}</span></button>`).join('\n')}
   </div>
  </div>
  <div class="flip" id="flip">
   <div class="in">
    <div class="face front"><b>🔒</b><span>回答後，翻開一個職業</span></div>
    <div class="face back"><span class="rvi" id="ri"></span><span class="rvt"><span class="rve" id="re"></span><span class="rvz" id="rz"></span><button class="rvs" id="say">🔊 再聽一次</button></span></div>
   </div>
  </div>
 </div>
 <div class="nav"><button class="ghost" id="back">◀ 上一題</button><button class="go" id="next" disabled>下一題 ▶</button></div>
</section>

<section class="scr cen" id="mid">
 <div class="medal">🏅</div>
 <div class="mt" id="mt"></div>
 <div class="ms" id="ms"></div>
 <div class="map" id="map2"></div>
 <div class="startbar"><button class="go gold" id="chal">⚡ 開始圖鑑挑戰 ▶</button></div>
</section>

<section class="scr cen" id="chal-s">
 <div class="chn" id="chn"></div>
 <div class="cq">⚡ 圖鑑挑戰：聽英文，選出正確的職業</div>
 <button class="bigsay" id="csay" aria-label="再聽一次英文">🔊</button>
 <div class="copts" id="copts"></div>
 <div class="cfb" id="cfb" aria-live="polite"></div>
 <div class="startbar" style="margin-top:16px"><button class="go" id="cnext" style="visibility:hidden">下一題 ▶</button></div>
 <p class="cnote">⚡ 圖鑑挑戰只練英文，<b>不算進興趣分數</b>。</p>
</section>

<section class="scr cen" id="refl">
 <div class="mt">💭 想一想</div>
 <div class="ms" id="rscore"></div>
 <div class="card think">剛剛 6 件事，你最喜歡哪一件？為什麼？<small>（不用作答，在心裡想一想，或和旁邊的同學說一說）</small></div>
 <div class="rlist" id="rlist"></div>
 <div class="startbar"><button class="go gold" id="cont">繼續探險 ▶</button></div>
</section>

<section class="scr" id="res">
 <div class="warn">⚠️ <b>僅供參考</b>：這是你<b>今天</b>的興趣，不是你以後一定要做的工作。研究發現，小學生的興趣還會一直改變；喜歡做的事也不等於能力，能力可以慢慢練出來。</div>
 <section class="sec" style="margin-top:32px">
  <h2>🧭 我的興趣羅盤</h2>
  <p class="one">每個人六種興趣都有，只是多少不一樣。</p>
  <div class="card cbox">
   <svg class="cmpr" id="cmpr" viewBox="0 0 400 400" role="img" aria-label="我的興趣羅盤"></svg>
   <div class="bars" id="bars"></div>
  </div>
  <p class="tag">🧭 羅盤告訴你可以先往哪裡探索，不是終點。</p>
 </section>
 <div class="say1x" id="top"></div>
 <p class="sub" id="topsub"></p>
 <div id="tops"></div>
 <section class="sec">
  <h2>其他方向也可以去看看</h2>
  <div id="others"></div>
  <details class="tg" style="--c:var(--navy);--b:var(--tint)" id="extra">
   <summary>🌟 這些職業也可以認識 <small>（還沒有自己的興趣分數）</small></summary>
   <p>美國勞動部替 ${RATED} 多種工作打了六種興趣的分數，（怎麼打的，看下面「📖 我的職業圖鑑」的說明），但 YouTuber、網紅、內容創作者還沒有自己的一項分數，所以先不分類，不代表它們不好。</p>
   <div class="jg">${EXTRA.map(e => `<a class="jt" href="story.html#w${W[e].no}" data-e="${esc(e)}"><span class="ji">${W[e].ic}</span><span class="je en">${colorWord(e)}</span><span class="jz">${esc(W[e].z)}</span></a>`).join('')}</div>
  </details>
 </section>
 <div class="card think" style="margin-top:48px">💬 想一想、說一說
  <small style="font-size:var(--t2);line-height:1.8;color:var(--navy)">1️⃣ 30 件事裡，你最喜歡哪一件？為什麼？<br>2️⃣ 和老師、家人聊聊你的發現。<br>3️⃣ 打開下面的職業圖鑑，學這些職業的英文！</small></div>

 <section class="sec" id="dexs" aria-labelledby="h-dex">
  <h2 id="h-dex">📖 我的職業圖鑑</h2>
  <p class="one">每個職業放在它<b>分數最高</b>的那一欄。點職業卡，看它的「興趣成分」。</p>
  <div class="card demo" id="demo" style="--c:${TY.S.c};--b:${TY.S.bg}">
   <p class="dh">例如：老師 teacher 的六種分數</p>
   <div>${ORDER.split('').map(t => `<div class="dbar${teacher[t] === tMax ? ' max' : ''}" style="--c:${TY[t].c};--w:${teacher[t]}"><span>${TY[t].ic} ${TY[t].f}</span><i></i><span>${teacher[t]}</span></div>`).join('')}</div>
   <span class="darr" aria-hidden="true">➜</span>
   <div class="dcol"><b>${TY.S.ic} ${TY.S.f}</b><span class="cap">最長的是社會型 ${teacher.S}</span><br><span class="dchip">🧑‍🏫 teacher</span></div>
   <button class="b48 rp" id="replay">▶ 再看一次</button>
  </div>
  <div class="dex" id="dex">
${ORDER.split('').map(t => `   <div class="dcolw" style="--c:${TY[t].c};--b:${TY[t].bg}"><div class="dcolh"><b>${TY[t].ic} ${TY[t].f}</b><small>${TY[t].en}</small></div><div class="dcolb">${DEX[t].map(e => dexCard(e, t)).join('')}</div></div>`).join('\n')}
  </div>
  ${HOW}
  <p class="dexn">兩型同分的職業，兩欄都放，卡片上標「同分」。🔓＝這次探險解鎖的職業。</p>
 </section>
 <div class="again"><button class="go gold" id="again">🔄 再玩一次</button><a class="ghost" href="jobdex.html">📖 職業圖鑑＋複習遊戲 ▶</a><a class="ghost" href="index.html">🏠 回首頁</a></div>
</section>

<details id="ev">
 <summary>📚 給老師看的證據（原始量表、研究、每一題的出處）</summary>
 <h4>這是什麼</h4>
 <p>參考美國勞動部 <b>O*NET 興趣量表 30 題迷你版</b>的架構（何倫 Holland 六種興趣，每型 5 題、輪流出題），把題目改寫成四年級看得懂的句子。每一題都是網站上 36 個職業之一的真實工作內容（O*NET 逐字原文），而且那個職業的 O*NET 興趣分數前 3 名一定有這一型；每一型的題目優先用這一型分數最高的職業。
 <b>改寫以後沒有量過信度，不是正式量表，是「探索活動」，僅供參考。</b></p>
 <p>💡 ${esc(NOTE6)}</p>
 <h4>怎麼計分、怎麼呈現</h4>
 <ul>
  <li>作答：5 個表情（O*NET 用表情符號作答的研究）。😍 5 分、🙂 4、😐 3、🙁 2、😖 1；每型 5 題，最少 5 分、最多 25 分。</li>
  <li>⚡ 每關的「圖鑑挑戰」只練英文，不算進興趣分數。</li>
  <li>六型全部顯示（羅盤六角形＋長條），不只給一個答案；說法是「你<b>今天</b>最常按「喜歡」的是…」，不說「你是…型的人」。</li>
  <li>列出最高分的型（同分並列）；只有一型最高時，再加上第二高的型（第二高有 3 型以上同分就不加）。六型一樣高，或最高分不到 11 分（平均是「不喜歡」），會出現另外的鼓勵說法。</li>
  <li>職業清單寫「可以去認識」，不寫「適合你」；不問性別、不問名字、不存任何資料。</li>
  <li>結果頁每一型列出的職業：O*NET 興趣分數前 3 名有這一型（📋 事務型只列前 2 名）。職業圖鑑：每個職業放在分數最高的那一欄，同分兩欄都放。</li>
  <li>英文單字：母音紅色、不發音灰色，每個字母都對過 Cambridge 美式音標（<a href="word-check.html#letters">考證頁</a>）。</li>
 </ul>
 <h4>原始量表和研究（每一句都用 <code>_quiz_check.py</code> 抓原文自動核對）</h4>
 <div class="tw"><table><thead><tr><th>說法</th><th>原文</th><th>出處</th></tr></thead><tbody>
${evClaims}
 </tbody></table></div>
 <h4>六種興趣：網頁的說法 ↔ O*NET 定義</h4>
 <div class="tw"><table><thead><tr><th>型</th><th>網頁的說法</th><th>O*NET 原文</th></tr></thead><tbody>
${evDefs}
 </tbody></table></div>
 <h4>30 題：題目 ↔ O*NET 工作內容原文</h4>
 <div class="tw"><table><thead><tr><th>#</th><th>型</th><th>題目</th><th>職業</th><th>O*NET 工作內容（原文）</th><th>這一型的興趣分數</th></tr></thead><tbody>
${evItems}
 </tbody></table></div>
 <h4>${Object.keys(SC).length} 個職業的 O*NET 興趣分數（粗體＝前 3 名）</h4>
 <div class="tw"><table><thead><tr><th>職業</th><th>六型分數</th><th>O*NET</th></tr></thead><tbody>
${evJobs}
 </tbody></table></div>
 <h4>單字卡上沒有自己一個 O*NET 職業的字：用官方職稱資料庫決定</h4>
 <p>O*NET 官方職稱資料庫（<a href="${Q.titles_db.url}" target="_blank" rel="noopener">job_titles.csv</a>，${Q.titles_db.n.toLocaleString('en-US')} 個職稱）；有興趣分數的職業 ${Q.titles_db.rated} 種（<a href="${Q.titles_db.rated_url}" target="_blank" rel="noopener">career_interest_types.csv</a>）。</p>
 <div class="tw"><table><thead><tr><th>歸類的職業</th><th>根據</th><th>前 3 名</th></tr></thead><tbody>
${evClass}
 </tbody></table></div>
 <div class="tw" style="margin-top:16px"><table><thead><tr><th>沒有歸類</th><th>原因</th><th>網站怎麼處理</th></tr></thead><tbody>
${evNo}
 </tbody></table></div>
 <h4>engineer：O*NET 的 ${Q.engineers.length} 種工程師（前 3 名）</h4>
 <div class="tw"><table><thead><tr><th>工程師</th><th>前 3 名</th><th>O*NET</th></tr></thead><tbody>
${evEng}
 </tbody></table></div>
</details>
</main>
<div id="sheet" role="dialog" aria-modal="true" aria-labelledby="pe"><div class="panel" id="panel"></div></div>
<div class="fx" id="fx"></div>
<script>
const TY=${JSON.stringify(TY)};
const ORDER='${ORDER}';
const ITEMS=${JSON.stringify(ITEMS)};
const JOBS=${JSON.stringify(JOBS)};
const SC=${JSON.stringify(SC)};
const FUN=${JSON.stringify(FUN)};
const WD=${JSON.stringify(Object.fromEntries(words.map(w => [w.e, [w.no, w.z, w.ic]])))};
const SYL=${JSON.stringify(Object.fromEntries(Object.keys(SC).concat(EXTRA).map(e => [e, SYL[e]])))};
const VOW=${JSON.stringify(Object.fromEntries(Object.entries(VOW).filter(([e]) => SC[e] || EXTRA.includes(e))))};
const SILENT=${JSON.stringify(Object.fromEntries(Object.entries(SILENT).filter(([e]) => SC[e] || EXTRA.includes(e))))};
const QN=${QJOBS.length};
const $=id=>document.getElementById(id);
let ans=[],cur=0,heard=[],unlocked=new Set(),lvl=0,chq=[],chk=0,chOk=0,lockT=0;
/* ---- 聲音 ---- */
let sayTok=0;
function speak(t,n,done){n=n||1;const tok=++sayTok;let fin=false;const end=()=>{if(fin||tok!==sayTok)return;fin=true;if(done)done()};
 try{const ss=window.speechSynthesis;ss.cancel();for(let k=0;k<n;k++){const u=new SpeechSynthesisUtterance(t);u.lang='en-US';u.rate=.8;if(k===n-1){u.onend=end;u.onerror=end}ss.speak(u)}}catch(e){setTimeout(end,10)}}
function stop(){sayTok++;try{speechSynthesis.cancel()}catch(e){}}
let AC=null;
function tone(fs,dur,type,vol){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const t0=AC.currentTime;
 fs.forEach((f,k)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.value=f;o.connect(g);g.connect(AC.destination);
 const s=t0+k*dur*.8;g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(vol||.15,s+.02);g.gain.exponentialRampToValueAtTime(.001,s+dur);o.start(s);o.stop(s+dur+.05)})}catch(e){}}
const sfx={ok:()=>tone([660,880,1320],.18,'triangle'),no:()=>tone([220,180],.22,'square',.06),pop:()=>tone([520,780],.12,'triangle',.12),clap:()=>tone([180],.08,'square',.08),snip:()=>tone([1400,900],.06,'square',.06),lvl:()=>tone([523,659,784,1047],.2,'triangle')};
/* ---- 共用 ---- */
function show(id){document.body.dataset.s=id==='chal-s'?'chal':id;document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id===id));window.scrollTo(0,0)}
function confetti(){const fx=$('fx');fx.innerHTML='';const cs=['#D9A520','#1B2B4B'].concat(ORDER.split('').map(t=>TY[t].c));
 for(let k=0;k<40;k++){const i=document.createElement('i');i.style.left=Math.random()*100+'%';i.style.background=cs[k%cs.length];i.style.animationDelay=Math.random()*.6+'s';fx.appendChild(i)}
 setTimeout(()=>fx.innerHTML='',2600)}
function colorWord(e){const v=VOW[e]||[],s=SILENT[e]||[];return [...e].map((c,i)=>c===' '?'<span class="sp"> </span>':s.indexOf(i)>-1?'<span class="lg">'+c+'</span>':v.indexOf(i)>-1?'<span class="lv">'+c+'</span>':c).join('')}
function colorRange(e,a,b){const v=VOW[e]||[],s=SILENT[e]||[];let o='';for(let i=a;i<b;i++){const c=e[i];o+=s.indexOf(i)>-1?'<span class="lg">'+c+'</span>':v.indexOf(i)>-1?'<span class="lv">'+c+'</span>':c}return o}
/* ---- 地圖 ---- */
const PATH='M40,230 C160,40 260,60 330,170 S520,300 600,150 S800,20 960,110';
function mapSVG(el,done,anim){
 el.innerHTML='<svg viewBox="0 0 1000 300" aria-hidden="true"><path class="route" d="'+PATH+'"/><text x="975" y="80" font-size="44" text-anchor="middle">🧭</text><g id="'+el.id+'s"></g><text class="mship" font-size="48" text-anchor="middle">⛵</text></svg>';
 const p=el.querySelector('path'),L=p.getTotalLength?p.getTotalLength():0,g=el.querySelector('g');let h='';
 for(let k=1;k<=5;k++){const pt=L?p.getPointAtLength(L*(k/5-0.1)):{x:k*180,y:150};
  h+='<g class="st'+(k<=done?' lit':'')+(anim?' pop':'')+'" style="animation-delay:'+(anim?0.5+k*0.2:0)+'s"><circle cx="'+pt.x+'" cy="'+pt.y+'" r="30"/><text x="'+pt.x+'" y="'+(pt.y+11)+'">'+k+'</text></g>'}
 g.innerHTML=h;
 const sp=done?(L?p.getPointAtLength(L*(done/5-0.1)):{x:done*180,y:150}):(L?p.getPointAtLength(0):{x:40,y:230});
 const sh=el.querySelector('.mship');sh.setAttribute('x',sp.x);sh.setAttribute('y',sp.y-34);
}
/* ---- 開場 → 任務 ---- */
function mission(){show('mission');
 ['map1','brief','sailbar'].forEach(id=>{$(id).classList.remove('show1','unfold');$(id).classList.add('hide0')});
 $('loc').textContent='🧭 定位中…';
 setTimeout(()=>{$('loc').textContent='🗺️ 探險地圖';mapSVG($('map1'),0,true);$('map1').classList.remove('hide0');$('map1').classList.add('unfold')},1500);
 setTimeout(()=>{$('brief').classList.remove('hide0');$('brief').classList.add('show1')},2500);
 setTimeout(()=>{$('sailbar').classList.remove('hide0');$('sailbar').classList.add('show1')},3000);
}
function start(){ans=[];heard=[];cur=0;unlocked=new Set();$('dexn').textContent='0';mission()}
/* ---- 題目 ---- */
function render(anim){
 const it=ITEMS[cur],qc=$('qc');
 if(anim!==false){qc.classList.remove('in');void qc.offsetWidth;qc.classList.add('in')}
 $('pn').textContent='第 '+(cur+1)+' / '+ITEMS.length+' 題';
 const p=cur/ITEMS.length;$('fill').style.width='calc((100% - 24px) * '+p+')';$('ship').style.left='calc(12px + (100% - 24px) * '+p+')';
 document.querySelectorAll('#rail .sn').forEach((s,k)=>s.classList.toggle('lit',(k+1)*6<=cur));
 $('lv').textContent='第 '+(Math.floor(cur/6)+1)+' 站・第 '+(cur%6+1)+' / 6 件事';
 $('qi').textContent=it.ic;$('qz').textContent=it.zh;
 document.querySelectorAll('.fc').forEach(b=>b.classList.toggle('sel',+b.dataset.v===ans[cur]));
 const w=WD[it.e];$('ri').textContent=w[2];$('re').innerHTML=colorWord(it.e);$('rz').textContent=w[1]+'會做這件事';
 const f=$('flip');f.classList.add('now');f.classList.toggle('on',!!ans[cur]);void f.offsetWidth;f.classList.remove('now');
 setNext();$('back').disabled=cur===0;
}
function setNext(){const n=$('next');n.disabled=!ans[cur]||!heard[cur];
 n.textContent=!ans[cur]?'先選一個表情':!heard[cur]?'🔊 聽英文…':(cur%6===5?'完成這一站 ▶':'下一題 ▶')}
function unlock(k){clearTimeout(lockT);if(!heard[k]){heard[k]=true;if(k===cur)setNext()}}
function flyTo(e){const from=$('ri').getBoundingClientRect(),to=$('dexc').getBoundingClientRect();
 const d=document.createElement('div');d.className='fly';d.textContent=WD[e][2];document.body.appendChild(d);
 d.style.left=from.left+'px';d.style.top=from.top+'px';
 const dx=to.left+to.width/2-from.left-28,dy=to.top+to.height/2-from.top-28;
 const fin=()=>{d.remove();$('dexn').textContent=unlocked.size;$('dexc').classList.remove('bump');void $('dexc').offsetWidth;$('dexc').classList.add('bump')};
 try{const a=d.animate([{transform:'none',opacity:1},{transform:'translate('+dx*.5+'px,'+(dy*.5-60)+'px) scale(.9)',opacity:1},{transform:'translate('+dx+'px,'+dy+'px) scale(.3)',opacity:.4}],{duration:900,easing:'cubic-bezier(.4,0,.2,1)'});a.onfinish=fin}catch(x){fin()}}
function pick(v){
 const first=!ans[cur],k=cur;ans[cur]=v;
 document.querySelectorAll('.fc').forEach(b=>b.classList.toggle('sel',+b.dataset.v===v));
 if(!first){setNext();return}
 $('flip').classList.add('on');sfx.pop();setNext();
 const e=ITEMS[k].e;
 if(!unlocked.has(e)){unlocked.add(e);setTimeout(()=>{if(cur===k)flyTo(e);else $('dexn').textContent=unlocked.size},650)}
 // 自動唸 3 次，唸完「下一題」才亮；保險：最多 8 秒一定會亮
 lockT=setTimeout(()=>unlock(k),8000);
 speak(e,3,()=>unlock(k));
}
function next(){
 if(!ans[cur]||!heard[cur])return;
 if(cur%6===5){mid(Math.floor(cur/6)+1);return}
 cur++;render();
}
/* ---- 關卡完成 → 圖鑑挑戰 → 想一想 ---- */
function mid(k){lvl=k;stop();
 $('mt').textContent='第 '+k+' 站完成！';
 $('ms').textContent=k<5?'已經探險 '+k*6+' 件事，還有 '+(ITEMS.length-k*6)+' 件。':'30 件事全部完成！最後一個挑戰之後，打開你的興趣羅盤。';
 show('mid');mapSVG($('map2'),k,false);
 const st=$('map2').querySelectorAll('.st')[k-1];if(st){st.classList.add('pop')}
 confetti();sfx.lvl();
}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function lvlJobs(k){return [...new Set(ITEMS.slice((k-1)*6,k*6).map(i=>i.e))]}
function chal(){chq=shuffle(lvlJobs(lvl)).slice(0,3);chk=0;chOk=0;show('chal-s');chRender()}
function chRender(){const e=chq[chk];
 $('chn').textContent='第 '+lvl+' 站的圖鑑挑戰・第 '+(chk+1)+' / 3 題';
 $('copts').innerHTML=shuffle(lvlJobs(lvl)).map(x=>'<button class="copt" data-e="'+x+'"'+(x===e?' data-ok="1"':'')+'><i>'+WD[x][2]+'</i><span>'+WD[x][1]+'</span></button>').join('');
 $('cfb').innerHTML='';$('cnext').style.visibility='hidden';
 setTimeout(()=>sayC(),300)}
function sayC(){const b=$('csay');b.classList.remove('ring');void b.offsetWidth;b.classList.add('ring');speak(chq[chk],1)}
function chPick(btn){const e=chq[chk];if($('cnext').style.visibility==='visible')return;
 document.querySelectorAll('.copt').forEach(b=>b.disabled=true);
 if(btn.dataset.e===e){chOk++;btn.classList.add('ok');sfx.ok();$('cfb').innerHTML='🎉 答對了！<span class="w">'+colorWord(e)+'</span>'}
 else{btn.classList.add('no');sfx.no();document.querySelector('.copt[data-ok]').classList.add('ans');
  $('cfb').innerHTML='看清楚：正確答案是 '+WD[e][2]+' '+WD[e][1]+'<span class="w">'+colorWord(e)+'</span>';setTimeout(()=>speak(e,1),500)}
 $('cnext').textContent=chk<2?'下一題 ▶':'完成挑戰 ▶';$('cnext').style.visibility='visible'}
function chNext(){if(chk<2){chk++;chRender();return}refl()}
function refl(){show('refl');
 $('rscore').textContent='⚡ 圖鑑挑戰答對 '+chOk+' / 3 題'+(chOk===3?'，太厲害了！':'，下一站再挑戰！');
 $('rlist').innerHTML=ITEMS.slice((lvl-1)*6,lvl*6).map(i=>'<div class="card"><span>'+i.ic+'</span>'+i.zh+'</div>').join('');
 $('cont').textContent=lvl<5?'⛵ 前往第 '+(lvl+1)+' 站 ▶':'🧭 打開我的興趣羅盤 ▶'}
function cont(){if(lvl>=5){result();return}cur=lvl*6;show('quiz');render()}
/* ---- 結果 ---- */
function score(){const s={};for(const t of ORDER)s[t]=0;ITEMS.forEach((it,i)=>s[it.t]+=ans[i]||0);return s}
function tile(e){const w=WD[e];return '<button class="jt" data-e="'+e+'"><span class="ji">'+w[2]+'</span><span class="je en">'+colorWord(e)+'</span><span class="jz">'+w[1]+'</span></button>'}
function group(t,open){const y=TY[t],st='--c:'+y.c+';--b:'+y.bg;
 const head=y.ic+' '+y.f+' <small>'+y.en+'</small>';
 return open?'<section class="tg" style="'+st+'" data-t="'+t+'"><h3>'+head+'</h3><p>'+y.d+'。可以去認識這些職業：</p><div class="jg">'+JOBS[t].map(tile).join('')+'</div></section>'
 :'<details class="tg" style="'+st+'" data-t="'+t+'"><summary>'+head+'</summary><p>'+y.d+'。</p><div class="jg">'+JOBS[t].map(tile).join('')+'</div></details>'}
function compass(s,tops){
 const c=200,R=118,pt=(k,r)=>[c+r*Math.sin(Math.PI/3*k),c-r*Math.cos(Math.PI/3*k)];
 let g='<circle cx="200" cy="200" r="194" fill="#fff" stroke="#1B2B4B" stroke-width="6"/><circle cx="200" cy="200" r="182" fill="none" stroke="#D9A520" stroke-width="2"/>';
 for(let a=0;a<72;a++){const r1=a%6===0?168:176,x1=c+r1*Math.sin(a*Math.PI/36),y1=c-r1*Math.cos(a*Math.PI/36),x2=c+182*Math.sin(a*Math.PI/36),y2=c-182*Math.cos(a*Math.PI/36);g+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#9AA6BD" stroke-width="'+(a%6===0?3:1.5)+'"/>'}
 for(const f of [1,.6,.2])g+='<polygon points="'+[0,1,2,3,4,5].map(k=>pt(k,R*f).join(',')).join(' ')+'" fill="'+(f===1?'#F4F6FA':'none')+'" stroke="#DFE4EE" stroke-width="2"/>';
 for(let k=0;k<6;k++){const [x,y]=pt(k,R);g+='<line x1="200" y1="200" x2="'+x+'" y2="'+y+'" stroke="#DFE4EE" stroke-width="2"/>'}
 const sh=[...ORDER].map((t,k)=>pt(k,R*Math.max(.08,(s[t]-5)/20)).join(',')).join(' ');
 g+='<polygon class="shape" points="'+sh+'" fill="rgba(217,165,32,.32)" stroke="#D9A520" stroke-width="4" stroke-linejoin="round"/>';
 [...ORDER].forEach((t,k)=>{const [x,y]=pt(k,150);const on=tops.indexOf(t)>-1;
  g+=(on?'<circle class="glow" cx="'+x+'" cy="'+y+'" r="27" fill="'+TY[t].bg+'" stroke="'+TY[t].c+'" stroke-width="4"/>':'')+'<text class="ti" x="'+x+'" y="'+(y+12)+'" text-anchor="middle" font-size="32">'+TY[t].ic+'</text>'});
 g+='<g class="ndl"><polygon points="200,92 212,200 188,200" fill="#D9A520" stroke="#A57A10" stroke-width="2"/><polygon points="200,300 212,200 188,200" fill="#1B2B4B"/><circle cx="200" cy="200" r="11" fill="#fff" stroke="#1B2B4B" stroke-width="4"/></g>';
 const el=$('cmpr');el.innerHTML=g;el.classList.remove('grow');
 const n=el.querySelector('.ndl');n.style.transform='rotate(0deg)';
 const tgt=tops.length?ORDER.indexOf(tops[0])*60:0;
 setTimeout(()=>{n.style.transform='rotate('+(1080+tgt)+'deg)'},120);
 setTimeout(()=>el.classList.add('grow'),2400);
}
function result(){stop();
 const s=score(),vals=ORDER.split('').map(t=>s[t]),max=Math.max(...vals);
 const best=ORDER.split('').filter(t=>s[t]===max);
 let top=best.slice();
 if(top.length===1){const sec=Math.max(...vals.filter(v=>v<max)),two=ORDER.split('').filter(t=>s[t]===sec);if(two.length<=2)top=top.concat(two)}
 const flat=vals.every(v=>v===max);
 if(flat)top=[];
 show('res');
 compass(s,flat?[]:best);
 $('bars').innerHTML=ORDER.split('').map(t=>'<div class="bar" data-t="'+t+'"><span>'+TY[t].ic+' '+TY[t].f+' <small>'+TY[t].en+'</small></span><span>'+s[t]+' 分</span><div class="bt"><i style="background:'+TY[t].c+'" data-w="'+(s[t]/25*100)+'"></i></div></div>').join('');
 setTimeout(()=>document.querySelectorAll('.bt i').forEach(i=>i.style.width=i.dataset.w+'%'),80);
 const nm=top.map(t=>TY[t].ic+' '+TY[t].f).join('、');
 $('top').innerHTML=flat?'你六種興趣今天一樣多！':'你今天最常按「喜歡」的是：<br>'+nm;
 $('topsub').textContent=flat?'每一個方向都可以去看看，慢慢找出你最喜歡的。':max<=10?'今天好像都不太喜歡也沒關係，興趣會慢慢出現，多認識不同的工作就會發現。':'這些方向的職業，可以先去認識看看（不是一定要做這些工作喔）。';
 $('tops').innerHTML=top.map(t=>group(t,true)).join('');
 $('others').innerHTML=ORDER.split('').filter(t=>!top.includes(t)).map(t=>group(t,false)).join('');
 document.querySelectorAll('.dc').forEach(d=>d.classList.toggle('un',unlocked.has(d.dataset.e)));
 confetti();
 document.querySelectorAll('#tops .jt').forEach((a,i)=>setTimeout(()=>a.classList.add('on'),400+i*90));
 watchDemo();
}
/* ---- 職業圖鑑：示範動畫 ---- */
function playDemo(){const d=$('demo');d.classList.remove('go');void d.offsetWidth;d.classList.add('go')}
let demoSeen=false;
function watchDemo(){demoSeen=false;$('demo').classList.remove('go');
 try{const io=new IntersectionObserver(es=>{es.forEach(x=>{if(x.isIntersecting&&!demoSeen){demoSeen=true;playDemo();io.disconnect()}})},{threshold:.4});io.observe($('demo'))}catch(e){playDemo()}}
/* ---- 興趣成分＋音節 ---- */
const MED=['🥇','🥈','🥉'];
const HOWX=${JSON.stringify(HOW)};
function openSheet(e,sylMode){const w=WD[e],j=SC[e];
 let h='<button class="x" id="xbtn" aria-label="關閉">✕</button><div class="ph"><span class="pi">'+w[2]+'</span><div><div class="pe en" id="pe">'+colorWord(e)+'</div><div class="pz">'+w[1]+'</div></div><button class="b48" id="psay" aria-label="聽英文">🔊</button></div>';
 if(j){const s=j.s,arr=ORDER.split('').sort((a,b)=>s[b]-s[a]||ORDER.indexOf(a)-ORDER.indexOf(b)),mx=s[arr[0]],tops=arr.filter(t=>s[t]===mx);
  h+='<div class="pexp">🧪 <b>興趣成分</b>：每個工作都會用到六種興趣，只是多少不一樣。美國勞動部替每個工作的六種興趣打分數（0～100 分），分數越高，這個工作越常做這一型的事。</div><details class="hows"><summary>🤔 分數怎麼來的？</summary>'+HOWX+'</details><div class="pbars">'
   +arr.map(t=>{const rk=1+ORDER.split('').filter(u=>s[u]>s[t]).length;return '<div class="pb" style="--c:'+TY[t].c+'" data-t="'+t+'"><span class="md">'+(rk<=3?MED[rk-1]:'')+'</span><span class="pn2">'+TY[t].ic+' '+TY[t].f+'</span><span class="pt"><i data-w="'+s[t]+'"></i></span><span class="pv">'+s[t]+'</span></div>'}).join('')+'</div>'
   +'<p class="psay" id="psayt">'+w[1]+'最常做的是'+tops.map(t=>'『'+TY[t].f+'』').join('和')+'的事：'+tops.map(t=>TY[t].act).join('；')+'（'+(tops.length>1?'都是 ':'')+mx+' 分）。</p>'
   +(j.note?'<p class="pnote">※ '+j.note+'</p>':'')+(FUN[e]?'<p class="pfun">💡 '+FUN[e]+'</p>':'')
   +'<p class="pnote">資料：<a href="'+j.url+'" target="_blank" rel="noopener">O*NET '+j.code+'</a></p>'}
 else h+='<div class="pexp">這個工作還沒有自己的興趣分數。</div>';
 h+='<div class="syls" id="syls"><h3>✂️ 音節：這個字有幾拍？</h3><div class="sbtn"><button data-m="clap">👏 拍手</button><button data-m="train">🚂 音節火車</button><button data-m="cut">✂️ 剪刀</button></div><div class="syst" id="syst"></div><div class="sres" id="sres"></div></div>'
  +'<div class="plink"><a class="ghost" id="plink" href="story.html#w'+w[0]+'">📚 學這個字（單字卡）▶</a></div>';
 $('panel').innerHTML=h;$('sheet').classList.add('on');$('sheet').dataset.e=e;$('sheet').scrollTop=0;
 document.querySelectorAll('.pb').forEach((b,i)=>setTimeout(()=>{b.classList.add('on');const x=b.querySelector('i');x.style.width=x.dataset.w+'%'},200+i*260));
 sylStatic(e);
 if(sylMode){setTimeout(()=>{$('syls').scrollIntoView({block:'start'});playSyl(e,sylMode)},300)}else speak(e,1);
}
function closeSheet(){$('sheet').classList.remove('on');clearSyl();stop()}
let sylT=[];
function clearSyl(){sylT.forEach(clearTimeout);sylT=[]}
function later(f,ms){sylT.push(setTimeout(f,ms))}
function sylData(e){const ws=(SYL[e]||e).split(' ');let pos=0;return ws.map(w=>{const ps=w.split('-').map(s=>{const o={t:s,a:pos,b:pos+s.length};pos+=s.length;return o});pos+=1;return ps})}
function sylCount(e){return sylData(e).reduce((a,w)=>a+w.length,0)}
function sylText(e){return sylData(e).map(w=>w.map(s=>s.t).join(' · ')).join('　')}
function sylDone(e){$('sres').innerHTML='<span class="en">'+sylText(e)+'</span> ＝ '+sylCount(e)+' 個音節'}
function wordHTML(e,cut){return sylData(e).map(w=>'<span class="wd">'+w.map((s,i)=>(i&&cut?'<span class="cut"></span>':'')+'<span class="sy">'+colorRange(e,s.a,s.b)+'</span>').join('')+'</span>').join('<span class="wgap"></span>')}
function sylStatic(e){$('syst').className='syst';$('syst').innerHTML=wordHTML(e,false);$('sres').innerHTML='點上面的按鈕，看看這個字可以分成幾拍'}
function playSyl(e,m){clearSyl();const st=$('syst');st.className='syst';$('sres').innerHTML='';
 document.querySelectorAll('.sbtn button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
 speak(e,1);const n=sylCount(e);
 if(m==='clap'){st.innerHTML=wordHTML(e,true);
  later(()=>st.classList.add('cutting'),500);later(()=>st.classList.add('apart'),1000);
  const sy=[...st.querySelectorAll('.sy')];
  sy.forEach((x,k)=>later(()=>{x.classList.remove('beat');void x.offsetWidth;x.classList.add('beat');const c=document.createElement('span');c.className='clap';c.textContent='👏';x.appendChild(c);sfx.clap()},1500+k*650));
  later(()=>sylDone(e),1600+n*650)}
 else if(m==='train'){let k=0;
  st.innerHTML='<div class="train out" id="trn"><span class="eng">🚂</span>'+sylData(e).map(w=>w.map(s=>'<span class="car"><span class="nb">'+(++k)+'</span><span>'+colorRange(e,s.a,s.b)+'</span></span>').join('')).join('')+'</div>';
  const tr=st.querySelector('.train');later(()=>tr.classList.remove('out'),60);
  later(()=>tr.classList.add('apart'),1600);
  [...st.querySelectorAll('.nb')].forEach((b,i)=>later(()=>{b.classList.add('on');sfx.pop()},2200+i*500));
  later(()=>sylDone(e),2300+n*500)}
 else{st.innerHTML=wordHTML(e,false)+'<span class="sci" id="sci">✂️</span>';
  const sci=st.querySelector('.sci'),sy=[...st.querySelectorAll('.sy')],box=st.getBoundingClientRect();
  sci.style.left='4%';
  const ends=[];let idx=0;sylData(e).forEach(w=>{w.forEach((s,i)=>{if(i>0)ends.push(sy[idx]);idx++})});
  if(!ends.length){later(()=>{sci.style.left='96%'},300);later(()=>{$('sres').innerHTML='只有 1 個音節，不用剪！'},900);later(()=>sylDone(e),1500);return}
  ends.forEach((x,k)=>{later(()=>{const r=x.getBoundingClientRect();sci.style.left=(r.left-box.left)+'px'},400+k*800);
   later(()=>{st.querySelectorAll('.snip').forEach(o=>o.remove());const r=x.getBoundingClientRect(),s=document.createElement('span');s.className='snip';s.textContent='喀擦！';s.style.left=(r.left-box.left)+'px';st.appendChild(s);sfx.snip();x.style.marginLeft='.3em'},800+k*800)});
  later(()=>{sci.style.left='96%';st.classList.add('split')},900+ends.length*800);
  later(()=>sylDone(e),1500+ends.length*800)}
}
/* ---- 事件 ---- */
$('go').onclick=start;$('again').onclick=start;
$('sail').onclick=()=>{cur=0;show('quiz');render()};
document.querySelectorAll('.fc').forEach(b=>b.onclick=()=>pick(+b.dataset.v));
$('next').onclick=next;
$('back').onclick=()=>{if(cur>0){cur--;render()}};
$('say').onclick=()=>{const k=cur;speak(ITEMS[k].e,1,()=>unlock(k))};
$('chal').onclick=chal;$('csay').onclick=sayC;$('cnext').onclick=chNext;$('cont').onclick=cont;
$('copts').onclick=ev=>{const b=ev.target.closest('.copt');if(b&&!b.disabled)chPick(b)};
$('replay').onclick=playDemo;
document.addEventListener('click',ev=>{
 const sb=ev.target.closest('.say1');if(sb){ev.stopPropagation();speak(sb.dataset.e,1);return}
 const yb=ev.target.closest('.sylb');if(yb){ev.stopPropagation();openSheet(yb.dataset.e,'clap');return}
 const dc=ev.target.closest('.dc,#res button.jt');if(dc){openSheet(dc.dataset.e);return}
});
document.addEventListener('keydown',ev=>{const dc=ev.target.closest&&ev.target.closest('.dc');if(dc&&(ev.key==='Enter'||ev.key===' ')&&ev.target===dc){ev.preventDefault();openSheet(dc.dataset.e)}
 if(ev.key==='Escape'&&$('sheet').classList.contains('on'))closeSheet()});
$('sheet').addEventListener('click',ev=>{if(ev.target.id==='sheet'||ev.target.closest('#xbtn')){closeSheet();return}
 if(ev.target.closest('#psay')){speak($('sheet').dataset.e,1);return}
 const m=ev.target.closest('.sbtn button');if(m)playSyl($('sheet').dataset.e,m.dataset.m)});
$('evgo').onclick=e=>{e.preventDefault();$('ev').open=true;$('ev').scrollIntoView()};
function evHash(){if(location.hash==='#ev'){$('ev').open=true;setTimeout(()=>$('ev').scrollIntoView(),50)}}
evHash();addEventListener('hashchange',evHash);
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'quiz.html'), html);
console.log('quiz.html 完成：' + ITEMS.length + ' 題、解鎖職業 ' + QJOBS.length + ' 個、結果頁職業 ' + ORDER.split('').map(t => t + JOBS[t].length).join(' ')
  + '、圖鑑 ' + ORDER.split('').map(t => t + DEX[t].length).join(' ') + '、也可以認識 ' + EXTRA.length + ' 個');
