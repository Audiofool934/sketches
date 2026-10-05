// Movement I: being settled into bed for the last time (0 - 24.5 s)
// Top-down. The companion draws the sheet up; the protagonist's hand comes to
// rest over the companion's; release leaves vermilion on the edge of the palm;
// when the sheet settles its shadow lies flat before the mound forms.
import { V, clamp, lerp, seg, es, ease, catmull, resample, noise1, ring, TAU, onN } from '../lib/math.mjs';
import { PAL, rgba } from '../lib/palette.mjs';
import { capsule } from '../lib/draw.mjs';
import { REST, fk, drawProtagonist, silhouette, inkCutout, paintCutout, fkScreen, headParts, toScreen } from '../lib/rig.mjs';
import { handGeom, drawHand } from '../lib/hand.mjs';
import { traceUnion } from '../lib/trace.mjs';
import { BED, P_LIE, hemCurve, weaveTile } from './a_world.mjs';
import { M } from '../timeline.mjs';

export const LIE_POSE = {
  ...REST, yaw: 0, spine: -90, neck: -90, head: -91,
  shR: 97, elR: 93, haR: 92, shL: 83, elL: 87, haL: 88,
  thR: 91, snR: 90, ftR: 90, thL: 89, snL: 90, ftL: 90,
};

// ---- the sheet ----
export function sheetState(t) {
  // hem x (edge nearest the head); drawn up from chest to shoulders during the intro
  const xe = lerp(760, 575, es(t, 0.6, 10.4, ease.io3));
  // lift: the hem billows a little while being drawn, and once more when released
  const drawLift = 10 * Math.sin(Math.PI * seg(t, 0.6, 10.4)) * (0.6 + 0.4 * Math.sin(t * 1.3));
  const relLift = 22 * es(t, M.on22 - 0.3, M.on22 + 0.25, ease.out2) * (1 - es(t, M.on22 + 0.3, M.on22 + 0.62, ease.in2));
  const lift = drawLift + relLift;
  // shadow lies flat first (fast), mound forms late (the first timing error)
  const shadowOff = lift * 0.9;
  const mound = t < M.on22 - 0.3 ? 1 - 0.35 * clamp(drawLift / 10) : lerp(1 - 0.35 * clamp(drawLift / 10), 0, es(t, M.on22 - 0.3, M.on22 + 0.1)) * (1 - es(t, M.on22 + 1.05, M.on22 + 1.9, ease.io2)) + es(t, M.on22 + 1.05, M.on22 + 1.9, ease.io2);
  return { xe, lift, shadowOff, mound };
}

/** P's silhouette (world) for mound shading; cached per pose */
let silCache = null;
function lyingSilhouette() {
  if (silCache) return silCache;
  silCache = silhouette({ pose: LIE_POSE, X: P_LIE.X, Y: P_LIE.Y, S: P_LIE.S, rot: P_LIE.rot, zoom: 1 }, 'P');
  return silCache;
}

