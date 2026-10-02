// Render the piece to video: Playwright seeks window.seek(t), the page posts raw
// frames to this script, ffmpeg writes lossless segments, then one H.264 encode.
//
//   node tools/render.mjs --out out --w 1920 --fps 60 --sub 4
//   node tools/render.mjs --out preview --w 640 --fps 30 --sub 1
//   --angle metal|swiftshader picks the WebGL backend; --playwright points at playwright's index.mjs
//
// Segments are kept, so a stopped render picks up where it left off.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? acc.concat([[a.slice(2), all[i + 1]]]) : acc), [])
);
const W = parseInt(args.w || "1920", 10);
const H = Math.round((W * 9) / 16);
const FPS = parseInt(args.fps || "60", 10);
const SUB = parseInt(args.sub || "4", 10);
const SEG = parseInt(args.seg || String(FPS * 4), 10);
const OUT = path.resolve(args.out || "out");
const CRF = args.crf || "16";
const playwrightPath = args.playwright || process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(playwrightPath);

fs.mkdirSync(OUT, { recursive: true });

let pending = null;
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url.startsWith("/frame")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const buf = Buffer.concat(chunks);
      const p = pending;
      pending = null;
      res.writeHead(200);
      res.end("ok");
      if (p) p(buf);
    });
    return;
  }
  const url = new URL(req.url, "http://x");
  const file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  const type = file.endsWith(".html") ? "text/html" : file.endsWith(".js") ? "text/javascript" : "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

// A real GPU where there is one (Metal on a Mac), SwiftShader on a machine without one.
const angle = args.angle || (process.platform === "darwin" ? "metal" : "swiftshader");
const flags = angle === "swiftshader"
  ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
  : ["--headless=new", `--use-angle=${angle}`, "--enable-webgl", "--ignore-gpu-blocklist"];
const browser = await chromium.launch({ args: flags });
const page = await browser.newPage({ viewport: { width: Math.max(W, 640), height: Math.max(H, 360) } });
page.on("pageerror", (e) => {
  console.error("pageerror:", e.message.slice(0, 2000));
  process.exit(1);
});
await page.goto(`http://127.0.0.1:${port}/index.html?w=${W}&sub=${SUB}`, { timeout: 600000 });
await page.waitForFunction(() => typeof window.seek === "function", null, { timeout: 600000 });
const duration = await page.evaluate(() => DURATION);
const total = Math.round(duration * FPS) + 1;
console.log(`rendering ${total} frames, ${W}x${H} at ${FPS} fps, ${SUB} subframes -> ${OUT}`);

function frameBytes(i) {
  return new Promise(async (resolve) => {
    pending = resolve;
    await page.evaluate(async (t) => {
      window.seek(t);
      const c = document.getElementById("stage");
      const gl = c.getContext("webgl2");
      const px = new Uint8Array(c.width * c.height * 4);
      gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
      await fetch("/frame", { method: "POST", body: px });
    }, i / FPS);
  });
}

const segs = Math.ceil(total / SEG);
const t0 = Date.now();
let done = 0;
for (let s = 0; s < segs; s++) {
  const name = path.join(OUT, `seg_${String(s).padStart(4, "0")}.mkv`);
  if (fs.existsSync(name + ".done")) continue;
  const ff = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "-",
    "-vf", "vflip", "-c:v", "ffv1", "-level", "3", "-pix_fmt", "bgr0", name], { stdio: ["pipe", "inherit", "inherit"] });
  const closed = new Promise((r) => ff.on("close", r));
  for (let i = s * SEG; i < Math.min(total, (s + 1) * SEG); i++) {
    const buf = await frameBytes(i);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    done++;
    if (done % 10 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`frame ${i + 1}/${total}  ${(el / done).toFixed(2)} s/frame  eta ${((total - i - 1) * el / done / 60).toFixed(1)} min`);
    }
  }
  ff.stdin.end();
  await closed;
  fs.writeFileSync(name + ".done", "");
}
await browser.close();
server.close();

const list = path.join(OUT, "segments.txt");
fs.writeFileSync(list, Array.from({ length: segs }, (_, s) => `file 'seg_${String(s).padStart(4, "0")}.mkv'`).join("\n") + "\n");
const mp4 = path.join(OUT, args.name || "odyssey-lantern.mp4");
await new Promise((r, j) => {
  const ff = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c:v", "libx264", "-preset", args.preset || "slow",
    "-crf", CRF, "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: "inherit" });
  ff.on("close", (code) => (code ? j(new Error("ffmpeg " + code)) : r()));
});
console.log("wrote", mp4, `in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
