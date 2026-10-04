#!/usr/bin/env python3
import json
import os
from pathlib import Path
from datetime import datetime, timezone
root=Path(__file__).resolve().parent.parent
out=root/'out'
state=json.loads((out/'pipeline.json').read_text()) if (out/'pipeline.json').exists() else {'stage':'not started'}
if state.get('pid') and state['stage'] not in ('complete','failed'):
    try:os.kill(state['pid'],0)
    except ProcessLookupError:state['stage']='stopped'
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
    frame=next((int(s.split('=',1)[1]) for s in reversed(log.splitlines()) if s.startswith('frame=')),0)
    elapsed=(datetime.now(timezone.utc)-datetime.fromisoformat(state['updated'])).total_seconds()
    remaining=elapsed*(12379-frame)/frame/60 if frame else None
    eta=f', approximate encoding time left {remaining:.0f} min' if remaining is not None else ''
    print(f'Encoding 8K and 4K movies: {frame}/12379 frames ({frame/12379:.1%}), {elapsed/60:.0f} min elapsed{eta}.')
else:print(json.dumps(state))
