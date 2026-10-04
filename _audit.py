# 全站英文說法查證：python3 _audit.py
# 每一條說法 ＝ 網站上寫的話 ＋ 出處網址 ＋ 出處原文裡一定要找到的句子（regex）。
# 找不到就算失敗。結果（含原文句子）存到 evidence/audit.json，word-check.html 會列出來。
import json, os, re, html, subprocess, time, unicodedata, urllib.parse

CACHE = os.environ.get('AUDIT_CACHE', '/tmp/audit_cache')
os.makedirs(CACHE, exist_ok=True)

def fetch(url):
    f = os.path.join(CACHE, re.sub(r'[^A-Za-z0-9]+', '_', url)[-180:])
    if os.path.exists(f) and os.path.getsize(f) > 200:
        return open(f, encoding='utf8').read()
    h = subprocess.run(['curl', '-sS', '-L', '--max-redirs', '8', '-A', 'Mozilla/5.0', url], capture_output=True, text=True).stdout
    open(f, 'w', encoding='utf8').write(h); time.sleep(0.3)
    return h

def norm(t):
    t = unicodedata.normalize('NFKD', t.replace('æ', 'ae').replace('Æ', 'AE'))
    t = ''.join(c for c in t if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', t.replace('“', '"').replace('”', '"').replace('’', "'"))

def text_of(url):
    h = fetch(url)
    if 'etymonline.com' in url:
        sec = re.findall(r'<section[^>]*class="[^"]*prose[^"]*"[^>]*>(.*?)</section>', h, re.S)
        if sec:
            return norm(' '.join(html.unescape(re.sub(r'<[^>]+>', '', s)) for s in sec))
    h = re.sub(r'<(script|style).*?</\1>', '', h, flags=re.S)
    return norm(html.unescape(re.sub(r'<[^>]+>', ' ', h)))

ETY = lambda w: 'https://www.etymonline.com/word/' + urllib.parse.quote(w)
ETYS = lambda w: 'https://www.etymonline.com/search?q=' + urllib.parse.quote(w)  # engineer 的單字頁會無限轉址，改用搜尋頁（同一段原文）
CAM = lambda w: 'https://dictionary.cambridge.org/dictionary/english/' + w
MW = lambda w: 'https://www.merriam-webster.com/dictionary/' + urllib.parse.quote(w)

# (第幾張卡／哪裡, 網站上寫的話, 出處, [原文一定要有的句子])
C = [
 ('doctor', '拉丁文 docere ＝ 教；doctor 原本是「老師」', ETY('doctor'), [r'in classical Latin "teacher"', r'docere "to show, teach']),
 ('doctor', '約 1400 年起才慢慢有「醫生」的意思', ETY('doctor'), [r'"medical professional.*grew gradually out of this from c\. 1400']),
 ('doctor', '醫生名牌上的 Dr. 就是 doctor', CAM('dr'), [r'written abbreviation for doctor']),
 ('professional athlete', '希臘文 athlon ＝ 獎品；athlete ＝ 為獎品比賽的人', ETY('athlete'), [r'athlon, meant "the prize of a contest"', r'"prizefighter, contestant in the games"']),
 ('professional athlete', 'athlon 更早的來源不明', ETY('athlete'), [r'a word of unknown origin']),
 ('professional athlete', 'pro 是 professional 的縮寫，口語', MW('pro'), [r'a shortened form of professional']),
 ('YouTuber', 'tube 當「電視」是 1959 年起的說法', ETY('tube'), [r'"TV as a medium," by 1959']),
 ('YouTuber', 'YouTuber ＝ 在 YouTube 上傳影片的人', MW('YouTuber'), [r'creates and uploads videos on the YouTube']),
 ('lawyer', 'lawyer ＝ 中古英語 lawe（法律）＋ -iere（人）', ETY('lawyer'), [r'lawe "law" \(see law\) \+ -iere']),
 ('lawyer', '-yer 是 -ier 的另一種寫法', ETY('lawyer'), [r'The spelling with -y- predominated from 17c']),
 ('actor', '拉丁文 actor ＝ 做事的人，來自 agere', ETY('actor'), [r'Latin actor "an agent or doer', r'agere "to set in motion, drive']),
 ('actor', '1580 年代才有「演戲的人」的意思', ETY('actor'), [r'"one who performs in plays" is by 1580s']),
 ('programmer', '希臘文 pro（向前、公開）＋ graphein（寫）', ETY('program'), [r'prographein "to write publicly," from pro "forth"', r'graphein "to write"']),
 ('programmer', 'program 當「電腦指令」是 1945 年起', ETY('program'), [r'The computer sense .* is from 1945']),
 ('veterinarian', '拉丁文 veterinarius ＝ 照顧拉車牲口的', ETY('veterinarian'), [r'veterinarius "of or having to do with beasts of burden"', r'"cattle doctor"']),
 ('veterinarian', '口語說 vet（正式說法是 veterinarian）', CAM('veterinarian'), [r'formal for vet']),
 ('police officer', 'police 來自希臘文 polis（城市）', ETY('police'), [r'Greek polis "city"']),
 ('engineer', 'engineer 本來是「製造（打仗用）機器的人」', ETYS('engineer'), [r'enginour, "constructor of military engines"']),
 ('engineer', 'engine 來自拉丁文 ingenium（天生的聰明）', ETY('engine'), [r'Latin ingenium "innate qualities, ability']),
 ('content creator', 'content 來自拉丁文 contentum（裝在裡面的東西）', ETY('content'), [r'Latin contentum']),
 ('content creator', 'create 來自拉丁文 creare（做出來）', ETY('create'), [r'creare "to make, bring forth']),
 ('esports player', 'esports ＝ e-（電子的）＋ sport，1999 年起', MW('esports'), [r'e- entry 2 \+ sport', r'first known use of esport was in 1999']),
 ('esports player', '美聯社寫作手冊定為 esports', 'https://www.espn.com/gaming/story/_/id/19860473', [r'Associated Press Stylebook went with esports']),
 ('teacher', 'teach 來自古英語 tæcan（指出、教）', ETY('teach'), [r'taecan .{0,60}"to show \(transitive\), point out, declare']),
 ('business manager', 'manage 本來是「訓練、控制馬」', ETY('manage'), [r'"to handle, train, or direct" \(a horse\)', r'especially "to control a horse"']),
 ('business manager', 'manager（1580 年代）＝ 指揮、管理的人', ETY('manager'), [r'1580s, "one who directs or controls"']),
 ('business manager', 'manage 最後來自拉丁文 manus（手）', ETY('manage'), [r'Latin noun manus "hand"']),
 ('business manager', 'business 來自 busy（很忙）', ETY('business'), [r'bisig "careful, anxious, busy']),
 ('game tester', '拉丁文 testum ＝ 陶土小鍋，用來試煉金屬', ETY('test'), [r'testum "earthen pot"', r'assaying precious metals']),
 ('game tester', 'game 來自古英語 gamen（快樂、好玩）', ETY('game'), [r'gamen "joy, fun']),
 ('pilot', '一般認為來自希臘文 pedon（掌方向的槳）', ETY('pilot'), [r'usually is said to be', r'pedon "steering oar"']),
 ('pilot', '本來是開船的人；1907 年才指開飛機', ETY('pilot'), [r'"one who steers a ship"', r'by 1907 to "one who flies an airplane"']),
 ('influencer', '拉丁文 in（進去）＋ fluere（流）', ETY('influence'), [r'in- "into', r'fluere "to flow"']),
 ('influencer', '流感 influenza 和 influence 同一個來源', ETY('influenza'), [r'from Medieval Latin influentia']),
 ('counselor', '拉丁文 consilium ＝ 意見、計畫', ETY('counsel'), [r'consilium "plan, opinion"']),
 ('counselor', '英國拼成 counsellor（兩個 l）', CAM('counselor'), [r'counsellor']),
 ('firefighter', '1895 年開始有這個字；fire ＋ fighter', ETY('firefighter'), [r'1895, from fire \(n\.\) \+ fighter']),
 ('firefighter', '古英語 fyr ＝ 火、feohtere ＝ 打仗的人', ETY('firefighter'), [r'Old English fyr', r'Old English feohtere']),
 ('entertainer', '古法文 entre（之間）＋ tenir（抓住）', ETY('entertain'), [r'entre- "among"', r'tenir "to hold"']),
 ('baker', '古英語 bæcere ＝ 烤東西的人', ETY('baker'), [r'baecere']),
 ('nurse', '拉丁文 nutrire ＝ 餵奶、養育', ETY('nurse'), [r'nutrire "to suckle"']),
 ('nurse', '1580 年代才有「照顧病人」的意思', ETY('nurse'), [r'who takes care of sick or infirm persons" in English is recorded by 1580s']),
 ('nurse', 'nurse 和營養 nutrition 同一個家', ETY('nutrition'), [r'nutrire']),
 ('tour guide', '古法文 tour ＝ 繞一圈', ETY('tour'), [r'"a turn, trick, round, circuit']),
 ('tour guide', 'guide ＝ 帶路', ETY('guide'), [r'"to guide, lead, conduct"']),
 ('fortune teller', '拉丁文 fortuna ＝ 運氣；羅馬人把幸運當成女神', ETY('fortune'), [r'Latin fortuna "chance, fate, good luck"', r'personified as a goddess']),
 ('fortune teller', '古英語 tellan ＝ 數、說', ETY('tell'), [r'tellan "reckon, calculate, number']),
 ('psychologist', '希臘文 psykhē ＝ 心、靈魂；古希臘人用蝴蝶代表它', ETY('psyche'), [r'psykhe "the soul, mind, spirit', r'butterfly']),
 ('psychologist', '-logy ＝ 學問', ETY('-logy'), [r'"a speaking, discourse, treatise, doctrine, theory, science"']),
 ('designer', '拉丁文 de（出來）＋ signare（做記號）', ETY('design'), [r'de "out"', r'signare "to mark"']),
 ('flight attendant', '古英語 flyht ＝ 飛', ETY('flight'), [r'Old English flyht']),
 ('flight attendant', '拉丁文 ad（向著）＋ tendere（伸出）', ETY('attend'), [r'ad "to, toward"', r'tendere "stretch"']),
 ('mechanic', '希臘文 mēkhanē ＝ 機器、工具', ETY('mechanic'), [r'mekhane']),
 ('mechanical engineer', 'mechanical ＝ mechanic ＋ -al', ETY('mechanical'), [r'from mechanic \(adj\.\) \+ -al']),
 ('computer engineer', 'computer 來自 compute（計算）', ETY('computer'), [r'agent noun from compute']),
 ('real estate agent', 'real 來自拉丁文 res（東西、財產）；real estate 1660 年代', ETY('real'), [r'Latin res "property, goods', r'Real estate, the exact term.*1660s']),
 ('real estate agent', 'agent 來自拉丁文 agere（做）', ETY('agent'), [r'agere "to set in motion, drive forward; to do']),
 ('architect', '希臘文 arkhi（老大、首領）＋ tekton（建造者）', ETY('architect'), [r'arkhi- "chief"', r'tekton "builder']),
 ('DJ', 'disk jockey 1941 年出現，DJ 1961 年', ETY('DJ'), [r'Disk jockey first recorded 1941', r'DJ is by 1961']),
 ('DJ', 'jockey ＝ 騎師', ETY('jockey'), [r'"person who rides horses in races"']),
 ('chef', '1842 年從法文 chef de cuisine（廚房的頭）進入英文', ETY('chef'), [r'1842, from French chef, short for chef de cuisine, literally "head of the kitchen"']),
 ('chef', 'chief／chef 來自拉丁文 caput（頭）', ETY('chief'), [r'Latin caput "head"']),
 ('chef', 'chef 唸 /ʃef/', CAM('chef'), [r'/ ?ʃef ?/']),
 ('hairstylist', 'hairstylist 和 hairdresser 意思一樣', CAM('hairstylist'), [r'Synonym hairdresser']),
 ('business manager', 'business 的 u 唸 /ɪ/（和 busy 一樣），所以不發音的是 i', CAM('busy'), [r'ˈbɪz\.i']),
 ('professional athlete', 'Cambridge 把 pro（職業的）標成口語 informal', CAM('pro'), [r'pro adjective \( PROFESSIONAL \) informal']),
 ('designer', 'design 的 g 不發音', CAM('design'), [r'dɪˈzaɪn']),
 ('psychologist', 'psychologist 開頭的 p 不發音', CAM('psychologist'), [r'saɪˈkɑː']),
 ('（字尾）', '-er 加在動詞後面 ＝ 做這件事的人', ETY('-er'), [r'English agent noun ending', r'"man who has to do with']),
 ('（字尾）', '-ist ＝ 做這件事的人', ETY('-ist'), [r'"one who does or makes']),
 ('（字尾）', '-eer ＝ 做這件事的人', ETY('-eer'), [r'word-forming element .*"one (concerned|who)']),
 ('（字尾）', '-ant 也可以表示「人」（assistant）', ETY('-ant'), [r'agent']),
 ('streamer（遊戲）', '古英語 stream ＝ 流動的水', ETY('stream'), [r'Old English stream']),
]

res = []
for who, claim, url, pats in C:
    t = text_of(url)
    hits = []
    for p in pats:
        m = re.search(norm(p).replace('"', '[,;.]?"'), t, re.I)  # 英文原文常把逗號放在引號裡
        hits.append(t[max(0, m.start() - 60): m.end() + 60].strip() if m else None)
    res.append({'card': who, 'claim': claim, 'url': url, 'ok': all(hits), 'quote': [h for h in hits if h]})

# 音節：Cambridge 美式音標裡的音節數 ＝ 卡片上的音節數
story = open('story.html', encoding='utf8').read()
SYL = json.loads(re.search(r'const SYL=(\{.*?\});', story).group(1))
def ipa(w):
    h = fetch(CAM('e-sports' if w == 'esports' else w.lower()))
    m = re.search(r'<span class="us dpron-i\s*">.*?<span class="ipa dipa[^"]*">(.*?)</span>\s*/', h, re.S)
    return html.unescape(re.sub(r'<[^>]+>', '', m.group(1))) if m else None
syl = []
for k, v in SYL.items():
    for w, p in zip(k.split(' '), v.split(' ')):
        i = ipa(w); n = len([s for s in re.split(r'[.ˈˌ]', i) if s.strip()]) if i else None
        syl.append({'word': w, 'site': p, 'site_n': len(p.split('-')), 'ipa': i, 'ipa_n': n, 'ok': n == len(p.split('-')),
                    'url': CAM('e-sports' if w == 'esports' else w.lower())})

json.dump({'claims': res, 'syllables': syl}, open('evidence/audit.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
bad = [r for r in res if not r['ok']] + [s for s in syl if not s['ok']]
for b in bad:
    print('❌', b.get('card', b.get('word')), b.get('claim', b.get('site')), b['url'])
print(f'說法 {len(res)} 條、音節 {len(syl)} 個；失敗 {len(bad)}')
