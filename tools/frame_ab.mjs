// One frame rendered twice: with decoded-image pattern sources (the fix) and with the original
// canvas pattern sources (the leaking path, reset per frame). Reports the pixel difference and
// writes both frames plus a zoomed crop. Run only under tools/render_guard.py with a tight limit.
// usage: node tools/frame_ab.mjs <frame> <outPrefix> [cropX cropY cropW cropH]
import fs from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { createFilm } from '../src/film.mjs';
import { Painter } from '../src/lib/draw.mjs';
if (process.env.BL_GUARDED !== '1') process.exit(2);
const [fArg, prefix, cx = 700, cy = 300, cw = 480, ch = 270] = process.argv.slice(2);
const f = +fArg;
const film = await createFilm({ scale: 1 });
const a = Buffer.from((await film.render(f)).data());
fs.writeFileSync(prefix + '_image.png', film.canvas.toBuffer('image/png'));
// the original path: patterns straight from the source canvases
const orig = Painter.prototype.pattern;
Painter.prototype.pattern = function (canvas, m = [1, 0, 0, 1, 0, 0], scale = 1) {
  if (!this._cpats) this._cpats = new Map();
  let pat = this._cpats.get(canvas);
  if (!pat) {
    pat = this.ctx.createPattern(canvas, 'repeat');
    this._cpats.set(canvas, pat);
  }
  pat.setTransform(new DOMMatrix([m[0] * scale, m[1] * scale, m[2] * scale, m[3] * scale, m[4], m[5]]));
  return pat;
};
const { DOMMatrix } = await import('@napi-rs/canvas');
globalThis.DOMMatrix = DOMMatrix;
const film2 = await createFilm({ scale: 1 });
const b = Buffer.from((await film2.render(f)).data());
fs.writeFileSync(prefix + '_canvas.png', film2.canvas.toBuffer('image/png'));
Painter.prototype.pattern = orig;
let sum = 0, max = 0, big = 0, any = 0;
for (let i = 0; i < a.length; i += 4) {
  const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
  sum += d; if (d > max) max = d; if (d > 24) big++; if (d > 0) any++;
}
const n = a.length / 4;
console.log(`frame ${f}: mean ${(sum / n).toFixed(2)}, max ${max}, pixels differing ${((100 * any) / n).toFixed(1)}%, >24: ${((100 * big) / n).toFixed(3)}%`);
// side-by-side crop at 2x for a visual check
const crop = createCanvas(+cw * 4, +ch * 2), g = crop.getContext('2d');
g.imageSmoothingEnabled = false;
g.drawImage(film.canvas, +cx, +cy, +cw, +ch, 0, 0, +cw * 2, +ch * 2);
g.drawImage(film2.canvas, +cx, +cy, +cw, +ch, +cw * 2, 0, +cw * 2, +ch * 2);
fs.writeFileSync(prefix + '_crop.png', crop.toBuffer('image/png'));
