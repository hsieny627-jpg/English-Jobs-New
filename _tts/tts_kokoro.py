# Kokoro v1.0 離線語音（抄自 AI-Agent-Open-Code/tools/tts_gen.py 的 mk_ko、raw_ph、mp3；那邊改了這裡也要看一下）
# 模型不放進 repo：環境變數 TTS_MODELS 指到放 kokoro-multi-lang-v1_0/ 的資料夾
import os, numpy as np, lameenc
T = os.environ.get('TTS_MODELS') or ''
D = os.path.join(T, 'kokoro-multi-lang-v1_0') + '/'
TTS = RAW = None

def word(text, sid, spd=1.0):
    global TTS
    if TTS is None:
        import sherpa_onnx
        k = sherpa_onnx.OfflineTtsKokoroModelConfig(model=D + 'model.onnx', voices=D + 'voices.bin', tokens=D + 'tokens.txt',
                                                    data_dir=D + 'espeak-ng-data', lexicon=D + 'lexicon-us-en.txt', lang='en-us')
        TTS = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=k, num_threads=4)))
    return TTS.generate(text, sid=sid, speed=spd).samples

def phon(ph, sid, spd=1.0):
    # 跳過文字轉音標，直接把音標送進 Kokoro 模型
    global RAW
    import onnxruntime as ort
    if RAW is None:
        tok = {}
        for l in open(D + 'tokens.txt', encoding='utf8'):
            l = l.rstrip('\n')
            if not l: continue
            p = l.rsplit(' ', 1); tok[p[0] if p[0] else ' '] = int(p[1])
        V = np.fromfile(D + 'voices.bin', dtype=np.float32).reshape(-1, 510, 256)
        RAW = (tok, V, ort.InferenceSession(D + 'model.onnx'))
    tok, V, S = RAW
    ids = [tok[c] for c in ph.split()]
    return S.run(None, {'tokens': np.array([[0] + ids + [0]], dtype=np.int64), 'style': V[sid][len(ids)][None, :],
                        'speed': np.array([spd], dtype=np.float32)})[0]

def mp3(samples, path, sr=24000):
    a = np.clip(np.array(samples, dtype=np.float32).ravel(), -1, 1)
    pk = float(np.max(np.abs(a))) if len(a) else 0; thr = max(0.002, pk * 0.015); idx = np.where(np.abs(a) > thr)[0]
    if len(idx): a = a[max(0, idx[0] - int(.12 * sr)):min(len(a), idx[-1] + int(.15 * sr))]
    e = lameenc.Encoder(); e.set_bit_rate(48); e.set_in_sample_rate(sr); e.set_channels(1); e.set_quality(2)
    open(path, 'wb').write(e.encode((a * 32767).astype(np.int16).tobytes()) + e.flush())
    return round(len(a) / sr, 3)
