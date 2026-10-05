// Cut-paper puppet rig. A figure is a 2D FK skeleton whose bones carry
// paper pieces. Pieces are grouped into cut-out planes; each plane is a
// union silhouette with its own outline, so overlaps read like layered paper.
//
// Identity marks:
//   protagonist: deep indigo contour, small unclosed gap with a hook at the right shoulder
//   companion:   opaque vermilion paint, left-hand fingertips left as unpainted paper
import { V, clamp, lerp, seg, ease, TAU, catmull, noise1, cumLengths, resample } from './math.mjs';
import { capsule, circle } from './draw.mjs';
import { PAL, rgba, mixc } from './palette.mjs';
import { traceUnion, cutLoop, anchorLoop } from './trace.mjs';

const D2R = Math.PI / 180;
const dirv = (deg) => [Math.cos(deg * D2R), Math.sin(deg * D2R)];

// bone lengths in figure units (figure height ~ 1)
export const BONES = {
  spine: 0.3,
  neck: 0.05,
  head: 0.07,
  upper: 0.175,
  fore: 0.155,
  hand: 0.085,
  thigh: 0.245,
  shin: 0.235,
  foot: 0.075,
};

// rest pose: standing, arms down, profile facing right. Angles are absolute screen angles in degrees.
export const REST = {
  x: 0, y: 0, // pelvis position (figure units, before scale)
  spine: -90, neck: -90, head: -90,
  shR: 92, elR: 94, haR: 95,
  shL: 88, elL: 86, haL: 85,
  thR: 88, snR: 92, ftR: 0,
  thL: 92, snL: 88, ftL: 0,
  yaw: 1, // 1 = profile facing right, -1 = profile facing left, 0 = front, 2/-2 = back (continuous)
  yawU: null, // optional upper-body yaw (torso, shoulders, arms); defaults to yaw
  yawH: null, // optional head yaw (look back over the shoulder); defaults to yawU
  lean: 0,
  hair: 0,
};

const ANG_KEYS = ['spine', 'neck', 'head', 'shR', 'elR', 'haR', 'shL', 'elL', 'haL', 'thR', 'snR', 'ftR', 'thL', 'snL', 'ftL'];

function angLerp(a, b, s) {
  let d = ((b - a + 540) % 360) - 180;
  return a + d * s;
}

export function blendPose(a, b, s, perJoint = null) {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    const sj = perJoint && perJoint[k] !== undefined ? perJoint[k] : s;
    if (ANG_KEYS.includes(k)) out[k] = angLerp(a[k] ?? REST[k], b[k], sj);
    else if (typeof b[k] === 'number') out[k] = lerp(a[k] ?? REST[k] ?? 0, b[k], sj);
    else out[k] = sj < 0.5 ? a[k] : b[k];
  }
  return out;
}

// overlapping action: which joints lead and which drag (seconds)
export const DRAG = {
  x: 0, y: 0, spine: 0.0, lean: 0.0, neck: 0.03, head: 0.06, yaw: 0.02, yawU: 0.04, yawH: 0.07,
  shR: 0.04, elR: 0.09, haR: 0.14, shL: 0.05, elL: 0.1, haL: 0.15,
  thR: 0.0, snR: 0.03, ftR: 0.05, thL: 0.0, snL: 0.03, ftL: 0.05, hair: 0.2,
};

/**
 * Sample a key-pose track. keys: [{t, pose, e?}] sorted. Each key's pose is merged over REST.
 * Joints follow with DRAG delays so the body leads and extremities follow through.
 */
export function track(keys, t, dragScale = 1) {
  const full = keys.map((k) => ({ ...k, pose: { ...REST, ...k.pose } }));
  const at = (tt) => {
    if (tt <= full[0].t) return full[0].pose;
    if (tt >= full[full.length - 1].t) return full[full.length - 1].pose;
    let i = 0;
    while (i < full.length - 2 && tt > full[i + 1].t) i++;
    const A = full[i], B = full[i + 1];
    const s = (B.e || ease.io3)(seg(tt, A.t, B.t));
    return { A: A.pose, B: B.pose, s };
  };
  const out = { ...REST };
  for (const k of Object.keys(REST)) {
    const dl = (DRAG[k] ?? 0) * dragScale;
    const r = at(t - dl);
    if (r.A === undefined) {
      out[k] = r[k];
      continue;
    }
    let a = r.A[k], b = r.B[k];
    if ((k === 'yawU' || k === 'yawH') && (a == null || b == null)) {
      const fa = k === 'yawH' ? (r.A.yawU ?? r.A.yaw) : r.A.yaw, fb = k === 'yawH' ? (r.B.yawU ?? r.B.yaw) : r.B.yaw;
      if (a == null) a = fa;
      if (b == null) b = fb;
    }
    if (ANG_KEYS.includes(k)) out[k] = angLerp(a, b, r.s);
    else if (typeof a === 'number' && typeof b === 'number') out[k] = lerp(a, b, r.s);
    else out[k] = r.s < 0.5 ? a : b;
  }
  return out;
}

