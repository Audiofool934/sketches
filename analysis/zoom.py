import sys, numpy as np, librosa, matplotlib
matplotlib.use("Agg"); import matplotlib.pyplot as plt
SR=22050
y,_=librosa.load("/Users/audiofool/Desktop/song.mp3", sr=SR, mono=True)
wins=[(0,14),(30,52),(66,82),(95,115),(122,140),(172,192),(226,257)]
fig,ax=plt.subplots(len(wins),1,figsize=(24,4.2*len(wins)))
for a,(s,e) in zip(ax,wins):
    seg=y[int(s*SR):int(e*SR)]
    D=librosa.amplitude_to_db(np.abs(librosa.stft(seg,n_fft=4096,hop_length=256)),ref=np.max)
    f=librosa.fft_frequencies(sr=SR,n_fft=4096)
    k=f<3000
    a.imshow(D[k],origin="lower",aspect="auto",extent=[s,e,0,3000],cmap="magma",vmin=-70,vmax=0)
    a.set_xticks(np.arange(s,e,1)); a.grid(alpha=.2); a.set_ylabel(f"{s}-{e}s Hz")
plt.tight_layout(); plt.savefig("analysis/zoom_spec.png",dpi=60)
