# 查 Google Books Ngram（英文語料庫 en，2018～2022 年平均）：python3 _ngram.py
# 每一組第一個是網站用的字，後面是可能的其他說法；單數＋複數一起算，大小寫不分。結果存 evidence/ngram.json
import json, time, urllib.request, urllib.parse
SETS = [
 ['doctor','physician'], ['professional athlete','pro athlete'], ['programmer','coder','software developer'],
 ['engineer'], ['esports player','pro gamer','professional gamer','esports athlete'], ['teacher'],
 ['business manager'], ['influencer','social media influencer'], ['lawyer','attorney'], ['baker','pastry chef'],
 ['psychologist'], ['nurse'], ['painter','illustrator'], ['police officer','policeman'], ['designer'], ['singer'],
 ['veterinarian','vet'], ['mechanic','auto mechanic','car mechanic'], ['computer engineer','software engineer'],
 ['hairstylist','hairdresser','hair stylist'], ['architect'], ['content creator'], ['game tester','video game tester'],
 ['counselor','counsellor'], ['entertainer'], ['tour guide'], ['fortune teller','fortune-teller','fortuneteller'],
 ['actor'], ['pilot'], ['firefighter','fireman'], ['YouTuber'], ['flight attendant','stewardess'],
 ['real estate agent','realtor','estate agent'], ['DJ','disc jockey'], ['streamer'],
 ['mechanical engineer'], ['chef','cook'],
]
PL = {'fortune-teller':'fortune-tellers','policeman':'policemen','fireman':'firemen','stewardess':'stewardesses','coach':'coaches','DJ':'DJs'}
def plural(w):
    if w in PL: return PL[w]
    return w + 's'
def query(terms):
    content = ','.join(f'({t} + {plural(t)})' for t in terms)
    q = urllib.parse.urlencode({'content': content, 'year_start': 2018, 'year_end': 2022, 'corpus': 'en', 'smoothing': 0, 'case_insensitive': 'true'})
    req = urllib.request.Request('https://books.google.com/ngrams/json?' + q, headers={'User-Agent': 'Mozilla/5.0'})
    return json.load(urllib.request.urlopen(req)), q
out = []
for s in SETS:
    data, q = query(s)
    vals = {}
    for d in data:
        if d['type'] in ('NGRAM_COLLECTION', 'NGRAM', 'CASE_INSENSITIVE') and '(All)' not in d['ngram'] or d['type'] == 'NGRAM_COLLECTION':
            pass
        vals[d['ngram']] = sum(d['timeseries']) / len(d['timeseries']) * 1e9  # 每十億字出現幾次
    out.append({'set': s, 'raw': vals, 'url': 'https://books.google.com/ngrams/graph?' + q.replace('case_insensitive=true', 'case_insensitive=on')})
    time.sleep(1.2)
json.dump(out, open('evidence/ngram.json', 'w'), ensure_ascii=False, indent=1)
for o in out: print(o['set'][0], {k: round(v, 1) for k, v in o['raw'].items()})
