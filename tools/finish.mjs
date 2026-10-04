// Complete local delivery: resumable native 8K render, two encodes, verification.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
const root=path.resolve(new URL('..',import.meta.url).pathname);
process.chdir(root);
let child;
const stopping=()=>{if(child)child.kill('SIGTERM');};
process.once('SIGINT',stopping);process.once('SIGTERM',stopping);
function run(command,args){return new Promise((resolve,reject)=>{
  child=spawn(command,args,{stdio:'inherit'});
  child.once('error',reject);child.once('close',code=>{child=undefined;code===0?resolve():reject(new Error(command+' exited '+code));});
});}
fs.mkdirSync('out/movies',{recursive:true});
const state={pid:process.pid,started:new Date().toISOString(),stage:'rendering'};
function stage(name){state.stage=name;state.updated=new Date().toISOString();fs.writeFileSync('out/pipeline.json',JSON.stringify(state,null,2));}
stage('rendering');
process.on('exit',code=>{if(code!==0){state.exitCode=code;stage('failed');}});
await run(process.execPath,['tools/render.mjs','--w','8192','--sub','4','--codec','ffv1','--no-join','--out','out/render/master-8k']);
const table=JSON.parse(fs.readFileSync('shots/film-1.json'));
const bench=JSON.parse(fs.readFileSync('out/render/master-8k/bench.json'));
const frames=bench.segments.reduce((n,s)=>n+s.frames,0);
if(frames!==table.frames)throw new Error(`Incomplete archive: ${frames}/${table.frames} frames`);
const master='out/movies/a-light-that-endures-8k.mkv',view='out/movies/a-light-that-endures-4k.mp4';
const receipt='out/movies/encode.json';
const fingerprint=bench.job.sourceHash;
const encodeVersion='hevc-422-10-q70-h264-crf16-veryfast-v1';
const saved=fs.existsSync(receipt)?JSON.parse(fs.readFileSync(receipt)):null;
const matches=saved?.sourceHash===fingerprint&&saved?.encodeVersion===encodeVersion&&[master,view].every(f=>fs.existsSync(f)&&fs.statSync(f).size===saved.files[f]);
if(!matches){
  stage('encoding');
  const masterTmp=master.replace('.mkv','.partial.mkv'),viewTmp=view.replace('.mp4','.partial.mp4');
  await run('ffmpeg',[
    '-hide_banner','-loglevel','warning','-y','-threads','6','-f','concat','-safe','0','-i','out/render/master-8k/segments.txt','-i','ref/may-it-be.flac',
    '-filter_complex','[0:v]settb=expr=1/60,setpts=N,split=2[master][view];[master]scale=out_color_matrix=bt709:out_range=tv,format=p210le[masterout];[view]scale=4096:2160:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p[viewout]',
    '-map','[masterout]','-map','1:a:0','-c:v','hevc_videotoolbox','-profile:v','main42210','-q:v','70','-realtime','0','-prio_speed','0','-power_efficient','0','-r','60','-fps_mode','cfr',
    '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','copy','-map_metadata','-1','-metadata','title=A Light That Endures','-metadata','comment=8192 x 4320 native mosaic; May It Be supplied FLAC; RGB lossless archive retained separately',masterTmp,
    '-map','[viewout]','-map','1:a:0','-c:v','libx264','-preset','veryfast','-crf','16','-threads','6','-pix_fmt','yuv420p','-r','60','-fps_mode','cfr',
    '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-b:a','320k','-ar','48000','-movflags','+faststart','-video_track_timescale','60000',
    '-map_metadata','-1','-metadata','title=A Light That Endures',viewTmp,'-progress','pipe:1','-stats_period','30'
  ]);
  fs.renameSync(masterTmp,master);fs.renameSync(viewTmp,view);
  fs.writeFileSync(receipt,JSON.stringify({sourceHash:fingerprint,encodeVersion,frames,files:Object.fromEntries([master,view].map(f=>[f,fs.statSync(f).size]))},null,2));
}
stage('verifying');
await run('python3',['tools/verify-delivery.py']);
stage('complete');
console.log(JSON.stringify({type:'delivery-complete',master:path.resolve(master),view:path.resolve(view),frames}));