export function drawSheet(pt, m, t, st, opts = {}) {
  const ctx = pt.ctx;
  const hem = hemCurve(st.xe, 26, st.lift * 0.6);
  const sheetPoly = [...hem, [BED.x1 + 40, BED.y1 + 8], [BED.x1 + 40, BED.y0 - 8]];
  // shadow under the lifted hem (lies flat quickly)
  if (st.shadowOff > 0.3 && !pt.animatic) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = `blur(${6 * pt.zoom * (ctx.canvas.width / pt.W)}px)`;
    pt.path(hemCurve(st.xe - st.shadowOff * 1.4, 26, 0).concat([[st.xe + 60, BED.y1], [st.xe + 60, BED.y0]]), true);
    ctx.fillStyle = rgba(PAL.indigo, 0.16);
    ctx.fill();
    ctx.filter = 'none';
    ctx.restore();
  }
  pt.shadow(sheetPoly, { dx: -4 - st.lift * 0.25, dy: 5, blur: 8 + st.lift * 0.3, alpha: 0.2 });
  pt.paperFill(sheetPoly, m, { tint: PAL.paperLight, tintAlpha: 0.5 });
  ctx.save();
  pt.path(sheetPoly, true);
  ctx.clip();
  if (!pt.animatic) {
    ctx.globalCompositeOperation = 'multiply';
    // weave: attached to the sheet, partly redrawn at each scale so it stays fabric-fine
    ctx.fillStyle = pt.pattern(weaveTile(), [1, 0, 0, 1, 0, 0], Math.pow(pt.zoom, -0.6));
    ctx.globalAlpha = opts.weave ?? 0.75;
    ctx.fillRect(BED.x0, BED.y0 - 20, BED.x1 - BED.x0 + 60, BED.y1 - BED.y0 + 40);
    ctx.globalAlpha = 1;
  }
  // mound: the body raises the sheet; lamp light from the upper left leaves a soft
  // shadow crescent along its lower-right side, plus drape folds from knees, feet, hips
  const mound = st.mound * (opts.moundScale ?? 1) * (1 - es(t, 30, 38));
  if (mound > 0.01) {
    const loops = lyingSilhouette();
    if (!pt.animatic) {
      const g = pt.layer('mound');
      const px = ctx.canvas.width / pt.W;
      g.filter = `blur(${14 * pt.zoom * px}px)`;
      g.save();
      g.translate(16, 20);
      g.beginPath();
      for (const l of loops) {
        g.moveTo(l.pts[0][0], l.pts[0][1]);
        for (const q of l.pts) g.lineTo(q[0], q[1]);
        g.closePath();
      }
      g.fillStyle = rgba(PAL.indigo, 1);
      g.fill('evenodd');
      g.restore();
      g.filter = `blur(${7 * pt.zoom * px}px)`;
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      for (const l of loops) {
        g.moveTo(l.pts[0][0], l.pts[0][1]);
        for (const q of l.pts) g.lineTo(q[0], q[1]);
        g.closePath();
      }
      g.fill('evenodd');
      g.filter = 'none';
      // keep it on the sheet only
      pt.maskIn(g, [sheetPoly]);
      pt.put(g, { alpha: 0.13 * mound, op: 'multiply' });
    }
    const J = fk(LIE_POSE);
    const w = (p) => fkScreen(p, P_LIE);
    const folds = [];
    for (const s of ['R', 'L']) {
      const kn = w(J['kn' + s]), an = w(J['an' + s]), hip = w(J['hip' + s]);
      const out = s === 'R' ? 1 : -1;
      folds.push([V.add(kn, [-30, out * 60]), V.add(kn, [30, out * 105]), V.add(kn, [110, out * 150]), V.add(kn, [200, out * 175])]);
      folds.push([V.add(an, [0, out * 30]), V.add(an, [110, out * 52]), V.add(an, [260, out * 62]), V.add(an, [420, out * 64])]);
      folds.push([V.add(hip, [-140, out * 135]), V.add(hip, [-40, out * 160]), V.add(hip, [60, out * 205])]);
    }
    folds.push([[w(J.kneeR || J.knR)[0] - 10, P_LIE.Y + 5], [w(J.anR)[0] - 60, P_LIE.Y + 2], [w(J.anR)[0] + 40, P_LIE.Y]]);
    ctx.save();
    pt.path(sheetPoly, true);
    ctx.clip();
    folds.forEach((f, i) => pt.ink(catmull(f, 6), { w: 2.0, color: PAL.indigo, alpha: 0.5 * mound, seed: 40 + i, taper: [0.5, 0.6], press: 0.5 }));
    ctx.restore();
  }
  ctx.restore();
  // hem: turned-down band with a pair of indigo border stripes
  const band = hem.map(([x, y]) => [x + 48, y]);
  pt.ink(band, { w: 1.6, color: PAL.indigo, alpha: 0.55, seed: 51, taper: [0, 0] });
  pt.ink(hem.map(([x, y]) => [x + 18, y]), { w: 2.2, color: PAL.indigo, alpha: 0.5, seed: 52, taper: [0, 0], wfn: () => 1 });
  pt.ink(hem.map(([x, y]) => [x + 27, y]), { w: 1.1, color: PAL.indigo, alpha: 0.45, seed: 53, taper: [0, 0] });
  pt.ink(hem, { w: 2.6, color: PAL.indigo, alpha: 0.85, seed: 54, taper: [0, 0], press: 0.4 });
  return { hem, sheetPoly };
}

