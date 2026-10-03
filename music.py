"""An original, calm score for the video: felt piano, warm pads and a soft bass,
synthesised from scratch (no samples, no third-party recordings).

    python music.py --seconds 420 --out audio/music.wav

The harmony loops an 8-bar progression in D major,
    Dmaj9 | A/C# | Bm7 | Gmaj7 | Em7 | D/F# | Gmaj9 | Asus4 A
with a sparse opening, 8th-note piano arpeggios in the middle and a final
resolution to D.  Everything is seeded, so the same length gives the same piece.
"""

from __future__ import annotations

import argparse
from functools import lru_cache
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, oaconvolve, sosfilt

SR = 48000
BPM = 68
BEAT = 60 / BPM
BAR = 4 * BEAT
RNG = np.random.default_rng(2023)

# (bass midi, chord pitch classes with extensions, pad voicing)
PROGRESSION = [
    (38, [2, 6, 9, 1, 4], [50, 57, 61, 64, 66]),      # Dmaj9
    (37, [9, 1, 4, 11], [49, 57, 61, 64, 68]),        # A/C#
    (35, [11, 2, 6, 9], [50, 54, 57, 62, 66]),        # Bm7
    (31, [7, 11, 2, 6], [50, 55, 59, 62, 66]),        # Gmaj7
    (40, [4, 7, 11, 2], [52, 55, 59, 62, 64]),        # Em7
    (42, [2, 6, 9, 4], [50, 54, 57, 62, 64]),         # D/F#
    (43, [7, 11, 2, 6, 9], [55, 59, 62, 66, 69]),     # Gmaj9
    (45, [9, 2, 4, 1], [52, 57, 62, 64, 69]),         # Asus4 (A on the last beats)
]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ----------------------------------------------------------------------------
# instruments
# ----------------------------------------------------------------------------
@lru_cache(maxsize=None)
def piano(m: int, vel_bucket: int, dur: float = 5.5) -> np.ndarray:
    """A soft felt-piano tone: inharmonic partials, three slightly detuned strings,
    two-stage decay, darker when played softly."""
    vel = 0.35 + 0.2 * vel_bucket
    f0 = hz(m)
    n = int(dur * SR)
    t = np.arange(n) / SR
    B = 1.2e-4 * (f0 / 261.6) ** 0.8
    out = np.zeros(n)
    rng = np.random.default_rng(m * 7 + vel_bucket)
    for k in range(1, 30):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 11000:
            break
        amp = k ** -1.15 / (1 + (fk / (900 + 2600 * vel)) ** 2)
        t1 = 2.6 * (261.6 / f0) ** 0.45 / (1 + 0.3 * (k - 1))
        env = 0.6 * np.exp(-t / (0.22 * t1)) + 0.4 * np.exp(-t / t1)
        for cents in (-0.8, 0.0, 0.7):
            ph = rng.uniform(0, 2 * np.pi)
            out += amp * env * np.sin(2 * np.pi * fk * (1 + cents / 1731.2) * t + ph) / 3
    out *= 1 - np.exp(-t / 0.004)                       # felt hammer: soft onset
    thump = rng.standard_normal(n) * np.exp(-t / 0.012) * 0.015
    out += sosfilt(butter(2, 1500, fs=SR, output="sos"), thump)
    out *= np.minimum(1, (dur - t) / 0.3)               # damp at the end of the buffer
    return (out * vel / np.abs(out).max()).astype(np.float32)


def pad_voice(m: int, n: int, attack=1.4, release=1.6, rng=RNG) -> np.ndarray:
    """A warm, slowly breathing pad note (band-limited saw, detuned, low-passed)."""
    t = np.arange(n) / SR
    f0 = hz(m)
    out = np.zeros(n)
    for cents in (-7, 0, 6):
        f = f0 * 2 ** (cents / 1200)
        ph = rng.uniform(0, 2 * np.pi, 16)
        for k in range(1, 16):
            if k * f > 5000:
                break
            out += np.sin(2 * np.pi * k * f * t + ph[k]) / k / (1 + (k * f / 700) ** 2)
    env = np.minimum(1, t / attack) * np.minimum(1, (n / SR - t) / release)
    lfo = 1 + 0.08 * np.sin(2 * np.pi * rng.uniform(0.05, 0.12) * t + rng.uniform(0, 6.28))
    return (out * env * lfo / 3).astype(np.float32)


def bass_voice(m: int, n: int) -> np.ndarray:
    t = np.arange(n) / SR
    f = hz(m)
    out = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    env = np.minimum(1, t / 0.25) * np.minimum(1, (n / SR - t) / 0.9)
    return (out * env).astype(np.float32)