/** forward kinematics → joint positions in figure units (pelvis at pose.x, pose.y) */
export function fk(pose) {
  const P = { ...REST, ...pose };
  const J = {};
  const sideOf = (y) => clamp(Math.abs(y) <= 1 ? 1 - Math.abs(y) : Math.abs(y) - 1, 0, 1); // 0 profile, 1 front/back
  const yawU = P.yawU ?? P.yaw;
  const side = sideOf(yawU);
  const back = Math.abs(yawU) > 1;
  const sideL = sideOf(P.yaw), backL = Math.abs(P.yaw) > 1;
  J.pelvis = [P.x, P.y];
  J.chest = V.add(J.pelvis, V.mul(dirv(P.spine), BONES.spine));
  J.neck = V.add(J.chest, V.mul(dirv(P.neck), BONES.neck));
  J.head = V.add(J.neck, V.mul(dirv(P.head), BONES.head));
  const spineDir = dirv(P.spine);
  const across = V.perp(spineDir); // points to screen-right when upright... perp of up(0,-1) = (1,0)
  // character's right side appears on screen-left in front view, screen-right in back view
  const rs = back ? 1 : -1, rsL = backL ? 1 : -1;
  const shW = lerp(0.018, 0.098, side), hpW = lerp(0.012, 0.055, sideL);
  // in profile the near shoulder sits slightly forward
  const fwd = yawU >= 0 ? 1 : -1;
  const prof = 1 - side;
  J.shR = V.add(J.chest, V.add(V.mul(across, rs * shW), V.mul([fwd * 0.012 * prof, 0.012], 1)));
  J.shL = V.add(J.chest, V.add(V.mul(across, -rs * shW), V.mul([-fwd * 0.012 * prof, 0.012], 1)));
  J.hipR = V.add(J.pelvis, V.mul(across, rsL * hpW));
  J.hipL = V.add(J.pelvis, V.mul(across, -rsL * hpW));
  for (const s of ['R', 'L']) {
    J['el' + s] = V.add(J['sh' + s], V.mul(dirv(P['sh' + s]), BONES.upper));
    J['wr' + s] = V.add(J['el' + s], V.mul(dirv(P['el' + s]), BONES.fore));
    J['ha' + s] = V.add(J['wr' + s], V.mul(dirv(P['ha' + s]), BONES.hand));
    J['kn' + s] = V.add(J['hip' + s], V.mul(dirv(P['th' + s]), BONES.thigh));
    J['an' + s] = V.add(J['kn' + s], V.mul(dirv(P['sn' + s]), BONES.shin));
    J['to' + s] = V.add(J['an' + s], V.mul(dirv(P['ft' + s]), BONES.foot));
  }
  J.pose = P;
  J.side = side;
  J.back = back;
  const yawH = P.yawH ?? yawU;
  J.sideH = sideOf(yawH);
  J.backH = Math.abs(yawH) > 1;
  J.fwdH = yawH >= 0 ? 1 : -1;
  return J;
}

