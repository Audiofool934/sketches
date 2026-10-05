// T08: disorder gathers into a line carrying the weight (203 - 213.5 s)
// T09: the taut line relaxes into two profiles (213.5 - 224 s)
// In one mirrored sector the right-shoulder gap lengthens and the paper-white
// openings join into the protagonist's human-shaped absence. Colour runs through
// it in the wave's direction and gathers on its edge; the kaleidoscope empties
// (textures first, then sectors) until one outline remains. Opened at the gap,
// it is pulled taut into a single line with the hooked bend, trembles, and on the
// music's breath relaxes: its upper part becomes the bridge of one nose, its lower
// part another person's forehead. Vermilion settles on the left, indigo on the right.
import { V, clamp, lerp, seg, es, ease, catmull, resample, cumLengths, pointAt, ring, TAU, noise1, mulberry32 } from '../lib/math.mjs';
import { PAL, rgba, mixc } from '../lib/palette.mjs';
import { fk, silhouette, hookPts, shoulderGapPoint } from '../lib/rig.mjs';
import { cutLoop, anchorLoop } from '../lib/trace.mjs';
import { drawKaleido, centre as kCentre } from './d_kaleido.mjs';
import { STAND } from './poses.mjs';
import { M } from '../timeline.mjs';
import { SHARED_S, drawEnding, w2s } from './d_bed.mjs';

// ---------- the absence (a large standing silhouette) ----------
const ABS = { X: 900, Y: 600, S: 860 };
const ABS_POSE = { ...STAND, yaw: 2, shR: 98, elR: 100, shL: 82, elL: 80 };
const ABS_LOOPS = (() => {
  const loops = silhouette({ pose: ABS_POSE, X: ABS.X, Y: ABS.Y, S: ABS.S, zoom: 1 }, 'P');
  return loops;
})();
const J_ABS = fk(ABS_POSE);
const GAP = shoulderGapPoint(J_ABS, ABS.X, ABS.Y, ABS.S).p;
// the outline, opened at the right-shoulder gap: one long stroke from one side of the gap to the other
const OPEN = (() => {
  const loop = ABS_LOOPS[0].pts;
  const o = cutLoop(loop, GAP, 60);
  return resample(o, 400);
})();

// ---------- the taut line (and later the shared profile line), screen space ----------
// a straight line through the shared profile's chord, a little longer than it: relaxing,
// its ends draw in to the brow and the eyelid
export const SHARED = SHARED_S;
const S0 = SHARED_S[0], S1 = SHARED_S[SHARED_S.length - 1];
const MID = V.lerp(S0, S1, 0.5);
const AX = V.norm(V.sub(S1, S0));
export const LINE_NRM = [-AX[1], AX[0]];
const HALF = V.len(V.sub(S1, S0)) * 0.5 + 70;
const TAUT = (() => {
  const pts = [];
  for (let i = 0; i < 400; i++) pts.push(V.add(MID, V.mul(AX, lerp(-HALF, HALF, i / 399))));
  return pts;
})();

// ---------- beats ----------
export const absK = (t) => es(t, 203.0, 205.6, ease.io2); // opening spreads from the gap
export const flowK = (t) => es(t, 204.6, 208.8, ease.lin); // colour runs through the absence
export const edgeK = (t) => es(t, 205.8, 208.4, ease.io2); // gathers on the edge
export const emptyTex = (t) => es(t, 205.0, 207.2, ease.io2); // distant textures go first
export const emptySec = (t) => es(t, 207.0, 209.6, ease.io2); // then the mirrored sectors
export const pullK = (t) => es(t, 209.2, 212.0, ease.io3); // pulled taut
export const relaxK = (t) => es(t, M.on213 + 0.2, 218.2, ease.io2); // relaxes into the shared profile
export const faceK = (t) => es(t, 217.0, 221.7, ease.io2); // colours spread along it, faces appear

