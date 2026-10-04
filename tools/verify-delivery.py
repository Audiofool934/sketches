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
    return json.loads(command(['ffprobe','-v','error','-count_packets','-show_streams','-show_format','-show_packets','-show_entries','stream:format:packet=stream_index,pts_time','-of','json',str(file)]))

def pcm(file):
    return command(['ffmpeg','-v','error','-i',str(file),'-map','0:a:0','-c:a','pcm_s32le','-f','s32le','-'])

source=ROOT/'ref/may-it-be.flac'
analysis=json.loads((ROOT/'analysis/music-analysis.json').read_text())
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
assert source_hash==analysis['sha256'],'The recording differs from the file analysed before the edit'
job=json.loads((OUT/'render/master-8k/job.json').read_text())
visual_files=[ROOT/'index.html']
for directory in ('engine','pictures','shots'):
    visual_files.extend(p for p in (ROOT/directory).rglob('*') if p.is_file() and p.suffix in ('.js','.json','.html'))
visual_hash=hashlib.sha256()
for file in sorted(visual_files):
    visual_hash.update(file.relative_to(ROOT).as_posix().encode())
    visual_hash.update(file.read_bytes())
assert visual_hash.hexdigest()==job['sourceHash'],'Visual source changed during the render'
raw=pcm(source)
source_samples=len(raw)//8
assert source_samples==analysis['metadata']['streams'][0]['duration_ts'],'Source sample count differs from analysis'
report={'sourceSHA256':source_hash,'visualSourceSHA256':visual_hash.hexdigest(),'sourceSamples':source_samples,'sourceRate':48000,'frames':TABLE['frames'],'files':{}}
for name,w,h,pixel in [('a-light-that-endures-8k.mkv',8192,4320,'yuv422p10le'),('a-light-that-endures-4k.mp4',4096,2160,'yuv420p')]:
    file=OUT/'movies'/name
    info=metadata(file)
    v=next(s for s in info['streams'] if s['codec_type']=='video')
    a=next(s for s in info['streams'] if s['codec_type']=='audio')
    assert (v['width'],v['height'],v['pix_fmt'])==(w,h,pixel),(name,v)
    assert v['r_frame_rate']=='60/1',(name,v['r_frame_rate'])
    assert int(v['nb_read_packets'])==TABLE['frames'],(name,v['nb_read_packets'])
    pts=sorted(float(p['pts_time']) for p in info['packets'] if p['stream_index']==v['index'])
    assert len(pts)==TABLE['frames'],(name,len(pts))
    timing_error=max(abs(t-i/60) for i,t in enumerate(pts))
    assert timing_error<.00101,(name,'Frame timestamps drift',timing_error)
    assert a['sample_rate']=='48000' and a['channels']==2,(name,a)
    assert abs(float(info['format']['duration'])-TABLE['frames']/60)<.05,(name,info['format']['duration'])
    decoded=pcm(file)
    if name.endswith('.mkv'):
        assert a['codec_name']=='flac' and decoded==raw,'Archive audio differs from supplied source'
        audio={'codec':'flac','samples':len(decoded)//8,'pcmSHA256':hashlib.sha256(decoded).hexdigest(),'sourceIdentical':True,'offsetSamples':0}
    else:
        sx=np.frombuffer(raw,np.int32).reshape(-1,2).astype(np.float64)/2147483648
        sy=np.frombuffer(decoded,np.int32).reshape(-1,2).astype(np.float64)/2147483648
        x=sx.mean(1);y=sy.mean(1)
        m=min(len(x),len(y),48000*8);size=1<<int(np.ceil(np.log2(2*m)))
        cross=np.fft.irfft(np.fft.rfft(x[:m],size)*np.conj(np.fft.rfft(y[:m],size)),size)
        lag=int(np.argmax(np.abs(cross)))
        if lag>size//2:lag-=size
        n=min(len(x),len(y));snr=float(10*np.log10(np.sum(sx[:n]**2)/max(np.sum((sy[:n]-sx[:n])**2),1e-30)))
        assert lag==0,(name,'audio alignment',-lag)
        assert abs(len(y)-len(x))<=1024,(name,'audio length',len(y),len(x))
        assert snr>25,(name,'Unexpected audio degradation',snr)
        audio={'codec':'aac','samples':len(decoded)//8,'offsetSamples':-lag,'snrDB':snr,'sourceIdentical':False}
    report['files'][name]={'bytes':file.stat().st_size,'width':w,'height':h,'fps':'60/1','frames':int(v['nb_read_packets']),'maxFrameTimingErrorSeconds':timing_error,'pixelFormat':v['pix_fmt'],'duration':float(info['format']['duration']),'audio':audio}
    print(json.dumps({'type':'verified',name:report['files'][name]}),flush=True)
report['passed']=True
(OUT/'movies/verification.json').write_text(json.dumps(report,indent=2)+'\n')
