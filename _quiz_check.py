# 職涯探索測驗：題目、職業興趣分數、研究說法，全部重抓原文核對 → evidence/quiz.json
# python3 _quiz_check.py（之後 node _build_quiz.js 產生 quiz.html）
# 題目改了就改下面 ITEMS；每題的 q 必須是 O*NET 那個職業「工作內容」的逐字原文。
# 原則：每一型的題目優先用「這一型分數最高」的職業（第 6 題 programmer 事務型 82 最高、第 29 題 lawyer 企業型 75 最高）。
import csv, io, json, os, re, subprocess, tempfile

DIR = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'Mozilla/5.0'}
TYPES = 'RIASEC'
NAME = {'R': 'Realistic', 'I': 'Investigative', 'A': 'Artistic', 'S': 'Social', 'E': 'Enterprising', 'C': 'Conventional'}

# 題目：型、圖示、中文、職業（=單字卡的字）、O*NET 工作內容原文（可以兩句）
ITEMS = [
 ('R', '🔧', '修理汽車的煞車', 'mechanic', ['Repair, reline, replace, and adjust brakes.']),
 ('I', '🐶', '幫生病的小動物檢查，找出牠哪裡不舒服', 'veterinarian', ['Examine animals to detect and determine the nature of diseases or injuries.']),
 ('A', '🎨', '用筆、水彩或電腦畫畫', 'painter', ['Use materials such as pens and ink, watercolors, charcoal, oil, or computer software to create artwork.']),
 ('S', '🧑‍🏫', '教學生學會新東西', 'teacher', ['Instruct students individually and in groups, using teaching methods such as lectures, discussions, and demonstrations.']),
 ('E', '💼', '安排大家的工作，決定誰做什麼', 'business manager', ['Prepare staff work schedules and assign specific duties.']),
 ('C', '💻', '找出電腦程式哪裡寫錯，改好再檢查一次', 'programmer', ['Correct errors by making appropriate changes and rechecking the program to ensure that the desired results are produced.']),
 ('R', '🍞', '把麵粉放在秤上秤重，準備做麵包', 'baker', ['Measure or weigh flour or other ingredients to prepare batters, doughs, fillings, or icings, using scales or graduated containers.']),
 ('I', '🎮', '試玩電玩遊戲，找出哪裡有問題，記錄下來', 'game tester', ['Identify, analyze, and document problems with program function, output, online screen, or content.']),
 ('A', '🖌️', '幫公司設計標誌（logo）和網頁畫面', 'designer', ['Develop graphics and layouts for product illustrations, company logos, and Web sites.']),
 ('S', '💉', '幫受傷的人急救、擦藥、包紮', 'nurse', ['Provide health care, first aid, immunizations, or assistance in convalescence or rehabilitation in locations such as schools, hospitals, or industry.']),
 ('E', '⚖️', '找證據，在法院幫別人說話', 'lawyer', ['Gather evidence to formulate defense or to initiate legal actions by such means as interviewing clients and witnesses to ascertain the facts of a case.', 'Represent clients in court or before government agencies.']),
 ('C', '🧳', '檢查急救箱和滅火器能不能用', 'flight attendant', ['Verify that first aid kits and other emergency equipment, including fire extinguishers and oxygen bottles, are in working order.']),
 ('R', '🚒', '開消防車，去火災現場救人', 'firefighter', ['Drive and operate fire fighting vehicles and equipment.', 'Rescue survivors from burning buildings, accident sites, and water hazards.']),
 ('I', '🩺', '看檢查報告，找出病人生了什麼病', 'doctor', ["Order, perform, and interpret tests and analyze records, reports, and examination information to diagnose patients' condition."]),
 ('A', '🎤', '站上舞台，唱歌給大家聽', 'singer', ['Perform before live audiences in concerts, recitals, educational presentations, and other social gatherings.']),
 ('S', '🧠', '聽別人說出心裡的感受，幫他更了解自己', 'counselor', ['Encourage clients to express their feelings and discuss what is happening in their lives, helping them to develop insight into themselves or their relationships.']),
 ('E', '🏠', '幫要買房子和要賣房子的人商量', 'real estate agent', ['Act as an intermediary in negotiations between buyers and sellers, generally representing one or the other.']),
 ('C', '👮', '把發生了什麼事，仔細寫下來', 'police officer', ['Record facts to prepare reports that document incidents and activities.']),
 ('R', '🏃', '按時練習運動，參加比賽', 'professional athlete', ['Attend scheduled practice or training sessions.', 'Participate in athletic events or competitive sports, according to established rules and regulations.']),
 ('I', '⚙️', '研究機器為什麼壞掉，想辦法改好', 'mechanical engineer', ['Investigate equipment failures or difficulties to diagnose faulty operation and recommend remedial actions.']),
 ('A', '🎭', '背台詞、練習演戲', 'actor', ['Study and rehearse roles from scripts to interpret, learn and memorize lines, stunts, and cues as directed.']),
 ('S', '🧭', '帶大家去參觀，介紹好玩的地方、回答問題', 'tour guide', ['Describe tour points of interest to group members, and respond to questions.']),
 ('E', '🧑‍🍳', '教廚房裡的人怎麼做菜，帶領大家', 'chef', ['Instruct cooks or other workers in the preparation, cooking, garnishing, or presentation of food.']),
 ('C', '💻', '把電腦要做的事一步一步排好，寫成程式', 'programmer', ['Prepare detailed workflow charts and diagrams that describe input, output, and logical operation, and convert them into a series of instructions coded in a computer language.']),
 ('R', '✂️', '幫人剪頭髮、修出好看的髮型', 'hairstylist', ["Cut, trim and shape hair or hairpieces, based on customers' instructions, hair type, and facial features, using clippers, scissors, trimmers and razors."]),
 ('I', '🧠', '找出別人在心情或行為上遇到的困難', 'psychologist', ['Identify psychological, emotional, or behavioral issues and diagnose disorders, using information obtained from interviews, tests, records, or reference materials.']),
 ('A', '🎧', '選大家喜歡的歌，放給大家聽', 'DJ', ['Select and play music incorporating crowd preferences and mood.']),
 ('S', '🩺', '告訴大家怎麼吃、怎麼運動，才不會生病', 'doctor', ['Advise patients and community members concerning diet, activity, hygiene, and disease prevention.']),
 ('E', '⚖️', '幫意見不合的兩個人，談出兩邊都同意的辦法', 'lawyer', ['Negotiate settlements of civil disputes.']),
 ('C', '✂️', '幫客人排好預約的時間', 'hairstylist', ['Schedule client appointments.']),
]

