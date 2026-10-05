// Drawing primitives: ink/charcoal strokes, gouache fills, paper, print layers.
import { createCanvas, DOMMatrix, loadImage } from '@napi-rs/canvas';
import { V, clamp, noise1, cumLengths, catmull, mulberry32, TAU } from './math.mjs';
import { PAL, rgba } from './palette.mjs';

// Filling a pattern built from a Canvas retains a full copy of that texture on every fill
// (16 MB for the 2048 paper) and does not return it. A decoded Image does not.
// Image decoding is async. The first draw of a frame that meets a new source throws NeedPattern;
// film.render then draws the frame once more while collecting every new source, decodes them
// together, and draws the frame for real.
const patternImages = new WeakMap();
let fallbackImage = null;
let probe = null;

const colorKey = (c) => `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;

export class NeedPattern extends Error {
  constructor(source) {
    super('pattern source is not decoded yet');
    this.code = 'NEED_PATTERN';
    this.source = source;
  }
}

export async function warmupPatternFallback() {
  if (fallbackImage) return fallbackImage;
  const c = createCanvas(1, 1);
  const g = c.getContext('2d');
  g.fillStyle = '#888';
  g.fillRect(0, 0, 1, 1);
  fallbackImage = await loadImage(c.toBuffer('image/png'));
  return fallbackImage;
}

export async function ensurePatternImage(src) {
  if (!src || typeof src.toBuffer !== 'function') return src;
  const hit = patternImages.get(src);
  if (hit) return hit;
  const img = await loadImage(src.toBuffer('image/png'));
  patternImages.set(src, img);
  return img;
}

export function patternProbeActive() {
  return probe !== null;
}

export function startPatternProbe() {
  probe = new Set();
}

export function finishPatternProbe() {
  const missing = [];
  if (probe) for (const src of probe) if (!patternImages.has(src)) missing.push(src);
  probe = null;
  return missing;
}

/**
 * Run draw() until every pattern source it meets has a decoded image. draw must start from a
 * clean state on every call (it may be interrupted by NeedPattern part way through).
 */
export async function drawWithPatterns(draw, maxRounds = 6) {
  for (let round = 0; round < maxRounds; round++) {
    try {
      return draw();
    } catch (err) {
      if (!err || err.code !== 'NEED_PATTERN') throw err;
      startPatternProbe();
      let probeErr = null;
      try {
        draw();
      } catch (e) {
        probeErr = e;
      }
      const missing = finishPatternProbe();
      if (probeErr && probeErr.code !== 'NEED_PATTERN') throw probeErr;
      if (!missing.length) throw err;
      await Promise.all(missing.map((src) => ensurePatternImage(src)));
    }
  }
  throw new Error('still meeting undecoded pattern sources');
}

function decodedPatternImage(src) {
  if (!src || typeof src.toBuffer !== 'function') return src;
  const hit = patternImages.get(src);
  if (hit) return hit;
  if (probe) {
    if (!fallbackImage) throw new Error('pattern fallback was not prepared');
    probe.add(src);
    return fallbackImage;
  }
  throw new NeedPattern(src);
}

export class Painter {
  constructor(ctx, tex, opts = {}) {
    this.ctx = ctx;
    this.tex = tex;
    this.W = opts.W || 1920;
    this.H = opts.H || 1080;
    this.animatic = !!opts.animatic; // plain-line mode for the line animatic
    this.frame = opts.frame || 0;
    this.patCache = new Map();
    this.scratch = new Map();
    this.zoom = 1; // screen px per current drawing unit (set by scenes with cameras)
    this.lineComp = 0; // 0 = lines scale with the camera; 0.5 = partially redrawn at each scale
  }

  /** what the caches hold (for the memory probe) */
  stats() {
    const px = (c) => c.width * c.height * 4;
    let patBytes = 0;
    for (const p of this.patCache.values()) patBytes += px(p.canvas);
    let layerBytes = 0;
    for (const c of this.scratch.values()) layerBytes += px(c);
    return { patterns: this.patCache.size, patternBytes: patBytes, canvasPatterns: this._pats ? this._pats.size : 0, layers: this.scratch.size, layerBytes };
  }

  /** reusable offscreen canvas in design units scaled like the main one */
  layer(name) {
    let c = this.scratch.get(name);
    const cw = this.ctx.canvas.width, ch = this.ctx.canvas.height;
    if (!c || c.width !== cw || c.height !== ch) {
      c = createCanvas(cw, ch);
      this.scratch.set(name, c);
    }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.filter = 'none';
    g.clearRect(0, 0, cw, ch);
    g.setTransform(this.ctx.getTransform());
    return g;
  }

  /**
   * Keep only what lies inside polys on layer g. The binding's 'destination-in'
   * misbehaves under large translations, so the path is pre-transformed into
   * pixel space and the operation runs under the identity transform.
   */
  maskIn(g, polys, rule = 'nonzero') {
    const T = g.getTransform();
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.beginPath();
    for (const poly of polys) {
      if (!poly || poly.length < 3) continue;
      const tp = ([x, y]) => [T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f];
      const p0 = tp(poly[0]);
      g.moveTo(p0[0], p0[1]);
      for (let i = 1; i < poly.length; i++) {
        const q = tp(poly[i]);
        g.lineTo(q[0], q[1]);
      }
      g.closePath();
    }
    g.fillStyle = '#000';
    g.fill(rule);
    g.restore();
  }

  /** composite a full layer (drawn in the same transform) onto ctx */
  put(g, { alpha = 1, op = 'source-over', dx = 0, dy = 0 } = {}) {
    const ctx = this.ctx;
    const base = ctx.globalAlpha;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha * base;
    ctx.globalCompositeOperation = op;
    const s = ctx.canvas.width / this.W;
    ctx.drawImage(g.canvas, dx * s, dy * s);
    ctx.restore();
  }

  inkPattern(color, alpha = 1, coarse = false) {
    // rgba() truncates channels to integers, so colours that differ only in the fraction are the
    // same pattern; keying on the truncated values keeps one entry for them
    const key = colorKey(color) + '|' + alpha + '|' + coarse;
    let p = this.patCache.get(key);
    if (!p) {
      const src = coarse ? this.tex.grainCoarse : this.tex.grain;
      const c = createCanvas(src.width, src.height);
      const g = c.getContext('2d');
      g.fillStyle = rgba(color, alpha);
      g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(src, 0, 0);
      p = { canvas: c };
      this.patCache.set(key, p);
    }
    return p;
  }

  /** a colour pre-multiplied by the gouache texture (safe to use on transparent layers) */
  paintPattern(color) {
    const key = 'paint|' + colorKey(color);
    let p = this.patCache.get(key);
    if (!p) {
      const src = this.tex.paint;
      const c = createCanvas(src.width, src.height);
      const g = c.getContext('2d');
      g.fillStyle = rgba(color, 1);
      g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = 0.5;
      g.drawImage(src, 0, 0);
      p = { canvas: c };
      this.patCache.set(key, p);
    }
    return p.canvas;
  }

  /** pattern attached to a transform m (world-attached texture); scale is texture pixels per unit */
  pattern(canvas, m = [1, 0, 0, 1, 0, 0], scale = 1) {
    // one pattern per source; only the transform changes between draws
    if (!this._pats) this._pats = new Map();
    let pat = this._pats.get(canvas);
    if (!pat) {
      const src = decodedPatternImage(canvas);
      if (src === fallbackImage) {
        pat = this._fallbackPat || (this._fallbackPat = this.ctx.createPattern(src, 'repeat'));
        if (!pat) throw new Error('createPattern failed');
        pat.setTransform(new DOMMatrix([m[0] * scale, m[1] * scale, m[2] * scale, m[3] * scale, m[4], m[5]]));
        return pat;
      }
      pat = this.ctx.createPattern(src, 'repeat');
      if (!pat) throw new Error('createPattern failed');
      this._pats.set(canvas, pat);
    }
    pat.setTransform(new DOMMatrix([m[0] * scale, m[1] * scale, m[2] * scale, m[3] * scale, m[4], m[5]]));
    return pat;
  }

  // ---------------- paths ----------------
  path(pts, closed = false, ctx = this.ctx) {
    ctx.beginPath();
    if (!pts.length) return;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
  }

  /** variable-width ribbon polygon around a polyline */
  ribbon(pts, width, opts = {}) {
    const n = pts.length;
    if (n < 2) return null;
    const { taper = [0.12, 0.12], rough = 0.6, seed = 1, press = 0.18, wfn = null, cap = true } = opts;
    const cum = cumLengths(pts);
    const L = cum[n - 1] || 1;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const u = cum[i] / L;
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const nr = V.perp(V.norm(V.sub(b, a)));
      let w = width;
      if (wfn) w *= wfn(u);
      const t0 = taper[0] > 0 ? clamp(u / taper[0]) : 1;
      const t1 = taper[1] > 0 ? clamp((1 - u) / taper[1]) : 1;
      w *= Math.sqrt(t0) * Math.sqrt(t1);
      w *= 1 + press * noise1(cum[i] * 0.02, seed);
      const eL = rough * noise1(cum[i] * 0.35, seed + 7);
      const eR = rough * noise1(cum[i] * 0.35, seed + 13);
      const h = Math.max(0.15, w / 2);
      left.push([pts[i][0] + nr[0] * (h + eL), pts[i][1] + nr[1] * (h + eL)]);
      right.push([pts[i][0] - nr[0] * (h + eR), pts[i][1] - nr[1] * (h + eR)]);
    }
    return left.concat(right.reverse());
  }

  /** ink / charcoal line. pts should be reasonably dense */
  ink(pts, opts = {}) {
    const ctx = opts.ctx || this.ctx;
    if (!pts || pts.length < 2) return;
    const { w = 3, color = PAL.indigo, alpha = 1, seed = 1, boil = true, texM = null, coarse = false } = opts;
    const z = this.zoom || 1;
    const bseed = boil ? seed + 1009 * Math.floor(this.frame / 2) : seed;
    let P = pts;
    if (boil && opts.boilAmp !== 0) {
      const amp = (opts.boilAmp ?? Math.min(1.1, 0.35 + w * z * 0.12)) / z;
      const cum = cumLengths(P);
      P = P.map((p, i) => [p[0] + amp * noise1(cum[i] * 0.03, bseed), p[1] + amp * noise1(cum[i] * 0.03, bseed + 3)]);
    }
    const wz = opts.fixedW ? w : w * Math.pow(z, -this.lineComp);
    const poly = this.ribbon(P, wz, { ...opts, rough: (opts.rough ?? 0.6) / z, seed: bseed });
    if (!poly) return;
    this.path(poly, true, ctx);
    if (this.animatic || opts.flat) {
      ctx.fillStyle = rgba(color, alpha);
      ctx.fill();
      return;
    }
    const pat = this.inkPattern(color, 1, coarse);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = this.pattern(pat.canvas, texM || [1, 0, 0, 1, 0, 0], opts.texScale || 0.5 / z);
    ctx.fill();
    ctx.restore();
  }

  /** gouache / riso fill of a closed polygon */
  paint(poly, opts = {}) {
    const ctx = opts.ctx || this.ctx;
    if (!poly || poly.length < 3) return;
    const { color = PAL.vermilion, alpha = 1, texM = null, edge = 0.0, grainAmt = 0.55, op = null } = opts;
    ctx.save();
    if (op) ctx.globalCompositeOperation = op;
    this.path(poly, true, ctx);
    ctx.fillStyle = rgba(color, alpha);
    ctx.fill();
    if (!this.animatic && grainAmt > 0) {
      ctx.clip();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = grainAmt * alpha;
      ctx.fillStyle = this.pattern(this.tex.paint, texM || [1, 0, 0, 1, 0, 0], opts.texScale || 0.7);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of poly) {
        if (p[0] < x0) x0 = p[0];
        if (p[1] < y0) y0 = p[1];
        if (p[0] > x1) x1 = p[0];
        if (p[1] > y1) y1 = p[1];
      }
      ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    }
    ctx.restore();
    if (edge > 0 && !this.animatic) {
      ctx.save();
      if (op) ctx.globalCompositeOperation = op;
      this.path(poly, true, ctx);
      ctx.strokeStyle = rgba(opts.edgeColor || [color[0] * 0.78, color[1] * 0.72, color[2] * 0.72], edge * alpha);
      ctx.lineWidth = opts.edgeW || 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }
  }

  /** paper ground over the whole frame, texture attached to the world through m (world→design) */
  paper(m = [1, 0, 0, 1, 0, 0], opts = {}) {
    const ctx = opts.ctx || this.ctx;
    const s = ctx.canvas.width / this.W;
    ctx.save();
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.animatic ? rgba(PAL.paper) : this.pattern(this.tex.paper, m, opts.scale || 0.62);
    ctx.fillRect(-10, -10, this.W + 20, this.H + 20);
    ctx.restore();
  }

  /** fill a polygon with world-attached paper texture (used for cut-out planes) */
  paperFill(poly, m = [1, 0, 0, 1, 0, 0], opts = {}) {
    const ctx = opts.ctx || this.ctx;
    this.path(poly, true, ctx);
    if (this.animatic) {
      ctx.fillStyle = rgba(opts.tint || PAL.paper, opts.alpha ?? 1);
      ctx.fill();
      return;
    }
    ctx.save();
    ctx.globalAlpha *= opts.alpha ?? 1;
    ctx.fillStyle = this.pattern(this.tex.paper, m, opts.scale || 0.62);
    ctx.fill();
    if (opts.tint) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = rgba(opts.tint, opts.tintAlpha ?? 0.25);
      ctx.fill();
    }
    ctx.restore();
  }

  /** soft paper shadow under a cut-out (multiply, blurred) */
  shadow(poly, { dx = 6, dy = 8, blur = 10, alpha = 0.22, color = [60, 45, 30], ctx = this.ctx } = {}) {
    if (this.animatic) return;
    ctx.save();
    const s = this.ctx.canvas.width / this.W;
    ctx.filter = `blur(${Math.max(0.5, blur * s)}px)`;
    ctx.globalCompositeOperation = 'multiply';
    this.path(poly.map((p) => [p[0] + dx, p[1] + dy]), true, ctx);
    ctx.fillStyle = rgba(color, alpha);
    ctx.fill();
    ctx.filter = 'none';
    ctx.restore();
  }

  /** charcoal hatching inside a polygon: parallel strokes at angle ang, spacing sp */
  hatch(poly, { ang = 0.6, sp = 9, w = 1.2, color = PAL.indigo, alpha = 0.5, seed = 1, ctx = this.ctx, jitter = 0.35 } = {}) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of poly) {
      x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + sp;
    const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
    ctx.save();
    this.path(poly, true, ctx);
    ctx.clip();
    const r = mulberry32(seed);
    for (let k = -R; k <= R; k += sp) {
      const off = k + (r() - 0.5) * sp * jitter;
      const a = [cx + n[0] * off - d[0] * R, cy + n[1] * off - d[1] * R];
      const b = [cx + n[0] * off + d[0] * R, cy + n[1] * off + d[1] * R];
      this.ink([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], { ctx, w: w * (0.7 + 0.6 * r()), color, alpha: alpha * (0.6 + 0.4 * r()), seed: seed + Math.floor(k), taper: [0.15, 0.15], boilAmp: 0.3 });
    }
    ctx.restore();
  }

  /** screen-space print grain + vignette, very subtle; changes on twos */
  finish(opts = {}) {
    if (this.animatic) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(this.ctx.getTransform());
    const f = Math.floor(this.frame / 2);
    const r = mulberry32(9000 + f);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = opts.grain ?? 0.10;
    ctx.fillStyle = this.pattern(this.tex.paint, [1, 0, 0, 1, r() * 900, r() * 900], 1.0);
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.35, this.W / 2, this.H / 2, this.H * 1.05);
    g.addColorStop(0, 'rgba(90,70,50,0)');
    g.addColorStop(1, `rgba(90,70,50,${opts.vignette ?? 0.16})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.restore();
  }
}

/** smooth dense curve through control points */
export const curve = (pts, per = 10, closed = false) => catmull(pts, per, closed);

/** circle polygon */
export function circle(cx, cy, r, n = 40) {
  const out = [];
  for (let i = 0; i < n; i++) out.push([cx + Math.cos((i / n) * TAU) * r, cy + Math.sin((i / n) * TAU) * r]);
  return out;
}

/** capsule polygon between a and b with radii ra, rb */
export function capsule(a, b, ra, rb, n = 10) {
  const d = V.sub(b, a);
  const L = V.len(d) || 1e-6;
  const ang = Math.atan2(d[1], d[0]);
  // tangent angle offset for different radii
  const phi = Math.asin(clamp((ra - rb) / L, -0.99, 0.99));
  const out = [];
  const a0 = ang + Math.PI / 2 + phi, a1 = ang + (3 * Math.PI) / 2 - phi;
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n;
    out.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra]);
  }
  const b0 = ang - Math.PI / 2 - phi, b1 = ang + Math.PI / 2 + phi;
  for (let i = 0; i <= n; i++) {
    const t = b0 + ((b1 - b0) * i) / n;
    out.push([b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb]);
  }
  return out;
}
