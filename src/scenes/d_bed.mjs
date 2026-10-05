// Movement V (224 - 232.6), T10 (232.6 - 238.5), Movement VI and T11 (238.5 - end).
// Back in the room of the opening, seen from above, the camera turned so the head
// of the bed is at the top: two heads lie face to face on the pillow and share one
// line (the companion's nose bridge above, the protagonist's forehead below; the
// hook at its end is the protagonist's closed eyelid). The colours exchange across
// it; the protagonist lifts their head; the outline stays in the old place; a
// fingertip comes back to it. The touch travels down the line, which sinks into the
// sheet as a fold; the bodies' colour runs into the weave. Only two shallow
// head-shaped hollows remain in the pillow's texture. They fill in; fabric lines
// carry the contour along the sheet's edge to the head of the bed, across the
// seam, into the old crack in the wall, while the camera turns back to the
// opening's orientation. The small gap moves once, and holds.
import { V, clamp, lerp, es, ease, catmull, resample, pointAt, subPoly, fbm2, noise2 } from '../lib/math.mjs';
import { PAL, rgba, mixc } from '../lib/palette.mjs';
import { CamPath, camMatrix, applyCam, toScreenPt, toWorldPt } from '../lib/camera.mjs';
import { hookPts } from '../lib/rig.mjs';
import { handGeom, drawHand } from '../lib/hand.mjs';
import { drawRoom, drawPillow, hemCurve, weaveTile, BED, CRACK, WALL_X } from './a_world.mjs';
import { traceUnion } from '../lib/trace.mjs';
import { M } from '../timeline.mjs';

// ---------- camera: close on the pillow (rolled a quarter turn), then to the crack in the wall ----------
export const CAM_V = { x: 330, y: 545, z: 2.2, r: Math.PI / 2 };
export const CAM_END = new CamPath([
  { t: 0, ...CAM_V, hold: true },
  { t: 239.8, ...CAM_V, hold: true },
  { t: 242.6, x: 385, y: 320, z: 1.95, r: 0.33 * Math.PI },
  { t: 244.9, x: 175, y: 215, z: 2.0, r: 0.09 * Math.PI },
  { t: 247.6, x: 200, y: 310, z: 1.7, r: 0, hold: true },
  { t: 260, x: 201, y: 311, z: 1.7, r: 0, hold: true },
]);
export const mV = camMatrix(CAM_V);
export const w2s = (p) => toScreenPt(mV, p);
const inv = (p) => toWorldPt(mV, p);
const W = (pts) => pts.map(inv);

// ---------- the two heads, authored in screen space at the close-up camera, stored in world units ----------
// the shared line, top to bottom: the companion's forehead, brow, nose bridge and tip; then, from the
// point where the tip rests, the protagonist's forehead down to the brow; the hook curls into the eyelid
export const SHARED_S0 = [[897, 226], [904, 262], [909, 298], [912, 326], [905, 343], [900, 355], [907, 373], [918, 392], [932, 412], [945, 428], [950, 438], [947, 451], [940, 465], [932, 480], [926, 494], [921, 507]];
const SHARED_SS = resample(catmull(SHARED_S0, 10), 400);
export const SHARED_W = W(SHARED_SS);
export const SHARED_S = SHARED_W.map(w2s);
const CONTACT = 10; // index in SHARED_S0 where the companion's nose tip rests on the protagonist's forehead

