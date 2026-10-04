# 四榜綜合排序：python3 _build_mix.py
# 1. 四份榜單的名次一字不差照原始報告（出處在 SRC）
# 2. 算出 36 張單字卡的順序 ➜ evidence/mix.json
# 3. story.html 的單字卡照這個順序重排、重新編號；「全部單字」分組；進階「四榜綜合」分頁
# 4. 產生 rank-mix.html（排序規則＋每一張卡的證據）
import json, re, html

SRC = {
 'A': {'name': '台灣小學生', 'who': '國語日報社「兒少大未來」職業探索問卷，2026/3/5～3/25 線上問卷，小學生 1,286 人', 'date': '2026/4/4 公布',
       'links': [['國語日報原始報導', 'https://www.mdnkids.com/content.asp?Link_String_=244400000BLIDTX'], ['國語日報原始統計圖', 'https://www.mdnkids.com/upload/images/20260404-16-01.jpg'], ['中央社', 'https://www.cna.com.tw/news/ahel/202604040056.aspx']]},
 'B': {'name': '全球中學生', 'who': 'OECD PISA 2018，41 國 15 歲學生；報告《Dream Jobs? Teenagers\' Career Aspirations and the Future of Work》第 13 頁 Table 1.1，男生、女生各一份前 10 名', 'date': '2020/1 發表',
       'links': [['OECD 報告頁', 'https://www.oecd.org/education/dream-jobs-teenagers-career-aspirations-and-the-future-of-work.htm'], ['報告 PDF', 'https://www.mmllen.com.au/wp-content/uploads/2021/10/dream-jobs-teenagers-report.pdf']]},
 'C': {'name': '台灣大人', 'who': '1111 人力銀行「上班族夢幻工作大調查」，2026/5/15～6/15，有效樣本 1,103 份；只公布前 5 名（第 5 名兩項並列）', 'date': '2026/6/18 公布',
       'links': [['1111 人力銀行新聞', 'https://www.1111.com.tw/news/166338/amp/'], ['科技新報', 'https://finance.technews.tw/2026/06/18/dream-employer']]},
 'D': {'name': '全球大人', 'who': 'Remitly「Dream Jobs Around the World」2026，145 國 Google「how to be a…」搜尋量（2025/5～2026/5）', 'date': '2026 公布',
       'links': [['Remitly 研究原文', 'https://www.remitly.com/gb/en/insights/dream-jobs-around-the-world']]},
}
# 每份榜單：名次、原文類別、（PISA 才有）百分比
A = [(1, '職業運動員'), (2, '電競選手'), (3, '直播主／網紅／Podcaster／YouTuber'), (4, '醫師'), (5, '麵包糕點師'), (6, '程式設計師（如App、線上遊戲）'),
     (7, '畫家／插畫家／漫畫家／電腦動畫'), (8, '歌手／樂團／演員'), (9, '電腦工程師'), (10, '髮型師／造型師／美甲師')]
B_GIRLS = [(1, 'Doctors', 15.6), (2, 'Teachers', 9.4), (3, 'Business managers', 5.0), (4, 'Lawyers', 4.6), (5, 'Nursing and midwives', 4.5),
           (6, 'Psychologists', 3.7), (7, 'Designers', 3.0), (8, 'Veterinarians', 2.8), (9, 'Police officers', 2.3), (10, 'Architects', 2.1)]
B_BOYS = [(1, 'Engineers', 7.7), (2, 'Business managers', 6.7), (3, 'Doctors', 6.0), (4, 'ICT professionals', 5.5), (5, 'Sportspeople', 4.9),
          (6, 'Teachers', 4.6), (7, 'Police officers', 4.0), (8, 'Motor vehicle mechanics', 2.8), (9, 'Lawyers', 2.4), (10, 'Architects', 2.2)]
C = [(1, '自媒體經營（30.3%）'), (2, '遊戲試玩員（26.9%）'), (3, '心理諮商師（15.7%）'), (4, '演藝人員（13.4%）'), (5, '導遊（11.2%，並列）'), (5, '各類占卜師／命理師（11.2%，並列）')]
D = [(1, 'Actor'), (2, 'Pilot'), (3, 'Firefighter'), (4, 'Lawyer'), (5, 'YouTuber'), (6, 'Veterinarian'), (7, 'Flight attendant'), (8, 'Police officer'), (9, '(Real) Estate agent'), (10, 'DJ')]

