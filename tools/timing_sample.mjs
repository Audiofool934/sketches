// Estimate full-render time: render every Nth frame at 1080p including rasterization (the pixel
// readback forces it) and report seconds per frame by movement and in total.
// Run only under tools/render_guard.py.  usage: node tools/timing_sample.mjs [stride]
import { createFilm, FRAMES, FPS } from '../src/film.mjs';
import { PLAN } from '../src/timeline.mjs';

if (process.env.BL_GUARDED !== '1') process.exit(2);
const stride = parseInt(process.argv[2] || '60');
const film = await createFilm({ scale: 1 });
const turn = () => new Promise((r) => setImmediate(r));
const samples = [];
for (let f = Math.floor(stride / 2); f < FRAMES; f += stride) {
  const t0 = performance.now();
  await film.render(f);
  film.ctx.getImageData(0, 0, film.canvas.width, film.canvas.height);
  samples.push({ f, s: (performance.now() - t0) / 1000 });
  await turn();
}
const byPart = new Map();
for (const { f, s } of samples) {
  const t = f / FPS;
  const part = PLAN.filter((p) => p.id !== 'T11').find((p) => t >= p.t0 && t < p.t1) || { id: '?' };
  const e = byPart.get(part.id) || { n: 0, s: 0, max: 0 };
  e.n++; e.s += s; e.max = Math.max(e.max, s);
  byPart.set(part.id, e);
}
for (const [id, e] of byPart) console.log(`${id.padEnd(4)} ${e.n} samples, mean ${(e.s / e.n).toFixed(2)} s/frame, max ${e.max.toFixed(2)}`);
const mean = samples.reduce((a, b) => a + b.s, 0) / samples.length;
console.log(`all: ${samples.length} samples, mean ${mean.toFixed(2)} s/frame -> ${((mean * FRAMES) / 60).toFixed(0)} worker-minutes for ${FRAMES} frames (encoding runs alongside)`);