function morphPull(t) {
  // the ends reach the line first, the middle follows (pulling a string taut)
  const k = pullK(t);
  const n = OPEN.length;
  return OPEN.map((p, i) => {
    const u = i / (n - 1);
    const lead = Math.abs(u - 0.5) * 2; // 1 at the ends
    const kk = clamp((k - (1 - lead) * 0.35) / 0.65);
    return V.lerp(p, TAUT[i], ease.io3(kk));
  });
}

export function lineAt(t) {
  // current principal contour (open stroke), screen space
  if (t < 209.2) return OPEN;
  let pts = t < M.on213 + 0.2 ? morphPull(t) : TAUT;
  // residual oscillation once taut
  const r = ring(t, 212.0, 1.7, 1.6);
  if (t >= 212.0 && t < M.on213 + 2) pts = pts.map((p, i) => V.add(p, V.mul(LINE_NRM, 16 * r * Math.sin((Math.PI * i) / (pts.length - 1)))));
  const k = relaxK(t);
  if (k > 0) pts = pts.map((p, i) => V.lerp(p, SHARED[i], k));
  return pts;
}

function hookOf(pts, size = 22) {
  const e = pts[pts.length - 1], pre = pts[pts.length - 8];
  const td = V.norm(V.sub(e, pre));
  return hookPts(e, td, [-td[1], td[0]], size);
}

// ---------- draw ----------
export function drawLineScene(pt, t) {
  const ctx = pt.ctx;
  const s = ctx.canvas.width / pt.W;
  const kc = kCentre(t);
  // the kaleidoscope, emptying: first its paper textures, then sector by sector
  const eT = emptyTex(t), eS = emptySec(t);
  if (eS < 1) {
    const g = pt.layer('kal');
    const main = pt.ctx;
    pt.ctx = g;
    drawKaleido(pt, t, {});
    pt.ctx = main;
    // fade the tile grid / paper texture first: a paper veil everywhere except the saturated colour
    pt.paper([1, 0, 0, 1, 0, 0]);
    pt.put(g, { alpha: 1 - eS });
    if (eT > 0 && !pt.animatic) {
      ctx.save();
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.globalAlpha = 0.55 * eT * (1 - eS);
      ctx.fillStyle = pt.pattern(pt.tex.paper, [1, 0, 0, 1, 0, 0], 0.62);
      ctx.fillRect(0, 0, pt.W, pt.H);
      ctx.restore();
    }
  } else {
    pt.paper([1, 0, 0, 1, 0, 0]);
  }
  // the absence: a paper-white human shape opening from the shoulder gap
  const a = absK(t);
  if (a > 0 && t < 212.5) {
    ctx.save();
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.beginPath();
    const R = 60 + a * 1400;
    ctx.arc(GAP[0], GAP[1], R, 0, TAU);
    ctx.clip();
    ctx.beginPath();
    for (const l of ABS_LOOPS) {
      ctx.moveTo(l.pts[0][0], l.pts[0][1]);
      for (const q of l.pts) ctx.lineTo(q[0], q[1]);
      ctx.closePath();
    }
    ctx.clip('evenodd');
    ctx.fillStyle = pt.animatic ? rgba(PAL.paperLight) : pt.pattern(pt.tex.paper, [1, 0, 0, 1, 31, 11], 0.62);
    ctx.globalAlpha = 1 - pullK(t);
    ctx.fillRect(0, 0, pt.W, pt.H);
    // colour runs through it, diagonally, in the wave's direction
    const f = flowK(t);
    if (f > 0 && f < 1) {
      const r = mulberry32(88);
      for (let k = 0; k < 26; k++) {
        const col = [PAL.vermilion, PAL.indigo, PAL.cyan, PAL.vermilion, PAL.yellow][k % 5];
        const x0 = 300 + r() * 1000, y0 = 1250 + r() * 400, len = 200 + r() * 360;
        const sp = 1500 + r() * 700;
        const d = V.norm([0.55, -1]);
        const off = f * sp - 200;
        const p0 = [x0 + d[0] * off, y0 + d[1] * off], p1 = [p0[0] + d[0] * len, p0[1] + d[1] * len];
        pt.ink([p0, V.lerp(p0, p1, 0.5), p1], { w: 10 + r() * 22, color: col, alpha: 0.75 * Math.sin(Math.PI * f), seed: 1500 + k, taper: [0.4, 0.4] });
      }
    }
    ctx.restore();
  }
  // the edge gathers the colour into a contour (layered print: cyan and vermilion slip beside indigo)
  const e = edgeK(t);
  const line = lineAt(t);
  const reg = 1 - es(t, 211.0, 213.3); // the layers register again as it goes taut
  if (e > 0 || t >= 209.2) {
    const ek = Math.max(e, t >= 209.2 ? 1 : 0);
    const w = lerp(2, 7, ek) * lerp(1, 0.75, relaxK(t));
    if (reg > 0.01) {
      pt.ink(line.map(([x, y]) => [x + 7 * reg, y - 5 * reg]), { w: w * 1.1, color: PAL.cyan, alpha: 0.75 * ek * reg, seed: 1601, taper: [0.02, 0.02] });
      pt.ink(line.map(([x, y]) => [x - 6 * reg, y + 6 * reg]), { w: w * 1.1, color: PAL.vermilion, alpha: 0.7 * ek * reg, seed: 1602, taper: [0.02, 0.02] });
    }
    pt.ink(line, { w, color: PAL.indigo, alpha: ek, seed: 1600, taper: [0.02, 0.02], press: 0.35 });
    pt.ink(hookOf(line, 22), { w: w * 0.95, color: PAL.indigo, alpha: ek, seed: 1603, taper: [0, 0.5] });
  }
  // T09: colours settle on either side of the shared line; the heads and the bed appear from it
  const fk2 = faceK(t);
  if (fk2 > 0) drawReveal(pt, t, fk2);
}

