# Render the Agent Atlas narration with Kokoro-82M (open source, runs locally) in a deep male voice.
# Setup: pip install kokoro-onnx soundfile; download kokoro-v1.0.onnx and voices-v1.0.bin
# (huggingface.co/fastrtc/kokoro-onnx) next to this script; needs ffmpeg.
# Usage: python tools/narration.py          (all stops)
#        python tools/narration.py 3 7      (only stops 3 and 7, keeps the other captions)
import json, re, subprocess, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'atlas', 'audio')
script = json.load(open(f'{OUT}/script.json'))
k = Kokoro(os.path.join(os.path.dirname(__file__), 'kokoro-v1.0.onnx'), os.path.join(os.path.dirname(__file__), 'voices-v1.0.bin'))
voice = 0.7 * k.get_voice_style('am_michael') + 0.3 * k.get_voice_style('am_fenrir')
SR = 24000
split = lambda t: [s.strip() for s in re.findall(r'[^.!?]+[.!?]+["\')]*|[^.!?]+$', t) if s.strip()]
only = set(int(a) for a in sys.argv[1:])
caps = json.load(open(f'{OUT}/captions.json')) if only else [None] * len(script)
for i, text in enumerate(script):
    if only and i not in only: continue
    parts, t, sents = [np.zeros(int(SR * 0.12), dtype=np.float32)], 0.12, []
    for s in split(text):
        a, sr = k.create(s, voice=voice, speed=1.0, lang='en-us')
        assert sr == SR
        a = a.astype(np.float32)
        # trim leading/trailing near-silence the model adds, keep it tight
        nz = np.where(np.abs(a) > 0.01)[0]
        if len(nz): a = a[max(0, nz[0] - 240): min(len(a), nz[-1] + 480)]
        sents.append([round(t, 2), round(t + len(a) / SR, 2), s])
        parts.append(a); t += len(a) / SR
        gap = 0.34 if not s.endswith('?') else 0.42
        parts.append(np.zeros(int(SR * gap), dtype=np.float32)); t += gap
    y = np.concatenate(parts)
    rms = np.sqrt(np.mean(y[np.abs(y) > 0.01] ** 2))
    y = y * (10 ** (-19 / 20) / max(rms, 1e-6))
    peak = np.max(np.abs(y))
    if peak > 0.89: y = y * (0.89 / peak)
    TMP = os.path.join(OUT, '_tmp.wav'); sf.write(TMP, y, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', TMP, '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '48k', f'{OUT}/stop-{i:02d}.mp3'], check=True)
    caps[i] = {'d': round(len(y) / SR, 2), 's': sents}
    print(i, round(len(y) / SR, 1), 's', flush=True)
json.dump(caps, open(f'{OUT}/captions.json', 'w'), separators=(',', ':'))
os.remove(TMP); print('done')
