// Union silhouettes → clean contour polylines (marching squares on a raster mask).
// Lets any set of overlapping pieces be drawn as one cut-paper plane with a
// single hand-inked outline, and lets that outline be cut (the shoulder gap).
import { createCanvas } from '@napi-rs/canvas';
import { V, cumLengths, resample } from './math.mjs';

// One mask canvas. Keying a canvas on every width×height kept a new surface for each
// silhouette size, and a moving figure produced a new size almost every frame.
const MASK_MAX = 1400;
let mask = null;
export function maskStats() {
  return { n: mask ? 1 : 0, bytes: mask ? mask.width * mask.height * 4 : 0 };
}
function maskCanvas() {
  if (!mask) mask = createCanvas(MASK_MAX, MASK_MAX);
  return mask;
}

/**
 * polys: array of polygons (screen coords). cell: pixels per mask cell.
 * returns array of closed loops [{pts, area}] in screen coords, outer loops CCW-agnostic
 */
export function traceUnion(polys, cell = 2, opts = {}) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const poly of polys) for (const p of poly) {
    if (p[0] < x0) x0 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[0] > x1) x1 = p[0];
    if (p[1] > y1) y1 = p[1];
  }
  if (!isFinite(x0)) return [];
  const pad = 3 * cell;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  // quantize mask origin to the cell grid so contours don't shimmer when the figure translates
  x0 = Math.floor(x0 / cell) * cell;
  y0 = Math.floor(y0 / cell) * cell;
  const W = Math.min(1400, Math.ceil((x1 - x0) / cell) + 1);
  const H = Math.min(1400, Math.ceil((y1 - y0) / cell) + 1);
  const c = maskCanvas();
  const g = c.getContext('2d');
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  // the shared canvas is larger than this mask; clip so strokes cannot spill into the next read
  g.beginPath();
  g.rect(0, 0, W, H);
  g.clip();
  g.setTransform(1 / cell, 0, 0, 1 / cell, -x0 / cell, -y0 / cell);
  g.fillStyle = '#fff';
  for (const poly of polys) {
    if (poly.length < 3) continue;
    g.beginPath();
    g.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]);
    g.closePath();
    g.fill();
  }
  if (opts.subtract) {
    g.globalCompositeOperation = 'destination-out';
    for (const poly of opts.subtract) {
      g.beginPath();
      g.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]);
      g.closePath();
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
  const data = g.getImageData(0, 0, W, H).data;
  g.restore();
  const A = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) A[i] = data[i * 4 + 3] / 255;
  const loops = marching(A, W, H, 0.5);
  return loops
    .filter((l) => l.length > 6)
    .map((l) => {
      let pts = l.map(([x, y]) => [x0 + x * cell, y0 + y * cell]);
      pts = smoothLoop(pts, opts.smooth ?? 2);
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        area += a[0] * b[1] - b[0] * a[1];
      }
      return { pts, area: area / 2 };
    })
    .sort((a, b) => Math.abs(b.area) - Math.abs(a.area));
}

function smoothLoop(pts, iters) {
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const n = p.length;
    const q = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
      q[i] = [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4];
    }
    p = q;
  }
  return p;
}

function marching(A, W, H, iso) {
  // edge ids: horizontal edge (x,y)-(x+1,y): 2*(y*W+x); vertical edge (x,y)-(x,y+1): 2*(y*W+x)+1
  const pos = new Map();
  const nbr = new Map();
  const at = (x, y) => A[y * W + x];
  const edgePoint = (id) => {
    if (pos.has(id)) return pos.get(id);
    const k = id >> 1, x = k % W, y = (k / W) | 0;
    let p;
    if ((id & 1) === 0) {
      const a = at(x, y), b = at(x + 1, y);
      const s = (iso - a) / (b - a || 1e-6);
      p = [x + Math.min(1, Math.max(0, s)), y];
    } else {
      const a = at(x, y), b = at(x, y + 1);
      const s = (iso - a) / (b - a || 1e-6);
      p = [x, y + Math.min(1, Math.max(0, s))];
    }
    pos.set(id, p);
    return p;
  };
  const link = (e1, e2) => {
    if (!nbr.has(e1)) nbr.set(e1, []);
    if (!nbr.has(e2)) nbr.set(e2, []);
    nbr.get(e1).push(e2);
    nbr.get(e2).push(e1);
  };
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const a = at(x, y) > iso ? 1 : 0, b = at(x + 1, y) > iso ? 2 : 0;
      const c = at(x + 1, y + 1) > iso ? 4 : 0, d = at(x, y + 1) > iso ? 8 : 0;
      const code = a | b | c | d;
      if (code === 0 || code === 15) continue;
      const top = 2 * (y * W + x), bottom = 2 * ((y + 1) * W + x);
      const left = 2 * (y * W + x) + 1, right = 2 * (y * W + x + 1) + 1;
      switch (code) {
        case 1: case 14: link(left, top); break;
        case 2: case 13: link(top, right); break;
        case 3: case 12: link(left, right); break;
        case 4: case 11: link(right, bottom); break;
        case 6: case 9: link(top, bottom); break;
        case 7: case 8: link(left, bottom); break;
        case 5: link(left, top); link(right, bottom); break;
        case 10: link(top, right); link(left, bottom); break;
      }
    }
  }
  const seen = new Set();
  const loops = [];
  for (const start of nbr.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = -1, cur = start;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      loop.push(edgePoint(cur));
      const ns = nbr.get(cur);
      const next = ns[0] !== prev && !seen.has(ns[0]) ? ns[0] : ns[1] !== prev && !seen.has(ns[1]) ? ns[1] : undefined;
      prev = cur;
      cur = next;
    }
    if (loop.length > 2) loops.push(loop);
  }
  return loops;
}

/** rotate a closed loop so it starts nearest to anchor, and orient it clockwise (screen) */
export function anchorLoop(pts, anchor) {
  let best = 0, bd = 1e18;
  for (let i = 0; i < pts.length; i++) {
    const d = (pts[i][0] - anchor[0]) ** 2 + (pts[i][1] - anchor[1]) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  let out = pts.slice(best).concat(pts.slice(0, best));
  let area = 0;
  for (let i = 0; i < out.length; i++) {
    const a = out[i], b = out[(i + 1) % out.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  if (area < 0) out = [out[0], ...out.slice(1).reverse()];
  return out;
}

/** cut a closed loop open at the point nearest `p`, removing arc length `gap` centred there. Returns open polyline. */
export function cutLoop(pts, p, gap) {
  const a = anchorLoop(pts, p);
  const closed = a.concat([a[0]]);
  const cum = cumLengths(closed);
  const L = cum[cum.length - 1];
  const half = gap / 2;
  const out = [];
  for (let i = 0; i < closed.length; i++) if (cum[i] >= half && cum[i] <= L - half) out.push(closed[i]);
  return out;
}