// ---------------- pieces ----------------
function torsoPoly(J, P, build) {
  const up = V.norm(V.sub(J.chest, J.pelvis));
  const ac = V.perp(up); // screen-right-ish normal
  const side = J.side;
  const fwd = (P.yawU ?? P.yaw) >= 0 ? 1 : -1;
  // widths: front view vs profile depth
  const wS = lerp(0.075, 0.118, side) * build.shoulder;
  const wW = lerp(0.058, 0.08, side) * build.waist;
  const wH = lerp(0.07, 0.1, side) * build.hip;
  const f = (1 - side) * fwd; // forward bulge for profile
  const at = (s) => V.lerp(J.pelvis, J.chest, s);
  const pts = [];
  const prof = [
    // s along spine, half-width, forward bias
    [1.08, wS * 0.55, 0.0],
    [1.0, wS, 0.01],
    [0.82, wS * 0.96, 0.03 * build.chest],
    [0.55, wW, 0.012],
    [0.2, wH, -0.005],
    [-0.08, wH * 0.92, -0.01],
  ];
  // right edge top→bottom then left edge bottom→top
  for (const [s, w, b] of prof) pts.push(V.add(at(s), V.add(V.mul(ac, -w), V.mul(ac, -b * f * 2.2))));
  for (const [s, w, b] of prof.slice().reverse()) pts.push(V.add(at(s), V.add(V.mul(ac, w), V.mul(ac, -b * f * 2.2))));
  return catmull(pts, 4, true);
}

function headPoly(J, P, build) {
  // profile head with nose/chin that turns with yaw; front/back becomes an oval
  const up = dirv(P.head);
  const ac = V.perp(up);
  const c = J.head;
  const side = J.sideH;
  const fwd = J.fwdH;
  const f = (1 - side) * (J.backH ? 0 : 1); // face features only when face visible in profile
  const rx = 0.058 * build.head, ry = 0.07 * build.head;
  const pts = [];
  const N = 36;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    let x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    // flatten face side, add nose and chin on the facing side
    const face = Math.max(0, Math.cos(a)) * f; // facing +x local
    const nose = Math.exp(-Math.pow((a - 0.25) / 0.16, 2)) * 0.02 * f;
    const brow = Math.exp(-Math.pow((a + 0.55) / 0.2, 2)) * 0.004 * f;
    const chin = Math.exp(-Math.pow((a - 1.05) / 0.22, 2)) * 0.012 * f;
    x += nose + brow + chin - face * 0.004;
    if (a > 0.9 && a < 2.0) y += 0.006 * f; // jaw
    // local frame: +x = facing direction
    const lx = x * fwd;
    // local (lx, y): +x = facing direction, -y = up
    pts.push(V.add(c, V.add(V.mul(ac, lx), V.mul(up, -y))));
  }
  return pts;
}

function hairPoly(J, P, build, style) {
  const up = dirv(P.head);
  const R = V.perp(up), U = [-up[0], -up[1]];
  const c = J.head;
  const fwd = J.fwdH;
  const side = J.sideH;
  const back = J.backH;
  const pts = [];
  if (style === 'short' && side > 0.55) {
    // front/back view: a cap over the crown with a soft fringe
    const rx = 0.061 * build.head, ry = 0.072 * build.head;
    const cap = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * (1.08 - 1.16 * (i / 14));
      cap.push([Math.cos(a) * rx * 1.1, Math.sin(a) * ry * 1.08 - 0.004]);
    }
    const fringe = back ? [[rx * 0.9, -0.03], [0, -0.045], [-rx * 0.9, -0.03]] : [[rx * 0.86, 0.004], [rx * 0.35, 0.024], [-rx * 0.15, 0.018], [-rx * 0.7, 0.01]];
    for (const [x, y] of [...cap, ...fringe]) pts.push(V.add(c, V.add(V.mul(R, x), V.mul(up, y))));
    return catmull(pts, 3, true);
  }
  if (style === 'short') {
    // cap of hair over the back/top of the head
    const loc = [[-0.064, 0.012], [-0.06, 0.05], [-0.03, 0.078], [0.012, 0.08], [0.045, 0.062], [0.05, 0.04], [0.02, 0.05], [-0.02, 0.04], [-0.05, 0.0], [-0.058, -0.03]];
    for (const [x, y] of loc) {
      const lx = back ? x * 0.2 : x * fwd * (1 - side * 0.7);
      pts.push(V.add(c, V.add(V.mul(R, lx), V.mul(up, y))));
    }
    return catmull(pts, 3, true);
  }
  // long hair: falls behind, lags with P.hair swing
  const sw = P.hair || 0;
  const loc = [[-0.05, 0.07], [0.02, 0.085], [0.055, 0.05], [0.04, 0.0], [0.0, -0.02], [-0.03, -0.09], [-0.02 - sw * 0.03, -0.2], [-0.09 - sw * 0.05, -0.19], [-0.085, -0.06], [-0.07, 0.03]];
  for (const [x, y] of loc) {
    const lx = back ? x * 0.4 : x * fwd * (1 - side * 0.5);
    pts.push(V.add(c, V.add(V.mul(R, lx), V.mul(up, y))));
  }
  return catmull(pts, 3, true);
}