# 單字卡上沒有自己一個 O*NET 職業的 7 個字：用 O*NET 官方職稱資料庫（v31）決定怎麼處理
DB = 'https://www.onetcenter.org/dl_files/database/db_31_0_csv/'
# 歸類：職稱列在哪個職業 → 用那個職業的分數
CLASSIFY = {
 'esports player': {'titles': [('27-2021.00', 'Esports Competitor'), ('27-2021.00', 'Gamer')], 'use': '27-2021.00',
                    'note': '分數是全部運動員一起算（電競選手和其他運動員同一個職業）'},
 'entertainer': {'titles': [('27-2011.00', 'Entertainer'), ('27-3011.00', 'Entertainer')], 'use': '27-2011.00',
                 'note': '「Entertainer」列在演員（27-2011.00）和廣播主持人／電台 DJ（27-3011.00）兩個職業，兩個的前 3 名都是藝術、社會、企業型；分數用演員的'},
 'engineer': {'family': '17-2', 'note': '沒有指定哪一種工程師：分數是 O*NET 所有工程師（有分數的 34 種）的平均，34 種的前 3 名全部是實用、研究、事務型'},
}
# 不歸類：(原因, 職稱資料庫裡要找到的 (代碼, 職稱)；空的＝資料庫裡沒有這個字)
NO_DATA = {
 'content creator': ('資料庫的「Content Creator」分在 3 個不同的職業（電玩設計師、作家、影片剪輯師），沒有一個是網站說的「自媒體經營」',
                     [('15-1255.01', 'Content Creator'), ('27-3043.00', 'Content Creator'), ('27-4032.00', 'Content Creator')]),
 'YouTuber': ('職稱資料庫裡沒有 YouTuber 這個字', []),
 'influencer': ('資料庫的「Influencer」列在模特兒（41-9012.00 Models），和網站說的「網紅」意思不同', [('41-9012.00', 'Influencer')]),
 'fortune teller': ('「Fortune Teller」列在 27-2099.00「其他」類，O*NET 原文：“O*NET data is not available for this type of title.”',
                    [('27-2099.00', 'Fortune Teller')]),
}
NOT_SHOWN = {'fortune teller'}
NO_DATA_PAGE = ('https://www.onetonline.org/link/summary/27-2099.00', 'O*NET data is not available for this type of title.')

