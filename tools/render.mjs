// Deterministic, resumable mosaic export. Frame storage uses the selected output directory.
// Scene-sized browser lifetimes bound GPU memory; FFV1 preserves rendered RGB.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { launch, option } from './browser.mjs';
import { handler } from './serve.mjs';
const args=process.argv.slice(2),table=JSON.parse(fs.readFileSync(new URL('../shots/film-1.json',import.meta.url)));
const W=Number(option(args,'w','4096')),H=Math.round(W*table.band[1]/table.band[0]/2)*2;
const sub=Number(option(args,'sub','4')),first=Number(option(args,'from','0')),last=Number(option(args,'to',String(table.frames)));
const step=Number(option(args,'step','1')),fps=table.fps[0]/table.fps[1]/step;
const segmentSize=Number(option(args,'seg','180'))*step;
const codec=option(args,'codec','ffv1'),out=path.resolve(option(args,'out','out/render/master'));
const crf=option(args,'crf','16'),preset=option(args,'preset','medium');
if(first<0||last>table.frames||first>=last||W%2||H%2||!['ffv1','h264'].includes(codec))throw new Error('Invalid render parameters');
fs.mkdirSync(out,{recursive:true});
const root=path.resolve(new URL('..',import.meta.url).pathname);
const sourceFiles=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(/\.(js|json|html)$/.test(ent.name))sourceFiles.push(p);}}
for(const d of ['engine','pictures','shots'])walk(path.join(root,d));sourceFiles.push(path.join(root,'index.html'));
const hash=crypto.createHash('sha256');for(const p of sourceFiles.sort()){hash.update(path.relative(root,p));hash.update(fs.readFileSync(p));}
const job={sourceHash:hash.digest('hex'),W,H,sub,first,last,step,fps,codec,crf,preset,segmentSize};
const jobPath=path.join(out,'job.json');
if(fs.existsSync(jobPath)&&JSON.stringify(JSON.parse(fs.readFileSync(jobPath)))!==JSON.stringify(job))throw new Error('This output belongs to a different source or render configuration. Use a new output directory.');
fs.writeFileSync(jobPath,JSON.stringify(job,null,2));
const windows=[first,...table.scenes.map(s=>Math.ceil(s.start*60/step)*step).filter(n=>n>first&&n<last),last];
const chunks=[];
for(let i=0;i<windows.length-1;i++)for(let a=windows[i];a<windows[i+1];a+=segmentSize){
  const b=Math.min(a+segmentSize,windows[i+1]);chunks.push({a,b,window:i});
}
const ext=codec==='ffv1'?'mkv':'mp4';
for(const c of chunks)c.file=path.join(out,`frames-${String(c.a).padStart(6,'0')}-${String(c.b).padStart(6,'0')}.${ext}`);
let pending,ff,browser,server,page,aborting=false;
let rendered=0,renderMs=0;
const started=Date.now();
const records=fs.existsSync(path.join(out,'bench.json'))?JSON.parse(fs.readFileSync(path.join(out,'bench.json'))).segments:[];
function run(cmd,argv){return new Promise((resolve,reject)=>{const p=spawn(cmd,argv,{stdio:['ignore','inherit','inherit']});p.once('error',reject);p.once('exit',c=>c===0?resolve():reject(new Error(cmd+' exited '+c)));});}
async function cleanup(){
  if(ff&&!ff.killed){ff.stdin.destroy();ff.kill('SIGTERM');await new Promise(r=>{ff.once('close',r);setTimeout(r,2000).unref();});}
  if(browser)await browser.close().catch(()=>{});
  if(server)await new Promise(r=>server.close(r));
}
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{aborting=true;cleanup().finally(()=>process.exit(130));});
try{
  server=http.createServer((req,res)=>{
    if(req.method==='POST'&&req.url==='/frame'){
      const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{const p=pending;pending=undefined;const bytes=Buffer.concat(chunks);res.writeHead(200);res.end('ok');if(p)p(bytes);});return;
    }handler(req,res);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let loadedWindow=-1;
  for(const chunk of chunks){
    if(aborting)throw new Error('Interrupted');
    const receipt=chunk.file+'.done.json';
    if(fs.existsSync(receipt)){
      const r=JSON.parse(fs.readFileSync(receipt));if(fs.existsSync(chunk.file)&&fs.statSync(chunk.file).size===r.bytes)continue;
      throw new Error('Completed segment is missing or altered: '+chunk.file);
    }
    if(loadedWindow!==chunk.window){
      if(browser)await browser.close();
      browser=await launch();page=await browser.newPage({viewport:{width:1280,height:720}});
      let pageFailure;page.on('pageerror',e=>pageFailure=e);
      const setup=Date.now(),a=windows[chunk.window],b=windows[chunk.window+1]-1;
      await page.goto(`http://127.0.0.1:${server.address().port}/?w=${W}&sub=${sub}&from=${a}&to=${b}`,{timeout:600000});
      await page.waitForFunction(()=>window.ready!==undefined,null,{timeout:20000});
      await page.evaluate(()=>window.ready);
      if(pageFailure)throw pageFailure;
      const info=await page.evaluate(()=>window.filmInfo);
      if(!info||info.stones.some(s=>s.count>16777214))throw new Error('Invalid scene geometry or bed ownership capacity');
      console.log(JSON.stringify({type:'scene-ready',a,b,setupSeconds:(Date.now()-setup)/1000,stones:info.stones.map(s=>[s.shot,s.count])}));
      loadedWindow=chunk.window;
    }
    const chunkStart=Date.now();let gpu=0,count=0,encodeError;
    const vf=codec==='ffv1'?'vflip':'vflip,scale=out_color_matrix=bt709:out_range=tv';
    const enc=codec==='ffv1'?['-c:v','ffv1','-level','3','-coder','1','-context','0','-slices','16','-threads','6','-pix_fmt','bgr0']:['-c:v','libx264','-preset',preset,'-crf',crf,'-threads','6','-pix_fmt','yuv420p','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709'];
    ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${W}x${H}`,'-framerate',String(fps),'-i','pipe:0','-vf',vf,...enc,chunk.file],{stdio:['pipe','ignore','pipe']});
    ff.stderr.on('data',d=>{const msg=d.toString().split('\n').filter(x=>x&&!/^Truncating packet of size \d+ to 8192$/.test(x)).join('\n');if(msg)console.error(msg);});
    ff.stdin.on('error',e=>encodeError=e);
    const done=new Promise((resolve,reject)=>{ff.once('error',reject);ff.once('close',code=>code===0?resolve():reject(new Error('ffmpeg exited '+code)));});
    done.catch(()=>{});
    for(let n=chunk.a;n<chunk.b;n+=step){
      if(encodeError)throw encodeError;
      const pixels=new Promise(r=>pending=r);
      const ms=await page.evaluate(async(n)=>{
        const start=performance.now();window.seek(n/60);const c=document.getElementById('stage'),gl=c.getContext('webgl2');
        if(!window.__pixels)window.__pixels=new Uint8Array(c.width*c.height*4);
        gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,window.__pixels);
        const error=gl.getError();if(error)throw new Error('WebGL '+error);
        const elapsed=performance.now()-start;
        await fetch('/frame',{method:'POST',body:new Blob([window.__pixels])});if(window.gc)window.gc();return elapsed;
      },n);
      const buf=await pixels;if(buf.length!==W*H*4)throw new Error('Incomplete frame '+n);
      if(!ff.stdin.write(buf))await once(ff.stdin,'drain');
      gpu+=ms;renderMs+=ms;count++;rendered++;
      if(count%30===0)console.log(JSON.stringify({type:'frame',n,time:n/60,secondsPerFrame:(Date.now()-chunkStart)/1000/count,totalRendered:rendered}));
    }
    ff.stdin.end();await done;ff=undefined;
    const record={a:chunk.a,b:chunk.b,frames:count,bytes:fs.statSync(chunk.file).size,seconds:(Date.now()-chunkStart)/1000,gpuMs:gpu};
    fs.writeFileSync(receipt,JSON.stringify(record,null,2));records.push(record);
    fs.writeFileSync(path.join(out,'bench.json'),JSON.stringify({job,segments:records,wallSeconds:(Date.now()-started)/1000},null,2));
    console.log(JSON.stringify({type:'segment-complete',...record}));
  }
}finally{await cleanup();}
// Receipts are the resume authority, including a stop between receipt and summary writes.
const completed=chunks.map(c=>JSON.parse(fs.readFileSync(c.file+'.done.json')));
fs.writeFileSync(path.join(out,'bench.json'),JSON.stringify({job,segments:completed,wallSeconds:(Date.now()-started)/1000},null,2));
const list=path.join(out,'segments.txt');fs.writeFileSync(list,chunks.map(c=>`file '${path.basename(c.file)}'`).join('\n')+'\n');
const video=path.join(out,'video.'+ext);
if(!args.includes('--no-join'))await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',list,'-c','copy',...(codec==='h264'?['-movflags','+faststart']:[]),video]);
console.log(JSON.stringify({type:'complete',video:args.includes('--no-join')?null:video,list,rendered,seconds:(Date.now()-started)/1000,renderMs}));
