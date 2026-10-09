# 語音辨識（Whisper small.en，sherpa-onnx 離線）：做好的錄音當場聽一次（抄自 AI-Agent-Open-Code/tools/asr_lib.py）
import os, re, numpy as np
M = os.path.join(os.environ.get('TTS_MODELS', ''), 'sherpa-onnx-whisper-small.en')
_R = None
def ok(): return os.path.exists(os.path.join(M, 'small.en-encoder.int8.onnx'))
def hear(a, sr):
    global _R
    import sherpa_onnx
    if _R is None:
        _R = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=M + '/small.en-encoder.int8.onnx', decoder=M + '/small.en-decoder.int8.onnx',
                                                        tokens=M + '/small.en-tokens.txt', num_threads=4)
    pad = np.zeros(int(sr * .6), dtype=np.float32)
    st = _R.create_stream(); st.accept_waveform(sr, np.concatenate([pad, a, pad])); _R.decode_stream(st)
    return st.result.text.strip()
# 同音字（辨識寫成另一種拼法，聲音一樣）
SAME = {'councillor': 'counselor', 'councilor': 'counselor', 'e sports': 'esports', 'hair stylist': 'hairstylist', 'd j': 'dj'}
def norm(s):
    s = re.sub(r"[^a-z ]+", ' ', s.lower().replace('-', ' '))
    s = ' '.join(s.split())
    s = re.sub(r'^(the|a|an) ', '', s)
    for k, v in SAME.items(): s = re.sub(r'\b' + k + r'\b', v, s)
    return s.replace(' ', '')
def same(h, w): return norm(h) == norm(w)
