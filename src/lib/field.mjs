// Paper-sheet field in 3D: sheets lie on the ground (y = 0), hinge about an edge,
// and are seen by a pinhole camera that can crane from straight overhead down to
// a low eye. Sheet content is vector (polylines in sheet-local coordinates) and
// is projected point by point, so drawings stay exact at any angle.
import { V, clamp, lerp } from './math.mjs';
import { PAL, rgba, mixc } from './palette.mjs';

/** camera from a look-at point on the ground, distance D, pitch (rad, π/2 = straight down), focal f */
export function camera(look, D, pitch, f, W = 1920, H = 1080) {
  const pos = [look[0], look[1] + D * Math.sin(pitch), look[2] - D * Math.cos(pitch)];
  const F = [0, -Math.sin(pitch), Math.cos(pitch)];
  const U = [0, Math.cos(pitch), Math.sin(pitch)];
  const R = [1, 0, 0];
  return { pos, F, U, R, f, W, H };
}

export function project(cam, p) {
  const rel = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]];
  const zc = rel[0] * cam.F[0] + rel[1] * cam.F[1] + rel[2] * cam.F[2];
  if (zc < 5) return null;
  const xc = rel[0] * cam.R[0] + rel[1] * cam.R[1] + rel[2] * cam.R[2];
  const yc = rel[0] * cam.U[0] + rel[1] * cam.U[1] + rel[2] * cam.U[2];
  return [cam.W / 2 + (cam.f * xc) / zc, cam.H / 2 - (cam.f * yc) / zc, zc];
}

/**
 * A sheet: origin o (world, on the ground), axes along x (width w) and z (depth d),
 * hinge: 'near' (edge z = o.z), 'far', 'left', 'right' or a custom fold, angle theta (rad, lifting up).
 * localToWorld(u, v): u ∈ [0,w] to the right, v ∈ [0,d] away from the camera.
 */
export function sheetFrame(sh) {
  const { o, w, d, theta = 0, hinge = 'near', rotY = 0 } = sh;
  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  const rot = (x, z) => [x * cy - z * sy, x * sy + z * cy];
  return (u, v) => {
    let x = u, y = 0, z = v;
    const c = Math.cos(theta), s = Math.sin(theta);
    if (hinge === 'near') {
      y = v * s;
      z = v * c;
    } else if (hinge === 'far') {
      y = (d - v) * s;
      z = d - (d - v) * c;
    } else if (hinge === 'right') {
      y = (w - u) * s;
      x = w - (w - u) * c;
    } else if (hinge === 'left') {
      y = u * s;
      x = u * c;
    }
    const r = rot(x, z);
    return [o[0] + r[0], y, o[2] + r[1]];
  };
}

/** signed screen area of a projected quad (to tell which face is showing) */
export function facing(q) {
  let a = 0;
  for (let i = 0; i < q.length; i++) {
    const p = q[i], n = q[(i + 1) % q.length];
    a += p[0] * n[1] - n[0] * p[1];
  }
  return a;
}

/** camera-space depth of a world point */
export function depth(cam, p) {
  return (p[0] - cam.pos[0]) * cam.F[0] + (p[1] - cam.pos[1]) * cam.F[1] + (p[2] - cam.pos[2]) * cam.F[2];
}

/** project a closed 3D polygon with near-plane clipping (no vertex ever lands behind the eye) */
export function projectPoly(cam, pts, near = 12) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const da = depth(cam, a), db = depth(cam, b);
    if (da >= near) out.push(project(cam, a));
    if (da >= near !== db >= near) {
      const s = (near - da) / (db - da);
      out.push(project(cam, [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s]));
    }
  }
  return out.filter(Boolean).map((p) => [p[0], p[1], p[2]]);
}

/** project an open 3D polyline, splitting it where it crosses the near plane */
export function projectLine(cam, pts, near = 12) {
  const runs = [];
  let cur = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const da = depth(cam, a);
    if (da >= near) cur.push(project(cam, a));
    if (i < pts.length - 1) {
      const b = pts[i + 1];
      const db = depth(cam, b);
      if (da >= near !== db >= near) {
        const s = (near - da) / (db - da);
        const c = project(cam, [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s]);
        if (da >= near) {
          cur.push(c);
          runs.push(cur);
          cur = [];
        } else cur.push(c);
      }
    }
  }
  if (cur.length) runs.push(cur);
  return runs.filter((r) => r.length > 1).map((r) => r.map((p) => [p[0], p[1]]));
}
