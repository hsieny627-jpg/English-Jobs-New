# 美國英語 en-US／英國英語 en-GB 分開查（2018～2022 平均，單複數合計，大小寫不分）：python3 _ngram_us_gb.py ➜ evidence/ngram_us_gb.json
import json, time, urllib.request, urllib.parse
SETS = [['professional athlete','pro athlete'],['hairstylist','hairdresser','hair stylist'],['counselor','counsellor'],
 ['real estate agent','realtor','estate agent'],['flight attendant','stewardess'],['police officer','policeman'],
 ['firefighter','fireman'],['computer engineer','software engineer'],['esports player','professional gamer','pro gamer'],
 ['lawyer','attorney'],['programmer','coder','software developer'],['game tester','video game tester'],['fortune teller','fortuneteller']]
PL={'policeman':'policemen','fireman':'firemen','stewardess':'stewardesses'}
out={}
for corpus in ['en-US','en-GB']:
    out[corpus]=[]
    for s in SETS:
        content=','.join(f'({t} + {PL.get(t,t+"s")})' for t in s)
        q=urllib.parse.urlencode({'content':content,'year_start':2018,'year_end':2022,'corpus':corpus,'smoothing':0,'case_insensitive':'true'})
        d=json.load(urllib.request.urlopen(urllib.request.Request('https://books.google.com/ngrams/json?'+q,headers={'User-Agent':'Mozilla/5.0'})))
        vals={x['ngram']:sum(x['timeseries'])/len(x['timeseries'])*1e9 for x in d}
        out[corpus].append({'set':s,'raw':vals,'url':'https://books.google.com/ngrams/graph?'+q.replace('case_insensitive=true','case_insensitive=on')})
        print(corpus,s[0],{k.split(' + ')[0].strip('('):round(v,1) for k,v in vals.items()})
        time.sleep(1.2)
json.dump(out,open('evidence/ngram_us_gb.json','w'),ensure_ascii=False,indent=1)
