// Render a film, or a range of its frames, to video.
//
//   node tools/render.mjs --film 1 --from 332 --to 674 --out out/t1-phase0
//   node tools/render.mjs --film 2 --w 1920 --sub 1 --out out/t2-draft
//
// Frames are the trailer's own: frame n is drawn at n / fps, with fps 24/1 for Trailer 1
// and 24000/1001 for Trailer 2, read from the shot table. Playwright seeks window.seek(t),
// the page posts the raw band (2.39:1) to this script, and ffmpeg pads it into a 16:9
// frame with black bars, as in the trailers. Segments are kept as they finish, so a
// stopped render resumes. --intermediate ffv1 (default) keeps them lossless; h264 keeps
// them at the final CRF, for long films on a small disk. The finish is H.264, yuv420p,
// CRF 16, BT.709, video only: tools/mux.sh adds the trailer's audio.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { launch, option } from "./browser.mjs";
import { handler } from "./serve.mjs";

const args = process.argv.slice(2);
const film = parseInt(option(args, "film", "1"), 10);
const W = parseInt(option(args, "w", "3840"), 10);
const BH = Math.round((W * 1608) / 3840 / 2) * 2;
const FH = Math.round((W * 9) / 16 / 2) * 2;
const SUB = parseInt(option(args, "sub", "4"), 10);
const SEG = parseInt(option(args, "seg", "48"), 10);
const OUT = path.resolve(option(args, "out", `out/t${film}`));
const CRF = option(args, "crf", "16");
const INTER = option(args, "intermediate", "ffv1");
const table = JSON.parse(fs.readFileSync(new URL(`../shots/film-${film}.json`, import.meta.url)));
const [fpsNum, fpsDen] = table.fps;
const fpsArg = `${fpsNum}/${fpsDen}`;
const from = parseInt(option(args, "from", "0"), 10);
const to = parseInt(option(args, "to", String(table.frames)), 10);
const total = to - from;
fs.mkdirSync(OUT, { recursive: true });

function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ["ignore", "inherit", "inherit"] });
    p.on("close", (code) => (code ? reject(new Error(`${cmd} exited ${code}`)) : resolve()));
  });
}

