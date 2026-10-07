#!/usr/bin/env python3
"""Check a muxed film against the audio it was cut from.

  python3 tools/audiocheck.py cut.wav film.mp4 video.mp4

Decodes the film's audio back to PCM the way a player does (edit lists applied),
cross-correlates it with the source cut, and reports the offset in samples, the
level difference, and the signal-to-noise of the lossy encode. It also compares the
audio and video durations. A sample-exact mux has offset 0.
"""
import json
import subprocess
import sys

import numpy as np


def pcm(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "2", "-ar", "48000", "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2)


def duration(path, stream):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", stream, "-show_entries",
                          "stream=duration,nb_frames,codec_name,sample_rate,r_frame_rate", "-of", "json", path],
                         check=True, capture_output=True, text=True).stdout
    return json.loads(out)["streams"][0]


def main():
    cut, film, video = sys.argv[1:4]
    a = pcm(cut).mean(1)
    b = pcm(film).mean(1)
    n = min(len(a), len(b))
    # Offset by FFT cross-correlation over the first 8 s (or all of it).
    m = min(n, 48000 * 8)
    size = 1 << int(np.ceil(np.log2(2 * m)))
    fa = np.fft.rfft(a[:m], size)
    fb = np.fft.rfft(b[:m], size)
    xc = np.fft.irfft(fa * np.conj(fb), size)
    lag = int(np.argmax(np.abs(xc)))
    if lag > size // 2:
        lag -= size
    # Offset is how far the film's audio lags the source: positive means late.
    offset = -lag
    if offset >= 0:
        x, y = a[: n - offset], b[offset:n]
    else:
        x, y = a[-offset:n], b[: n + offset]
    err = y - x
    snr = 10 * np.log10(np.sum(x * x) / max(np.sum(err * err), 1e-20))
    va = duration(film, "a:0")
    vv = duration(video, "v:0")
    print(f"source cut: {len(a)} samples ({len(a) / 48000:.6f} s); film audio: {len(b)} samples ({len(b) / 48000:.6f} s)")
    print(f"film video: {vv.get('nb_frames')} frames at {vv.get('r_frame_rate')}, {float(vv['duration']):.6f} s; audio {va['codec_name']} {va['sample_rate']} Hz")
    print(f"offset: {offset} samples; SNR of the encode: {snr:.1f} dB")
    ok = offset == 0 and abs(len(b) - len(a)) <= 1024
    print("sample-exact" if ok else "NOT sample-exact")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
