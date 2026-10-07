#!/usr/bin/env python3
"""Read a trailer's soundtrack into a score the film can be cut to.

  python3 tools/score.py 1

Writes ref/score/t<N>.json with loudness, onsets, and low-end hits, and
ref/score/t<N>-*.png: a spectrogram in strips with loudness and onsets drawn over
it, for reading by eye where the voices, the music, and the hits are.
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import maximum_filter1d, uniform_filter1d

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import frames  # noqa: E402

SR = 22050
HOP = 256
NFFT = 2048


def decode(film):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", frames.trailer_path(film), "-vn", "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32)


def stft_mag(x):
    win = np.hanning(NFFT).astype(np.float32)
    n = 1 + (len(x) - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
    return np.abs(np.fft.rfft(x[idx] * win, axis=1)).astype(np.float32)


def band(mag, f0, f1):
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    m = (freqs >= f0) & (freqs < f1)
    return (mag[:, m] ** 2).sum(1)


def peaks(env, t, min_gap, k_local, floor):
    """Local maxima above a running median by k_local and above floor."""
    w = max(3, int(round(min_gap / (t[1] - t[0]))))
    mx = maximum_filter1d(env, size=w)
    med = uniform_filter1d(env, size=w * 6)
    cand = np.where((env == mx) & (env > med * k_local) & (env > floor))[0]
    out = []
    for i in cand:
        if out and t[i] - t[out[-1]] < min_gap:
            if env[i] > env[out[-1]]:
                out[-1] = i
            continue
        out.append(i)
    return out


def main():
    film = int(sys.argv[1])
    x = decode(film)
    mag = stft_mag(x)
    n = mag.shape[0]
    t = (np.arange(n) * HOP + NFFT / 2) / SR
    rms = np.sqrt(np.maximum((mag ** 2).sum(1) / NFFT, 1e-12))
    db = 20 * np.log10(rms / rms.max() + 1e-9)
    logm = np.log1p(mag * 50)
    flux = np.maximum(np.diff(logm, axis=0, prepend=logm[:1]), 0).sum(1)
    flux = uniform_filter1d(flux, 3)
    low = band(mag, 25, 120)
    low_db = 10 * np.log10(low / low.max() + 1e-12)
    mid = band(mag, 300, 3400)
    tot = (mag ** 2).sum(1) + 1e-12
    mid_ratio = mid / tot
    # Slow loudness, for the shape of the piece.
    sl = uniform_filter1d(db, int(1.0 / (HOP / SR)))
    on = peaks(flux, t, 0.12, 1.6, np.percentile(flux, 60))
    # Hits: a jump in the low end together with an onset.
    dlow = np.maximum(np.diff(low_db, prepend=low_db[:1]), 0)
    hit_env = uniform_filter1d(dlow, 4) * (low_db > -30)
    hits = peaks(hit_env, t, 0.35, 2.5, 1.5)
    # Silences: slow loudness far below the piece's typical level.
    quiet = sl < np.percentile(sl, 50) - 18
    spans = []
    i = 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if t[j - 1] - t[i] > 0.25:
                spans.append([round(float(t[i]), 3), round(float(t[j - 1]), 3)])
            i = j
        else:
            i += 1
    out = {
        "film": film, "duration": len(x) / SR,
        "onsets": [[round(float(t[i]), 3), round(float(flux[i]), 1)] for i in on],
        "hits": [[round(float(t[i]), 3), round(float(hit_env[i]), 1), round(float(low_db[i]), 1)] for i in hits],
        "quiet": spans,
        "loudness": [[round(float(tt), 2), round(float(v), 1)] for tt, v in zip(t[::43], sl[::43])],
    }
    os.makedirs(os.path.join(frames.REF, "score"), exist_ok=True)
    with open(os.path.join(frames.REF, "score", f"t{film}.json"), "w") as fh:
        json.dump(out, fh)

    # Pitch track: the strongest normalised autocorrelation between 70 and 400 Hz, on a
    # 40 ms window, where it is periodic enough to be a voice or a held note.
    frame = int(0.04 * SR)
    lag0, lag1 = int(SR / 400), int(SR / 70)
    pt, pf, ps = [], [], []
    for c in range(frame, len(x) - frame, HOP * 2):
        seg = x[c - frame // 2:c + frame // 2]
        seg = seg - seg.mean()
        e = (seg * seg).sum()
        if e < 1e-6:
            continue
        ac = np.correlate(seg, seg, "full")[frame - 1:]
        ac /= ac[0]
        k = lag0 + int(np.argmax(ac[lag0:lag1]))
        if ac[k] > 0.55:
            pt.append(c / SR)
            pf.append(SR / k)
            ps.append(ac[k])
    out["pitch"] = [[round(a, 3), round(b, 1)] for a, b in zip(pt, pf)]
    with open(os.path.join(frames.REF, "score", f"t{film}.json"), "w") as fh:
        json.dump(out, fh)
    strong = sorted(hits, key=lambda i: -hit_env[i])[: max(6, len(hits) // 6)]

    # Spectrogram strips, 15 s each, linear 0 to 4 kHz where speech harmonics show.
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    fmax = 4000
    nb = int(np.searchsorted(freqs, fmax))
    spec = 20 * np.log10(mag[:, :nb] + 1e-6)
    spec = np.clip((spec - (spec.max() - 75)) / 75, 0, 1)
    strip = 15.0
    pps = 120
    H = 360
    for s0 in np.arange(0, len(x) / SR, strip):
        m = (t >= s0) & (t < s0 + strip)
        if not m.any():
            continue
        W = int(strip * pps)
        img = (spec[m].T[::-1] ** 0.85 * 255).astype(np.uint8)
        im = Image.fromarray(img).resize((max(1, int(round(m.sum() * HOP / SR * pps))), H), Image.BILINEAR)
        canvas = Image.new("RGB", (W + 50, H + 190), (10, 10, 12))
        canvas.paste(Image.merge("RGB", (im.point(lambda v: v * 0.75), im.point(lambda v: v * 0.85), im)), (50, 20))
        d = ImageDraw.Draw(canvas)
        for hz in (500, 1000, 2000, 3000):
            y = 20 + int((1 - hz / fmax) * H)
            d.line([(44, y), (50, y)], fill=(160, 160, 160))
            d.text((2, y - 6), f"{hz}", fill=(160, 160, 160))
        # Pitch dots, coloured by how periodic.
        for a, b, c in zip(pt, pf, ps):
            if s0 <= a < s0 + strip and b < fmax:
                xx = 50 + (a - s0) * pps
                yy = 20 + (1 - b / fmax) * H
                col = (255, int(255 * (c - 0.55) / 0.45), 60)
                d.point((xx, yy), fill=col)
                d.point((xx + 1, yy), fill=col)
        base = H + 30
        tt = t[m]
        X = 50 + (tt - s0) * pps
        d.text((2, base), "dB", fill=(80, 200, 255))
        d.line(list(zip(X, base + 70 - np.clip(db[m] + 45, 0, 45) * 1.5)), fill=(80, 200, 255), width=1)
        fl = flux / np.percentile(flux, 99)
        d.text((2, base + 75), "onset", fill=(255, 200, 80))
        d.line(list(zip(X, base + 125 - np.clip(fl[m], 0, 1) * 45)), fill=(255, 200, 80), width=1)
        for i in strong:
            if s0 <= t[i] < s0 + strip:
                xx = 50 + (t[i] - s0) * pps
                d.line([(xx, 14), (xx, H + 24)], fill=(255, 60, 60))
                d.text((xx + 2, 2), f"{t[i]:.2f}", fill=(255, 90, 90))
        for tick in np.arange(np.ceil(s0 * 2) / 2, s0 + strip + 1e-6, 0.5):
            xx = 50 + (tick - s0) * pps
            whole = abs(tick - round(tick)) < 1e-6
            d.line([(xx, base + 130), (xx, base + (142 if whole else 136))], fill=(220, 220, 220))
            if whole:
                d.text((xx + 2, base + 142), f"{int(round(tick))}", fill=(220, 220, 220))
        canvas.save(os.path.join(frames.REF, "score", f"t{film}-{int(s0):03d}.png"))
    print(f"t{film}: {len(on)} onsets, {len(hits)} hits, quiet spans {spans}")
    print("hits:", " ".join(f"{h[0]:.2f}" for h in out["hits"]))


if __name__ == "__main__":
    main()