// ---- protagonist's right arm on top of the sheet ----
export const ELBOW = [720, 704];
const H0 = Math.PI / 2;
export function pArm(t) {
  // forearm lies along the body; it swings out to rest over the companion's hand, then back
  const k = [
    { t: 0, a: 4, hr: H0 + 0.08, curl: 0.12, spread: 0.9 },
    { t: 10.5, a: 4, hr: H0 + 0.08, curl: 0.12, spread: 0.9 },
    { t: 11.55, a: 19, hr: H0 + 0.46, curl: 0.04, spread: 1.02 },
    { t: M.pulse, a: 23, hr: H0 + 0.6, curl: 0.18, spread: 0.95 },
    { t: M.on17, a: 23.5, hr: H0 + 0.61, curl: 0.2, spread: 0.92 },
    { t: M.on17 + 0.6, a: 23.5, hr: H0 + 0.61, curl: 0.38, spread: 0.8 },
    { t: 19.6, a: 23.5, hr: H0 + 0.61, curl: 0.22, spread: 0.9 },
    { t: 20.5, a: 23.5, hr: H0 + 0.62, curl: -0.12, spread: 1.35 },
    { t: 21.6, a: 12, hr: H0 + 0.3, curl: 0.0, spread: 1.15 },
    { t: 23.2, a: 7, hr: H0 + 0.14, curl: 0.1, spread: 1.0 },
    { t: 24.5, a: 7, hr: H0 + 0.14, curl: 0.1, spread: 1.0 },
    // T01: press into the sheet, close the fingers, lift, withdraw
    { t: 25.4, a: 7.5, hr: H0 + 0.13, curl: 0.04, spread: 1.06 },
    { t: 26.3, a: 7, hr: H0 + 0.14, curl: 0.02, spread: 1.24 },
    { t: 27.3, a: 6, hr: H0 + 0.15, curl: 0.55, spread: 0.72 },
    { t: 28.6, a: 6, hr: H0 + 0.15, curl: 0.58, spread: 0.7 },
    { t: 29.4, a: 2, hr: H0 + 0.05, curl: 0.18, spread: 0.95 },
    { t: 31.8, a: -28, hr: H0 - 0.32, curl: 0.25, spread: 0.9 },
    { t: 80, a: -28, hr: H0 - 0.32, curl: 0.25, spread: 0.9 },
  ];
  let i = 0;
  while (i < k.length - 2 && t > k[i + 1].t) i++;
  const A = k[i], B = k[i + 1];
  const s = ease.io3(seg(t, A.t, B.t));
  const a = lerp(A.a, B.a, s), hr = lerp(A.hr, B.hr, s);
  // overlapping action: fingers open slightly after the wrist commits
  const s2 = ease.io3(seg(t - 0.12, A.t, B.t));
  const curl = lerp(A.curl, B.curl, s2), spread = lerp(A.spread, B.spread, s2);
  const L = 201;
  const ang = (a * Math.PI) / 180;
  const wrist = [ELBOW[0] + Math.cos(ang) * L, ELBOW[1] + Math.sin(ang) * L];
  // contact compression on landing; then the deliberate press of T01
  const land = t > M.pulse && t < 21 ? Math.exp(-(t - M.pulse) * 5) * Math.sin((t - M.pulse) * 9) : 0;
  const press = clamp(es(t, M.pulse - 0.1, M.pulse + 0.12) * (1 - es(t, 20.3, 20.9)) * 0.55 + land * 0.25 + es(t, 25.9, 26.35, ease.in2) * (1 - es(t, 28.7, 29.3)), 0, 1);
  // lifted off the sheet while travelling (approach, release, anticipation, final lift)
  const lift = es(t, 10.5, 11.0) * (1 - es(t, 11.6, M.pulse)) + es(t, 20.5, 21.1) * (1 - es(t, 22.4, 23.3)) + 0.35 * es(t, 24.9, 25.4) * (1 - es(t, 25.6, 26.1, ease.in3)) + es(t, 28.9, 29.8);
  return { wrist, hr, curl, spread, press, lift, ang };
}

