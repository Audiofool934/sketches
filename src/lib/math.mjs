// Deterministic math, easing, noise and polyline geometry.
// Everything here is a pure function of its inputs so any frame can be
// rendered in isolation (seekable, parallel-safe).

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, s) => a + (b - a) * s;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (s) => s * s * (3 - 2 * s);
export const smoother = (s) => s * s * s * (s * (s * 6 - 15) + 10);
export const mix = (a, b, s) => a.map((v, i) => v + (b[i] - v) * s);

export const ease = {
  lin: (s) => s,
  in2: (s) => s * s,
  out2: (s) => 1 - (1 - s) * (1 - s),
  io2: (s) => (s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2),
  in3: (s) => s * s * s,
  out3: (s) => 1 - Math.pow(1 - s, 3),
  io3: (s) => (s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2),
  io4: (s) => (s < 0.5 ? 8 * s ** 4 : 1 - Math.pow(-2 * s + 2, 4) / 2),
  sine: (s) => -(Math.cos(Math.PI * s) - 1) / 2,
  outSine: (s) => Math.sin((s * Math.PI) / 2),
  inSine: (s) => 1 - Math.cos((s * Math.PI) / 2),
  // anticipation then overshoot settle, used for weighted gestures
  outBack: (s, k = 1.4) => 1 + (k + 1) * Math.pow(s - 1, 3) + k * Math.pow(s - 1, 2),
  inBack: (s, k = 1.4) => (k + 1) * s * s * s - k * s * s,
};

/** eased segment */
export const es = (t, a, b, e = ease.io3) => e(seg(t, a, b));

/** damped residual oscillation after time a (for taut lines, weight settles) */
export function ring(t, a, freq = 1.2, decay = 2.5) {
  if (t < a) return 0;
  const x = t - a;
  return Math.exp(-decay * x) * Math.sin(TAU * freq * x);
}

// ---------- seeded randomness ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const hash1 = (x, seed = 0) => hash2(x, 17, seed);

export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i, seed), hash1(i + 1, seed), u) * 2 - 1;
}

export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}

export function fbm2(x, y, seed = 0, oct = 4) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * noise2(x * f, y * f, seed + i * 101);
    n += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return s / n;
}

// ---------- vectors ----------
export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  mul: (a, s) => [a[0] * s, a[1] * s],
  len: (a) => Math.hypot(a[0], a[1]),
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1]) || 1;
    return [a[0] / l, a[1] / l];
  },
  perp: (a) => [-a[1], a[0]],
  rot: (a, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
  },
  lerp: (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1],
  angle: (a) => Math.atan2(a[1], a[0]),
  polar: (r, ang) => [Math.cos(ang) * r, Math.sin(ang) * r],
};

// ---------- polylines ----------
export function polyLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += V.dist(pts[i - 1], pts[i]);
  return L;
}

export function cumLengths(pts) {
  const c = [0];
  for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + V.dist(pts[i - 1], pts[i]));
  return c;
}

/** point at normalized arc length u in [0,1] */
export function pointAt(pts, u, cum = null) {
  cum = cum || cumLengths(pts);
  const L = cum[cum.length - 1];
  const target = clamp(u) * L;
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m] < target) lo = m;
    else hi = m;
  }
  const segL = cum[hi] - cum[lo] || 1;
  return V.lerp(pts[lo], pts[hi], (target - cum[lo]) / segL);
}

export function tangentAt(pts, u, cum = null) {
  const e = 0.004;
  const a = pointAt(pts, Math.max(0, u - e), cum), b = pointAt(pts, Math.min(1, u + e), cum);
  return V.norm(V.sub(b, a));
}

/** resample by arc length to n points (open polyline) */
export function resample(pts, n) {
  const cum = cumLengths(pts);
  const out = [];
  for (let i = 0; i < n; i++) out.push(pointAt(pts, i / (n - 1), cum));
  return out;
}