def a_(cat): return next(r for r, c in A if c == cat), cat
def c_(cat): return next(r for r, c in C if c.startswith(cat)), next(c for r, c in C if c.startswith(cat))
def d_(cat): return next(r for r, c in D if c == cat), cat
def b_(cat):  # PISA：男生榜、女生榜取比較好的名次；同名次看百分比
    hits = [('女生', r, p) for r, c, p in B_GIRLS if c == cat] + [('男生', r, p) for r, c, p in B_BOYS if c == cat]
    best = min(hits, key=lambda h: (h[1], -h[2]))
    return best[1], cat + '（' + '、'.join(f'{s}第 {r} 名 {p}%' for s, r, p in sorted(hits, key=lambda h: h[1])) + '）', best[2]

# 單字卡 ➜ 它在哪幾份榜單（原文類別裡有這個職業才算）
MAP = {
 'doctor': {'A': a_('醫師'), 'B': b_('Doctors')},
 'professional athlete': {'A': a_('職業運動員'), 'B': b_('Sportspeople')},
 'YouTuber': {'A': a_('直播主／網紅／Podcaster／YouTuber'), 'D': d_('YouTuber')},
 'lawyer': {'B': b_('Lawyers'), 'D': d_('Lawyer')},
 'actor': {'A': a_('歌手／樂團／演員'), 'D': d_('Actor')},
 'programmer': {'A': a_('程式設計師（如App、線上遊戲）'), 'B': b_('ICT professionals')},
 'veterinarian': {'B': b_('Veterinarians'), 'D': d_('Veterinarian')},
 'police officer': {'B': b_('Police officers'), 'D': d_('Police officer')},
 'engineer': {'B': b_('Engineers')}, 'content creator': {'C': c_('自媒體經營')},
 'esports player': {'A': a_('電競選手')}, 'teacher': {'B': b_('Teachers')}, 'business manager': {'B': b_('Business managers')},
 'game tester': {'C': c_('遊戲試玩員')}, 'pilot': {'D': d_('Pilot')},
 'influencer': {'A': a_('直播主／網紅／Podcaster／YouTuber')}, 'counselor': {'C': c_('心理諮商師')}, 'firefighter': {'D': d_('Firefighter')},
 'entertainer': {'C': c_('演藝人員')}, 'baker': {'A': a_('麵包糕點師')}, 'nurse': {'B': b_('Nursing and midwives')},
 'tour guide': {'C': c_('導遊')}, 'fortune teller': {'C': c_('各類占卜師')}, 'psychologist': {'B': b_('Psychologists')},
 'painter': {'A': a_('畫家／插畫家／漫畫家／電腦動畫')}, 'designer': {'B': b_('Designers')}, 'flight attendant': {'D': d_('Flight attendant')},
 'singer': {'A': a_('歌手／樂團／演員')}, 'mechanic': {'B': b_('Motor vehicle mechanics')}, 'computer engineer': {'A': a_('電腦工程師')},
 'real estate agent': {'D': d_('(Real) Estate agent')}, 'hairstylist': {'A': a_('髮型師／造型師／美甲師')}, 'architect': {'B': b_('Architects')},
 'DJ': {'D': d_('DJ')},
}
EXTRA = ['mechanical engineer', 'chef']  # 不在四份榜單：國語日報中學生榜第 2、第 4 名
LORDER = 'ABCD'
C_ORDER = [c for _, c in C]
def key(w):
    m = MAP[w]; ranks = [v[0] for v in m.values()]
    first = min(m, key=lambda L: (m[L][0], LORDER.index(L)))  # 名次最好的那一份榜單
    pct = -m['B'][2] if 'B' in m else 0
    pub = C_ORDER.index(m['C'][1]) if 'C' in m else 0
    return (-len(m), sum(ranks), min(ranks), LORDER.index(first), pct, pub)
ORDER = sorted(MAP, key=key) + EXTRA
assert len(ORDER) == 36 and len(set(ORDER)) == 36

