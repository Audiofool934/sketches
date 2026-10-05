// Close-up hand rig, seen from above (dorsal = back of hand, palmar = palm).
// Local frame: wrist centre at origin, fingers toward -y, palm width ~1,
// thumb on the left when mirror = 1.
import { V, clamp, lerp, catmull, TAU, cumLengths, noise1, resample } from './math.mjs';
import { capsule } from './draw.mjs';
import { PAL, rgba } from './palette.mjs';
import { traceUnion, anchorLoop } from './trace.mjs';

const D2R = Math.PI / 180;

export const FINGERS = [
  { name: 'thumb', base: [-0.36, -0.3], ang: -42, len: 0.72, w0: 0.25, w1: 0.19, seg: [0.44, 0.3, 0.26], flex: [28, 46, 52] },
  { name: 'index', base: [-0.33, -0.93], ang: -8, len: 0.8, w0: 0.19, w1: 0.145, seg: [0.47, 0.28, 0.25], flex: [72, 96, 66] },
  { name: 'middle', base: [-0.11, -0.97], ang: -2, len: 0.89, w0: 0.2, w1: 0.15, seg: [0.47, 0.29, 0.24], flex: [72, 96, 66] },
  { name: 'ring', base: [0.11, -0.94], ang: 5, len: 0.83, w0: 0.185, w1: 0.14, seg: [0.47, 0.29, 0.24], flex: [72, 96, 66] },
  { name: 'pinky', base: [0.31, -0.86], ang: 13, len: 0.64, w0: 0.16, w1: 0.12, seg: [0.47, 0.28, 0.25], flex: [72, 96, 66] },
];

// palm outline, clockwise from the wrist (thumb side left)
const PALM = [
  [-0.26, 0.16], [0.02, 0.19], [0.26, 0.14],
  [0.36, -0.06], [0.42, -0.34], [0.44, -0.62], [0.4, -0.83],
  [0.29, -0.93], [0.11, -0.99], [-0.11, -1.01], [-0.32, -0.98], [-0.42, -0.87],
  [-0.44, -0.68], [-0.46, -0.52], [-0.52, -0.36], [-0.47, -0.12], [-0.37, 0.06],
];

export const PALM_LINES = {
  heart: [[0.44, -0.72], [0.24, -0.74], [0.04, -0.77], [-0.16, -0.84], [-0.3, -0.92]],
  head: [[-0.46, -0.6], [-0.26, -0.55], [-0.02, -0.5], [0.2, -0.44], [0.4, -0.37]],
  life: [[-0.45, -0.58], [-0.3, -0.46], [-0.23, -0.28], [-0.22, -0.08], [-0.17, 0.08]],
  fate: [[0.03, 0.1], [0.01, -0.18], [-0.02, -0.48], [-0.06, -0.76], [-0.1, -0.96]],
};

/**
 * h: {x,y,rot,scale,mirror,curl[5],spread,press,fan[5]} → world-space geometry
 */
export function handGeom(h) {
  const S = h.scale, M = h.mirror ?? 1;
  const c = Math.cos(h.rot || 0), s = Math.sin(h.rot || 0);
  const tf = ([x, y]) => {
    x *= M;
    return [h.x + (x * c - y * s) * S, h.y + (x * s + y * c) * S];
  };
  const curl = h.curl || [0, 0, 0, 0, 0];
  const spread = h.spread ?? 1;
  const press = h.press || 0;
  const lenScale = h.lenScale || [1, 1, 1, 1, 1];
  const geo = { fingers: [], tf, S, M, palm: catmull(PALM.map(tf), 5, true) };
  const baseShift = h.baseShift || [0, 0, 0, 0, 0];
  FINGERS.forEach((F0, i) => {
    const F = { ...F0, len: F0.len * lenScale[i], base: [F0.base[0] + baseShift[i], F0.base[1]] };
    const cu = clamp(curl[i], 0, 1.2);
    let ang = F.ang * spread * (1 - 0.5 * cu) + (h.fan ? h.fan[i] || 0 : 0);
    if (i === 0) ang = F.ang * (0.7 + 0.3 * spread) + cu * 40;
    const dir0 = [Math.sin(ang * D2R), -Math.cos(ang * D2R)];
    const joints = [F.base];
    const back = [];
    let p = F.base, phi = 0;
    for (let k = 0; k < 3; k++) {
      phi += F.flex[k] * cu * D2R;
      const L = F.len * F.seg[k] * (1 + press * 0.03);
      const proj = Math.cos(phi);
      let d = dir0;
      if (i === 0) d = V.rot(dir0, cu * (0.45 + k * 0.4));
      const q = V.add(p, V.mul(d, L * Math.max(proj, -0.6)));
      joints.push(q);
      back.push(proj < 0.05);
      p = q;
    }
    const wf = 1 + press * 0.07;
    const rAt = (u) => (lerp(F.w0, F.w1, u) / 2) * wf;
    // segment capsules, traced later into one smooth finger silhouette
    const caps = [];
    for (let k = 0; k < 3; k++) {
      const u0 = k === 0 ? 0 : F.seg.slice(0, k).reduce((a, b) => a + b, 0);
      const u1 = u0 + F.seg[k];
      caps.push(capsule(tf(joints[k]), tf(joints[k + 1]), rAt(u0) * S, rAt(u1) * S * (k === 2 ? 0.96 : 1), 10));
    }
    // extend the finger root into the palm so the union has no notch at the knuckle
    const rootIn = V.add(F.base, V.mul(dir0, -0.12));
    caps.push(capsule(tf(rootIn), tf(joints[1]), rAt(0) * S, rAt(0.3) * S, 8));
    const tipA = V.lerp(joints[2], joints[3], 0.3);
    geo.fingers.push({
      name: F.name, caps, joints: joints.map(tf), back, cu,
      tip: tf(joints[3]), base: tf(F.base), dir: dir0,
      tipPoly: capsule(tf(tipA), tf(joints[3]), rAt(0.86) * S * 1.02, rAt(1) * S * 0.98, 10),
      nail: capsule(tf(V.lerp(joints[2], joints[3], 0.45)), tf(V.lerp(joints[2], joints[3], 0.86)), rAt(0.9) * S * 0.62, rAt(1) * S * 0.6, 8),
      w: F.w0 * S,
    });
  });
  return geo;
}

