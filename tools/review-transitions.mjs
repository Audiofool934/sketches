// Render transition strips and compare narrow seeks with enclosing scene windows.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './browser.mjs';
import { handler } from './serve.mjs';
const table=JSON.parse(fs.readFileSync(new URL('../shots/film-1.json',import.meta.url)));
const out=path.resolve('out/review/transitions');fs.mkdirSync(out,{recursive:true});
const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser,page;
const records=[];
async function open(a,b){
  if(browser)await browser.close();
  browser=await launch();page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto(`http://127.0.0.1:${server.address().port}/?w=960&sub=4&from=${Math.floor(a*60)}&to=${Math.ceil(b*60)}`,{timeout:600000});
  await page.waitForFunction(()=>window.ready!==undefined,null,{timeout:20000});await page.evaluate(()=>window.ready);
}
async function capture(t,file){
  const result=await page.evaluate(t=>{
    window.seek(t);const c=document.getElementById('stage'),gl=c.getContext('webgl2');
    const p=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,p);
    let h=2166136261;for(const x of p)h=Math.imul(h^x,16777619);
    const error=gl.getError();if(error)throw new Error('WebGL '+error);
    return {png:c.toDataURL('image/png'),hash:h>>>0,glError:error};
  },t);
  if(file)fs.writeFileSync(path.join(out,file),Buffer.from(result.png.split(',')[1],'base64'));
  return result.hash;
}
try{
  for(const scene of table.scenes.slice(1)){
    const anchor=scene.in.land[1]-.25;
    const times=[anchor-1.3,anchor-.8,anchor-.3,anchor+.2,anchor+.7];
    await open(times[0],times.at(-1));
    const shots=[];
    for(const t of times){const file=`${scene.id}-${t.toFixed(3)}.png`;shots.push({t,file,hash:await capture(t,file)});}
    const repeated=await capture(times[0]);if(repeated!==shots[0].hash)throw new Error('Seek changed with history: '+scene.id);
    records.push({scene:scene.id,shots,repeat:true});
    fs.writeFileSync(path.join(out,'transitions.json'),JSON.stringify(records,null,2));
    console.log(JSON.stringify({type:'transition',scene:scene.id,frames:shots.length,repeat:true}));
  }
  const checks=[];
  for(const [t,a,b] of [[12,0,22],[90.5,82,95],[177,170,184],[203,197,206.3]]){
    await open(a,b);const wide=await capture(t);
    await open(t,t+1/60);const narrow=await capture(t);
    const result={t,a,b,wide,narrow,match:wide===narrow};checks.push(result);
    console.log(JSON.stringify({type:'window-check',...result}));
    fs.writeFileSync(path.join(out,'window-checks.json'),JSON.stringify(checks,null,2));
    if(!result.match)throw new Error('Frame depends on loaded scene window at '+t);
  }
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
