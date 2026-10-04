// 產生 rank-tw.html（2026 台灣中小學生最喜歡的職業前 10 名＋證據）：node _build_rank.js
// 名次與職業名稱一字不差照國語日報社官方統計圖（2026/4/4）。官方只公布名次，沒有百分比，所以不寫百分比。
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const story = fs.readFileSync(path.join(dir, 'story.html'), 'utf8');
const font = story.match(/@font-face\{[^}]*\}/)[0];
const tw = story.match(/\.tw\{[^}]*\}/)[0];
const W = Object.fromEntries([...story.matchAll(/\{no:(\d+),e:'([^']+)',z:'[^']+',ic:'([^']+)'/g)].map(m => [m[2], { no: +m[1], ic: m[3] }]));

const SRC = {
  es: 'https://www.mdnkids.com/content.asp?Link_String_=244400000BLIDTX',
  ms: 'https://www.mdnkids.com/content.asp?Link_String_=244400000UZWLSC',
  esImg: 'https://www.mdnkids.com/upload/images/20260404-16-01.jpg',
  msImg: 'https://www.mdnkids.com/upload/images/20260404-15-01.jpg',
};
// [名次, 國語日報原文類別, 英文, 有單字卡就用卡片的字]
const ES = [
  [1, '職業運動員', 'professional athlete'],
  [2, '電競選手', 'esports player'],
  [3, '直播主／網紅／Podcaster／YouTuber', 'influencer'],
  [4, '醫師', 'doctor'],
  [5, '麵包糕點師', 'baker'],
  [6, '程式設計師（如App、線上遊戲）', 'programmer'],
  [7, '畫家／插畫家／漫畫家／電腦動畫', 'painter'],
  [8, '歌手／樂團／演員', 'singer'],
  [9, '電腦工程師', 'computer engineer'],
  [10, '髮型師／造型師／美甲師', 'hairstylist'],
];
const MS = [
  [1, '職業運動員', 'professional athlete'],
  [2, '機械工程師', 'mechanical engineer', '⚙️'],
  [3, '醫師', 'doctor'],
  [4, '畫家／插畫家／漫畫家／電腦動畫', 'painter'],
  [4, '廚師', 'chef', '🧑‍🍳'],
  [6, '程式設計師（如App、線上遊戲）', 'programmer'],
  [7, '心理輔導師', 'counselor'],
  [7, '麵包糕點師', 'baker'],
  [9, '獸醫', 'veterinarian'],
  [9, '電腦工程師', 'computer engineer'],
];
const count = l => l.reduce((a, r) => (a[r[0]] = (a[r[0]] || 0) + 1, a), {});
const row = (r, ties) => {
  const c = W[r[2]], ic = c ? c.ic : r[3];
  if (!ic) throw new Error('沒有圖示：' + r[2]);
  const tie = ties[r[0]] > 1 ? '<span class="tie">並列</span>' : '';
  const go = c ? `<a class="go" href="story.html#w${c.no}" aria-label="${r[2]} 單字卡">單字卡 ▶</a>` : '<span class="nocard">還沒有單字卡</span>';
  return `<div class="row${r[0] <= 3 ? ' top' : ''}"><span class="rk">${r[0]}${tie}</span><span class="ic">${ic}</span>`
    + `<span class="tx"><span class="zh">${r[1]}</span><button class="en" data-e="${r[2]}" aria-label="聽 ${r[2]}">🔊 ${r[2]}</button></span>${go}</div>`;
};
const list = (title, n, l, src, img) => `<section class="list">
 <h2>${title}<small>${n} 人填答</small></h2>
 ${l.map(r => row(r, count(l))).join('\n ')}
 <div class="lf">📋 <a href="${img}" target="_blank" rel="noopener">看國語日報的原始統計圖</a>　📰 <a href="${src}" target="_blank" rel="noopener">看原始報導</a></div>
</section>`;

const html = `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>台灣中小學生夢幻職業</title>
<style>
${font}
:root{--bg:#FFF7E8;--card:#fff;--ink:#23201C;--soft:#7A7166;--line:#F0E2C8;--blue:#2F6FDE;--navy:#15233A;--gold:#FFD24A}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:'AndikaEmbed',"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;-webkit-text-size-adjust:100%;overflow-x:hidden}
${tw}
.app{max-width:1100px;margin:0 auto;padding:16px 16px 40px}
.homeln{display:inline-flex;align-items:center;min-height:48px;padding:0 16px;border-radius:14px;border:3px solid var(--line);background:#fff;color:var(--ink);font-size:20px;font-weight:700;text-decoration:none}
.hero{margin-top:12px;background:var(--navy);color:#fff;border-radius:24px;padding:18px 16px;text-align:center}
.hero h1{margin:0;font-size:30px;color:var(--gold);line-height:1.35}
.hero .who{font-size:19px;margin-top:8px;color:#DCE4F0;line-height:1.6}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:14px;margin-top:14px}
.list{background:var(--card);border:3px solid var(--line);border-radius:24px;padding:14px}
h2{margin:0 0 10px;font-size:26px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
h2 small{font-size:17px;font-weight:400;color:var(--soft)}
.row{display:grid;grid-template-columns:52px 46px 1fr auto;align-items:center;gap:8px;padding:8px 4px;border-top:2px dashed var(--line)}
.row .rk{display:flex;flex-direction:column;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:var(--bg);font-size:24px;font-weight:700;line-height:1}
.row.top .rk{background:var(--gold)}
.tie{font-size:12px;font-weight:400;margin-top:2px}
.row .ic{font-size:36px;text-align:center}
.tx{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0}
.zh{font-size:21px;font-weight:700;line-height:1.35}
.en{font:inherit;font-size:18px;color:var(--blue);background:none;border:0;padding:6px 0;min-height:40px;cursor:pointer;text-align:left}
.go{display:inline-flex;align-items:center;min-height:48px;padding:0 12px;border-radius:14px;background:#FFE3D6;color:#B03A10;font-size:17px;font-weight:700;text-decoration:none;white-space:nowrap}
.nocard{font-size:15px;color:var(--soft);white-space:nowrap}
.lf{margin-top:10px;font-size:17px;line-height:1.8}
.lf a,.ev a{color:var(--blue)}
.ev{margin-top:14px;background:#DCF0C8;border-radius:24px;padding:16px}
.ev h2{color:#2C6010}
.ev ol{margin:0;padding-left:1.4em;font-size:19px;line-height:1.7}
.ev li{margin-bottom:10px}
.ev .k{font-weight:700}
.ev .src{display:block;font-size:16px;color:var(--soft)}
@media (max-width:520px){
 .hero h1{font-size:25px}
 .row{grid-template-columns:44px 38px 1fr;}
 .row .rk{width:42px;height:42px;font-size:21px}
 .row .ic{font-size:30px}
 .row .go,.row .nocard{grid-column:3;justify-self:start}
 .zh{font-size:19px}
}
</style>
</head>
<body>
<main class="app">
<a class="homeln" href="index.html">🏠 首頁</a>
<div class="hero">
 <h1><i class="tw"></i> 2026 台灣中小學生<br>最想做的工作 前 10 名</h1>
 <div class="who">國語日報社「兒少大未來」職業探索問卷調查<br>2026 年 4 月 4 日（兒童節）公布</div>
</div>
<div class="cols">
${list('🎒 小學生', '1,286', ES, SRC.es, SRC.esImg)}
${list('🏫 中學生', '296', MS, SRC.ms, SRC.msImg)}
</div>
<section class="ev">
 <h2>🔎 怎麼知道是真的？</h2>
 <ol>
  <li><span class="k">📋 原始出處：</span>國語日報社自己公布的統計圖（上面兩個「原始統計圖」連結），名次和職業名稱一字不差照抄。
   <span class="src">小學生組、中學生組各一張，2026/4/4 刊在國語日報網站</span></li>
  <li><span class="k">🗓️ 怎麼調查：</span>2026 年 3 月 5～25 日網路線上問卷，有效 1,582 份（小學生 1,286、中學生 296），名次不分男女。
   <span class="src">出處：<a href="${SRC.es}" target="_blank" rel="noopener">國語日報</a>、<a href="https://www.cna.com.tw/news/ahel/202604040056.aspx" target="_blank" rel="noopener">中央社</a></span></li>
  <li><span class="k">📰 四家媒體都這樣報：</span>同一天報導，名次都一樣。
   <span class="src"><a href="https://www.cna.com.tw/news/ahel/202604040056.aspx" target="_blank" rel="noopener">中央社</a>｜<a href="https://money.udn.com/money/story/7307/9422051" target="_blank" rel="noopener">經濟日報</a>｜<a href="https://news.ltn.com.tw/news/life/breakingnews/5392947" target="_blank" rel="noopener">自由時報</a>｜<a href="https://news.pts.org.tw/article/802174" target="_blank" rel="noopener">公視新聞</a></span></li>
  <li><span class="k">🤝 「並列」：</span>國語日報的統計圖上，中學生第 4、7、9 名各有兩個職業並列，所以名次跳過第 5、8、10 名。</li>
  <li><span class="k">✂️ 名稱照原文：</span>新聞只寫「網紅」「造型師」，國語日報原始統計圖寫的是「直播主／網紅／Podcaster／YouTuber」「髮型師／造型師／美甲師」，本頁照原始統計圖。</li>
  <li><span class="k">🔢 沒有百分比：</span>國語日報只公布名次，沒有公布每個職業幾 %，所以本頁不寫百分比。</li>
  <li><span class="k">👀 看清楚：</span>這是 1,582 位上網填問卷的同學的答案，不是全臺灣每一個學生。</li>
 </ol>
</section>
</main>
<script>
document.addEventListener('click',e=>{const b=e.target.closest('.en');if(!b)return;
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(b.dataset.e);u.lang='en-US';u.rate=.8;speechSynthesis.speak(u)}catch(x){}});
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'rank-tw.html'), html);
console.log('rank-tw.html 完成：小學生 ' + ES.length + ' 列、中學生 ' + MS.length + ' 列');
