// T01 → Movement II → T02: the crease travels out of the pressed sheet, raises
// folds that become a city, the protagonist stands up out of the line, and the
// city turns out to be lying in the companion's palm.
//
// The companion's left hand lies palm-up along the bed, fingers toward the foot
// (east). The crease IS the palm's fate line; it ends at the base of the gap
// between the middle and ring fingers, which later becomes the doorway.
import { V, clamp, lerp, seg, es, ease, catmull, resample, mulberry32, noise1, noise2, cumLengths, pointAt, tangentAt, subPoly, onN, TAU } from '../lib/math.mjs';
import { PAL, rgba, mixc } from '../lib/palette.mjs';
import { capsule } from '../lib/draw.mjs';
import { handGeom, drawHand } from '../lib/hand.mjs';
import { REST, drawProtagonist, hookPts } from '../lib/rig.mjs';
import { traceUnion } from '../lib/trace.mjs';
import { M } from '../timeline.mjs';
import { DOOR, doorFrame, drawCorridorInDoor, drawCreaseColumns, splitAmt, straighten, doorPt } from './a_door.mjs';
import { projUV } from '../lib/corridor.mjs';

export const HAND_C = { x: 1230, y: 710, rot: Math.PI / 2, scale: 500, mirror: 1 };
export const palmTf = ([x, y]) => [HAND_C.x - y * HAND_C.scale, HAND_C.y + x * HAND_C.scale];

// palm lines in palm-local coordinates (the fate line ends in the middle/ring gap)
export const LINES_L = {
  fate: [[0.02, 0.12], [0.012, -0.2], [0.006, -0.5], [0.001, -0.8], [0.0, -0.975]],
  head: [[-0.46, -0.6], [-0.26, -0.55], [-0.02, -0.5], [0.2, -0.44], [0.4, -0.37]],
  heart: [[0.44, -0.72], [0.24, -0.74], [0.04, -0.77], [-0.16, -0.84], [-0.3, -0.92]],
  life: [[-0.45, -0.58], [-0.3, -0.46], [-0.23, -0.28], [-0.22, -0.08], [-0.17, 0.08]],
};
export const LINES = Object.fromEntries(Object.entries(LINES_L).map(([k, v]) => [k, catmull(v.map(palmTf), 8)]));

// the principal contour: from under the protagonist's fingers, joining the fate line
export const CREASE = resample(catmull([[1046, 750], [1100, 739], [1170, 723], ...LINES_L.fate.slice(1).map(palmTf)], 10), 220);
const CREASE_CUM = cumLengths(CREASE);
export const CREASE_LEN = CREASE_CUM[CREASE_CUM.length - 1];

const U_KEYS = [[27.15, 0], [28.4, 0.012], [29.3, 0.045], [34.09, 0.235], [37.2, 0.36], [42.0, 0.64], [45.6, 1.0]];
export function uHead(t) {
  if (t <= U_KEYS[0][0]) return 0;
  for (let i = 0; i < U_KEYS.length - 1; i++) {
    const [ta, ua] = U_KEYS[i], [tb, ub] = U_KEYS[i + 1];
    if (t <= tb) return lerp(ua, ub, ease.sine(seg(t, ta, tb)));
  }
  return 1;
}
export const creaseAt = (u) => pointAt(CREASE, u, CREASE_CUM);
export const creaseTan = (u) => tangentAt(CREASE, u, CREASE_CUM);
/** time the crease head passes world x */
function tPass(x) {
  let lo = 27, hi = 46;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (creaseAt(uHead(mid))[0] < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------------- palm & city ----------------
const baseGeo = handGeom({ ...HAND_C, curl: [0, 0, 0, 0, 0], spread: 1 });
export const PALM_W = baseGeo.palm;

function inside(poly, p) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1] + 1e-9) + a[0]) c = !c;
  }
  return c;
}
function distToPoly(p, pts) {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const ab = V.sub(b, a), ap = V.sub(p, a);
    const s = clamp(V.dot(ap, ab) / (V.dot(ab, ab) || 1));
    d = Math.min(d, V.dist(p, V.add(a, V.mul(ab, s))));
  }
  return d;
}

