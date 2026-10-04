#!/usr/bin/env python3
"""Measure the supplied recording before designing the picture clock.

This is signal analysis, not a claim of auditory listening or source separation.
All times refer to the unmodified source, including its initial silence.
"""
import hashlib
import json
import subprocess
from pathlib import Path

import librosa
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy.ndimage import gaussian_filter1d, uniform_filter1d
from scipy.signal import find_peaks

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ref/may-it-be.flac"
OUT = ROOT / "analysis"
OUT.mkdir(exist_ok=True)
SR, HOP, FFT = 22050, 256, 2048

probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-select_streams", "a:0",
    "-show_streams", "-show_format", "-of", "json", str(SOURCE)]))
raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(SOURCE),
    "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
y = np.frombuffer(raw, np.float32)
S = np.abs(librosa.stft(y, n_fft=FFT, hop_length=HOP))
t = librosa.frames_to_time(np.arange(S.shape[1]), sr=SR, hop_length=HOP)
freq = librosa.fft_frequencies(sr=SR, n_fft=FFT)
rms = librosa.feature.rms(S=S, frame_length=FFT)[0]
db = 20 * np.log10(np.maximum(rms, 1e-8))
smooth = gaussian_filter1d(db, SR / HOP * .5)
onset = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S, ref=np.max), sr=SR, hop_length=HOP)
onset = gaussian_filter1d(onset, 1.2)
on = librosa.onset.onset_detect(onset_envelope=onset, sr=SR, hop_length=HOP, units="frames", backtrack=False)
chroma = librosa.feature.chroma_stft(S=S**2, sr=SR, n_fft=FFT, hop_length=HOP, tuning=0)

# Compare plausible pulse levels instead of treating an automatic beat tracker as
# ground truth for a soft, legato song with little percussion.
tempo_by_section = []
for start, end in [(0,206.3),(8,55),(55,98),(98,146),(146,193)]:
    e = onset[(t >= start) & (t < end)]
    ac = librosa.autocorrelate(e, max_size=int(SR / HOP * 2))
    lags = np.arange(len(ac))
    bpm = 60 * SR / HOP / np.maximum(lags, 1)
    peaks, _ = find_peaks(ac)
    peaks = [int(i) for i in peaks if 45 <= bpm[i] <= 180]
    peaks.sort(key=lambda i: -ac[i])
    tempo_by_section.append({"start":start,"end":end,"candidates":[
        {"bpm":round(float(bpm[i]),2),"relative_strength":round(float(ac[i]/ac[0]),3)} for i in peaks[:5]]})

# Half-second harmonic summaries and checkerboard novelty. These locate changes
# of harmony/timbre; they do not infer words or a story from a waveform.
dt = .5
times = np.arange(0, len(y)/SR, dt)
C = np.stack([np.mean(chroma[:, (t>=a)&(t<a+dt)], axis=1) for a in times], axis=1)
C /= np.maximum(np.linalg.norm(C, axis=0, keepdims=True), 1e-8)
sim = C.T @ C
novelty = np.zeros(len(times))
for i in range(8,len(times)-8):
    before, after = C[:,i-8:i], C[:,i:i+8]
    novelty[i] = (np.mean(before.T@before)+np.mean(after.T@after))/2 - np.mean(before.T@after)
change, _ = find_peaks(novelty, distance=10, prominence=.025)
troughs, _ = find_peaks(-smooth, distance=int(2.4*SR/HOP), prominence=1.8)
swells, _ = find_peaks(smooth, distance=int(3*SR/HOP), prominence=1.0)
band = lambda lo,hi: 10*np.log10(np.maximum(np.mean(S[(freq>=lo)&(freq<hi)]**2,axis=0),1e-9))
bass = gaussian_filter1d(band(40,240),SR/HOP*.15)
presence = gaussian_filter1d(band(600,3200),SR/HOP*.15)
top_pitches = np.argsort(chroma.mean(axis=1))[::-1]
names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

