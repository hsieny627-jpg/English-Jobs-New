# 音節切法（2026/10/9 使用者決定：照 AI-Agent-Open-Code 的規則，學生的 me·cha·nic）：
#   兩個母音的聲音中間只有「一個子音的聲音」（ch、th、ck、ng、ll、mm、ff、ss、tt… 兩個字母一個聲音算一個）➜ 整組搬到後面；
#   有兩個以上子音的聲音 ➜ 照 Cambridge 美式音標的切點（「.」或重音記號）。
#   母音後面同一個 Cambridge 音節裡的 r（ar、er、or、ir、ur）算母音的一部分；不出聲的字母跟著前面。
# 資料：evidence/audit.json 的 ALIGN（字母 ➜ Cambridge 音標）。python3 _syl_rule.py 印出新舊切法；--write 寫回 story.html 的 SYL
import json, re, sys
V = set('aæɑʌəɚɜɝeɛɪioɔʊuɐ')
A = json.load(open('evidence/audit.json', encoding='utf8'))
story = open('story.html', encoding='utf8').read()
SYL = json.loads(re.search(r'const SYL=(\{.*?\});', story).group(1))
def split_word(p):
    ch = [c.split(':', 1) for c in p['align'].split(' ')]
    ipa = p['ipa']
    # 每一個字母群前面有沒有 Cambridge 的切點
    brk, i = set(), 0
    for k, (let, snd) in enumerate(ch):
        while i < len(ipa) and ipa[i] in 'ˈˌ.':
            if k: brk.add(k)
            i += 1
        i += len(snd)
    isv = [bool(snd) and any(c in V for c in snd) for let, snd in ch]
    # r 跟在母音後面、中間沒有切點 ➜ 母音的一部分
    for k in range(1, len(ch)):
        if ch[k][1] == 'r' and isv[k - 1] and k not in brk: isv[k] = True
    if p['word'] == 'DJ': return ['D', 'J']
    units = []   # 母音的聲音（連在一起的算一個）
    for k in range(len(ch)):
        if not isv[k]: continue
        if ch[k][1] == 'r' and units and units[-1][-1] == k - 1: units[-1].append(k)   # ar、er、or 的 r
        else: units.append([k])
    cuts = []
    for a, b in zip(units, units[1:]):
        cons = [k for k in range(a[-1] + 1, b[0]) if ch[k][1]]   # 中間出聲的子音
        if not cons: cut = b[0]
        elif len(cons) == 1: cut = cons[0]
        else:
            c = [k for k in range(cons[0], b[0] + 1) if k in brk]
            if not c: raise SystemExit('找不到 Cambridge 切點：' + p['word'])
            cut = c[0]
            while not ch[cut][1] and cut < b[0]: cut += 1   # 不出聲的字母跟著前面
        cuts.append(cut)
    out, cur = [], ''
    for k, (let, snd) in enumerate(ch):
        if k in cuts: out.append(cur); cur = ''
        cur += let
    return out + [cur]
NEW = {}
for L in A['letters']:
    w = L['word']
    if w not in SYL: continue
    parts = []
    for p in L['parts']:   # 一個 part 包了兩個字（esports player）➜ 照空白拆開
        ws, ipas = p['word'].split(' '), p['ipa'].split(' ')
        if len(ws) == 1: parts.append(p); continue
        ch, k = p['align'].split(' '), 0
        for x, ip in zip(ws, ipas):
            n, grp = 0, []
            while n < len(x): grp.append(ch[k]); n += len(ch[k].split(':', 1)[0]); k += 1
            parts.append({'word': x, 'ipa': ip, 'align': ' '.join(grp)})
    NEW[w] = ' '.join('-'.join(split_word(p)) for p in parts)
    assert NEW[w].replace('-', '') == w, w
    if len(re.split(r'[- ]', NEW[w])) != len(re.split(r'[- ]', SYL[w])): print('拍數不一樣', w, NEW[w])
if __name__ == '__main__':
    for w in SYL: print(('  ' if NEW[w] == SYL[w] else '★ ') + w.ljust(22), SYL[w].ljust(28), '➜', NEW[w])
    print(sum(NEW[w] != SYL[w] for w in SYL), '個字會改')
    if '--write' in sys.argv:
        story2 = story.replace(re.search(r'const SYL=(\{.*?\});', story).group(1), json.dumps({w: NEW[w] for w in SYL}, ensure_ascii=False))
        open('story.html', 'w', encoding='utf8').write(story2); print('已寫回 story.html')
