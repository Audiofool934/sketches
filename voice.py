"""Generate the narration in a cloned voice with local Qwen3-TTS, checked by Whisper.

Run it with a Python that has `mlx_audio` and `mlx_whisper`, for example
Timbreloom's bundled one:

    TB=~/Applications/Timbreloom.app/Contents/Resources/backend/.venv/bin/python
    PYTHONDONTWRITEBYTECODE=1 HF_HUB_OFFLINE=1 $TB voice.py --timbreloom-voice "Me EN"
    PYTHONDONTWRITEBYTECODE=1 HF_HUB_OFFLINE=1 $TB voice.py --ref me.wav --ref-text "..."

Every line is generated, transcribed and compared with the script; a take with
skipped, garbled or extra words (or a long stall) is regenerated.  Accepted takes
are trimmed, loudness-matched and listed in audio/voice/manifest.json with their
duration and word timestamps, which the scenes use to time their animations.
Unchanged lines are skipped on re-runs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import tempfile
import time
from pathlib import Path

import numpy as np
import soundfile as sf

from narration import LINES

HERE = Path(__file__).resolve().parent
TIMBRELOOM = Path.home() / "Library" / "Application Support" / "Timbreloom"
QWEN = TIMBRELOOM / "models" / "Qwen3-TTS-12Hz-0.6B-Base-bf16"
WHISPER = TIMBRELOOM / "models" / "Whisper-large-v3-turbo-q4"

# ---------------------------------------------------------------------------
# text normalisation for comparing the script with Whisper's transcript
# ---------------------------------------------------------------------------
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen " \
       "fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def number_words(n: int) -> str:
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000:
        rest = n % 100
        return ONES[n // 100] + " hundred" + ("" if rest == 0 else " " + number_words(rest))
    return str(n)


def normalise(s: str) -> list[str]:
    s = s.lower().replace("’", "'")
    s = re.sub(r"(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])", " ", s)          # x0 -> x 0
    s = re.sub(r"\d+", lambda m: " " + number_words(int(m.group())) + " ", s)
    s = re.sub(r"[^a-z' ]+", " ", s).replace("'", "")
    return [w for w in s.split() if w not in {"minus", "equals"}]      # Whisper writes these as symbols


def wer(ref: str, hyp: str) -> float:
    r, h = normalise(ref), normalise(hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(len(r), 1)


# ---------------------------------------------------------------------------
# audio clean-up
# ---------------------------------------------------------------------------
def envelope_db(a: np.ndarray, sr: int, win=0.02) -> np.ndarray:
    n = max(int(win * sr), 1)
    frames = a[: len(a) // n * n].reshape(-1, n)
    return 20 * np.log10(np.sqrt((frames ** 2).mean(1)) + 1e-9)


def polish(a: np.ndarray, sr: int) -> tuple[np.ndarray, float]:
    """Trim silence, match loudness; also return the longest internal pause."""
    env = envelope_db(a, sr)
    voiced = np.nonzero(env > -42)[0]
    if len(voiced) == 0:
        raise ValueError("silent take")
    hop = int(0.02 * sr)
    start = max(voiced[0] * hop - int(0.08 * sr), 0)
    end = min((voiced[-1] + 1) * hop + int(0.15 * sr), len(a))
    a = a[start:end].astype(np.float32)
    gaps = np.diff(voiced) * 0.02
    longest_pause = float(gaps.max()) if len(gaps) else 0.0
    fade = int(0.015 * sr)
    a[:fade] *= np.linspace(0, 1, fade)
    a[-fade:] *= np.linspace(1, 0, fade)
    env = envelope_db(a, sr)
    rms_voiced = 10 ** (np.mean(env[env > -40]) / 20)
    a *= 10 ** (-21 / 20) / rms_voiced                                  # voiced RMS -> -21 dBFS
    peak = np.abs(a).max()
    if peak > 0.89:
        a *= 0.89 / peak
    return a, longest_pause


def word_times(heard: dict) -> list:
    """[[word, start_seconds], ...] from a Whisper result with word timestamps."""
    return [[" ".join(normalise(w["word"])), round(float(w["start"]), 3)]
            for seg in heard.get("segments", []) for w in seg.get("words", [])]


# ---------------------------------------------------------------------------
def reference(args) -> tuple[Path, str]:
    if args.timbreloom_voice:
        for prof in sorted((TIMBRELOOM / "data" / "voices").glob("*/profile.json")):
            p = json.loads(prof.read_text())
            if p.get("name") == args.timbreloom_voice:
                return prof.parent / "reference.wav", p["reference_text"]
        raise SystemExit(f"No Timbreloom voice named {args.timbreloom_voice!r}")
    if not (args.ref and args.ref_text):
        raise SystemExit("Pass --timbreloom-voice NAME, or --ref FILE and --ref-text TEXT")
    return Path(args.ref), args.ref_text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--timbreloom-voice")
    ap.add_argument("--ref")
    ap.add_argument("--ref-text")
    ap.add_argument("--out", default=str(HERE / "audio" / "voice"))
    ap.add_argument("--only", help="comma-separated keys to (re)generate")
    ap.add_argument("--max-takes", type=int, default=4)
    ap.add_argument("--accept-wer", type=float, default=0.05)
    ap.add_argument("--temperature", type=float, default=0.8)
    ap.add_argument("--words-only", action="store_true",
                    help="only add word timestamps to clips that lack them")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    if args.words_only:
        import mlx_whisper
        pending = [k for k, v in manifest.items() if "words" not in v]
        for n, k in enumerate(pending, 1):
            v = manifest[k]
            v["words"] = word_times(mlx_whisper.transcribe(str(out / v["file"]), path_or_hf_repo=str(WHISPER),
                                                           language="en", word_timestamps=True))
            manifest_path.write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
            print(f"words {n}/{len(pending)} {k}", flush=True)
        print(f"word timestamps for {len(manifest)} clips")
        return

    ref_wav, ref_text = reference(args)
    ref_id = hashlib.sha256(ref_wav.read_bytes() + ref_text.encode()).hexdigest()[:12]

    keys = args.only.split(",") if args.only else list(LINES)
    todo = []
    for k in keys:
        sig = hashlib.sha256(f"{LINES[k]}|{ref_id}|{args.temperature}".encode()).hexdigest()[:16]
        if args.only or manifest.get(k, {}).get("sig") != sig or not (out / f"{k}.wav").exists():
            todo.append((k, sig))
    print(f"reference {ref_wav.name} ({ref_id}); {len(todo)} of {len(keys)} lines to generate", flush=True)
    if not todo:
        return

    import mlx.core as mx
    import mlx_whisper
    from mlx_audio.tts.utils import load_model

    model = load_model(str(QWEN))
    tmp = Path(tempfile.mkdtemp())
    try:
        for n, (k, sig) in enumerate(todo, 1):
            text = LINES[k]
            best = None
            for take in range(args.max_takes):
                mx.random.seed(1000 * take + n)
                t0 = time.time()
                res = list(model.generate(text=text, ref_audio=str(ref_wav), ref_text=ref_text,
                                          lang_code="auto", temperature=args.temperature,
                                          max_tokens=int(12.5 * 60), verbose=False, stream=False))
                sr = int(res[0].sample_rate)
                raw = np.concatenate([np.array(r.audio, dtype=np.float32) for r in res])
                try:
                    audio, pause = polish(raw, sr)
                except ValueError:
                    continue
                path = tmp / f"{k}_{take}.wav"
                sf.write(path, audio, sr)
                heard = mlx_whisper.transcribe(str(path), path_or_hf_repo=str(WHISPER),
                                               language="en", word_timestamps=True)
                hyp = heard["text"].strip()
                score = wer(text, hyp) + (0.5 if pause > 1.2 else 0.0)
                dur = len(audio) / sr
                print(f"[{n}/{len(todo)}] {k} take {take}: {dur:.1f}s, wer {wer(text, hyp):.2f}, "
                      f"pause {pause:.1f}s ({time.time() - t0:.0f}s)", flush=True)
                if best is None or score < best[0]:
                    best = (score, path, dur, hyp, word_times(heard))
                if score <= args.accept_wer:
                    break
            if best is None:
                raise SystemExit(f"could not generate {k}")
            if best[0] > args.accept_wer:
                print(f"  ! {k}: best take still differs from the script: {best[3]!r}", flush=True)
            shutil.copy(best[1], out / f"{k}.wav")
            manifest[k] = {"file": f"{k}.wav", "duration": round(best[2], 3), "sig": sig,
                           "wer": round(best[0], 3), "heard": best[3], "words": best[4]}
            manifest_path.write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    total = sum(v["duration"] for v in manifest.values())
    print(f"done: {len(manifest)} lines, {total / 60:.1f} min of narration", flush=True)


if __name__ == "__main__":
    main()