export function drawPArm(pt, t, fingerStagger = true) {
  const A = pArm(t);
  // the weight of the press gathers the sheet in radial folds around the palm
  const dim = es(t, 26.0, 26.4) * (1 - es(t, 29.2, 29.8));
  if (dim > 0.01) {
    const pc = V.add(A.wrist, [48, 6]);
    for (let i = 0; i < 9; i++) {
      const a = -1.2 + i * 0.3 + (i > 4 ? 1.1 : 0);
      const r0 = 62 + (i % 3) * 8, r1 = r0 + 26 + (i % 2) * 18;
      const p0 = V.add(pc, V.polar(r0, a)), p1 = V.add(pc, V.polar(r1, a + 0.05));
      pt.ink([p0, V.lerp(p0, p1, 0.5), p1], { w: 1.8, color: PAL.indigo, alpha: 0.5 * dim, seed: 950 + i, taper: [0.4, 0.5] });
    }
  }
  const J = fk(LIE_POSE);
  const sh = fkScreen(J.shR, P_LIE);
  // upper arm and forearm: one cut-paper plane; hand drawn with the close-up rig
  const upper = capsule(sh, ELBOW, 40, 30, 12);
  const foreMid = V.lerp(ELBOW, A.wrist, 0.3);
  const fore = capsule(ELBOW, foreMid, 30, 32, 10);
  const fore2 = capsule(foreMid, A.wrist, 32, 25, 12);
  const scale = 88;
  const staggerCurl = [0, 0, 0, 0, 0].map((_, i) => {
    if (!fingerStagger) return A.curl;
    // release: fingers open one after another, little finger first
    const d = (4 - i) * 0.07;
    const B = pArm(t - d);
    return i === 0 ? A.curl * 0.5 : B.curl;
  });
  const geo = handGeom({ x: A.wrist[0], y: A.wrist[1], rot: A.hr, scale: scale * (1 + A.lift * 0.03), mirror: 1, curl: staggerCurl, spread: A.spread, press: A.press });
  inkCutout(pt, [[upper, fore, fore2]], { cell: 1.3 / pt.zoom, lineW: 3.2, seed: 131, wash: 0.05, texM: [1, 0, 0, 1, 13, 7], anchor: sh });
  if (A.lift > 0.01 && !pt.animatic) {
    // soft cast shadow on the sheet while the hand is raised
    const polys = [geo.palm, ...geo.fingers.flatMap((f) => f.caps)];
    const ctx = pt.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = `blur(${(4 + 8 * A.lift) * pt.zoom * (ctx.canvas.width / pt.W)}px)`;
    ctx.translate(10 * A.lift, 16 * A.lift);
    ctx.fillStyle = rgba(PAL.indigo, 0.16 * A.lift);
    for (const poly of polys) {
      pt.path(poly, true);
      ctx.fill();
    }
    ctx.filter = 'none';
    ctx.restore();
  }
  // vermilion trace: transferred at the squeeze, visible once the hand lifts
  const trace = clamp(es(t, 20.6, 21.3)) * (t > M.on17 ? 1 : 0);
  drawHand(pt, geo, { style: 'protagonist', view: 'dorsal', traceAlpha: trace, lineW: 3.2, seed: 17 });
  return { geo, A };
}

