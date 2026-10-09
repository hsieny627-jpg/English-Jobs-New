/* jobdex.html 的程式（node _build_jobdex.js 會把它放進 jobdex.html；資料在 D）
   遊戲框架照參考頁 AI-Agent-Open-Code/sentences/games.html：
   ⏳ 每一場（2026/10/9 使用者改成 1 分 30 秒）、⏱ 每一題 15 秒、答對 100 ＋ 速度（剩幾秒 ÷ 總秒數 ✕ 900）＋ 連對 ✕ 20，再乘驚喜卡倍數；
   連對 3 題開驚喜卡（二選一 40%、三選一 30%、四選一 20%、五選一 10%）；答錯 ➜ 整頁看清楚（唸 3 次、倒數 8 秒）➜ ⭐ 加分（再看 8 秒 ➜ 同一題再玩一次，答對 500 ✕ 2）；
   答錯的題目過 2～3 題再出一次；結束 ➜ 答錯整理 ➜ 成績（Google 成績表）。
   2026/10/9 使用者決定：答錯頁、驚喜卡、加分視窗的時間都不算進那 1 分 30 秒；一直在動的遊戲（磁鐵、黑夜、忍者、火山）答對的算式在旁邊飄出來，不停下來。 */
'use strict';
const {TY,ORDER,J,BOOK,ITEMS,META,SURP,SKIN,JOKE,OPENA,HOW}=D;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem('jx_'+k)||'null');localStorage.setItem('jx_'+k,JSON.stringify(v))}catch(e){return null}}
const REDUCE=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
function fixBar(){const b=$('#bar');if(b)document.documentElement.style.setProperty('--barH',b.offsetHeight+'px')}
fixBar();addEventListener('resize',fixBar);setTimeout(fixBar,400);
const ALL=Object.keys(J);
const LIST_ITEMS=[...new Set(ITEMS.map(i=>i.e))];

/* ── 母音紅、不發音灰（資料：story.html 的 VOW、SILENT，已對 Cambridge 美式音標） ── */
function ch(e,i){const c=e[i];if(c===' ')return '<span class="sp"> </span>';const j=J[e];
 return j.g.indexOf(i)>-1?'<span class="lg">'+c+'</span>':j.v.indexOf(i)>-1?'<span class="lv">'+c+'</span>':c}
function colorWord(e){let o='';for(let i=0;i<e.length;i++)o+=ch(e,i);return o}
function colorRange(e,a,b){let o='';for(let i=a;i<b;i++)o+=ch(e,i);return o}
const en=e=>'<span class="en">'+colorWord(e)+'</span>';
function sylData(e){const ws=J[e].syl.split(' ');let pos=0;return ws.map(w=>{const ps=w.split('-').map(s=>{const o={t:s,a:pos,b:pos+s.length};pos+=s.length;return o});pos+=1;return ps})}
function sylCount(e){return sylData(e).reduce((a,w)=>a+w.length,0)}
function sylText(e){return sylData(e).map(w=>w.map(s=>s.t).join(' · ')).join('　')}
function sylColor(e,sep){return sylData(e).map(w=>w.map(s=>colorRange(e,s.a,s.b)).join(sep)).join('　')}
function topsOf(e){return J[e].top||[]}
const tyName=t=>TY[t].ic+' '+TY[t].f;

/* ── 聲音（裝置內建 en-US 語音；照參考頁：語速 0.5～1.0；最多 8 秒保險） ── */
let RATE=0.9,VOX=null,sayTok=0;
function setRate(r){r=parseFloat(r);if(!(r>0))r=0.9;RATE=clamp(r,0.5,1);return RATE}
function pickVoice(){try{const v=speechSynthesis.getVoices();if(!v||!v.length)return;let off=false;try{off=navigator.onLine===false}catch(e){}
 const us=v.filter(x=>/en[-_]US/i.test(x.lang)&&(!off||x.localService));VOX=us.find(x=>x.localService)||us[0]||v.find(x=>/^en/i.test(x.lang))||null}catch(e){}}
try{pickVoice();speechSynthesis.onvoiceschanged=pickVoice}catch(e){}
function say(t,done){const tok=++sayTok;let fin=false;const end=()=>{if(fin)return;fin=true;clearTimeout(st);if(tok===sayTok&&done)done()};const st=setTimeout(end,8000);
 try{const ss=window.speechSynthesis;ss.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='en-US';if(VOX)u.voice=VOX;u.rate=RATE;u.onend=end;u.onerror=end;ss.speak(u)}catch(e){setTimeout(end,10)}}
function sayStop(){sayTok++;try{speechSynthesis.cancel()}catch(e){}}
let AC=null;
function tone(fs,dur,type,vol){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const t0=AC.currentTime;
 fs.forEach((f,k)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.value=f;o.connect(g);g.connect(AC.destination);
 const s=t0+k*dur*.8;g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(vol||.15,s+.02);g.gain.exponentialRampToValueAtTime(.001,s+dur);o.start(s);o.stop(s+dur+.05)})}catch(e){}}
const sfx={ok:()=>tone([660,880,1320],.16,'triangle'),no:()=>tone([220,170],.22,'square',.06),tick:()=>tone([1000],.05,'square',.04),wow:()=>tone([523,659,784,1047,1319],.14,'triangle',.13),
 snip:()=>tone([1600,900],.05,'sawtooth',.07),drum:()=>tone([110,80],.12,'sine',.35),clank:()=>tone([300,600],.08,'square',.06),whoosh:()=>tone([400,800,1200],.05,'sine',.05),
 jump:()=>tone([330,520],.1,'triangle',.1),pop:()=>tone([520,780],.12,'triangle',.12),clap:()=>tone([180],.08,'square',.08)};

/* ══ 引擎（照參考頁 games.html） ══ */
const QT=15,GT=90;
let G=null,gid=null,BK='all',ended=true,gLeft=GT,gPause=0,qOn=false,left=QT,qt=QT,cur=null,queue=[],DECK=[];
let score=0,streak=0,best=0,right=0,wrong=0,asked=0,speedSum=0,shield=0,timeAdd=0,opened=[],lastGain=0;
let mult=1,multLeft=0,fastV=0,hintNext=0,goldNext=0,freezeNext=0,frozenLeft=0,combo=null,rainN=0,rainV=0;
let wrongList=[],busy=false,bonusMode=false,pool=[],skinQ=[],jokeQ=[],cdOn=false;
let GQ=[],GSEEN=[],GSIM=[],gFix=0,gT0=0,gQi=0,gFirst=false;
const A=()=>$('#arena');
function W(){return A().clientWidth}function H(){return A().clientHeight}

function vOf(e){return e.k==='lucky'?(e.got||0):e.v}
function eBig(e){const v=e.v;
 if(e.k==='pts')return '＋'+v+' 分';if(e.k==='lucky')return '🧧 ＋'+(e.got||0);if(e.k==='now')return '這一題 ✕ '+v;
 if(e.k==='mul')return v[1]===1?'💣 下一題 ✕ '+v[0]:'分數 ✕ '+v[0];if(e.k==='slot')return '🎰 ＋'+(e.got||0);if(e.k==='gt')return '⏳ 整場 ＋'+v+' 秒';
 if(e.k==='pct')return '📈 總分 ＋'+v+'%';if(e.k==='dbl')return '💥 總分翻倍';if(e.k==='rain')return '🌧 分數雨';if(e.k==='time')return '⏰ ＋'+v+' 秒';
 if(e.k==='shield')return v>1?'🛡🛡 兩面免死金牌':'🛡 免死金牌';if(e.k==='combo')return '🔗 連對 '+v[0]+' ➜ ✕ '+v[1];if(e.k==='hint')return '💡 送你提示';
 if(e.k==='gold')return '🏅 黃金題';if(e.k==='fast')return '🎯 快答 ＋'+v;if(e.k==='streak')return '🔥 連對 ＋'+v;if(e.k==='freeze')return '❄️ 凍結 '+v+' 秒';return ''}
function eWhy(e){const v=e.v;
 if(e.k==='pts')return '分數直接加上去';if(e.k==='lucky')return '神秘紅包打開了';if(e.k==='now')return lastGain+' ✕ '+v+' ＝ '+(lastGain*v);
 if(e.k==='mul')return v[1]===1?'下一題答對，分數 ✕ '+v[0]:'接下來 '+v[1]+' 題都 ✕ '+v[0];if(e.k==='slot')return '拉霸：'+(e.reel||[]).join(' ')+(e.jack?'　三個一樣 ✕10！':'');
 if(e.k==='gt')return '這一場的時間多 '+v+' 秒';if(e.k==='pct')return '總分多 '+v+'% ＝ ＋'+(e.got||0);if(e.k==='dbl')return '總分再加一次 ＝ ＋'+(e.got||0);
 if(e.k==='rain')return '接下來 '+v[1]+' 題答對，每題再 ＋'+v[0];if(e.k==='time')return '下一題多 '+v+' 秒';if(e.k==='shield')return v>1?'接下來 2 次答錯都不算錯':'下一次答錯不算錯';
 if(e.k==='combo')return '連對 '+v[0]+' 題，第 '+(v[0]+1)+' 題 ✕ '+v[1];if(e.k==='hint')return '下一題先給你提示';if(e.k==='gold')return '下一題答對 ＋'+v;
 if(e.k==='fast')return '下一題 5 秒內答對';if(e.k==='streak')return '連對數字直接加上去';if(e.k==='freeze')return '下一題前 '+v+' 秒，時間不動';return ''}
function doEvt(e){const v=e.v;
 if(e.k==='pts'){score+=v;popScore(v)}else if(e.k==='lucky'){score+=e.got;popScore(e.got)}else if(e.k==='now'){const add=lastGain*(v-1);score+=add;popScore(add)}
 else if(e.k==='mul'){mult=v[0];multLeft=v[1]}else if(e.k==='time')timeAdd+=v;else if(e.k==='shield')shield+=v;
 else if(e.k==='slot'||e.k==='pct'||e.k==='dbl'){score+=e.got;popScore(e.got)}else if(e.k==='gt'){gLeft+=v}
 else if(e.k==='rain'){rainV=v[0];rainN=v[1]}else if(e.k==='combo')combo={need:v[0],mul:v[1],n:0};else if(e.k==='hint')hintNext=1;
 else if(e.k==='gold')goldNext=v;else if(e.k==='fast')fastV=v;else if(e.k==='streak'){streak+=v;if(streak>best)best=streak}else if(e.k==='freeze')freezeNext=v}
function roll(e){const c=Object.assign({},e);
 if(c.k==='lucky')c.got=c.v[0]+Math.round(Math.random()*(c.v[1]-c.v[0])/10)*10;
 if(c.k==='slot'){const r=Math.random()<0.2?[7,7,7]:[1,2,3].map(()=>1+Math.floor(Math.random()*9));c.reel=r;c.jack=r[0]===r[1]&&r[1]===r[2];c.got=(r[0]*100+r[1]*10+r[2])*(c.jack?10:2)}
 if(c.k==='pct')c.got=Math.max(c.v>=50?500:300,Math.round(score*c.v/1000)*10);
 if(c.k==='dbl')c.got=Math.min(c.v,Math.max(500,score));return c}
function draw1(){if(!pool.length)pool=shuf(SURP[gid].slice());return pool.shift()}
/* 每個遊戲有自己的卡包樣式（參考頁的 38 種分給 5 個遊戲），一場洗一次、不重複 */
function mySkins(){const k=META.findIndex(m=>m.id===gid);return SKIN.map((s,i)=>i).filter(i=>i%5===k)}
function nextSkin(){if(!skinQ.length)skinQ=shuf(mySkins());return SKIN[skinQ.shift()]}
function nextJoke(){if(!jokeQ.length)jokeQ=shuf(JOKE.slice());return jokeQ.shift()}
function cardHTML(e,sk){const em=String(e.t).split(' ')[0],nm=String(e.t).split(' ').slice(1).join(' ');
 return '<div class="c3 p'+e.fx[1]+'"><div class="fc bk" style="background:'+sk.bg+';border-color:'+sk.bd+';box-shadow:0 0 50px '+sk.gl+'"><span class="bi">'+sk.svg+'</span></div>'+
  '<div class="fc ft"><div class="eic">'+em+'</div><div class="ebig">'+eBig(e)+'</div><div class="ewhy">'+eWhy(e)+'</div><div class="ejk">'+e.jk+'</div><div class="ename">'+nm+'</div></div></div>'}