// the companion (left, facing right): vermilion cut paper
const C_FRONT_TOP = [[700, 88], [770, 96], [830, 125], [872, 170], [892, 212]];
const C_FRONT_LOW = [[921, 507], [912, 517], [903, 526], [899, 538], [902, 550], [896, 563], [883, 575], [860, 585], [834, 591], [812, 598], [800, 614], [795, 660], [794, 730], [798, 800], [804, 880], [810, 1000]];
const C_BACK = [[590, 1000], [592, 900], [595, 800], [600, 700], [606, 632], [576, 560], [548, 480], [526, 400], [522, 320], [535, 240], [565, 172], [612, 120], [660, 96]];
const C_HEAD_S = catmull([...C_FRONT_TOP, ...SHARED_S0, ...C_FRONT_LOW.slice(1), ...C_BACK], 6, true);
const C_BODY_S = catmull([[782, 770], [798, 830], [828, 896], [872, 1090], [468, 1090], [526, 906], [572, 830], [612, 770]], 6, true);
const C_HAIR_S = (() => {
  const outer = catmull([[897, 226], [905, 200], [898, 166], [878, 132], [848, 104], [808, 80], [760, 64], [708, 58], [658, 64], [612, 80], [570, 106], [534, 142], [508, 186], [486, 238], [470, 292], [462, 348], [466, 404], [476, 458], [492, 508], [516, 556], [548, 604], [586, 646], [620, 680]], 6);
  // spread on the pillow behind the head: a slow uneven wave pushes the back edge outward
  const sp = outer.map(([x, y], i) => {
    const w = clamp((640 - x) / 120);
    const push = w * (16 + 13 * Math.sin(i * 0.13 + 0.8) + 4 * Math.sin(i * 0.41 + 2.1));
    const d = V.norm(V.sub([x, y], [700, 380]));
    return [x + d[0] * push, y + d[1] * push];
  });
  const inner = catmull([[620, 680], [612, 640], [626, 596], [648, 556], [676, 514], [702, 484], [722, 462], [733, 430], [736, 392], [742, 358], [764, 338], [792, 328], [814, 312], [828, 286], [846, 258], [870, 238], [897, 226]], 6);
  return [...sp, ...inner];
})();
const C_STRANDS_S = [
  [[884, 176], [826, 128], [748, 104], [664, 112], [596, 148]],
  [[856, 232], [786, 192], [696, 180], [606, 212], [540, 268]],
  [[808, 292], [730, 262], [646, 276], [572, 326], [516, 392]],
  [[748, 336], [692, 346], [632, 396], [580, 466], [548, 540]],
  [[700, 470], [650, 530], [606, 604]],
];
const C_EAR_S = catmull([[716, 346], [700, 336], [680, 340], [666, 360], [662, 392], [668, 422], [680, 444], [697, 456], [712, 452], [717, 440]], 5);
const C_EAR_IN_S = catmull([[703, 362], [689, 373], [686, 398], [696, 417]], 5);
const C_EYE_S = catmull([[856, 364], [870, 372], [887, 369]], 5);
const C_BROW_S = catmull([[852, 340], [872, 334], [894, 333]], 5);
const C_MOUTH_S = catmull([[931, 482], [918, 484], [906, 482]], 4);
const C_NOSTRIL_S = catmull([[934, 425], [926, 431], [931, 438]], 4);
// the companion's left forearm lies over the sheet; the hand rests on the protagonist's shoulder
const C_ARM_S = catmull([[744, 1090], [770, 1012], [900, 972], [1050, 944], [1180, 916], [1250, 886], [1286, 918], [1200, 956], [1064, 990], [908, 1028], [828, 1090]], 6, true);
const C_HAND = { wrist: [1268, 902], dir: [0.85, -0.53], scale: 33 };

// the protagonist (right, facing left): indigo line on paper, hatched hair
const P_FACE_S = [[921, 507], [930, 517], [936, 528], [931, 541], [921, 554], [908, 570], [895, 584], [884, 594], [886, 603], [897, 608], [914, 611], [909, 621], [905, 630], [912, 640], [907, 651], [916, 663], [924, 670], [918, 684], [914, 697], [922, 715], [937, 728], [960, 738], [988, 746], [1015, 752], [1030, 764], [1036, 780], [1040, 830], [1040, 880], [1038, 930], [1040, 1000]];
const P_BACK_S = [[1265, 1000], [1262, 930], [1258, 860], [1260, 800], [1266, 745], [1290, 680], [1318, 600], [1330, 510], [1323, 430], [1298, 360], [1252, 308], [1192, 280], [1125, 272], [1062, 288], [1015, 318], [984, 356], [968, 396], [958, 418]];
const P_HEAD_S = catmull([...P_FACE_S, ...P_BACK_S, ...SHARED_S0.slice(CONTACT)], 6, true);
const P_HAIR_S = catmull([
  [968, 396], [984, 356], [1015, 318], [1062, 288], [1125, 272], [1192, 280], [1252, 308], [1298, 360], [1323, 430], [1330, 510], [1318, 600], [1290, 680], [1266, 745],
  [1244, 706], [1218, 668], [1198, 636], [1194, 590], [1190, 540], [1176, 496], [1140, 486], [1104, 478], [1074, 456], [1044, 432], [1010, 412],
], 6, true);
const P_EAR_S = catmull([[1128, 512], [1146, 500], [1168, 506], [1182, 530], [1186, 565], [1178, 598], [1162, 618], [1143, 622], [1132, 610]], 5);
const P_EAR_IN_S = catmull([[1143, 526], [1160, 541], [1162, 570], [1150, 589]], 5);
const P_EYE_S = catmull([[940, 530], [955, 537], [971, 533]], 5);
const P_BROW_S = catmull([[944, 510], [962, 504], [984, 503]], 5);
const P_MOUTH_S = catmull([[912, 640], [926, 643], [938, 641]], 4);
const P_SHOULDER_S = catmull([[1036, 780], [1040, 850], [1046, 1090], [1600, 1090], [1560, 970], [1490, 896], [1410, 840], [1336, 792], [1290, 762], [1266, 745]], 6, true);
const P_SHOULDER_LINE_S = catmull([[1266, 745], [1290, 762], [1336, 792], [1410, 840], [1490, 896], [1560, 970], [1590, 1060]], 8);

