// Serve the piece for live preview: node tools/serve.mjs [port]
// The page needs HTTP, because a browser will not read pixels or JSON from file://.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = parseInt(process.argv[2] || "8017", 10);
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png" };

export function handler(req, res) {
  const url = new URL(req.url, "http://x");
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (file.endsWith(path.sep)) file = path.join(file, "index.html");
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  http.createServer(handler).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}/?film=1`));
}
