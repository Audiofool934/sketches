"""Render every scene in parallel, stitch them, and mix narration with the score.

    python render.py              # 1080p60
    python render.py -q l         # quick 480p15 preview
    python render.py S05_Average  # re-render one scene, then re-stitch

Each scene writes timeline.json (when each narration line starts). After the
picture is stitched, those times place the clips from audio/voice under a
score from music.py. Music sits quietly in the pauses and ducks while a line
is spoken.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from math import gcd
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d
from scipy.signal import resample_poly

HERE = Path(__file__).resolve().parent
SCENES = ["S01_Title", "S02_Goal", "S03_Flow", "S04_Lines", "S05_Average", "S06_OneD",
          "S07_Train", "S08_Sample", "S09_Recap"]
FOLDER = {"l": "480p15", "m": "720p30", "h": "1080p60", "p": "1440p60", "k": "2160p60"}
SR = 48000


def scene_mp4(media: Path, scene: str, quality: str) -> Path:
    return media / scene / "videos" / "flow_matching" / FOLDER[quality] / f"{scene}.mp4"


def probe_duration(path: Path) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        text=True)
    return float(out.strip())


def _float_audio(data: np.ndarray) -> np.ndarray:
    audio = np.asarray(data)
    if np.issubdtype(audio.dtype, np.integer):
        audio = audio.astype(np.float32) / np.iinfo(audio.dtype).max
    else:
        audio = audio.astype(np.float32)
    return audio


def read_wav(path: Path) -> tuple[int, np.ndarray]:
    sr, data = wavfile.read(path)
    audio = _float_audio(data)
    if audio.ndim == 2:
        audio = audio.mean(axis=1)
    return int(sr), np.ascontiguousarray(audio)


def read_stereo(path: Path) -> tuple[int, np.ndarray]:
    sr, data = wavfile.read(path)
    audio = _float_audio(data)
    if audio.ndim == 1:
        audio = np.stack([audio, audio], axis=1)
    return int(sr), audio


def to_sr(audio: np.ndarray, sr: int) -> np.ndarray:
    if sr == SR or len(audio) == 0:
        return audio.astype(np.float32)
    g = gcd(sr, SR)
    return resample_poly(audio, SR // g, sr // g).astype(np.float32)


def mix_audio(media: Path, order: list[str], files: list[Path], silent: Path, out: Path) -> None:
    """Place each narration clip on the stitched picture and duck the score under it."""
    offset = 0.0
    placements: list[tuple[Path, float]] = []
    for scene, mp4 in zip(order, files):
        timeline_path = media / scene / "timeline.json"
        if not timeline_path.exists():
            raise SystemExit(f"no timeline for {scene} ({timeline_path}); re-render it before mixing")
        timeline = json.loads(timeline_path.read_text())
        voice_dir = Path(timeline["voice_dir"])
        pictured = probe_duration(mp4)
        if abs(pictured - float(timeline["duration"])) > 0.15:
            print(f"note: {scene} picture is {pictured:.2f}s, timeline {timeline['duration']:.2f}s")
        for line in timeline["lines"]:
            wav = voice_dir / f"{line['key']}.wav"
            if not wav.exists():
                wav = HERE / "audio" / "voice" / f"{line['key']}.wav"
            if not wav.exists():
                raise SystemExit(f"missing narration clip {line['key']}")
            placements.append((wav, offset + float(line["start"])))
        offset += pictured

    total = offset
    n = int(total * SR)
    voice = np.zeros(n, np.float32)
    for wav, start in placements:
        sr, audio = read_wav(wav)
        audio = to_sr(audio, sr)
        i = int(start * SR)
        j = min(n, i + len(audio))
        if i < n and j > i:
            voice[i:j] += audio[: j - i]

    music_path = media / "music.wav"
    subprocess.run(
        [sys.executable, str(HERE / "music.py"), "--seconds", f"{total:.3f}", "--out", str(music_path)],
        cwd=HERE, check=True)
    sr_m, music_st = read_stereo(music_path)
    if sr_m != SR:
        music_st = np.stack([to_sr(music_st[:, c], sr_m) for c in range(2)], axis=1)
    if len(music_st) < n:
        music_st = np.pad(music_st, ((0, n - len(music_st)), (0, 0)))
    music_st = music_st[:n]

    # Voice clips are already near -21 dBFS. The score is peak-normalised, so it
    # needs a deep cut, and a further cut while someone is speaking.
    hop = SR // 50
    frames = np.pad(voice, (0, (-len(voice)) % hop)).reshape(-1, hop)
    rms = np.sqrt((frames ** 2).mean(axis=1))
    gate = np.clip(rms / 0.02, 0, 1)
    gate = uniform_filter1d(gate, size=7, mode="nearest")
    env = np.repeat(gate, hop)[:n]
    bed = (0.045 * (1 - 0.72 * env))[:, None]
    mix = music_st * bed
    mix += voice[:, None] * 0.9
    peak = np.abs(mix).max()
    if peak > 0.98:
        mix *= 0.98 / peak
    pcm = np.clip(mix, -1, 1)
    pcm = (pcm * 32767).astype(np.int16)
    mix_path = media / "mix.wav"
    wavfile.write(mix_path, SR, pcm)

    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(silent), "-i", str(mix_path),
         "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-movflags", "+faststart", str(out)],
        check=True)
    print(f"mixed {len(placements)} lines over {total:.1f}s")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scenes", nargs="*", default=SCENES)
    ap.add_argument("-q", "--quality", default="h", choices=list(FOLDER))
    ap.add_argument("-j", "--jobs", type=int, default=5)
    ap.add_argument("--media", default=str(HERE / "build"))
    ap.add_argument("--out", default=str(HERE / "flow_matching.mp4"))
    args = ap.parse_args()

    if not (HERE / "data" / "spiral_flow.npz").exists():
        subprocess.run([sys.executable, "precompute.py"], cwd=HERE, check=True)
    media = Path(args.media)
    media.mkdir(parents=True, exist_ok=True)

    def render(scene):
        # one media dir per scene so parallel LaTeX caches never collide
        log = media / f"{scene}.log"
        with open(log, "w") as fh:
            rc = subprocess.run(
                [sys.executable, "-m", "manim", f"-q{args.quality}", "--media_dir",
                 str(media / scene), "flow_matching.py", scene],
                cwd=HERE, stdout=fh, stderr=subprocess.STDOUT).returncode
        print(f"{'done' if rc == 0 else 'FAILED'} {scene}", flush=True)
        return scene, rc, log

    with ThreadPoolExecutor(args.jobs) as ex:
        results = list(ex.map(render, args.scenes))
    failed = [(s, log) for s, rc, log in results if rc != 0]
    for s, log in failed:
        print(f"see {log}")
    if failed:
        sys.exit(1)

    full = [scene_mp4(media, s, args.quality) for s in SCENES]
    if all(path.exists() for path in full):
        order, files = SCENES, full
    else:
        order = list(args.scenes)
        files = [scene_mp4(media, s, args.quality) for s in order]
        missing = [path for path in files if not path.exists()]
        if missing:
            print("not stitching, missing:", *missing, sep="\n  ")
            return
        print("stitching the scenes just rendered; the other scenes are not in this media dir yet")

    silent_fd, silent_name = tempfile.mkstemp(suffix=".mp4")
    os.close(silent_fd)
    silent = Path(silent_name)
    list_path = None
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as fh:
            fh.writelines(f"file '{f}'\n" for f in files)
            list_path = Path(fh.name)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(list_path),
                        "-c", "copy", str(silent)], check=True)
        mix_audio(media, order, files, silent, Path(args.out))
    finally:
        silent.unlink(missing_ok=True)
        if list_path is not None:
            list_path.unlink(missing_ok=True)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
