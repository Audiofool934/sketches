// T07: the embrace unfolds into mirrors along its joints (190 - 203 s)
// The flat wall of the embrace (the last frame of T06) becomes the source.
// Hinged on lines through the still-touching hand, mirrored copies swing open
// one after another like paper flaps, until the embrace fills a kaleidoscope
// centred on that point of contact. The symmetry holds for a moment; then each
// sector continues the embrace's motion with its own delay, one flap sags back
// open, and the centre is pulled toward the edge of the frame.
import { createCanvas } from '@napi-rs/canvas';
import { V, clamp, lerp, seg, es, ease, TAU } from '../lib/math.mjs';
import { PAL, rgba } from '../lib/palette.mjs';
import { project } from '../lib/field.mjs';
import { patternProbeActive } from '../lib/draw.mjs';
import { drawWave, camW } from './c_wave.mjs';
import { contactPoint } from './embrace.mjs';
import { M } from '../timeline.mjs';

export const T7 = 190.0;
export const N = 6; // sectors
export const TH = TAU / N;
export const GAP_K = 4; // the flap that never quite closes
const SRC_SCALE = 2; // the source is rendered at twice the frame resolution (it is magnified)

/** the pivot: the companion's hand on the protagonist's back, as it appears at t = 190 */
export function pivot0() {
  const cam = camW(T7);
  const cp = contactPoint().wall;
  const p = project(cam, [cp[0], cp[1], 1900]);
  return [p[0], p[1]];
}
export const B0 = -0.5; // sector 0 spans up and to the right of the hand: the shoulders and the heads
export const hingeAngle = (k) => B0 + (k - 1) * TH; // line shared by sectors k-1 and k

// source: the frame at t = 190, rendered once per canvas size (deterministic)
const SRC = new Map();
export function kaleidoSource(pt) {
  const key = pt.ctx.canvas.width;
  if (SRC.has(key)) return SRC.get(key);
  const c = createCanvas(pt.ctx.canvas.width * SRC_SCALE, pt.ctx.canvas.height * SRC_SCALE);
  const g = c.getContext('2d');
  const s = c.width / pt.W;
  g.setTransform(s, 0, 0, s, 0, 0);
  const main = pt.ctx, f0 = pt.frame;
  pt.ctx = g;
  pt.frame = Math.round(T7 * 24);
  drawWave(pt, T7);
  pt.ctx = main;
  pt.frame = f0;
  // A probe draw uses stand-in patterns. Only the real draw is reusable.
  if (!patternProbeActive()) SRC.set(key, c);
  return c;
}

export const unfold = (t, k) => {
  const u = es(t, 191.4 + (k - 1) * 0.72, 192.9 + (k - 1) * 0.72, ease.io3);
  return k === GAP_K ? u * (1 - 0.6 * es(t, M.on199 + 0.5, 203.0, ease.io2)) : u;
};
export const desync = (t) => es(t, M.on199, 203.0, ease.io2);
export const zoomK = (t) => lerp(1, 2.35, es(t, 190.3, 196.2, ease.io3));
export function centre(t) {
  const a = es(t, 190.3, 196.2, ease.io3);
  const d = es(t, M.on199 + 0.6, 207.0, ease.io2);
  return V.lerp(V.lerp(pivot0(), [960, 540], a), [1690, 470], d);
}

const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const rotM = (a) => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
const reflM = (b) => [Math.cos(2 * b), Math.sin(2 * b), Math.sin(2 * b), -Math.cos(2 * b), 0, 0];
/** flap hinge on the line at angle b: s = 1 folded flat onto its neighbour, s = -1 opened (a reflection) */
const hingeM = (b, s) => mul(rotM(b), mul([1, 0, 0, s, 0, 0], rotM(-b)));
export const TK = (() => {
  const T = [[1, 0, 0, 1, 0, 0]];
  for (let k = 1; k < N; k++) T.push(mul(reflM(hingeAngle(k)), T[k - 1]));
  return T;
})();