function pickN(n,done){
 const cs0=[];let t=0;while(cs0.length<n&&t++<40){const e=draw1();if(!e)break;if(cs0.some(x=>x.t===e.t)){pool.push(e);continue}cs0.push(e)}
 if(!cs0.length){if(done)done();return}
 const sk=nextSkin();const cs=cs0.map(e=>{const c=roll(e);c.jk=nextJoke();return c});
 gPause++;const box=$('#pick');
 box.innerHTML='<div class="pbox"><h2 style="color:'+sk.bd+'">🎁 '+cs.length+' 選 1！<span class="skn">選一張</span></h2><div class="prow">'+
  cs.map((e,k)=>cardHTML(e,sk).replace('class="c3','data-k="'+k+'" style="animation-delay:'+(k*0.12).toFixed(2)+'s" class="c3')).join('')+'</div><div class="pres"></div></div>';
 box.classList.add('on');sfx.wow();let got=false;
 $$('#pick .prow .c3').forEach(el=>el.addEventListener('click',()=>{if(got)return;got=true;
  const k=+el.getAttribute('data-k'),e=cs[k];el.style.animationDelay='0s';el.classList.add(OPENA[sk.op]||'oShake','mine');
  setTimeout(()=>{el.classList.remove(OPENA[sk.op]||'oShake');el.classList.add('flip')},550);
  setTimeout(()=>{opened.push(e.t);if(e.k==='pct'||e.k==='dbl'){e.got=roll(e).got}doEvt(e);paint();burst(e,sk);
   const pr=$('#pick .pres');if(pr)pr.innerHTML='<div class="pb0">🎉 '+eBig(e)+'</div><div class="pw">'+eWhy(e)+'</div><div class="pj">'+e.jk+'</div>'},1000);
  setTimeout(()=>$$('#pick .prow .c3').forEach(x=>{if(x!==el){x.style.animationDelay='0s';x.classList.add('flip','dim')}}),1800);
  cs.forEach((x,j)=>{if(j!==k){const o=SURP[gid].find(q=>q.t===x.t);if(o)pool.push(o)}});
  setTimeout(()=>{box.classList.remove('on');box.innerHTML='';gPause=Math.max(0,gPause-1);if(done&&!ended)done()},5200);
 }));
}
function surprise(done){const r=Math.random(),n=r<0.40?2:(r<0.70?3:(r<0.90?4:5));pickN(n,done)}
const BKS=['bBoom','bRain','bRise','bSpin','bSpiral','bFount','bZoom','bWave'],PC=['#FFD24A','#5AD1FF','#FF7EB6','#8CF08A'];
function burst(e,sk){if(REDUCE)return;const bx=$('#burst');const em=String(e.t).split(' ')[0],kind=BKS[e.fx[0]];let h='<b style="--pc:'+PC[e.fx[1]]+'"></b>';
 for(let n=0;n<24;n++){let x,y=(Math.random()*60-30)+'vh',r=(Math.random()*720-360)+'deg';const w=(Math.random()*.35).toFixed(2)+'s';
  if(kind==='bBoom'||kind==='bZoom'){const a=Math.random()*6.283,d=16+Math.random()*34;x=Math.cos(a)*d+'vw';y=Math.sin(a)*d+'vh'}
  else if(kind==='bSpin'||kind==='bSpiral'){x=(12+Math.random()*30)+'vw';r=(n*33+180)+'deg'}else x=(Math.random()*96-48)+'vw';
  const pe=(sk&&sk.par&&n%3)?sk.par[n%sk.par.length]:em;
  h+='<i style="--a:'+kind+';--x:'+x+';--y:'+y+';--r:'+r+';--w:'+w+';--z:'+(34+Math.round(Math.random()*50))+'px">'+pe+'</i>'}
 bx.innerHTML=h;const st=$('#play');st.classList.remove('quake');void st.offsetWidth;st.classList.add('quake');
 clearTimeout(burst.t);burst.t=setTimeout(()=>{bx.innerHTML='';st.classList.remove('quake')},2600)}
function popScore(v){const el=$('#gpop');if(el){el.textContent='＋'+v;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
 const sc=$('#gsc');if(sc){sc.classList.remove('bump');void sc.offsetWidth;sc.classList.add('bump')}}
/* 答對的加分視窗（照參考頁：✅ ＋880，下面一排圖示算式） */
function eqHTML(d){const P=(ic,v,t,m)=>'<span'+(m?' class="m"':'')+'><b>'+ic+' '+v+'</b><em>'+t+'</em></span>';
 return P('✅',100,'答對')+'<i>＋</i>'+P('⚡',d.sp,'速度快')+(d.st?'<i>＋</i>'+P('🔥',d.st,'連對 '+streak+' 題'):'')+
  (d.mul>1?'<i>✕</i>'+P(d.storm?'⚡':'🎁',d.mul,d.storm?'磁暴':'驚喜卡倍數',1):'')+(d.extra?'<i>＋</i>'+P(d.extraIc,d.extra,'驚喜卡獎勵',1):'')}
function showGain(d,done){const box=$('#gain');
 box.innerHTML='<div class="gbox"><div class="gok">✅</div><div class="gnum" id="gnumv">＋0</div><div class="geq">'+eqHTML(d)+'</div>'+
  '<div class="gbar"><i style="width:'+Math.max(4,Math.round(100*d.pct))+'%"></i></div><div class="gtot">🏆 總分 <b>'+score+'</b></div></div>';
 $$('#gain .geq span').forEach((x,k)=>x.style.animationDelay=(0.15+k*0.14).toFixed(2)+'s');
 box.classList.add('on');gPause++;const t0=Date.now(),el=$('#gnumv');
 const step=()=>{const k=Math.min(1,(Date.now()-t0)/650);if(el)el.textContent='＋'+Math.round(d.p*k);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step);
 setTimeout(()=>{box.classList.remove('on');box.innerHTML='';gPause=Math.max(0,gPause-1);if(done&&!ended)done()},2200)}
/* 一直在動的遊戲：算式在答對的地方飄出來（不停下來） */
function flyGain(d,x,y){const f=document.createElement('div');f.className='fly';f.style.left=(x==null?W()/2:x)+'px';f.style.top=(y==null?H()*.3:y)+'px';
 f.innerHTML='＋'+d.p+'<small>✅100 ＋ ⚡'+d.sp+(d.st?' ＋ 🔥'+d.st:'')+(d.mul>1?' ✕ '+d.mul:'')+(d.extra?' ＋ '+d.extraIc+d.extra:'')+'</small>';
 A().appendChild(f);setTimeout(()=>f.remove(),1300)}

/* 計時：一場 1 分 30 秒（答錯頁、驚喜卡、加分視窗、加分題不算）；每一題 15 秒 */
let lastT=0;
function loop(t){const dt=lastT?Math.min(.1,(t-lastT)/1000):0;lastT=t;
 if(!ended&&G){const paused=gPause>0||cdOn;
  if(!paused&&!bonusMode){gLeft-=dt;if(gLeft<=0){gLeft=0;paint();timeOver();requestAnimationFrame(loop);return}}
  if(!paused&&qOn){if(frozenLeft>0)frozenLeft-=dt;else{const before=left;left-=dt;
   if(left<=5&&left>0&&Math.ceil(before)!==Math.ceil(left))sfx.tick();
   if(left<=0){left=0;qOn=false;paint();timeUp()}}}
  try{if(G.frame)G.frame(dt,paused)}catch(e){console.error(e)}
  paint()}
 requestAnimationFrame(loop)}
requestAnimationFrame(loop);
const RING=2*Math.PI*42;$('#gfg').setAttribute('stroke-dasharray',RING);
function paint(){if(!G)return;
 const s=Math.ceil(gLeft),c=$('#gclock');c.textContent='⏳ '+Math.floor(s/60)+':'+('0'+(s%60)).slice(-2);c.className=gLeft<=10?'dang':(gLeft<=20?'warn':'');
 $('#gnum').textContent=Math.ceil(left);$('#gfg').setAttribute('stroke-dashoffset',RING*(1-left/qt));
 $('#gring').className=frozenLeft>0?'frz':(left<=5?'dang':(left<=8?'warn':''));
 $('#gsc').textContent=score;$('#gstreak').textContent=(shield?'🛡 ':'')+(streak?'🔥 '+streak:'—');$('#gsurp').textContent='🎁 '+opened.length;
 const tg=tagsIn();if(paint.tg!==tg){paint.tg=tg;$('#tagsL').innerHTML=tg}}
/* 「再答對 N 題就開驚喜卡」：一直看得到下一張卡離自己多遠（照參考頁） */
function tagsIn(){const a=[];const n=3-(streak%3);a.push('<span class="tg'+(n===1?' hot':'')+'">🎁 再對 '+n+' 題</span>');
 if(multLeft>0)a.push('<span class="tg hot">✕'+mult+' 剩 '+multLeft+' 題</span>');if(combo)a.push('<span class="tg hot">🔗 '+combo.n+'/'+combo.need+'</span>');
 if(rainN>0)a.push('<span class="tg hot">🌧 '+rainN+'</span>');if(goldNext)a.push('<span class="tg hot">🏅 ＋'+goldNext+'</span>');if(fastV)a.push('<span class="tg hot">🎯 5 秒內</span>');
 if(hintNext)a.push('<span class="tg hot">💡 提示</span>');if(SCH.rkTxt)a.push('<span class="tg">'+SCH.rkTxt+'</span>');return a.join('')}

function begin(id,book){
 const m=META.find(x=>x.id===id);if(!m)return;try{G&&G.stop&&G.stop()}catch(e){}gid=id;G=GAMES[id];BK=book||'all';ended=false;cdOn=true;
 score=0;streak=0;best=0;right=0;wrong=0;mult=1;multLeft=0;fastV=0;wrongList=[];busy=false;bonusMode=false;
 asked=0;speedSum=0;shield=0;timeAdd=0;opened=[];lastGain=0;pool=shuf(SURP[id].slice());skinQ=shuf(mySkins());jokeQ=shuf(JOKE.slice());rainN=0;rainV=0;
 hintNext=0;goldNext=0;freezeNext=0;frozenLeft=0;combo=null;left=QT;qt=QT;gLeft=GT;gPause=0;MISSLOG=[];missHide(false);
 GQ=[];GSEEN=[];GSIM=[];gFix=0;gFirst=false;SCEND=null;SCH.rkTxt='';$('#gscore').hidden=true;scStart(true);
 DECK=G.deck(BK);queue=shuf(DECK);
 ['#gain','#pick'].forEach(s=>{$(s).classList.remove('on');$(s).innerHTML=''});
 show('play');$('#gname').textContent=m.ic+' '+m.name;
 A().className='';A().innerHTML='';G.setup();paint();
 const cd=document.createElement('div');cd.className='cdown';A().appendChild(cd);let n=3;
 const tick=()=>{if(ended||gid!==id){cd.remove();return}if(n===0){cd.remove();cdOn=false;next();return}cd.innerHTML='<b>'+n+'</b>';sfx.tick();n--;setTimeout(tick,650)};tick();
 location.replace('#'+id);
}
function next(){if(ended)return;busy=false;bonusMode=false;$$('.bonusq').forEach(x=>x.remove());
 if(!queue.length)queue=shuf(DECK);cur=queue.shift();
 const si=GSIM.indexOf(cur);if(si>=0){GSIM.splice(si,1);gFirst=false}else gFirst=GSEEN.indexOf(cur)<0;if(GSEEN.indexOf(cur)<0)GSEEN.push(cur);
 gQi=DECK.indexOf(cur);gT0=Date.now();
 const h=hintNext;hintNext=0;
 qt=Math.max(5,(G.qt?G.qt():QT)+timeAdd);timeAdd=0;frozenLeft=freezeNext;freezeNext=0;left=qt;
 G.ask(cur,{hint:h,bonus:false});qOn=true;paint()}
function timeUp(){if(busy)return;G.timeout&&G.timeout();judge(false,null,true)}
function award(sp){right++;streak++;if(streak>best)best=streak;speedSum+=sp;
 const st=streak*20,sub=100+sp+st;let mul=1,extra=0,extraIc='',storm=false;
 if(multLeft>0){mul*=mult;multLeft--;if(!multLeft)mult=1}
 if(combo){combo.n++;if(combo.n>combo.need){mul*=combo.mul;combo=null}}
 if(G.mul&&G.mul()>1){mul*=G.mul();storm=true}
 if(goldNext){extra+=goldNext;extraIc='🏅';goldNext=0}
 if(fastV){if(qt-left<=5){extra+=fastV;extraIc=extraIc||'🎯'}fastV=0}
 if(rainN>0){extra+=rainV;extraIc=extraIc||'🌧';rainN--}
 const p=sub*mul+extra;score+=p;lastGain=p;sfx.ok();popScore(p);paint();
 return {sp,st:streak>1?st:0,mul,extra,extraIc,p,pct:left/qt,storm}}
/* 成績紀錄：每一題第一次作答 [答對, 0 正解／1 錯／-1 時間到, 秒數, 秒按, 剩下 ÷ 總秒數, 題庫第幾題]（照參考頁 gScRec） */
function gRec(ok,timeout){if(gFirst){const sec=(Date.now()-gT0)/1000;
  GQ.push([ok?1:0,timeout?-1:(ok?0:1),Math.round(sec*10)/10,!timeout&&sec<1?1:0,ok?Math.round(clamp(left/qt,0,1)*1000)/1000:0,gQi]);gFirst=false}
 else if(ok)gFix++}
function judge(ok,pk,timeout,at){
 if(busy||ended)return;busy=true;qOn=false;window.LASTOK=ok;
 if(bonusMode)return bonusJudge(ok,pk,timeout);
 asked++;gRec(ok,timeout);
 if(ok){const sp0=Math.round(900*(left/qt)),d=award(sp0);
  const go=()=>{if(ended)return;if(streak>0&&streak%3===0)surprise(next);else next()};
  if(G.rt){flyGain(d,at&&at.x,at&&at.y);setTimeout(()=>{if(!ended)go()},G.okDelay?G.okDelay():750)}
  else setTimeout(()=>{if(!ended)showGain(d,go)},G.okDelay?G.okDelay():500);
  return}
 let saved=false;if(shield){shield--;saved=true}else{wrong++;streak=0;combo=null}
 sfx.no();
 queue.splice(Math.min(queue.length,2+Math.floor(Math.random()*2)),0,cur);GSIM.push(cur);
 const mi=G.miss(cur,pk,!!timeout);if(mi.hint&&wrongList.indexOf(mi.hint)<0)wrongList.push(mi.hint);
 mi.why=(saved?'🛡 免死金牌：這一次不算錯！　':'')+(mi.why||'');if(timeout)mi.p=null;
 paint();setTimeout(()=>{if(!ended)missShow(mi,next)},G.missDelay||900);
}

/* ══ 答錯頁（照參考頁：唸 3 次、倒數 8 秒，倒數完才出現 ⭐ 加分、▶ 繼續） ══ */
let MISSLOG=[],missT=null,missCB=null,MS=null;const MISSN=8;
function mEl(){return $('#miss')||(()=>{const m=document.createElement('div');m.id='miss';document.body.appendChild(m);
 m.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.classList.contains('say')){say(b.getAttribute('data-say'));return}
  if(b.classList.contains('bon')){missBonus();return}
  if(b.classList.contains('nxt')){missHide(true);return}});return m})()}