result = {
    "source":str(SOURCE.resolve()),"sha256":hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "metadata":probe,"analysis_sample_rate":SR,"hop_seconds":HOP/SR,
    "method":"STFT RMS, positive spectral flux, pulse autocorrelation, chroma recurrence and novelty; no listening claim",
    "tempo_candidates":tempo_by_section,
    "pitch_class_energy":[[names[i],round(float(chroma[i].mean()),4)] for i in top_pitches],
    "harmonic_change_candidates":[[round(float(times[i]),3),round(float(novelty[i]),4)] for i in change],
    "phrase_trough_candidates":[[round(float(t[i]),3),round(float(smooth[i]),2)] for i in troughs],
    "swells":[[round(float(t[i]),3),round(float(smooth[i]),2)] for i in swells],
    "onsets":[[round(float(t[i]),3),round(float(onset[i]),4)] for i in on],
    "envelopes":[[round(float(t[i]),3),round(float(smooth[i]),3),round(float(bass[i]),3),round(float(presence[i]),3),round(float(onset[i]),4)] for i in range(0,len(t),8)],
}
(OUT/'music-analysis.json').write_text(json.dumps(result,indent=2))
np.savez_compressed(OUT/'music-features.npz',t=t,db=db,smooth=smooth,chroma=chroma,onset=onset,bass=bass,presence=presence)
plt.rcParams.update({'figure.facecolor':'#10151b','axes.facecolor':'#10151b','text.color':'#e0d9c8','axes.labelcolor':'#e0d9c8','xtick.color':'#c5c0b6','ytick.color':'#c5c0b6','font.size':10})
fig,axs=plt.subplots(4,1,figsize=(19,10),gridspec_kw={'height_ratios':[2,1,2,1]},sharex=True)
axs[0].plot(t,smooth,color='#dabc74',lw=1.2);axs[0].set_ylabel('RMS dBFS');axs[0].set_ylim(-60,-8)
axs[1].plot(t,onset,color='#85bfc0',lw=.6);axs[1].set_ylabel('Onset strength')
axs[2].imshow(chroma,aspect='auto',origin='lower',extent=[0,t[-1],0,12],cmap='magma',vmin=0,vmax=1)
axs[2].set_yticks(np.arange(12)+.5,names);axs[2].set_ylabel('Pitch class')
axs[3].plot(times,novelty,color='#d5a87e');axs[3].set_ylabel('Harmonic novelty')
for ax in axs:
    ax.set_xlim(0,len(y)/SR);ax.set_xticks(np.arange(0,211,10));ax.grid(alpha=.15)
    for i in change: ax.axvline(times[i],color='#ddd5af',alpha=.22,lw=.6)
for i in change: axs[3].annotate(f'{times[i]:.1f}',(times[i],novelty[i]),fontsize=8,xytext=(0,4),textcoords='offset points')
fig.suptitle('MAY IT BE | supplied 206.307 s recording | measured musical structure',fontsize=17)
fig.tight_layout();fig.savefig(OUT/'music-map.png',dpi=125);plt.close(fig)
for a in range(0,207,30):
    b=min(a+30,len(y)/SR);m=(t>=a)&(t<=b)
    fig,axs=plt.subplots(3,1,figsize=(18,7),sharex=True,gridspec_kw={'height_ratios':[3,1,1]})
    spec=20*np.log10(np.maximum(S[:,m],1e-6))
    axs[0].imshow(spec,aspect='auto',origin='lower',extent=[a,b,0,SR/2],cmap='magma',vmin=-55,vmax=20)
    axs[0].set_ylim(0,3500);axs[0].set_ylabel('Hz')
    axs[1].plot(t[m],smooth[m],color='#dabc74');axs[1].set_ylabel('RMS dBFS')
    axs[2].plot(t[m],onset[m],color='#85bfc0');axs[2].set_ylabel('Onset')
    for ax in axs: ax.set_xlim(a,b);ax.set_xticks(np.arange(a,b+.1,1));ax.grid(alpha=.15)
    fig.suptitle(f'MAY IT BE | {a:.0f}-{b:.1f} seconds');fig.tight_layout();fig.savefig(OUT/f'phrase-{a:03d}.png',dpi=120);plt.close(fig)
print(json.dumps({k:result[k] for k in ['tempo_candidates','pitch_class_energy','harmonic_change_candidates','phrase_trough_candidates','swells']},indent=2))
