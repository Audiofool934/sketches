// T04: the corridor folds into a profile (100.2 - 114.09 s)
// The protagonist's fingertip rests on the far doorframe's right jamb and stays
// fixed on screen; the drawing folds around it: the beam becomes a brow, the jamb
// a nose bridge, the floor angle lips, chin and jaw, and the exit slides into the
// mouth. Then the composition widens: the corridor is the inner contour of an
// enormous head. The protagonist continues along the same line.
import { V, clamp, lerp, seg, es, ease, catmull, resample, cumLengths, pointAt, TAU, mulberry32 } from '../lib/math.mjs';
import { PAL, rgba, mixc } from '../lib/palette.mjs';
import { REST, fk, drawProtagonist, hookPts, pieces, toScreen, inkCutout } from '../lib/rig.mjs';
import { COR, projUV, drawCorridor } from '../lib/corridor.mjs';
import { makeWarp } from '../lib/warp.mjs';
import { STAND_BACK, mixPose, walkBack, P_TOUCH, P_X_TOUCH, pAtWall } from './poses.mjs';
import { zcamAt, pDepthB, BX, BY, BPX, LW, M80 } from './b_corridor.mjs';
import { eyeAt, panAt, K2, Z_WALL, X_WALL, ZC_T } from './b_geom.mjs';
import { P_SIZE } from './a_city.mjs';
import { M } from '../timeline.mjs';

const T0 = M.layer2; // 100.2
const ZC = ZC_T;
const PAN = panAt(T0);
const EYE = eyeAt(T0);
const map = (u, v) => [BX + u * BPX, BY - v * BPX + PAN];
const sp = (X, Y, z) => {
  const r = projUV(X, Y, z, ZC, EYE);
  return [BX + r[0] * BPX, BY - r[1] * BPX + PAN, r[2]];
};


// ---- the protagonist at the wall ----
const ZP = Z_WALL;
function pScreen(X) {
  const f = sp(X, 0, ZP);
  const S = P_SIZE * f[2] * BPX;
  return { X: f[0], Y: f[1] - 0.49 * S, S, feet: [f[0], f[1]] };
}
const PS = pScreen(X_WALL);
const JT = fk(P_TOUCH);
export const C = [PS.X + JT.haR[0] * PS.S, PS.Y + JT.haR[1] * PS.S];

// ---- target profile (facing left), relative to the stomion (the mouth opening) ----
const REL = [
  ['foreTop', 95, -800], ['fore', 40, -620], ['brow', 4, -470], ['socket', 40, -400], ['bridge', 18, -320],
  ['bridgeL', -10, -210], ['tip', -60, -120], ['base', -2, -78], ['philtrum', 8, -48], ['upper', -18, -14],
  ['mouth', 0, 0], ['lower', -14, 16], ['labio', 6, 48], ['chin', -6, 110], ['chinB', 60, 190], ['jaw', 260, 240], ['jawA', 430, 180],
];
const KF = 1.28; // face scale: brow near the top of frame, chin near the bottom
const relOf = (n) => REL.find((r) => r[0] === n);
// the fingertip rests on the philtrum; the mouth opening sits just below-left of it
const MOUTH = V.sub(C, V.mul([relOf('philtrum')[1], relOf('philtrum')[2]], KF));
const toFace = (x, y) => V.add(MOUTH, V.mul([x, y], KF));
export const PROF = Object.fromEntries(REL.map(([n, x, y]) => [n, toFace(x, y)]));
export const PROFILE = catmull(REL.map(([n]) => PROF[n]), 10);
const profU = (name) => {
  const idx = REL.findIndex((r) => r[0] === name) * 10;
  const cum = cumLengths(PROFILE);
  return cum[Math.min(idx, cum.length - 1)] / cum[cum.length - 1];
};
const sub = (u0, u1, n) => {
  const cum = cumLengths(PROFILE);
  const out = [];
  for (let i = 0; i < n; i++) out.push(pointAt(PROFILE, lerp(u0, u1, i / (n - 1)), cum));
  return out;
};

// ---- the source lines in the corridor drawing ----
const zk = K2 * COR.SPACING;
const W = COR.W / 2, H = COR.H, band = 8;
const jTop = sp(W + band, H + band, zk), jBot = sp(W + band, 0, zk), bLeft = sp(-W - band, H + band, zk);
const VP = [BX, BY - EYE * BPX + PAN];
const zNear = Math.max(ZC - COR.Zc + 20, 0);
const fNear = sp(W, 0, zNear), fFar = sp(W, 0, COR.EXIT_Z);
const N = 48;
// jamb (top → bottom) becomes socket → bridge → nose → philtrum (where the fingertip rests)
const JAMB_SRC = resample([[jTop[0], jTop[1]], [jBot[0], jBot[1]]], N);
const JAMB_DST = sub(profU('socket'), profU('philtrum'), N);
// beam (left → right) becomes the brow ridge above the eye
const BEAM_SRC = resample([[bLeft[0], bLeft[1]], [jTop[0], jTop[1]]], N);
const BEAM_DST = sub(profU('fore'), profU('socket'), N);
// right floor line (exit → near) becomes upper lip → mouth → chin → jaw
const FLOOR_SRC = resample([[fFar[0], fFar[1]], [fNear[0], fNear[1]]], N);
const FLOOR_DST = sub(profU('philtrum'), 1, N);
// everything else follows gently: the exit slides a little to become the mouth
const WARP = makeWarp([VP, [jTop[0], jTop[1]], [jBot[0], jBot[1]]], [MOUTH, PROF.socket, C], 420, [C, PS.feet, [-300, -300], [2220, -300], [-300, 1380], [2220, 1380], [300, 540], [600, 900]]);

