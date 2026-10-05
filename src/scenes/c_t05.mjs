// T05: a delayed gesture peels up a sheet of paper (114.09 - 147.1 s)
// One camera throughout, first straight overhead (the drawing seen flat):
//  1. the enormous profile turns away; its old contour lags and lifts like a paper edge
//  2. the camera leans in; the protagonist catches the edge at the lips
//  3. the corridor's sheet turns over like a page (right → left), revealing an earlier reach
//  4. the pull runs on: the camera cranes down behind the protagonist while old
//     doorframes, footprints and turning figures stand up in succession, near first.
// The turned sheet, its back carrying the hooked crease, stays in the foreground.
import { V, clamp, lerp, seg, es, ease, catmull, resample, mulberry32, TAU } from '../lib/math.mjs';
import { PAL, rgba, mixc } from '../lib/palette.mjs';
import { REST, fk, pieces, toScreen, drawProtagonist, hookPts } from '../lib/rig.mjs';
import { traceUnion, cutLoop, anchorLoop } from '../lib/trace.mjs';
import { camera, project, projectPoly, projectLine, sheetFrame, facing, depth } from '../lib/field.mjs';
import { drawProfileScene, profileEnd, P_END } from './b_profile.mjs';
import { P_TOUCH, REACH_BACK, STAND_BACK, mixPose, walkPose, walkBack } from './poses.mjs';
import { M } from '../timeline.mjs';

const T5 = M.on114; // 114.09
const END = profileEnd();
const S2W = (p) => [p[0] - 960, 540 - p[1]]; // overhead camera: screen ↔ ground (x, z)
const W2S0 = (x, z) => [x + 960, 540 - z];

// ---------- beats ----------
export const turnK = (t) => es(t, T5, 118.4, ease.io2);
export const liftK = (t) => es(t, T5 + 0.8, 119.8, ease.io2);
export const catchK = (t) => es(t, 118.4, M.on122, ease.io3);
export const pageK = (t) => es(t, M.on122 + 0.2, 129.4, ease.io3);
export const craneK = (t) => es(t, M.ret, 139.6, ease.io3);

// ---------- camera: overhead lean-in → pull back → crane down behind the walker ----------
const E0 = P_END(T5);
const PW = S2W(E0.feet); // walker's ground position (x, z)
const LIPS = S2W([E0.feet[0] + 20, E0.feet[1] - 30]);
export const PSTAND = [-350, -160]; // where the walker stands after letting go (ground x, z)
export function cam5(t) {
  const lean = es(t, T5 + 0.4, 120.8, ease.io3) * (1 - es(t, M.on122 + 0.6, 127.8, ease.io3));
  const k = craneK(t);
  const look0 = V.lerp([0, 0], LIPS, lean * 0.8);
  const look = [lerp(look0[0], PSTAND[0] + 40, k), 0, lerp(look0[1], 900, k)];
  const D = lerp(lerp(3000, 1800, lean), 1355, k);
  const pitch = lerp(Math.PI / 2, 0.15, ease.io2(k));
  const f = lerp(3000, 1350, k);
  return camera(look, D, pitch, f);
}
/** while overhead: the 2D transform that maps the flat drawing (screen at t = 114) to the view */
function overheadM(cam) {
  const z = cam.f / cam.pos[1];
  const lx = cam.pos[0], lz = cam.pos[2];
  // s' = z*s + (960 - z*(960 + lx), 540 - z*(540 - lz))
  return [z, 0, 0, z, 960 - z * (960 + lx), 540 - z * (540 - lz)];
}

