// Procedural, seeded, tileable textures. Generated once and cached as PNG so
// every render (preview, animatic, final, any worker) uses identical pixels.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash2, mulberry32, clamp } from './math.mjs';
import { PAL } from './palette.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE = path.join(ROOT, 'cache');
fs.mkdirSync(CACHE, { recursive: true });

// periodic value noise on an integer lattice; periods Px (x) and Py (y) must equal
// the number of lattice cells across the texture so it tiles on both axes
function pnoise(x, y, Px, seed, Py = Px) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const mx = (a) => ((a % Px) + Px) % Px, my = (a) => ((a % Py) + Py) % Py;
  const a = hash2(mx(xi), my(yi), seed), b = hash2(mx(xi + 1), my(yi), seed);
  const c = hash2(mx(xi), my(yi + 1), seed), d = hash2(mx(xi + 1), my(yi + 1), seed);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

function pfbm(x, y, size, basePeriod, seed, oct) {
  let s = 0, amp = 0.5, n = 0, P = basePeriod;
  for (let i = 0; i < oct; i++) {
    s += amp * pnoise((x / size) * P, (y / size) * P, P, seed + i * 31);
    n += amp;
    amp *= 0.5;
    P *= 2;
  }
  return s / n;
}

function genPaper(S = 2048, seed = 7) {
  const c = createCanvas(S, S);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const d = img.data;
  const base = PAL.paper;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const mott = pfbm(x, y, S, 3, seed, 6) - 0.5; // large mottling
      const fine = pnoise((x / S) * 512, (y / S) * 512, 512, seed + 9) - 0.5; // tooth
      const fib = pnoise((x / S) * 64, (y / S) * 900, 64, seed + 3, 900) - 0.5; // vertical-ish fibre streaks
      const fib2 = pnoise((x / S) * 700, (y / S) * 48, 700, seed + 4, 48) - 0.5;
      let k = mott * 9 + fine * 6 + (fib * fib * Math.sign(fib)) * 10 + (fib2 * fib2 * Math.sign(fib2)) * 7;
      const warm = pfbm(x, y, S, 3, seed + 77, 3) - 0.5; // foxing / age tint
      const i = (y * S + x) * 4;
      d[i] = clamp(base[0] + k + warm * 10, 0, 255);
      d[i + 1] = clamp(base[1] + k + warm * 4, 0, 255);
      d[i + 2] = clamp(base[2] + k - warm * 12, 0, 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const r = mulberry32(seed);
  ctx.lineCap = 'round';
  for (let k = 0; k < 900; k++) {
    const x = r() * S, y = r() * S, L = 6 + r() * 26, a = r() * Math.PI;
    ctx.strokeStyle = r() < 0.5 ? 'rgba(120,100,70,0.10)' : 'rgba(255,250,240,0.22)';
    ctx.lineWidth = 0.6 + r() * 0.9;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + oy);
      ctx.quadraticCurveTo(x + ox + Math.cos(a + 0.6) * L * 0.5, y + oy + Math.sin(a + 0.6) * L * 0.5, x + ox + Math.cos(a) * L, y + oy + Math.sin(a) * L);
      ctx.stroke();
    }
  }
  return c;
}

// alpha speckle used to break up ink and charcoal (white = keep, transparent = hole)
function genGrain(S = 512, seed = 11, holes = 0.16) {
  const c = createCanvas(S, S);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const d = img.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const a = pnoise((x / S) * 256, (y / S) * 256, 256, seed);
      const b = pnoise((x / S) * 64, (y / S) * 64, 64, seed + 5);
      const c2 = pnoise((x / S) * 24, (y / S) * 96, 24, seed + 8, 96);
      let v = 0.62 * a + 0.28 * b + 0.1 * c2;
      let alpha = clamp((v - holes) / 0.22, 0, 1);
      alpha = 0.55 + 0.45 * alpha;
      if (v < holes * 0.85) alpha = 0.08;
      const i = (y * S + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = alpha * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// gouache / riso density: greyscale around mid, used with multiply at low alpha
function genPaint(S = 1024, seed = 23) {
  const c = createCanvas(S, S);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const d = img.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const streak = pnoise((x / S) * 12, (y / S) * 160, 12, seed, 160) - 0.5;
      const blot = pfbm(x, y, S, 6, seed + 3, 4) - 0.5;
      const tooth = pnoise((x / S) * 384, (y / S) * 384, 384, seed + 6) - 0.5;
      const v = clamp(232 + streak * 30 + blot * 40 + tooth * 22, 0, 255);
      const i = (y * S + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const cache = {};
async function cached(name, gen) {
  if (cache[name]) return cache[name];
  const f = path.join(CACHE, name + '.png');
  let img;
  if (fs.existsSync(f)) {
    img = await loadImage(fs.readFileSync(f));
  } else {
    const c = gen();
    fs.writeFileSync(f, c.toBuffer('image/png'));
    img = await loadImage(fs.readFileSync(f));
  }
  const c = createCanvas(img.width, img.height);
  c.getContext('2d').drawImage(img, 0, 0);
  cache[name] = c;
  return c;
}

export async function loadTextures() {
  return {
    paper: await cached('paper_v3', () => genPaper()),
    grain: await cached('grain_v2', () => genGrain()),
    grainCoarse: await cached('grain_coarse_v2', () => genGrain(512, 29, 0.3)),
    paint: await cached('paint_v2', () => genPaint()),
  };
}
