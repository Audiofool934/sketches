// Render stills: node src/still.mjs --t 12.5,30,41 [--scale 0.5] [--animatic] [--out dir] [--only scene]
// Also: --range a:b:step renders a strip of times, --sheet name.png packs them into a contact sheet.
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { createFilm, FPS } from './film.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf('--' + k);
  if (i < 0) return d;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const scale = parseFloat(opt('scale', 0.5));
const animatic = !!opt('animatic', false);
const out = opt('out', 'storyboard/stills');
const only = opt('only', null);
fs.mkdirSync(out, { recursive: true });

let times = [];
if (opt('t', null)) times = String(opt('t')).split(',').map(Number);
if (opt('range', null)) {
  const [a, b, st] = String(opt('range')).split(':').map(Number);
  for (let t = a; t <= b + 1e-9; t += st) times.push(+t.toFixed(4));
}
const film = await createFilm({ scale, animatic, only });
const sheetName = opt('sheet', null);
const cols = parseInt(opt('cols', 4));
const tiles = [];
for (const t of times) {
  const f = Math.round(t * FPS);
  const t0 = performance.now();
  const c = await film.render(f);
  const ms = (performance.now() - t0).toFixed(0);
  if (sheetName) {
    const cp = createCanvas(c.width, c.height);
    cp.getContext('2d').drawImage(c, 0, 0);
    tiles.push({ c: cp, t });
  } else {
    const name = path.join(out, `t${t.toFixed(2).padStart(7, '0')}.png`);
    fs.writeFileSync(name, c.toBuffer('image/png'));
  }
  process.stdout.write(`t=${t} (${ms}ms) `);
}
if (sheetName) {
  const tw = tiles[0].c.width, th = tiles[0].c.height;
  const rows = Math.ceil(tiles.length / cols);
  const pad = 6, lab = 22;
  const sheet = createCanvas(cols * (tw + pad) + pad, rows * (th + pad + lab) + pad);
  const g = sheet.getContext('2d');
  g.fillStyle = '#222';
  g.fillRect(0, 0, sheet.width, sheet.height);
  tiles.forEach((tl, i) => {
    const x = pad + (i % cols) * (tw + pad), y = pad + Math.floor(i / cols) * (th + pad + lab);
    g.drawImage(tl.c, x, y + lab);
    g.fillStyle = '#ddd';
    g.font = '16px sans-serif';
    g.fillText(`${tl.t.toFixed(2)}s  f${Math.round(tl.t * FPS)}`, x + 4, y + 16);
  });
  fs.writeFileSync(path.join(out, sheetName), sheet.toBuffer('image/png'));
  console.log('\nsheet', path.join(out, sheetName));
} else console.log();
