// The corridor as a small 3D world shared by Module A (seen through the finger
// gap) and Module B (walked through, then folded into a profile). Units are
// "door units": the entry door is 100 wide and 330 tall, the floor is Y = 0,
// depth z grows away from the viewer. A pinhole camera at eye height VPV sits
// Zc behind the door plane and can dolly forward by zcam. projUV returns
// door-local (u, v): u across, v up. An optional screen-space warp bends every
// line and fill (the drawing folds as one sheet).
import { V, clamp, lerp, resample } from './math.mjs';
import { PAL, rgba, mixc } from './palette.mjs';

export const COR = { W: 100, H: 330, VPV: 118, Zc: 280, SPACING: 168, N: 16, EXIT_Z: 2800 };

export function projUV(X, Y, z, zcam = 0, eye = COR.VPV) {
  const d = COR.Zc + z - zcam;
  if (d < 6) return null;
  const s = COR.Zc / d;
  return [X * s, eye + (Y - eye) * s, s];
}

export const frameZ = (k) => k * COR.SPACING;

/** densify a closed polygon edge by edge */
function densifyLoop(poly, per) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    for (let k = 0; k < per; k++) out.push(V.lerp(a, b, k / per));
  }
  return out;
}

/**
 * opts: {zcam, on, alphaK(k), skipEntry, lw, texM, texScale, warp(p)→p, lineAlpha, fillAlpha, hideJamb(k), hideRay(X,Y)}
 */