const C_HEAD = W(C_HEAD_S), C_BODY = W(C_BODY_S), C_HAIR = W(C_HAIR_S), C_EAR = W(C_EAR_S), C_EAR_IN = W(C_EAR_IN_S);
const C_EYE = W(C_EYE_S), C_BROW = W(C_BROW_S), C_MOUTH = W(C_MOUTH_S), C_NOSTRIL = W(C_NOSTRIL_S), C_ARM = W(C_ARM_S);
const C_STRANDS = C_STRANDS_S.map((l) => W(catmull(l, 8)));
// one silhouette for the whole companion (head, hair and shoulders), for the emptied outline and clips
const C_SIL = W(traceUnion([C_HEAD_S, C_HAIR_S, C_BODY_S], 2, { smooth: 2 }).sort((a, b) => b.pts.length - a.pts.length)[0].pts);
const P_HEAD = W(P_HEAD_S), P_SHOULDER = W(P_SHOULDER_S), P_SHOULDER_LINE = W(P_SHOULDER_LINE_S);
// the pillow keeps their shapes (used for the hollows once the bodies have gone into the sheet)
const HOLLOWS = [C_HEAD, P_HEAD];

// screen direction → world rotation for the hand rig (fingers point along local -y)
const handRot = (dirS) => {
  const a = toWorldPt(mV, [960 + dirS[0], 540 + dirS[1]]), o = toWorldPt(mV, [960, 540]);
  const d = V.norm(V.sub(a, o));
  return Math.atan2(d[0], -d[1]);
};

// ---------- beats ----------
export const exchK = (t) => es(t, 225.4, 228.6, ease.io2); // colour layers exchange across the line
export const liftH = (t) => es(t, 228.4, 230.6, ease.io3); // the protagonist lifts their head
export const turnBack = (t) => es(t, 230.2, 231.4, ease.io2);
export const reachK = (t) => es(t, 230.8, M.breath, ease.io2); // hesitant reach; the touch lands on the breath
export const travelK = (t) => es(t, M.breath, 236.2, ease.io2); // the line sinks down into the sheet
export const intoSheet = (t) => es(t, 233.6, 238.4, ease.io2); // colour runs into the weave, hand becomes paper
export const depress = (t) => 1 - es(t, 240.4, 243.4, ease.io2); // the hollows fill in
export const edgeRun = (t) => es(t, 240.6, 244.4, ease.io2); // fabric lines carry the contour to the seam
export const crackK = (t) => es(t, 243.6, 245.0, ease.io2); // the stroke crosses the seam into the crack
export const gapMove = (t) => es(t, 247.9, 248.8, ease.outSine) * (1 - 0.35 * es(t, 248.8, 249.6, ease.io2));

// the lifted head: rises toward the camera and away from the companion; the neck stays attached
function liftMap(t) {
  const lift = liftH(t), tb = turnBack(t);
  if (lift <= 0) return null;
  const piv = [1150, 900];
  const ang = -0.12 * lift + 0.08 * tb;
  const off = [64 * lift - 10 * tb, -22 * lift];
  const sc = 1 + 0.06 * lift;
  return (p) => {
    const w = 1 - es(p[1], 700, 900, ease.io2);
    const q = V.add(piv, V.rot(V.mul(V.sub(p, piv), 1 + (sc - 1) * w), ang * w));
    return V.add(q, V.mul(off, w));
  };
}

