#!/usr/bin/env python3
import json
from pathlib import Path
from datetime import datetime, timezone
root=Path(__file__).resolve().parent.parent
out=root/'out'
state=json.loads((out/'pipeline.json').read_text()) if (out/'pipeline.json').exists() else {'stage':'not started'}
log=(out/'pipeline.log').read_text(errors='replace') if (out/'pipeline.log').exists() else ''
last={}
for line in reversed(log.splitlines()):
    if line.startswith('{'):
        try:obj=json.loads(line)
        except ValueError:continue
        if obj.get('type')=='frame':last=obj;break
if state['stage']=='rendering' and last:
    total=12379;n=last['n']+1
    elapsed=(datetime.now(timezone.utc)-datetime.fromisoformat(state['started'])).total_seconds()
    print(f"8K render {n}/{total} frames ({n/total:.1%}), {elapsed/60:.0f} min elapsed, approximate render time left {elapsed*(total-n)/max(n,1)/60:.0f} min.")
elif state['stage']=='encoding':
    progress=next((s.split('=',1)[1] for s in reversed(log.splitlines()) if s.startswith('out_time=')), 'initialising')
    print('Encoding both delivery movies. Latest encoded time: '+progress)
else:print(json.dumps(state))
