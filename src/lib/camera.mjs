// Keyframed 2D camera. Position interpolates with a C1 Hermite spline; zoom
// interpolates in log space so push-ins feel uniform. Keys with hold:true get
// zero velocity (the camera settles before moving again).
import { clamp } from './math.mjs';

function hermite(p0, p1, m0, m1, s) {
  const s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * m1;
}

export class CamPath {
  constructor(keys) {
    this.k = keys.map((k) => ({ ...k, lz: Math.log(k.z) }));
    const n = this.k.length;
    for (const f of ['x', 'y', 'lz', 'r']) {
      for (let i = 0; i < n; i++) {
        const K = this.k[i];
        if (K[f] === undefined) K[f] = i > 0 ? this.k[i - 1][f] : 0;
      }
      for (let i = 0; i < n; i++) {
        const K = this.k[i];
        if (K.hold || i === 0 || i === n - 1) {
          K['m' + f] = 0;
          continue;
        }
        const a = this.k[i - 1], b = this.k[i + 1];
        K['m' + f] = (b[f] - a[f]) / (b.t - a.t); // per second
      }
    }
  }
  at(t) {
    const k = this.k;
    if (t <= k[0].t) return { x: k[0].x, y: k[0].y, z: Math.exp(k[0].lz), r: k[0].r };
    if (t >= k[k.length - 1].t) {
      const L = k[k.length - 1];
      return { x: L.x, y: L.y, z: Math.exp(L.lz), r: L.r };
    }
    let i = 0;
    while (i < k.length - 2 && t > k[i + 1].t) i++;
    const A = k[i], B = k[i + 1];
    const d = B.t - A.t;
    let s = clamp((t - A.t) / d);
    if (B.ease) s = B.ease(s);
    const v = (f) => hermite(A[f], B[f], A['m' + f] * d, B['m' + f] * d, s);
    return { x: v('x'), y: v('y'), z: Math.exp(v('lz')), r: v('r') };
  }
}

/** world→screen affine for a camera state (screen centre at W/2,H/2) */
export function camMatrix(c, W = 1920, H = 1080) {
  const cs = Math.cos(c.r || 0) * c.z, sn = Math.sin(c.r || 0) * c.z;
  return [cs, sn, -sn, cs, W / 2 - (cs * c.x - sn * c.y), H / 2 - (sn * c.x + cs * c.y)];
}

export function applyCam(ctx, m, scale) {
  ctx.setTransform(m[0] * scale, m[1] * scale, m[2] * scale, m[3] * scale, m[4] * scale, m[5] * scale);
}

export const toScreenPt = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
export function toWorldPt(m, p) {
  const det = m[0] * m[3] - m[1] * m[2];
  const x = p[0] - m[4], y = p[1] - m[5];
  return [(m[3] * x - m[2] * y) / det, (-m[1] * x + m[0] * y) / det];
}
