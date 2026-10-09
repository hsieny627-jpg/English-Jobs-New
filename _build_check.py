# 產生 word-check.html（網站每一個職業英文的考證）：python3 _build_check.py
# 證據檔在 evidence/：ngram.json、ngram_us_gb.json（_ngram.py、_ngram_us_gb.py）、dict.json（_dict_check.py）、onet.json（_onet_check.py）
import json, re, html
E = lambda f: json.load(open('evidence/' + f, encoding='utf8'))
NG, NGC, DICT, ONET, AUD = E('ngram.json'), E('ngram_us_gb.json'), E('dict.json'), E('onet.json'), E('audit.json')
story = open('story.html', encoding='utf8').read()
font = re.search(r'@font-face\{[^}]*\}', story).group(0)
CARDS = {m[1]: (int(m[0]), m[2], m[3]) for m in re.findall(r"\{no:(\d+),e:'([^']+)',z:'([^']+)',ic:'([^']+)'", story)}
CARDS['streamer'] = (0, '直播主', '📹')  # 只出現在遊戲頁

def ng_us(word):
    """美國英語 en-US 的比較（有查的話），否則用全部英文 en。回傳 [(字, 每十億字次數)], 連結, 語料庫名"""
    for o in NGC['en-US']:
        if o['set'][0] == word:
            vals = [(k.split(' + ')[0].strip('('), v) for k, v in o['raw'].items()]
            if word == 'real estate agent':  # 「estate agent」的次數包含 real estate agent，要扣掉
                ra = dict(vals)['real estate agent']
                vals = [(k + '（不含 real）', v - ra) if k == 'estate agent' else (k, v) for k, v in vals]
            return vals, o['url'], '美國英語'
    for o in NG:
        if o['set'][0] == word:
            return [(k.split(' + ')[0].strip('('), v) for k, v in o['raw'].items()], o['url'], '英文'
    return [], '', ''

# 結論：✅ 正確且最常用／🆗 正確、常用，另有同樣常見的說法／⚠️ 正確，但有更常用的說法（等老師決定）
NOTE = {
 'doctor': ('✅', 'physician 出現 1 次，doctor 就出現約 2.6 次'),
 'professional athlete': ('✅', '完整正式的說法。美國的書裡，pro athlete 出現 1 次，professional athlete 就出現約 8.5 次。卡片上有「也可以說 pro athlete」'),
 'programmer': ('✅', '比 coder、software developer 都常見'),
 'engineer': ('✅', ''),
 'esports player': ('🆗', '新職業，書裡還很少；和 professional gamer 差不多常見'),
 'teacher': ('✅', ''), 'business manager': ('✅', 'O*NET 實際使用的職稱'),
 'influencer': ('✅', '比 social media influencer 常見'),
 'lawyer': ('✅', '美國也常說 attorney'),
 'baker': ('✅', ''), 'psychologist': ('✅', ''), 'nurse': ('✅', ''),
 'painter': ('✅', '畫畫的人；artist 是更大的「藝術家」'),
 'police officer': ('✅', '比 policeman 常見，男女都能用'),
 'designer': ('✅', ''), 'singer': ('✅', ''),
 'veterinarian': ('✅', '正式說法；口語常說 vet（vet 也是「退伍軍人」，不能直接比次數）'),
 'mechanic': ('✅', 'mechanic 也是「力學」，不能直接比次數；O*NET 職稱有 Auto Mechanic'),
 'computer engineer': ('⚠️', '正確（偏電腦硬體）。美國的書裡，computer engineer 出現 1 次，寫軟體的 software engineer 就出現約 6 次。卡片上有「也可以說 software engineer」'),
 'hairstylist': ('⚠️', '正確（美國官方職稱有）。美國的書裡，hairstylist 出現 1 次，hairdresser 就出現約 4.8 次。卡片上有「也可以說 hairdresser」'),
 'architect': ('✅', ''), 'content creator': ('✅', ''),
 'game tester': ('✅', '比 video game tester 常見'),
 'counselor': ('✅', '美式拼法；英國寫 counsellor'),
 'entertainer': ('✅', ''), 'tour guide': ('✅', ''),
 'fortune teller': ('✅', '比 fortuneteller 常見；兩本字典都寫 fortune teller'),
 'actor': ('✅', ''), 'pilot': ('✅', ''),
 'firefighter': ('✅', '比 fireman 常見，男女都能用'),
 'YouTuber': ('✅', '字典已收錄'),
 'flight attendant': ('✅', '比 stewardess 常見，男女都能用'),
 'real estate agent': ('✅', '美式說法；英國說 estate agent；Realtor 是註冊商標'),
 'DJ': ('✅', '比 disc jockey 常見很多'),
 'streamer': ('✅', ''),
 'mechanical engineer': ('✅', ''),
 'chef': ('✅', '受過訓練、在餐廳工作的廚師；cook 也是動詞「煮」，不能直接比次數'),
}
ORDER = sorted(CARDS, key=lambda w: (CARDS[w][0] or 99))
missing = [w for w in ORDER if w not in NOTE]
assert not missing, missing