export const BLOCKS = (() => {
  const r = mulberry32(2024);
  const out = [];
  const cw = 46, ch = 40;
  const lines = Object.values(LINES);
  for (let y = 400; y < 1010; y += ch) {
    for (let x = 1110; x < 1760; x += cw) {
      const merge = r() < 0.28 ? 2 : 1;
      const x0 = x + 4, x1 = x + cw * merge - 4, y0 = y + 4, y1 = y + ch - 4;
      const c = [(x0 + x1) / 2, (y0 + y1) / 2];
      const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      if (!corners.every((q) => inside(PALM_W, q))) continue;
      if (corners.some((q) => distToPoly(q, PALM_W) < 7)) continue;
      const clear = lines.every((L) => distToPoly(c, L) > Math.hypot(x1 - x0, y1 - y0) * 0.5 + 6);
      if (!clear) continue;
      const dc = V.dist(c, [1440, 700]);
      out.push({
        x0, y0, x1, y1, c,
        hf: 10 + r() * 10,
        hb: 34 + r() * 44 + 30 * Math.exp(-(dc * dc) / (240 * 240)),
        jitter: r(),
        seed: Math.floor(r() * 1e6),
        dCrease: distToPoly(c, CREASE),
      });
      if (merge === 2) x += cw;
    }
  }
  // five perimeter lobes (finger bases + thumb base) that later curl out into fingers
  const lobes = [[-0.36, -0.36], [-0.33, -0.9], [-0.11, -0.94], [0.11, -0.91], [0.31, -0.84]];
  lobes.forEach(([lx, ly], i) => {
    const c = palmTf([lx, ly]);
    const w = 30, h = 26;
    for (const [ox, oy] of [[0, 0], [-34, 4]]) {
      const x0 = c[0] + ox - w / 2, y0 = c[1] + oy - h / 2;
      out.push({ x0, y0, x1: x0 + w, y1: y0 + h, c: [x0 + w / 2, y0 + h / 2], hf: 12, hb: 30 + r() * 18, jitter: r(), seed: Math.floor(r() * 1e6), dCrease: distToPoly([x0 + w / 2, y0 + h / 2], CREASE), lobe: i });
    }
  });
  // rise timing: the crease drags the fabric; folds rise near it first, spreading outward
  for (const b of out) {
    b.tForm = tPass(b.c[0]) - 2.0 + b.dCrease / 110 + b.jitter * 0.5;
    b.row = Math.floor((b.c[1] - 400) / ch);
  }
  // pleat height is shared along a row so the fold phase reads as one continuous ridge
  const rowH = {};
  for (const b of out) rowH[b.row] = rowH[b.row] ?? 11 + 9 * mulberry32(b.row + 5)();
  for (const b of out) b.hf = rowH[b.row];
  return out;
})();

// shallow fabric folds between the hand and the wrist of the palm (never become buildings)
const FABRIC_FOLDS = (() => {
  const r = mulberry32(77);
  const out = [];
  for (let i = 0; i < 9; i++) {
    const x = 1060 + i * 13 + r() * 8;
    const side = i % 2 ? 1 : -1;
    const y = 745 - (x - 1046) * 0.18 + side * (12 + r() * 30);
    out.push({ x0: x, x1: x + 50 + r() * 70, y, h: 6 + r() * 7, seed: i });
  }
  return out;
})();

/** vermilion flood arrival time for a world point (spreads from the knuckles back toward the wrist) */
function floodT(p) {
  return 58.3 + (1780 - p[0]) / 150 + 0.4 * noise2(p[0] * 0.02, p[1] * 0.02, 5);
}
/** row-by-row flattening (north/top rows first) */
const flatT = (b) => 57.2 + b.row * 0.62 + b.jitter * 0.25;