// flattening sheets become bedding (they continue the tiles' turning motion); world rectangles
const SETTLE = [
  { to: [[120, 330], [520, 330], [520, 760], [120, 760]], t0: 220.0 }, // lands as the pillow
  { to: [[500, 150], [1400, 150], [1400, 930], [500, 930]], t0: 220.6 }, // lands as the sheet
];

function drawReveal(pt, t, k) {
  const ctx = pt.ctx;
  const s = ctx.canvas.width / pt.W;
  const g = pt.layer('reveal');
  const main = pt.ctx;
  pt.ctx = g;
  drawEnding(pt, t, { reveal: 1 });
  pt.ctx = main;
  // mask: a soft band around the shared line, widening until it covers the frame
  const m = pt.layer('revealMask');
  m.setTransform(s, 0, 0, s, 0, 0);
  m.lineCap = 'round';
  m.lineJoin = 'round';
  m.strokeStyle = '#000';
  if (!pt.animatic) m.filter = `blur(${28 * s}px)`;
  m.lineWidth = 10 + ease.io2(k) * 2300;
  m.beginPath();
  SHARED_S.forEach((p, i) => (i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])));
  m.stroke();
  m.filter = 'none';
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(m.canvas, 0, 0);
  g.restore();
  pt.put(g);
  // the last sheets turning down and settling as bedding
  for (const sh of SETTLE) {
    const u = es(t, sh.t0, sh.t0 + 2.4, ease.io3);
    if (u <= 0 || u >= 1) continue;
    const scr = sh.to.map(w2s);
    const c = scr.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
    const tilt = (1 - u) * 1.25; // falling flat about its centre line, still a little above the bed
    const pts = scr.map((w) => {
      const dy = (w[1] - c[1]) * Math.cos(tilt) - (1 - u) * 160;
      return [c[0] + (w[0] - c[0]) * (1 + 0.15 * (1 - u)), c[1] + dy];
    });
    pt.ink(pts.concat([pts[0]]), { w: 2, color: PAL.indigo, alpha: 0.55 * Math.sin(Math.PI * u), seed: 1720, taper: [0, 0] });
  }
}
