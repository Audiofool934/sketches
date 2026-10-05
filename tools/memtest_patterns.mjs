// Pattern sources compared with rasterization forced: this canvas records draw calls and only
// rasterizes on readback, so each "frame" here is F pattern fills, a full readback, and a reset.
// Reports time per phase and resident memory; the guard reads the kernel footprint.
// Run only under tools/render_guard.py.
// usage: [NO_RESET=1] node tools/memtest_patterns.mjs canvas|image|imagedata [frames] [fills]
import { createCanvas, loadImage, DOMMatrix, ImageData } from '@napi-rs/canvas';
import { loadTextures } from '../src/lib/textures.mjs';

if (process.env.BL_GUARDED !== '1') process.exit(2);
const [kind, framesArg, fillsArg] = process.argv.slice(2);
const frames = parseInt(framesArg || '5'), fills = parseInt(fillsArg || '60');
const tex = await loadTextures();
const c = createCanvas(1920, 1080), ctx = c.getContext('2d');
let src;
if (kind === 'canvas') src = tex.paper;
else if (kind === 'image') src = await loadImage(tex.paper.toBuffer('image/png'));
else if (kind === 'imagedata') src = tex.paper.getContext('2d').getImageData(0, 0, tex.paper.width, tex.paper.height);
else throw new Error('kind?');
const pat = ctx.createPattern(src, 'repeat');
const MB = 1 << 20, rss = () => (process.memoryUsage().rss / MB).toFixed(0);
const tick = () => new Promise((r) => setImmediate(r));
for (let f = 0; f < frames; f++) {
  const t0 = performance.now();
  if (!process.env.NO_RESET) ctx.reset();
  else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#ece3cf"; ctx.fillRect(0, 0, 1920, 1080); }
  for (let i = 0; i < fills; i++) {
    pat.setTransform(new DOMMatrix([0.62, 0.002 * i, 0, 0.62, 7 * i + f, 3 * i]));
    ctx.fillStyle = pat;
    ctx.beginPath();
    ctx.arc(960 + 300 * Math.cos(i), 540 + 200 * Math.sin(i), 420, 0, Math.PI * 2);
    ctx.fill();
  }
  const t1 = performance.now();
  const d = ctx.getImageData(0, 0, 1920, 1080).data;
  const t2 = performance.now();
  await tick();
  console.log(`${kind.padEnd(9)} frame ${f}: record ${(t1 - t0).toFixed(0)} ms, rasterize+readback ${(t2 - t1).toFixed(0)} ms, rss ${rss()} MB, px ${d[0]},${d[1]},${d[2]}`);
}
await new Promise((r) => setTimeout(r, 1200));