/** the whole ending in world coordinates (the room of the opening) */
export function drawEnding(pt, t, o = {}) {
  const ctx = pt.ctx;
  const scale = ctx.canvas.width / pt.W;
  const cam = CAM_END.at(t);
  const m = camMatrix(cam, pt.W, pt.H);
  applyCam(ctx, m, scale);
  pt.zoom = cam.z;
  pt.lineComp = 0.45;
  drawRoom(pt, m, { crackPts: crackNow(t), crackAlpha: 0.9, crackW: 2.6 });
  drawPillow(pt, m, 0, { creases: false });
  drawHollows(pt, m, t);
  const a = o.reveal ?? 1;
  const bodies = t < SINK_END;
  // the bodies go down into the sheet from the top: drawn into layers whose upper part is erased
  if (bodies) sinking(pt, t, 'bodies', () => drawFigures(pt, t, a));
  drawSheetV(pt, m, t);
  if (bodies) sinking(pt, t, 'bodies2', () => drawArm(pt, t, a));
  drawLineV(pt, t);
  drawReachingHand(pt, t);
  pt.zoom = 1;
  pt.lineComp = 0;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

// the sinking front (screen space at the close-up camera, which holds still meanwhile)
const SINK_START = 233.6, SINK_END = 238.4;
const sinkY = (t) => lerp(-160, 1280, es(t, SINK_START, SINK_END, ease.io2));
function sinking(pt, t, key, draw) {
  if (t < SINK_START) return draw();
  const g = pt.layer(key);
  const main = pt.ctx;
  pt.ctx = g;
  draw();
  pt.ctx = main;
  dissolve(pt, g, sinkY(t));
  pt.put(g);
}

// the colour comes apart along the grain as the front passes: a fixed fibrous noise field decides
// which specks go first (short vertical streaks, as if drawn down into the weave)
let DISS = null;
function dissNoise() {
  if (DISS) return DISS;
  const w = 960, h = 540;
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = 0.5 + 0.5 * (0.6 * fbm2(x / 38, y / 38, 71, 4) + 0.4 * noise2(x / 2.5, y / 16, 72));
  DISS = { a, w, h };
  return DISS;
}
function dissolve(pt, g, yFront) {
  const s = g.canvas.width / pt.W;
  const cw = g.canvas.width, ch = g.canvas.height;
  const img = g.getImageData(0, 0, cw, ch);
  const d = img.data;
  const N = dissNoise();
  for (let py = 0; py < ch; py++) {
    const yd = py / s;
    const base = (yFront - yd) / 240;
    if (base < -0.75) continue;
    const row = Math.min(N.h - 1, (yd / 2) | 0) * N.w;
    for (let px = 0; px < cw; px++) {
      const i = (py * cw + px) * 4 + 3;
      if (d[i] === 0) continue;
      const n = N.a[row + Math.min(N.w - 1, (px / s / 2) | 0)];
      const e = clamp((base + (n - 0.5) * 1.3) * 3);
      if (e > 0) d[i] = d[i] * (1 - e);
    }
  }
  g.putImageData(img, 0, 0);
}

function crackNow(t) {
  // the old crack; its hooked end opens very slightly once, like fingers releasing
  const g = gapMove(t);
  if (g <= 0) return CRACK;
  const n = CRACK.length;
  const pivot = CRACK[Math.floor(n * 0.62)];
  return CRACK.map((p, i) => {
    const w = clamp((i / (n - 1) - 0.62) / 0.38);
    return w > 0 ? V.add(pivot, V.rot(V.sub(p, pivot), 0.16 * g * w)) : p;
  });
}

// absence as texture: where the heads lay, the pillow's paper grain is displaced a little, and the rim
// on the light's side shades the hollow; revealed as the bodies sink, then filling in
function drawHollows(pt, m, t) {
  if (t < SINK_START - 1 || pt.animatic) return;
  const k = depress(t) * es(t, SINK_START - 1, SINK_START + 0.5, ease.io2);
  if (k <= 0.002) return;
  const ctx = pt.ctx;
  const s = ctx.canvas.width / pt.W;
  ctx.save();
  for (const [i, h] of HOLLOWS.entries()) {
    ctx.save();
    pt.path(h, true);
    ctx.clip();
    ctx.globalAlpha = k;
    ctx.fillStyle = pt.pattern(pt.tex.paper, [m[0], m[1], m[2], m[3], m[4] + 9 + i * 5, m[5] + 6 - i * 4], 0.62);
    ctx.fillRect(-400, -400, 1600, 1600);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgba(PAL.indigo, 0.02);
    ctx.fillRect(-400, -400, 1600, 1600);
    ctx.filter = `blur(${4 * pt.zoom * s}px)`;
    pt.path(h.map(([x, y]) => [x + 4, y + 6]), true);
    ctx.strokeStyle = rgba(PAL.indigo, 0.2);
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.filter = 'none';
    ctx.restore();
  }
  ctx.restore();
}

function drawFigures(pt, t, alpha) {
  const ctx = pt.ctx;
  const ex = exchK(t);
  const exPulse = Math.sin(Math.PI * clamp(ex));
  const mv = liftMap(t);
  const lift = liftH(t);
  ctx.save();
  ctx.globalAlpha *= alpha;
  const faceCol = mixc(PAL.vermilion, PAL.vermilionLight, 0.1);
  const feat = mixc(PAL.vermilionDeep, PAL.indigoDeep, 0.45);
  // ---- the companion: painted ahead of the trailing edge, emptied behind it ----
  const cf = frontClip(trailX(t), 1, 0.7), cb = frontClip(trailX(t), -1, 0.7);
  pt.shadow(C_SIL, { dx: 3, dy: 5, blur: 9, alpha: 0.2 });
  clipped(pt, cf.poly, () => {
    pt.paint(C_BODY, { color: faceCol, alpha: 1, texM: [1, 0, 0, 1, 5, 2] });
    pt.paint(C_HAIR, { color: PAL.vermilionDeep, alpha: 1, texM: [1, 0, 0, 1, 3, 9] });
    for (const [i, l] of C_STRANDS.entries()) pt.ink(l, { w: 1.4, color: i % 2 ? PAL.vermilion : mixc(PAL.vermilionDeep, PAL.indigoDeep, 0.35), alpha: 0.6, seed: 1950 + i, taper: [0.3, 0.5] });
    paintMinus(pt, C_HEAD, C_HAIR, { color: faceCol, alpha: 1, texM: [1, 0, 0, 1, 1, 4] });
    pt.paint(C_EAR, { color: faceCol, alpha: 1, texM: [1, 0, 0, 1, 2, 6] });
    companionFeatures(pt, feat, 0.8);
  });
  if (ex > 0.001) {
    // behind it: paper, an indigo contour and hatched hair, in the protagonist's manner
    clipped(pt, cb.poly, () => {
      pt.paperFill(C_SIL, [1, 0, 0, 1, 7, 3], { tint: PAL.indigo, tintAlpha: 0.035 });
      pt.hatch(C_HAIR, { ang: 2.1, sp: 2.8, w: 0.85, color: PAL.indigo, alpha: 0.75, seed: 1960 });
      pt.paperFill(C_EAR, [1, 0, 0, 1, 7, 3], { tint: PAL.indigo, tintAlpha: 0.035 });
      pt.ink(C_SIL.concat([C_SIL[0]]), { w: 2.4, color: PAL.indigo, alpha: 1, seed: 1961, taper: [0, 0], press: 0.35 });
      companionFeatures(pt, PAL.indigo, 1);
    });
    // the wet edge of the moving colour, and the acid yellow drifting just behind it
    if (ex < 0.999) clipped(pt, C_SIL, () => {
      pt.ink(cf.line, { w: 2.2, color: PAL.vermilionDeep, alpha: 0.7, seed: 1962, taper: [0, 0] });
      pt.ink(cf.line.map((p) => V.add(p, [0, 6 / CAM_V.z])), { w: 1.6, color: PAL.yellow, alpha: 0.6 * exPulse, seed: 1963, taper: [0, 0] });
    });
  }
  // ---- the protagonist: filled from the line forward of the leading edge ----
  const pf = frontClip(leadX(t), -1, 2.3);
  // shoulder (the right shoulder on top, with its gap) stays on the pillow's edge
  pt.paperFill(P_SHOULDER, [1, 0, 0, 1, 7, 3], { tint: PAL.indigo, tintAlpha: 0.035 });
  if (ex > 0.001) clipped(pt, pf.poly, () => pt.paint(P_SHOULDER, { color: faceCol, alpha: 1, texM: [1, 0, 0, 1, 6, 1] }));
  {
    const sh = P_SHOULDER_LINE;
    const gi = Math.floor(sh.length * 0.16);
    pt.ink(sh.slice(0, gi), { w: 2.6, color: PAL.indigo, alpha: 1, seed: 1912, taper: [0.05, 0.1] });
    pt.ink(sh.slice(gi + 6), { w: 2.6, color: PAL.indigo, alpha: 1, seed: 1913, taper: [0.1, 0.05] });
    const e = sh[gi], pre = sh[Math.max(0, gi - 3)];
    const td = V.norm(V.sub(e, pre));
    pt.ink(hookPts(e, td, [-td[1], td[0]], 6), { w: 2.4, color: PAL.indigo, alpha: 1, seed: 1914, taper: [0, 0.5] });
  }
  // the outline stays behind where the head was
  if (lift > 0.01) pt.ink(P_HEAD.concat([P_HEAD[0]]), { w: 2.0, color: PAL.indigo, alpha: 0.7 * clamp(lift * 3) * (1 - travelK(t)), seed: 1920, taper: [0, 0] });
  const map = (pts) => (mv ? W(pts.map(mv)) : W(pts));
  const pHead = mv ? map(P_HEAD_S) : P_HEAD;
  const pHair = map(P_HAIR_S), pEar = map(P_EAR_S), pEarIn = map(P_EAR_IN_S), pEye = map(P_EYE_S), pBrow = map(P_BROW_S), pMouth = map(P_MOUTH_S);
  pt.shadow(pHead, { dx: 3, dy: 5, blur: 8 + 10 * lift, alpha: 0.14 + 0.08 * lift });
  pt.paperFill(pHead, [1, 0, 0, 1, 11, 5], { tint: PAL.indigo, tintAlpha: 0.035 });
  if (ex > 0.001) clipped(pt, pf.poly, () => {
    paintMinus(pt, pHead, pHair, { color: faceCol, alpha: 1, texM: [1, 0, 0, 1, 4, 7] });
    pt.paint(pHair, { color: PAL.vermilionDeep, alpha: 1, texM: [1, 0, 0, 1, 8, 2] });
  });
  pt.hatch(pHair, { ang: 1.05, sp: 2.8, w: 0.85, color: PAL.indigo, alpha: 0.8, seed: 1930 });
  pt.ink(pHead.concat([pHead[0]]), { w: 2.6, color: PAL.indigo, alpha: 1, seed: 1921, taper: [0, 0], press: 0.35 });
  if (ex > 0.001 && ex < 0.999) {
    // the leading edge: a wet vermilion rim, and cyan splitting off the indigo line just ahead of it
    clipped(pt, pHead, () => pt.ink(pf.line, { w: 2.2, color: PAL.vermilionDeep, alpha: 0.7, seed: 1924, taper: [0, 0] }));
    clipped(pt, frontClip(leadX(t) + 70, -1, 2.3).poly, () => clipped(pt, frontClip(leadX(t) - 20, 1, 2.3).poly, () => {
      pt.ink(pHead.map((p) => V.add(p, [2.4 / CAM_V.z, -2 / CAM_V.z])).concat([pHead[0]]), { w: 1.6, color: PAL.cyan, alpha: 0.65 * exPulse, seed: 1925, taper: [0, 0] });
    }));
  }
  pt.ink(pEye, { w: 1.5, color: PAL.indigo, alpha: 0.95, seed: 1922, taper: [0.25, 0.3] });
  lashes(pt, pEye, PAL.indigo, 1923, [-0.9, 1.0]);
  pt.ink(pBrow, { w: 1.2, color: PAL.indigo, alpha: 0.45, seed: 1927, taper: [0.4, 0.4] });
  pt.ink(pMouth, { w: 1.2, color: PAL.indigo, alpha: 0.8, seed: 1928, taper: [0.1, 0.7] });
  pt.ink(pEar, { w: 1.3, color: PAL.indigo, alpha: 0.85, seed: 1926, taper: [0.1, 0.2] });
  pt.ink(pEarIn, { w: 1.0, color: PAL.indigo, alpha: 0.6, seed: 1929, taper: [0.3, 0.3] });
  ctx.restore();
}

function companionFeatures(pt, col, a) {
  pt.ink(C_EAR, { w: 1.2, color: col, alpha: 0.75 * a, seed: 1906, taper: [0.1, 0.2] });
  pt.ink(C_EAR_IN, { w: 1.0, color: col, alpha: 0.6 * a, seed: 1907, taper: [0.3, 0.3] });
  pt.ink(C_EYE, { w: 1.5, color: col, alpha: 0.95 * a, seed: 1902, taper: [0.25, 0.3] });
  lashes(pt, C_EYE, col, 1903, [0.6, 1.2]);
  pt.ink(C_BROW, { w: 1.1, color: col, alpha: 0.4 * a, seed: 1908, taper: [0.4, 0.5] });
  pt.ink(C_MOUTH, { w: 1.1, color: col, alpha: 0.8 * a, seed: 1909, taper: [0.1, 0.7] });
  pt.ink(C_NOSTRIL, { w: 1.0, color: col, alpha: 0.65 * a, seed: 1910, taper: [0.3, 0.3] });
}

// ---------- the colour exchange: the vermilion runs across the shared line ----------
const trailX = (t) => lerp(420, 985, es(t, 225.4, 228.1, ease.io2)); // the companion empties from the back of the head
const leadX = (t) => lerp(890, 1680, es(t, 225.9, 228.6, ease.io2)); // the protagonist fills from the line
const armX = (t) => lerp(700, 1440, es(t, 225.6, 228.4, ease.io2)); // the forearm empties toward the hand
/** screen-space wavy front as a world clip polygon; side +1 keeps x > front, -1 keeps x < front */
function frontClip(xf, side, seed) {
  const pts = [];
  for (let y = -120; y <= 1200; y += 16) pts.push([xf + 15 * Math.sin(y * 0.017 + seed) + 8 * Math.sin(y * 0.041 + seed * 2.3), y]);
  const far = side > 0 ? 2400 : -500;
  return { poly: W([...pts, [far, 1200], [far, -120]]), line: W(pts) };
}
function clipped(pt, poly, fn) {
  const ctx = pt.ctx;
  ctx.save();
  pt.path(poly, true);
  ctx.clip();
  fn();
  ctx.restore();
}

// paint poly minus hole (the face piece where the hair piece does not cover it)
function paintMinus(pt, poly, hole, o) {
  const ctx = pt.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (const p of poly) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.moveTo(hole[0][0], hole[0][1]);
  for (let i = hole.length - 1; i >= 0; i--) ctx.lineTo(hole[i][0], hole[i][1]);
  ctx.closePath();
  ctx.clip('evenodd');
  pt.paint(poly, o);
  ctx.restore();
}

// closed-eye lashes: short strokes off the lid toward the cheek (screen direction given in design px)
function lashes(pt, lid, color, seed, dirS) {
  for (let k = 0; k < 4; k++) {
    const p = pointAt(lid, 0.2 + k * 0.2);
    const q = toWorldPt(mV, V.add(w2s(p), [dirS[0] * (4 + k * 0.6), dirS[1] * (4 + k * 0.6)]));
    pt.ink([p, V.lerp(p, q, 0.5), q], { w: 0.8, color, alpha: 0.8, seed: seed + k, taper: [0, 0.7] });
  }
}

function drawSheetV(pt, m, t) {
  // the sheet covers both bodies from the shoulders down; its hem runs across the frame below the heads
  const ctx = pt.ctx;
  const hem = hemCurve(inv([960, 902])[0], 12, 0).map(([x, y]) => [x + 6 * Math.sin(y * 0.012), y]);
  const poly = [...hem, [BED.x1 + 40, BED.y1 + 8], [BED.x1 + 40, BED.y0 - 8]];
  pt.shadow(poly, { dx: -4, dy: 5, blur: 8, alpha: 0.18 });
  pt.paperFill(poly, m, { tint: PAL.paperLight, tintAlpha: 0.5 });
  ctx.save();
  pt.path(poly, true);
  ctx.clip();
  if (!pt.animatic) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = pt.pattern(weaveTile(), [1, 0, 0, 1, 0, 0], Math.pow(pt.zoom, -0.6));
    ctx.globalAlpha = 0.75;
    ctx.fillRect(BED.x0, BED.y0 - 20, BED.x1 - BED.x0 + 60, BED.y1 - BED.y0 + 40);
    ctx.globalAlpha = 1;
  }
  // the bodies' colour running into the weave (T10 / VI)
  const k = intoSheet(t);
  if (k > 0 && k < 1 && !pt.animatic) {
    const s = Math.sin(Math.PI * k);
    ctx.globalCompositeOperation = 'multiply';
    for (const [poly2, col] of [[C_ARM, PAL.vermilion], [C_BODY, PAL.vermilion], [P_SHOULDER, PAL.indigo]]) {
      ctx.save();
      ctx.filter = `blur(${(6 + 30 * k) * pt.zoom * (ctx.canvas.width / pt.W)}px)`;
      pt.path(poly2.map(([x, y]) => [x + 40 * k, y]), true);
      ctx.fillStyle = rgba(col, 0.22 * s);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
  pt.ink(hem, { w: 2.4, color: PAL.indigo, alpha: 0.8, seed: 54, taper: [0, 0], press: 0.4 });
  pt.ink(hem.map(([x, y]) => [x + 9, y]), { w: 1.8, color: PAL.indigo, alpha: 0.45, seed: 52, taper: [0, 0] });
}

function drawArm(pt, t, alpha) {
  const ctx = pt.ctx;
  const ex = exchK(t);
  const faceCol = mixc(PAL.vermilion, PAL.vermilionLight, 0.1);
  const af = frontClip(armX(t), 1, 4.1), ab = frontClip(armX(t), -1, 4.1);
  const wr = inv(C_HAND.wrist);
  const g = handGeom({ x: wr[0], y: wr[1], rot: handRot(C_HAND.dir), scale: C_HAND.scale, mirror: -1, curl: [0.1, 0.22, 0.26, 0.3, 0.36], spread: 0.55 });
  ctx.save();
  ctx.globalAlpha *= alpha;
  pt.shadow(C_ARM, { dx: 3, dy: 5, blur: 8, alpha: 0.2 });
  clipped(pt, af.poly, () => {
    pt.paint(C_ARM, { color: faceCol, alpha: 1, texM: [1, 0, 0, 1, 2, 2] });
    pt.ink(C_ARM.concat([C_ARM[0]]), { w: 1.2, color: PAL.vermilionDeep, alpha: 0.45, seed: 1940, taper: [0, 0] });
    drawHand(pt, g, { style: 'companion', view: 'dorsal', lineW: 1.1, layerKey: 'cv', seed: 77, color: faceCol });
  });
  if (ex > 0.001) clipped(pt, ab.poly, () => {
    pt.paperFill(C_ARM, [1, 0, 0, 1, 7, 3], { tint: PAL.indigo, tintAlpha: 0.035 });
    pt.ink(C_ARM.concat([C_ARM[0]]), { w: 2.2, color: PAL.indigo, alpha: 1, seed: 1941, taper: [0, 0], press: 0.35 });
    drawHand(pt, g, { style: 'protagonist', view: 'dorsal', lineW: 1.5, layerKey: 'cv2', seed: 78, wash: 0.03 });
  });
  ctx.restore();
}

// after the touch the line is drawn along its own track, end first: down through the gap between
// the two, under the hem, and along the sheet as a fold (screen space at the close-up camera)
const TUNNEL_S = [[921, 507], [916, 530], [916, 556], [923, 600], [936, 660], [950, 740], [962, 820], [974, 900], [994, 948], [1040, 972]];
const FOLD_S = [[1040, 972], [1140, 990], [1260, 1000], [1380, 998], [1470, 988]];
const TRACK_S = [...SHARED_SS, ...resample(catmull([...TUNNEL_S, ...FOLD_S.slice(1)], 10), 700).slice(1)];
const TRACK_W = W(TRACK_S);
const TRACK_CUM = (() => {
  const c = [0];
  for (let i = 1; i < TRACK_W.length; i++) c.push(c[i - 1] + V.len(V.sub(TRACK_W[i], TRACK_W[i - 1])));
  return c;
})();
const L_TRACK = TRACK_CUM[TRACK_CUM.length - 1];
const L_SHARED = TRACK_CUM[SHARED_SS.length - 1];
const L_TUNNEL = (() => {
  const w = W(catmull(TUNNEL_S, 10));
  let l = 0;
  for (let i = 1; i < w.length; i++) l += V.len(V.sub(w[i], w[i - 1]));
  return l;
})();
/** the visible stretch of the track, [s0, s1] in world length */
function lineSpan(t) {
  const tr = travelK(t);
  return [tr * (L_SHARED + L_TUNNEL), L_SHARED + tr * (L_TRACK - L_SHARED)];
}
// then the fabric lines carry it along the sheet's north edge to the head of the bed and the seam
const EDGE_PATH = catmull([TRACK_W[TRACK_W.length - 1], [520, 330], [470, 250], [360, 190], [240, 162], [130, 158], [WALL_X + 34, 160], [WALL_X, 172]], 10);

// the principal contour in the world: the shared line; then drawn down into a fold; then along the edge
function drawLineV(pt, t) {
  const tr = travelK(t);
  const dep = depress(t);
  const run = edgeRun(t);
  const cr = crackK(t);
  // 1) the shared line with its hook; after the touch it slides along its track into the sheet
  const [s0, s1] = lineSpan(t);
  const line = tr > 0 ? subPoly(TRACK_W, s0 / L_TRACK, s1 / L_TRACK, 420) : SHARED_W;
  const a1 = 1 - 0.55 * es(t, 238.0, 241.5) - 0.45 * es(t, 243.0, 246.0);
  if (a1 > 0) {
    pt.ink(line, { w: 3.2, color: PAL.indigo, alpha: a1, seed: 1800, taper: [0.03, 0.03], press: 0.35 });
    const e = line[line.length - 1], pre = line[line.length - 8];
    const td = V.norm(V.sub(e, pre));
    const hk = 1 - es(t, M.breath + 0.2, 234.2);
    if (hk > 0) pt.ink(hookPts(e, td, [-td[1], td[0]], 8 * hk + 0.01), { w: 3, color: PAL.indigo, alpha: a1, seed: 1801, taper: [0, 0.5] });
    // the fold's soft shadow in the sheet
    if (tr > 0.5 && !pt.animatic) {
      const ctx = pt.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.filter = `blur(${10 * pt.zoom * (ctx.canvas.width / pt.W)}px)`;
      pt.path(pt.ribbon(line, 14, { taper: [0.2, 0.2], rough: 0, seed: 3 }).map(([x, y]) => [x - 5, y]), true);
      ctx.fillStyle = rgba(PAL.indigo, 0.1 * clamp((tr - 0.5) * 2) * dep);
      ctx.fill();
      ctx.filter = 'none';
      ctx.restore();
    }
  }
  // 2) fabric lines carry the contour along the sheet's north edge to the head of the bed
  if (run > 0) {
    const upto = subPoly(EDGE_PATH, 0, run, 0);
    const aRun = 0.8 * (1 - es(t, 245.4, 248.6, ease.io2));
    if (upto.length > 1 && aRun > 0.002) pt.ink(upto, { w: 2.1, color: PAL.indigo, alpha: aRun, seed: 1820, taper: [0.2, 0.05] });
  }
  // 3) across the seam, the soft stroke becomes the hard crack (drawn by the room); a short joining stroke
  if (cr > 0 && cr < 1) {
    const sub = subPoly(CRACK, 0, cr, 0);
    if (sub.length > 1) pt.ink(sub, { w: 2.8, color: PAL.indigoDeep, alpha: 0.9 * (1 - cr), seed: 1830, taper: [0.1, 0.4] });
  }
}

// the head side of the hem (the hand goes back under the sheet)
const ABOVE_HEM = (() => {
  const hem = hemCurve(inv([960, 902])[0], 12, 0).map(([x, y]) => [x + 6 * Math.sin(y * 0.012), y]);
  return [...hem, [BED.x0 - 3000, BED.y1 + 3000], [BED.x0 - 3000, BED.y0 - 3000]];
})();

function drawReachingHand(pt, t) {
  const r = reachK(t);
  const tr = travelK(t);
  if (r <= 0 || tr >= 0.999) return;
  // the protagonist's right hand comes up from under the sheet, between the two bodies, to the
  // outline left on the pillow, fingertip first; then withdraws, drawing the line after it
  const hes = 0.05 * Math.sin((t - 230.8) * 5.5) * (1 - es(t, 232.0, M.breath)); // hesitation
  const ang = 0.12 + hes - 0.1 * tr;
  const H = { rot: handRot([Math.sin(ang), -Math.cos(ang)]), scale: 29, mirror: 1, curl: [0.3, 0.02, 0.55, 0.7, 0.75], spread: 0.6 };
  const tip0 = handGeom({ x: 0, y: 0, ...H }).fingers[1].tip; // index fingertip relative to the wrist
  let tipW;
  if (tr <= 0) tipW = V.lerp(inv([905, 1010]), SHARED_W[SHARED_W.length - 1], ease.io2(r));
  else tipW = pointAt(TRACK_W, Math.min(1, lineSpan(t)[1] / L_TRACK));
  const g = handGeom({ x: tipW[0] - tip0[0], y: tipW[1] - tip0[1], ...H });
  const ctx = pt.ctx;
  ctx.save();
  pt.path(ABOVE_HEM, true);
  ctx.clip();
  drawHand(pt, g, { style: 'protagonist', view: 'dorsal', lineW: 1.6, wash: 0.03, traceAlpha: 1, seed: 21 });
  ctx.restore();
}