function missOn(){const m=$('#miss');return !!(m&&m.classList.contains('on'))}
function mSay3(t){if(!t)return;let k=0;const my=MS;const go=()=>{if(MS!==my||!missOn()||k>=3)return;k++;say(t,()=>setTimeout(go,650))};setTimeout(go,700)}
function mCount(n,fn){if(missT)clearInterval(missT);const b=$('#mcdn');if(b)b.textContent=n;
 missT=setInterval(()=>{n--;const c=$('#mcdn');if(n>0&&c){c.textContent=n;c.classList.remove('tick');void c.offsetWidth;c.classList.add('tick');return}clearInterval(missT);missT=null;fn()},1000)}
function mStrip4(cur){const st=['⭐ 加分','👀 再看 8 秒','🎮 同一題再玩一次','✅ 分數 ✕ 2'];
 return '<div class="mbn'+(cur!=null?' cur':'')+'">'+st.map((x,k)=>(k?'<i>➜</i>':'')+'<span'+(cur===k?' class="now"':'')+'>'+x+'</span>').join('')+'</div>'}
function missShow(o,cb){const key=o.key||o.a;MISSLOG=MISSLOG.filter(x=>x.key!==key);MISSLOG.push({key,q:o.q,p:o.p,a:o.a,why:o.why,sp:o.sp});
 missCB=cb||null;MS={o};gPause++;mRead(false)}
function mRead(reread){const o=MS.o,m=mEl();
 m.innerHTML='<div class="mbox"><div class="mhd'+(reread?' bn':'')+'">'+(reread?'👀 再仔細看一次':(o.p==null?'⏰ 時間到':'❌ 答錯了'))+'</div>'+
  (o.q?'<div class="mq">'+o.q+'</div>':'')+'<div class="mcmp">'+(o.p!=null?'<div class="mp"><span class="mi">❌</span><span class="mv">'+o.p+'</span></div><div class="mar">⬇</div>':'')+
  '<div class="ma"><span class="mi">✅</span><span class="mv">'+o.a+'</span></div></div>'+(o.why?'<div class="mw">💡 '+o.why+'</div>':'')+mStrip4(reread?1:null)+
  '<div class="mft" id="mft">'+(o.sp?'<button class="say" data-say="'+esc(o.sp)+'">🔊 發音</button>':'')+'<span class="mcd" id="mcdn">'+MISSN+'</span></div></div>';
 m.scrollTop=0;m.classList.add('on');mSay3(o.sp);
 mCount(MISSN,()=>{if(reread){bonusStart();return}const f=$('#mft');if(!f)return;
  f.innerHTML=(o.sp?'<button class="say" data-say="'+esc(o.sp)+'">🔊 發音</button>':'')+'<button class="bon">⭐ 加分</button><button class="nxt">▶ 繼續</button>'})}
function missBonus(){if(!MS)return;sayStop();mRead(true)}
function missHide(run){if(missT){clearInterval(missT);missT=null}const m=$('#miss');const was=m&&m.classList.contains('on');if(m)m.classList.remove('on');
 MS=null;sayStop();if(was)gPause=Math.max(0,gPause-1);const cb=missCB;missCB=null;if(run&&cb&&!ended)cb()}
/* ⭐ 加分題：用這個遊戲本來的玩法，同一題再玩一次（2026/10/9 使用者同意）；答對 500 ✕ 2 */
let BONUS=null;
function bonusStart(){const o=MS.o;BONUS={o,cb:missCB};missCB=null;missHide(false);if(ended)return;
 bonusMode=true;busy=false;qt=QT;left=qt;frozenLeft=0;G.ask(cur,{bonus:true,hint:0});
 const b=document.createElement('div');b.className='bonusq';b.textContent='⭐ 加分題：答對 ＝ 500 ✕ 2';A().appendChild(b);qOn=true;paint()}
function bonusJudge(ok,pk,timeout){const B=BONUS;
 if(ok){gFix++;sfx.ok();setTimeout(()=>{if(ended)return;score+=1000;popScore(1000);paint();
   const m=mEl();missCB=B.cb;MS={o:B.o};gPause++;
   m.innerHTML='<div class="mbox"><div class="mhd ok">🎉 答對了！</div>'+mStrip4(3)+'<div class="mgain">＋1000</div><div class="mx2">500 <b>✕ 2</b> ＝ <b>1000</b></div><div class="mft"><button class="nxt">▶ 繼續</button></div></div>';
   m.scrollTop=0;m.classList.add('on');if(B.o.sp)say(B.o.sp)},G.okDelay?Math.min(900,G.okDelay()):600);return}
 sfx.no();const mi=G.miss(cur,pk,!!timeout);if(timeout)mi.p=null;
 setTimeout(()=>{if(!ended)missShow(mi,B.cb)},G.missDelay||900)}
/* 結束時的「答錯整理」（照參考頁：一題一張卡，正確答案綠色粗體） */
function missAll(title,done){let m=$('#missAll');
 if(!m){m=document.createElement('div');m.id='missAll';document.body.appendChild(m);
  m.addEventListener('click',e=>{const b=e.target.closest('.say');if(b){say(b.getAttribute('data-say'));return}
   if(e.target.closest('#mAllOk')){m.classList.remove('on');const f=m._done;m._done=null;if(f)f()}})}
 if(!MISSLOG.length){if(done)done();return false}
 m._done=done||null;
 m.innerHTML='<div class="mbox"><h2>📌 '+(title||'答錯整理')+'</h2><p class="lead">一共 <b style="color:var(--goldt)">'+MISSLOG.length+'</b> 題　<b style="color:#137A42">綠色粗體</b> ＝ 正確答案</p>'+
  MISSLOG.map((x,k)=>'<div class="mcard" style="animation-delay:'+(0.1+k*0.14).toFixed(2)+'s"><span class="mn">第 '+(k+1)+' 題</span>'+(x.q?'<div class="cq">📝 '+x.q+'</div>':'')+
   (x.p!=null?'<div class="cp">❌ '+x.p+'</div>':'<div class="cp">⏰ 時間到</div>')+'<div class="ca">✅ <b>'+x.a+'</b></div>'+(x.why?'<div class="cw">💡 '+x.why+'</div>':'')+
   (x.sp?'<button class="say" data-say="'+esc(x.sp)+'">🔊 發音</button>':'')+'</div>').join('')+
  '<div class="mbtns"><button id="mAllOk">✅ 我都弄懂了</button></div></div>';
 m.scrollTop=0;m.classList.add('on');return true}

function timeOver(){if(ended)return;over('⏰ 1 分 30 秒到！')}
function over(title){if(ended&&document.body.dataset.s==='end')return;
 ended=true;qOn=false;cdOn=false;sayStop();missHide(false);try{G.stop&&G.stop()}catch(e){}
 ['#gain','#pick'].forEach(s=>{$(s).classList.remove('on');$(s).innerHTML=''});gPause=0;bonusMode=false;
 show('end');$('#gendh').textContent=title||'🏁 這一場結束！';
 if(scLive())$('#gscore').hidden=!scEnd({m:'g',qs:GQ,raw:score,fix:gFix,sec:GT-gLeft});
 endBody()}
function endBody(){const k='best_'+gid;let b=store(k)||0;
 if(score>b){store(k,score);b=score;$('#gendh').textContent+='　🎉 破紀錄！'}
 $('#gendsc').textContent=score;
 $('#gendln').innerHTML='<span>✅ <b>'+right+'</b></span><span>❌ <b>'+wrong+'</b></span><span>🔥 最長 <b>'+best+'</b></span><span>⚡ <b>'+speedSum+'</b></span><span>🏆 最佳 <b>'+b+'</b></span>'+(G.endLine?G.endLine():'');
 $('#gendrev').innerHTML='<div>🎁 翻到 <b>'+opened.length+'</b> 張'+(opened.length?'：'+opened.join('、'):'')+'</div>'+
  (wrongList.length?'<div>📌 要記住的：</div>'+wrongList.map(h=>'<div>・'+h+'</div>').join(''):'<div>全對！一題都沒錯 🎉</div>');
 $('#missBtn').style.display=MISSLOG.length?'':'none';sfx.wow();
 const had=MISSLOG.length>0;missAll('這一場　答錯整理',()=>gScOpen(had?300:2500))}
function gScOpen(ms){clearTimeout(gScOpen.t);if(!SCEND)return;gScOpen.t=setTimeout(()=>{if(!SCEND||!ended||document.body.dataset.s!=='end'||missOn())return;SCH.open();scScene()},ms)}

/* ══ 畫面切換、大廳、圖鑑 ══ */
function show(s){document.body.dataset.s=s;
 $$('#hubwrap .scr').forEach(x=>x.classList.toggle('on',(s==='hub'&&x.id==='hub')||(s==='book'&&x.id==='book')));
 if(s==='hub'||s==='book')window.scrollTo(0,0);fixBar()}
function hub(sec){ended=true;qOn=false;cdOn=false;sayStop();missHide(false);try{G&&G.stop&&G.stop()}catch(e){}G=null;
 const ma=$('#missAll');if(ma)ma.classList.remove('on');['#gain','#pick'].forEach(s=>{$(s).classList.remove('on');$(s).innerHTML=''});gPause=0;
 SCH.close();show('hub');gridPaint();$('#scme').innerHTML=scMeHTML();
 if(location.hash&&location.hash!=='#'+(sec||''))history.replaceState(null,'',location.pathname+(sec?'#'+sec:''));
 if(sec){const t=$('#'+sec);if(t)setTimeout(()=>t.scrollIntoView(),30)}}
function gridPaint(){$('#grid').innerHTML=META.map((m,n)=>{const b=store('best_'+m.id)||0;
 return '<button class="gcard" data-g="'+m.id+'" style="--c:'+m.c+';--b:'+m.b+'"><span class="gn">'+(n+1)+'</span><span class="gi" style="color:'+m.c+'">'+m.svg+'</span>'+
  '<span class="gt">'+m.ic+' '+m.name+'</span><span class="gr">'+m.rule+'</span><span class="gb">⏳ 1 分 30 秒　📚 '+m.learn+(b?'　🏆 最佳 <b>'+b+'</b>':'')+'</span></button>'}).join('')}
/* 開始前：選「全部」或其中一本（分批練習）；興趣磁鐵固定用全部（2026/10/9 使用者同意） */
function bookPage(id){const m=META.find(x=>x.id===id),g=GAMES[id];if(!m)return;
 const bs=g.books().filter(k=>g.deck(k).length);
 const lab=k=>k==='all'?['📖 全部','#1B2B4B']:k==='X'?['❔ 還沒有分數','#5B6782']:[TY[k].ic+' '+TY[k].f,TY[k].c];
 $('#book').innerHTML='<div class="gi0" style="--b:'+m.b+';color:'+m.c+'">'+m.svg+'</div><h2 class="h2">'+m.ic+' '+m.name+'</h2>'+
  '<div class="card rule">'+m.how.map(h=>'<div><span>'+h[0]+'</span><span>'+h[1]+'</span></div>').join('')+'</div>'+
  '<p class="one">'+(bs.length>1?'要練哪一本？點一下就開始':'點一下就開始')+'</p><div class="bk">'+bs.map(k=>{const L=lab(k);
   return '<button data-bk="'+k+'" style="--c:'+L[1]+'"><b>'+L[0]+'</b><span>'+g.deck(k).length+' 個職業</span></button>'}).join('')+'</div>';
 BOOKID=id;show('book');location.replace('#'+id)}
let DEXB='all',BOOKID=null;
function dexPaint(b){DEXB=b;$$('#tabs button').forEach(x=>x.classList.toggle('on',x.dataset.b===b));
 $('#bookh').innerHTML=b==='all'?'全部 '+BOOK.all.length+' 個職業':b==='X'?'這些工作還沒有自己的興趣分數，先不分類（不代表它們不好）':
  '<span class="chip" style="--c:'+TY[b].c+';--b:'+TY[b].bg+'">'+TY[b].ic+' '+TY[b].f+' '+TY[b].en+'</span>'+TY[b].d+'：分數最高的是這一型';
 $('#dexg').innerHTML=BOOK[b].map(e=>{const j=J[e],t=b==='all'||b==='X'?(j.top?j.top[0]:null):b;
  return '<div class="dc" data-e="'+esc(e)+'" role="button" tabindex="0" style="--c:'+(t?TY[t].c:'#B9C2D3')+'">'+(j.top&&j.top.length>1?'<span class="tie">同分</span>':'')+
   '<span class="dci">'+j.ic+'</span><span class="dce">'+colorWord(e)+'</span><span class="dcz">'+j.z+'</span>'+
   '<span class="dcb"><button class="b48 say1" data-e="'+esc(e)+'" aria-label="聽 '+esc(e)+'">🔊</button><button class="b48 sylb" data-e="'+esc(e)+'">音節</button></span></div>'}).join('')}