function jitterLoop(pts, amp, seed) {
  if (!amp) return pts;
  const cum = cumLengths(pts);
  return pts.map((p, i) => [p[0] + amp * noise1(cum[i] * 0.03, seed), p[1] + amp * noise1(cum[i] * 0.03, seed + 3)]);
}

function loopsPath(ctx, loops) {
  ctx.beginPath();
  for (const p of loops) {
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath();
  }
}

/**
 * Draw a hand as stacked cut-paper pieces (fingers, palm, curled segments).
 * style 'protagonist': paper + pale wash + indigo charcoal contour, nails on the back of the hand
 * style 'companion': vermilion gouache, deep-vermilion edge, unpainted fingertips
 * o: {view:'dorsal'|'palmar', lineW, alpha, texM, traceAlpha, palmLines, tint, wash, ctx, lineAlpha}
 */
export function drawHand(pt, geo, o = {}) {
  const style = o.style || 'protagonist';
  const isC = style === 'companion';
  const view = o.view || 'dorsal';
  const lw = o.lineW ?? clamp(geo.S * 0.02, 1.2, 9);
  const cell = clamp(geo.S / 110, 0.8, 5);
  const amp = pt.animatic ? 0 : o.boil ?? clamp(geo.S * 0.0035, 0.3, 1.4);
  const bseed = (o.seed || 5) + 1009 * Math.floor(pt.frame / 2);
  const texM = o.texM || [1, 0, 0, 1, geo.tf([0, 0])[0] * 0.31, geo.tf([0, 0])[1] * 0.27];
  const lineC = isC ? PAL.vermilionDeep : o.line || PAL.indigo;
  const g = pt.layer('hand' + (o.layerKey || ''));

  // pieces: fingers beneath the palm; curled-back segments over the palm when seen from the palm side
  const pieces = [];
  const order = geo.M > 0 ? [4, 3, 2, 1, 0] : [4, 3, 2, 1, 0];
  const overs = [];
  for (const i of order) {
    const f = geo.fingers[i];
    const visible = f.caps.filter((_, k) => !(k < 3 && f.back[k] && view === 'dorsal' && k === 2));
    const tr = traceUnion(visible, cell, { smooth: 2 });
    if (!tr.length) continue;
    const item = { loops: tr.map((l) => jitterLoop(l.pts, amp, bseed + i * 11)), finger: i };
    if (view === 'palmar' && f.back[1]) overs.push(item);
    else pieces.push(item);
  }
  const palmTr = traceUnion([geo.palm], cell, { smooth: 2 }).map((l) => jitterLoop(l.pts, amp, bseed + 97));
  const all = o.onlyFingers ? [...pieces, ...overs] : [...pieces, { loops: palmTr, palm: true }, ...overs];
  for (const it of all) {
    if (isC) {
      g.save();
      loopsPath(g, it.loops);
      g.fillStyle = rgba(o.color || PAL.vermilion, 1);
      g.fill('evenodd');
      if (!pt.animatic) {
        g.clip('evenodd');
        g.globalCompositeOperation = 'multiply';
        g.globalAlpha = 0.5;
        g.fillStyle = pt.pattern(pt.tex.paint, texM, 0.7);
        g.fillRect(-100, -100, pt.W + 200, pt.H + 200);
      }
      g.restore();
      for (const l of it.loops) pt.ink(l.concat([l[0], l[1]]), { ctx: g, w: lw * 0.42, color: lineC, alpha: (o.lineAlpha ?? 1) * 0.75, seed: 600 + (it.finger ?? 9), taper: [0, 0], press: 0.4, boilAmp: 0 });
    } else {
      g.save();
      loopsPath(g, it.loops);
      g.fillStyle = pt.animatic ? rgba(PAL.paper) : pt.pattern(pt.tex.paper, texM, 0.62);
      g.fill('evenodd');
      if (!pt.animatic && (o.wash ?? 0.08) > 0) {
        g.fillStyle = rgba(o.washColor || PAL.indigo, o.wash ?? 0.08);
        g.fill('evenodd');
      }
      g.restore();
      for (const l of it.loops) pt.ink(l.concat([l[0], l[1]]), { ctx: g, w: lw, color: lineC, alpha: o.lineAlpha ?? 1, seed: 600 + (it.finger ?? 9), taper: [0, 0], press: 0.45, rough: 0.5, wfn: (u) => 0.75 + 0.45 * Math.pow(Math.sin(u * Math.PI * 4 + 1), 2), boilAmp: 0 });
    }
  }
  // fingertips
  if (isC && o.fingertips !== false) {
    geo.fingers.forEach((f, i) => {
      if (view === 'dorsal' && f.back[2]) return;
      const tp = jitterLoop(f.tipPoly, amp, bseed + 300 + i);
      g.save();
      pt.path(tp, true, g);
      g.globalCompositeOperation = 'destination-out';
      g.fill();
      g.globalCompositeOperation = 'source-over';
      pt.paperFill(tp, texM, { ctx: g });
      g.restore();
      pt.ink(tp.concat([tp[0], tp[1]]), { ctx: g, w: lw * 0.4, color: lineC, alpha: 0.7, seed: 700 + i, taper: [0, 0], boilAmp: 0 });
    });
  }
  // nails on the back of the protagonist's hand
  if (!isC && view === 'dorsal' && o.nails !== false) {
    geo.fingers.forEach((f, i) => {
      if (f.back[2] || f.back[1]) return;
      pt.ink(f.nail.concat([f.nail[0]]), { ctx: g, w: lw * 0.45, color: lineC, alpha: 0.6, seed: 800 + i, taper: [0.2, 0.2], boilAmp: 0 });
    });
  }
  // joint creases
  if (o.creases !== false) {
    geo.fingers.forEach((f, i) => {
      if (i === 0) return;
      for (let k = 1; k <= 2; k++) {
        if (f.back[k - 1] || f.back[k]) continue;
        const j = f.joints[k];
        const d = V.norm(V.sub(f.joints[k + 1], f.joints[k - 1]));
        const n = V.perp(d);
        const half = f.w * (view === 'dorsal' ? 0.18 : 0.26);
        const bow = f.w * (view === 'dorsal' ? -0.05 : 0.04);
        const cr = catmull([V.add(j, V.mul(n, -half)), V.add(j, V.mul(d, bow)), V.add(j, V.mul(n, half))], 4);
        pt.ink(cr, { ctx: g, w: lw * 0.42, color: lineC, alpha: isC ? 0.55 : 0.7, seed: 900 + i * 5 + k, taper: [0.35, 0.35], boilAmp: 0 });
      }
    });
  }
  if (o.palmLines && view === 'palmar') {
    for (const [name, pts] of Object.entries(PALM_LINES)) {
      if (o.palmLines !== true && !o.palmLines.includes(name)) continue;
      const w = geo.S * 0.012;
      pt.ink(catmull(pts.map(geo.tf), 6), { ctx: g, w, color: lineC, alpha: 0.7, seed: 950 + name.length, taper: [0.3, 0.3], boilAmp: 0 });
    }
  }
  if (o.traceAlpha && o.traceAlpha > 0) {
    const tr = [[0.44, -0.12], [0.47, -0.38], [0.47, -0.62], [0.43, -0.8]].map(geo.tf);
    pt.ink(catmull(tr, 6), { ctx: g, w: Math.max(2, geo.S * 0.045), color: PAL.vermilion, alpha: o.traceAlpha, seed: 71, taper: [0.4, 0.5], coarse: true, boilAmp: 0 });
  }
  pt.put(g, { alpha: o.alpha ?? 1, op: o.op || 'source-over' });
  return geo;
}
