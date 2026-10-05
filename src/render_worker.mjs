// Render a contiguous frame range and pipe raw RGBA into ffmpeg.
// usage: node src/render_worker.mjs --start 0 --end 600 --scale 1 --out seg.mp4 [--animatic] [--crf 16]
import { spawn } from 'node:child_process';
import { createFilm, FPS } from './film.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf('--' + k);
  if (i < 0) return d;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const start = parseInt(opt('start', 0)), end = parseInt(opt('end', 10));
const scale = parseFloat(opt('scale', 1));
const animatic = !!opt('animatic', false);
const out = opt('out', 'seg.mp4');
const crf = opt('crf', '16');
const preset = opt('preset', 'slow');

const film = await createFilm({ scale, animatic });
const W = film.canvas.width, H = film.canvas.height;
const ff = spawn('ffmpeg', [
  '-loglevel', 'error', '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-tune', 'film',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '48', '-bf', '2',
  // Four encoder threads: at x264's default (15 here) each encoder held about 890 MB; with 4 it
  // held about 690 MB, with the same SSIM against the source and still far faster than rendering.
  '-threads', '4',
  '-x264-params', 'aq-mode=3',
  out,
], { stdio: ['pipe', 'inherit', 'inherit'] });

// Stopped by the render driver or the guard: take this worker's encoder down with it. The segment
// is left unfinished and without its .ok mark, so a later resume renders it again.
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    try { ff.kill('SIGKILL'); } catch { /* already gone */ }
    process.exit(sig === 'SIGTERM' ? 143 : 130);
  });
}

let encoderFailed = null;
ff.on('error', (err) => { encoderFailed = err; });
ff.stdin.on('error', (err) => { encoderFailed = err; });
const write = (buf) => new Promise((res, rej) => {
  if (encoderFailed) return rej(encoderFailed);
  const onErr = (err) => { encoderFailed = err; rej(err); };
  ff.stdin.once('error', onErr);
  const done = () => { ff.stdin.off('error', onErr); res(); };
  if (ff.stdin.write(buf)) done();
  else ff.stdin.once('drain', done);
});
const turn = () => new Promise((res) => setImmediate(res));
const t0 = Date.now();
try {
  for (let f = start; f < end; f++) {
    if (encoderFailed || ff.exitCode != null) break;
    await film.render(f);
    // getImageData gives straight RGBA. The native copy is only released when the event loop
    // turns, and stdin.write often does not turn when ffmpeg keeps up, so yield once per frame.
    const img = film.ctx.getImageData(0, 0, W, H);
    const buf = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
    await write(buf);
    await turn();
    if ((f - start) % 48 === 0) process.stderr.write(`[${start}-${end}] f${f} ${(((Date.now() - t0) / 1000) / (f - start + 1)).toFixed(2)}s/frame\n`);
  }
} catch (err) {
  encoderFailed = encoderFailed || err;
}
if (encoderFailed || (ff.exitCode != null && ff.exitCode !== 0)) {
  try { ff.kill('SIGTERM'); } catch {}
  process.stderr.write(`[${start}-${end}] encoder failed: ${encoderFailed ? encoderFailed.message : 'exit ' + ff.exitCode}\n`);
  process.exit(1);
}
ff.stdin.end();
const code = await new Promise((res) => ff.on('close', res));
if (code !== 0) {
  process.stderr.write(`[${start}-${end}] encoder exit ${code}\n`);
  process.exit(code || 1);
}
process.stderr.write(`[${start}-${end}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
