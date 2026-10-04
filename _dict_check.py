# 查每個字在 Cambridge、Merriam-Webster 有沒有收錄＋標記（US／UK／informal）：python3 _dict_check.py ➜ evidence/dict.json
import json, re, time, html, urllib.request
WORDS = ['doctor','professional athlete','pro athlete','athlete','pro','programmer','engineer','esports','esports player','teacher','business manager',
 'influencer','lawyer','baker','psychologist','nurse','painter','police officer','designer','singer','veterinarian','mechanic','computer engineer',
 'hairstylist','hairdresser','architect','content creator','game tester','counselor','entertainer','tour guide','fortune teller','actor','pilot',
 'firefighter','YouTuber','flight attendant','real estate agent','realtor','DJ','disc jockey','streamer','mechanical engineer','chef','cook','software engineer']
def get(u):
    r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30)
    return r.geturl(), r.read().decode('utf8', 'ignore')
out = {}
for w in WORDS:
    rec = {}
    cu = 'https://dictionary.cambridge.org/dictionary/english/' + w.lower().replace(' ', '-')
    try:
        fu, h = get(cu)
        hw = re.findall(r'<span class="hw dhw">([^<]+)</span>', h)
        labels = sorted(set(re.findall(r'<span class="(?:lab dlab|region dreg|usage dusage)">([^<]+)</span>', h)))[:8]
        d = re.search(r'<div class="def ddef_d db">(.*?)</div>', h, re.S)
        rec['cambridge'] = {'url': cu, 'final': fu, 'headwords': sorted(set(hw))[:5], 'labels': labels,
                            'def': html.unescape(re.sub(r'<[^>]+>', '', d.group(1))).strip() if d else ''}
    except Exception as e:
        rec['cambridge'] = {'url': cu, 'error': str(e)[:80]}
    mu = 'https://www.merriam-webster.com/dictionary/' + urllib.request.quote(w)
    try:
        fu, h = get(mu)
        m = re.search(r'<meta name="description" content="([^"]*)"', h)
        rec['mw'] = {'url': mu, 'final': fu, 'desc': html.unescape(m.group(1)) if m else '', 'notfound': 'The word you\'ve entered isn\'t in the dictionary' in h}
    except Exception as e:
        rec['mw'] = {'url': mu, 'error': str(e)[:80]}
    out[w] = rec
    c = rec['cambridge']; m = rec['mw']
    print(f"{w:22} C:{','.join(c.get('headwords',[]))[:40]:40} {c.get('labels')} | MW:{'NOTFOUND' if m.get('notfound') else m.get('error','ok')}")
    time.sleep(0.6)
json.dump(out, open('evidence/dict.json', 'w'), ensure_ascii=False, indent=1)