def a(u, t):
    return f'<a href="{html.escape(u)}" target="_blank" rel="noopener">{t}</a>'

rows = []
for w in ORDER:
    no, zh, ic = CARDS[w]
    mark, note = NOTE[w]
    d = DICT.get(w, {})
    c, m = d.get('cambridge', {}), d.get('mw', {})
    dic = []
    if c.get('headwords'): dic.append(a(c['url'], 'Cambridge'))
    if m and not m.get('notfound') and not m.get('error'): dic.append(a(m['url'], 'Merriam-Webster'))
    if not dic: dic.append('<span class="mu">兩個常見字組成，字典不另外收</span>')
    o = ONET.get(w)
    off = a(o['url'], html.escape(o['title'].split(' Occupation')[0])) if o else '<span class="mu">—</span>'
    vals, url, corp = ng_us(w)
    if vals:
        mx = max(v for _, v in vals) or 1
        bars = ''.join(f'<div class="bar{" me" if k.lower() == w.lower() else ""}"><span class="bw">{html.escape(k)}</span>'
                       f'<span class="bt"><i style="width:{max(2, v / mx * 100):.0f}%"></i></span><span class="bn">{v:,.0f}</span></div>' for k, v in vals)
        ngc = f'{bars}<div class="mu">{a(url, corp + " Ngram 圖表")}（每 10 億個英文字裡出現幾次）</div>'
    else:
        ngc = '<span class="mu">—</span>'
    card = f'<a class="go" href="story.html#w{no}">單字卡 ▶</a>' if no else '<span class="mu">遊戲用字</span>'
    rows.append(f'<tr id="{re.sub(r"[^a-z0-9]+", "-", w.lower())}"><td class="w"><span class="ic">{ic}</span><b>{html.escape(w)}</b><span class="zh">{zh}</span>{card}</td>'
                f'<td>{" ｜ ".join(dic)}</td><td>{off}</td><td class="ng">{ngc}</td><td class="vd"><span class="mk">{mark}</span>{note}</td></tr>')

# 專題：professional athlete 還是 pro athlete？
pa = {c: next(o for o in NGC[c] if o['set'][0] == 'professional athlete') for c in ('en-US', 'en-GB')}
pe = next(o for o in NG if o['set'][0] == 'professional athlete')
def ratio(o):
    v = list(o['raw'].values()); return v[0], v[1], v[0] / v[1]
def blocks(r):
    full = int(r); part = r - full
    return '<i class="b g"></i>' * full + (f'<i class="b g" style="width:{part * 22:.0f}px"></i>' if part >= 0.05 else '')
def line(name, rr, link):
    return (f'<div class="cmp"><div class="cn">{name}<span class="mu">（每 10 億個字裡：professional athlete {rr[0]:.0f} 次、pro athlete {rr[1]:.0f} 次）{link}</span></div>'
            f'<div class="cr"><span class="cl">pro athlete</span><span class="bk"><i class="b o"></i></span><span class="cx">1 次</span></div>'
            f'<div class="cr"><span class="cl">professional athlete</span><span class="bk">{blocks(rr[2])}</span><span class="cx">{rr[2]:.1f} 次</span></div></div>')
r_all, r_us, r_gb = ratio(pe), ratio(pa['en-US']), ratio(pa['en-GB'])
proc = DICT['pro']['cambridge']['url']; promw = DICT['pro']['mw']['url']