def reverb_ir(seconds=3.6, rt60=(3.2, 2.7, 2.0, 1.1)) -> np.ndarray:
    """Stereo hall impulse response: band-wise exponentially decaying noise."""
    n = int(seconds * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(11)
    bands = [(None, 400), (400, 2000), (2000, 6000), (6000, None)]
    ir = np.zeros((n, 2))
    for (lo, hi), rt in zip(bands, rt60):
        if lo is None:
            sos = butter(2, hi, "lowpass", fs=SR, output="sos")
        elif hi is None:
            sos = butter(2, lo, "highpass", fs=SR, output="sos")
        else:
            sos = butter(2, [lo, hi], "bandpass", fs=SR, output="sos")
        for c in range(2):
            ir[:, c] += sosfilt(sos, rng.standard_normal(n)) * np.exp(-6.9 * t / rt)
    pre = int(0.025 * SR)
    ir = np.concatenate([np.zeros((pre, 2)), ir])[:n]
    ir *= np.minimum(1, t / 0.08)[:, None]              # soften the onset of the tail
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True))


# ----------------------------------------------------------------------------
# composition
# ----------------------------------------------------------------------------
def arp_pool(pcs, lo=57, hi=81):
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


def compose(total: float):
    """Return note events: (kind, start_s, midi, velocity_bucket or dur_s, pan)."""
    events = []
    n_bars = int(np.ceil(total / BAR)) + 1
    patterns = ([0, 2, 4, 3, 5, 4, 2, 3], [0, 3, 2, 4, 3, 5, 4, 2], [1, 3, 5, 4, 2, 4, 3, 1])
    for bar in range(n_bars):
        t0 = bar * BAR
        bass, pcs, voicing = PROGRESSION[bar % 8]
        last = bar >= n_bars - 2
        if last:                                            # resolve home
            bass, pcs, voicing = PROGRESSION[0]
        events.append(("pad", t0, tuple(voicing), BAR + 0.8, 0))
        events.append(("bass", t0, bass, BAR + 0.5, 0))
        pool = arp_pool(pcs)
        phase = bar // 8
        if bar < 4 or last:                                 # sparse: quarter notes
            steps = [(i * 2, i) for i in range(4)]
        else:
            steps = [(i, i) for i in range(8)]
        pat = patterns[phase % len(patterns)]
        for slot, i in steps:
            m = pool[min(pat[i % 8] + (2 if phase % 2 else 0), len(pool) - 1)]
            vel = 1 if slot % 4 else 2                       # a little weight on beats 1 and 3
            if bar < 4 or last:
                vel = 1
            jitter = RNG.normal(0, 0.008)
            pan = -0.35 + 0.7 * (m - pool[0]) / max(pool[-1] - pool[0], 1)
            events.append(("piano", t0 + slot * BEAT / 2 + max(jitter, -0.004), m, vel, pan))
        if bar % 8 == 7 and not last:                       # Asus4 -> A on beat 3
            events.append(("piano", t0 + 2 * BEAT, 73, 1, 0.1))
    return events


def render(total: float) -> np.ndarray:
    n = int((total + 4) * SR)
    dry_piano, dry_pad, bass = np.zeros((n, 2)), np.zeros((n, 2)), np.zeros(n)
    for kind, start, what, arg, pan in compose(total):
        i = int(start * SR)
        if i >= n:
            continue
        if kind == "piano":
            s = piano(what, arg)
            j = min(n, i + len(s))
            g = np.array([np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))])
            dry_piano[i:j] += s[: j - i, None] * g
        elif kind == "pad":
            for k, m in enumerate(what):
                s = pad_voice(m, int(arg * SR))
                j = min(n, i + len(s))
                p = -0.5 + k / max(len(what) - 1, 1)
                g = np.array([np.sqrt(0.5 * (1 - p)), np.sqrt(0.5 * (1 + p))])
                dry_pad[i:j] += s[: j - i, None] * g * 0.16
        else:
            s = bass_voice(what, int(arg * SR))
            j = min(n, i + len(s))
            bass[i:j] += s[: j - i] * 0.22
    ir = reverb_ir()
    wet_in = 0.55 * dry_piano + 0.9 * dry_pad
    wet = np.stack([oaconvolve(wet_in[:, c], ir[:, c])[:n] for c in range(2)], 1)
    mix = 0.75 * dry_piano + 0.55 * dry_pad + bass[:, None] + 0.5 * wet
    mix = sosfilt(butter(1, 7500, fs=SR, output="sos"), mix, axis=0)   # keep it warm
    mix = sosfilt(butter(2, 35, "highpass", fs=SR, output="sos"), mix, axis=0)
    mix = mix[: int(total * SR)]
    t = np.arange(len(mix)) / SR
    fade = np.minimum(1, t / 3.0) * np.minimum(1, (total - t) / 6.0)
    mix *= fade[:, None]
    return (mix * 0.89 / np.abs(mix).max()).astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, required=True)
    ap.add_argument("--out", default=str(Path(__file__).parent / "audio" / "music.wav"))
    args = ap.parse_args()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(out, SR, render(args.seconds))
    print(f"wrote {out} ({args.seconds:.1f}s)")


if __name__ == "__main__":
    main()
