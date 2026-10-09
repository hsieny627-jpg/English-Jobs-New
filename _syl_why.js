// 每一個字「為什麼這樣切」：照網站的音節（story.html 的 SYL，2026/10/9 使用者決定沿用）和母音紅／不發音灰（VOW、SILENT），
// 每一刀用一句學生聽得懂的話說明。_build_jobdex.js 用它；node _syl_why.js 可以印出全部來看。
const DIG = ['ch', 'sh', 'th', 'ph', 'ck', 'ng', 'gh', 'wh'];   // 兩個字母一個聲音
const BLEND = ['gr', 'pr', 'fl', 'sp', 'st', 'cr', 'pl', 'tr', 'br', 'dr', 'cl', 'fr', 'gl', 'sl', 'sc', 'sk', 'sm', 'sn', 'sw'];   // 兩個子音黏在一起唸
const SUF = ['er', 'or', 'ist', 'ic', 'al', 'an', 'ness'];
const COMPOUND = { firefighter: [['fire', 'fighter']], hairstylist: [['hair', 'stylist']], YouTuber: [['You', 'Tuber']] };
// 子音一個聲音一個單位：ch、th 這種兩個字母一個聲音算一個；fl、st 這種黏在一起唸的也放一起
function units(t) { const o = []; for (let i = 0; i < t.length;) { const two = t.substr(i, 2).toLowerCase(); if (two.length === 2 && (DIG.includes(two) || BLEND.includes(two))) { o.push(t.substr(i, 2)); i += 2 } else { o.push(t[i]); i++ } } return o }
function why(e, syl, vow, sil) {
  const isV = i => vow.indexOf(i) > -1, isS = i => sil.indexOf(i) > -1;
  const out = [];
  let pos = 0;
  syl.split(' ').forEach(sw => {
    const ps = sw.split('-'), w = ps.join('');
    let a = pos;
    for (let k = 1; k < ps.length; k++) {
      const L = ps[k - 1], R = ps[k], cut = a + L.length;   // 刀在 e[cut] 前面
      a += L.length;
      const left = L.toLowerCase(), right = R.toLowerCase();
      // 左邊最後一個母音、右邊第一個母音之間的子音（不算灰色不出聲的字母）
      let lv = cut - 1; while (lv >= pos && !isV(lv)) lv--;
      let rv = cut; while (rv < e.length && !isV(rv)) rv++;
      const cl = [], cr = [];
      for (let i = lv + 1; i < cut; i++) if (!isS(i) && !(/[wy]/i.test(e[i]) && i === lv + 1)) cl.push(e[i]);   // aw、ay 的 w、y 是母音的一部分
      for (let i = cut; i < rv; i++) if (!isS(i)) cr.push(e[i]);
      const L1 = cl.join(''), R1 = cr.join('');
      const comp = (COMPOUND[w] || []).find(c => c[0].length === cut - pos);
      let r;
      if (e === 'DJ') r = 'D 和 J 是兩個字母，一個字母唸一拍';
      else if (comp) r = `${comp[0]} ＋ ${comp[1]}：兩個字黏在一起，先從中間分開`;
      else if (SUF.includes(right) && left.length >= 3 && /^[aeiou]/.test(right)) r = `字尾 ${right} 自己一拍，從字尾前面切`;
      else if (!L1 && !R1) r = '兩個母音的聲音挨在一起，各自一拍，從中間分開';
      else if (L1 && R1 && L1[L1.length - 1].toLowerCase() === R1[0].toLowerCase()) r = `兩個一樣的字母 ${L1.slice(-1)}${R1[0]}，從中間切`;
      else {
        const uL = units(L1), uR = units(R1), n = uL.length + uR.length, all = uL.concat(uR).join('、');
        const tag = u => DIG.includes(u.toLowerCase()) ? `${u} 兩個字母一個聲音` : BLEND.includes(u.toLowerCase()) ? `${u} 黏在一起唸` : '';
        if (!uL.length && uR.length === 1) r = (tag(uR[0]) ? tag(uR[0]) + '，' : `中間只有 1 個子音 ${uR[0]}，`) + '跟後面的母音走';
        else if (uL.length === 1 && !uR.length) r = (tag(uL[0]) ? tag(uL[0]) + '，跟前面走' : `中間只有 1 個子音 ${uL[0]}，這裡跟前面走（前面的母音唸短短的）`);
        else r = `中間有 ${all} ${n} 個子音的聲音，從中間切` + (uR.length === 1 && tag(uR[0]) ? `（${tag(uR[0])}，一起跟後面走）` : uL.length === 1 && tag(uL[0]) ? `（${tag(uL[0])}）` : '');
      }
      out.push({ at: cut, l: L, r: R, why: r });
    }
    pos += w.length + 1;
  });
  return out;
}
module.exports = { why };
if (require.main === module) {
  const fs = require('fs'), story = fs.readFileSync(__dirname + '/story.html', 'utf8');
  const SYL = JSON.parse(story.match(/const SYL=(\{.*?\});/)[1]), VOW = JSON.parse(story.match(/const VOW=(\{.*?\});/)[1]), SIL = JSON.parse(story.match(/const SILENT=(\{.*?\});/)[1]);
  for (const e in SYL) { console.log(e.padEnd(22), SYL[e]); for (const c of why(e, SYL[e], VOW[e] || [], SIL[e] || [])) console.log('   ', c.l + '｜' + c.r, '：', c.why); }
}
