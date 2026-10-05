// Which canvas primitive retains native memory? Each test repeats one operation and reports the
// change in resident memory. Run only under tools/render_guard.py with a tight limit.
// usage: node tools/memtest_primitives.mjs [testName ...] [--n 60]
import { createCanvas, DOMMatrix } from '@napi-rs/canvas';
import { loadTextures } from '../src/lib/textures.mjs';

if (process.env.BL_GUARDED !== '1') {
  console.error('memtest: run this under tools/render_guard.py');
  process.exit(2);
}
const args = process.argv.slice(2);
const ni = args.indexOf('--n');
const N = ni >= 0 ? parseInt(args[ni + 1]) : 60;
const only = args.filter((a, i) => !a.startsWith('--') && !(ni >= 0 && i === ni + 1));
const MB = 1 << 20;
const tex = await loadTextures();
const c = createCanvas(1920, 1080);
const ctx = c.getContext('2d');
const rss = () => process.memoryUsage().rss / MB;
const bigPoly = (cx, cy, R, n = 400) => {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = R * (1 + 0.1 * Math.sin(i * 0.7));
    i ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
};
const pat = ctx.createPattern(tex.paper, 'repeat');
// the same texture as an immutable image instead of a canvas
const { loadImage } = await import('@napi-rs/canvas');
const paperImg = await loadImage(await tex.paper.encode('png'));
const patImg = ctx.createPattern(paperImg, 'repeat');
const gc = () => global.gc && global.gc();
const tests = {
  patternFillThenGc: (i, n) => { ctx.fillStyle = pat; ctx.fillRect(0, 0, 1920, 1080); if (i === n - 1) gc(); },
  imagePatternFill: () => { ctx.fillStyle = patImg; ctx.fillRect(0, 0, 1920, 1080); },
  imagePatternSetTransformFill: (i) => { patImg.setTransform(new DOMMatrix([0.62, 0.01 * i, 0, 0.62, i, 2 * i])); ctx.fillStyle = patImg; ctx.fillRect(0, 0, 1920, 1080); },
  getImageDataThenGc: (i, n) => { ctx.getImageData(0, 0, 1920, 1080); if (i === n - 1) gc(); },
  patternFill: () => { ctx.fillStyle = pat; ctx.fillRect(0, 0, 1920, 1080); },
  patternSetTransformFill: (i) => { pat.setTransform(new DOMMatrix([0.62, 0.01 * i, 0, 0.62, i, 2 * i])); ctx.fillStyle = pat; ctx.fillRect(0, 0, 1920, 1080); },
  patternSetTransformOnly: (i) => { pat.setTransform(new DOMMatrix([0.62, 0.01 * i, 0, 0.62, i, 2 * i])); },
  patternSetTransformPathFill: (i) => { pat.setTransform(new DOMMatrix([0.62, 0, 0, 0.62, i, 2 * i])); ctx.fillStyle = pat; bigPoly(960, 540, 300); ctx.fill(); },
  newPatternFill: () => { const p = ctx.createPattern(tex.paper, 'repeat'); ctx.fillStyle = p; ctx.fillRect(0, 0, 1920, 1080); },
  blurSmall: (i) => { ctx.save(); ctx.filter = `blur(${4 + (i % 5)}px)`; ctx.fillStyle = 'rgba(0,0,0,0.2)'; bigPoly(960, 540, 300); ctx.fill(); ctx.restore(); },
  blurHuge: (i) => { ctx.save(); ctx.filter = `blur(${10 + (i % 5)}px)`; ctx.fillStyle = 'rgba(0,0,0,0.2)'; bigPoly(960, 540, 6000); ctx.fill(); ctx.restore(); },
  blurHugeScaled: (i) => { ctx.save(); ctx.setTransform(2.5, 0, 0, 2.5, -3000, -2000); ctx.filter = `blur(${20 + (i % 5)}px)`; ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-3000, -3000, 9000, 7000); ctx.restore(); },
  clipComplex: () => { ctx.save(); bigPoly(960, 540, 500, 2000); ctx.clip(); ctx.fillStyle = '#933'; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); },
  getImageData: () => { ctx.getImageData(0, 0, 1920, 1080); },
  drawLayer: () => { ctx.drawImage(tex.paper, 0, 0); },
  multiplyFill: () => { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = pat; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); },
};
for (const [name, fn] of Object.entries(tests)) {
  if (only.length && !only.includes(name)) continue;
  const r0 = rss();
  const t0 = Date.now();
  for (let i = 0; i < N; i++) fn(i, N);
  const r1 = rss();
  await new Promise((r) => setTimeout(r, 300));
  const r2 = rss();
  console.log(`${name.padEnd(28)} n=${N}  rss ${r0.toFixed(0)} -> ${r1.toFixed(0)} MB (+${(r1 - r0).toFixed(0)}, ${((r1 - r0) / N).toFixed(2)} MB/op), after 0.3 s ${r2.toFixed(0)} MB, ${(Date.now() - t0)} ms`);
}