export function blockGeom(b, t) {
  const form = es(t, b.tForm, b.tForm + 3.4, ease.io2);
  const flat = es(t, flatT(b), flatT(b) + 1.9, ease.io3);
  if (form <= 0) return null;
  const f1 = clamp(form / 0.5), f2 = clamp((form - 0.5) / 0.5);
  // liquid planes: painted edges drift very slowly
  const lq = t > 36 ? 1.6 * es(t, 36, 44) : 0;
  const wob = (k) => lq * noise1(t * 0.13 + k * 3.1, b.seed);
  const bridge = 4.2 * (1 - ease.io2(f2)); // continuous pleat → separate buildings
  const x0 = b.x0 - bridge + wob(1), x1 = b.x1 + bridge + wob(2), y0 = b.y0 + wob(3), y1 = b.y1 + wob(4);
  const yr = (y0 + y1) / 2;
  const h = (lerp(b.hf * ease.out2(f1), b.hb, ease.io2(f2))) * (1 - flat);
  const K = 0.92, sx = 0.1;
  const rN = lerp(yr, y0, f2), rS = lerp(yr, y1, f2);
  const up = (y) => y - h * K;
  const light = [[x0, y0], [x1, y0], [x1 + h * sx, up(rS)], [x0 + h * sx, up(rS)]];
  const roofTop = [[x0 + h * sx, up(rN)], [x1 + h * sx, up(rN)], [x1 + h * sx, up(rS)], [x0 + h * sx, up(rS)]];
  const dark = [[x0 + h * sx, up(rS)], [x1 + h * sx, up(rS)], [x1, y1], [x0, y1]];
  return { form, flat, f2, h, light, roofTop, dark, x0, x1, y0, y1, rS, K, sx };
}

function drawBlockShadow(pt, b, g) {
  if (pt.animatic || g.h < 0.5) return;
  const ctx = pt.ctx;
  const L = g.h * 0.55;
  const poly = [[g.x0, g.y1], [g.x1, g.y1], [g.x1 + L * 0.8, g.y1 + L * 0.35], [g.x0 + L * 0.8, g.y1 + L * 0.35]];
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.filter = `blur(${Math.max(1, 3 * pt.zoom) * (ctx.canvas.width / pt.W)}px)`;
  pt.path(poly, true);
  ctx.fillStyle = rgba(PAL.indigo, 0.2 * (1 - g.flat));
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

function drawBlock(pt, b, g, t) {
  const ctx = pt.ctx;
  const fl = clamp((t - floodT(b.c)) / 1.4);
  const roofC = mixc(PAL.paperLight, PAL.vermilion, fl);
  const wallC = mixc(PAL.indigo, PAL.vermilionDeep, fl);
  const pleat = 1 - ease.io2(g.f2); // 1 while it is still a fabric fold
  // light face (fold slope → roof)
  pt.paperFill(g.light, [1, 0, 0, 1, 0, 0], { tint: roofC, tintAlpha: fl > 0 ? 0.35 + 0.65 * fl : 0.45 });
  if (fl > 0) pt.paint(g.light, { color: PAL.vermilion, alpha: fl, texM: [1, 0, 0, 1, 0, 0], grainAmt: 0.45 });
  // dark face (fold shadow → wall)
  if (g.h > 0.3) {
    if (pleat > 0.02 && !pt.animatic) {
      // fabric: the shadowed side of a pleat is a soft gradient, darkest at the ridge
      const ridgeY = g.rS - g.h * g.K;
      const gr = ctx.createLinearGradient(0, ridgeY, 0, g.y1);
      gr.addColorStop(0, rgba(PAL.indigo, 0.55 * pleat));
      gr.addColorStop(1, rgba(PAL.indigo, 0.08 * pleat));
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      pt.path(g.dark, true);
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.restore();
    }
    if (pleat < 0.98) pt.paint(g.dark, { color: wallC, alpha: 0.9 * (1 - pleat), texM: [1, 0, 0, 1, 0, 0], grainAmt: 0.5 });
    // windows: the fabric weave organises into rows of openings
    const wa = clamp((g.f2 - 0.25) / 0.6);
    const wallH = g.y1 - (g.rS - g.h * g.K);
    if (wa > 0 && wallH > 6) {
      const rr = mulberry32(b.seed);
      const rows = Math.max(1, Math.floor(wallH / 13));
      const cols = Math.max(1, Math.floor((g.x1 - g.x0) / 11));
      ctx.save();
      pt.path(g.dark, true);
      ctx.clip();
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const on = rr() < 0.72;
          const jx = (rr() - 0.5) * 6 * (1 - wa), jy = (rr() - 0.5) * 4 * (1 - wa);
          if (!on) continue;
          const cx = lerp(g.x0 + 4, g.x1 - 4, (j + 0.5) / cols) + g.h * g.sx * (1 - (i + 0.5) / rows) + jx;
          const cy = lerp(g.rS - g.h * g.K + 3, g.y1 - 3, (i + 0.5) / rows) + jy;
          const wh = lerp(0.8, Math.min(6, wallH / rows - 3), wa) * (1 - g.flat * 0.8);
          const ww = lerp(7, 4, wa);
          ctx.fillStyle = rgba(fl > 0.5 ? PAL.vermilionLight : PAL.paperLight, lerp(0.35, 0.9, wa) * (1 - fl * 0.5));
          ctx.fillRect(cx - ww / 2, cy - wh / 2, ww, Math.max(0.6, wh));
        }
      }
      ctx.restore();
    }
  }
  // flattened: windows become fine parallel lines on the palm
  if (g.flat > 0.3) {
    const n = 3 + (b.seed % 3);
    for (let i = 0; i < n; i++) {
      const y = lerp(b.y0 + 5, b.y1 - 5, (i + 0.5) / n);
      pt.ink([[b.x0 + 3, y], [b.x1 - 3, y + 1.5]], { w: 0.9, color: PAL.vermilionDeep, alpha: 0.55 * g.flat, seed: b.seed + i, taper: [0.3, 0.3] });
    }
  }
  // pleat ridge line while still fabric; cut-paper edges once it is a building
  if (pleat > 0.02) {
    const ry = g.rS - g.h * g.K;
    pt.ink([[g.x0 + g.h * g.sx, ry], [g.x1 + g.h * g.sx, ry]], { w: 1.5, color: PAL.indigo, alpha: 0.7 * pleat, seed: b.row * 7 + 3, taper: [0.1, 0.1], boilAmp: 0.25 });
  }
  const ea = 0.55 * (1 - g.flat * 0.7) * (1 - pleat);
  if (ea > 0.02) {
    pt.ink(g.dark.concat([g.dark[0]]), { w: 1.1, color: fl > 0.5 ? PAL.vermilionDeep : PAL.indigoDeep, alpha: ea, seed: b.seed + 9, taper: [0, 0], boilAmp: 0.25 });
    pt.ink([g.light[0], g.light[1]], { w: 0.9, color: PAL.indigo, alpha: ea * 0.6 * (1 - fl), seed: b.seed + 10, taper: [0.2, 0.2], boilAmp: 0.25 });
  }
}