/* 興趣成分＋三種音節動畫（照 quiz.html 的職業圖鑑） */
const MED=['🥇','🥈','🥉'];
function openSheet(e,sylMode){const j=J[e];
 let h='<button class="x" id="xbtn" aria-label="關閉">✕</button><div class="ph"><span class="pi">'+j.ic+'</span><div><div class="pe">'+colorWord(e)+'</div><div class="pz">'+j.z+'</div></div><button class="b48" id="psay" aria-label="聽英文">🔊</button></div>';
 if(j.s){const s=j.s,arr=ORDER.split('').sort((a,b)=>s[b]-s[a]||ORDER.indexOf(a)-ORDER.indexOf(b)),mx=s[arr[0]],tops=arr.filter(t=>s[t]===mx);
  h+='<div class="pexp">🧪 <b>興趣成分</b>：每個工作都會用到六種興趣，只是多少不一樣。美國勞動部替每個工作的六種興趣打分數（0～100 分），分數越高，這個工作越常做這一型的事。</div><details class="hows"><summary>🤔 分數怎麼來的？</summary>'+HOW+'</details><div class="pbars">'+
   arr.map(t=>{const rk=1+ORDER.split('').filter(u=>s[u]>s[t]).length;return '<div class="pb" style="--c:'+TY[t].c+'" data-t="'+t+'"><span class="md">'+(rk<=3?MED[rk-1]:'')+'</span><span class="pn2">'+TY[t].ic+' '+TY[t].f+'</span><span class="pt"><i data-w="'+s[t]+'"></i></span><span class="pv">'+s[t]+'</span></div>'}).join('')+'</div>'+
   '<p class="psay">'+j.z+'最常做的是'+tops.map(t=>'『'+TY[t].f+'』').join('和')+'的事：'+tops.map(t=>TY[t].act).join('；')+'（'+(tops.length>1?'都是 ':'')+mx+' 分）。</p>'+
   (j.note?'<p class="pnote">※ '+j.note+'</p>':'')+'<p class="pnote">資料：<a href="'+j.url+'" target="_blank" rel="noopener">O*NET '+j.code+'</a></p>'}
 else h+='<div class="pexp">這個工作還沒有自己的興趣分數。</div>';
 h+='<div class="syls" id="syls"><h3>✂️ 音節：這個字有幾拍？</h3><div class="sbtn"><button data-m="clap">👏 拍手</button><button data-m="train">🚂 音節火車</button><button data-m="cut">✂️ 剪刀</button></div><div class="syst" id="syst"></div><div class="sres" id="sres"></div></div>'+
  '<div class="plink" style="margin-top:24px"><a class="ghost" href="story.html#w'+j.n+'">📚 學這個字（單字卡）▶</a></div>';
 $('#panel').innerHTML=h;$('#sheet').classList.add('on');$('#sheet').dataset.e=e;$('#sheet').scrollTop=0;
 $$('.pb').forEach((b,i)=>setTimeout(()=>{b.classList.add('on');const x=b.querySelector('i');x.style.width=x.dataset.w+'%'},200+i*260));
 sylStatic(e);if(sylMode){setTimeout(()=>{$('#syls').scrollIntoView({block:'start'});playSyl(e,sylMode)},300)}else say(e)}
function closeSheet(){$('#sheet').classList.remove('on');clearSyl();sayStop()}
let sylT=[];function clearSyl(){sylT.forEach(clearTimeout);sylT=[]}function later(f,ms){sylT.push(setTimeout(f,ms))}
function sylDone(e){$('#sres').innerHTML='<span class="en">'+sylText(e)+'</span> ＝ '+sylCount(e)+' 個音節'}
function wordHTML(e,cut){return sylData(e).map(w=>'<span class="wd">'+w.map((s,i)=>(i&&cut?'<span class="cut"></span>':'')+'<span class="sy">'+colorRange(e,s.a,s.b)+'</span>').join('')+'</span>').join('<span class="wgap"></span>')}
function sylStatic(e){$('#syst').className='syst';$('#syst').innerHTML=wordHTML(e,false);$('#sres').innerHTML='點上面的按鈕，看看這個字可以分成幾拍'}
function playSyl(e,m){clearSyl();const st=$('#syst');st.className='syst';$('#sres').innerHTML='';$$('.sbtn button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
 say(e);const n=sylCount(e);
 if(m==='clap'){st.innerHTML=wordHTML(e,true);later(()=>st.classList.add('cutting'),500);later(()=>st.classList.add('apart'),1000);
  [...st.querySelectorAll('.sy')].forEach((x,k)=>later(()=>{x.classList.remove('beat');void x.offsetWidth;x.classList.add('beat');const c=document.createElement('span');c.className='clap';c.textContent='👏';x.appendChild(c);sfx.clap()},1500+k*650));
  later(()=>sylDone(e),1600+n*650)}
 else if(m==='train'){let k=0;st.innerHTML='<div class="train out"><span class="eng">🚂</span>'+sylData(e).map(w=>w.map(s=>'<span class="car"><span class="nb">'+(++k)+'</span><span>'+colorRange(e,s.a,s.b)+'</span></span>').join('')).join('')+'</div>';
  const tr=st.querySelector('.train');later(()=>tr.classList.remove('out'),60);later(()=>tr.classList.add('apart'),1600);
  [...st.querySelectorAll('.nb')].forEach((b,i)=>later(()=>{b.classList.add('on');sfx.pop()},2200+i*500));later(()=>sylDone(e),2300+n*500)}
 else{st.innerHTML=wordHTML(e,false)+'<span class="sci">✂️</span>';const sci=st.querySelector('.sci'),sy=[...st.querySelectorAll('.sy')],box=st.getBoundingClientRect();sci.style.left='4%';
  const ends=[];let idx=0;sylData(e).forEach(w=>{w.forEach((s,i)=>{if(i>0)ends.push(sy[idx]);idx++})});
  if(!ends.length){later(()=>{sci.style.left='96%'},300);later(()=>{$('#sres').innerHTML='只有 1 個音節，不用剪！'},900);later(()=>sylDone(e),1500);return}
  ends.forEach((x,k)=>{later(()=>{const r=x.getBoundingClientRect();sci.style.left=(r.left-box.left)+'px'},400+k*800);
   later(()=>{st.querySelectorAll('.snip').forEach(o=>o.remove());const r=x.getBoundingClientRect(),s=document.createElement('span');s.className='snip';s.textContent='喀擦！';s.style.left=(r.left-box.left)+'px';st.appendChild(s);sfx.snip();x.style.marginLeft='.3em'},800+k*800)});
  later(()=>{sci.style.left='96%';st.classList.add('split')},900+ends.length*800);later(()=>sylDone(e),1500+ends.length*800)}}

/* ══ 共用：拖拉 ══ */
function ptr(ev){const r=A().getBoundingClientRect();return {x:ev.clientX-r.left,y:ev.clientY-r.top,t:performance.now()}}
function sparks(x,y,c,n){if(REDUCE)return;for(let k=0;k<(n||14);k++){const s=document.createElement('i');s.className='spark';s.style.left=x+'px';s.style.top=y+'px';s.style.background=c;
 const a=Math.random()*6.283,d=40+Math.random()*80;s.style.setProperty('--dx',Math.cos(a)*d+'px');s.style.setProperty('--dy',Math.sin(a)*d+'px');A().appendChild(s);setTimeout(()=>s.remove(),750)}}
function decoys(e,n,ok){/* 長得像的字優先（同一個字母開頭、長度差不多），再補隨機 */
 const c=ALL.filter(x=>x!==e&&(!ok||ok(x)));const sim=x=>(x[0].toLowerCase()===e[0].toLowerCase()?3:0)+(Math.abs(x.length-e.length)<=2?2:0)+(x.split(' ').length===e.split(' ').length?1:0)+Math.random()*2.5;
 return c.sort((a,b)=>sim(b)-sim(a)).slice(0,n)}

/* ══ 🧲 興趣磁鐵 ══ */
const MAGA={R:240,I:300,A:0,S:60,E:120,C:180};
const Gm={rt:true,books:()=>['all'],deck:()=>ALL.filter(e=>J[e].s),
 qt(){return bonusMode?10:Math.max(5,10-0.3*asked)},mul(){return gLeft<=15?2:1},
 setup(){const a=A();a.className='mg';a.innerHTML='<svg class="hex" id="mghex"></svg><div class="lane"></div>'+ORDER.split('').map(t=>'<div class="mag" data-t="'+t+'" style="--c:'+TY[t].c+';--b:'+TY[t].bg+'"><i>'+TY[t].ic+'</i><b>'+TY[t].f+'</b><small>'+TY[t].en+'</small></div>').join('');
  this.card=null;this.lay();this.onR=()=>this.lay();addEventListener('resize',this.onR);this.stormShown=false},
 lay(){const w=W(),h=H(),cx=w/2,cy=h*.56,R=Math.min(w*.4,h*.4),ms=clamp(Math.min(w,h)*.17,84,150);this.M={};
  A().style.setProperty('--ms',ms+'px');let pts=[];
  for(const t of ORDER){const a=MAGA[t]*Math.PI/180,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R*.92;this.M[t]={x,y};pts.push(x+','+y);const m=A().querySelector('.mag[data-t="'+t+'"]');m.style.left=x+'px';m.style.top=y+'px'}
  this.ms=ms;$('#mghex').innerHTML='<polygon points="'+pts.join(' ')+'" fill="none" stroke="#C9D3E6" stroke-width="3" stroke-dasharray="8 10"/>'},
 ask(e,o){if(this.card)this.card.el.remove();const el=document.createElement('div');el.className='jc';
  el.innerHTML='<span class="ji">'+J[e].ic+'</span><span class="je">'+colorWord(e)+'</span><span class="jz">'+J[e].z+'</span>';A().appendChild(el);
  const cw=el.offsetWidth,chh=el.offsetHeight;this.card={el,e,x:W()/2,y:chh/2+8,w:cw,h:chh,held:false,fly:null,done:false};
  $$('.mag').forEach(m=>m.classList.remove('hint','yes','nope','near'));
  if(o.hint)topsOf(e).forEach(t=>A().querySelector('.mag[data-t="'+t+'"]').classList.add('hint'));
  this.place();say(e);
  el.addEventListener('pointerdown',ev=>{const c=this.card;if(!c||c.el!==el||c.done||busy||!qOn)return;ev.preventDefault();el.setPointerCapture(ev.pointerId);const p=ptr(ev);
   c.held=true;c.ox=p.x-c.x;c.oy=p.y-c.y;c.trail=[p];el.classList.add('hold')});
  el.addEventListener('pointermove',ev=>{const c=this.card;if(!c||!c.held)return;const p=ptr(ev);c.x=p.x-c.ox;c.y=p.y-c.oy;c.trail.push(p);if(c.trail.length>8)c.trail.shift();this.place();this.near()});
  const up=ev=>{const c=this.card;if(!c||!c.held)return;c.held=false;el.classList.remove('hold');this.release()};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)},
 place(){const c=this.card;if(c)c.el.style.transform='translate('+(c.x-c.w/2)+'px,'+(c.y-c.h/2)+'px)'+(c.held?' scale(1.06)':'')},
 nearest(){const c=this.card;let bt=null,bd=1e9;for(const t of ORDER){const m=this.M[t],d=Math.hypot(m.x-c.x,m.y-c.y);if(d<bd){bd=d;bt=t}}return {t:bt,d:bd}},
 near(){const n=this.nearest();$$('.mag').forEach(m=>m.classList.toggle('near',m.dataset.t===n.t&&n.d<this.ms*1.1))},
 release(){const c=this.card;$$('.mag').forEach(m=>m.classList.remove('near'));const n=this.nearest();
  if(n.d<this.ms*1.0){this.shoot(n.t);return}
  const tr=c.trail||[];if(tr.length>=2){const a=tr[0],b=tr[tr.length-1],dt=Math.max(16,b.t-a.t)/1000,vx=(b.x-a.x)/dt,vy=(b.y-a.y)/dt,sp=Math.hypot(vx,vy);
   if(sp>450){let bt=null,bd=40;for(const t of ORDER){const m=this.M[t],ang=Math.abs(Math.atan2(m.y-c.y,m.x-c.x)-Math.atan2(vy,vx))*180/Math.PI,dd=Math.min(ang,360-ang);if(dd<bd){bd=dd;bt=t}}
    if(bt){this.shoot(bt);return}}}},
 shoot(t){const c=this.card;if(!c||c.done||busy)return;c.done=true;const m=this.M[t];sfx.whoosh();
  c.el.style.transition='transform .28s cubic-bezier(.4,0,.6,1)';c.x=m.x;c.y=m.y;c.el.style.transform='translate('+(m.x-c.w/2)+'px,'+(m.y-c.h/2)+'px) scale(.35)';
  const ok=topsOf(c.e).includes(t);
  setTimeout(()=>{const mg=A().querySelector('.mag[data-t="'+t+'"]');if(!mg)return;
   if(ok){mg.classList.add('yes');sfx.clank();sparks(m.x,m.y,TY[t].c,16);c.el.style.opacity='0'}
   else{mg.classList.add('nope');c.el.style.transition='transform .45s cubic-bezier(.2,1.4,.4,1),opacity .45s';c.el.style.transform='translate('+(m.x-c.w/2+(W()/2-m.x)*.4)+'px,'+(m.y-c.h/2-60)+'px) scale(.8) rotate(-16deg)';c.el.style.opacity='.4'}},280);
  judge(ok,{t},false,{x:m.x,y:m.y-this.ms*.6})},
 frame(dt,paused){const c=this.card;if(!c||c.done||c.held||paused||!qOn)return;
  const bottom=H()+c.h/2,vy=(bottom-c.y)/Math.max(left,.05);c.y+=vy*dt;c.x+=(W()/2-c.x)*Math.min(1,dt*1.2);this.place();
  if(gLeft<=15&&!this.stormShown&&!bonusMode){this.stormShown=true;const b=document.createElement('div');b.className='banner storm';b.textContent='⚡ 磁暴！分數 ✕ 2';A().appendChild(b)}},
 timeout(){const c=this.card;if(c)c.done=true},
 miss(e,pk){const j=J[e],tops=topsOf(e),mx=j.s[tops[0]];
  return {key:'mg|'+e,q:j.ic+' '+en(e)+' '+j.z+'：哪一型分數最高？',p:pk?'🧲 '+tyName(pk.t):null,a:tops.map(tyName).join(' 和 '),
   why:'美國勞動部的資料：'+j.z+'的六種興趣裡，'+tops.map(t=>TY[t].f).join('和')+' '+mx+' 分最高'+(tops.length>1?'（同分，兩個都對）':'')+'。'+(j.note?'（'+esc(j.note)+'）':''),
   hint:en(e)+' '+j.z+' ➜ '+tops.map(tyName).join('、'),sp:e}},
 stop(){removeEventListener('resize',this.onR)},
 cheat(ok){const c=this.card,tops=topsOf(c.e);this.shoot(ok?tops[0]:ORDER.split('').find(t=>!tops.includes(t)))}};

