// Render the film: headless Chromium pages draw frames in parallel (each frame averages
// four motion-blur subframes), and the frames are piped in order to ffmpeg, which encodes
// H.264 (yuv420p, CRF 16) and muxes the soundtrack.
//
//   node tools/render.mjs                        full film -> out/one-arcminute.mp4
//   node tools/render.mjs --from 0 --to 600      a frame range (end exclusive), for tests
//   node tools/render.mjs --scale 0.5 --crf 24   a quick half-size preview
//   node tools/render.mjs --res 2 --out out/one-arcminute-4k.mp4   native 3840 x 2160
//   options: --audio out/soundtrack.wav  --out <file>  --workers 4  --fps 60  --no-blur  --silent

import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { launch, option, ROOT } from "./lib.mjs";

const args = process.argv.slice(2);
const out = resolve(ROOT, option(args, "out", "out/one-arcminute.mp4"));
const audioPath = resolve(ROOT, option(args, "audio", "out/soundtrack.wav"));
const workers = Number(option(args, "workers", 4));
const crf = option(args, "crf", "16");
const preset = option(args, "preset", "slow");
const scale = Number(option(args, "scale", 1));
const blur = !args.includes("--no-blur");
const res = Number(option(args, "res", 1));
mkdirSync(dirname(out), { recursive: true });

const browser = await launch();
const pages = [];
for (let i = 0; i < workers; i++) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    console.error("page error:", error.message);
    process.exitCode = 1;
  });
  await page.goto(pathToFileURL(resolve(ROOT, "index.html")).href + `?render&res=${res}${blur ? "" : "&blur=0"}`);
  await page.evaluate(() => window.film.ready);
  pages.push(page);
}
const info = await pages[0].evaluate(() => ({ fps: window.film.fps, duration: window.film.duration }));
const fps = Number(option(args, "fps", info.fps));
const frames = Math.round(info.duration * fps);
const from = Number(option(args, "from", 0));
const to = Math.min(Number(option(args, "to", frames)), frames);
const total = to - from;
const hasAudio = existsSync(audioPath) && !args.includes("--silent");
if (!hasAudio) console.log("no soundtrack: rendering silent (run node tools/sound.mjs first)");

const vf = [];
if (scale !== 1) vf.push(`scale=${Math.round(1920 * res * scale)}:${Math.round(1080 * res * scale)}:flags=lanczos`);
vf.push("scale=in_range=full:out_range=tv:out_color_matrix=bt709", "format=yuv420p");
const ff = ["-y", "-loglevel", "warning", "-thread_queue_size", "64", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "pipe:0"];
if (hasAudio) ff.push("-ss", String(from / fps), "-i", audioPath);
ff.push(
  "-vf", vf.join(","),
  "-c:v", "libx264", "-preset", preset, "-crf", crf, "-tune", "animation",
  "-profile:v", "high", ...(res > 1 ? ["-level", "5.2"] : []), "-pix_fmt", "yuv420p",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
  "-movflags", "+faststart",
);
if (hasAudio) ff.push("-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(total / fps));
else ff.push("-an");
ff.push(out);

const ffmpeg = spawn("ffmpeg", ff, { stdio: ["pipe", "inherit", "inherit"] });
const finished = new Promise((done, fail) => {
  ffmpeg.on("exit", (code) => (code === 0 ? done() : fail(new Error(`ffmpeg exited ${code}`))));
  ffmpeg.stdin.on("error", fail);
});

const ready = new Map();
let nextWrite = from;
let nextTake = from;
const started = Date.now();
let writing = Promise.resolve();

function flush() {
  writing = writing.then(async () => {
    while (ready.has(nextWrite)) {
      const buf = ready.get(nextWrite);
      ready.delete(nextWrite);
      nextWrite++;
      if (!ffmpeg.stdin.write(buf)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
      const done = nextWrite - from;
      if (done % 300 === 0 || done === total) {
        const el = (Date.now() - started) / 1000;
        console.log(`frame ${done}/${total}  ${el.toFixed(0)} s elapsed, ~${((el / done) * (total - done)).toFixed(0)} s left`);
      }
    }
  });
  return writing;
}

async function work(page) {
  for (;;) {
    // keep workers from running too far ahead of the writer
    while (nextTake - nextWrite > workers * 6) await new Promise((r) => setTimeout(r, 5));
    if (nextTake >= to) return;
    const i = nextTake++;
    const data = await page.evaluate((t) => {
      window.seek(t);
      return document.getElementById("stage").toDataURL("image/png");
    }, i / fps);
    ready.set(i, Buffer.from(data.slice(data.indexOf(",") + 1), "base64"));
    flush();
  }
}

await Promise.all(pages.map(work));
await flush();
ffmpeg.stdin.end();
await finished;
await browser.close();
console.log(`wrote ${out} in ${((Date.now() - started) / 1000).toFixed(0)} s`);