export function headParts(J, build = {}) {
  const b = { head: 1, ...build };
  return { head: headPoly(J, J.pose, b), hairShort: hairPoly(J, J.pose, b, 'short'), hairLong: hairPoly(J, J.pose, b, 'long') };
}

function footPoly(J, s) {
  return capsule(J['an' + s], J['to' + s], 0.021, 0.014, 6);
}

function handPoly(J, s, P) {
  const a = J['wr' + s], b = J['ha' + s];
  return capsule(a, V.lerp(a, b, 0.85), 0.02, 0.017, 6);
}

/**
 * Build cut-out planes for a figure. Returns array of {name, polys:[], order}
 * in painter's order (back to front).
 */
export function pieces(J, opts = {}) {
  const P = J.pose;
  const build = { shoulder: 1, waist: 1, hip: 1, head: 1, chest: 1, ...(opts.build || {}) };
  const limbR = opts.limb || 1;
  const arm = (s) => [
    capsule(J['sh' + s], J['el' + s], 0.03 * limbR, 0.025 * limbR, 7),
    capsule(J['el' + s], J['wr' + s], 0.024 * limbR, 0.018 * limbR, 7),
    handPoly(J, s, P),
  ];
  const leg = (s) => [
    capsule(J['hip' + s], J['kn' + s], 0.05 * limbR, 0.036 * limbR, 8),
    capsule(J['kn' + s], J['an' + s], 0.034 * limbR, 0.022 * limbR, 8),
    footPoly(J, s),
  ];
  const head = [headPoly(J, P, build), capsule(J.chest, J.neck, 0.028, 0.025, 6)];
  const hair = opts.hair ? [hairPoly(J, P, build, opts.hair)] : [];
  const torso = [torsoPoly(J, P, build)];
  const garment = opts.garment ? [garmentPoly(J, P, opts.garment, opts.hem)] : [];
  // near/far sides depend on yaw
  let nearS = 'R', farS = 'L';
  const yu = P.yawU ?? P.yaw;
  if (yu < 0) [nearS, farS] = ['L', 'R']; // turning toward the camera's left shows the left side
  const frontish = J.side > 0.5;
  const planes = [];
  if (frontish) {
    planes.push({ name: 'body', polys: [...leg('R'), ...leg('L'), ...torso, ...garment, ...head, ...hair] });
    planes.push({ name: 'armR', polys: arm('R'), side: 'R' });
    planes.push({ name: 'armL', polys: arm('L'), side: 'L' });
  } else {
    planes.push({ name: 'far', polys: [...arm(farS), ...leg(farS)], side: farS });
    planes.push({ name: 'body', polys: [...leg(nearS), ...torso, ...garment, ...head, ...hair] });
    planes.push({ name: 'near', polys: arm(nearS), side: nearS });
  }
  return planes;
}

function garmentPoly(J, P, style, hem) {
  // loose nightshirt from shoulders to mid thigh; hem lags via `hem` (pelvis offset from an earlier pose)
  const up = V.norm(V.sub(J.chest, J.pelvis));
  const ac = V.perp(up);
  const side = J.side;
  const len = style === 'long' ? 0.3 : 0.2;
  const lag = hem || [0, 0];
  const w0 = lerp(0.07, 0.12, side), w1 = lerp(0.1, 0.15, side);
  const top = V.add(J.chest, V.mul(up, 0.0));
  const bot = V.add(J.pelvis, V.add(V.mul(up, -len), lag));
  const pts = [
    V.add(top, V.mul(ac, -w0)),
    V.add(V.lerp(top, bot, 0.55), V.mul(ac, -w0 * 0.95)),
    V.add(bot, V.mul(ac, -w1)),
    V.add(bot, V.add(V.mul(ac, -w1 * 0.3), V.mul(up, -0.008))),
    V.add(bot, V.add(V.mul(ac, w1 * 0.35), V.mul(up, 0.004))),
    V.add(bot, V.mul(ac, w1)),
    V.add(V.lerp(top, bot, 0.55), V.mul(ac, w0 * 0.95)),
    V.add(top, V.mul(ac, w0)),
  ];
  return catmull(pts, 4, true);
}

