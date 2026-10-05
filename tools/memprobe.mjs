// Memory probe: render a frame range in one process and log memory use and cache sizes.
// Run it only under tools/render_guard.py (it refuses otherwise).
// usage: node [--expose-gc] tools/memprobe.mjs --start F --end F --out log.jsonl
//          [--scale 1] [--every 4] [--gc] [--encode out.mp4 --threads N] [--raw frames.rgba]
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createFilm, FPS } from '../src/film.mjs';
import { maskStats } from '../src/lib/trace.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf('--' + k);
  if (i < 0) return d;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
if (process.env.BL_GUARDED !== '1') {
  console.error('memprobe: run this under tools/render_guard.py');
  process.exit(2);
}
const start = parseInt(opt('start', 0)), end = parseInt(opt('end', 24));
const scale = parseFloat(opt('scale', 1));
const every = parseInt(opt('every', 4));
const doGc = !!opt('gc', false);
const encode = opt('encode', null);
const out = opt('out', 'memprobe.jsonl');
const MB = 1 << 20;

const t0 = Date.now();
const film = await createFilm({ scale });
const W = film.canvas.width, H = film.canvas.height;
let ff = null;
if (encode) {
  const threads = opt('threads', null);
  ff = spawn('ffmpeg', [
    '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'film',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '48', '-bf', '2',
    ...(threads ? ['-threads', String(threads)] : []),
    '-x264-params', 'aq-mode=3',
    encode,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
}
const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));
const turn = () => new Promise((res) => setImmediate(res));
const log = fs.openSync(out, 'w');
function sample(f) {
  if (doGc && global.gc) global.gc();
  const m = process.memoryUsage();
  const rec = {
    frame: f, t: +(f / FPS).toFixed(2), sec: +((Date.now() - t0) / 1000).toFixed(1),
    rssMB: +(m.rss / MB).toFixed(1), heapMB: +(m.heapUsed / MB).toFixed(1), externalMB: +(m.external / MB).toFixed(1), arrayBuffersMB: +(m.arrayBuffers / MB).toFixed(1),
    masks: maskStats().n, maskMB: +(maskStats().bytes / MB).toFixed(1),
    ...(() => {
      const s = film.pt.stats();
      return { patterns: s.patterns, patternMB: +(s.patternBytes / MB).toFixed(1), canvasPatterns: s.canvasPatterns, layers: s.layers, layerMB: +(s.layerBytes / MB).toFixed(1) };
    })(),
  };
  fs.writeSync(log, JSON.stringify(rec) + '\n');
}
const rawOut = opt('raw', null) ? fs.openSync(opt('raw'), 'w') : null;
for (let f = start; f < end; f++) {
  await film.render(f);
  if (rawOut) {
    const img = film.ctx.getImageData(0, 0, W, H);
    fs.writeSync(rawOut, Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength));
  }
  if (ff) {
    const img = film.ctx.getImageData(0, 0, W, H);
    const buf = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
    await write(buf);
  }
  await turn();
  if ((f - start) % every === 0 || f === end - 1) sample(f);
}
if (ff) {
  ff.stdin.end();
  await new Promise((res) => ff.on('close', res));
}
fs.closeSync(log);