// ---- the companion from above ----
export function cState(t) {
  // both hands hold the hem while drawing it up; the right hand leaves after tucking;
  // the left comes to rest on the sheet beside the protagonist's hand, then withdraws
  const st = sheetState(t);
  const hemX = st.xe;
  const leftRest = [1025, 842];
  const drawL = [hemX + 150, 845];
  const wL = t < 10.4 ? drawL : V.lerp([575 + 150, 845], leftRest, es(t, 10.4, 11.35));
  const withdraw = es(t, M.on22 - 0.2, M.on22 + 1.6, ease.in2);
  const wristL = V.add(wL, [withdraw * 150, withdraw * 430]);
  // the right hand rests in the companion's lap, out of frame
  const wristR = [hemX + 380, 1330];
  const lean = lerp(-70, 60, es(t, 0.6, 11.0)) + withdraw * 40;
  const lift = lerp(-60, 0, es(t, 9.5, 12.0)) + withdraw * 40;
  const head = [880 + lean, 1068 + lift];
  return { wristL, wristR, head, withdraw, hemX, lean };
}

export function drawCompanionTop(pt, t) {
  const c = cState(t);
  const H = c.head;
  const shL = [H[0] - 150, H[1] + 118], shR = [H[0] + 150, H[1] + 122];
  const elbow = (sh, wr, bend) => {
    const mid = V.lerp(sh, wr, 0.5);
    const n = V.perp(V.norm(V.sub(wr, sh)));
    return V.add(mid, V.mul(n, bend));
  };
  const elL = elbow(shL, c.wristL, 60), elR = elbow(shR, c.wristR, -55);
  const arm = (sh, el, wr) => [capsule(sh, el, 52, 40, 12), capsule(el, V.lerp(el, wr, 0.35), 40, 38, 10), capsule(V.lerp(el, wr, 0.35), wr, 38, 29, 12)];
  // shoulders & back seen from above: a broad rounded yoke, mostly below frame
  const yoke = [];
  for (let i = 0; i <= 30; i++) {
    const a = Math.PI + (i / 30) * Math.PI;
    yoke.push([H[0] + Math.cos(a) * 205, H[1] + 150 + Math.sin(a) * 88]);
  }
  yoke.push([H[0] + 230, H[1] + 420], [H[0] - 230, H[1] + 420]);
  const neck = capsule(H, [H[0], H[1] + 120], 46, 54, 10);
  const planes = [arm(shR, elR, c.wristR), [yoke, neck], arm(shL, elL, c.wristL)];
  paintCutout(pt, planes, { cell: 1.6 / pt.zoom, anchor: H, texM: [1, 0, 0, 1, 31, 17], lineAlpha: 0.5, lineW: 1.6, shadowW: 3 });
  // hair: a deeper vermilion mass with a parting and strands falling toward the back
  const hair = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU;
    const back = Math.max(0, Math.sin(a));
    const r = 92 + 8 * Math.sin(3 * a + 1) + 30 * Math.pow(back, 2) + 2.5 * noise1(i * 0.8 + onN(t, 2) * 0.4, 9);
    hair.push([H[0] + Math.cos(a) * r * 0.96, H[1] + Math.sin(a) * r + 8]);
  }
  paintCutout(pt, [[hair]], { cell: 1.6 / pt.zoom, anchor: H, color: PAL.vermilionDeep, texM: [1, 0, 0, 1, 7, 23], lineAlpha: 0.35, lineW: 1.4 });
  const part = catmull([[H[0] - 6, H[1] - 88], [H[0] - 12, H[1] - 40], [H[0] - 8, H[1] + 10]], 5);
  pt.ink(part, { w: 2.4, color: PAL.paperLight, alpha: 0.75, seed: 170, taper: [0.2, 0.6] });
  for (let i = 0; i < 9; i++) {
    const side = i < 4 ? -1 : 1;
    const k = i < 4 ? i : i - 4;
    const p0 = [H[0] - 8 + side * 6, H[1] - 70 + k * 16];
    const p1 = [H[0] + side * (40 + k * 12), H[1] - 20 + k * 22];
    const p2 = [H[0] + side * (70 + k * 6), H[1] + 60 + k * 18];
    pt.ink(catmull([p0, p1, p2], 5), { w: 1.8, color: PAL.indigoDeep, alpha: 0.28, seed: 171 + i, taper: [0.3, 0.7] });
  }
  // hands: dorsal, fingers toward the head of the bed, gripping the hem
  const gL = handGeom({ x: c.wristL[0], y: c.wristL[1], rot: -Math.PI / 2 + 0.28, scale: 86, mirror: -1, curl: [0.1, 0.24, 0.22, 0.26, 0.3], spread: 0.75, press: clamp(pArm(t).press * 0.6) });
  const gR = handGeom({ x: c.wristR[0], y: c.wristR[1], rot: -Math.PI / 2 + 0.05, scale: 86, mirror: 1, curl: [0.15, 0.35, 0.38, 0.4, 0.42], spread: 0.7 });
  drawHand(pt, gR, { style: 'companion', view: 'dorsal', layerKey: 'R', lineW: 2.4 });
  drawHand(pt, gL, { style: 'companion', view: 'dorsal', layerKey: 'L', lineW: 2.4 });
  return { c, gL };
}