// ---------------- rendering ----------------
/** figure-space → screen transform (optionally rotated about the pelvis by `rot`) */
export function toScreen(polys, X, Y, S, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return polys.map((poly) => poly.map(([x, y]) => [X + (x * c - y * s) * S, Y + (x * s + y * c) * S]));
}
export function ptScreen(p, X, Y, S, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [X + (p[0] * c - p[1] * s) * S, Y + (p[0] * s + p[1] * c) * S];
}

function traced(pl, o, cell) {
  return traceUnion(toScreen(pl.polys, o.X, o.Y, o.S, o.rot || 0), cell, { smooth: 2 });
}

function loopPath(ctx, loops) {
  ctx.beginPath();
  for (const l of loops) {
    const p = l.pts;
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath();
  }
}

const P_OPTS = (o) => ({ garment: o.garment ?? 'short', hair: 'short', hem: o.hem, build: o.build });
const C_OPTS = (o) => ({ garment: 'long', hair: 'long', hem: o.hem, build: { shoulder: 1.04, waist: 1.12, hip: 1.14, head: 1.02, chest: 1.08, ...(o.build || {}) }, limb: 1.07 });

/** screen-space silhouette loops of the whole figure (for masks, absences, reflections) */
export function silhouette(o, kind = 'P') {
  const J = fk(o.pose);
  const planes = pieces(J, kind === 'P' ? P_OPTS(o) : C_OPTS(o));
  const polys = planes.flatMap((pl) => toScreen(pl.polys, o.X, o.Y, o.S, o.rot || 0));
  const cell = clamp(o.S / 170, 0.8, 5);
  return traceUnion(polys, cell, { smooth: 2 });
}

/**
 * Generic protagonist-style cut-out: planes (arrays of polys, back→front) as paper
 * with pale wash and charcoal contour. Optional gap {p, len, inward} cuts the
 * nearest contour open and adds the hook.
 * o: {cell, lineW, line, seed, wash, washColor, texM, alpha, lineAlpha, fillAlpha, absence, gap, anchor, regFillPlanes}
 */
