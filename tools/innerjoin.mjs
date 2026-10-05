// Compare the two sides of an internal handoff at the same frame.
// usage: node tools/innerjoin.mjs <frame> <moduleA:fn> <moduleB:fn> [scale]
import { createCanvas } from '@napi-rs/canvas';
import { loadTextures } from '../src/lib/textures.mjs';
import { Painter, drawWithPatterns, ensurePatternImage, warmupPatternFallback } from '../src/lib/draw.mjs';
const [f, a, b, sc] = process.argv.slice(2);
const scale = parseFloat(sc || '0.4');
const tex = await loadTextures();
await warmupPatternFallback();
for (const src of Object.values(tex)) await ensurePatternImage(src);
async function render(spec) {
  const [mod, fn] = spec.split(':');
  const m = await import('../src/scenes/' + mod + '.mjs');
  const c = createCanvas(Math.round(1920 * scale), Math.round(1080 * scale));
  const ctx = c.getContext('2d');
  const pt = new Painter(ctx, tex, { W: 1920, H: 1080 });
  // every attempt starts clean: a pattern miss can interrupt the draw part way through
  await drawWithPatterns(() => {
    ctx.reset();
    pt.ctx = ctx;
    pt.zoom = 1;
    pt.lineComp = 0;
    pt.frame = +f;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#ece3cf';
    ctx.fillRect(0, 0, 1920, 1080);
    m[fn](pt, +f / 24);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    pt.finish();
  });
  return Buffer.from(c.data());
}
const da = await render(a), db = await render(b);
let sum = 0, big = 0;
for (let i = 0; i < da.length; i += 4) {
  const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
  sum += d;
  if (d > 24) big++;
}
const n = da.length / 4;
console.log(`frame ${f} (${(+f / 24).toFixed(2)}s) ${a} vs ${b}: mean ${(sum / n).toFixed(2)}, >24: ${((100 * big) / n).toFixed(2)}%`);
