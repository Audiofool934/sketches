"""Audio map for Borrowed Lines.

Measures the recording itself (no transcription model is available):
loudness, onsets, tempo, section novelty, harmonic/percussive balance,
band energies, and a vocal-activity estimate from REPET-SIM foreground
separation plus pYIN voicing on the foreground.

Outputs analysis/audio_map.json and analysis/audio_map.png.
"""
import json
import sys
from pathlib import Path

import numpy as np
import librosa
import scipy.ndimage as ndi
import scipy.signal as sig
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

SRC = sys.argv[1] if len(sys.argv) > 1 else "/Users/audiofool/Desktop/song.mp3"
OUT = Path(__file__).resolve().parent
SR = 22050
HOP = 512

y_st, _ = librosa.load(SRC, sr=SR, mono=False)
y = librosa.to_mono(y_st)
mid = 0.5 * (y_st[0] + y_st[1])
side = 0.5 * (y_st[0] - y_st[1])
dur = len(y) / SR
fps = SR / HOP
n = 1 + len(y) // HOP
t = librosa.frames_to_time(np.arange(n), sr=SR, hop_length=HOP)


def smooth(x, sec):
    w = max(1, int(round(sec * fps)))
    return ndi.uniform_filter1d(x, w, mode="nearest")


def fit(x):
    x = np.asarray(x, dtype=float)
    if len(x) >= n:
        return x[:n]
    return np.pad(x, (0, n - len(x)), mode="edge")


# Loudness
rms = fit(librosa.feature.rms(y=y, frame_length=2048, hop_length=HOP)[0])
rms_db = librosa.amplitude_to_db(rms + 1e-9, ref=np.max)
rms_s = smooth(rms_db, 1.0)
rms_l = smooth(rms_db, 4.0)
side_rms = fit(librosa.feature.rms(y=side, frame_length=2048, hop_length=HOP)[0])
mid_rms = fit(librosa.feature.rms(y=mid, frame_length=2048, hop_length=HOP)[0])
width = smooth(side_rms / (mid_rms + 1e-6), 2.0)

# Onsets and tempo
onset_env = fit(librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP))
tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=SR, hop_length=HOP)
beat_times = librosa.frames_to_time(beats, sr=SR, hop_length=HOP)
onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=SR, hop_length=HOP, backtrack=False)
onset_times = librosa.frames_to_time(onsets, sr=SR, hop_length=HOP)
onset_density = smooth(np.isin(np.arange(n), onsets).astype(float) * fps, 2.0)

# Spectrum
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=HOP))
freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
centroid = fit(librosa.feature.spectral_centroid(S=S, sr=SR)[0])
flatness = fit(librosa.feature.spectral_flatness(S=S)[0])


def band(lo, hi, M=S):
    idx = (freqs >= lo) & (freqs < hi)
    return fit(librosa.amplitude_to_db(np.sqrt((M[idx] ** 2).mean(axis=0)) + 1e-9, ref=1.0))


bands = {
    "sub": band(20, 90),
    "low": band(90, 300),
    "mid": band(300, 2000),
    "high": band(2000, 6000),
    "air": band(6000, 11000),
}

# Harmonic / percussive balance
H, P = librosa.decompose.hpss(S, margin=2.0)
h_e = fit(np.sqrt((H**2).mean(axis=0)))
p_e = fit(np.sqrt((P**2).mean(axis=0)))
perc_ratio = smooth(p_e / (h_e + p_e + 1e-9), 1.5)