export function drawCorridor(pt, map, opts = {}) {
  const ctx = pt.ctx;
  const zcam = opts.zcam || 0;
  const on = opts.on ?? 1;
  const la = opts.lineAlpha ?? 1;
  const W = COR.W / 2, H = COR.H;
  const warp = opts.warp || null;
  const eye = opts.eye ?? COR.VPV;
  const P = (X, Y, z) => {
    const r = projUV(X, Y, z, zcam, eye);
    return r ? [...map(r[0], r[1]), r[2]] : null;
  };
  const WL = (pts, n = 28) => (warp ? resample(pts, n).map((p) => warp(p)) : pts);
  const WP = (poly, per = 10) => (warp ? densifyLoop(poly, per).map((p) => warp(p)) : poly);
  const lw = opts.lw || 1;
  const zN = Math.max(zcam - COR.Zc + 10, 0);
  // surfaces: floor darkest, walls mid, ceiling light; each fades toward the bright exit
  const surf = (pts, a0, a1) => {
    const q = pts.map((p) => P(p[0], p[1], p[2]));
    if (!q.every(Boolean) || pt.animatic) return;
    const poly = WP(q.map((r) => [r[0], r[1]]), 16);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    pt.path(poly, true);
    let near = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2], far = [(q[2][0] + q[3][0]) / 2, (q[2][1] + q[3][1]) / 2];
    if (warp) {
      near = warp(near);
      far = warp(far);
    }
    const g = ctx.createLinearGradient(near[0], near[1], far[0], far[1]);
    const nf = opts.nearFade || 0;
    g.addColorStop(0, rgba(PAL.indigo, a0 * on * (opts.fillAlpha ?? 1) * (1 - nf)));
    if (nf > 0) g.addColorStop(0.45, rgba(PAL.indigo, a0 * on * (opts.fillAlpha ?? 1) * 0.8));
    g.addColorStop(0.75, rgba(PAL.indigo, a1 * on * (opts.fillAlpha ?? 1)));
    g.addColorStop(1, rgba(PAL.indigo, 0.02 * on));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  };
  surf([[-W, 0, zN], [W, 0, zN], [W, 0, COR.EXIT_Z], [-W, 0, COR.EXIT_Z]], 0.36, 0.2);
  surf([[-W, 0, zN], [-W, H, zN], [-W, H, COR.EXIT_Z], [-W, 0, COR.EXIT_Z]], 0.22, 0.14);
  surf([[W, 0, zN], [W, H, zN], [W, H, COR.EXIT_Z], [W, 0, COR.EXIT_Z]], 0.26, 0.16);
  surf([[-W, H, zN], [W, H, zN], [W, H, COR.EXIT_Z], [-W, H, COR.EXIT_Z]], 0.12, 0.08);
  // floor boards and ceiling rays converging on the exit
  const z0 = Math.max(0, zcam - COR.Zc + 20);
  const rays = [[-W, 0], [W, 0], [-W, H], [W, H], [-W * 0.5, 0], [0, 0], [W * 0.5, 0]];
  const rayLines = [];
  rays.forEach(([X, Y], i) => {
    const a = P(X, Y, z0), b = P(X, Y, COR.EXIT_Z);
    if (a && b) {
      const line = WL([[a[0], a[1]], [b[0], b[1]]], 40);
      rayLines.push({ X, Y, line });
      const hide = opts.hideRay ? opts.hideRay(X, Y) : 0;
      if (hide < 1) pt.ink(line, { w: (i < 4 ? 1.4 : 0.8) * lw, color: PAL.indigo, alpha: (i < 4 ? 0.75 : 0.35) * on * la * (1 - hide), seed: 41 + i, taper: [0.02 + 0.5 * (opts.nearFade || 0), 0.4], boilAmp: 0.2 });
    }
  });
  // columns on the walls, between frames (the folded knuckle creases)
  for (let k = 0; k < COR.N; k++) {
    for (const sx of [-1, 1]) {
      const z = frameZ(k) + COR.SPACING * 0.5;
      const a = P(sx * W, 0, z), b = P(sx * W, H, z);
      if (!a || !b) continue;
      const al = (opts.alphaK ? opts.alphaK(k) : 1) * on * clamp(a[2] * 3);
      if (al > 0.01) pt.ink(WL([[a[0], a[1]], [b[0], b[1]]], 20), { w: 1.0 * lw, color: PAL.indigo, alpha: 0.55 * al * la, seed: 120 + k * 2 + (sx > 0 ? 1 : 0), taper: [0.05, 0.05], boilAmp: 0.2 });
    }
  }
  // doorframes as paper cut-outs, far to near
  const frames = [];
  for (let k = COR.N - 1; k >= 0; k--) {
    const z = frameZ(k);
    const al = (opts.alphaK ? opts.alphaK(k) : 1) * on;
    if (al <= 0.001) continue;
    const c = [P(-W, 0, z), P(-W, H, z), P(W, H, z), P(W, 0, z)];
    if (!c.every(Boolean)) continue;
    const s = c[0][2];
    const band = 8;
    const ci = [P(-W + band, 0, z), P(-W + band, H - band, z), P(W - band, H - band, z), P(W - band, 0, z)];
    const outer = [P(-W - band, 0, z), P(-W - band, H + band, z), P(W + band, H + band, z), P(W + band, 0, z)];
    frames.push({ k, z, s, c, ci, outer, al });
  }
  for (const f of frames) {
    if (f.k === 0 && opts.skipEntry) continue;
    const tint = mixc(PAL.paperLight, PAL.indigo, Math.min(0.5, 0.04 + (1 - f.s) * 0.28));
    const o = WP(f.outer.map((q) => [q[0], q[1]]), 12), i2 = WP(f.ci.map((q) => [q[0], q[1]]), 12);
    const band = () => {
      ctx.beginPath();
      ctx.moveTo(o[0][0], o[0][1]);
      for (const q of o) ctx.lineTo(q[0], q[1]);
      ctx.closePath();
      ctx.moveTo(i2[0][0], i2[0][1]);
      for (const q of i2.slice().reverse()) ctx.lineTo(q[0], q[1]);
      ctx.closePath();
    };
    ctx.save();
    ctx.globalAlpha *= f.al * (opts.fillAlpha ?? 1);
    if (pt.animatic) {
      band();
      ctx.fillStyle = rgba(tint);
      ctx.fill('evenodd');
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.filter = `blur(${Math.max(0.5, 4 * f.s) * (ctx.canvas.width / pt.W)}px)`;
      ctx.translate(3 * f.s, 5 * f.s);
      band();
      ctx.fillStyle = rgba([60, 45, 30], 0.18);
      ctx.fill('evenodd');
      ctx.restore();
      band();
      ctx.fillStyle = pt.pattern(pt.tex.paper, opts.texM || [1, 0, 0, 1, 0, 0], (opts.texScale || 0.62) * Math.max(0.3, f.s));
      ctx.fill('evenodd');
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = rgba(tint, 1);
      ctx.fill('evenodd');
    }
    ctx.restore();
    const w = Math.max(0.5, 1.6 * f.s) * lw;
    const oc = f.outer.map((q) => [q[0], q[1]]), ic = f.ci.map((q) => [q[0], q[1]]);
    const hideJ = opts.hideJamb ? opts.hideJamb(f.k) : 0;
    pt.ink(WL([oc[0], oc[1]], 24), { w, color: PAL.indigo, alpha: 0.85 * f.al * la, seed: 60 + f.k, taper: [0, 0], boilAmp: 0.25 });
    pt.ink(WL([oc[1], oc[2]], 24), { w, color: PAL.indigo, alpha: 0.85 * f.al * la * (1 - hideJ), seed: 61 + f.k, taper: [0, 0], boilAmp: 0.25 });
    pt.ink(WL([oc[2], oc[3]], 24), { w, color: PAL.indigo, alpha: 0.85 * f.al * la * (1 - hideJ), seed: 62 + f.k, taper: [0, 0], boilAmp: 0.25 });
    pt.ink(WL([ic[0], ic[1], ic[2], ic[3]], 36), { w: w * 0.7, color: PAL.indigo, alpha: 0.7 * f.al * la, seed: 80 + f.k, taper: [0, 0], boilAmp: 0.25 });
  }
  // the far exit: a small bright opening
  const ex = [P(-W * 0.7, 0, COR.EXIT_Z), P(-W * 0.7, H * 0.8, COR.EXIT_Z), P(W * 0.7, H * 0.8, COR.EXIT_Z), P(W * 0.7, 0, COR.EXIT_Z)];
  if (ex.every(Boolean)) {
    ctx.save();
    ctx.fillStyle = rgba(PAL.paperLight, on);
    pt.path(WP(ex.map((q) => [q[0], q[1]]), 4), true);
    ctx.fill();
    ctx.restore();
  }
  return { P, frames, rayLines };
}
