"""Narration with a Gemini 3.8 Flash TTS replica of the recorded voice.

    python gemini_voice.py --init          # build the voice, then one sample line
    python gemini_voice.py                 # generate every line
    python gemini_voice.py --only s03_g    # regenerate selected lines

The voice key stays in audio/ref/gemini_voice.json. Spoken text is only the
script. Delivery instructions go in speech metadata, so they are not read aloud.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
import shutil
import tempfile
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

import numpy as np
import soundfile as sf

from narration import LINES
from voice import WHISPER, polish, wer, word_times

HERE = Path(__file__).resolve().parent
REF = HERE / "audio" / "ref"
VOICE_FILE = REF / "gemini_voice.json"
MODEL = "gemini-3.8-flash-tts"
STYLE = (
    "General American English. Spoken and oral, like a person thinking out loud "
    "while teaching a friend. Warm, expressive, varied melody, easy pace. "
    "Not flat, not a news anchor, not theatrical."
)


def _key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise SystemExit("GEMINI_API_KEY is not set")
    return key


def _post(url: str, payload: dict, timeout: int = 180) -> dict:
    data = json.dumps(payload).encode()
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "x-goog-api-key": _key()},
        method="POST",
    )
    delay = 2.0
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode())
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            if exc.code in {429, 500, 503} and attempt < 5:
                time.sleep(delay)
                delay = min(delay * 2, 30)
                continue
            raise SystemExit(f"Gemini HTTP {exc.code}: {body[:800]}") from exc
        except urllib.error.URLError as exc:
            if attempt < 5:
                time.sleep(delay)
                delay = min(delay * 2, 30)
                continue
            raise SystemExit(f"Gemini request failed: {exc}") from exc
    raise SystemExit("Gemini request failed")


def trim_wav(src: Path, dest: Path, threshold: float = 0.01) -> float:
    audio, sr = sf.read(src)
    audio = np.asarray(audio, np.float32)
    if audio.ndim == 2:
        audio = audio.mean(axis=1)
    win = max(int(0.02 * sr), 1)
    env = np.sqrt(np.convolve(audio ** 2, np.ones(win) / win, mode="same"))
    voiced = np.nonzero(env > threshold)[0]
    if len(voiced) == 0:
        raise SystemExit(f"{src.name} is silent")
    start = max(int(voiced[0] - 0.12 * sr), 0)
    end = min(int(voiced[-1] + 0.18 * sr), len(audio))
    clip = audio[start:end]
    fade = int(0.01 * sr)
    clip[:fade] *= np.linspace(0, 1, fade)
    clip[-fade:] *= np.linspace(1, 0, fade)
    dest.parent.mkdir(parents=True, exist_ok=True)
    sf.write(dest, clip, sr)
    return len(clip) / sr


def _b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode()


def create_voice(source: Path, consent: Path) -> str:
    created = _post(
        "https://generativelanguage.googleapis.com/v1beta/voices",
        {
            "store": False,
            "voice": {
                "model": MODEL,
                "type": "replicated",
                "display_name": "Flow matching narration",
                "replicated": {
                    "source_audio": {"mime_type": "audio/wav", "data": _b64(source)},
                    "consent_audio": {"mime_type": "audio/wav", "data": _b64(consent)},
                },
            },
        },
        timeout=240,
    )
    voice = created.get("key") or created.get("id") or ""
    nested = created.get("voice") if isinstance(created.get("voice"), dict) else {}
    voice = voice or nested.get("key") or nested.get("id") or ""
    if not voice:
        names = sorted(created.keys())
        raise SystemExit(f"Gemini returned no voice id. Fields: {names}")
    VOICE_FILE.write_text(json.dumps({"voice": voice, "model": MODEL}, indent=1))
    VOICE_FILE.chmod(0o600)
    return voice


def load_voice() -> str:
    if not VOICE_FILE.exists():
        raise SystemExit("No Gemini voice yet. Run with --init first.")
    return json.loads(VOICE_FILE.read_text())["voice"]


def _wav_from_part(part: dict) -> tuple[np.ndarray, int]:
    blob = part.get("inlineData") or part.get("inline_data") or {}
    raw = blob.get("data")
    if raw is None:
        raise ValueError("no audio in response")
    if isinstance(raw, str):
        data = base64.b64decode(raw)
    else:
        data = raw
    if data[:4] == b"RIFF":
        with wave.open(io.BytesIO(data)) as handle:
            sr = handle.getframerate()
            channels = handle.getnchannels()
            frames = np.frombuffer(handle.readframes(handle.getnframes()), np.int16)
        if channels > 1:
            frames = frames.reshape(-1, channels).mean(axis=1)
        return frames.astype(np.float32) / 32768.0, sr
    # Raw 24 kHz mono PCM, which some responses return without a header.
    frames = np.frombuffer(data, np.int16).astype(np.float32) / 32768.0
    return frames, 24000


def synthesize(voice: str, text: str, style: str | None = STYLE) -> tuple[np.ndarray, int]:
    part: dict = {"text": text}
    if style:
        part["speech_metadata"] = {"style": style}
    response = _post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        {
            "contents": [{
                "role": "user",
                "parts": [part],
            }],
            "generation_config": {
                "response_modalities": ["AUDIO"],
                "speech_config": {"voice_config": {"voice": voice}},
            },
        },
    )
    parts = response["candidates"][0]["content"]["parts"]
    for part in parts:
        if "inlineData" in part or "inline_data" in part:
            return _wav_from_part(part)
    raise SystemExit("Gemini returned no audio part")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--init", action="store_true")
    parser.add_argument("--only")
    parser.add_argument("--max-takes", type=int, default=2)
    parser.add_argument("--accept-wer", type=float, default=0.08)
    parser.add_argument("--out", default=str(HERE / "audio" / "voice"))
    args = parser.parse_args()

    if args.init or not VOICE_FILE.exists():
        source = REF / "source.wav"
        consent = REF / "consent.wav"
        source_s = trim_wav(REF / "take1.wav", source)
        consent_s = trim_wav(REF / "take2.wav", consent)
        print(f"trimmed source {source_s:.1f}s, consent {consent_s:.1f}s", flush=True)
        if not 8 <= source_s <= 30:
            raise SystemExit(f"source clip is {source_s:.1f}s; Gemini wants 10 to 30 seconds")
        voice = create_voice(source, consent)
        print(f"voice ready ({voice[:12]}...)", flush=True)
        if args.init and not args.only:
            args.only = "s01_a"
    else:
        voice = load_voice()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    voice_id = hashlib.sha256(voice.encode()).hexdigest()[:12]
    keys = args.only.split(",") if args.only else list(LINES)
    todo = []
    for key in keys:
        signature = hashlib.sha256(f"{LINES[key]}|{voice_id}|{STYLE}".encode()).hexdigest()[:16]
        if args.only or manifest.get(key, {}).get("sig") != signature or not (out / f"{key}.wav").exists():
            todo.append((key, signature))
    print(f"{len(todo)} of {len(keys)} lines to generate", flush=True)
    if not todo:
        return

    import mlx_whisper

    tmp = Path(tempfile.mkdtemp())
    try:
        for number, (key, signature) in enumerate(todo, 1):
            text = LINES[key]
            best = None
            for take in range(args.max_takes):
                started = time.time()
                raw, sr = synthesize(voice, text)
                try:
                    audio, pause = polish(raw, sr)
                except ValueError:
                    print(f"[{number}/{len(todo)}] {key} take {take}: silent", flush=True)
                    continue
                path = tmp / f"{key}_{take}.wav"
                sf.write(path, audio, sr)
                heard = mlx_whisper.transcribe(
                    str(path), path_or_hf_repo=str(WHISPER), language="en", word_timestamps=True,
                )
                hyp = heard["text"].strip()
                score = wer(text, hyp) + (0.5 if pause > 1.2 else 0.0)
                print(
                    f"[{number}/{len(todo)}] {key} take {take}: {len(audio) / sr:.1f}s, "
                    f"wer {wer(text, hyp):.2f}, pause {pause:.1f}s ({time.time() - started:.0f}s)",
                    flush=True,
                )
                if best is None or score < best[0]:
                    best = (score, path, len(audio) / sr, hyp, word_times(heard))
                if score <= args.accept_wer:
                    break
            if best is None:
                raise SystemExit(f"could not generate {key}")
            if best[0] > args.accept_wer:
                print(f"  ! {key}: best take still differs: {best[3]!r}", flush=True)
            shutil.copy(best[1], out / f"{key}.wav")
            manifest[key] = {
                "file": f"{key}.wav",
                "duration": round(best[2], 3),
                "sig": signature,
                "wer": round(best[0], 3),
                "heard": best[3],
                "words": best[4],
            }
            manifest_path.write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    total = sum(item["duration"] for item in manifest.values())
    print(f"done: {len(manifest)} lines, {total / 60:.1f} min", flush=True)


if __name__ == "__main__":
    main()