/* ══ 🔦 黑夜搜查 ══ */
const Gd={rt:true,books:()=>['all'].concat(ORDER.split('')).concat(['X']),deck:b=>BOOK[b]||[],
 setup(){const a=A();a.className='dk';
  a.innerHTML='<svg class="city" viewBox="0 0 400 100" preserveAspectRatio="none"><path d="M0 100V60h20V40h18v20h14V30h22v30h10V50h24v50zM112 100V44h16V24h20v20h14v56zM170 100V56h26V36h12v20h18v44zM232 100V30h10V14h16v16h10v70zM276 100V50h22V40h16v10h14v50zM344 100V36h18v-8h14v8h24v64z" fill="#1E2C48"/></svg>'+
   '<div id="plates"></div><div class="dark" id="dkv"></div><div class="beam" id="beam"></div><div class="ask" id="dkask"></div><div class="tip">🔦 手指滑一滑＝手電筒　👆 照到了再點它</div>';
  this.lx=W()/2;this.ly=H()*.55;this.P=[];
  this.pd=ev=>{if(!qOn||busy)return;const p=ptr(ev);this.down={x:p.x,y:p.y,t:p.t,lx:this.lx,ly:this.ly};this.light(p.x,p.y)};
  this.pm=ev=>{const p=ptr(ev);if(ev.pointerType==='mouse'||ev.buttons||ev.pressure>0)this.light(p.x,p.y)};
  this.pu=ev=>{const d=this.down;this.down=null;if(!d||!qOn||busy)return;const p=ptr(ev);if(Math.hypot(p.x-d.x,p.y-d.y)>16||p.t-d.t>600)return;
   const pl=this.hit(p.x,p.y);if(!pl)return;const r=this.lr();if(Math.hypot(pl.x-d.lx,pl.y-d.ly)<r+pl.w*.35)this.choose(pl)};
  a.addEventListener('pointerdown',this.pd);a.addEventListener('pointermove',this.pm);a.addEventListener('pointerup',this.pu)},
 lr(){return clamp(Math.min(W(),H())*.17,70,170)*(1+Math.min(streak,5)*.08)},
 light(x,y){this.lx=x;this.ly=y},
 hit(x,y){for(const p of this.P){if(Math.abs(x-p.x)<p.w/2+6&&Math.abs(y-p.y)<p.h/2+6)return p}return null},
 ask(e,o){const pl=$('#plates');pl.innerHTML='';this.P=[];this.e=e;const j=J[e];
  $('#dkask').innerHTML='<i>'+j.ic+'</i><b>'+j.z+'</b><span>的英文在哪裡？</span>';
  const n=W()<600?5:7,ws=shuf([e].concat(decoys(e,n-1)));const top=($('#dkask').offsetHeight||70)+24,bot=50,w=W(),h=H();
  for(const x of ws){const el=document.createElement('div');el.className='plate';el.innerHTML=colorWord(x);pl.appendChild(el);
   const pw=el.offsetWidth,ph=el.offsetHeight;let px,py,t=0;
   do{px=pw/2+8+Math.random()*(w-pw-16);py=top+ph/2+Math.random()*Math.max(1,h-top-bot-ph);t++}while(t<60&&this.P.some(q=>Math.abs(q.x-px)<(q.w+pw)/2+10&&Math.abs(q.y-py)<(q.h+ph)/2+10));
   const a=Math.random()*6.283,sp=18+Math.random()*26;this.P.push({e:x,el,x:px,y:py,w:pw,h:ph,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,top,bot})}
  const T=this.P.find(p=>p.e===e);if(Math.hypot(T.x-this.lx,T.y-this.ly)<this.lr()*1.2){this.lx=clamp(w-T.x,40,w-40);this.ly=clamp(h-T.y+top,top,h-bot)}
  if(o.hint)T.el.classList.add('hintg');this.hintP=o.hint?T:null;if(this.hintP){const r=document.createElement('div');r.className='beam';r.id='hring';r.style.borderColor='rgba(255,214,90,.9)';pl.appendChild(r)}},
 frame(dt,paused){const w=W(),h=H();
  if(!paused&&qOn)for(const p of this.P){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<p.w/2+4){p.x=p.w/2+4;p.vx=Math.abs(p.vx)}if(p.x>w-p.w/2-4){p.x=w-p.w/2-4;p.vx=-Math.abs(p.vx)}
   if(p.y<p.top+p.h/2){p.y=p.top+p.h/2;p.vy=Math.abs(p.vy)}if(p.y>h-p.bot-p.h/2){p.y=h-p.bot-p.h/2;p.vy=-Math.abs(p.vy)}}
  for(const p of this.P){p.el.style.left=p.x+'px';p.el.style.top=p.y+'px'}
  const r=this.lr()*(qOn&&left<5?(.75+.25*left/5):1),dv=$('#dkv'),bm=$('#beam');if(!dv)return;
  dv.style.setProperty('--lx',this.lx+'px');dv.style.setProperty('--ly',this.ly+'px');dv.style.setProperty('--lr',r+'px');
  bm.style.setProperty('--lr',r+'px');bm.style.left=this.lx+'px';bm.style.top=this.ly+'px';A().classList.toggle('flick',qOn&&left<4);
  const hr=$('#hring');if(hr&&this.hintP){hr.style.setProperty('--lr',(this.hintP.w*.7)+'px');hr.style.left=this.hintP.x+'px';hr.style.top=this.hintP.y+'px';hr.style.zIndex=5}},
 choose(p){if(busy||!qOn)return;const ok=p.e===this.e;p.el.classList.add(ok?'got':'bad');this.lx=p.x;this.ly=p.y;
  if(ok){sparks(p.x,p.y,'#FFD24A',16);say(this.e)}
  judge(ok,{e:p.e},false,{x:p.x,y:p.y-40})},
 miss(e,pk){const j=J[e];return {key:'dk|'+e,q:j.ic+' '+j.z+' 的英文是哪一個？',p:pk?'你點了 '+en(pk.e)+'（'+J[pk.e].z+'）':null,a:en(e),why:j.ic+' '+j.z+' ＝ '+en(e),hint:j.ic+' '+j.z+' ＝ '+en(e),sp:e}},
 stop(){const a=A();a.removeEventListener('pointerdown',this.pd);a.removeEventListener('pointermove',this.pm);a.removeEventListener('pointerup',this.pu)},
 cheat(ok){const p=this.P.find(x=>ok?x.e===this.e:x.e!==this.e);this.choose(p)}};

/* ══ 🥷 音節忍者 ══ */
const Gn={rt:true,books:()=>['all'].concat(ORDER.split('')).concat(['X']),deck:b=>BOOK[b]||[],
 okDelay(){return 900+sylCount(cur)*330},
 setup(){const a=A();a.className='nj';
  a.innerHTML='<div class="moon"></div>'+[6,14,82,90,95].map((x,k)=>'<span class="bam" style="left:'+x+'%;height:'+(30+k*9)+'%"></span>').join('')+
   '<div class="cuts" id="njcuts"></div><div class="wordz" id="njw"></div><div class="fuse"><i id="njf"></i></div><svg class="slash" id="njs"></svg><button class="nocut" id="nocut">🙅 這個字不用切</button>';
  this.trail=[];
  this.pd=ev=>{if(ev.target.closest('#nocut')||!qOn||busy)return;const p=ptr(ev);this.trail=[p];this.stroke=true;this.cutThis=false};
  this.pm=ev=>{if(!this.stroke)return;const p=ptr(ev),q=this.trail[this.trail.length-1];this.trail.push(p);if(this.trail.length>14)this.trail.shift();this.draw();if(!this.cutThis&&qOn&&!busy)this.cross(q,p)};
  this.pu=()=>{this.stroke=false;setTimeout(()=>{if(!this.stroke){this.trail=[];this.draw()}},120)};
  a.addEventListener('pointerdown',this.pd);a.addEventListener('pointermove',this.pm);addEventListener('pointerup',this.pu);addEventListener('pointercancel',this.pu);
  $('#nocut').addEventListener('click',()=>{if(!qOn||busy)return;if(this.need.size===0)this.win();else{this.fail({nocut:true})}})},
 ask(e,o){this.e=e;this.cuts=new Set();this.bad=null;this.need=new Set();
  sylData(e).forEach(w=>w.forEach((s,i)=>{if(i>0)this.need.add(s.a)}));
  this.render(true);$('#njcuts').textContent=o.hint?(this.need.size?'💡 要切 '+this.need.size+' 刀':'💡 這個字不用切'):'';
  setTimeout(()=>say(e),250)},
 render(fresh){const e=this.e,w=$('#njw');let h='';let pos=0;
  for(const tok of e.split(' ')){h+='<span class="tok">';let pc='',k=0;
   for(let i=pos;i<pos+tok.length;i++){if(i>pos&&(this.cuts.has(i)||this.bad===i)){h+='<span class="pc'+(k?' pcut':'')+(k%2?' r':' l')+'">'+pc+'</span>';pc='';k++}
    pc+='<span class="ch" data-i="'+i+'">'+ch(e,i)+'</span>'}
   h+='<span class="pc'+(k?' pcut':'')+(k%2?' r':(k?' l':''))+'">'+pc+'</span></span>';pos+=tok.length+1}
  w.innerHTML=h;if(fresh){w.className='wordz';let fs=Math.min(H()*.17,130);w.style.fontSize=fs+'px';
   while(fs>24&&w.scrollWidth>W()*.9){fs-=4;w.style.fontSize=fs+'px'}void w.offsetWidth;w.className='wordz bob'}},
 gaps(){/* 字母之間可以切的地方：同一個字裡、字母和字母中間 */const r=A().getBoundingClientRect(),out=[];
  const cs=[...A().querySelectorAll('#njw .ch')];for(let k=1;k<cs.length;k++){const a=+cs[k-1].dataset.i,b=+cs[k].dataset.i;if(b!==a+1)continue;
   const ra=cs[k-1].getBoundingClientRect(),rb=cs[k].getBoundingClientRect();out.push({i:b,x:(ra.right+rb.left)/2-r.left,lw:(rb.width+ra.width)/2})}return out},
 cross(p,q){const w=$('#njw').getBoundingClientRect(),r=A().getBoundingClientRect(),my=(w.top+w.bottom)/2-r.top;
  if((p.y-my)*(q.y-my)>0||p.y===q.y)return;const x=p.x+(q.x-p.x)*(my-p.y)/(q.y-p.y);if(x<w.left-r.left||x>w.right-r.left)return;
  let best=null,bd=1e9;for(const g of this.gaps()){const d=Math.abs(g.x-x);if(d<bd){bd=d;best=g}}
  if(!best||bd>best.lw*.75)return;this.cutThis=true;this.cutAt(best.i)},
 cutAt(i){if(this.cuts.has(i)||busy||!qOn)return;
  if(this.need.has(i)){this.cuts.add(i);sfx.snip();this.render(false);if(this.cuts.size===this.need.size)this.win()}
  else{this.bad=i;this.render(false);this.fail({cut:i})}},
 win(){const e=this.e;$('#njw').classList.remove('bob');const pcs=[...A().querySelectorAll('#njw .pc')],r=A().getBoundingClientRect();
  pcs.forEach((p,k)=>setTimeout(()=>{if(gid!=='ninja')return;p.classList.remove('beat');void p.offsetWidth;p.classList.add('beat');sfx.drum();
   const b=p.getBoundingClientRect(),d=document.createElement('span');d.className='drum';d.textContent='🥁';d.style.left=(b.left+b.width/2-r.left-20)+'px';d.style.top=(b.top-r.top-60)+'px';A().appendChild(d);setTimeout(()=>d.remove(),700)},250+k*330));
  setTimeout(()=>say(e),250+pcs.length*330);const wb=$('#njw').getBoundingClientRect();
  judge(true,null,false,{x:W()/2,y:wb.top-r.top-30})},
 fail(pk){const w=$('#njw');w.classList.remove('bob');w.classList.add('clang');sfx.clank();judge(false,pk)},
 draw(){const s=$('#njs');if(!s)return;const t=this.trail;s.innerHTML=t.length>1?'<polyline points="'+t.map(p=>p.x+','+p.y).join(' ')+'" fill="none" stroke="#FFF6D6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><polyline points="'+t.map(p=>p.x+','+p.y).join(' ')+'" fill="none" stroke="#D9A520" stroke-width="2.5" stroke-linecap="round"/>':''},
 frame(){const f=$('#njf');if(f)f.style.width=(100*left/qt)+'%'},
 miss(e,pk){const n=sylCount(e);let p=null;
  if(pk&&pk.nocut)p='你按了「不用切」';else if(pk&&pk.cut!=null){const cs=[...this.cuts,pk.cut].sort((a,b)=>a-b);let s='',last=0;
   for(const c of cs){s+=colorRange(e,last,c)+'<b style="color:var(--no)">｜</b>';last=c}s+=colorRange(e,last,e.length);p='你切成 <span class="en">'+s+'</span>'}
  return {key:'nj|'+e,q:J[e].ic+' '+en(e)+' '+J[e].z+'：音節要切在哪裡？',p,a:'<span class="en">'+sylColor(e,'<b style="color:var(--goldt)">｜</b>')+'</span>（'+n+' 個音節）',
   why:n===1?'只有 1 個音節（1 拍），一刀都不用切。':sylText(e)+'：'+n+' 個音節，拍 '+n+' 下。',hint:en(e)+' ＝ '+sylText(e)+'（'+n+' 拍）',sp:e}},
 stop(){const a=A();a.removeEventListener('pointerdown',this.pd);a.removeEventListener('pointermove',this.pm);removeEventListener('pointerup',this.pu);removeEventListener('pointercancel',this.pu)},
 cheat(ok){if(ok){if(!this.need.size){this.win();return}[...this.need].sort((a,b)=>a-b).forEach(i=>this.cutAt(i))}
  else{const g=this.gaps().find(x=>!this.need.has(x.i));if(g)this.cutAt(g.i);else this.fail({nocut:true})}}};