# Vocal estimate: REPET-SIM on a coarser grid, then foreground band energy + pYIN voicing
HOP_V = 1024
Sv, phase = librosa.magphase(librosa.stft(y, n_fft=2048, hop_length=HOP_V))
S_filter = librosa.decompose.nn_filter(
    Sv, aggregate=np.median, metric="cosine", width=int(librosa.time_to_frames(2.0, sr=SR, hop_length=HOP_V))
)
S_filter = np.minimum(Sv, S_filter)
mask_v = librosa.util.softmask(Sv - S_filter, 10 * S_filter, power=2)
S_fg = mask_v * Sv
fv = librosa.fft_frequencies(sr=SR, n_fft=2048)
vb = (fv >= 250) & (fv < 3500)
fg_e = np.sqrt((S_fg[vb] ** 2).mean(axis=0))
all_e = np.sqrt((Sv[vb] ** 2).mean(axis=0)) + 1e-9
fg_ratio = fg_e / all_e
y_fg = librosa.istft(S_fg * phase, hop_length=HOP_V, length=len(y))
f0, voiced_flag, voiced_prob = librosa.pyin(
    y_fg, fmin=90, fmax=900, sr=SR, frame_length=2048, hop_length=HOP_V, fill_na=np.nan
)
tv = librosa.frames_to_time(np.arange(len(fg_ratio)), sr=SR, hop_length=HOP_V)
vp = np.interp(t, librosa.frames_to_time(np.arange(len(voiced_prob)), sr=SR, hop_length=HOP_V), voiced_prob)
fr = np.interp(t, tv, fg_ratio)
fg_db = np.interp(t, tv, librosa.amplitude_to_db(fg_e + 1e-9, ref=np.max(fg_e)))
f0_i = np.interp(
    t,
    librosa.frames_to_time(np.arange(len(f0)), sr=SR, hop_length=HOP_V),
    np.nan_to_num(f0, nan=0.0),
)
vocal = smooth(vp, 0.35) * np.clip((fg_db + 40) / 30, 0, 1) * np.clip(fr * 2.2, 0, 1)
vocal_s = smooth(vocal, 0.6)

# Section novelty (Foote kernel on stacked MFCC + chroma), 2 Hz grid
mfcc = librosa.feature.mfcc(y=y, sr=SR, hop_length=HOP, n_mfcc=20)
chroma = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=HOP)
feat = np.vstack([librosa.util.normalize(mfcc, axis=1), chroma])
agg = int(round(fps / 2))
feat_s = librosa.util.sync(feat, np.arange(0, feat.shape[1], agg), aggregate=np.mean)
feat_s = librosa.util.normalize(feat_s, axis=0)
R = feat_s.T @ feat_s
tn = np.arange(R.shape[0]) * agg / fps


def foote(R, L):
    g = sig.windows.gaussian(2 * L, std=L / 2)
    k = np.outer(g, g)
    k[:L, L:] *= -1
    k[L:, :L] *= -1
    Rp = np.pad(R, L, mode="edge")
    out = np.zeros(R.shape[0])
    for i in range(R.shape[0]):
        out[i] = (Rp[i : i + 2 * L, i : i + 2 * L] * k).sum()
    out -= out.min()
    return out / (out.max() + 1e-9)


nov_short = foote(R, 8)  # ~4 s kernel half-width
nov_long = foote(R, 20)  # ~10 s
nov = 0.5 * nov_short + 0.5 * nov_long
peaks, props = sig.find_peaks(nov, distance=12, prominence=0.08)
boundaries = sorted(float(tn[p]) for p in peaks)

# Pauses: stretches with low vocal activity longer than 1.2 s while music continues
def segments(mask, min_len):
    segs, on, st = [], False, 0
    for i, m in enumerate(mask):
        if m and not on:
            on, st = True, i
        elif not m and on:
            on = False
            if (i - st) / fps >= min_len:
                segs.append([float(t[st]), float(t[i])])
    if on and (n - st) / fps >= min_len:
        segs.append([float(t[st]), float(t[-1])])
    return segs


thr = np.percentile(vocal_s, 60) * 0.55 + 0.02
vocal_segs = segments(vocal_s > thr, 1.0)
# merge vocal segments separated by < 0.5 s
merged = []
for s in vocal_segs:
    if merged and s[0] - merged[-1][1] < 0.5:
        merged[-1][1] = s[1]
    else:
        merged.append(s)
vocal_segs = merged
quiet = segments(rms_s < (np.max(rms_s) - 24), 0.6)

# Final decay: last time the 1 s loudness is within 20 dB of its median body level
body = np.median(rms_s[(t > 10) & (t < dur - 20)])
last_loud = float(t[np.where(rms_s > body - 6)[0][-1]])
tail_start = float(t[np.where(rms_s > body - 20)[0][-1]])

