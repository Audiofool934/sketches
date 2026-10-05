// T03: the gap between the middle and ring fingers opens into a corridor.
// The two fingers lean together into a pointed opening; their inner contours
// straighten and stay behind as a doorframe while the vermilion paint splits
// along the fate line and withdraws to either side. Knuckle creases fold into
// the receding columns of the corridor that was already visible in the gap.
import { V, clamp, lerp, seg, es, ease, catmull, resample, mulberry32 } from '../lib/math.mjs';
import { PAL, rgba, mixc } from '../lib/palette.mjs';
import { M } from '../timeline.mjs';
import { drawCorridor, COR } from '../lib/corridor.mjs';

// door-local (u across, v up the door) → world. The doorway grows from the web
// between middle and ring fingers (the end of the fate line) toward the fingertips.
export const DOOR = { bx: 1712, by: 710, w: 100, h: 330, vpv: 118 };
export const doorPt = (u, v) => [DOOR.bx + v, DOOR.by + u];

export const straighten = (t) => es(t, 72.3, 75.6, ease.io3);
export const splitAmt = (t) => 1100 * es(t, 75.4, 78.6, ease.io3);
export const creaseFold = (t) => es(t, 73.4, 76.4, ease.io2);
export const corridorOn = (t) => es(t, 69.5, 72.5);

/** the doorframe line: from the finger edges (pointed, bumpy) to a straight frame */
export function doorFrame(t, geo) {
  const s = straighten(t);
  const W = DOOR.w / 2, H = DOOR.h;
  const mid = geo.fingers[2], ring = geo.fingers[3];
  // finger-edge version: along each finger's inner side (joints offset toward the gap)
  const edge = (f, sgn) => f.joints.map((j, k) => {
    const r = (f.w / 2) * (1 - k * 0.07);
    return [j[0], j[1] + sgn * r];
  });
  const eL = edge(mid, 1), eR = edge(ring, -1);
  // the door's straight version shares the fingers' final parallel gap
  const fingerFrame = [...eL, ...eR.slice().reverse()];
  const rectFrame = [doorPt(-W, 0), doorPt(-W, H * 0.34), doorPt(-W, H * 0.68), doorPt(-W, H), doorPt(W, H), doorPt(W, H * 0.68), doorPt(W, H * 0.34), doorPt(W, 0)];
  const a = resample(catmull(fingerFrame, 6), 80), b = resample(rectFrame, 80);
  return a.map((p, i) => V.lerp(p, b[i], s));
}

/** corridor interior (shared 3D corridor), clipped to the door opening */
export function drawCorridorInDoor(pt, t, frame) {
  const on = corridorOn(t);
  if (on <= 0) return;
  const ctx = pt.ctx;
  ctx.save();
  pt.path(frame, true);
  ctx.clip();
  drawCorridor(pt, (u, v) => doorPt(u, v), { on, skipEntry: true, alphaK: (k) => es(t, 69.8 + k * 0.22, 71.3 + k * 0.22) });
  ctx.restore();
}

/** knuckle creases of the two fingers fold into columns that recede along the walls */
export function drawCreaseColumns(pt, t, geo) {
  const k = creaseFold(t);
  if (k <= 0 && t < 72) return;
  const W = DOOR.w / 2, H = DOOR.h;
  const VP = doorPt(0, DOOR.vpv);
  const out = [];
  [2, 3].forEach((fi, side) => {
    const f = geo.fingers[fi];
    [1, 2].forEach((ji, n) => {
      const j = f.joints[ji];
      const sgn = side === 0 ? 1 : -1;
      // source: a short crease across the finger at this joint
      const a0 = [j[0], j[1] - (f.w * 0.26)], a1 = [j[0], j[1] + (f.w * 0.26)];
      // destination: a column edge on this side wall at depth d
      const d = 1 + ((n + 0.5) * COR.SPACING) / COR.Zc;
      const cBot = V.lerp(VP, doorPt(sgn * -W, 0), 1 / d), cTop = V.lerp(VP, doorPt(sgn * -W, H), 1 / d);
      const s = ease.io3(clamp(k * 1.15 - n * 0.15));
      // fold: pivot about the inner end while travelling into the opening
      const p0 = V.lerp(a0, cBot, s), p1 = V.lerp(a1, cTop, s);
      out.push([p0, V.lerp(p0, p1, 0.5), p1]);
    });
  });
  const col = mixc(PAL.vermilionDeep, PAL.indigo, k);
  // once they have arrived they are the corridor's own columns (drawn by the corridor)
  const a = 0.85 * (1 - es(t, 77.6, 79.2));
  if (a > 0.01) out.forEach((l, i) => pt.ink(l, { w: 1.6, color: col, alpha: a, seed: 90 + i, taper: [0.2, 0.2] }));
}