/* ══ 🕵 職業神探 ══ */
const SUS='<svg viewBox="0 0 100 120"><circle cx="50" cy="34" r="22" fill="currentColor"/><path d="M8 120c0-30 18-50 42-50s42 20 42 50z" fill="currentColor"/></svg>';
const SUSC=['#1B2B4B','#2E4470','#3A4A6B','#24375E','#33415E','#1F3354','#2B3B5C','#3B4E73'];
const Gt={rt:false,books:()=>['all'].concat(ORDER.split('')),deck:b=>(b==='all'?LIST_ITEMS:(BOOK[b]||[]).filter(e=>LIST_ITEMS.includes(e))),
 setup(){const a=A();a.className='dt';a.innerHTML='<div class="clues" id="clues"></div><div class="lineup" id="lineup"></div><div class="lens idle" id="lens">🔍</div><div class="dtip">👆 點名牌聽英文　🔍 拖到嫌疑人身上＝抓人</div>';
  const L=$('#lens');this.home();
  L.addEventListener('pointerdown',ev=>{if(!qOn||busy)return;ev.preventDefault();L.setPointerCapture(ev.pointerId);this.hold=true;L.classList.add('hold');L.classList.remove('idle')});
  L.addEventListener('pointermove',ev=>{if(!this.hold)return;const p=ptr(ev);L.style.left=p.x+'px';L.style.top=p.y+'px';const s=this.under(p);$$('.sus').forEach(x=>x.classList.toggle('near',x===s))});
  const up=ev=>{if(!this.hold)return;this.hold=false;L.classList.remove('hold');const s=this.under(ptr(ev));$$('.sus').forEach(x=>x.classList.remove('near'));if(s&&qOn&&!busy)this.accuse(s);else{this.home();L.classList.add('idle')}};
  L.addEventListener('pointerup',up);L.addEventListener('pointercancel',up);
  $('#lineup').addEventListener('click',ev=>{const s=ev.target.closest('.sus');if(s)say(s.dataset.e)});this.onR=()=>{this.lay();this.home()};addEventListener('resize',this.onR)},
 home(){const L=$('#lens');if(!L)return;const s=L.offsetWidth||90;L.style.left=(W()-s/2-14)+'px';L.style.top=(H()-s/2-12)+'px'},
 under(p){const r=A().getBoundingClientRect();for(const s of $$('.sus')){const b=s.getBoundingClientRect();if(p.x+r.left>=b.left&&p.x+r.left<=b.right&&p.y+r.top>=b.top&&p.y+r.top<=b.bottom&&!s.classList.contains('out'))return s}return null},
 lay(){const lu=$('#lineup'),cl=$('#clues');if(!lu)return;const top=cl.offsetTop+cl.offsetHeight+10,ls=($('#lens').offsetWidth||90)+24;const cols=W()>=700?4:2;
  lu.style.top=top+'px';lu.style.bottom=(W()>=700?ls*.55:ls)+'px';lu.style.right=(W()>=700?ls:12)+'px';lu.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))'},
 ask(e,o){this.e=e;const its=ITEMS.filter(i=>i.e===e);this.it=pick(its);const t=this.it.t;this.t0=performance.now();
  const same=shuf(LIST_ITEMS.filter(x=>x!==e&&J[x].top3.includes(t))).slice(0,3),rest=shuf(LIST_ITEMS.filter(x=>x!==e&&!same.includes(x))).slice(0,7-same.length);
  this.S=shuf([e].concat(same,rest));
  $('#clues').innerHTML='<div class="clue" id="cl1"><em>① 興趣類型</em><b>？</b></div><div class="clue" id="cl2"><em>② 他的工作</em><b>？</b></div><div class="clue" id="cl3"><em>③ 中文名字</em><b>？</b></div>';
  $('#lineup').innerHTML=this.S.map((x,k)=>'<div class="sus" data-e="'+esc(x)+'" style="color:'+SUSC[k%8]+'">'+SUS+'<span class="nm">'+colorWord(x)+'</span></div>').join('');
  this.shown=0;this.lay();this.home();$('#lens').classList.add('idle');if(o.hint)this.reveal(3)},
 reveal(n){const it=this.it,z=J[this.e].z;const C=[null,'<em>① 興趣類型</em><b style="color:'+TY[it.t].c+'">'+tyName(it.t)+'</b>','<em>② 他的工作</em><b>'+esc(it.zh)+'</b>','<em>③ 中文名字</em><b>'+z[0]+'＿'.repeat(Math.max(1,z.length-1))+'</b>'];
  while(this.shown<n){this.shown++;const c=$('#cl'+this.shown);c.innerHTML=C[this.shown];c.classList.add('on');sfx.pop()}},
 frame(){if(!qOn||!this.it)return;const el=qt-left;this.reveal(el>=8?3:el>=4?2:1)},
 accuse(s){const ok=s.dataset.e===this.e,L=$('#lens');const b=s.getBoundingClientRect(),r=A().getBoundingClientRect();L.style.left=(b.left+b.width/2-r.left)+'px';L.style.top=(b.top+b.height*.35-r.top)+'px';
  s.insertAdjacentHTML('beforeend','<span class="stamp'+(ok?'':' no')+'">'+(ok?'破案！':'抓錯了')+'</span>');if(ok){s.classList.add('caught');say(this.e)}
  judge(ok,{e:s.dataset.e})},
 miss(e,pk){const j=J[e],it=this.it;return {key:'dt|'+e,q:'線索：'+tyName(it.t)+'｜'+esc(it.zh)+'｜'+j.z[0]+'…',p:pk?'你抓了 '+en(pk.e)+'（'+J[pk.e].z+'）':null,a:j.ic+' '+en(e)+' '+j.z,
  why:j.z+'的工作：'+esc(it.zh),hint:en(e)+' '+j.z+'：'+esc(it.zh),sp:e}},
 stop(){removeEventListener('resize',this.onR)},
 cheat(ok){const s=$$('.sus').find(x=>ok?x.dataset.e===this.e:x.dataset.e!==this.e);this.accuse(s)}};

/* ══ 🌋 火山大逃亡 ══ */
const CLIMB='<svg viewBox="0 0 60 90"><circle cx="30" cy="16" r="11" fill="#F2D27A"/><path d="M18 14a12 12 0 0 1 24 0z" fill="#D9A520"/><circle cx="30" cy="8" r="3" fill="#FFF6D6"/><path d="M16 30h28l4 30H12z" fill="#1B2B4B"/><path d="M20 60l-4 28M40 60l4 28" stroke="#1B2B4B" stroke-width="7" stroke-linecap="round"/><path d="M16 34l-10 16M44 34l10 16" stroke="#1B2B4B" stroke-width="6" stroke-linecap="round"/><rect x="38" y="30" width="12" height="20" rx="4" fill="#D9692B"/></svg>';
const Gv={rt:true,books:()=>['all'].concat(ORDER.split('')).concat(['X']),deck:b=>BOOK[b]||[],okDelay(){return 1300},missDelay:1100,
 setup(){const a=A();a.className='vc';a.innerHTML='<div class="world" id="vw"></div><div class="lava" id="lava"></div><div class="vhud"><button class="vsay" id="vsay" aria-label="再聽一次">🔊</button><span class="m" id="vm">🧗 0 公尺</span></div>';
  this.m=0;this.ledge=null;this.cl=null;this.ST=[];this.tm=0;const w=$('#vw');
  this.sw=()=>clamp(W()*.24,120,200);this.sh=()=>clamp(H()*.11,60,96);
  const lg=document.createElement('div');lg.className='ledge';w.appendChild(lg);this.ledge=lg;this.putLedge();
  const c=document.createElement('div');c.className='climber';c.innerHTML=CLIMB;w.appendChild(c);this.cl=c;this.putClimber();
  $('#vsay').addEventListener('click',()=>{if(this.e)say(this.e)});this.onR=()=>{this.putLedge();this.putClimber()};addEventListener('resize',this.onR)},
 ly(){return H()*.74},
 putLedge(){const l=this.ledge;l.style.left=W()/2+'px';l.style.top=this.ly()+'px';l.style.width=this.sw()+'px';l.style.height=this.sh()+'px'},
 putClimber(){const c=this.cl;c.classList.remove('fall');c.style.left=W()/2+'px';c.style.top=this.ly()+'px'},
 ask(e,o){this.e=e;const ic=J[e].ic;this.ST.forEach(s=>s.el.remove());this.ST=[];
  const ds=shuf(ALL.filter(x=>x!==e&&J[x].ic!==ic));const two=[];for(const x of ds){if(two.length<2&&!two.some(y=>J[y].ic===J[x].ic))two.push(x)}
  const es=shuf([e].concat(two)),w=W(),lanes=[.2,.5,.8];
  es.forEach((x,k)=>{const el=document.createElement('div');el.className='stone';el.innerHTML='<span class="si">'+J[x].ic+'</span>';el.style.width=this.sw()+'px';el.style.height=this.sh()+'px';
   $('#vw').appendChild(el);const s={e:x,el,cx:w*lanes[k],y:H()*(.30+(k%2)*.07),amp:w*.07,ph:Math.random()*6.28,om:.7+Math.random()*.7};this.ST.push(s);
   el.style.opacity='0';el.style.top=(s.y-40)+'px';requestAnimationFrame(()=>{el.style.transition='opacity .4s,top .4s';el.style.opacity='1';el.style.top=s.y+'px'});
   el.addEventListener('pointerdown',ev=>{ev.preventDefault();if(qOn&&!busy)this.jump(s)});if(o.hint&&x===e)el.classList.add('hintg')});
  $('#vsay').classList.add('on');setTimeout(()=>{if(this.e===e)say(e,()=>$('#vsay')&&$('#vsay').classList.remove('on'))},350)},
 frame(dt,paused){if(!paused)this.tm+=dt;const w=W(),sw=this.sw();
  for(const s of this.ST){if(s.fixed)continue;const x=clamp(s.cx+s.amp*Math.sin(this.tm*s.om+s.ph),sw/2+4,w-sw/2-4);s.x=x;s.el.style.left=x+'px'}
  const lv=$('#lava');if(lv){const k=qOn||busy?1-left/qt:0,hh=H()*.06+(H()-this.ly()-H()*.02)*k*.92;lv.style.height=hh+'px'}},
 jump(s){const ok=s.e===this.e,c=this.cl;s.fixed=true;sfx.jump();c.style.left=s.x+'px';c.style.top=s.y+'px';
  if(ok){s.el.classList.add('ok');this.m+=3;setTimeout(()=>{$('#vm').textContent='🧗 '+this.m+' 公尺';say(this.e);this.climb(s)},560)}
  else{setTimeout(()=>{s.el.classList.add('crack');c.classList.add('fall');c.style.left=W()/2+'px';c.style.top=this.ly()+'px';const lv=$('#lava');lv.classList.remove('surge');void lv.offsetWidth;lv.classList.add('surge')},560)}
  judge(ok,{e:s.e},false,{x:s.x,y:s.y-50})},
 climb(s){/* 鏡頭往上：踩到的石頭變成新的平台 */const dy=this.ly()-s.y,old=this.ledge;this.ST.forEach(o=>{if(o!==s)o.el.style.opacity='0'});
  [old,s.el,this.cl].forEach(x=>{x.style.transition='top .6s cubic-bezier(.3,1,.4,1),left .6s cubic-bezier(.3,1,.4,1),opacity .4s'});
  old.style.top=(this.ly()+dy)+'px';s.el.style.top=this.ly()+'px';s.el.style.left=W()/2+'px';this.cl.style.top=this.ly()+'px';this.cl.style.left=W()/2+'px';
  A().style.backgroundPosition='0 '+(this.m*6)+'px';
  setTimeout(()=>{old.remove();s.el.className='ledge';s.el.innerHTML='';s.el.style.transition='';this.ledge=s.el;this.ST=this.ST.filter(o=>o!==s);this.cl.style.transition=''},650)},
 timeout(){const lv=$('#lava');if(lv){lv.classList.remove('surge');void lv.offsetWidth;lv.classList.add('surge')}},
 endLine(){return '<span>🧗 爬了 <b>'+this.m+'</b> 公尺</span>'},
 miss(e,pk){const j=J[e];return {key:'vc|'+e,q:'🔊 聽到的英文是？',p:pk?'你跳到 '+J[pk.e].ic+'（'+en(pk.e)+' '+J[pk.e].z+'）':null,a:j.ic+' '+en(e)+' '+j.z,why:'',hint:en(e)+' ＝ '+j.ic+' '+j.z,sp:e}},
 stop(){removeEventListener('resize',this.onR);this.e=null},
 cheat(ok){const s=this.ST.find(x=>ok?x.e===this.e:x.e!==this.e);s.x=s.x||s.cx;this.jump(s)}};
