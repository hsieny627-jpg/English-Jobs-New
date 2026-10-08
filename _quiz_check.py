# 職涯探索測驗：題目、職業興趣分數、研究說法，全部重抓原文核對 → evidence/quiz.json
# python3 _quiz_check.py（之後 node _build_quiz.js 產生 quiz.html）
# 題目改了就改下面 ITEMS；每題的 q 必須是 O*NET 那個職業「工作內容」的逐字原文。
import json, os, re, subprocess, tempfile

DIR = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'Mozilla/5.0'}
TYPES = 'RIASEC'
NAME = {'R': 'Realistic', 'I': 'Investigative', 'A': 'Artistic', 'S': 'Social', 'E': 'Enterprising', 'C': 'Conventional'}

# 題目：型、圖示、中文、職業（=單字卡的字）、O*NET 工作內容原文（可以兩句）
ITEMS = [
 ('R', '🔧', '修理汽車的煞車', 'mechanic', ['Repair, reline, replace, and adjust brakes.']),
 ('I', '🐶', '幫生病的小動物檢查，找出牠哪裡不舒服', 'veterinarian', ['Examine animals to detect and determine the nature of diseases or injuries.']),
 ('A', '🎨', '用水彩、蠟筆或電腦畫畫', 'painter', ['Use materials such as pens and ink, watercolors, charcoal, oil, or computer software to create artwork.']),
 ('S', '🧑‍🏫', '教學生學會新東西', 'teacher', ['Instruct students individually and in groups, using teaching methods such as lectures, discussions, and demonstrations.']),
 ('E', '💼', '安排大家的工作，決定誰做什麼', 'business manager', ['Prepare staff work schedules and assign specific duties.']),
 ('C', '✈️', '照著檢查表，一項一項檢查飛機', 'pilot', ['Inspect aircraft for defects and malfunctions, according to pre-flight checklists.']),
 ('R', '🍞', '量好麵粉，準備做麵包的麵團', 'baker', ['Measure or weigh flour or other ingredients to prepare batters, doughs, fillings, or icings, using scales or graduated containers.']),
 ('I', '🎮', '試玩遊戲，找出錯誤並記錄下來', 'game tester', ['Identify, analyze, and document problems with program function, output, online screen, or content.']),
 ('A', '🖌️', '幫公司設計商標（logo）和網頁', 'designer', ['Develop graphics and layouts for product illustrations, company logos, and Web sites.']),
 ('S', '💉', '幫受傷的人急救、擦藥、包紮', 'nurse', ['Provide health care, first aid, immunizations, or assistance in convalescence or rehabilitation in locations such as schools, hospitals, or industry.']),
 ('E', '⚖️', '找證據，在法院幫別人說話', 'lawyer', ['Gather evidence to formulate defense or to initiate legal actions by such means as interviewing clients and witnesses to ascertain the facts of a case.', 'Represent clients in court or before government agencies.']),
 ('C', '🧳', '檢查急救箱和安全設備有沒有準備好', 'flight attendant', ['Verify that first aid kits and other emergency equipment, including fire extinguishers and oxygen bottles, are in working order.']),
 ('R', '🚒', '開消防車，去火災現場救人', 'firefighter', ['Drive and operate fire fighting vehicles and equipment.', 'Rescue survivors from burning buildings, accident sites, and water hazards.']),
 ('I', '🩺', '看檢查報告，找出病人生了什麼病', 'doctor', ["Order, perform, and interpret tests and analyze records, reports, and examination information to diagnose patients' condition."]),
 ('A', '🎤', '站上舞台，唱歌給大家聽', 'singer', ['Perform before live audiences in concerts, recitals, educational presentations, and other social gatherings.']),
 ('S', '🧠', '聽別人說出心裡的感受，陪他想一想', 'counselor', ['Encourage clients to express their feelings and discuss what is happening in their lives, helping them to develop insight into themselves or their relationships.']),
 ('E', '🏠', '幫買房子和賣房子的人談好條件', 'real estate agent', ['Act as an intermediary in negotiations between buyers and sellers, generally representing one or the other.']),
 ('C', '👮', '把發生的事情詳細寫成紀錄', 'police officer', ['Record facts to prepare reports that document incidents and activities.']),
 ('R', '🏃', '每天練習運動，參加比賽', 'professional athlete', ['Attend scheduled practice or training sessions.', 'Participate in athletic events or competitive sports, according to established rules and regulations.']),
 ('I', '⚙️', '研究機器為什麼故障，想辦法改好', 'mechanical engineer', ['Investigate equipment failures or difficulties to diagnose faulty operation and recommend remedial actions.']),
 ('A', '🎭', '背台詞、練習演戲', 'actor', ['Study and rehearse roles from scripts to interpret, learn and memorize lines, stunts, and cues as directed.']),
 ('S', '🧭', '帶大家參觀，介紹景點、回答問題', 'tour guide', ['Describe tour points of interest to group members, and respond to questions.']),
 ('E', '🧑‍🍳', '教廚房裡的人怎麼做菜，帶領大家', 'chef', ['Instruct cooks or other workers in the preparation, cooking, garnishing, or presentation of food.']),
 ('C', '💻', '把一步一步的指令排好，寫成電腦程式', 'programmer', ['Prepare detailed workflow charts and diagrams that describe input, output, and logical operation, and convert them into a series of instructions coded in a computer language.']),
 ('R', '✂️', '幫人剪頭髮、修出好看的髮型', 'hairstylist', ["Cut, trim and shape hair or hairpieces, based on customers' instructions, hair type, and facial features, using clippers, scissors, trimmers and razors."]),
 ('I', '🧠', '了解別人心情和行為上的困擾', 'psychologist', ['Identify psychological, emotional, or behavioral issues and diagnose disorders, using information obtained from interviews, tests, records, or reference materials.']),
 ('A', '🎧', '用 DJ 機器播放音樂', 'DJ', ['Operate disc jockey controller and other equipment, such as microphones.']),
 ('S', '🩺', '告訴大家怎麼吃、怎麼運動，才不會生病', 'doctor', ['Advise patients and community members concerning diet, activity, hygiene, and disease prevention.']),
 ('E', '💼', '計畫特價活動，讓更多人來買東西', 'business manager', ['Plan or direct activities, such as sales promotions, that require coordination with other department managers.']),
 ('C', '✂️', '幫客人排好預約的時間', 'hairstylist', ['Schedule client appointments.']),
]