let pending = null;
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url.startsWith("/frame")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const p = pending;
      pending = null;
      res.writeHead(200);
      res.end("ok");
      if (p) p(Buffer.concat(chunks));
    });
    return;
  }
  handler(req, res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const bench = { film, from, to, frames: total, W, bandH: BH, frameH: FH, sub: SUB, intermediate: INTER, fps: fpsArg, segments: [] };
const browser = await launch();
let failed = null;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => {
    failed = e;
    console.error("pageerror:", e.message.slice(0, 2000));
  });
  page.on("console", (m) => {
    if (m.type() === "error") console.error("console:", m.text());
  });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/index.html?film=${film}&w=${W}&sub=${SUB}&from=${from}&to=${to}`, { timeout: 600000 });
  await page.waitForFunction(() => window.ready !== undefined, null, { timeout: 20000 });
  await page.evaluate(() => window.ready);
  if ((await page.title()).startsWith("ERR")) throw new Error(await page.title());
  const info = await page.evaluate(() => window.filmInfo);
  bench.setupSeconds = (Date.now() - t0) / 1000;
  bench.stones = info.stones;
  console.log(`film ${film}: frames ${from}..${to - 1} (${total}) at ${fpsArg}, band ${W}x${BH} in ${W}x${FH}, ${SUB} subframes, setup ${bench.setupSeconds.toFixed(1)} s`);

  // The page draws frame n and posts it; this waits for both the pixels and the call.
  // A Blob body is about twenty times faster to post than the typed array itself.
  let renderMs = 0;
  async function frameBytes(n) {
    const got = new Promise((resolve) => (pending = resolve));
    const ms = await page.evaluate(async ([n, num, den]) => {
      const a = performance.now();
      window.seek((n * den) / num);
      const c = document.getElementById("stage");
      const gl = c.getContext("webgl2");
      if (!window.__px || window.__px.length !== c.width * c.height * 4) window.__px = new Uint8Array(c.width * c.height * 4);
      gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, window.__px);
      const b = performance.now();
      await fetch("/frame", { method: "POST", body: new Blob([window.__px]) });
      if (window.gc) window.gc();
      return b - a;
    }, [n, fpsNum, fpsDen]);
    renderMs += ms;
    return got;
  }

  const segs = Math.ceil(total / SEG);
  const tStart = Date.now();
  let done = 0;
  const ext = INTER === "h264" ? "mp4" : "mkv";
  const codec = INTER === "h264"
    ? ["-c:v", "libx264", "-preset", "slow", "-crf", CRF, "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"]
    : ["-c:v", "ffv1", "-level", "3", "-slices", "24", "-threads", "10", "-pix_fmt", "bgr0"];
  const vf = `vflip,pad=${W}:${FH}:0:${(FH - BH) / 2}:black` + (INTER === "h264" ? ",scale=out_color_matrix=bt709:out_range=tv" : "");
  for (let s = 0; s < segs; s++) {
    const name = path.join(OUT, `seg_${String(s).padStart(4, "0")}.${ext}`);
    if (fs.existsSync(name + ".done")) continue;
    const a = from + s * SEG;
    const b = Math.min(to, a + SEG);
    const ts = Date.now();
    renderMs = 0;
    const ff = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${BH}`, "-r", fpsArg, "-i", "-",
      "-vf", vf, ...codec, name], { stdio: ["pipe", "inherit", "pipe"] });
    // ffmpeg 9 reports its first 8 KB probe of a raw pipe as a truncated packet; every
    // frame still arrives whole, so that one line is dropped.
    ff.stderr.on("data", (d) => {
      const text = d.toString().split("\n").filter((l) => l && !/^Truncating packet of size \d+ to 8192$/.test(l)).join("\n");
      if (text) process.stderr.write(text + "\n");
    });
    const closed = new Promise((r, j) => ff.on("close", (code) => (code ? j(new Error("ffmpeg " + code)) : r())));
    // ffmpeg encodes frame n while the page draws frame n + 1.
    let draining = null;
    for (let n = a; n < b; n++) {
      if (failed) throw failed;
      const buf = await frameBytes(n);
      if (draining) await draining;
      draining = ff.stdin.write(buf) ? null : new Promise((r) => ff.stdin.once("drain", r));
      done++;
      if (done % 12 === 0) {
        const el = (Date.now() - tStart) / 1000;
        console.log(`frame ${n} (${done}/${total})  ${(el / done).toFixed(2)} s/frame  eta ${((total - done) * el / done / 60).toFixed(1)} min`);
      }
    }
    if (draining) await draining;
    ff.stdin.end();
    await closed;
    fs.writeFileSync(name + ".done", "");
    const seconds = (Date.now() - ts) / 1000;
    bench.segments.push({ seg: s, frames: b - a, seconds, renderMs: Math.round(renderMs), bytes: fs.statSync(name).size });
  }
  bench.wallSeconds = (Date.now() - tStart) / 1000;
} finally {
  await browser.close();
  server.close();
}
if (failed) throw failed;

// Join the segments and encode the finish.
const list = path.join(OUT, "segments.txt");
const ext = INTER === "h264" ? "mp4" : "mkv";
const names = fs.readdirSync(OUT).filter((f) => f.startsWith("seg_") && f.endsWith("." + ext)).sort();
fs.writeFileSync(list, names.map((f) => `file '${f}'`).join("\n") + "\n");
const video = path.join(OUT, "video.mp4");
const tEnc = Date.now();
if (INTER === "h264") {
  await run("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", video]);
} else {
  await run("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-r", fpsArg,
    "-vf", "scale=out_color_matrix=bt709:out_range=tv", "-c:v", "libx264", "-preset", option(args, "preset", "slow"), "-crf", CRF,
    "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", video]);
}
bench.encodeSeconds = (Date.now() - tEnc) / 1000;
const segBytes = names.reduce((acc, f) => acc + fs.statSync(path.join(OUT, f)).size, 0);
bench.intermediateBytes = segBytes;
bench.videoBytes = fs.statSync(video).size;
const rendered = bench.segments.reduce((a, s) => a + s.frames, 0);
if (rendered) {
  const secs = bench.segments.reduce((a, s) => a + s.seconds, 0);
  bench.secondsPerFrame = secs / rendered;
  bench.renderMsPerFrame = bench.segments.reduce((a, s) => a + s.renderMs, 0) / rendered;
  bench.intermediateBytesPerFrame = bench.segments.reduce((a, s) => a + s.bytes, 0) / rendered;
}
fs.writeFileSync(path.join(OUT, "bench.json"), JSON.stringify(bench, null, 2));
console.log(`wrote ${video}: ${(bench.videoBytes / 1e6).toFixed(1)} MB; intermediates ${(segBytes / 1e9).toFixed(2)} GB;` +
  (bench.secondsPerFrame ? ` ${bench.secondsPerFrame.toFixed(2)} s/frame (GPU and readback ${bench.renderMsPerFrame.toFixed(0)} ms)` : "") +
  `; final encode ${bench.encodeSeconds.toFixed(0)} s`);