// ---------------- the protagonist in the city ----------------
const WALK = [
  // [t, x along the crease (world x)], speeds from a searching walk
  [39.5, 1250], [47.53, 1452], [53.2, 1452], [56.16, 1512], [67.18, 1648], [78.24, 1712],
];
function pX(t) {
  for (let i = 0; i < WALK.length - 1; i++) {
    const [ta, xa] = WALK[i], [tb, xb] = WALK[i + 1];
    if (t <= tb) {
      const s = seg(t, ta, tb);
      // ease into the stop, ease out of it
      const e = xa === xb ? 0 : i === 0 ? ease.out2(s) * 0.12 + s * 0.88 : s;
      return lerp(xa, xb, xa === xb ? 0 : ease.sine(s) * 0.25 + s * 0.75);
    }
  }
  return WALK[WALK.length - 1][1];
}
function uAtX(x) {
  let lo = 0, hi = 1;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (creaseAt(mid)[0] < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
import { walkPose, walkBack, STAND, LOOK_BACK, mixPose } from './poses.mjs';
export { walkPose };

export const P_DEPTH_SPEED = 22; // door units per second once inside the corridor
export const pDepth = (t) => Math.max(0, t - M.open) * P_DEPTH_SPEED;
export function pCity(t) {
  if (t < 37.2) return null;
  const x = pX(t);
  const u = uAtX(x);
  const p = creaseAt(u);
  // stride from distance travelled (so feet don't skate); continues into the corridor
  const dist = x - 1250 + pDepth(t) * 0.9;
  const ph = dist / 42;
  const moving = t < 47.3 || (t > 53.2 && t < 90);
  const ampIn = es(t, 39.3, 40.2) * (1 - es(t, 46.9, 47.6)) + es(t, 53.1, 54.0);
  let pose = walkPose(ph, clamp(ampIn), 1);
  // the stop: weight settles, then a look back over the shoulder, then forward again
  const look = es(t, 48.4, 49.6, ease.io3) * (1 - es(t, 52.2, 53.3, ease.io3));
  if (!moving || ampIn < 1) {
    const standW = 1 - clamp(ampIn);
    pose = mixPose(pose, STAND, standW);
  }
  if (look > 0) pose = mixPose(pose, LOOK_BACK, look);
  // pop-up: the figure stands up out of a stroke of the line (paper hinge)
  const pop = es(t, 37.75, 39.0, ease.out3);
  const sy = t < 39.6 ? Math.max(0.03, pop) + 0.06 * Math.sin(Math.PI * seg(t, 38.9, 39.6)) : 1;
  return { x: p[0], y: p[1], u, pose, sy, look };
}

export const P_SIZE = 72;

/** footsteps: paper-white openings that extend along the street edges */
function footsteps(t) {
  const out = [];
  if (t < 40) return out;
  for (let k = 0; k < 60; k++) {
    const x = 1262 + k * 21;
    if (x > pX(Math.min(t, 78))) break;
    // time this foot landed
    let lo = 39.5, hi = t;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (pX(mid) < x) lo = mid;
      else hi = mid;
    }
    const tl = (lo + hi) / 2;
    out.push({ x, tl, side: k % 2 ? 1 : -1, k });
  }
  return out;
}

export function drawCrease(pt, t, opts = {}) {
  const u1 = uHead(t);
  if (u1 <= 0 && t < 27.15) return;
  // formation under the fingers: the pinch appears as a short line at the fingertips
  const form = es(t, 26.7, 27.4);
  // after the threshold the line zips shut behind the protagonist, back toward the wrist
  const u0 = lerp(0, 0.985, es(t, M.open + 0.1, M.open + 1.6, ease.in2));
  let line = subPoly(CREASE, u0, Math.max(0.004, u1 + 0.012 * form), 0);
  if (line.length < 2) return;
  const w = opts.w ?? 3.4;
  // the stroke that stood up as the protagonist leaves a gap in the line
  const popU = uAtX(1250), gapHalf = 22 / CREASE_LEN;
  const gapOpen = es(t, 37.7, 38.6);
  const parts = gapOpen > 0 ? [subPoly(CREASE, u0, popU - gapHalf * gapOpen, 0), subPoly(CREASE, Math.max(u0, popU + gapHalf * gapOpen), Math.max(popU + gapHalf, u1), 0)] : [line];
  const alpha = (opts.alpha ?? 1) * form;
  for (const [i, part] of parts.entries()) {
    if (part.length < 2) continue;
    pt.ink(part, { w, color: PAL.indigo, alpha, seed: 500 + i, taper: [i === 0 ? 0.03 : 0.08, 0.02], press: 0.35, rough: 0.5 });
  }
  // the lifting stroke (becoming the figure)
  if (t > 37.2 && t < 38.9) {
    const seg0 = subPoly(CREASE, popU - gapHalf, popU + gapHalf, 12);
    const lift = es(t, 37.2, 38.3);
    const fade = 1 - es(t, 38.2, 38.9);
    pt.ink(seg0.map(([x, y], i) => [x, y - lift * 22 * Math.sin((Math.PI * i) / 11)]), { w: w * (1 + lift * 0.4), color: PAL.indigo, alpha: alpha * fade, seed: 509, taper: [0.2, 0.2] });
  }
  // hooked bend at the head
  const head = creaseAt(u1);
  const tan = creaseTan(u1);
  const nrm = V.perp(tan);
  const hookSize = (opts.hook ?? 15) * es(t, 27.0, 27.6);
  if (hookSize > 0.5) pt.ink(hookPts(head, tan, nrm, hookSize), { w: w * 0.95, color: PAL.indigo, alpha, seed: 520, taper: [0, 0.5] });
}

export function drawCity(pt, t, cam, opts = {}) {
  const ctx = pt.ctx;
  const cityOn = es(t, 29, 36);
  if (cityOn <= 0 && t < 29) return;
  // the crease becomes a street: a painted band opens behind the travelling head
  {
    const u1 = uHead(t);
    const band = subPoly(CREASE, 0.14, Math.max(0.15, u1 - 0.01), 0);
    const bw = 24 * es(t, 33, 37);
    const ba = 1 - es(t, 58.4, 61.5);
    if (band.length > 1 && bw > 0.5 && ba > 0) {
      const edgeA = [], edgeB = [];
      band.forEach((p, i) => {
        const a = band[Math.max(0, i - 1)], c = band[Math.min(band.length - 1, i + 1)];
        const n = V.perp(V.norm(V.sub(c, a)));
        const taper = Math.min(1, i / 6, (band.length - 1 - i) / 6);
        edgeA.push(V.add(p, V.mul(n, 1)));
        edgeB.push(V.add(p, V.mul(n, bw * (0.35 + 0.65 * taper))));
      });
      pt.paint(edgeA.concat(edgeB.reverse()), { color: [150, 152, 176], alpha: 0.75 * ba, grainAmt: 0.6 });
    }
  }
  // the city's ground: a pale district spreading block by block; its lobed edge is the perimeter
  {
    const g = pt.layer('district');
    g.fillStyle = rgba([205, 204, 214], 1);
    let any = false;
    for (const b of BLOCKS) {
      const k = es(t, b.tForm + 0.4, b.tForm + 2.4);
      if (k <= 0) continue;
      any = true;
      const pad = 9 * k;
      g.globalAlpha = k;
      g.beginPath();
      g.roundRect(b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + 2 * pad, b.y1 - b.y0 + 2 * pad, 8);
      g.fill();
    }
    if (any) pt.put(g, { alpha: 0.55 * (1 - es(t, 60, 63)), op: 'multiply' });
  }
  // T03: the corridor is already visible inside the gap, beneath the hand
  let frame = null;
  if (t > 69) {
    frame = doorFrame(t, palmFingers(t));
    drawCorridorInDoor(pt, t, frame);
  }
  // palm: vermilion flood along the street grid (T02); split and withdrawal (T03)
  drawPalmGround(pt, t);
  if (frame) {
    drawCreaseColumns(pt, t, palmFingers(t));
    const s = straighten(t);
    pt.ink(frame.concat([frame[0]]).slice(0, frame.length), { w: 3.0, color: mixc(PAL.vermilionDeep, PAL.indigo, s), alpha: es(t, 69.5, 71.5), seed: 88, taper: [0.02, 0.02], press: 0.3 });
  }
  // fabric folds near the hand: soft ridges (ridge line + shaded flank), never buildings
  for (const f of FABRIC_FOLDS) {
    const tf = tPass(f.x0) - 0.6 + f.seed * 0.08;
    const k = es(t, tf, tf + 1.8, ease.out2) * (1 - es(t, 44, 52));
    if (k <= 0) continue;
    const h = f.h * k;
    const ridge = catmull([[f.x0, f.y + 1], [(f.x0 + f.x1) / 2, f.y - h], [f.x1, f.y + 2]], 8);
    if (!pt.animatic) {
      const flank = ridge.concat(ridge.slice().reverse().map(([x, y]) => [x + 3, y + h * 1.4 + 3]));
      const gr = ctx.createLinearGradient(0, f.y - h, 0, f.y + h * 1.4 + 3);
      gr.addColorStop(0, rgba(PAL.indigo, 0.3 * k));
      gr.addColorStop(1, rgba(PAL.indigo, 0));
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      pt.path(flank, true);
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.restore();
    }
    pt.ink(ridge, { w: 1.5, color: PAL.indigo, alpha: 0.6 * k, seed: 600 + f.seed, taper: [0.45, 0.45] });
  }
  // street lines (palm lines) that are not the crease
  for (const [name, L] of Object.entries(LINES)) {
    if (name === 'fate') continue;
    const k = es(t, 33, 38) * (opts.lineAlpha ?? 1);
    if (k <= 0) continue;
    const fl = clamp((t - 58.6) / 3);
    pt.ink(L, { w: 2.6, color: mixc(PAL.indigo, PAL.vermilionDeep, fl), alpha: 0.55 * k, seed: 700 + name.length, taper: [0.2, 0.2] });
  }
  // blocks, north to south, with the protagonist inserted at their depth
  const P = pCity(t);
  const list = BLOCKS.map((b) => ({ b, g: blockGeom(b, t) })).filter((x) => x.g && x.g.flat < 0.98).sort((a, b) => a.b.y1 - b.b.y1);
  let pDrawn = false;
  const drawP = () => {
    if (P && !pDrawn) {
      drawFootsteps(pt, t);
      drawCityP(pt, t, P, cam);
    }
    pDrawn = true;
  };
  for (const it of list) drawBlockShadow(pt, it.b, it.g);
  drawCrease(pt, t, { w: 3.4 });
  for (const it of list) {
    if (P && it.b.y1 > P.y + 2) drawP();
    drawBlock(pt, it.b, it.g, t);
  }
  drawP();
}

function drawFootsteps(pt, t) {
  const ctx = pt.ctx;
  for (const f of footsteps(t)) {
    const age = t - f.tl;
    if (age < 0) continue;
    const u = uAtX(f.x);
    const p = creaseAt(u);
    const tan = creaseTan(u);
    const n = V.perp(tan);
    const base = V.add(p, V.mul(n, f.side * 5));
    // the opening, then its extension along the street edge
    const ext = 6 + 26 * ease.out2(clamp(age / 3.5));
    const a = V.add(base, V.mul(tan, -ext)), b = V.add(base, V.mul(tan, ext * 0.6));
    const alpha = 0.95 * (1 - es(t, 58.5, 62));
    pt.ink([a, base, b], { w: 3.2 * (1 - clamp(age / 9) * 0.4), color: PAL.paperLight, alpha, seed: 800 + f.k, taper: [0.5, 0.3], boilAmp: 0.2 });
    ctx.save();
    ctx.fillStyle = rgba(PAL.paperLight, alpha);
    ctx.beginPath();
    ctx.ellipse(base[0], base[1], 4.2, 2.2, Math.atan2(tan[1], tan[0]), 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawCityP(pt, t, P, cam) {
  const ctx = pt.ctx;
  const S = P_SIZE;
  const feet = [P.x, P.y + 2];
  // absence: the openings climb the figure until it is a walking human-shaped hole;
  // crossing the threshold, contour and paper register again for a moment of certainty
  const absence = es(t, 58.2, 62.8, ease.io2) * (1 - es(t, M.open - 0.35, M.open + 0.05, ease.io2));
  // stay upright on screen while the camera rolls; profile turns to a back view
  const rot = -(cam.r || 0);
  const roll = clamp(-(cam.r || 0) / (Math.PI / 2));
  // as the view rolls the walk turns from a profile into a walk away from us
  const phB = (P.x - 1250 + pDepth(t) * 0.9) / 42;
  const ampB = t > 53.1 ? 1 : 0;
  const pose = roll > 0.001 ? mixPose({ ...P.pose, yaw: lerp(P.pose.yaw ?? 1, 2, roll) }, walkBack(phB, ampB), ease.io2(roll)) : P.pose;
  const up = [Math.sin(rot), -Math.cos(rot)];
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgba(PAL.indigo, 0.22 * P.sy * (1 - absence) * (1 - es(t, M.open - 0.2, M.open + 0.6)));
  ctx.beginPath();
  ctx.ellipse(feet[0] + 4 * (1 - roll), feet[1] + 1, (15 * P.sy + 3) * (1 - roll * 0.6) + 5 * roll, 4 + 6 * roll, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.save();
  if (P.sy < 0.999) {
    ctx.translate(feet[0], feet[1]);
    ctx.scale(1, P.sy);
    ctx.translate(-feet[0], -feet[1]);
  }
  let S2 = S, feet2 = feet;
  const zp = pDepth(t);
  if (zp > 0) {
    const r = projUV(0, 0, zp, 0);
    S2 = S * r[2];
    feet2 = doorPt(r[0], r[1]);
  }
  const pelvis = V.add(feet2, V.mul(up, 0.49 * S2));
  drawProtagonist(pt, {
    pose, X: pelvis[0], Y: pelvis[1], S: S2, rot, zoom: pt.zoom * Math.max(0.3, P.sy),
    lineW: 1.25, wash: 0.05 * (1 - absence), seed: 131, trace: 1 - absence * 0.3,
    absence, gapLen: 0.06,
  });
  ctx.restore();
}

// ---------------- palm reveal ----------------
export function palmFingers(t) {
  // five sections of the city's perimeter curl out into fingers (T02), then close (T03):
  // the middle and ring fingers part at the base and lean together into a pointed opening
  const g0 = [58.8, 59.6, 59.2, 59.9, 60.4];
  const lens = g0.map((a) => lerp(0.12, 1, es(t, a, a + 3.4, ease.io3)));
  const unroll = g0.map((a) => lerp(0.42, 0, es(t, a + 0.2, a + 3.6, ease.io3)));
  const close = es(t, M.on67, 72.6, ease.io2);
  const curl = unroll.map((u, i) => u + close * [0.9, 0.18, 0.05, 0.05, 0.22][i]);
  const spread = lerp(1.08, 0.2, close);
  const lean = close * (1 - straighten(t));
  const fan = [0, lerp(0, -2, close), 7.6 * lean + 1.0 * close, -7.6 * lean - 1.0 * close, lerp(0, 2, close)];
  const baseShift = [0, -0.035 * close, -0.09 * close, 0.09 * close, 0.035 * close];
  return handGeom({ ...HAND_C, curl, spread, lenScale: lens, fan, baseShift });
}

function drawPalmGround(pt, t) {
  if (t < 57.5) return;
  const ctx = pt.ctx;
  const geo = palmFingers(t);
  const split = splitAmt(t);
  // everything that belongs to the companion's hand goes on one layer so it can split
  const hand = pt.layer('palmAll');
  const main = pt.ctx;
  pt.ctx = hand;
  const fingerOn = es(t, 58.6, 59.4);
  if (fingerOn > 0) {
    drawHand(pt, geo, { style: 'companion', view: 'palmar', lineW: 4, alpha: fingerOn, creases: straighten(t) < 0.5, layerKey: 'palm', seed: 44, onlyFingers: true });
  }
  const g = pt.layer('flood');
  const vpat = pt.animatic ? rgba(PAL.vermilion) : pt.pattern(pt.paintPattern(PAL.vermilion), [1, 0, 0, 1, 0, 0], 0.7);
  g.fillStyle = vpat;
  for (const b of BLOCKS) {
    const fl = clamp((t - floodT(b.c)) / 1.4);
    if (fl <= 0) continue;
    const pad = 6 + 4 * fl;
    g.globalAlpha = fl;
    g.fillRect(b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + 2 * pad, b.y1 - b.y0 + 2 * pad);
  }
  const full = es(t, 61.2, 63.5);
  g.globalAlpha = full;
  pt.path(geo.palm, true, g);
  g.fill();
  g.globalAlpha = 1;
  pt.maskIn(g, [geo.palm]);
  pt.put(g);
  if (full > 0.3) pt.ink(geo.palm.concat([geo.palm[0], geo.palm[1]]), { w: 2.2, color: PAL.vermilionDeep, alpha: 0.6 * full, seed: 46, taper: [0, 0] });
  // flattened blocks leave fine lines on the palm; palm lines stay as its streets
  for (const b of BLOCKS) {
    const bg = blockGeom(b, t);
    if (bg && bg.flat > 0.98) {
      const n = 3 + (b.seed % 3);
      for (let i = 0; i < n; i++) {
        const y = lerp(b.y0 + 5, b.y1 - 5, (i + 0.5) / n);
        pt.ink([[b.x0 + 3, y], [b.x1 - 3, y + 1.5]], { w: 0.9, color: PAL.vermilionDeep, alpha: 0.55, seed: b.seed + i, taper: [0.3, 0.3] });
      }
    }
  }
  for (const [name, L] of Object.entries(LINES)) {
    if (name === 'fate') continue;
    pt.ink(L, { w: 2.6, color: PAL.vermilionDeep, alpha: 0.55 * clamp((t - 58.6) / 3), seed: 700 + name.length, taper: [0.2, 0.2] });
  }
  pt.ctx = main;
  if (split <= 0.01) {
    pt.put(hand);
  } else {
    // the palm splits along the fate line; each half withdraws to its side
    const s = ctx.canvas.width / pt.W;
    const m = ctx.getTransform();
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      const yCut = DOOR.by;
      if (sgn < 0) ctx.rect(0, -5000, 5000, 5000 + yCut);
      else ctx.rect(0, yCut, 5000, 5000);
      ctx.clip();
      // translate in world y (screen left/right after the roll)
      ctx.translate(0, sgn * split);
      const mm = ctx.getTransform();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // map the layer (drawn with transform m) through the extra world translation
      const dx = mm.e - m.e, dy = mm.f - m.f;
      ctx.drawImage(hand.canvas, dx, dy);
      ctx.restore();
    }
  }
}