// ---------- the corridor sheet (S1): everything left of the contour ----------
const PROF_S = END.prof;
const HEAD_S = [...END.prof, ...catmull(END.head, 8)]; // the whole head silhouette (screen at t = 114)
const contourX = (y) => {
  // S1 (the corridor's sheet) is everything left of the head; its right edge is the head's left edge
  let best = null;
  for (let i = 0; i < HEAD_S.length; i++) {
    const a = HEAD_S[i], b = HEAD_S[(i + 1) % HEAD_S.length];
    if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) {
      const x = a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
      best = best === null ? x : Math.min(best, x);
    }
  }
  return best ?? 1960;
};
const XF0 = Math.max(...PROF_S.filter((p) => p[1] > -40 && p[1] < 1120).map((p) => p[0])) + 12;
const XF1 = 300;
const foldX = (t) => lerp(XF0, XF1, pageK(t));
const pageAngle = (t) => Math.PI * clamp(pageK(t) * 1.3 + 0.04 * catchK(t));
const ROWS = (() => {
  const r = [];
  for (let y = -80; y <= 1160; y += 16) r.push([y, contourX(y)]);
  return r;
})();

// ---------- the earlier reach (S2): drawn beneath S1 ----------
const REACH = (() => {
  const pose = { ...REACH_BACK, shR: -42, elR: -34, haR: -30 };
  const J = fk(pose);
  const S = 700, X = 500, Y = 600;
  const planes = pieces(J, { garment: 'short', hair: 'short' }).map((pl) => toScreen(pl.polys, X, Y, S));
  const loops = traceUnion(planes.flat(), 2.4, { smooth: 3 });
  const outer = anchorLoop(loops[0].pts, [X, Y - 0.9 * S]);
  const shR = [X + J.shR[0] * S, Y + J.shR[1] * S - 0.03 * S];
  const open = cutLoop(outer, shR, 0.045 * S);
  return { loops, open };
})();
// S2's paper rectangle in screen coords at t = 114 (under S1)
const S2R = { x0: 150, x1: 860, y0: 150, y1: 1000 };

function drawReach(pt, map, alpha, lw) {
  const ctx = pt.ctx;
  const loops = REACH.loops.map((l) => l.pts.map(map));
  ctx.save();
  ctx.beginPath();
  for (const l of loops) {
    ctx.moveTo(l[0][0], l[0][1]);
    for (const q of l) ctx.lineTo(q[0], q[1]);
    ctx.closePath();
  }
  ctx.fillStyle = rgba(PAL.indigo, 0.08 * alpha);
  ctx.fill('evenodd');
  ctx.restore();
  pt.ink(REACH.open.map(map), { w: Math.max(0.6, 5.5 * lw), color: PAL.indigo, alpha: 0.9 * alpha, seed: 701, taper: [0.03, 0.03], press: 0.45 });
  const e = REACH.open[REACH.open.length - 1], pre = REACH.open[REACH.open.length - 6];
  const td = V.norm(V.sub(e, pre));
  pt.ink(hookPts(e, td, V.perp(td), 30).map(map), { w: Math.max(0.6, 5 * lw), color: PAL.indigo, alpha: 0.9 * alpha, seed: 703, taper: [0, 0.5] });
}

// ---------- evidence sheets ahead, for the cascade (and the wave) ----------
export const FIELD = (() => {
  const r = mulberry32(515);
  const out = [];
  const kinds = ['door', 'foot', 'figure', 'door', 'hook', 'foot', 'figure', 'palm', 'door', 'figure'];
  let i = 0;
  for (let row = 0; row < 7; row++) {
    const z = 520 + row * 360 + row * row * 40;
    const n = 4 + row * 2;
    for (let c = 0; c < n; c++) {
      const w = 300 + r() * 220 + row * 30, d = w * (0.62 + r() * 0.25);
      const x = -150 + (c - (n - 1) / 2) * (w * 1.18) + (r() - 0.5) * 80;
      out.push({ i: i++, x: x - w / 2, z: z + (r() - 0.5) * 90, w, d, rotY: (r() - 0.5) * 0.35, kind: kinds[Math.floor(r() * kinds.length)], seed: Math.floor(r() * 1e5), row });
    }
  }
  for (const s of out) s.dist = Math.hypot(s.x + s.w / 2 - PW[0], s.z - PW[1]);
  return out;
})();

