# 音節動畫「一節一節唸」的聲音：照 Cambridge 美式音標（evidence/audit.json 的 ALIGN：字母 ➜ 音標）切成 story.html 的 SYL 音節，
# 每一節照音標直接唸（不是看字母猜），最後整個字再唸一次。方法照參考網站 AI-Agent-Open-Code/tools/syl_ph.js、tts_gen.py：
#   離線神經語音 Kokoro v1.0（美式女聲 af_bella），音標直接送進模型；一節單獨唸一律當重音唸，所以 /ə/ ➜ /ʌ/、/ɚ/ ➜ /ɜɹ/。
#   兩個音節中間的字母（gram|mer 的 mm、pro|fes|sion 的 ss）兩邊都唸到。
# 用法：TTS_MODELS=<放 kokoro-multi-lang-v1_0 的資料夾> python3 _syl_audio.py
#   需要：pip install sherpa-onnx lameenc onnxruntime numpy；模型 https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models
# 輸出 audio/syl/*.mp3 ＋ audio/syl/aud.js（鑰匙「syl 單字 第幾節」「word 單字」➜ [檔名, 秒數]）。已經做過的不重做，不再用到的會刪掉。
import json, os, re, hashlib, sys

DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(DIR, 'audio', 'syl')
SID, SPD, MODEL = 2, 0.85, 'k1|af_bella|0.85'
# Cambridge 音標 ➜ Kokoro 音標（照 syl_ph.js 的 MAP；長的先比）
MAP = {'aɪ': 'I', 'aʊ': 'W', 'eɪ': 'A', 'oʊ': 'O', 'ɔɪ': 'Y', 'e': 'ɛ', 'iː': 'i', 'uː': 'u', 'dʒ': 'ʤ', 'tʃ': 'ʧ', 'r': 'ɹ',
       'ɑː': 'ɑ', 'ɔː': 'ɔ', 'ɝː': 'ɜ ɹ', 'ɝ': 'ɜ ɹ', 'ɚ': 'ɜ ɹ', 'ə': 'ʌ', 't̬': 't', 'ɡ': 'ɡ'}
VOW = re.compile(r'[aæɑʌəɚɜɝeɛɪioɔʊuAIOWY]')

def kokoro(ipa):
    out, i, st = [], 0, False
    keys = sorted(MAP, key=len, reverse=True)
    while i < len(ipa):
        c = ipa[i]
        if c in 'ˈˌ.ː ': i += 1; continue
        k = next((k for k in keys if ipa.startswith(k, i)), None)
        ph = (MAP[k] if k else c).split(' '); i += len(k) if k else 1
        for p in ph:
            if not st and VOW.search(p): out.append('ˈ'); st = True
            out.append(p)
    return ' '.join(out)

def plan():
    story = open(os.path.join(DIR, 'story.html'), encoding='utf8').read()
    SYL = json.loads(re.search(r'const SYL=(\{.*?\});', story).group(1))
    AUD = json.load(open(os.path.join(DIR, 'evidence', 'audit.json'), encoding='utf8'))
    items, show = [], {}
    for L in AUD['letters']:
        w = L['word']
        if w not in SYL: continue
        sw = SYL[w].split(' ')
        if len(L['parts']) != len(sw): raise SystemExit('字數對不上：' + w)
        k, segs = 0, []
        for p, s in zip(L['parts'], sw):
            ch = [c.split(':', 1) for c in p['align'].split(' ')]
            pos, spans = 0, []
            for let, snd in ch: spans.append((pos, pos + len(let), snd)); pos += len(let)
            a = 0
            for piece in s.split('-'):
                b = a + len(piece)
                ipa = ''.join(snd for x, y, snd in spans if x < b and y > a)
                segs.append((piece, ipa)); a = b
        show[w] = segs
        if len(segs) > 1:
            for n, (piece, ipa) in enumerate(segs): items.append(('syl %s %d' % (w.lower(), n), kokoro(ipa))); piece_of['syl %s %d' % (w.lower(), n)] = piece
        items.append(('word ' + w.lower(), '§' + w))   # 整個字
        ipa_of['word ' + w.lower()] = [p['ipa'] for p in L['parts']]
    return items, show

ipa_of, piece_of = {}, {}
def full(ipas):
    # 整個字照 Cambridge 音標（含重音位置）：重音記號搬到那一節的母音前面
    out = []
    for ipa in ipas:
        if out: out.append(' ')
        mark = ''
        for seg in re.split(r'([ˈˌ.])', ipa):
            if seg in ('ˈ', 'ˌ'): mark = seg; continue
            if seg == '.' or not seg: continue
            for p in kokoro(seg).replace('ˈ ', '').split(' '):
                if mark and VOW.search(p): out.append(mark); mark = ''
                out.append(p)
    return ' '.join(out)