# 研究說法：原文裡一定要找得到這些句子（空白、換行不算）。page＝要不要顯示在網頁的「給老師看的證據」
CLAIMS = [
 ('改編自美國勞動部 O*NET「職業興趣量表」，可以改編', 'https://www.onetcenter.org/IP.html',
  ['The O*NET Interest Profiler may be redistributed or used to develop other assessments', 'Develop customized versions'], True),
 ('何倫 Holland 六種興趣理論：研究歷史很長、輔導老師很常使用', 'https://www.onetcenter.org/IP.html',
  ["Compatible with Holland's R-I-A-S-E-C Interest Structure", 'rich and extensive research history', 'widely accepted and used by counselors'], True),
 ('原版 30 題迷你版：每型 5 題（原版的可信度數字；我們改寫後沒有量過）', 'https://www.onetcenter.org/dl_files/Mini-IP.pdf',
  ['The five-item interest scales had alpha coefficients ranging from .74 to .81', 'the 30-item version meets satisfactory reliability standards'], True),
 ('用表情符號作答', 'https://www.onetcenter.org/reports/IP_Emoji.html',
  ['An emoji-anchored scale uses ideograms symbolizing facial expressions for each point on the response scale'], True),
 ('Tracey & Ward 1998：年紀越大，六型結構越清楚；小學生和大學生看興趣的方式不一樣', 'https://api.openalex.org/works/doi:10.1037/0022-0167.45.3.290',
  ['the fit of the circular model was positively related to age', 'elementary and middle school students evaluated their interests and competencies using different dimensions than did college students'], True),
 ('Tracey 2002：五到八年級的興趣還在改變', 'https://api.openalex.org/works/doi:10.1037/0022-0167.49.2.148',
  ['there were changes both in the structure and level of interest and competence ratings over time', 'especially by 8th grade'], True),
 ('每個職業都有六種興趣的分數', 'https://www.onetcenter.org/dictionary/30.0/excel/interests.html',
  ['numeric profile data for each O*NET-SOC occupation', 'OI reports the RIASEC level of each interest'], True),
 ('分數換算成 0～100 分', 'https://www.onetonline.org/help/online/scales',
  ['descriptor means have been standardized to a scale ranging from 0 to 100'], True),
 ('興趣類型＝你喜歡的工作種類', 'https://www.onetonline.org/find/descriptor/browse/1.B.1',
  ['Career interest types are broad types of work you enjoy. Select an interest to discover occupations that support the interest type.'], True),
 # 下面兩項是規劃的根據，網頁不顯示（2026/10/9 使用者決定：網頁不提教育部和其他測驗）
 ('教育部議題融入說明手冊：國小 涯E4、涯E8、涯E9（測驗的目的）',
  'https://stv.naer.edu.tw/data/course_manual/A/%E8%AD%B0%E9%A1%8C%E8%9E%8D%E5%85%A5%E8%AA%AA%E6%98%8E%E6%89%8B%E5%86%8A(%E5%AE%9A%E7%A8%BF%E7%89%88).pdf',
  ['國小教育階段的生涯發展著重自我概念的發展以及覺察能力的培養', '涯E4認識自己的特質與興趣', '涯E8對工作/教育環境的好奇心',
   '涯E9認識不同類型工作/教育環境', '性E3覺察性別角色的刻板印象，了解家庭、學校與職業的分工，不應受性別的限制'], False),
 ('六型中文名稱', 'https://www.yphs.tp.edu.tw/wp-content/uploads/doc/yp1255/%E8%88%88%E8%B6%A3%E9%87%8F%E8%A1%A8%E8%A7%A3%E9%87%8B%E8%88%87%E6%87%89%E7%94%A8.pdf',
  ['實用型(R)、研究型(I)、藝術型(A)、社會型', '(S)、企業型(E)、事務型(C)'], False),
]