const GAMES={magnet:Gm,dark:Gd,ninja:Gn,detect:Gt,lava:Gv};

/* ══════════ 成績紀錄（照參考頁 sentences/games.html 的 score 程式；Google 成績表同一張）══════════
   SCG 0 ＝ 三、四年級共用：年級看登入的 5 碼。題組代號 g年級 gm_job-遊戲（成績表「類別」＝ 🎮 遊戲，「題組名稱」寫職業單字・遊戲名）。
   2026/10/9 使用者要求：登入一看就懂、清楚知道下一步；班級打錯，已經打的班級號碼立刻清空，可以馬上重打。 */
const SCG=0,SCSRC='school';
const SCURL=String(window.SCORE_URL||'').trim(),SCON=!!SCURL&&!window.__SCORE_TEST_OFF;
const SCCLS={3:['304','307','311'],4:['402','406','409','410']},SCDEMO='30405';
function scGet(k){try{return JSON.parse(localStorage.getItem('score_'+k)||'null')}catch(e){return null}}
function scPut(k,v){try{localStorage.setItem('score_'+k,JSON.stringify(v))}catch(e){}}
let SCID=scGet('last'),SCGUEST=false,SCDEV=scGet('dev'),SCV=null,SCIN='',SCEND=null;
if(!SCDEV){SCDEV=Math.random().toString(36).slice(2,8);scPut('dev',SCDEV)}
function scGr(){return SCID?+String(SCID).charAt(0):0}
function scLive(){return SCON&&!!SCID&&!SCGUEST}
function scOn(){return SCH.on()}
function scCheck(id){if(!/^\d{5}$/.test(id))return {err:'len'};const c=id.slice(0,3),s=+id.slice(3),g=c[0]==='3'?3:(c[0]==='4'?4:0);
 if(!g||SCCLS[g].indexOf(c)<0)return {err:'cls',cls:c};if(s<1||s>40)return {err:'seat'};return {id,cls:c,seat:s,g}}
const clsOk=c=>SCCLS[3].indexOf(c)>-1||SCCLS[4].indexOf(c)>-1;
function scFetch(q,body,ms){return new Promise((ok,no)=>{let done=false;const t=setTimeout(()=>{if(!done){done=true;no(new Error('timeout'))}},ms||9000);
 const u=SCURL+(q?(SCURL.indexOf('?')<0?'?':'&')+q:'');
 fetch(u,body?{method:'POST',body:JSON.stringify(body)}:{}).then(r=>r.json()).then(j=>{if(!done){done=true;clearTimeout(t);ok(j)}},e=>{if(!done){done=true;clearTimeout(t);no(e)}})})}
let SCBUSY=false;const SCRES={};
function scFlush(){if(!SCON||SCBUSY)return Promise.resolve(null);let Q=scGet('q')||[];if(!Q.length)return Promise.resolve(null);SCBUSY=true;let last=null;
 const step=()=>{Q=scGet('q')||[];if(!Q.length){SCBUSY=false;return last}const r=Q[0];
  return scFetch('',{a:'rec',r}).then(j=>{if(j&&(j.saved||j.err==='bad')){Q=(scGet('q')||[]).filter(x=>x.u!==r.u);scPut('q',Q);if(j.saved){SCRES[r.u]=j;last=j}return step()}SCBUSY=false;return last},()=>{SCBUSY=false;return last})};
 return step()}
if(SCON){setTimeout(scFlush,1500);addEventListener('online',()=>scFlush())}
function scGate(fn){if(SCON&&!SCID&&!SCGUEST){scLogin(fn);return}fn()}
/* ── 登入（2026/10/9 改版）：① 打班級 ➜ ② 打座號 ➜ ③ 按 ✅，正在做的那一步會亮；班級打錯立刻清空 ── */
let SCTYPED='',SCLOGAFTER=null;
function scLogin(after){sayStop();SCH.open();SCTYPED='';SCLOGAFTER=after||null;
 SCH.box().innerHTML='<div class="sclog"><h2>🔢 先登入，成績才會記下來</h2>'+
  '<div class="scsteps"><span id="scSt1">① 🏫 打班級</span><i>➜</i><span id="scSt2">② 🪑 打座號</span><i>➜</i><span id="scSt3">③ ✅ 按綠色勾勾</span></div>'+
  '<div class="scgrp" id="scGrp"><div class="c"><span class="lb">🏫 班級</span><div class="scbox"><i></i><i></i><i></i></div></div><div class="s"><span class="lb">🪑 座號</span><div class="scbox"><i></i><i></i></div></div></div>'+
  '<div class="scmsg" id="scMsg"></div>'+
  '<div class="sckey">'+[1,2,3,4,5,6,7,8,9].map(n=>'<button data-k="'+n+'">'+n+'</button>').join('')+'<button class="bs" data-k="b" aria-label="刪掉一個">⌫</button><button data-k="0">0</button><button class="okb" data-k="ok" aria-label="確定">✅</button></div>'+
  SCH.back+'</div>';
 scPaint()}