# O*NET 查不到直接資料的職業（不放進興趣分類，結果頁另列「也可以認識」；fortune teller 不列）
NO_DATA = {
 'YouTuber': 'O*NET 沒有這個職業', 'content creator': 'O*NET 沒有這個職業', 'influencer': 'O*NET 沒有這個職業',
 'esports player': 'O*NET 搜尋 esports 沒有完全符合的職業（只自動改搜 sports）',
 'entertainer': 'O*NET 27-2099.00 是「其他」類，沒有興趣分數', 'engineer': '沒有指定哪一種工程師', 'fortune teller': 'O*NET 沒有這個職業'}
NOT_SHOWN = {'fortune teller'}

# 研究說法：原文裡一定要找得到這些句子（空白、換行不算）
CLAIMS = [
 ('O*NET 興趣量表可以改編，創用 CC 授權', 'https://www.onetcenter.org/IP.html',
  ['The O*NET Interest Profiler may be redistributed or used to develop other assessments', 'Develop customized versions']),
 ('30 題迷你版：每型 5 題，可信度 .74～.81', 'https://www.onetcenter.org/dl_files/Mini-IP.pdf',
  ['The five-item interest scales had alpha coefficients ranging from .74 to .81', 'the 30-item version meets satisfactory reliability standards']),
 ('用表情符號作答', 'https://www.onetcenter.org/reports/IP_Emoji.html',
  ['An emoji-anchored scale uses ideograms symbolizing facial expressions for each point on the response scale']),
 ('Tracey & Ward 1998：年紀越大，六型結構越清楚', 'https://api.openalex.org/works/doi:10.1037/0022-0167.45.3.290',
  ['the fit of the circular model was positively related to age', 'elementary and middle school students evaluated their interests and competencies using different dimensions than did college students']),
 ('Tracey 2002：五到八年級興趣還在改變', 'https://api.openalex.org/works/doi:10.1037/0022-0167.49.2.148',
  ['there were changes both in the structure and level of interest and competence ratings over time', 'especially by 8th grade']),
 ('教育部議題融入說明手冊：生涯規劃教育（國小）、性別平等 性E3',
  'https://stv.naer.edu.tw/data/course_manual/A/%E8%AD%B0%E9%A1%8C%E8%9E%8D%E5%85%A5%E8%AA%AA%E6%98%8E%E6%89%8B%E5%86%8A(%E5%AE%9A%E7%A8%BF%E7%89%88).pdf',
  ['國小教育階段的生涯發展著重自我概念的發展以及覺察能力的培養', '涯E4認識自己的特質與興趣', '涯E8對工作/教育環境的好奇心',
   '涯E9認識不同類型工作/教育環境', '性E3覺察性別角色的刻板印象，了解家庭、學校與職業的分工，不應受性別的限制']),
 ('台灣六型中文名稱（大考中心興趣量表）', 'https://www.yphs.tp.edu.tw/wp-content/uploads/doc/yp1255/%E8%88%88%E8%B6%A3%E9%87%8F%E8%A1%A8%E8%A7%A3%E9%87%8B%E8%88%87%E6%87%89%E7%94%A8.pdf',
  ['實用型(R)、研究型(I)、藝術型(A)、社會型', '(S)、企業型(E)、事務型(C)']),
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
    out = {'items': [], 'jobs': {}, 'no_data': [], 'claims': [], 'defs': {}}
    pages = {}
    for w in words:
        if w in NO_DATA: continue
        code = jobs[w]['code']
        t, sc, defs = onet(code)
        pages[w] = t
        if defs: out['defs'] = defs
        top = sorted(sc.items(), key=lambda x: (-x[1], TYPES.index(x[0])))
        out['jobs'][w] = {'code': code, 'url': f'https://www.onetonline.org/link/details/{code}', 'scores': sc,
                          'top3': [k for k, _ in top[:3]], 'ok': len(sc) == 6}
        print(w, code, ''.join(f'{k}{v} ' for k, v in top))
    for w in words:
        if w in NO_DATA:
            out['no_data'].append({'e': w, 'why': NO_DATA[w], 'show': w not in NOT_SHOWN})
    for n, (ty, ic, zh, w, qs) in enumerate(ITEMS, 1):
        j = out['jobs'][w]
        found = [q in pages[w] for q in qs]
        # 名次：比它高分的有幾型 +1（同分算同名次）
        rank = 1 + sum(v > j['scores'][ty] for v in j['scores'].values()) if ty in j['top3'] else 0
        ok = all(found) and rank > 0
        out['items'].append({'n': n, 't': ty, 'ic': ic, 'zh': zh, 'e': w, 'q': qs, 'url': j['url'], 'code': j['code'],
                             'score': j['scores'].get(ty), 'rank': rank, 'ok': ok})
        if not ok: print('❌ 第', n, '題', w, '原文' + ('' if all(found) else '找不到'), '興趣排名', rank)
    for name, url, quotes in CLAIMS:
        t = squash(text(url))
        miss = [q for q in quotes if squash(q) not in t]
        out['claims'].append({'name': name, 'url': url, 'quotes': quotes, 'ok': not miss})
        if miss: print('❌', name, '找不到：', miss)
    cnt = {t: sum(i['t'] == t for i in out['items']) for t in TYPES}
    out['balanced'] = all(v == 5 for v in cnt.values())
    json.dump(out, open(os.path.join(DIR, 'evidence', 'quiz.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    bad = sum(not i['ok'] for i in out['items']) + sum(not c['ok'] for c in out['claims']) + sum(not j['ok'] for j in out['jobs'].values()) + (not out['balanced'])
    print(f"題目 {len(ITEMS)}、職業 {len(out['jobs'])}、研究說法 {len(CLAIMS)}：{bad} 項失敗")

main()
