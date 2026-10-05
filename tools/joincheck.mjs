// Render the same frame through two scene modules and report the pixel difference.
// usage: node tools/joincheck.mjs <frame> <sceneA> <sceneB> [scale]
import fs from 'node:fs';
import { createFilm } from '../src/film.mjs';
const [f, a, b, sc] = process.argv.slice(2);
const scale = parseFloat(sc || '0.5');
const A = await createFilm({ scale, only: a });
const ca = await A.render(+f);
const da = Buffer.from(ca.data());
const B = await createFilm({ scale, only: b });
const cb = await B.render(+f);
const db = Buffer.from(cb.data());
let sum = 0, max = 0, big = 0;
for (let i = 0; i < da.length; i += 4) {
  const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
  sum += d; if (d > max) max = d; if (d > 24) big++;
}
const n = da.length / 4;
console.log(`frame ${f} ${a} vs ${b}: mean abs diff ${(sum / n).toFixed(2)}, max ${max.toFixed(0)}, pixels >24: ${(100 * big / n).toFixed(2)}%`);
const out = process.env.OUT;
if (out) {
  fs.writeFileSync(out + '_a.png', ca.toBuffer('image/png'));
  fs.writeFileSync(out + '_b.png', cb.toBuffer('image/png'));
}
