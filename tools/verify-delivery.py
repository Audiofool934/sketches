#!/usr/bin/env python3
"""Verify complete packet counts, media contracts and source-aligned audio."""
import hashlib
import json
import subprocess
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'out'
TABLE=json.loads((ROOT/'shots/film-1.json').read_text())

def command(args):
    return subprocess.run(args,check=True,capture_output=True).stdout

def metadata(file):
    return json.loads(command(['ffprobe','-v','error','-count_packets','-show_streams','-show_format','-of','json',str(file)]))

def pcm(file):
    return command(['ffmpeg','-v','error','-i',str(file),'-map','0:a:0','-c:a','pcm_s32le','-f','s32le','-'])

source=ROOT/'ref/may-it-be.flac'
raw=pcm(source)
source_samples=len(raw)//8
report={'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceSamples':source_samples,'sourceRate':48000,'frames':TABLE['frames'],'files':{}}
for name,w,h,pixel in [('a-light-that-endures-8k.mkv',8192,4320,'yuv422p10le'),('a-light-that-endures-4k.mp4',4096,2160,'yuv420p')]:
    file=OUT/'movies'/name
    info=metadata(file)
    v=next(s for s in info['streams'] if s['codec_type']=='video')
    a=next(s for s in info['streams'] if s['codec_type']=='audio')
    assert (v['width'],v['height'],v['pix_fmt'])==(w,h,pixel),(name,v)
    assert v['r_frame_rate']=='60/1',(name,v['r_frame_rate'])
    assert int(v['nb_read_packets'])==TABLE['frames'],(name,v['nb_read_packets'])
    assert a['sample_rate']=='48000' and a['channels']==2,(name,a)
    assert abs(float(info['format']['duration'])-TABLE['frames']/60)<.05,(name,info['format']['duration'])
    decoded=pcm(file)
    if name.endswith('.mkv'):
        assert a['codec_name']=='flac' and decoded==raw,'Archive audio differs from supplied source'
        audio={'codec':'flac','samples':len(decoded)//8,'pcmSHA256':hashlib.sha256(decoded).hexdigest(),'sourceIdentical':True,'offsetSamples':0}
    else:
        x=np.frombuffer(raw,np.int32).reshape(-1,2).astype(np.float64).mean(1)/2147483648
        y=np.frombuffer(decoded,np.int32).reshape(-1,2).astype(np.float64).mean(1)/2147483648
        m=min(len(x),len(y),48000*8);size=1<<int(np.ceil(np.log2(2*m)))
        cross=np.fft.irfft(np.fft.rfft(x[:m],size)*np.conj(np.fft.rfft(y[:m],size)),size)
        lag=int(np.argmax(np.abs(cross)))
        if lag>size//2:lag-=size
        n=min(len(x),len(y));snr=float(10*np.log10(np.sum(x[:n]**2)/max(np.sum((y[:n]-x[:n])**2),1e-30)))
        assert lag==0,(name,'audio alignment',-lag)
        assert abs(len(y)-len(x))<=1024,(name,'audio length',len(y),len(x))
        audio={'codec':'aac','samples':len(decoded)//8,'offsetSamples':-lag,'snrDB':snr,'sourceIdentical':False}
    report['files'][name]={'bytes':file.stat().st_size,'width':w,'height':h,'fps':'60/1','frames':int(v['nb_read_packets']),'pixelFormat':v['pix_fmt'],'duration':float(info['format']['duration']),'audio':audio}
    print(json.dumps({'type':'verified',name:report['files'][name]}),flush=True)
report['passed']=True
(OUT/'movies/verification.json').write_text(json.dumps(report,indent=2)+'\n')
