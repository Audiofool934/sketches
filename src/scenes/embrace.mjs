// The embrace (T06 → T07): two figures in profile, the protagonist (indigo
// contour, right-shoulder gap) and the companion (vermilion paint, unpainted
// left fingertips). The protagonist's right hand and the companion's left hand
// touch between them: that contact point is the kaleidoscope's pivot (T07).
// Drawn once into an image in wall coordinates (x across, h up) and reused.
import { createCanvas } from '@napi-rs/canvas';
import { V, clamp, lerp, catmull, TAU } from '../lib/math.mjs';
import { PAL, rgba } from '../lib/palette.mjs';
import { REST, fk, drawProtagonist, drawCompanion } from '../lib/rig.mjs';
import { Painter, patternProbeActive } from '../lib/draw.mjs';

export const WALL = { x0: -3200, x1: 2800, h1: 2600 }; // wall extent (world units)
export const IMG = { w: 2400, h: 1040 }; // pixels for the whole wall
export const w2i = (x, h) => [((x - WALL.x0) / (WALL.x1 - WALL.x0)) * IMG.w, (1 - h / WALL.h1) * IMG.h];

// poses (figure units; the rig's y points down)
// protagonist faces right: near (right) arm around the companion's waist; far arm hidden behind
export const P_EMB = {
  ...REST, yaw: 1, spine: -80, neck: -58, head: -38,
  shR: 16, elR: 64, haR: 96,
  shL: 96, elL: 92, haL: 90,
  thR: 91, snR: 93, thL: 86, snL: 95, ftR: 0, ftL: 0,
};
// companion faces left: near (left) arm over the protagonist's shoulders, hand on the back
export const C_EMB = {
  ...REST, yaw: -1, spine: -98, neck: -118, head: -136, hair: 0.3,
  shL: 192, elL: 124, haL: 104,
  shR: 88, elR: 90, haR: 90,
  thR: 93, snR: 88, thL: 89, snL: 86, ftR: 180, ftL: 180,
};
export const P_AT = { x: -760, h: 1180, S: 3050 };
export const C_AT = { x: -135, h: 1285, S: 3330 };

let cache = null;
let embracePainter = null;
let embraceDirty = false;
export function embraceImage(tex) {
  // The probe pass draws with stand-in patterns so every source canvas exists before decoding.
  // Keep the same painter across that pass and the real redraw, and don't reuse the stand-in pixels.
  if (cache && !embraceDirty) return cache;
  if (!cache) {
    cache = createCanvas(IMG.w, IMG.h);
    embracePainter = new Painter(cache.getContext('2d'), tex, { W: IMG.w, H: IMG.h });
  }
  // A pattern miss can interrupt this draw part way through; until a complete real draw has
  // finished, the image counts as dirty and is redrawn from scratch on the next call.
  embraceDirty = true;
  const ctx = cache.getContext('2d');
  ctx.reset();
  const pt = embracePainter;
  pt.ctx = ctx;
  pt.zoom = 1;
  pt.lineComp = 0;
  pt.frame = 0;
  const sc = IMG.w / (WALL.x1 - WALL.x0); // pixels per world unit
  const pa = w2i(P_AT.x, P_AT.h), ca = w2i(C_AT.x, C_AT.h);
  const P = { pose: P_EMB, X: pa[0], Y: pa[1], S: P_AT.S * sc, zoom: 1, lineW: 7, wash: 0.05, trace: 1, gapLen: 0.05, boil: 0 };
  const C = { pose: C_EMB, X: ca[0], Y: ca[1], S: C_AT.S * sc, zoom: 1, lineAlpha: 0.7, boil: 0 };
  // interleaved: bodies first, then each near arm over the other's body
  drawCompanion(pt, { ...C, only: ['far', 'body'] });
  drawProtagonist(pt, { ...P, only: ['far', 'body'] });
  drawProtagonist(pt, { ...P, only: ['near'] });
  drawCompanion(pt, { ...C, only: ['near'] });
  embraceDirty = patternProbeActive();
  return cache;
}

/** the touching hands (image pixels and wall coordinates) */
export function contactPoint() {
  const sc = IMG.w / (WALL.x1 - WALL.x0);
  const JP = fk(P_EMB), JC = fk(C_EMB);
  const pa = w2i(P_AT.x, P_AT.h), ca = w2i(C_AT.x, C_AT.h);
  const hp = [pa[0] + JP.haR[0] * P_AT.S * sc, pa[1] + JP.haR[1] * P_AT.S * sc];
  const hc = [ca[0] + JC.haL[0] * C_AT.S * sc, ca[1] + JC.haL[1] * C_AT.S * sc];
  const img = hc;
  const x = WALL.x0 + (img[0] / IMG.w) * (WALL.x1 - WALL.x0), h = (1 - img[1] / IMG.h) * WALL.h1;
  return { img, wall: [x, h], hp, hc };
}