function wedgePts(a0, a1, R = 3200, n = 18) {
  const pts = [[0, 0]];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([Math.cos(a) * R, Math.sin(a) * R]);
  }
  return pts;
}
const applyL = (m, p) => [m[0] * p[0] + m[2] * p[1], m[1] * p[0] + m[3] * p[1]];

/** draw the source through linear map L (about the pivot), clipped to polygon (pivot-relative) */
function drawPiece(pt, src, c, p0, L, clipRel, s) {
  const ctx = pt.ctx;
  ctx.save();
  ctx.setTransform(s, 0, 0, s, 0, 0);
  pt.path(clipRel.map((p) => [p[0] + c[0], p[1] + c[1]]), true);
  ctx.clip();
  const Mf = mul([1, 0, 0, 1, c[0], c[1]], mul(L, [1, 0, 0, 1, -p0[0], -p0[1]]));
  ctx.setTransform(Mf[0] * s, Mf[1] * s, Mf[2] * s, Mf[3] * s, Mf[4] * s, Mf[5] * s);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, pt.W, pt.H);
  ctx.restore();
}

/**
 * o: {centre, extra(k,t), alphaSector(k,t)} - extra rotates a sector's content about the centre
 */
export function drawKaleido(pt, t, o = {}) {
  const ctx = pt.ctx;
  const s = ctx.canvas.width / pt.W;
  const src = kaleidoSource(pt);
  const p0 = pivot0();
  const c = o.centre || centre(t);
  const dsy = desync(t);
  const extra = (k) => (o.extra ? o.extra(k, t) : dsy * 0.17 * Math.sin((t - M.on199) * 2.0 - k * 0.95) * (0.6 + 0.4 * ((k * 37) % 5) / 4));
  const Z = o.zoom ?? zoomK(t);
  const ZM = [Z, 0, 0, Z, 0, 0];
  pt.paper([1, 0, 0, 1, 0, 0]);
  // sector 0: the original, whole until every flap has opened over it
  const allOpen = unfold(t, N - 1) >= 1 && t < M.on199;
  const full = wedgePts(0, TAU, 3200, 40);
  drawPiece(pt, src, c, p0, mul(rotM(extra(0)), ZM), allOpen ? wedgePts(hingeAngle(1) - TH, hingeAngle(1)) : full, s);
  for (let k = 1; k < N; k++) {
    const u = unfold(t, k);
    if (u <= 0.001) continue;
    const b = hingeAngle(k);
    const H = hingeM(b, lerp(1, -1, u));
    const L = mul(H, mul(rotM(extra(k)), mul(TK[k - 1], ZM)));
    const clip = wedgePts(b - TH, b).map((p) => applyL(H, p));
    drawPiece(pt, src, c, p0, L, clip, s);
    const edgeOn = 1 - Math.abs(lerp(1, -1, u));
    if (!pt.animatic && edgeOn > 0.02) {
      ctx.save();
      ctx.setTransform(s, 0, 0, s, 0, 0);
      pt.path(clip.map((p) => [p[0] + c[0], p[1] + c[1]]), true);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = rgba(PAL.indigo, 0.22 * edgeOn);
      ctx.fill();
      ctx.restore();
    }
    // the free edge of the flap
    const far = applyL(H, [Math.cos(b - TH) * 3200, Math.sin(b - TH) * 3200]);
    pt.ink([c, [c[0] + far[0], c[1] + far[1]]], { w: 1.3, color: PAL.indigo, alpha: 0.35 * Math.min(1, u * 3), seed: 1400 + k, taper: [0.02, 0.7] });
  }
  // the joints: hinge creases through the point of contact
  for (let k = 1; k < N; k++) {
    const u = unfold(t, k);
    if (u <= 0.02) continue;
    const b = hingeAngle(k);
    pt.ink([c, [c[0] + Math.cos(b) * 1500, c[1] + Math.sin(b) * 1500]], { w: 1.5, color: PAL.indigo, alpha: 0.3 * u, seed: 1300 + k, taper: [0.02, 0.6] });
  }
}