res = {
    "source": SRC,
    "duration": dur,
    "tempo_bpm": float(np.atleast_1d(tempo)[0]),
    "beats": [round(float(b), 3) for b in beat_times],
    "onsets": [round(float(o), 3) for o in onset_times],
    "novelty_boundaries": [round(b, 2) for b in boundaries],
    "vocal_segments": [[round(a, 2), round(b, 2)] for a, b in vocal_segs],
    "quiet_segments": [[round(a, 2), round(b, 2)] for a, b in quiet],
    "body_level_db": float(body),
    "last_loud": last_loud,
    "tail_start": tail_start,
    "curves_hz": 10,
}
# 10 Hz curves for the renderer and for storyboard notes
grid = np.arange(0, dur, 0.1)
def g(x):
    return [round(float(v), 4) for v in np.interp(grid, t, x)]
res["curves"] = {
    "t": [round(float(v), 2) for v in grid],
    "rms_db": g(rms_s),
    "rms_db_long": g(rms_l),
    "onset_density": g(onset_density),
    "centroid": g(smooth(centroid, 1.0)),
    "flatness": g(smooth(flatness, 1.0)),
    "perc_ratio": g(perc_ratio),
    "vocal": g(vocal_s),
    "stereo_width": g(width),
    "novelty": [round(float(v), 4) for v in np.interp(grid, tn, nov)],
    **{f"band_{k}": g(smooth(v, 1.0)) for k, v in bands.items()},
}
(OUT / "audio_map.json").write_text(json.dumps(res))

# Plot
fig, ax = plt.subplots(9, 1, figsize=(26, 24), sharex=True)
ax[0].plot(np.arange(len(y)) / SR, y, lw=0.2, color="k")
ax[0].set_ylabel("wave")
ax[1].plot(t, rms_db, lw=0.4, color="0.6")
ax[1].plot(t, rms_s, lw=1.2, color="C0")
ax[1].plot(t, rms_l, lw=1.5, color="C3")
ax[1].set_ylabel("RMS dB")
ax[2].plot(t, onset_env, lw=0.4, color="0.5")
ax[2].plot(t, onset_density, lw=1.2, color="C1")
ax[2].set_ylabel("onset/dens")
ax[3].plot(t, perc_ratio, color="C2")
ax[3].set_ylabel("perc ratio")
ax[4].plot(t, smooth(centroid, 1.0), color="C4")
ax[4].set_ylabel("centroid")
for k, v in bands.items():
    ax[5].plot(t, smooth(v, 1.0), lw=1, label=k)
ax[5].legend(loc="upper left", ncol=5)
ax[5].set_ylabel("bands dB")
ax[6].plot(t, vocal, lw=0.4, color="0.6")
ax[6].plot(t, vocal_s, lw=1.4, color="C3")
ax[6].axhline(thr, color="k", lw=0.5, ls=":")
for a, b in vocal_segs:
    ax[6].axvspan(a, b, color="C3", alpha=0.12)
ax[6].set_ylabel("vocal est")
ax[7].plot(tn, nov, color="C5")
for b in boundaries:
    for a_ in ax:
        a_.axvline(b, color="C5", lw=0.6, alpha=0.6)
ax[7].set_ylabel("novelty")
ax[8].imshow(
    librosa.amplitude_to_db(np.abs(librosa.cqt(y, sr=SR, hop_length=HOP, n_bins=84)), ref=np.max),
    aspect="auto",
    origin="lower",
    extent=[0, dur, 0, 84],
    cmap="magma",
)
ax[8].set_ylabel("CQT")
for a_ in ax:
    a_.grid(alpha=0.25)
ax[-1].set_xticks(np.arange(0, dur, 5))
ax[-1].set_xlim(0, dur)
plt.tight_layout()
plt.savefig(OUT / "audio_map.png", dpi=70)

print(json.dumps({k: v for k, v in res.items() if k not in ("curves", "beats", "onsets")}, indent=1))
print("beats:", len(res["beats"]), "first", res["beats"][:8])