def get(url):
    # 用 curl：部分台灣學校網站的憑證 Python 不接受
    for k in range(4):
        r = subprocess.run(['curl', '-sSL', '--max-time', '120', '-A', UA['User-Agent'], url], capture_output=True)
        if r.returncode == 0 and r.stdout: return r.stdout
    raise RuntimeError('抓不到 ' + url)

def text(url):
    b = get(url)
    if b[:4] == b'%PDF':
        with tempfile.NamedTemporaryFile(suffix='.pdf') as f:
            f.write(b); f.flush()
            return subprocess.run(['pdftotext', '-raw', f.name, '-'], capture_output=True, text=True).stdout
    if url.startswith('https://api.openalex.org'):
        ii = json.loads(b)['abstract_inverted_index']
        return ' '.join(w for _, w in sorted((p, w) for w, ps in ii.items() for p in ps))
    t = b.decode('utf8', 'ignore')
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', t, flags=re.S)
    t = re.sub(r'<[^>]+>', ' ', t).replace('&nbsp;', ' ').replace('&amp;', '&').replace('&#39;', "'").replace('&reg;', '®')
    return re.sub(r'\s+', ' ', t)

squash = lambda s: re.sub(r'\s+', '', s)
rows = lambda name: list(csv.DictReader(io.StringIO(get(DB + name).decode('utf8'))))
top3 = lambda sc: [k for k, _ in sorted(sc.items(), key=lambda x: (-x[1], TYPES.index(x[0])))[:3]]

def onet(code):
    t = text(f'https://www.onetonline.org/link/details/{code}')
    i = t.find('Career Interest Types Save Table')
    seg = t[i:t.find('back to top', i)] if i >= 0 else ''
    sc = {n[0]: int(v) for v, n in re.findall(r'(\d+) +(' + '|'.join(NAME.values()) + r') —', seg)}
    defs = {n[0]: d for n, d in re.findall(r'\d+ +(' + '|'.join(NAME.values()) + r') — (.*?) Related occupations', seg)}
    return t, sc, defs