# ---------- story.html：重排、重新編號 ----------
p = 'story.html'; s = open(p, encoding='utf8').read()
m = re.search(r'const W=\[\n(.*?)\n\];', s, re.S)
ents = re.findall(r"\{no:\d+,e:'[^']+'.*?\}\}(?=,\n\{no:|$)", m.group(1), re.S)
byw = {re.match(r"\{no:\d+,e:'([^']+)'", e).group(1): e for e in ents}
assert set(byw) == set(ORDER), set(byw) ^ set(ORDER)
newW = ',\n'.join(re.sub(r'^\{no:\d+,', '{no:%d,' % (i + 1), byw[w]) for i, w in enumerate(ORDER))
s = s[:m.start(1)] + newW + s[m.end(1):]
n2 = sum(1 for w in MAP if len(MAP[w]) == 2); n1 = len(MAP) - n2
GROUPS = [{'at': 0, 'h': f'🏅 上 2 份榜單（{n2} 個）'}, {'at': n2, 'h': f'⭐ 上 1 份榜單（{n1} 個）'}, {'at': len(MAP), 'h': f'🏫 國語日報中學生榜（{len(EXTRA)} 個）'}]
gjs = 'const MIXG=' + json.dumps(GROUPS, ensure_ascii=False) + ';'
s = re.sub(r'const MIXG=\[.*?\];', gjs, s) if 'const MIXG=' in s else s.replace('const SILENT={', gjs + '\nconst SILENT={', 1)
s = re.sub(r"\(k===21\?.*?:''\)\+'<button", "((MIXG.find(g=>g.at===k)||{}).h?'<div class=\"gh\">'+MIXG.find(g=>g.at===k).h+'</div>':'')+'<button", s, flags=re.S)
s = re.sub(r'<div class="mn">.*?</div>', '<div class="mn">🏅 四榜綜合排序（共 36 個）<br><span class="rule">上榜份數多的排前面<br>份數一樣，名次加起來小的排前面</span><br><a href="rank-mix.html" style="font-size:18px;color:#2F6FDE">🔎 看排序的證據</a></div>', s, count=1, flags=re.S)
# 進階「四榜綜合」分頁：照同一份結果
LN = {L: SRC[L]['name'] for L in SRC}
ic = {w: re.search(r"ic:'([^']+)'", byw[w]).group(1) for w in ORDER}
zh = {w: re.search(r"z:'([^']+)'", byw[w]).group(1) for w in ORDER}
mixrows = [[i + 1, ic[w], w, zh[w], f'{len(MAP[w])} 份榜單：' + '、'.join(f'{LN[L]} {MAP[w][L][0]}' for L in LORDER if L in MAP[w])] for i, w in enumerate(ORDER[:len(MAP)])]
s = re.sub(r'const ADV_MIX=\[.*?\];', 'const ADV_MIX=' + json.dumps(mixrows, ensure_ascii=False) + ';', s, flags=re.S)
s = re.sub(r"'📋 四份調查：.*?'\];", "'📋 四份調查：①台灣小學生（國語日報 2026）②全球中學生（OECD PISA 2018）③台灣大人（1111 人力銀行 2026）④全球大人（Remitly 2026）<br>排序：上榜份數多的排前面；份數一樣，名次加起來小的排前面。<a href=\"rank-mix.html\">🔎 看證據</a>'];", s, flags=re.S)
open(p, 'w', encoding='utf8').write(s)

