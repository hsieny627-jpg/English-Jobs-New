/* _score_cards.js — 📇 單字卡（story.html）也記進老師的成績系統（2026-10-17 使用者：「職業單字網站：全部連到老師的成績系統」＋選擇題「字卡也要算」）
 * 跟 jobdex.html 同一張 Google 成績表（score-url.js）、同一個登入（localStorage score_…，同一個網域，兩個網站共用）。只寫 ES5。
 *   👀 看字卡：點、捲動之間最多算 2 分鐘；3 分鐘沒動 ＝ 那一段不算；5 分鐘或離開這一頁存一筆（m:'v'，代號 g年級v_job）➜ 加進「練習時間」
 *   🎧 聽完字卡：一張卡 6 步都看完（走到第 6 步）＝ 聽完 1 張；一站 6 張（第 1～6 張 ＝ 第 1 站…共 6 站）都聽完 ＝ 送一筆（m:'l'，代號 g年級l_job-s站）
 *               ＝ 練習次數 ＋1、那一天算練了 1 天（同一站一天最多 3 次，成績系統的 CAP 管）
 *   📌 老師的任務／📅 一鍵設定：老師把「💼 職業單字 字卡 第 N 站」放進任務 ➜ 照任務的時間開關（規則跟 AI-Agent-Open-Code score/_calc.js 的 tkLock 一樣）
 *   沒登入：右上角〔🔑 登入 記練習〕（5 碼：班級＋座號），不登入也可以看，只是不記。
 * 規格：本 repo CLAUDE.md「2026-10-17 單字卡記成績」；成績系統那邊 AI-Agent-Open-Code/score/CLAUDE.md。 */