def say_word(T, w, ipas):
    # 整個字：先讓模型照字唸；做好當場用語音辨識（Whisper small.en，和參考網站一樣）聽一次，聽錯就換語速重做，
    # 都聽錯就改用字典音標直接唸。辨識模型在 TTS_MODELS/sherpa-onnx-whisper-small.en（沒有就不聽）
    import numpy as np
    try:
        sys.path.insert(0, os.path.join(DIR, '_tts')); import asr
    except Exception: asr = None
    tries = [('w', s) for s in (SPD, 0.9, 0.8, 1.0)] + [('p', s) for s in (SPD, 0.9, 0.8)]
    first = None
    for kind, sp in tries:
        a = T.word(w, SID, sp) if kind == 'w' else T.phon(full(ipas), SID, sp)
        if first is None: first = a
        if asr is None or not asr.ok(): return a
        h = asr.hear(np.array(a, dtype=np.float32).ravel(), 24000)
        if asr.same(h, w): return a
        print('  聽成', repr(h), '重做', w, kind, sp)
    print('⚠️ 一直聽不對：', w); FAIL.append(w); return first
FAIL = []
LEX = None
def say_syl(T, ph, piece):
    # 一節：照音標唸。這一節剛好是一個英文字（teach、tell、paint）➜ 當場聽一次，聽錯就換語速，再不行就讓模型照這個字唸（聲音一樣）
    global LEX
    import numpy as np
    import asr
    if LEX is None:
        LEX = {}
        lx = os.path.join(T.D, 'lexicon-us-en.txt')
        if os.path.exists(lx): LEX = {l.split(' ', 1)[0]: l.split(' ', 1)[1].strip() for l in open(lx, encoding='utf8') if ' ' in l}
    first = T.phon(ph, SID, SPD)
    if not asr.ok() or piece.lower() not in LEX or len(piece) < 3: return first
    same_sound = LEX[piece.lower()].replace('ˈ ', '').replace('ˌ ', '') == ph.replace('ˈ ', '')   # 字典唸法和這一節的音標一樣才可以照字唸
    for kind, sp in [('p', SPD), ('p', 0.9), ('p', 1.0)] + ([('w', SPD), ('w', 0.9)] if same_sound else []):
        a = first if (kind, sp) == ('p', SPD) else (T.phon(ph, SID, sp) if kind == 'p' else T.word(piece.lower(), SID, sp))
        if kind == 'w': print('  照字唸試試', piece)
        if asr.same(asr.hear(np.array(a, dtype=np.float32).ravel(), 24000), piece): return a
    print('  （這一節辨識聽不出來，照音標唸）', piece, '可照字唸' if same_sound else ''); return first

def main():
    items, show = plan()
    for w, segs in show.items(): print(w.ljust(22), ' | '.join('%s /%s/' % s for s in segs))
    if '--dry' in sys.argv: return
    sys.path.insert(0, os.path.join(DIR, '_tts'))
    import tts_kokoro as T
    os.makedirs(OUT, exist_ok=True)
    man_p = os.path.join(OUT, 'aud.js')
    old = {}
    if os.path.exists(man_p): old = json.loads(re.search(r'=\s*(\{.*\});', open(man_p, encoding='utf8').read(), re.S).group(1))
    man = {}
    for key, ph in items:
        fn = hashlib.sha1((MODEL + '|' + key + '|' + ph).encode()).hexdigest()[:12] + '.mp3'
        if key in old and old[key][0] == fn and os.path.exists(os.path.join(OUT, fn)): man[key] = old[key]; continue
        smp = say_word(T, ph[1:], ipa_of[key]) if ph.startswith('§') else say_syl(T, ph, piece_of[key])
        man[key] = [fn, T.mp3(smp, os.path.join(OUT, fn))]
        print('做好', key, man[key])
    keep = {v[0] for v in man.values()}
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f not in keep: os.remove(os.path.join(OUT, f))
    open(man_p, 'w', encoding='utf8').write('/* 由 _syl_audio.py 產生，不要手改。鑰匙 ➜ [檔名, 秒數] */\nwindow.SYLAUD=' + json.dumps(man, ensure_ascii=False, sort_keys=True) + ';\n')
    print('音節聲音', len(man), '個；整個字聽不對', len(FAIL), '個', FAIL)

if __name__ == '__main__': main()