json.dump({'order': ORDER, 'groups': GROUPS, 'map': MAP}, open('evidence/mix.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)

# ---------- rank-mix.html ----------
font = re.search(r'@font-face\{[^}]*\}', s).group(0)
twcss = re.search(r'\.tw\{[^}]*\}', s).group(0)
def a(u, t): return f'<a href="{html.escape(u)}" target="_blank" rel="noopener">{t}</a>'
rows = []
for i, w in enumerate(ORDER):
    m_ = MAP.get(w, {})
    cells = ''.join(f'<td class="c{" on" if L in m_ else ""}">' + (f'<b>{m_[L][0]}</b><span>{html.escape(m_[L][1])}</span>' if L in m_ else '—') + '</td>' for L in LORDER)
    tot = f'上 <b>{len(m_)}</b> 份<br>名次合計 <b>{sum(v[0] for v in m_.values())}</b>' if m_ else '不在四份榜單<br><span class="mu">國語日報中學生榜</span>'
    rows.append(f'<tr><td class="rk">{i + 1}</td><td class="w"><span class="ic">{ic[w]}</span><b>{html.escape(w)}</b><span class="zh">{zh[w]}</span><a class="go" href="story.html#w{i + 1}">單字卡 ▶</a></td>{cells}<td class="t">{tot}</td></tr>')
srcs = ''.join(f'<li><b>{L}. {SRC[L]["name"]}</b>（{SRC[L]["date"]}）：{SRC[L]["who"]}<br>' + '｜'.join(a(u, t) for t, u in SRC[L]['links']) + '</li>' for L in LORDER)
page = f'''<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>四榜綜合排序</title>
<style>
{font}
:root{{--bg:#FFF7E8;--card:#fff;--ink:#23201C;--soft:#7A7166;--line:#F0E2C8;--blue:#2F6FDE;--navy:#15233A;--gold:#FFD24A}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:'AndikaEmbed',"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;-webkit-text-size-adjust:100%;overflow-x:hidden}}
{twcss}
.app{{max-width:1180px;margin:0 auto;padding:16px 16px 40px}}
.homeln{{display:inline-flex;align-items:center;min-height:48px;padding:0 16px;border-radius:14px;border:3px solid var(--line);background:#fff;color:var(--ink);font-size:20px;font-weight:700;text-decoration:none}}
.hero{{margin-top:12px;background:var(--navy);color:#fff;border-radius:24px;padding:18px 16px;text-align:center}}
.hero h1{{margin:0;font-size:30px;color:var(--gold)}}
.hero p{{margin:8px 0 0;font-size:19px;color:#DCE4F0;line-height:1.6}}
section{{margin-top:14px;background:var(--card);border:3px solid var(--line);border-radius:24px;padding:16px}}
h2{{margin:0 0 10px;font-size:26px}}
ol{{font-size:19px;line-height:1.7;padding-left:1.4em;margin:6px 0 0}} li{{margin-bottom:8px}}
a{{color:var(--blue)}}
.mu{{color:var(--soft);font-size:15px}}
.tw2{{overflow-x:auto;-webkit-overflow-scrolling:touch}}
table{{border-collapse:collapse;width:100%;min-width:900px;font-size:16px}}
th{{background:#FFF1DC;text-align:left;padding:10px 8px;font-size:17px;position:sticky;top:0}}
td{{border-top:2px dashed var(--line);padding:8px;vertical-align:top}}
td.rk{{font-size:24px;font-weight:700;text-align:center;width:48px}}
td.w{{min-width:170px}} td.w b{{display:block;font-size:20px}}
.ic{{font-size:28px;display:block}} .zh{{display:block;color:var(--soft)}}
.go{{display:inline-flex;align-items:center;min-height:44px;margin-top:4px;padding:0 10px;border-radius:12px;background:#FFE3D6;color:#B03A10;font-weight:700;text-decoration:none}}
td.c{{color:#C9C1B4;text-align:center;min-width:120px}}
td.c.on{{color:var(--ink);background:#EEF8E4;text-align:left}}
td.c b{{display:block;font-size:22px;color:#2C6010}} td.c span{{font-size:14px;color:var(--soft)}}
td.t{{min-width:100px;font-size:17px}}
.rule li b{{color:#B03A10}}
</style>
</head>
<body>
<main class="app">
<a class="homeln" href="index.html">🏠 首頁</a>
<div class="hero">
 <h1>🏅 四榜綜合排序</h1>
 <p>網站 36 張單字卡的順序，是把四份「最想做的工作」調查合起來排的</p>
</div>
<section>
 <h2>📏 怎麼排？</h2>
 <ol class="rule">
  <li><b>上榜份數多</b>的排前面（上 2 份的排在上 1 份的前面）。</li>
  <li>份數一樣，<b>名次加起來小</b>的排前面。</li>
  <li>還是一樣，<b>最好的那個名次小</b>的排前面。</li>
  <li>還是一樣，照 <b>台灣小學生 → 全球中學生 → 台灣大人 → 全球大人</b> 的順序（先看跟學生最有關的）。</li>
  <li>PISA 男生榜、女生榜<b>取比較好的名次</b>；同名次看百分比高的。並列名次照原始報告列出的順序。</li>
  <li><b>原始類別裡有這個職業才算上榜。</b>例如國語日報第 3 名「直播主／網紅／Podcaster／YouTuber」，influencer 和 YouTuber 都算；第 8 名「歌手／樂團／演員」，singer 和 actor 都算。</li>
  <li>四份榜單都只取<b>前 10 名</b>（1111 人力銀行只公布前 5 名）。mechanical engineer、chef 不在四份榜單裡，來自國語日報中學生榜，排在最後。</li>
 </ol>
</section>
<section>
 <h2>📋 四份調查的原始出處</h2>
 <ol>{srcs}</ol>
</section>
<section>
 <h2>🔢 每一張卡的證據</h2>
 <div class="tw2"><table>
  <thead><tr><th>順序</th><th>單字</th><th>A. {SRC['A']['name']}</th><th>B. {SRC['B']['name']}</th><th>C. {SRC['C']['name']}</th><th>D. {SRC['D']['name']}</th><th>合計</th></tr></thead>
  <tbody>
  {chr(10).join(rows)}
  </tbody>
 </table></div>
</section>
</main>
</body>
</html>
'''
open('rank-mix.html', 'w', encoding='utf8').write(page)
print('排序：', ' > '.join(ORDER))