var SCJOB=(function(){
  var URL=String(window.SCORE_URL||'').trim(),ON=!!URL&&!window.__SCORE_TEST_OFF,CLS={3:['304','307','311'],4:['402','406','409','410','400']},IDLE=180000,VMAX=120000,PER=6;
  function g(k){try{return JSON.parse(localStorage.getItem('score_'+k)||'null')}catch(e){return null}}
  function p(k,v){try{localStorage.setItem('score_'+k,JSON.stringify(v))}catch(e){}}
  function id(){var x=g('last'),a=g('act');if(!x)return null;if(a&&Date.now()-a>=IDLE){['id_g3','id_g4','last'].forEach(function(k){p(k,null)});return null}return String(x)}
  function act(){if(id())p('act',Date.now())}
  function chk(s){s=String(s).replace(/\D/g,'');if(s.length!==5)return {err:'要打 5 個數字'};var c=s.slice(0,3),n=+s.slice(3),gr=c.charAt(0)==='3'?3:c.charAt(0)==='4'?4:0;
    if(!gr||CLS[gr].indexOf(c)<0)return {err:'🏫 沒有 '+c+' 班'};if(n<1||n>30)return {err:'🪑 座號 要 01～30'};return {id:s,g:gr}}
  function fetchJ(q,body){return fetch(URL+(q?(URL.indexOf('?')<0?'?':'&')+q:''),body?{method:'POST',body:JSON.stringify(body)}:{}).then(function(r){return r.json()})}
  var BUSY=false;
  function flush(){if(!ON||BUSY)return;var Q=g('q')||[];if(!Q.length)return;BUSY=true;var r=Q[0];
    fetchJ('',{a:'rec',r:r}).then(function(j){BUSY=false;if(j&&(j.saved||j.err==='bad')){p('q',(g('q')||[]).filter(function(x){return x.u!==r.u}));flush()}},function(){BUSY=false})}
  function push(r){var Q=g('q')||[];Q.push(r);p('q',Q.slice(-200));flush()}
  function uid(x){return x+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  /* 👀 看字卡 */
  var V={last:0,acc:0,id:null};
  function vAct(){var n=Date.now(),me=id(),live=!!me&&!document.hidden;if(V.id&&V.id!==me)vSave();
    if(live&&V.last&&V.id===me){var d=n-V.last;if(d<=IDLE)V.acc+=Math.min(d,VMAX)}V.last=live?n:0;if(live)V.id=me}
  function vSave(){var me=V.id,sec=Math.round(V.acc/1000);V.acc=0;if(!me)return;if(me!==id())V.id=null;if(sec<1)return;
    push({id:me,set:'g'+me.charAt(0)+'v_job',name:'👀 職業單字 字卡',m:'v',qs:[],sec:Math.min(3600,sec),src:'school',dev:String(g('dev')||''),u:uid(me),t:Date.now()})}
  /* 🎧 聽完字卡：k ＝ 第幾張（0 開始），n ＝ 全部幾張 */
  function heard(k,n){var me=id();if(!ON||!me)return;var st=Math.floor(k/PER)+1,cnt=Math.min(PER,n-(st-1)*PER),d=Math.floor((Date.now()+288e5)/864e5),H=g('hdj');
    if(!H||H.d!==d||H.id!==me||!H.s)H={d:d,id:me,s:{}};var a=H.s[st]=H.s[st]||[];if(a.indexOf(k)<0)a.push(k);
    if(a.length>=cnt){H.s[st]=[];push({id:me,set:'g'+me.charAt(0)+'l_job-s'+st,name:'🎧 職業單字 字卡 第 '+st+' 站',m:'l',qs:[],sec:0,src:'school',dev:String(g('dev')||''),u:uid(me),t:Date.now()});toast('🎧 第 '+st+' 站 6 張 都聽完了！練習次數 ＋1')}
    p('hdj',H);chip()}
  /* 📌 任務（老師看板）：跟成績系統 tkLock 一樣的規則 */
  var TK=null;
  function tkLock(T,key,now){var act=[],mine=[],i,t;for(i=0;i<(T||[]).length;i++){t=T[i];var on=t.from<=now&&now<=t.to;if(on)act.push(t);if(t.items.indexOf(key)>=0)mine.push(t)}
    var a=mine.filter(function(x){return x.from<=now&&now<=x.to});if(a.length)return {k:'open'};
    if(mine.length){var f=mine.filter(function(x){return x.from>now});return f.length?{k:'soon',from:Math.min.apply(null,f.map(function(x){return x.from}))}:{k:'end'}}
    if(act.length)return {k:'off'};return {k:'free'}}
  function tkLoad(){var me=id();if(!ON||!me)return;fetchJ('a=tasks&id='+me).then(function(j){if(j&&j.ok)TK={id:me,off:(+j.now||Date.now())-Date.now(),tasks:j.tasks||[]}},function(){})}
  function lockOf(k){var me=id();if(!TK||!me||TK.id!==me)return null;var L=tkLock(TK.tasks,'g'+me.charAt(0)+'l_job-s'+(Math.floor(k/PER)+1),Date.now()+TK.off);return L.k==='free'||L.k==='open'?null:L}
  function tm(ms){var d=new Date(ms),z=function(n){return (n<10?'0':'')+n};return (d.getMonth()+1)+'/'+d.getDate()+' '+z(d.getHours())+':'+z(d.getMinutes())}
  function lockMsg(L){return L.k==='soon'?'老師 設定 '+tm(L.from)+' 才 開放':L.k==='end'?'已經 截止 了':'老師 現在 指定 別的 練習'}
  /* 畫面：右上角的小牌子、登入、提醒 */
  var css='#scj{position:fixed;top:max(8px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right));z-index:60;display:flex;gap:6px;align-items:center}'+
    '#scj button,#scjov button{font:inherit;font-weight:700;border-radius:14px;min-height:48px;padding:4px 14px;font-size:20px;border:3px solid #FFD54A;background:#3A2E08;color:#FFE9A8;cursor:pointer}'+
    '#scj .ok{border-color:#3BD16F;background:#0F2A1C;color:#D7FBE4}'+
    '#scjov{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.88);display:none;align-items:center;justify-content:center;padding:16px}#scjov.on{display:flex}'+
    '#scjov .b{background:#0B1118;border:4px solid #FFD54A;border-radius:24px;padding:18px;text-align:center;color:#fff;max-width:520px;width:100%;font-size:26px}'+
    '#scjov .box{display:flex;justify-content:center;gap:8px;margin:12px 0}#scjov .box i{width:58px;height:72px;border:3px solid #4A5A6C;border-radius:14px;font-style:normal;font-size:44px;display:flex;align-items:center;justify-content:center}'+
    '#scjov .k{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}#scjov .k button{min-height:64px;font-size:32px;border-color:#34475C;background:#16212D;color:#fff}#scjov .m{min-height:1.4em;color:#FFB38A;font-size:22px}'+
    '#scjt{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:65;background:#0F2A1C;border:3px solid #3BD16F;border-radius:18px;padding:8px 18px;font-size:24px;color:#fff;font-weight:700;display:none;max-width:94vw}#scjt.on{display:block}';
  function el(h){var d=document.createElement('div');d.innerHTML=h;return d.firstChild}
  function chip(){var c=document.getElementById('scj');if(!c||!ON)return;var me=id();
    c.innerHTML=me?'<button class="ok" data-scj="out">✅ '+me+' 記 練習中　👋 登出</button>':'<button data-scj="in">🔑 登入 記 練習</button>'}
  var T='';
  function login(){var o=document.getElementById('scjov');T='';o.className='on';draw()}
  function draw(){var o=document.getElementById('scjov'),b='';for(var i=0;i<5;i++)b+='<i>'+(T.charAt(i)||'')+'</i>';
    o.innerHTML='<div class="b"><div>🔑 打 你的 5 碼（班級 ＋ 座號）</div><div class="box">'+b+'</div><div class="m" id="scjm"></div><div class="k">'+
      [1,2,3,4,5,6,7,8,9,'⌫',0,'✕'].map(function(k){return '<button data-scjk="'+k+'">'+k+'</button>'}).join('')+'</div></div>'}
  function key(k){var o=document.getElementById('scjov');if(k==='✕'){o.className='';return}if(k==='⌫')T=T.slice(0,-1);else if(T.length<5)T+=k;draw();
    if(T.length===5){var r=chk(T);if(r.err){T='';draw();document.getElementById('scjm').textContent=r.err;return}
      p('last',r.id);p('id_g'+r.g,r.id);p('act',Date.now());try{sessionStorage.setItem('sc_ok',r.id)}catch(e){}o.className='';chip();tkLoad();toast('✅ '+r.id+' 登入了：看字卡、聽完字卡 都會 記下來')}}
  function toast(t){var x=document.getElementById('scjt');if(!x)return;x.textContent=t;x.className='on';clearTimeout(toast.tm);toast.tm=setTimeout(function(){x.className=''},3200)}
  function init(){if(!ON)return;var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
    document.body.appendChild(el('<div id="scj"></div>'));document.body.appendChild(el('<div id="scjov"></div>'));document.body.appendChild(el('<div id="scjt"></div>'));chip();
    ['pointerdown','keydown','wheel','touchstart'].forEach(function(e){document.addEventListener(e,function(){vAct();act()},{passive:true,capture:true})});
    window.addEventListener('scroll',vAct,{passive:true});document.addEventListener('visibilitychange',function(){vAct();if(document.hidden)vSave()});
    window.addEventListener('pagehide',function(){vAct();vSave()});setInterval(function(){if(V.acc>=300000)vSave()},30000);setInterval(chip,30000);
    document.addEventListener('click',function(e){var t=e.target,b=t.closest&&t.closest('[data-scj],[data-scjk]');if(!b)return;e.stopPropagation();
      if(b.getAttribute('data-scj')==='in')login();else if(b.getAttribute('data-scj')==='out'){vAct();vSave();['id_g3','id_g4','last'].forEach(function(k){p(k,null)});chip()}
      else key(b.getAttribute('data-scjk'))},true);
    tkLoad();setInterval(tkLoad,120000);setTimeout(flush,1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  return {heard:heard,lockOf:lockOf,lockMsg:lockMsg,id:id,on:function(){return ON},PER:PER}
})();