// ---- the lying protagonist ----
export function drawLying(pt, t, opts = {}) {
  const res = drawProtagonist(pt, {
    pose: LIE_POSE, X: P_LIE.X, Y: P_LIE.Y, S: P_LIE.S, rot: P_LIE.rot, zoom: pt.zoom,
    lineW: 3.4, wash: 0.04, gapLen: 0.03, seed: 111, alpha: opts.alpha ?? 1, build: { head: 1.14 },
  });
  // hair: indigo charcoal hatching inside the cap
  {
    const hp = headParts(res.J, { head: 1.14 });
    const hair = toScreen([hp.hairShort], P_LIE.X, P_LIE.Y, P_LIE.S, P_LIE.rot)[0];
    pt.hatch(hair, { ang: 0.35, sp: 5.5, w: 1.5, color: PAL.indigo, alpha: 0.75 * (opts.alpha ?? 1), seed: 190 });
    pt.hatch(hair, { ang: -0.9, sp: 9, w: 1.1, color: PAL.indigoDeep, alpha: 0.4 * (opts.alpha ?? 1), seed: 191 });
  }
  // face: closed eyes and a nose tick (face points up at the camera, head toward the wall)
  const J = res.J;
  const hc = fkScreen(J.head, P_LIE);
  const S = P_LIE.S;
  const up = [-1, 0], ac = [0, 1];
  const eye = (sgn) => {
    const c = V.add(hc, V.add(V.mul(up, -0.004 * S), V.mul(ac, sgn * 0.021 * S)));
    const a = V.add(c, V.mul(ac, -0.011 * S)), b = V.add(c, V.mul(ac, 0.011 * S));
    const mid = V.add(c, V.mul(up, -0.005 * S));
    return catmull([a, mid, b], 5);
  };
  const breath = 0.5 + 0.5 * Math.sin(t * 1.1);
  pt.ink(eye(1), { w: 2.0, color: PAL.indigo, alpha: 0.85 * (opts.alpha ?? 1), seed: 181, taper: [0.3, 0.3] });
  pt.ink(eye(-1), { w: 2.0, color: PAL.indigo, alpha: 0.85 * (opts.alpha ?? 1), seed: 182, taper: [0.3, 0.3] });
  const n0 = V.add(hc, V.mul(up, -0.018 * S)), n1 = V.add(hc, V.add(V.mul(up, -0.034 * S), V.mul(ac, 0.006 * S)));
  pt.ink([n0, V.lerp(n0, n1, 0.5), n1], { w: 1.8, color: PAL.indigo, alpha: 0.6 * (opts.alpha ?? 1), seed: 183, taper: [0.2, 0.5] });
  const m0 = V.add(hc, V.add(V.mul(up, -0.047 * S), V.mul(ac, -0.009 * S)));
  const m1 = V.add(hc, V.add(V.mul(up, (-0.049 - 0.001 * breath) * S), V.mul(ac, 0)));
  const m2 = V.add(hc, V.add(V.mul(up, -0.047 * S), V.mul(ac, 0.009 * S)));
  pt.ink(catmull([m0, m1, m2], 4), { w: 1.6, color: PAL.indigo, alpha: 0.5 * (opts.alpha ?? 1), seed: 184, taper: [0.3, 0.3] });
  return res;
}