export function inkCutout(pt, planes, o = {}) {
  const cell = o.cell || 1.5;
  const lineC = o.line || PAL.indigo;
  const lw = o.lineW || 2.5;
  const seed = o.seed || 101;
  const fillL = pt.layer('pFill');
  const lineL = pt.layer('pLine');
  const texM = o.texM || [1, 0, 0, 1, 0, 0];
  const loopsL = planes.map((polys) => traceUnion(polys, cell, { smooth: 2 }));
  const loopsF = o.regFillPlanes ? o.regFillPlanes.map((polys) => traceUnion(polys, cell, { smooth: 2 })) : loopsL;
  let owner = -1, bestD = 1e9;
  if (o.gap) {
    loopsL.forEach((ls, i) => {
      for (const l of ls) for (const p of l.pts) {
        const d = V.dist(p, o.gap.p);
        if (d < bestD) {
          bestD = d;
          owner = i;
        }
      }
    });
  }
  const anchor = o.anchor || [0, 0];
  for (let i = 0; i < planes.length; i++) {
    const lf = loopsF[i] || [];
    if (lf.length) {
      fillL.save();
      loopPath(fillL, lf);
      fillL.fillStyle = pt.animatic ? rgba(PAL.paper) : pt.pattern(pt.tex.paper, texM, 0.62);
      fillL.fill('evenodd');
      fillL.restore();
      lineL.save();
      lineL.globalCompositeOperation = 'destination-out';
      loopPath(lineL, lf);
      lineL.fillStyle = '#000';
      lineL.fill('evenodd');
      lineL.restore();
    }
    (loopsL[i] || []).forEach((l, k) => {
      if (Math.abs(l.area) < cell * cell * 6) return;
      if (i === owner && k === 0 && o.gap) {
        const open = cutLoop(l.pts, o.gap.p, o.gap.len);
        if (open.length > 4) {
          pt.ink(open, { ctx: lineL, w: lw, color: lineC, seed: seed + i * 13, taper: [0.02, 0.02], rough: 0.4, press: 0.35, wfn: pressure });
          const end = open[open.length - 1], pre = open[Math.max(0, open.length - 5)];
          const tdir = V.norm(V.sub(end, pre));
          const inward = V.norm(V.sub(o.gap.inward, end));
          const nrm = V.dot(V.perp(tdir), inward) > 0 ? V.perp(tdir) : V.mul(V.perp(tdir), -1);
          const hk = hookPts(end, tdir, V.mul(nrm, -1), o.gap.hook || o.gap.len * 0.62);
          pt.ink(hk, { ctx: lineL, w: lw * 0.92, color: lineC, seed: seed + 91, taper: [0.0, 0.55], rough: 0.3, boilAmp: 0.2 });
        }
      } else {
        const a = anchorLoop(l.pts, anchor);
        pt.ink(a.concat([a[0], a[1]]), { ctx: lineL, w: lw, color: lineC, seed: seed + i * 13 + k, taper: [0, 0], rough: 0.4, press: 0.35, wfn: pressure });
      }
    });
  }
  if (!pt.animatic && (o.wash ?? 0.05) > 0) {
    fillL.save();
    fillL.setTransform(1, 0, 0, 1, 0, 0);
    fillL.globalCompositeOperation = 'source-atop';
    fillL.fillStyle = rgba(o.washColor || PAL.indigo, o.wash ?? 0.05);
    fillL.fillRect(0, 0, fillL.canvas.width, fillL.canvas.height);
    fillL.restore();
  }
  if (o.absence && o.absence > 0) {
    // contour dissolves along a direction (default: feet → head, i.e. +y → -y in drawing space)
    const dir = o.absenceDir || [0, -1];
    const all = loopsL.flatMap((ls) => ls.flatMap((l) => l.pts));
    let lo = 1e9, hi = -1e9;
    for (const p of all) {
      const d = p[0] * dir[0] + p[1] * dir[1];
      if (d < lo) lo = d;
      if (d > hi) hi = d;
    }
    const span = hi - lo || 1;
    const lvl = lerp(lo - span * 0.08, hi + span * 0.12, o.absence);
    const fade = span * 0.12;
    lineL.save();
    lineL.globalCompositeOperation = 'destination-out';
    // gradient along dir: erase where projection < lvl
    const c0 = V.mul(dir, lvl - fade), c1 = V.mul(dir, lvl);
    const gr = lineL.createLinearGradient(c0[0], c0[1], c1[0], c1[1]);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    lineL.fillStyle = gr;
    lineL.fillRect(-1e5, -1e5, 2e5, 2e5);
    lineL.restore();
    fillL.save();
    fillL.setTransform(1, 0, 0, 1, 0, 0);
    fillL.globalCompositeOperation = 'source-atop';
    fillL.globalAlpha = clamp(o.absence * 1.5);
    fillL.fillStyle = rgba(PAL.paper, 0.0);
    fillL.restore();
  }
  if (o.extraInk) o.extraInk(lineL);
  const alpha = o.alpha ?? 1;
  pt.put(fillL, { alpha: alpha * (o.fillAlpha ?? 1) });
  pt.put(lineL, { alpha: alpha * (o.lineAlpha ?? 1), op: o.lineOp || 'source-over' });
  return { loops: loopsL };
}

/**
 * Protagonist figure from the rig. o: {X,Y,S,rot,zoom, pose, alpha, lineAlpha, fillAlpha, lineW, wash,
 *   absence, trace, regFill (pose), regShadow {pose,dx,dy,color,alpha}}
 */