export function sheetItems(kind, w, d, seed) {
  // v = 0 is the near edge; raised on the far edge it becomes the top of the standing sheet
  const r = mulberry32(seed);
  const items = [];
  if (kind === 'door') {
    const fw = w * 0.32, fh = d * 0.8, cx = w * (0.35 + r() * 0.3), top = d * 0.1;
    for (let k = 0; k < 3; k++) {
      const s = 1 - k * 0.3;
      const bottom = d * 0.94;
      items.push({ pts: [[cx - (fw * s) / 2, bottom], [cx - (fw * s) / 2, bottom - fh * s], [cx + (fw * s) / 2, bottom - fh * s], [cx + (fw * s) / 2, bottom]], w: 3, alpha: 0.85 - k * 0.2 });
    }
  } else if (kind === 'foot') {
    items.push({ fill: [[w * 0.08, d * 0.4], [w * 0.92, d * 0.36], [w * 0.92, d * 0.6], [w * 0.08, d * 0.64]], color: [150, 152, 176], alpha: 0.75 });
    for (let k = 0; k < 6; k++) {
      const x = w * (0.16 + k * 0.13), y = d * (0.5 + (k % 2 ? 0.05 : -0.05));
      items.push({ ellipse: [x, y, w * 0.035, d * 0.024], color: PAL.paperLight, alpha: 0.95 });
    }
    items.push({ pts: [[w * 0.06, d * 0.36], [w * 0.94, d * 0.33]], w: 3, alpha: 0.8 });
  } else if (kind === 'figure') {
    items.push({ figure: true, x: w * (0.3 + r() * 0.4), top: d * 0.1, S: d * 0.8, yaw: [1, 2, 0, -1][Math.floor(r() * 4)] });
  } else if (kind === 'hook') {
    const pts = catmull([[w * 0.1, d * 0.5], [w * 0.4, d * 0.46], [w * 0.7, d * 0.52]], 6);
    items.push({ pts, w: 4, alpha: 0.9 });
    items.push({ pts: hookPts([w * 0.7, d * 0.52], [1, 0.1], [0.1, 1], d * 0.18), w: 4, alpha: 0.9 });
  } else if (kind === 'palm') {
    items.push({ fill: [[w * 0.2, d * 0.2], [w * 0.8, d * 0.18], [w * 0.85, d * 0.8], [w * 0.15, d * 0.82]], color: PAL.vermilion, alpha: 0.95 });
    items.push({ pts: catmull([[w * 0.25, d * 0.5], [w * 0.5, d * 0.46], [w * 0.8, d * 0.4]], 5), w: 3, color: PAL.vermilionDeep, alpha: 0.8 });
  }
  return items;
}
const ITEMS = new Map();
export function itemsOf(s) {
  if (!ITEMS.has(s.i)) ITEMS.set(s.i, sheetItems(s.kind, s.w, s.d, s.seed));
  return ITEMS.get(s.i);
}
/** cascade: sheets stand up on their near edges once the pull reaches them (near first) */
export function liftOf(s, t) {
  const t0 = 139.4 + s.dist / 700 + (s.seed % 7) * 0.07;
  return es(t, t0, t0 + 1.9, ease.io3);
}

