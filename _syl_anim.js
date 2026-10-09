// 音節動畫（jobdex.html 的職業圖鑑、quiz.html 的職業圖鑑共用；_build_jobdex.js、_build_quiz.js 會把 CSS、JS 放進網頁）
// 2026/10/9 使用者要求：
//   ① 數母音：紅色母音一個一個亮，頭上跳 ①②③ ➜「N 個母音的聲音 ＝ N 拍」（每一個母音，可以切成一個音節）
//   ② 切開：一刀一刀切，每一刀說「為什麼切在這裡」（_syl_why.js）
//   ③ 一節一節唸：唸到哪一節，那一節的字母放大、變亮，唸出那一節的聲音（audio/syl，照 Cambridge 音標錄好，_syl_audio.py）
//   ④ 最後唸整個字
//   🚂 火車車廂沒有輪子。三種玩法（👏 拍手、🚂 火車、✂️ 剪刀）走同一套四步，只有切開、唸的時候的樣子不一樣。
// 音節的切法沿用網站的 SYL（2026/10/9 使用者決定）。
const CSS = `
.sa{display:flex;flex-direction:column;gap:12px}
.sa-btn{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.sa-btn button{min-height:64px;padding:0 24px;border-radius:18px;border:2px solid var(--navy,#1B2B4B);background:#fff;color:var(--navy,#1B2B4B);font-size:var(--t2,22px);font-weight:700;cursor:pointer}
.sa-btn button.on{background:var(--navy,#1B2B4B);color:#fff}
.sa-btn button:active{transform:scale(.96)}
.sa-stage{position:relative;min-height:clamp(170px,26vh,250px);border-radius:18px;background:#F4F6FA;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:0 .7em;padding:56px 12px 24px;overflow:hidden;font-family:'AndikaEmbed',sans-serif;font-weight:700;font-size:clamp(36px,calc(18px + 2.6vw),64px);line-height:1.1;color:#1B2B4B}
.sa-w{display:inline-flex;align-items:flex-end;white-space:nowrap}
.sa-s{position:relative;display:inline-flex;align-items:flex-end;padding:.06em .04em;border-radius:.2em;transition:transform .35s cubic-bezier(.3,1.5,.5,1),filter .3s,background .3s,margin .45s cubic-bezier(.3,1.4,.5,1),box-shadow .3s;transform-origin:50% 80%}
.sa-l{display:inline-block;transition:transform .3s cubic-bezier(.3,1.6,.5,1),text-shadow .3s}
.sa-l.lv{color:#D7362F}.sa-l.lg{color:#8C93A3;background:#E4E7ED;border-radius:6px;padding:0 2px}
.sa-l.vo{transform:translateY(-.12em) scale(1.25);text-shadow:0 0 .35em rgba(255,90,90,.55)}
.sa-n{position:absolute;bottom:100%;left:50%;transform:translate(-50%,-.1em) scale(0);font-family:"PingFang TC","Noto Sans TC",sans-serif;font-size:max(18px,.5em);width:1.6em;height:1.6em;border-radius:50%;background:#D7362F;color:#fff;display:flex;align-items:center;justify-content:center;transition:transform .35s cubic-bezier(.3,1.8,.5,1);pointer-events:none}
.sa-n.on{transform:translate(-50%,-.1em) scale(1)}
.sa-stage.apart .sa-s+.sa-s{margin-left:.38em}
.sa-cut{position:absolute;top:8%;bottom:8%;width:0;border-left:4px dashed #D9A520;transform:scaleY(0);transition:transform .35s;pointer-events:none}
.sa-cut.on{transform:scaleY(1)}
.sa-s.now{transform:scale(1.32);filter:brightness(1.15) saturate(1.3);background:#FFF3C4;box-shadow:0 0 0 .08em #D9A520,0 0 .6em rgba(217,165,32,.7);z-index:2}
.sa-s.dim{opacity:.45}
.sa-stage.all .sa-s{transform:scale(1.12);background:#FFF3C4}
.sa-pop{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:.7em;pointer-events:none;animation:saPop .7s ease both}
@keyframes saPop{0%{opacity:0;transform:translate(-50%,12px) scale(.4)}45%{opacity:1;transform:translate(-50%,0) scale(1.25)}100%{opacity:0;transform:translate(-50%,-14px) scale(1)}}
.sa-sci{position:absolute;bottom:2px;font-size:.75em;line-height:1;transform:translateX(-50%) rotate(-90deg);transition:left .5s ease;pointer-events:none}
.sa-snip{position:absolute;bottom:.15em;font-family:"PingFang TC",sans-serif;font-size:max(18px,.34em);color:#8A6408;font-weight:700;transform:translateX(-50%);animation:saPop 1s ease both;pointer-events:none}
.sa-train .sa-s{background:#fff;border:3px solid #1B2B4B;border-radius:12px 12px 6px 6px;padding:.08em .18em .04em;margin-left:-3px}
.sa-train .sa-s+.sa-s::before{content:'';position:absolute;right:100%;bottom:.25em;width:.3em;height:4px;background:#1B2B4B}
.sa-train.apart .sa-s+.sa-s::before{opacity:0}
.sa-train .sa-eng{font-size:1.15em;line-height:1;margin-right:.08em;display:inline-block}
.sa-train.go .sa-eng{animation:saChug .5s ease-in-out infinite}
@keyframes saChug{50%{transform:translateY(-.06em) rotate(-3deg)}}
.sa-train .sa-s.now{background:#FFF3C4}
.sa-msg{min-height:2.6em;text-align:center;font-size:var(--t2,22px);font-weight:700;line-height:1.35;color:#1B2B4B}
.sa-msg b{color:#D7362F;font-size:1.25em}
.sa-msg .en{font-family:'AndikaEmbed',sans-serif}
.sa-why{margin:0;padding:16px 20px;border-radius:16px;background:#FFF8E3;border:1px dashed #D9A520;font-size:var(--t3,18px);line-height:1.5;list-style:none;display:flex;flex-direction:column;gap:6px}
.sa-why li{display:flex;gap:10px;align-items:baseline}
.sa-why .k{flex:none;font-family:'AndikaEmbed',sans-serif;font-weight:700;white-space:nowrap}
.sa-why .k i{font-style:normal;color:#D9A520}
.sa-why h4{margin:0 0 4px;font-size:var(--t3,18px)}
@media (prefers-reduced-motion:reduce){.sa-s.now{transform:none}}
`;
const JS = String.raw`
/* 音節動畫（_syl_anim.js；jobdex、quiz 共用） */
var SA=(function(){
 var T=[],au=null,tok=0;
 function later(f,ms){T.push(setTimeout(f,ms))}
 function stop(){T.forEach(clearTimeout);T=[];tok++;try{if(au){au.pause()}}catch(e){}}
 /* 錄好的聲音（audio/syl/aud.js 的 SYLAUD）；沒有就用裝置語音 */
 function play(key,fallback,say,done){var my=tok,fin=false;var end=function(){if(fin)return;fin=true;clearTimeout(t);if(my===tok&&done)done()};
  var A=window.SYLAUD&&window.SYLAUD[key],t=setTimeout(end,A?A[1]*1000+1800:6000);
  if(!A){if(say)say(fallback,end);else setTimeout(end,600);return}
  try{if(!au)au=new Audio();au.onended=end;au.onerror=function(){if(say)say(fallback,end);else end()};au.src=(window.SYLDIR||'audio/syl/')+A[0];var p=au.play();if(p&&p.catch)p.catch(function(){if(say)say(fallback,end);else end()})}catch(e){end()}}
 function letter(o,i){var c=o.e[i];var k=o.g.indexOf(i)>-1?' lg':o.v.indexOf(i)>-1?' lv':'';return '<span class="sa-l'+k+'" data-i="'+i+'">'+c+'</span>'}
 /* 音節資料：[[{t,a,b}...每個字], ...] */
 function parts(o){var pos=0;return o.syl.split(' ').map(function(w){var ps=w.split('-').map(function(s){var r={t:s,a:pos,b:pos+s.length};pos+=s.length;return r});pos++;return ps})}
 /* 每一節的母音（連在一起的紅色字母算一個聲音） */
 function vgroups(o,P){var G=[];P.forEach(function(w){w.forEach(function(s){var cur=null;for(var i=s.a;i<s.b;i++){if(o.v.indexOf(i)>-1){if(cur&&cur[cur.length-1]===i-1)cur.push(i);else{cur=[i];G.push(cur)}}else cur=cur&&o.g.indexOf(i)>-1?cur:null}})});return G}
 function count(o){var n=0;parts(o).forEach(function(w){n+=w.length});return n}
 function text(o){return parts(o).map(function(w){return w.map(function(s){return s.t}).join(' · ')}).join('　')}
 function whyHTML(o){if(!o.why||!o.why.length)return '<div class="sa-why"><h4>🤔 為什麼這樣切？</h4><div>'+(count(o)===1?'只有 1 個母音的聲音 ➜ 1 拍，不用切。':'每一個字自己唸，一個字一拍。')+'</div></div>';
  return '<ul class="sa-why"><h4>🤔 為什麼這樣切？</h4>'+o.why.map(function(c){return '<li><span class="k">'+c.l+'<i>｜</i>'+c.r+'</span><span>'+c.why+'</span></li>'}).join('')+'</ul>'}
 /* 畫字：mode = clap／train／cut */
 function draw(st,o,mode){var P=parts(o),k=0,h='';
  P.forEach(function(w,wi){h+='<span class="sa-w">'+(mode==='train'&&wi===0?'<span class="sa-eng">🚂</span>':'');
   w.forEach(function(s){var x='';for(var i=s.a;i<s.b;i++)x+=letter(o,i);h+='<span class="sa-s" data-k="'+(k++)+'">'+x+'</span>'});h+='</span>'});
  st.className='sa-stage'+(mode==='train'?' sa-train':'');st.innerHTML=h;return P}
 /* o = {e 單字, syl 音節(doc-tor), v 母音位置, g 不發音位置, why 每一刀的原因, key 鑰匙用的字, say(文字,做完), sfx{pop,snip,clap,drum}} */
 function run(root,o,mode){stop();var my=tok;var st=root.querySelector('.sa-stage'),msg=root.querySelector('.sa-msg'),wb=root.querySelector('.sa-whybox');
  var sfx=o.sfx||{},fx=function(n){try{sfx[n]&&sfx[n]()}catch(e){}};
  [].forEach.call(root.querySelectorAll('.sa-btn button'),function(b){b.classList.toggle('on',b.getAttribute('data-m')===mode)});
  var P=draw(st,o,mode),S=[].slice.call(st.querySelectorAll('.sa-s')),n=S.length,ST=[].concat.apply([],P.map(function(w){return w.map(function(s){return s.t})})),G=vgroups(o,P),key=(o.key||o.e).toLowerCase();
  if(wb)wb.innerHTML='';var t=300,dj=!G.length;
  msg.innerHTML='👀 找一找：紅色的字母是<b style="font-size:1em">母音</b>';
  /* ① 數母音 */
  t+=900;
  if(dj){S.forEach(function(s,i){later(function(){var b=document.createElement('span');b.className='sa-n';b.textContent=i+1;s.appendChild(b);void b.offsetWidth;b.classList.add('on');fx('pop');msg.innerHTML='<span class="en">'+ST[i]+'</span> 是一個字母，自己一拍'},t+i*800)});t+=n*800}
  else G.forEach(function(g,i){later(function(){g.forEach(function(x){var l=st.querySelector('.sa-l[data-i="'+x+'"]');if(l)l.classList.add('vo')});
   var first=st.querySelector('.sa-l[data-i="'+g[0]+'"]'),last=st.querySelector('.sa-l[data-i="'+g[g.length-1]+'"]');
   var b=document.createElement('span');b.className='sa-n';b.textContent=i+1;first.style.position='relative';
   if(g.length>1){b.style.left='calc(50% + '+((last.offsetLeft+last.offsetWidth-first.offsetLeft)/2-first.offsetWidth/2)+'px)'}
   first.appendChild(b);void b.offsetWidth;b.classList.add('on');fx('pop');
   msg.innerHTML='紅色母音：<b>'+(i+1)+'</b> 個'+(g.length>1?'（<span class="en">'+g.map(function(x){return o.e[x]}).join('')+'</span> 一起唸，算 1 個聲音）':'')},t+i*800)});
  if(!dj)t+=G.length*800;
  later(function(){msg.innerHTML=dj?'<b>'+n+'</b> 個字母 ＝ <b>'+n+'</b> 拍':'<b>'+G.length+'</b> 個母音的聲音 ＝ <b>'+n+'</b> 拍'+(n>1?'<br>每一拍有 1 個母音，所以可以切成 '+n+' 段':'<br>只有 1 個母音 ➜ 1 拍，不用切')},t);t+=1900;
  /* ② 切開 */
  var cuts=o.why||[],ci=0;
  S.forEach(function(s,i){if(i===0)return;var prevW=S[i-1].parentNode,sameW=prevW===s.parentNode;if(!sameW)return;
   var c=cuts[ci++];later(function(){if(my!==tok)return;
    st.classList.add('apart');
    if(mode==='cut'){var sc=st.querySelector('.sa-sci');if(!sc){sc=document.createElement('span');sc.className='sa-sci';sc.textContent='✂️';st.appendChild(sc)}
     var r=s.getBoundingClientRect(),b=st.getBoundingClientRect();sc.style.left=(r.left-b.left-6)+'px';
     later(function(){var sn=document.createElement('span');sn.className='sa-snip';sn.textContent='喀嚓！';sn.style.left=(s.getBoundingClientRect().left-st.getBoundingClientRect().left-6)+'px';st.appendChild(sn);fx('snip')},450)}
    else fx(mode==='train'?'clank':'pop');
    s.style.marginLeft='.55em';
    msg.innerHTML=c?'<span class="en">'+c.l+' ｜ '+c.r+'</span><br>'+c.why:'切開';},t);t+=2600});
  if(n>1)later(function(){var sc=st.querySelector('.sa-sci');if(sc)sc.remove()},t);
  /* ③ 一節一節唸 */
  later(function(){if(my!==tok)return;msg.innerHTML=n>1?'一節一節唸 🔊':'唸唸看 🔊';if(mode==='train')st.classList.add('go');var k=0;
   var step=function(){if(my!==tok)return;S.forEach(function(x){x.classList.remove('now','dim')});
    if(k>=n){/* ④ 整個字 */st.classList.add('all');msg.innerHTML='<span class="en">'+text(o)+'</span> ＝ <b>'+n+'</b> 拍 '+(mode==='clap'?'👏'.repeat(Math.min(n,7)):mode==='train'?'🚃'.repeat(Math.min(n,7)):'');
     play('word '+key,o.e,o.say,function(){st.classList.remove('all','go');if(wb)wb.innerHTML=whyHTML(o);if(o.done)o.done(n)});return}
    var s=S[k];S.forEach(function(x,j){if(j!==k)x.classList.add('dim')});s.classList.add('now');
    var pop=document.createElement('span');pop.className='sa-pop';pop.textContent=mode==='clap'?'👏':mode==='train'?'🚃':'✂️';s.appendChild(pop);setTimeout(function(){pop.remove()},800);
    fx(mode==='clap'?'clap':'drum');msg.innerHTML='第 <b>'+(k+1)+'</b> 拍：<span class="en" style="font-size:1.3em">'+ST[k]+'</span>';
    var fb=ST[k];k++;
    play(n>1?'syl '+key+' '+(k-1):'word '+key,fb,o.say,function(){later(step,n>1?350:150)})};
   step()},t)}
 /* 放進一個盒子：三個按鈕＋舞台＋說明 */
 function box(o){return '<div class="sa"><div class="sa-btn"><button data-m="clap">👏 拍手</button><button data-m="train">🚂 音節火車</button><button data-m="cut">✂️ 剪刀</button></div><div class="sa-stage"></div><div class="sa-msg"></div><div class="sa-whybox"></div></div>'}
 function mount(root,o){root.innerHTML=box(o);var P=draw(root.querySelector('.sa-stage'),o,'clap');root.querySelector('.sa-msg').innerHTML='點上面的按鈕，看這個字有幾拍、怎麼切';
  root.querySelector('.sa-whybox').innerHTML=whyHTML(o);
  root.querySelector('.sa-btn').addEventListener('click',function(ev){var b=ev.target.closest('button');if(b)run(root,o,b.getAttribute('data-m'))})}
 return {mount:mount,run:run,stop:stop,count:count,text:text,play:play,parts:parts,vgroups:vgroups}})();
`;
module.exports = { CSS, JS };