export function drawProtagonist(pt, o) {
  const ctx = pt.ctx;
  const J = fk(o.pose);
  const S = o.S, rot = o.rot || 0;
  const zoom = o.zoom || pt.zoom || 1;
  const cell = clamp((S * zoom) / 170, 0.8, 5) / zoom;
  const keep = (pl) => !o.only || o.only.includes(pl.name);
  const planes = pieces(J, P_OPTS(o)).filter(keep).map((pl) => toScreen(pl.polys, o.X, o.Y, S, rot));
  const regFillPlanes = o.regFill ? pieces(fk(o.regFill), P_OPTS(o)).filter(keep).map((pl) => toScreen(pl.polys, o.X, o.Y, S, rot)) : null;
  if (o.regShadow && o.regShadow.alpha > 0.002) {
    const ps = pieces(fk(o.regShadow.pose), P_OPTS(o));
    const loops = traceUnion(ps.flatMap((pl) => toScreen(pl.polys, o.X + (o.regShadow.dx || 0), o.Y + (o.regShadow.dy || 0), S, rot)), cell);
    ctx.save();
    ctx.globalCompositeOperation = o.regShadow.op || 'multiply';
    loopPath(ctx, loops);
    ctx.fillStyle = rgba(o.regShadow.color || PAL.cyan, o.regShadow.alpha);
    ctx.fill('evenodd');
    ctx.restore();
  }
  const gp = shoulderGapPoint(J, o.X, o.Y, S, rot);
  const lw = o.lineW ?? clamp(S * 0.0105, 1.1 / zoom, 7);
  const trace = o.trace || 0;
  const res = inkCutout(pt, planes, {
    cell, lineW: lw, line: o.line, seed: o.seed || 101, wash: o.wash, washColor: o.washColor,
    texM: o.texM || [1, 0, 0, 1, o.X * 0.37, o.Y * 0.29], alpha: o.alpha, lineAlpha: o.lineAlpha, fillAlpha: o.fillAlpha,
    absence: o.absence, absenceDir: o.absenceDir || V.rot([0, -1], rot), regFillPlanes, lineOp: o.lineOp,
    anchor: fkScreen(J.head, o),
    gap: o.gap === false ? null : { p: gp.p, len: Math.max(3 / zoom, S * (o.gapLen || 0.045)), inward: fkScreen(J.chest, o), hook: Math.max(2.5 / zoom, S * 0.028) },
    extraInk: trace > 0 ? (lineL) => {
      const a = J.wrR, b = J.haR;
      const d = V.norm(V.sub(b, a));
      const n = V.perp(d);
      const sg = o.traceSide || 1;
      const tr = [V.add(V.lerp(a, b, 0.1), V.mul(n, sg * 0.019)), V.add(V.lerp(a, b, 0.45), V.mul(n, sg * 0.02)), V.add(V.lerp(a, b, 0.8), V.mul(n, sg * 0.016))].map((p) => fkScreen(p, o));
      pt.ink(catmull(tr, 4), { ctx: lineL, w: Math.max(1.6 / zoom, S * 0.013), color: PAL.vermilion, alpha: trace, seed: 55, taper: [0.3, 0.4], boilAmp: 0.2 });
    } : null,
  });
  return { J, gap: gp, loops: res.loops };
}

// thick-thin: heavier on the undersides, lighter on long outer runs
const pressure = (u) => 0.72 + 0.5 * Math.pow(Math.sin(u * Math.PI * 3.0 + 0.6), 2);

export function fkScreen(p, o) {
  return ptScreen(p, o.X, o.Y, o.S, o.rot || 0);
}

export function shoulderGapPoint(J, X, Y, S, rot = 0) {
  const up = V.norm(V.sub(J.chest, J.pelvis));
  const armDir = V.norm(V.sub(J.elR, J.shR));
  const outward = V.norm(V.add(V.mul(up, 1.0), V.mul(armDir, -0.3)));
  const p = V.add(J.shR, V.mul(outward, 0.03));
  const sp = ptScreen(p, X, Y, S, rot);
  const t = V.rot(V.perp(outward), rot);
  return { p: sp, t, n: V.rot(outward, rot) };
}

/** canonical hooked bend: a short run that bends sharply and curls back */
export function hookPts(p, t, n, size) {
  const loc = [[0, 0], [0.3, 0.02], [0.55, 0.14], [0.66, 0.38], [0.58, 0.6], [0.42, 0.66]];
  return catmull(loc.map(([a, b]) => V.add(p, V.add(V.mul(t, a * size), V.mul(n, -b * size)))), 4, false);
}

/**
 * Generic companion-style cut-out: vermilion gouache planes with cut-paper shadows
 * between them and a thin deep-vermilion contour.
 * o: {cell, color, texM, lineAlpha, lineW, alpha, anchor, tips: [polys unpainted], regLinePlanes}
 */