// ---------- 3D sheet drawing ----------
export function drawSheet3(pt, cam, sh, o = {}) {
  const ctx = pt.ctx;
  const F = sheetFrame(sh);
  const out3 = (sh.outline || [[0, 0], [sh.w, 0], [sh.w, sh.d], [0, sh.d]]).map(([u, v]) => F(u, v));
  const q = projectPoly(cam, out3);
  if (q.length < 3) return;
  const scr = q.map((p) => [p[0], p[1]]);
  // which side faces us: compare with the sheet's local orientation
  const a = project(cam, F(0, 0)), b = project(cam, F(sh.w, 0)), c = project(cam, F(0, sh.d));
  const front = a && b && c ? (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0 : true;
  const al = o.alpha ?? 1;
  if (!pt.animatic && (sh.theta || 0) > 0.02) {
    const g = projectPoly(cam, out3.map(([x, y, z]) => [x + y * 0.3, 0, z + y * 0.45]));
    if (g.length > 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.filter = `blur(${6 * (ctx.canvas.width / pt.W)}px)`;
      pt.path(g.map((p) => [p[0], p[1]]), true);
      ctx.fillStyle = rgba(PAL.indigo, 0.15 * Math.min(1, sh.theta * 2) * al);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.save();
  ctx.globalAlpha *= al;
  pt.path(scr, true);
  if (pt.animatic) {
    ctx.fillStyle = rgba(front ? PAL.paperLight : PAL.paper);
    ctx.fill();
  } else {
    ctx.fillStyle = pt.pattern(pt.tex.paper, [1, 0, 0, 1, (sh.i || 0) * 37, (sh.i || 0) * 53], 0.62);
    ctx.fill();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgba(front ? PAL.paperLight : PAL.paperShade, front ? 0.3 : 0.45);
    ctx.fill();
  }
  ctx.restore();
  const dm = scr.length ? q.reduce((s2, p) => s2 + p[2], 0) / q.length : 1000;
  const lw = cam.f / Math.max(50, dm);
  const mapL = (pts) => projectLine(cam, pts.map((p) => F(p[0], p[1])));
  const see = front ? 1 : o.backSee ?? 0.3;
  ctx.save();
  pt.path(scr, true);
  ctx.clip();
  if (o.content) o.content(mapL, lw, front, see);
  for (const it of sh.items || []) drawItem(pt, it, mapL, lw, see * al, cam, F);
  if (!front && o.back) o.back(mapL, lw);
  ctx.restore();
  pt.ink(scr.concat([scr[0]]), { w: Math.max(0.6, 1.3 * lw), color: PAL.indigo, alpha: 0.45 * al, seed: 900 + (sh.i || 0), taper: [0, 0], boilAmp: 0.2 });
}

export function drawItem(pt, it, mapL, lw, a, cam, F) {
  const ctx = pt.ctx;
  if (it.fill || it.ellipse) {
    let poly = it.fill;
    if (it.ellipse) {
      const [x, y, rx, ry] = it.ellipse;
      poly = [];
      for (let k = 0; k < 14; k++) poly.push([x + Math.cos((k / 14) * TAU) * rx, y + Math.sin((k / 14) * TAU) * ry]);
    }
    const q = projectPoly(cam, poly.map((p) => F(p[0], p[1])));
    if (q.length < 3) return;
    ctx.save();
    pt.path(q.map((p) => [p[0], p[1]]), true);
    ctx.fillStyle = rgba(it.color || PAL.indigo, (it.alpha ?? 1) * a);
    ctx.fill();
    ctx.restore();
  } else if (it.figure) {
    const pose = { ...REST, yaw: it.yaw, thR: 88, thL: 92, shR: 100, shL: 80 };
    const J = fk(pose);
    // head toward v = 0 (the top once the sheet stands)
    const planes = pieces(J, { garment: 'short', hair: 'short' }).map((pl) => pl.polys.map((poly) => poly.map(([x, y]) => [it.x + x * it.S, it.top + (y + 0.5) * it.S])));
    for (const pl of planes) for (const poly of pl) {
      for (const run of mapL(poly.concat([poly[0]]))) pt.ink(run, { w: Math.max(0.5, 2.2 * lw), color: PAL.indigo, alpha: 0.7 * a, seed: 950, taper: [0, 0], boilAmp: 0.2 });
    }
  } else if (it.pts) {
    for (const run of mapL(it.pts)) pt.ink(run, { w: Math.max(0.5, it.w * lw), color: it.color || PAL.indigo, alpha: (it.alpha ?? 1) * a, seed: 960, taper: [0.05, 0.05], boilAmp: 0.2 });
  }
}

// ---------- scene ----------
export function drawT05(pt, t) {
  const ctx = pt.ctx;
  const scale = ctx.canvas.width / pt.W;
  const cam = cam5(t);
  const overhead = craneK(t) <= 0;
  const psi = pageAngle(t), xf = foldX(t);
  if (overhead) {
    const started = pageK(t) > 0;
    const Mo = overheadM(cam);
    // the head and corridor (end of T04) with the head turning away
    ctx.save();
    ctx.setTransform(Mo[0] * scale, 0, 0, Mo[3] * scale, Mo[4] * scale, Mo[5] * scale);
    drawProfileScene(pt, 200, { noP: true, noContour: true, faceShift: 70 * turnK(t), pre: Mo, headAlpha: 1 - es(t, 127.5, 129.9), corridorOn: 1 - es(t, T5, 118.6) });
    ctx.restore();
    if (started) {
      // where the page has lifted, the earlier reach shows
      ctx.save();
      ctx.setTransform(Mo[0] * scale, 0, 0, Mo[3] * scale, Mo[4] * scale, Mo[5] * scale);
      ctx.beginPath();
      ctx.moveTo(xf, -100);
      for (const [y, cx] of ROWS) ctx.lineTo(Math.max(xf, cx + 1), y);
      ctx.lineTo(xf, 1180);
      ctx.closePath();
      ctx.clip();
      const pm = [Mo[0], 0, 0, Mo[3], Mo[4], Mo[5]];
      pt.paperFill([[-100, -200], [2100, -200], [2100, 1300], [-100, 1300]], [1, 0, 0, 1, 0, 0], {});
      drawReach(pt, (p) => p, 1, 1);
      ctx.restore();
      drawPage(pt, cam, xf, psi);
      drawOldContour(pt, cam, t, xf, psi);
    } else {
      ctx.save();
      ctx.setTransform(Mo[0] * scale, 0, 0, Mo[3] * scale, Mo[4] * scale, Mo[5] * scale);
      drawLaggingContour(pt, t);
      ctx.restore();
    }
  } else {
    drawField(pt, t, cam);
  }
  drawWalker(pt, t, cam);
}

function drawLaggingContour(pt, t) {
  const ctx = pt.ctx;
  const L = liftK(t), C = catchK(t);
  // lifted more where the hand holds it
  const hold = S2W([0, 0]);
  const lifted = PROF_S.map((p) => {
    const near = Math.exp(-((p[1] - E0.feet[1] + 40) ** 2) / (2 * 90 * 90));
    const k = L * (0.6 + 0.4 * near) + C * near * 0.8;
    return [p[0] - 5 * k, p[1] - 8 * k, k];
  });
  if (!pt.animatic && L > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = `blur(${(3 + 5 * L) * (ctx.canvas.width / pt.W) * 1.5}px)`;
    ctx.lineWidth = 8 + 10 * L;
    ctx.strokeStyle = rgba(PAL.indigo, 0.2 * L);
    ctx.beginPath();
    PROF_S.forEach((p, i) => (i ? ctx.lineTo(p[0] + 6 * L, p[1] + 9 * L) : ctx.moveTo(p[0] + 6 * L, p[1] + 9 * L)));
    ctx.stroke();
    ctx.restore();
  }
  if (L > 0.05) pt.ink(lifted.map((p) => [p[0] + 3.5, p[1] + 1]), { w: 3.2, color: PAL.paperLight, alpha: 0.9 * L, seed: 347, taper: [0.1, 0.1] });
  pt.ink(lifted.map((p) => [p[0], p[1]]), { w: 3, color: PAL.indigo, alpha: 1, seed: 340, taper: [0.03, 0.08], press: 0.4 });
  const ph = END.philtrum;
  const i0 = PROF_S.findIndex((p) => p[1] > ph[1] - 2);
  const td = V.norm(V.sub(PROF_S[Math.min(PROF_S.length - 1, i0 + 6)], PROF_S[Math.max(0, i0 - 6)]));
  const k = lifted[Math.max(0, i0)][2];
  pt.ink(hookPts([ph[0] - 5 * k, ph[1] - 8 * k], td, V.perp(td), 9), { w: 2.4, color: PAL.indigo, alpha: 1, seed: 350, taper: [0, 0.5] });
}

const RC = 70; // curl length in px of paper
function bendAt(a, psi) {
  // position along the paper at distance a from the fold: angle ramps up over the curl, then stays
  const n = 26;
  let x = 0, h = 0;
  for (let i = 1; i <= n; i++) {
    const s0 = (a * (i - 0.5)) / n;
    const th = psi * Math.min(1, s0 / RC);
    x += Math.cos(th) * (a / n);
    h += Math.sin(th) * (a / n);
  }
  return [x, h];
}
/** the old contour rides on S1: flat left of the fold, carried over by the page right of it */
function drawOldContour(pt, cam, t, xf, psi) {
  const L = liftK(t);
  const pts3 = PROF_S.map(([x, y]) => {
    if (x <= xf || psi <= 0) return [x - 960 - 4 * L, 3 * L, 540 - y + 6 * L];
    const b = bendAt(x - xf, psi);
    return [xf + b[0] - 960, b[1] + 2, 540 - y];
  });
  for (const run of projectLine(cam, pts3)) pt.ink(run, { w: 3, color: PAL.indigo, alpha: 1, seed: 340, taper: [0.03, 0.08], press: 0.4 });
  const ph = END.philtrum;
  const at = (x, y) => (x <= xf || psi <= 0 ? [x - 960 - 4 * L, 3 * L, 540 - y + 6 * L] : ((b) => [xf + b[0] - 960, b[1] + 2, 540 - y])(bendAt(x - xf, psi)));
  const i0 = PROF_S.findIndex((p) => p[1] > ph[1] - 2);
  const a = PROF_S[Math.max(0, i0 - 6)], b = PROF_S[Math.min(PROF_S.length - 1, i0 + 6)];
  const td = V.norm(V.sub(b, a));
  const hk = hookPts(ph, td, V.perp(td), 9).map(([x, y]) => at(x, y));
  for (const run of projectLine(cam, hk)) pt.ink(run, { w: 2.6, color: PAL.indigo, alpha: 0.95, seed: 350, taper: [0, 0.5] });
}

function drawPage(pt, cam, xf, psi) {
  // the turned part of S1 bends around a rounded fold (a real curl, not a rigid panel)
  const ctx = pt.ctx;
  const rows = ROWS.filter(([y, cx]) => cx > xf);
  if (rows.length < 2) return;
  const bend = (a) => {
    // integrate the paper along its length: the angle ramps up over the curl, then stays
    const n = 26;
    let x = 0, h = 0;
    const out = [[0, 0]];
    for (let i = 1; i <= n; i++) {
      const s0 = (a * (i - 0.5)) / n;
      const th = psi * Math.min(1, s0 / RC);
      x += Math.cos(th) * (a / n);
      h += Math.sin(th) * (a / n);
      out.push([x, h]);
    }
    return out;
  };
  const place = (y, xy) => [xf + xy[0] - 960, xy[1], 540 - y];
  // edge (far end of each row) and the rows' curl profiles for shading
  const edge3 = [], strips = [];
  for (const [y, cx] of rows) {
    const prof = bend(cx - xf);
    edge3.push(place(y, prof[prof.length - 1]));
    strips.push({ y, prof });
  }
  const hinge3 = rows.map(([y]) => place(y, [0, 0])).reverse();
  const q = projectPoly(cam, [...edge3, ...hinge3]);
  if (q.length < 3) return;
  const poly = q.map((p) => [p[0], p[1]]);
  const back = psi > Math.PI / 2;
  if (!pt.animatic) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = `blur(${14 * (ctx.canvas.width / pt.W)}px)`;
    pt.path(poly.map((p) => [p[0] + 18 * Math.sin(psi), p[1] + 24 * Math.sin(psi)]), true);
    ctx.fillStyle = rgba(PAL.indigo, 0.2 * Math.sin(psi) + 0.06);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  pt.path(poly, true);
  ctx.fillStyle = pt.animatic ? rgba(back ? PAL.paperShade : PAL.paperLight) : pt.pattern(pt.tex.paper, [1, 0, 0, 1, 11, 7], 0.62);
  ctx.fill();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgba(back ? PAL.paperShade : PAL.paperLight, back ? 0.5 : 0.25);
  ctx.fill();
  ctx.restore();
  // shading across the bend: darker where the paper turns away from the light
  if (!pt.animatic) {
    const mid = strips[Math.floor(strips.length / 2)];
    const pa = project(cam, place(mid.y, mid.prof[0]));
    const k = Math.min(mid.prof.length - 1, Math.round(((RC * 1.1) / Math.max(1, mid.prof[mid.prof.length - 1][0] || 1)) * 26));
    const pb = project(cam, place(mid.y, mid.prof[Math.max(1, Math.min(mid.prof.length - 1, 12))]));
    if (pa && pb) {
      ctx.save();
      pt.path(poly, true);
      ctx.clip();
      ctx.globalCompositeOperation = 'multiply';
      const g = ctx.createLinearGradient(pa[0], pa[1], pb[0], pb[1]);
      g.addColorStop(0, rgba(PAL.indigo, 0.28 * Math.sin(psi)));
      g.addColorStop(1, rgba(PAL.indigo, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-100, -100, pt.W + 200, pt.H + 200);
      ctx.restore();
    }
  }
  // the sheet's cut edge
  for (const run of projectLine(cam, edge3)) pt.ink(run, { w: 1.6, color: PAL.indigo, alpha: 0.5, seed: 341, taper: [0.03, 0.08] });
  for (const run of projectLine(cam, hinge3)) pt.ink(run, { w: 1.4, color: PAL.indigo, alpha: 0.35, seed: 351, taper: [0.05, 0.05] });
}

function drawCreaseHook(pt, cam, map3, xf) {
  const ph = END.philtrum;
  if (ph[0] <= xf) return;
  const i0 = PROF_S.findIndex((p) => p[1] > ph[1] - 2);
  const a = PROF_S[Math.max(0, i0 - 6)], b = PROF_S[Math.min(PROF_S.length - 1, i0 + 6)];
  const td = V.norm(V.sub(b, a));
  const hk = hookPts(ph, td, V.perp(td), 9).map(([x, y]) => map3(x, y));
  for (const run of projectLine(cam, hk)) pt.ink(run, { w: 2.6, color: PAL.indigo, alpha: 0.9, seed: 350, taper: [0, 0.5] });
}

// S1 after the page turn: lying back-up, left of the fold line (world, flat)
const S1_BACK = (() => {
  const rows = ROWS.filter(([y, cx]) => cx > XF1);
  const edge = rows.map(([y, cx]) => [2 * XF1 - cx - 960, 540 - y]);
  const hinge = rows.map(([y]) => [XF1 - 960, 540 - y]).reverse();
  const zMin = Math.min(...[...edge, ...hinge].map((p) => p[1]));
  return { poly: [...edge, ...hinge], edge, zMin };
})();

/** the two sheets lying on the ground: S1 turned over (the hooked crease) and S2 (the earlier reach) */
export function drawGroundSheets(pt, cam, t, o = {}) {
  const ctx = pt.ctx;
  // S2 first (flat), then S1 on top at the left
  const s2 = { i: 999, o: [S2R.x0 - 960, 0, 540 - S2R.y1], w: S2R.x1 - S2R.x0, d: S2R.y1 - S2R.y0, theta: 0, hinge: 'near' };
  drawSheet3(pt, cam, s2, {
    alpha: o.s2Alpha ?? 1,
    backSee: 0.45,
    content: (mapL, lw, front, see) => {
      const map = (p) => {
        const r = mapL([[p[0] - S2R.x0, S2R.y1 - p[1]], [p[0] - S2R.x0 + 0.01, S2R.y1 - p[1]]]);
        return r.length ? r[0][0] : [-9999, -9999];
      };
      drawReach(pt, map, see, lw);
    },
  });
  const lift = o.s1Lift || 0; // S1 turning upward on its near edge (T06: its bend pulls the crest)
  const P3 = ([x, z]) => {
    const z0 = S1_BACK.zMin;
    const dz = z - z0;
    return [x, dz * Math.sin(lift), z0 + dz * Math.cos(lift)];
  };
  const q = projectPoly(cam, S1_BACK.poly.map(P3));
  if (q.length < 3) return;
  ctx.save();
  ctx.globalAlpha *= o.s1Alpha ?? 1;
  pt.path(q.map((p) => [p[0], p[1]]), true);
  ctx.fillStyle = pt.animatic ? rgba(PAL.paperShade) : pt.pattern(pt.tex.paper, [1, 0, 0, 1, 11, 7], 0.62);
  ctx.fill();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgba(PAL.paperShade, 0.55);
  ctx.fill();
  ctx.restore();
  for (const run of projectLine(cam, S1_BACK.edge.map(P3))) pt.ink(run, { w: 3, color: PAL.indigo, alpha: 0.85 * (o.s1Alpha ?? 1), seed: 340, taper: [0.03, 0.08], press: 0.4 });
  drawCreaseHook(pt, cam, (x, y) => P3([2 * XF1 - x - 960, 540 - y]), -1e9);
}

function drawField(pt, t, cam) {
  pt.paper([1, 0, 0, 1, 0, 0]);
  drawGroundSheets(pt, cam, t);
  const list = [];
  for (const s of FIELD) {
    const th = liftOf(s, t) * (Math.PI / 2) * 0.96;
    const sh = { i: s.i, o: [s.x, 0, s.z], w: s.w, d: s.d, theta: th, hinge: 'far', rotY: s.rotY, items: itemsOf(s) };
    list.push({ d: depth(cam, [s.x + s.w / 2, 0, s.z + s.d]), draw: () => drawSheet3(pt, cam, sh, { backSee: 0.28 }) });
  }
  list.sort((a, b) => b.d - a.d);
  for (const it of list) it.draw();
}

function drawWalker(pt, t, cam) {
  // at the lips: reaches for the edge, pulls it leftward, lets go and turns to watch
  let feet = E0.feet.slice();
  let pose = P_TOUCH;
  const c = catchK(t), pull = pageK(t);
  if (c > 0) pose = mixPose(P_TOUCH, { ...P_TOUCH, shR: -48, elR: -62, haR: -66, spine: -86, head: -80 }, c);
  if (pull > 0) {
    const walkPh = (t - M.on122) * 1.15;
    pose = mixPose(pose, { ...walkPose(walkPh, 0.75, -1), shR: -150, elR: -158, haR: -160 }, clamp(pull * 3));
    const k = ease.io2(clamp(pull * 1.25));
    feet = [lerp(feet[0], PSTAND[0] + 960, k), lerp(feet[1], 540 - PSTAND[1], k)];
    // lets go, stands facing the field
    pose = mixPose(pose, { ...STAND_BACK }, es(t, 128.6, 131.5));
  }
  const w = S2W(feet);
  const q = project(cam, [w[0], 0, w[1]]);
  if (!q) return;
  const S = E0.S * (cam.f / q[2]);
  if (S > 2600) return;
  drawProtagonist(pt, { pose, X: q[0], Y: q[1] - 0.49 * S, S, zoom: 1, lineW: Math.max(0.8, Math.min(6, S * 0.02)), wash: 0.06, seed: 131, trace: 1, gapLen: 0.07 });
}