export const fold = (t) => es(t, T0 + 0.3, 106.0, ease.io2);
const foldJ = (t) => es(t, T0 + 0.5, 104.2, ease.io3); // nearest the finger first
const foldB = (t) => es(t, T0 + 1.6, 105.2, ease.io3);
const foldF = (t) => es(t, T0 + 2.4, 105.9, ease.io3);
// widening: scale about the mouth (the exit), re-centred
export function widen(t) {
  const k = es(t, 106.0, 111.2, ease.io3);
  const s = lerp(1, 0.45, k);
  const piv = MOUTH;
  const to = V.lerp(piv, [800, 600], k);
  return { k, s, f: (p) => [(p[0] - piv[0]) * s + to[0], (p[1] - piv[1]) * s + to[1]] };
}

// the head beyond the face contour (cranium, back of the head, neck), pre-widen coordinates
const HEAD = [
  toFace(470, 330), toFace(500, 560), toFace(470, 780), toFace(300, 980), toFace(120, 1180), toFace(-200, 1500),
  toFace(2600, 1500), toFace(2300, 1150), toFace(1780, 980), toFace(1480, 820), toFace(1560, 500),
  toFace(1680, -120), toFace(1520, -760), toFace(1100, -1180), toFace(560, -1260), toFace(160, -960),
];
const EAR = catmull([toFace(560, -330), toFace(660, -380), toFace(700, -240), toFace(640, -110), toFace(570, -140)], 8);