export function paintCutout(pt, planes, o = {}) {
  const cell = o.cell || 1.5;
  const col = o.color || PAL.vermilion;
  const texM = o.texM || [1, 0, 0, 1, 0, 0];
  const g = pt.layer('cPaint');
  const loops = planes.map((polys) => traceUnion(polys, cell, { smooth: 2 }));
  const lineLoops = o.regLinePlanes ? o.regLinePlanes.map((polys) => traceUnion(polys, cell, { smooth: 2 })) : loops;
  const shadowW = o.shadowW ?? cell * 2.2;
  for (let i = 0; i < planes.length; i++) {
    const l = loops[i];
    if (!l.length) continue;
    if (i > 0 && !pt.animatic) {
      g.save();
      g.globalCompositeOperation = 'source-atop';
      g.filter = `blur(${Math.max(0.6, shadowW * (pt.zoom || 1)) * (pt.ctx.canvas.width / pt.W)}px)`;
      g.translate(shadowW * 0.7, shadowW);
      loopPath(g, l);
      g.fillStyle = rgba(PAL.vermilionDeep, 0.6);
      g.fill('evenodd');
      g.restore();
    }
    g.save();
    loopPath(g, l);
    g.fillStyle = rgba(col, 1);
    g.fill('evenodd');
    if (!pt.animatic) {
      g.clip('evenodd');
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = 0.5;
      g.fillStyle = pt.pattern(pt.tex.paint, texM, 0.7);
      g.fillRect(-1e5, -1e5, 2e5, 2e5);
    }
    g.restore();
  }
  const la = o.lineAlpha ?? 0.7;
  if (la > 0) {
    lineLoops.forEach((ls, i) => ls.forEach((l, k) => {
      const a = anchorLoop(l.pts, o.anchor || [0, 0]);
      pt.ink(a.concat([a[0], a[1]]), { ctx: g, w: o.lineW || cell * 1.2, color: PAL.vermilionDeep, alpha: la, seed: 300 + i * 7 + k, taper: [0, 0], rough: 0.3, press: 0.4 });
    }));
  }
  for (const tip of o.tips || []) {
    g.save();
    pt.path(tip, true, g);
    g.globalCompositeOperation = 'destination-out';
    g.fill();
    g.globalCompositeOperation = 'source-over';
    pt.paperFill(tip, texM, { ctx: g });
    g.restore();
    pt.ink(tip.concat([tip[0]]), { ctx: g, w: (o.lineW || cell * 1.2) * 0.8, color: PAL.vermilionDeep, alpha: 0.7, seed: 377, taper: [0, 0], boilAmp: 0.15 });
  }
  pt.put(g, { alpha: o.alpha ?? 1, op: o.op || 'source-over' });
  return { loops };
}

/** Companion figure from the rig. o: {X,Y,S,rot,zoom,pose,alpha,color,lineAlpha,regLine} */
export function drawCompanion(pt, o) {
  const J = fk(o.pose);
  const S = o.S, rot = o.rot || 0;
  const zoom = o.zoom || pt.zoom || 1;
  const cell = clamp((S * zoom) / 170, 0.8, 5) / zoom;
  const keepC = (pl) => !o.only || o.only.includes(pl.name);
  const planes = pieces(J, C_OPTS(o)).filter(keepC).map((pl) => toScreen(pl.polys, o.X, o.Y, S, rot));
  const regLinePlanes = o.regLine ? pieces(fk(o.regLine), C_OPTS(o)).filter(keepC).map((pl) => toScreen(pl.polys, o.X, o.Y, S, rot)) : null;
  const a = J.wrL, b = J.haL;
  const tip = toScreen([capsule(V.lerp(a, b, 0.55), V.lerp(a, b, 0.88), 0.0185, 0.017, 6)], o.X, o.Y, S, rot)[0];
  const res = paintCutout(pt, planes, {
    cell, color: o.color, texM: o.texM || [1, 0, 0, 1, o.X * 0.21, o.Y * 0.33], lineAlpha: o.lineAlpha,
    lineW: clamp(S * 0.0045, 0.8 / zoom, 3), alpha: o.alpha, anchor: fkScreen(J.head, o),
    tips: o.fingertips === false || (o.only && !o.only.includes(pieces(J, C_OPTS(o)).find((pl) => pl.side === 'L')?.name)) ? [] : [tip], regLinePlanes, shadowW: S * 0.006,
  });
  return { J, loops: res.loops };
}