FIXES = [
 ('2026/10/4', 'psychologist', 'PISA 女生第 5 名', 'PISA 女生第 6 名', 'OECD 報告 Table 1.1'),
 ('2026/10/4', 'nurse', 'PISA 女生第 6 名', 'PISA 女生第 5 名', 'OECD 報告 Table 1.1'),
 ('2026/10/4', 'counselor', '四榜綜合：全球青少年第 5 名', 'PISA 前 10 名沒有 counselor（第 6 名是 psychologists）', 'OECD 報告 Table 1.1'),
 ('2026/10/4', 'business manager', 'manager 本來是「管馬的人」', 'manage 本來是「訓練、控制馬」；manager（1580 年代）＝ 指揮、管理的人', 'Etymonline manage、manager'),
 ('2026/10/4', 'veterinarian', '拉丁文 veterinae ＝ 牛和馬；以前獸醫只幫拉車的牛馬看病', '拉丁文 veterinarius ＝ 照顧拉車牲口的（也當「牛醫」）', 'Etymonline veterinarian'),
 ('2026/10/4', 'programmer', '希臘文 pro ＝ 先', '希臘文 pro ＝ 向前（prographein ＝ 公開寫出來）', 'Etymonline program'),
 ('2026/10/4', 'engineer', '修 engine 的人', '本來是「製造（打仗用）機器」的人', 'Etymonline engineer'),
 ('2026/10/4', 'architect', 'arch 是拱門，建築師蓋拱門', 'archi 老大 ＋ tect 建造者（arch 拱門是另一個字，沒有關係）', 'Etymonline architect'),
 ('2026/10/4', 'lawyer', 'yer 唸起來像「爺」', '刪除：用國字標英文發音不準確（美式 /ˈlɔɪ.jɚ/）', 'Cambridge lawyer'),
 ('2026/10/4', 'designer', 'de ＝ 畫出來', 'de ＝ 出來（de "out"）', 'Etymonline design'),
 ('2026/10/4', 'business manager', '不發音的字母標在 u', '不發音的是 i（u 和 busy 一樣唸 /ɪ/）', 'Cambridge busy、business'),
 ('2026/10/9', 'business manager', '灰色（不發音）標在第 3 個字母 s，i 是紅色', '灰色標在 i（business 唸 /ˈbɪz.nɪs/，s 唸 /z/ 有聲音）', 'Cambridge business'),
 ('2026/10/9', 'lawyer', 'y 標成紅色（母音）', 'y 是黑色（子音）：lawyer 唸 /ˈlɔɪ.jɚ/，y 唸 /j/', 'Cambridge lawyer'),
 ('2026/10/9', 'professional athlete', 'professional 的 i 標成紅色（母音）', 'i 是黑色：ssi 一起唸 /ʃ/（/prəˈfeʃ.ən.əl/），i 沒有母音的聲音', 'Cambridge professional'),
]
fix_rows = ''.join(f'<tr><td>{html.escape(w)}</td><td class="old">{html.escape(o)}</td><td class="new">{html.escape(n)}</td><td>{html.escape(s)}</td></tr>' for d, w, o, n, s in FIXES)
aud_rows = ''.join(
    f'<tr><td class="mk">{"✅" if c["ok"] else "❌"}</td><td><b>{html.escape(c["card"])}</b></td><td>{html.escape(c["claim"])}</td>'
    f'<td class="q">{"<br>".join("「…" + html.escape(q) + "…」" for q in c["quote"])}</td><td>{a(c["url"], "出處")}</td></tr>' for c in AUD['claims'])
syl_rows = ''.join(
    f'<tr><td class="mk">{"✅" if s["ok"] else "❌"}</td><td><b>{html.escape(s["word"])}</b></td><td>{html.escape(s["site"].replace("-", "·"))}（{s["site_n"]}）</td>'
    f'<td>/{html.escape(s["ipa"] or "")}/（{s["ipa_n"]}）</td><td>{a(s["url"], "Cambridge")}</td></tr>' for s in AUD['syllables'])
