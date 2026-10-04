#!/usr/bin/env python3
"""Inspect actual encoded pixels at the story anchors and during the Ring fall."""
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parent.parent
out=root/'out/review/export'
out.mkdir(parents=True,exist_ok=True)
anchors=[('Creation',1.5),('Two Trees',12),('Silmarils',25),('Ring',39),('Numenor',49),('Last Alliance',58),('Shire',64.5),('Fellowship',77),('Moria',91.6),('Lorien',100),('Argonath',114),('Fangorn',125.5),('Rohan',140),('Beacons',154),('Courage',164),('The burden',177),('Unmaking',187.5),('Renewal',193),('Grey Havens',203)]
action=[185.5,185.9,186.3,186.7,187.1,187.5,187.9,188.3,188.7,189.1,189.5]
frames=sorted(set([round(t*60) for _,t in anchors]+[round(t*60) for t in action]+[0,12378]))
select='+'.join(f'eq(n\\,{n})' for n in frames)
subprocess.run(['ffmpeg','-v','error','-xerror','-y','-threads','6','-i',str(root/'out/movies/a-light-that-endures-4k.mp4'),'-vf',f'select={select},scale=1536:810:flags=lanczos','-fps_mode','vfr',str(out/'frame-%03d.png')],check=True)
files={n:out/f'frame-{i+1:03d}.png' for i,n in enumerate(frames)}
for file in files.values():
    assert file.exists(),file

def sheet(items,cols,w,h,name):
    im=Image.new('RGB',(w*cols,(h+26)*((len(items)+cols-1)//cols)),'#11171e')
    d=ImageDraw.Draw(im)
    for i,(label,t) in enumerate(items):
        a=Image.open(files[round(t*60)]).convert('RGB');a.thumbnail((w,h),Image.Resampling.LANCZOS)
        x=(i%cols)*w;y=(i//cols)*(h+26);im.paste(a,(x,y));d.text((x+8,y+h+5),f'{label} {t:.2f}s',fill='#e4dfd1')
    im.save(out/name)

sheet(anchors,4,360,190,'phone-360.png')
sheet([('Ring fall',t) for t in action],4,480,254,'ring-action.png')
(out/'frames.json').write_text(json.dumps([{'frame':n,'t':n/60,'file':str(file)} for n,file in files.items()],indent=2)+'\n')
print(json.dumps({'frames':len(files),'phone':str(out/'phone-360.png'),'action':str(out/'ring-action.png')}))
