// Does replacing a canvas pattern source with its decoded image change any pixels?
// Fills the same shapes with each texture as a canvas-backed and as an image-backed pattern
// (same transform, blend and alpha as the film uses) and reports the largest channel difference.
// Run only under tools/render_guard.py.  usage: node tools/pattern_equivalence.mjs
import { createCanvas, DOMMatrix } from '@napi-rs/canvas';
import { loadTextures } from '../src/lib/textures.mjs';
import { Painter, ensurePatternImage, warmupPatternFallback } from '../src/lib/draw.mjs';
import { PAL } from '../src/lib/palette.mjs';

if (process.env.BL_GUARDED !== '1') process.exit(2);
const tex = await loadTextures();
await warmupPatternFallback();
const probe = new Painter(createCanvas(4, 4).getContext('2d'), tex);
const sources = {
  paper: tex.paper,
  paint: tex.paint,
  grain: tex.grain,
  inkIndigo: probe.inkPattern(PAL.indigo, 1, false).canvas,
  inkVermilionCoarse: probe.inkPattern(PAL.vermilion, 1, true).canvas,
  paintPatternVermilion: probe.paintPattern(PAL.vermilion),
};
const cases = [
  { m: [0.62, 0, 0, 0.62, 13, 7], op: 'source-over', alpha: 1 },
  { m: [0.5 / 2.2, 0.03, -0.03, 0.5 / 2.2, 400, -90], op: 'source-over', alpha: 0.8 },
  { m: [0.7, 0, 0, 0.7, -200, 50], op: 'multiply', alpha: 0.55 },
];
let worst = 0;
for (const [name, src] of Object.entries(sources)) {
  const img = await ensurePatternImage(src);
  for (const [k, cs] of cases.entries()) {
    const out = [];
    for (const s of [src, img]) {
      const c = createCanvas(960, 540), g = c.getContext('2d');
      g.fillStyle = '#ece3cf';
      g.fillRect(0, 0, 960, 540);
      const pat = g.createPattern(s, 'repeat');
      pat.setTransform(new DOMMatrix(cs.m));
      g.globalCompositeOperation = cs.op;
      g.globalAlpha = cs.alpha;
      g.fillStyle = pat;
      g.beginPath();
      g.ellipse(480, 270, 400, 230, 0.3, 0, Math.PI * 2);
      g.fill();
      out.push(g.getImageData(0, 0, 960, 540).data);
    }
    let max = 0, diffPx = 0;
    for (let i = 0; i < out[0].length; i += 4) {
      const d = Math.max(Math.abs(out[0][i] - out[1][i]), Math.abs(out[0][i + 1] - out[1][i + 1]), Math.abs(out[0][i + 2] - out[1][i + 2]));
      if (d > 0) diffPx++;
      if (d > max) max = d;
    }
    worst = Math.max(worst, max);
    console.log(`${name.padEnd(22)} case ${k}: max channel difference ${max}, pixels differing ${((100 * diffPx) / (960 * 540)).toFixed(3)}%`);
  }
}
console.log('largest difference over all cases:', worst);