def main():
    jobs = json.load(open(os.path.join(DIR, 'evidence', 'onet.json'), encoding='utf8'))
    story = open(os.path.join(DIR, 'story.html'), encoding='utf8').read()
    words = re.findall(r"\{no:\d+,e:'([^']+)'", story)
    out = {'items': [], 'jobs': {}, 'no_data': [], 'claims': [], 'defs': {}, 'titles_db': {}, 'engineers': []}
    pages = {}
    for w in words:
        if w in NO_DATA or w in CLASSIFY: continue
        code = jobs[w]['code']
        t, sc, defs = onet(code)
        pages[w] = t
        if defs: out['defs'] = defs
        out['jobs'][w] = {'code': code, 'url': f'https://www.onetonline.org/link/details/{code}', 'scores': sc,
                          'top3': top3(sc), 'ok': len(sc) == 6}
        print(w, code, ' '.join(f'{k}{sc[k]}' for k in top3(sc)))
    # 官方職稱資料庫
    titles = rows('job_titles.csv')
    occ = rows('occupation_data.csv')
    rated = {r['O*NET-SOC Code'] for r in rows('career_interest_types.csv') if r['Scale ID'] == 'OI'}
    have = {(r['O*NET-SOC Code'], r['Job Title']) for r in titles}
    out['titles_db'] = {'url': DB + 'job_titles.csv', 'n': len(titles), 'rated': len(rated), 'rated_url': DB + 'career_interest_types.csv',
                        'ok': len(titles) > 50000 and 900 <= len(rated) < 1000}
    print('職稱資料庫', len(titles), '個職稱；有興趣分數的職業', len(rated), '種')
    for w, c in CLASSIFY.items():
        if 'family' in c:
            fam = [(r['O*NET-SOC Code'], r['Title']) for r in occ if r['O*NET-SOC Code'].startswith(c['family'])]
            for code, title in fam:
                _, sc, _ = onet(code)
                if len(sc) == 6:
                    out['engineers'].append({'code': code, 'title': title, 'scores': sc, 'top3': top3(sc),
                                             'url': f'https://www.onetonline.org/link/details/{code}', 'ok': set(top3(sc)) == set('RIC')})
            sc = {t: round(sum(e['scores'][t] for e in out['engineers']) / len(out['engineers'])) for t in TYPES}
            ok = all(e['ok'] for e in out['engineers']) and len(out["engineers"]) == 34
            out['jobs'][w] = {'code': c['family'] + 'xxx', 'url': 'https://www.onetonline.org/find/family?f=17', 'scores': sc, 'top3': top3(sc),
                              'ok': ok, 'note': c['note'], 'avg_of': len(out['engineers'])}
        else:
            found = [(code, t) in have for code, t in c['titles']]
            codes = sorted({code for code, _ in c['titles']})
            per = {code: onet(code)[1] for code in codes}
            same = len({frozenset(top3(sc)) for sc in per.values()}) == 1 and all(len(sc) == 6 for sc in per.values())
            sc = per[c['use']]
            out['jobs'][w] = {'code': c['use'], 'url': f'https://www.onetonline.org/link/details/{c["use"]}', 'scores': sc, 'top3': top3(sc),
                              'ok': all(found) and same, 'note': c['note'], 'titles': c['titles'],
                              'also': {code: {'scores': s2, 'top3': top3(s2)} for code, s2 in per.items() if code != c['use']}}
        j = out['jobs'][w]
        print(w, '歸類', ' '.join(f'{k}{j["scores"][k]}' for k in j['top3']), '✅' if j['ok'] else '❌')
    nd_page = squash(text(NO_DATA_PAGE[0]))
    for w in words:
        if w in NO_DATA:
            why, need = NO_DATA[w]
            lw = w.lower()
            listed = sorted({(r['O*NET-SOC Code'], r['Job Title']) for r in titles if r['Job Title'].lower() == lw or (w == 'YouTuber' and 'youtube' in r['Job Title'].lower())})
            ok = listed == sorted(need) and (w != 'fortune teller' or squash(NO_DATA_PAGE[1]) in nd_page)
            out['no_data'].append({'e': w, 'why': why, 'show': w not in NOT_SHOWN, 'listed': listed, 'ok': ok})
            if not ok: print('❌ 職稱資料庫', w, listed)
    for n, (ty, ic, zh, w, qs) in enumerate(ITEMS, 1):
        j = out['jobs'][w]
        found = [q in pages[w] for q in qs]
        # 名次：比它高分的有幾型 +1（同分算同名次）
        rank = 1 + sum(v > j['scores'][ty] for v in j['scores'].values()) if ty in j['top3'] else 0
        ok = all(found) and rank > 0
        out['items'].append({'n': n, 't': ty, 'ic': ic, 'zh': zh, 'e': w, 'q': qs, 'url': j['url'], 'code': j['code'],
                             'score': j['scores'].get(ty), 'rank': rank, 'ok': ok})
        if not ok: print('❌ 第', n, '題', w, '原文' + ('' if all(found) else '找不到'), '興趣排名', rank)
    for name, url, quotes, page in CLAIMS:
        t = squash(text(url))
        miss = [q for q in quotes if squash(q) not in t]
        out['claims'].append({'name': name, 'url': url, 'quotes': quotes, 'ok': not miss, 'page': page})
        if miss: print('❌', name, '找不到：', miss)
    cnt = {t: sum(i['t'] == t for i in out['items']) for t in TYPES}
    out['balanced'] = all(v == 5 for v in cnt.values())
    json.dump(out, open(os.path.join(DIR, 'evidence', 'quiz.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    bad = (sum(not i['ok'] for i in out['items']) + sum(not c['ok'] for c in out['claims']) + sum(not j['ok'] for j in out['jobs'].values())
           + sum(not x['ok'] for x in out['no_data']) + (not out['balanced']) + (not out['titles_db']['ok']))
    print(f"題目 {len(ITEMS)}、職業 {len(out['jobs'])}（工程師 {len(out['engineers'])} 種）、沒有歸類 {len(out['no_data'])}、研究說法 {len(CLAIMS)}：{bad} 項失敗")

main()