export function drawProfileScene(pt, t, opts = {}) {
  const ctx = pt.ctx;
  const Wd = widen(t);
  const fw = fold(t);
  const warp = (p) => Wd.f(V.lerp(p, WARP(p), fw));
  // background paper, carried by the widening
  let Mb = [Wd.s * M80[0], Wd.s * M80[1], Wd.s * M80[2], Wd.s * M80[3], Wd.s * M80[4] + Wd.f([0, 0])[0], Wd.s * M80[5] + Wd.f([0, 0])[1]];
  if (opts.pre) {
    const q = opts.pre;
    Mb = [q[0] * Mb[0] + q[2] * Mb[1], q[1] * Mb[0] + q[3] * Mb[1], q[0] * Mb[2] + q[2] * Mb[3], q[1] * Mb[2] + q[3] * Mb[3], q[0] * Mb[4] + q[2] * Mb[5] + q[4], q[1] * Mb[4] + q[3] * Mb[5] + q[5]];
  }
  pt.paper(Mb);
  const hideK3 = es(t, T0 + 0.35, T0 + 0.6);
  drawCorridor(pt, map, {
    zcam: ZC, on: opts.corridorOn ?? 1, skipEntry: true, lw: LW * lerp(1, 0.8, Wd.k), warp, eye: EYE, texM: Mb, texScale: 0.62,
    alphaK: (k) => (k < K2 ? 1 - es(t, T0 + 0.8 + k * 0.6, T0 + 3.6 + k * 0.6) : 1),
    nearFade: Wd.k,
    hideJamb: (k) => (k === K2 ? hideK3 : 0),
    hideRay: (X, Y) => (X > 0 && Y === 0 ? hideK3 : 0),
  });
  // morphing lines (the principal contour forming around the fingertip)
  const w = (4.0 * Wd.s + 1.0);
  const mline = (src, dst, k, seed) => {
    const pts = src.map((p, i) => Wd.f(V.lerp(p, dst[i], k)));
    if (k <= 0) return;
    pt.ink(pts, { w: lerp(1.6 * LW * 0.6, w, k), color: PAL.indigo, alpha: 0.9, seed, taper: [0.02, 0.02], press: 0.35 });
  };
  const fj = foldJ(t), fb = foldB(t), ff = foldF(t);
  const merged = es(t, 105.8, 106.6);
  // head: paper cut-out to the right of the face contour, rising as the face completes
  const headOn = es(t, 104.6, 108.2) * (opts.headAlpha ?? 1);
  const turnF = opts.headTurn ? ((p) => V.add(opts.headPivot, V.rot(V.sub(p, opts.headPivot), opts.headTurn))) : (p) => p;
  // the head turning away: its face edge withdraws to the right, nose and lips flattening
  const faceF = opts.faceShift ? ((p, i) => [p[0] + opts.faceShift * Math.pow(Math.sin((i / (PROFILE.length - 1)) * Math.PI), 0.8), p[1]]) : (p) => p;
  if (headOn > 0 && !opts.noHead) {
    const outline = [...PROFILE.map(Wd.f).map(faceF), ...catmull(HEAD.map(Wd.f), 8)].map(turnF);
    ctx.save();
    ctx.globalAlpha = headOn;
    pt.shadow(outline, { dx: 10 * Wd.s, dy: 14 * Wd.s, blur: 18 * Wd.s, alpha: 0.26 });
    pt.paperFill(outline, Mb, { tint: PAL.paperLight, tintAlpha: 0.5 });
    ctx.restore();
    pt.ink(EAR.map(Wd.f).map(turnF), { w: 2.6 * Wd.s + 0.8, color: PAL.indigo, alpha: 0.7 * headOn, seed: 331, taper: [0.2, 0.3] });
    pt.ink(catmull(HEAD.map(Wd.f).map(turnF), 8), { w: 3 * Wd.s + 1, color: PAL.indigo, alpha: 0.75 * headOn, seed: 332, taper: [0.05, 0.05] });
    if (opts.faceShift) pt.ink(PROFILE.map(Wd.f).map(faceF), { w: 2.0 * Wd.s + 0.8, color: PAL.indigo, alpha: 0.5 * headOn, seed: 333, taper: [0.05, 0.05] });
  }
  if (merged < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - merged;
    mline(JAMB_SRC, JAMB_DST, fj, 341);
    mline(BEAM_SRC, BEAM_DST, fb, 342);
    mline(FLOOR_SRC, FLOOR_DST, ff, 343);
    ctx.restore();
  }
  const prof = PROFILE.map(Wd.f);
  if (merged > 0 && !opts.noContour) pt.ink(prof, { w, color: PAL.indigo, alpha: merged, seed: 340, taper: [0.03, 0.08], press: 0.4 });
  if (!opts.noP) drawProtagonistOnProfile(pt, t, Wd, prof);
  return { prof, Wd };
}
/** the widened end state as seen from T05 on */
export const profileEnd = () => ({ prof: PROFILE.map(widen(200).f), mouth: widen(200).f(MOUTH), headOutline: [...PROFILE, ...HEAD].map(widen(200).f), head: HEAD.map(widen(200).f), ear: EAR.map(widen(200).f), s: widen(200).s, philtrum: widen(200).f(PROF.philtrum), jawA: widen(200).f(PROF.jawA) });
export const P_END = (t) => {
  const Wd = widen(t);
  const ps = pScreen(X_WALL);
  let feet = Wd.f(ps.feet);
  let S = ps.S * Wd.s;
  const walkK = es(t, 111.2, M.on114, ease.io2);
  const m = Wd.f(MOUTH);
  feet = V.lerp(feet, [m[0] - 40 * Wd.s, m[1] + 60 * Wd.s], walkK * 0.5);
  S *= lerp(1, 0.86, walkK);
  return { feet, S };
};

function drawProtagonistOnProfile(pt, t, Wd, prof) {
  let pose = P_TOUCH;
  const ps = pScreen(X_WALL);
  let feet = Wd.f(ps.feet);
  let S = ps.S * Wd.s;
  // after the widening: continue along the line toward the mouth (the exit)
  const walkK = es(t, 111.2, M.on114, ease.io2);
  if (walkK > 0) {
    const m = Wd.f(MOUTH);
    feet = V.lerp(feet, [m[0] - 40 * Wd.s, m[1] + 60 * Wd.s], walkK * 0.5);
    S *= lerp(1, 0.86, walkK);
    const ph = (t - 111.2) * 1.3;
    pose = mixPose(P_TOUCH, { ...walkBack(ph, 0.8), yaw: 1.5, shR: -20, elR: -40, haR: -50 }, clamp(walkK * 2));
  }
  drawProtagonist(pt, { pose, X: feet[0], Y: feet[1] - 0.49 * S, S, zoom: 1, lineW: Math.max(0.8, 1.25 * LW * Math.sqrt((S / (P_SIZE * BPX)) / 0.88)), wash: 0.06, seed: 131, trace: 1, gapLen: 0.06 });
  // the hook travels with the fingertip along the jamb, then sits on the profile line
  const J = fk(pose);
  const tip = [feet[0] + J.haR[0] * S, feet[1] - 0.49 * S + J.haR[1] * S];
  const hookA = es(t, T0 - 0.8, T0 + 0.4);
  if (hookA > 0) {
    const tdir = V.norm(V.sub(prof[Math.min(prof.length - 1, 62)], prof[Math.max(0, 48)]));
    pt.ink(hookPts(V.add(tip, [2, 4]), tdir, V.perp(tdir), 13 * Wd.s + 4), { w: 2.6 * Wd.s + 0.8, color: PAL.indigo, alpha: hookA, seed: 350, taper: [0, 0.5] });
  }
}
