# 美國勞工部 O*NET 官方職業名稱＋「實際使用的職稱」：python3 _onet_check.py ➜ evidence/onet.json
import json, re, html, time, urllib.request
MAP = {'doctor':'29-1215.00','professional athlete':'27-2021.00','programmer':'15-1251.00','teacher':'25-2021.00','business manager':'11-1021.00',
 'lawyer':'23-1011.00','baker':'51-3011.00','psychologist':'19-3033.00','nurse':'29-1141.00','painter':'27-1013.00','police officer':'33-3051.00',
 'designer':'27-1024.00','singer':'27-2042.00','veterinarian':'29-1131.00','mechanic':'49-3023.00','computer engineer':'17-2061.00',
 'hairstylist':'39-5012.00','architect':'17-1011.00','game tester':'15-1253.00','counselor':'21-1014.00','entertainer':'27-2099.00',
 'tour guide':'39-7011.00','actor':'27-2011.00','pilot':'53-2011.00','firefighter':'33-2011.00','flight attendant':'53-2031.00',
 'real estate agent':'41-9022.00','DJ':'27-2091.00','mechanical engineer':'17-2141.00','chef':'35-1011.00'}
out = {}
for w, code in MAP.items():
    u = 'https://www.onetonline.org/link/summary/' + code
    h = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read().decode('utf8', 'ignore')
    h = re.sub(r'<(script|style).*?</\1>', '', h, flags=re.S)
    t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h)))
    title = re.search(code.replace('.', r'\.') + r' - ([^<]+?)\s*(?:<|Bright|$)', t)
    title = title.group(1).strip() if title else ''
    m = re.search(r'Sample of reported job titles:(.*?)(?:Tasks|Occupation-Specific|$)', t)
    titles = m.group(1).strip()[:900] if m else ''
    hit = w.lower() in (title + ' ' + titles).lower()
    out[w] = {'code': code, 'url': u, 'title': title, 'reported': titles, 'word_in_titles': hit}
    print(f"{'✅' if hit else '⚠️'} {w:20} {code} {title[:60]} | {titles[:150]}")
    time.sleep(0.5)
json.dump(out, open('evidence/onet.json', 'w'), ensure_ascii=False, indent=1)
