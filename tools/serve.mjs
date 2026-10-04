// Serve the piece for live preview: node tools/serve.mjs [port]
// The page needs HTTP, because a browser will not read pixels or JSON from file://.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = parseInt(process.argv[2] || "8017", 10);
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".mp4": "video/mp4", ".mkv": "video/x-matroska", ".flac": "audio/flac", ".md": "text/plain; charset=utf-8" };

export function handler(req, res) {
  const url = new URL(req.url, "http://x");
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (file.endsWith(path.sep)) file = path.join(file, "index.html");
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  const size=fs.statSync(file).size;
  const headers={"content-type":types[path.extname(file)]||"application/octet-stream","cache-control":"no-store","accept-ranges":"bytes"};
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){
    const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),size-1):size-1;
    if(start>=size||end<start){res.writeHead(416,{"content-range":`bytes */${size}`});res.end();return;}
    res.writeHead(206,{...headers,"content-range":`bytes ${start}-${end}/${size}`,"content-length":end-start+1});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
  }else{
    res.writeHead(200,{...headers,"content-length":size});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  http.createServer(handler).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}/?film=1`));
}