/** resample with a fixed landmark: point `li` of the source is forced to land on output index `lo` */
export function resampleAligned(pts, n, landmarks) {
  // landmarks: array of [srcU, dstU] pairs, strictly increasing; ends implied
  const cum = cumLengths(pts);
  const L = cum[cum.length - 1];
  const lm = [[0, 0], ...landmarks, [1, 1]];
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = i / (n - 1);
    let k = 0;
    while (k < lm.length - 2 && d > lm[k + 1][1]) k++;
    const s = invLerp(lm[k][1], lm[k + 1][1], d);
    const src = lerp(lm[k][0], lm[k + 1][0], s);
    out.push(pointAt(pts, src, cum));
  }
  return out;
}

/** arc-length u of the vertex index i */
export function uOfIndex(pts, i) {
  const cum = cumLengths(pts);
  return cum[i] / cum[cum.length - 1];
}

export const morph = (a, b, s) => a.map((p, i) => V.lerp(p, b[i], s));

/** Catmull-Rom smoothing into a dense polyline */
export function catmull(pts, per = 8, closed = false) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const out = [];
  const get = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

/** sub-polyline between arc-length params u0..u1 */
export function subPoly(pts, u0, u1, n = null) {
  u0 = clamp(u0);
  u1 = clamp(u1);
  if (u1 <= u0) return [];
  const cum = cumLengths(pts);
  const L = cum[cum.length - 1];
  const out = [pointAt(pts, u0, cum)];
  for (let i = 1; i < pts.length - 1; i++) {
    const u = cum[i] / L;
    if (u > u0 && u < u1) out.push(pts[i]);
  }
  out.push(pointAt(pts, u1, cum));
  return n ? resample(out, n) : out;
}

export function transformPts(pts, m) {
  // m = [a,b,c,d,e,f] like canvas: x' = a x + c y + e ; y' = b x + d y + f
  return pts.map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
}

export function affine(tx = 0, ty = 0, rot = 0, sx = 1, sy = sx) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [c * sx, s * sx, -s * sy, c * sy, tx, ty];
}

export function matMul(m, n) {
  // m * n (apply n first then m)
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function applyM(m, p) {
  return [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
}

export function invM(m) {
  const det = m[0] * m[3] - m[1] * m[2];
  const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

/** reflect point across line through a with direction dir */
export function reflect(p, a, dir) {
  const d = V.norm(dir);
  const v = V.sub(p, a);
  const along = V.dot(v, d);
  const proj = V.add(a, V.mul(d, along));
  return V.sub(V.mul(proj, 2), p);
}

/** signed side of p relative to line (a, dir): >0 left */
export const side = (p, a, dir) => dir[0] * (p[1] - a[1]) - dir[1] * (p[0] - a[0]);

/** clip polygon by half-plane side(p) >= 0 (Sutherland-Hodgman) */
export function clipHalf(poly, a, dir, keepPositive = true) {
  const out = [];
  const f = (p) => (keepPositive ? side(p, a, dir) : -side(p, a, dir));
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const fp = f(p), fq = f(q);
    if (fp >= 0) out.push(p);
    if ((fp >= 0) !== (fq >= 0)) {
      const s = fp / (fp - fq);
      out.push(V.lerp(p, q, s));
    }
  }
  return out;
}

export function centroid(poly) {
  let x = 0, y = 0;
  for (const p of poly) {
    x += p[0];
    y += p[1];
  }
  return [x / poly.length, y / poly.length];
}

/** displace polyline points along normals with smooth noise (hand-drawn wobble) */
export function wobble(pts, amp, freq, seed, closed = false) {
  const n = pts.length;
  const cum = cumLengths(pts);
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const nrm = V.perp(V.norm(V.sub(b, a)));
    const d = noise1(cum[i] * freq, seed) * amp;
    return [p[0] + nrm[0] * d, p[1] + nrm[1] * d];
  });
}

export function ellipsePts(cx, cy, rx, ry, n = 48, rot = 0, a0 = 0, a1 = TAU) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / (a1 === TAU ? n : n - 1);
    const p = [Math.cos(a) * rx, Math.sin(a) * ry];
    const r = V.rot(p, rot);
    out.push([cx + r[0], cy + r[1]]);
  }
  return out;
}

/** frame-quantized time for held drawings: on twos/threes against the absolute 24 fps grid */
export function onN(t, n, fps = 24) {
  const f = Math.floor(t * fps + 1e-6);
  return (Math.floor(f / n) * n) / fps;
}
