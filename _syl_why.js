// 每一個字「為什麼這樣切」：照網站的音節（story.html 的 SYL）＋母音紅／不發音灰（VOW、SILENT），每一刀用一句學生聽得懂的話說明。
// 切法規則（2026/10/9 使用者決定，和 AI-Agent-Open-Code 同一條；SYL 由 _syl_rule.py 照 Cambridge 音標算出來）：
//   兩個母音中間只有 1 個子音的聲音（ch、ll、mm、ng… 兩個字母一個聲音算 1 個）➜ 跟後面走；2 個以上 ➜ 照字典（Cambridge）的切點。
// _build_jobdex.js、_build_quiz.js 用它；node _syl_why.js 印出全部。
const ONE = ['ch', 'sh', 'th', 'ph', 'ck', 'ng', 'gh', 'wh'];   // 兩個字母一個聲音
function units(t) { const o = []; for (let i = 0; i < t.length;) { const two = t.substr(i, 2).toLowerCase();
  if (two.length === 2 && (ONE.includes(two) || two[0] === two[1])) { o.push(t.substr(i, 2)); i += 2 } else { o.push(t[i]); i++ } } return o }
function why(e, syl, vow, sil) {
  const isV = i => vow.indexOf(i) > -1, isS = i => sil.indexOf(i) > -1, out = [];
  let pos = 0;
  syl.split(' ').forEach(sw => {
    const ps = sw.split('-');
    let a = pos;
    for (let k = 1; k < ps.length; k++) {
      const L = ps[k - 1], R = ps[k], cut = a + L.length;
      a += L.length;
      let lv = cut - 1; while (lv >= pos && !isV(lv)) lv--;
      let rv = cut; while (rv < e.length && !isV(rv)) rv++;
      let rcol = '';
      const cl = [], cr = [];
      for (let i = lv + 1; i < cut; i++) { if (isS(i)) continue;
        if (i === lv + 1 && /[rwy]/i.test(e[i])) { rcol = e[lv] + e[i]; continue }   // ar、er、aw、ay：跟著前面的母音一起唸
        cl.push(e[i]) }
      for (let i = cut; i < rv; i++) if (!isS(i)) cr.push(e[i]);
      const u = units(cl.join('')).concat(units(cr.join(''))), n = u.length;
      let r;
      if (e === 'DJ') r = 'D 和 J 是兩個字母，一個字母唸一拍';
      else if (n === 0) r = (rcol ? rcol + ' 一起唸，' : '') + '後面馬上是下一個母音 ➜ 從中間分開';
      else if (n === 1) r = '中間只有 1 個子音的聲音 ' + u[0] + (u[0].length === 2 ? '（兩個字母一個聲音）' : '') + ' ➜ 跟後面走';
      else r = '中間有 ' + u.join('、') + ' ' + n + ' 個子音的聲音 ➜ 照字典切在這裡';
      if (n === 1 && cl.length) throw new Error('_syl_why：' + e + ' 只有 1 個子音卻沒有跟後面走（' + L + '｜' + R + '）');
      out.push({ at: cut, l: L, r: R, why: r });
    }
    pos += ps.join('').length + 1;
  });
  return out;
}
module.exports = { why };
if (require.main === module) {
  const fs = require('fs'), story = fs.readFileSync(__dirname + '/story.html', 'utf8');
  const SYL = JSON.parse(story.match(/const SYL=(\{.*?\});/)[1]), VOW = JSON.parse(story.match(/const VOW=(\{.*?\});/)[1]), SIL = JSON.parse(story.match(/const SILENT=(\{.*?\});/)[1]);
  for (const e in SYL) { console.log(e.padEnd(22), SYL[e]); for (const c of why(e, SYL[e], VOW[e] || [], SIL[e] || [])) console.log('   ', c.l + '｜' + c.r, '：', c.why); }
}