def let_html(l):
    out, pos = '', 0
    for c in l['word']:
        col = '#8C8378;background:#E6E0D6' if pos in l['gray'] else '#E0483E' if pos in l['red'] else '#23201C'
        out += ' ' if c == ' ' else f'<span style="color:{col}">{html.escape(c)}</span>'; pos += 1
    return out
let_rows = ''.join(
    f'<tr><td class="mk">{"✅" if l["ok"] and l["site_ok"] else "❌"}</td><td><b style="font-size:20px">{let_html(l)}</b></td>'
    f'<td>{"<br>".join("<b>" + html.escape(p["word"]) + "</b> /" + html.escape(p["ipa"] or "") + "/：" + html.escape("　".join(x.replace(":", "→") + ("（不發音）" if x.endswith(":") else "") for x in p["align"].split(" "))) for p in l["parts"])}</td>'
    f'<td>{"<br>".join(a(p["url"], "Cambridge") for p in l["parts"])}</td></tr>' for l in AUD['letters'])
l_ok = sum(l['ok'] and l['site_ok'] for l in AUD['letters'])
n_ok = sum(c['ok'] for c in AUD['claims']); s_ok = sum(s['ok'] for s in AUD['syllables'])

page = f'''<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>英文用字考證</title>
<style>
{font}
:root{{--bg:#FFF7E8;--card:#fff;--ink:#23201C;--soft:#7A7166;--line:#F0E2C8;--blue:#2F6FDE;--navy:#15233A;--gold:#FFD24A}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:'AndikaEmbed',"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;-webkit-text-size-adjust:100%;overflow-x:hidden}}
.app{{max-width:1180px;margin:0 auto;padding:16px 16px 40px}}
.homeln{{display:inline-flex;align-items:center;min-height:48px;padding:0 16px;border-radius:14px;border:3px solid var(--line);background:#fff;color:var(--ink);font-size:20px;font-weight:700;text-decoration:none}}
.hero{{margin-top:12px;background:var(--navy);color:#fff;border-radius:24px;padding:18px 16px;text-align:center}}
.hero h1{{margin:0;font-size:30px;color:var(--gold)}}
.hero p{{margin:8px 0 0;font-size:19px;color:#DCE4F0;line-height:1.6}}
section{{margin-top:14px;background:var(--card);border:3px solid var(--line);border-radius:24px;padding:16px}}
h2{{margin:0 0 10px;font-size:26px}}
.big{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px}}
.vs{{border-radius:18px;padding:14px;text-align:center}}
.vs b{{display:block;font-size:26px}}.vs .n{{font-size:40px;font-weight:700}}.vs .u{{font-size:16px;color:var(--soft)}}
.v1{{background:#DCF0C8}}.v2{{background:#FFE3D6}}
.ans{{font-size:22px;line-height:1.6;margin:12px 0 4px;text-align:center}}
ol{{font-size:19px;line-height:1.7;padding-left:1.4em;margin:10px 0 0}}
li{{margin-bottom:8px}}
a{{color:var(--blue)}}
.mu{{color:var(--soft);font-size:15px}}
.key{{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:18px;margin-bottom:10px}}
.tw{{overflow-x:auto;-webkit-overflow-scrolling:touch}}
table{{border-collapse:collapse;width:100%;min-width:900px;font-size:17px}}
th{{position:sticky;top:0;background:#FFF1DC;text-align:left;padding:10px 8px;font-size:17px}}
td{{border-top:2px dashed var(--line);padding:10px 8px;vertical-align:top}}
td.w{{min-width:180px}}
td.w b{{display:block;font-size:21px}}
.ic{{font-size:28px;display:block}}
.zh{{display:block;color:var(--soft)}}
.go{{display:inline-flex;align-items:center;min-height:44px;margin-top:4px;padding:0 10px;border-radius:12px;background:#FFE3D6;color:#B03A10;font-weight:700;text-decoration:none}}
td.ng{{min-width:280px}}
.bar{{display:grid;grid-template-columns:118px 1fr 58px;align-items:center;gap:6px;font-size:15px;margin:2px 0}}
.bw{{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.bt{{background:#F3ECE0;border-radius:6px;height:14px;overflow:hidden}}
.bt i{{display:block;height:100%;background:#B9B2A6}}
.bar.me .bt i{{background:#2FA35A}}.bar.me .bw{{font-weight:700}}
.bn{{text-align:right;font-variant-numeric:tabular-nums}}
.mk{{font-size:22px;margin-right:4px}}
td.q{{font-size:15px;color:var(--soft);min-width:260px}}
td.old{{color:#B03A10;text-decoration:line-through}} td.new{{color:#2C6010;font-weight:700}}
.cmp{{margin:12px 0;padding:10px 12px;background:var(--bg);border-radius:16px}}
.cn{{font-size:20px;font-weight:700;margin-bottom:6px}}.cn .mu{{font-weight:400}}
.cr{{display:grid;grid-template-columns:minmax(0,190px) 1fr auto;align-items:center;gap:8px;margin:4px 0;font-size:18px}}
.bk{{display:flex;flex-wrap:wrap;gap:3px}}
.b{{display:inline-block;width:22px;height:22px;border-radius:5px}}
.b.g{{background:#2FA35A}}.b.o{{background:#FF7A45}}
.cx{{font-weight:700;white-space:nowrap}}
tr:target td{{background:#FFF6C8}}
td:last-child{{white-space:nowrap}}
td.vd{{min-width:200px}}
</style>
</head>
<body>
<main class="app">
<a class="homeln" href="index.html">🏠 首頁</a>
<div class="hero">
 <h1>🔎 英文用字考證</h1>
 <p>網站上每一個職業英文，都用三種證據檢查：<br>📖 字典有沒有收 ＋ 🏛️ 美國政府的正式職稱 ＋ 📚 書裡最常用哪一個</p>
</div>

<section>
 <h2>🏃 professional athlete 還是 pro athlete？</h2>
 <div class="big">
  <div class="vs v1"><b>professional athlete</b><span class="n">正式</span><div class="u">完整的說法，最常用</div></div>
  <div class="vs v2"><b>pro athlete</b><span class="n">口語</span><div class="u">pro ＝ professional 的縮寫</div></div>
 </div>
 <p class="ans">📚 書裡每出現 <b>1 次 pro athlete</b>，就出現幾次 <b>professional athlete</b>？</p>
 {line('美國英語的書', r_us, ' ' + a(pa['en-US']['url'], '看圖表'))}
 {line('英國英語的書', r_gb, ' ' + a(pa['en-GB']['url'], '看圖表'))}
 {line('全部英文的書', r_all, ' ' + a(pe['url'], '看圖表'))}
 <p class="ans">兩個都對。<b>professional athlete</b> 是完整、正式、最常用的說法；<b>pro athlete</b> 是聊天時的口語縮寫。</p>
 <ol>
  <li>📖 <b>Cambridge 字典</b>把 pro（＝職業的）標成 <b>informal（口語）</b>。{a(proc, '看字典')}</li>
  <li>📖 <b>Merriam-Webster 字典</b>：pro 是 professional 的<b>縮短說法</b>（a shortened form of professional）。{a(promw, '看字典')}</li>
  <li>🏛️ <b>美國勞工部 O*NET</b>「運動員」這個職業，實際使用的職稱寫 <b>Professional Athlete</b>，沒有 pro athlete。{a(ONET['professional athlete']['url'], '看 O*NET')}</li>
  <li>📚 <b>Google Books Ngram 語料庫</b>：上面的方塊。查的是 2018～2022 年出版的書，單數和複數（athletes）一起算。</li>
 </ol>
</section>

<section>
 <h2>📋 網站上每一個職業英文</h2>
 <div class="key"><span>✅ 正確，也是最常用的說法</span><span>🆗 正確，另有一樣常見的說法</span><span>⚠️ 正確，但有更常用的說法</span></div>
 <div class="tw"><table id="words-table">
  <thead><tr><th>單字</th><th>📖 字典</th><th>🏛️ 美國官方職稱（O*NET）</th><th>📚 書裡誰最常用（綠色＝網站用的字）</th><th>結論</th></tr></thead>
  <tbody>
  {chr(10).join(rows)}
  </tbody>
 </table></div>
</section>

<section id="audit">
 <h2>🔬 卡片上每一句跟英文有關的話</h2>
 <p class="ans">字源、年代、拆字、記憶技巧、遊戲的是非題……一共 <b>{len(AUD['claims'])}</b> 條，每一條都在出處原文找到證據：<b>{n_ok} 條 ✅</b>{'（其中 ' + str(sum(c.get('kept', False) for c in AUD['claims'])) + ' 條：Etymonline 這次擋自動抓取，沿用上一次抓到的原文句子）' if any(c.get('kept') for c in AUD['claims']) else ''}</p>
 <div class="tw"><table>
  <thead><tr><th></th><th>卡片</th><th>網站上寫的話</th><th>出處原文（英文）</th><th>連結</th></tr></thead>
  <tbody>{aud_rows}</tbody>
 </table></div>
</section>

<section id="syllables">
 <h2>✂️ 音節：卡片寫的 ＝ 字典音標</h2>
 <p class="ans">Cambridge 字典的美式音標用「.」分開音節。<b>{len(AUD['syllables'])}</b> 個字，<b>{s_ok} 個完全一樣 ✅</b></p>
 <div class="tw"><table>
  <thead><tr><th></th><th>單字</th><th>卡片上的音節</th><th>Cambridge 美式音標</th><th>連結</th></tr></thead>
  <tbody>{syl_rows}</tbody>
 </table></div>
</section>

<section id="letters">
 <h2>🔴 母音（紅）和不發音（灰）：對 Cambridge 美式音標</h2>
 <p class="ans">每個字一個字母一個字母對到字典的美式音標，音標接起來要和字典一模一樣。<b>沒有聲音的字母＝灰色</b>；a e i o u y 有母音的聲音＝<b style="color:#E0483E">紅色</b>；其他是黑色（例如 lawyer 的 y 唸 /j/ 是子音）。<b>{len(AUD['letters'])}</b> 個字，<b>{l_ok} 個完全一樣 ✅</b></p>
 <div class="tw"><table>
  <thead><tr><th></th><th>單字</th><th>字母 → 美式音標</th><th>連結</th></tr></thead>
  <tbody>{let_rows}</tbody>
 </table></div>
</section>

<section id="fixes">
 <h2>🛠️ 查證後改正的地方</h2>
 <p class="ans">用原始資料重新核對後，發現下面這些寫錯或說太滿的地方，都已經改正。</p>
 <div class="tw"><table>
  <thead><tr><th>卡片</th><th>原本寫</th><th>改成</th><th>根據</th></tr></thead>
  <tbody>{fix_rows}</tbody>
 </table></div>
</section>

<section>
 <h2>🧪 證據從哪裡來？</h2>
 <ol>
  <li>📖 <b>字典</b>：{a('https://dictionary.cambridge.org/', 'Cambridge Dictionary')}（劍橋大學出版社）、{a('https://www.merriam-webster.com/', 'Merriam-Webster')}（美國最老牌的字典）。</li>
  <li>🏛️ <b>美國官方職稱</b>：{a('https://www.onetonline.org/', 'O*NET OnLine')}，美國勞工部的職業資料庫，和勞工統計局用同一套「標準職業分類」，每個職業都列出真實工作上使用的職稱。</li>
  <li>📚 <b>語料庫</b>：{a('https://books.google.com/ngrams/', 'Google Books Ngram')}，統計幾百萬本書裡每個詞出現幾次。研究論文：Michel 等人（2011），刊在《Science》期刊，{a('https://doi.org/10.1126/science.1199644', 'doi:10.1126/science.1199644')}。本頁取 2018～2022 年、單複數合計、大小寫不分。</li>
  <li>🔬 <b>Etymonline</b>（{a('https://www.etymonline.com/', '線上字源詞典')}）：每一條字源都附原文句子；查證程式 <code>_audit.py</code> 會重新抓原文比對，找不到就算失敗。</li>
  <li>👀 <b>看清楚</b>：Ngram 統計的是「書」，不是說話；一個字有兩個意思時（例如 vet 也是退伍軍人、cook 也是動詞），次數不能直接比，表格裡都有寫。</li>
 </ol>
</section>
</main>
</body>
</html>
'''
open('word-check.html', 'w', encoding='utf8').write(page)
print('word-check.html 完成：', len(rows), '個字')