function scPaint(err){const v=SCTYPED,cs=$$('#scGrp .scbox i');
 cs.forEach((c,n)=>{const d=v.charAt(n);if(c.textContent!==d&&d){c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop')}c.textContent=d;c.classList.toggle('f',!!d);c.classList.toggle('cur',n===v.length)});
 const st=v.length<3?1:v.length<5?2:3;[1,2,3].forEach(k=>{const s=$('#scSt'+k);s.classList.toggle('now',k===st);s.classList.toggle('done',k<st)});
 $('.sckey .okb').classList.toggle('ready',v.length===5);
 const m=$('#scMsg');if(err){m.className='scmsg err';m.innerHTML=err;return}m.className='scmsg';
 m.innerHTML=v.length===0?'👆 先打你的<b>班級</b>（3 個數字）<small>例：304 班 5 號 ➜ 打 3 0 4 0 5</small>':v.length<3?'班級還要 '+(3-v.length)+' 個數字':
  v.length===3?'👍 '+v+' 班！再打你的<b>座號</b>（2 個數字）<small>5 號 ➜ 打 0 5</small>':v.length===4?'座號還要 1 個數字':'對嗎？'+v.slice(0,3)+' 班 '+(+v.slice(3))+' 號 ➜ 按綠色的 ✅'}
function scShake(){const b=$('#scGrp');b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');sfx.no()}
function scKeyPress(k){if(!$('#scGrp'))return;
 if(k==='b'){SCTYPED=SCTYPED.slice(0,-1);scPaint();return}
 if(k==='ok'){const r=scCheck(SCTYPED);
  if(r.err==='len'){scShake();scPaint(SCTYPED.length<3?'🏫 先打完班級（3 個數字）':'🪑 座號要打 2 個數字（5 號 ➜ 0 5）');return}
  if(r.err){scShake();scPaint('再看一次');return}scWho(r);return}
 if(SCTYPED.length>=5)return;SCTYPED+=k;
 if(SCTYPED.length===3&&!clsOk(SCTYPED)){const bad=SCTYPED;SCTYPED='';scShake();
  scPaint('🏫 沒有 '+bad+' 班！已經幫你清掉了，請重新打班級<small>三年級：304、307、311　四年級：402、406、409、410</small>');return}
 if(SCTYPED.length===5){const s=+SCTYPED.slice(3);if(s<1||s>40){const bad=SCTYPED.slice(3);SCTYPED=SCTYPED.slice(0,3);scShake();scPaint('🪑 沒有 '+bad+' 號！請重新打座號（01～40）');return}}
 scPaint()}
function scWho(r){const go=()=>{SCID=r.id;scPut('id_g'+r.g,SCID);scPut('last',SCID);SCGUEST=false;$('#scme').innerHTML=scMeHTML();const a=SCLOGAFTER;SCLOGAFTER=null;SCH.close();if(a)a()};
 const m=$('#scMsg');m.className='scmsg ok';m.textContent='✅ '+r.cls+' 班 '+r.seat+' 號';
 scFetch('a=who&id='+r.id,null,3000).then(j=>{if(!j||!j.roster||!j.name){go();return}
  SCH.box().innerHTML='<div class="scwho"><div>你是 '+r.cls+' 班 '+r.seat+' 號</div><div style="color:var(--goldt);font-size:1.3em">'+esc(j.name)+'</div><div>嗎？</div><div class="scnav"><button class="go" id="scYes">✅ 是我</button><button id="scNo">❌ 重新輸入</button></div></div>';
  $('#scYes').onclick=go;$('#scNo').onclick=()=>scLogin(SCLOGAFTER)},()=>setTimeout(go,500))}
function scMeHTML(){if(!SCON)return '';if(!SCID)return '<span class="scme">🔢 還沒登入<button id="scSwap">🔢 登入</button></span>';
 return '<span class="scme">🪑 '+SCID.slice(0,3)+' 班 '+(+SCID.slice(3))+' 號<button id="scSwap">換人</button></span>'}
function scStart(gt){SCV=null;SCIN='';clearTimeout(SCAUTO);SCEND=null;if(!scLive())return;const my=SCH.key();
 scFetch('a=view&id='+SCID+'&set='+encodeURIComponent(my)+(gt?'&gt=1':''),null,6000).then(j=>{if(j&&!j.err&&SCH.key()===my){SCV=j;SCH.rk()}},()=>{})}
function scRk(s){if(!SCV)return '🏫 本班排名';if(!SCV.boards)return '💪 加油！';const o=(SCV.set&&SCV.set.others)||[];let n=1;o.forEach(x=>{if(x>s)n++});
 if(n<=10)return '🏅 本班第 '+n+' 名';return '⬆ 再 '+(o[9]-s+1)+' 分進前 10'}
const SCLIST={g:['acc','gprog','gtop']};
function scS100(Q){const n=Q.length;let s=0;Q.forEach(q=>{if(q[0])s+=60/n+40/n*q[4]});return Math.round(s)}
function scEnd(o){const m='g',Q=o.qs,key=SCH.key(),n=Q.length;let ok=0;Q.forEach(q=>{ok+=q[0]});if(!n)return false;
 const acc=Math.round(ok/n*100),u=SCID+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
 const R={id:SCID,set:key,name:SCH.name(),m,qs:Q,raw:Math.round(o.raw||0),fix:o.fix||0,mp:0,mw:0,sec:Math.round(o.sec||0),src:SCSRC,dev:SCDEV,u,t:Date.now()};
 const hk='h_'+SCID+'_'+key,Hs=scGet(hk)||[],sv=SCV&&SCV.set;
 const prev=sv&&sv.tries?sv.prev:(Hs.length?Hs[Hs.length-1].acc:null),best=sv&&sv.tries?sv.best:(Hs.length?Math.max.apply(null,Hs.map(x=>x.acc||0)):null);
 const today=Math.floor((Date.now()+288e5)/864e5),cnt=n<10?false:ok*3>=n*2,todayN=sv?sv.today:Hs.filter(x=>x.d===today&&x.c).length;
 Hs.push({t:R.t,acc,c:cnt,d:today});scPut(hk,Hs.slice(-50));const QQ=scGet('q')||[];QQ.push(R);scPut('q',QQ.slice(-200));SCIN=u;
 SCEND={m,list:SCLIST[m],acc,ok,n,s:scS100(Q),raw:R.raw,fix:R.fix,sec:R.sec,prev,best,cnt,cap:cnt&&todayN>=3,week:(SCV&&SCV.me?SCV.me.count:null),res:null,fail:false,k:0,tab:'acc',scope:'cls'};
 const send=k=>{scFlush().then(()=>{if(!SCEND||SCIN!==u)return;const j=SCRES[u],lf=(scGet('q')||[]).some(x=>x.u===u);
  if(!j&&lf&&k<3){setTimeout(()=>send(k+1),1500);return}if(j)SCEND.res=j;else SCEND.fail=true;const nm=SCEND.list[SCEND.k];if(nm==='gtop'||nm==='gprog')scScene()})};
 send(0);return true}
let SCAUTO=null;
function scGo(k){SCEND.k=k;scScene()}
function scNext(){scGo(Math.min(SCEND.k+1,SCEND.list.length-1))}
function scRing(E,t){const R=46,L=2*Math.PI*R;return '<div class="sct">'+t+'</div><div class="scring"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="'+R+'"></circle><circle class="fg" id="scFg" cx="50" cy="50" r="'+R+'" stroke-dasharray="'+L+'" stroke-dashoffset="'+L+'"></circle></svg><b><span id="scAcc">0</span><small>'+E.ok+' ／ '+E.n+' 題</small></b></div>'}
function scPrevHTML(E,small){const up=E.prev!=null?E.acc-E.prev:null,pb=E.best!=null&&E.acc>E.best,f=small?' style="font-size:clamp(34px,6.6vh,64px)"':'';
 const big=E.prev==null?'<div class="scbig pb scpop"'+f+'>⭐ 第一次紀錄：'+E.acc+'%</div>':E.acc===100&&E.prev===100?'<div class="scbig pb scpop"'+f+'>🔥 保持 100%！</div>':
  pb?'<div class="scbig pb scpop"'+f+'>🏅 新紀錄！🚀 ＋'+up+'%</div>':up>0?'<div class="scbig up scpop"'+f+'>🚀 ＋'+up+'%</div>':up===0?'<div class="scbig scpop"'+f+'>👍 跟上次一樣 '+E.acc+'%</div>':
  '<div class="scbig scpop" style="font-size:clamp(30px,6vh,56px)">💪 上次 '+E.prev+'%，這次 '+E.acc+'%</div>';
 return (E.prev!=null?'<div class="scbars"><div class="scbar"><span class="lb">上一次</span><span class="tr"><i data-w="'+E.prev+'"></i></span><span class="vl">'+E.prev+'%</span></div><div class="scbar now"><span class="lb">這一次</span><span class="tr"><i data-w="'+E.acc+'"></i></span><span class="vl">'+E.acc+'%</span></div></div>':'')+big}
function scCntHTML(E){const res=E.res&&E.res.me?E.res.me.count:(E.week!=null?E.week+(E.cnt&&!E.cap?1:0):null),need=Math.ceil(E.n*2/3);
 return (E.cnt?(E.cap?'<div class="scstamp">✅ 很棒！</div><div class="scs">今天這個遊戲已經算滿 3 次，明天再來，次數會再加！📅</div>':'<div class="scstamp">✅ 算 1 次！</div>'):
  E.n<10?'<div class="scstamp no">再多答 '+(10-E.n)+' 題</div><div class="scs">一場要答 10 題以上才算 1 次 💪</div>':'<div class="scstamp no">再多對 '+(need-E.ok)+' 題</div><div class="scs">就算 1 次 💪（'+E.n+' 題要對 '+need+' 題）</div>')+
  (res!=null?'<div class="sccnt">🔁 這週 <b>'+res+'</b> 次</div>':'')}
function scScene(){clearTimeout(SCAUTO);if(!SCEND||!scOn())return;const E=SCEND,L=E.list,k=E.k,nm=L[k],last=k===L.length-1;let h='';
 const dots='<div class="scdots">'+L.map((x,n)=>'<i'+(n===k?' class="on"':'')+'></i>').join('')+'</div>';
 const nav=()=>'<div class="scnav">'+(!last?'<button class="go" id="scNx">➡ 下一步</button><button id="scSkip">⏭ 跳過</button>':'')+'</div>';
 if(nm==='acc'){h=scRing(E,'🎯 正確率（每一題第一次作答）')+'<div class="scs">⚡ 總分 '+E.s+' 分（答對 60 ＋ 速度 40）</div>'+(E.fix?'<div class="scfix">✨ 訂正成功 '+E.fix+' 題</div>':'')+'<div class="scnote">🎁 驚喜卡、連對加成是運氣，不算進成績</div>'+nav();SCAUTO=setTimeout(scNext,3600)}
 else if(nm==='gprog'){h='<div class="sct">🚀 跟上一次比</div>'+scPrevHTML(E,1)+scCntHTML(E)+nav();SCAUTO=setTimeout(scNext,4200)}
 else h=scGtopHTML()+SCH.btns(E);
 SCH.box().innerHTML='<div class="scn" id="scn">'+dots+h+'</div>';
 if(nm==='acc')setTimeout(()=>{const f=$('#scFg'),a=$('#scAcc');if(!f)return;const Lw=+f.getAttribute('stroke-dasharray');f.setAttribute('stroke-dashoffset',Lw*(1-E.acc/100));
  const t0=Date.now(),iv=setInterval(()=>{const x=Math.min(1,(Date.now()-t0)/1300);if(!$('#scAcc')){clearInterval(iv);return}a.textContent=Math.round(E.acc*x)+'%';if(x>=1)clearInterval(iv)},40)},80);
 setTimeout(()=>$$('.scbar .tr i').forEach(x=>x.style.width=x.getAttribute('data-w')+'%'),80)}
function scPodHTML(L,fmt){const pod=[1,0,2].map(n=>{const x=L[n];if(!x)return '<div></div>';
  return '<div class="p'+Math.min(x.rk,3)+(x.id===SCID?' me':'')+'"><span class="id">'+x.id+'</span><span class="v">'+fmt(x)+'</span><span class="st">'+(x.rk===1?'🥇':x.rk===2?'🥈':'🥉')+'</span></div>'}).join('');
 const rest=L.slice(3).map(x=>'<div'+(x.id===SCID?' class="me"':'')+'><span><em>'+x.rk+'</em> '+x.id+'</span><span>'+fmt(x)+'</span></div>').join('');
 return '<div class="scpod">'+pod+'</div>'+(rest?'<div class="sclist">'+rest+'</div>':'')}
function scGtopHTML(){const E=SCEND,V=E.res,T='<div class="sct">🏆 這個遊戲　本班前 10 名（這週）</div>';
 if(!V&&!E.fail)return T+'<div class="scwait"><i>⏳</i> 正在送出成績…</div>';
 if(!V)return '<div class="sct">📶 現在沒有網路</div><div class="scs">成績先存在這台平板，連上網會自動送出 ✅</div>';
 if(!V.boards||!V.gtop)return '<div class="sct">💪 成績送出去了 ✅</div><div class="scs">下次再挑戰更高的正確率！</div>';
 const G2=V.gtop,L=G2.list;let mine;
 if(G2.rk)mine='<div class="scmine">🪑 你是第 '+G2.rk+' 名！🎉</div>';
 else if(G2.cut!=null&&G2.best&&G2.cut-G2.best.acc>=0&&G2.cut-G2.best.acc<=20)mine='<div class="scmine">🪑 你：⬆ 再 '+Math.max(1,G2.cut-G2.best.acc)+' 分進前 10</div>';
 else mine='<div class="scmine">🪑 你：⭐ 你的紀錄 '+(G2.best?G2.best.acc:E.acc)+'%，下次打敗它！</div>';
 if(!L.length)return T+'<div class="scempty">這週還沒有人上榜，你可以當第一個！</div>'+mine;
 return T+scPodHTML(L,x=>x.acc+'%')+mine}
function gOv(){let o=$('#scov');if(!o){o=document.createElement('div');o.id='scov';o.innerHTML='<div id="scovb"></div>';document.body.appendChild(o)}return o}
const SCH={rkTxt:'',on:()=>gOv().classList.contains('on'),open:()=>gOv().classList.add('on'),close:()=>{clearTimeout(SCAUTO);gOv().classList.remove('on')},box:()=>$('#scovb'),
 back:'<div class="scnav"><button data-sca="close">⬅ 回遊戲大廳</button></div>',
 key:()=>'g'+scGr()+'gm_job-'+gid,
 name:()=>{const m=META.find(x=>x.id===gid)||{};return '職業單字・'+(m.ic||'')+' '+(m.name||gid)},
 rk:()=>{SCH.rkTxt=scRk(score)},
 act:a=>{SCH.close();if(a==='again')begin(gid,BK);else if(a==='hub')hub('games');else if(a==='close'&&document.body.dataset.s!=='end')hub('games')},
 btns:()=>'<div class="scnav"><button class="go" data-sca="again">🔁 再玩一次</button><button data-sca="hub">🎮 換一個遊戲</button><button data-sca="close">📋 回到結算</button></div>'};

/* ══ 事件 ══ */
$('#grid').addEventListener('click',e=>{const c=e.target.closest('.gcard');if(c)bookPage(c.dataset.g)});
$('#book').addEventListener('click',e=>{const b=e.target.closest('[data-bk]');if(!b)return;const id=BOOKID;scGate(()=>begin(id,b.dataset.bk))});
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)dexPaint(b.dataset.b)});
document.addEventListener('click',ev=>{
 const sb=ev.target.closest('.say1');if(sb){ev.stopPropagation();say(sb.dataset.e);return}
 const yb=ev.target.closest('.sylb');if(yb){ev.stopPropagation();openSheet(yb.dataset.e,'clap');return}
 const dc=ev.target.closest('.dc');if(dc){openSheet(dc.dataset.e);return}
 const t=ev.target;
 if(t.closest('#scSwap')){SCID=null;scPut('last',null);SCGUEST=false;scLogin(()=>{$('#scme').innerHTML=scMeHTML()});return}
 if(!scOn())return;let b;
 if((b=t.closest('.sckey button'))){scKeyPress(b.getAttribute('data-k'));return}
 if((b=t.closest('[data-sca]'))){SCH.act(b.getAttribute('data-sca'));return}
 if(!SCEND||!t.closest('#scn'))return;
 if(t.closest('#scSkip')){scGo(SCEND.list.length-1);return}
 if(t.closest('#scNx')){scNext();return}
 const nm=SCEND.list[SCEND.k];if((nm==='acc'||nm==='gprog')&&!t.closest('button'))scNext()});
document.addEventListener('keydown',ev=>{if($('#scGrp')&&scOn()){if(/^\d$/.test(ev.key))scKeyPress(ev.key);else if(ev.key==='Backspace')scKeyPress('b');else if(ev.key==='Enter')scKeyPress('ok');return}
 const dc=ev.target.closest&&ev.target.closest('.dc');if(dc&&(ev.key==='Enter'||ev.key===' ')&&ev.target===dc){ev.preventDefault();openSheet(dc.dataset.e)}
 if(ev.key==='Escape'&&$('#sheet').classList.contains('on'))closeSheet()});
$('#sheet').addEventListener('click',ev=>{if(ev.target.id==='sheet'||ev.target.closest('#xbtn')){closeSheet();return}
 if(ev.target.closest('#psay')){say($('#sheet').dataset.e);return}const m=ev.target.closest('.sbtn button');if(m)playSyl($('#sheet').dataset.e,m.dataset.m)});
$('#quit').addEventListener('click',()=>hub('games'));
$('#retry').addEventListener('click',()=>{SCH.close();begin(gid,BK)});
$('#backhub').addEventListener('click',()=>hub('games'));
$('#missBtn').addEventListener('click',()=>missAll('這一場　答錯整理'));
$('#gscore').addEventListener('click',()=>{if(SCEND){SCH.open();scScene()}});
(function(){const saved=store('rate');if(saved)setRate(saved);const mark=()=>$$('#rateGrp button').forEach(b=>b.classList.toggle('on',Math.abs(parseFloat(b.dataset.r)-RATE)<0.001));mark();
 $('#rateGrp').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;setRate(b.dataset.r);store('rate',RATE);mark();sayStop()})})();
/* 網址：jobdex.html#magnet ＝ 直接到那個遊戲的「選一本」；#dex ＝ 圖鑑；#dex-R ＝ 圖鑑的實用型 */
function route(){const h=location.hash.slice(1);
 if(GAMES[h]){if(document.body.dataset.s==='play'&&gid===h)return;bookPage(h);return}
 const m=h.match(/^dex(?:-([A-Z]))?$/);if(m){hub();dexPaint(BOOK[m[1]]?m[1]:'all');setTimeout(()=>$('#dex').scrollIntoView(),30);return}
 if(h==='games'){hub('games');return}
 if(document.body.dataset.s!=='hub')hub()}
dexPaint('all');gridPaint();$('#scme').innerHTML=scMeHTML();route();
addEventListener('hashchange',()=>{if(document.body.dataset.s!=='play')route()});
window.JX={GAMES,begin,judge,setLeft:s=>{gLeft=s},state:()=>({gid,score,right,wrong,streak,gLeft,left,qt,qOn,busy,ended,bonusMode,gPause,asked,cur,miss:MISSLOG.length,opened:opened.length,GQ:GQ.length,fix:gFix})};
