// Bounded scene loading keeps the 18-scene film within the Mac's memory budget.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { launch,option } from './browser.mjs';
import { handler } from './serve.mjs';
const args=process.argv.slice(2),w=Number(option(args,'w','1536')),sub=Number(option(args,'sub','4'));
const out=path.resolve(option(args,'out','out/review/pass-1'));
const times=option(args,'t','1.5,5.8,12,25,38,50,64.5,77,88,100,114,125.5,140,154,164,177,185,193,203').split(',').map(Number);
fs.mkdirSync(out,{recursive:true});
const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await launch();const records=[];
try{
  for(const t of times){
    const page=await browser.newPage({viewport:{width:1280,height:720}});
    let failure;page.on('pageerror',e=>failure=e);
    const first=Math.floor(t*60),last=first+1;
    const begin=Date.now();
    await page.goto(`http://127.0.0.1:${server.address().port}/?w=${w}&sub=${sub}&from=${first}&to=${last}&t=${t}`,{timeout:600000});
    await page.waitForFunction(()=>window.ready!==undefined,null,{timeout:20000});
    await page.evaluate(()=>window.ready);
    if(failure)throw failure;
    const info=await page.evaluate(()=>window.filmInfo);
    if(info.stones.some(s=>s.count>16777214))throw new Error('Bed ownership exceeds 24-bit capacity: '+JSON.stringify(info.stones));
    const result=await page.evaluate(t=>{
      const c=document.getElementById('stage'),gl=c.getContext('webgl2');
      const hash=()=>{const px=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,px);let h=2166136261;for(const x of px)h=Math.imul(h^x,16777619);return h>>>0;};
      window.seek(t);const first=hash();window.seek(Math.max(0,t-.23));window.seek(t);
      return {png:c.toDataURL('image/png'),hash:first,repeat:first===hash(),glError:gl.getError()};
    },t);
    if(!result.repeat||result.glError)throw new Error('Determinism or GPU failure at '+t);
    const file=path.join(out,`t${t.toFixed(3)}.png`);fs.writeFileSync(file,Buffer.from(result.png.split(',')[1],'base64'));
    records.push({time:t,file,hash:result.hash,repeat:result.repeat,glError:result.glError,seconds:(Date.now()-begin)/1000,info});
    fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(records,null,2));
    console.log(JSON.stringify({time:t,file,stones:info.stones.map(s=>[s.shot,s.count]),seconds:records.at(-1).seconds}));
    await page.close();
  }
} finally {await browser.close();server.close();}
