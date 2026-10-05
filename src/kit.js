// Small tools shared by the picture: easing, closed-form springs, seeded noise, and type.
// Nothing here keeps state between frames.
(function () {
  const FM = (globalThis.FM = globalThis.FM || {});

  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const unlerp = (a, b, x) => clamp((x - a) / (b - a));
  const TAU = Math.PI * 2;

  const ease = {
    inQuad: (x) => x * x,
    outQuad: (x) => 1 - (1 - x) * (1 - x),
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    smooth: (x) => x * x * (3 - 2 * x),
  };

  // Unit step response of a damped spring with mass 1, stiffness k and damping d.
  // Starts at 0 with zero velocity and settles at 1.
  function spring(t, k, d) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(k);
    const z = d / (2 * w0);
    if (z < 0.9999) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
    }
    if (z <= 1.0001) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    const r = Math.sqrt(z * z - 1);
    const r1 = -w0 * (z - r);
    const r2 = -w0 * (z + r);
    return 1 + (r2 / (r1 - r2)) * Math.exp(r1 * t) - (r1 / (r1 - r2)) * Math.exp(r2 * t);
  }

  // Presets from the sketchbook's playbook, plus a critically damped one for type.
  const SPR = {
    ui: [260, 24],
    card: [170, 26],
    type: [190, 2 * Math.sqrt(190)],
    snap: [420, 2 * Math.sqrt(420)],
    long: [40, 2 * Math.sqrt(40)],
    slow: [22, 2 * Math.sqrt(22)],
  };
  const sp = (t, preset = SPR.card) => spring(t, preset[0], preset[1]);

  // A value that springs to a new target at each step. Every change adds a spring;
  // earlier springs keep running, so velocity stays continuous.
  // steps: [[t0, v0], [t1, v1, preset?], ...]
  function springTo(t, steps, preset = SPR.card) {
    let v = steps[0][1];
    for (let i = 1; i < steps.length; i++) {
      const [ti, vi, p] = steps[i];
      if (t <= ti) break;
      v += (vi - steps[i - 1][1]) * sp(t - ti, p || preset);
    }
    return v;
  }

  // In and out: springs in at tIn, eases out over `outDur` from tOut. Returns [0..1].
  function inOut(t, tIn, tOut = Infinity, preset = SPR.type, outDur = 0.32) {
    if (t < tIn) return 0;
    const a = sp(t - tIn, preset);
    if (t < tOut) return a;
    return a * (1 - ease.inCubic(clamp((t - tOut) / outDur)));
  }
  // Same, but reports how far it has gone out (0..1) separately, for exits that move.
  function phase(t, tIn, tOut = Infinity, preset = SPR.type, outDur = 0.32) {
    return {
      in: t < tIn ? 0 : sp(t - tIn, preset),
      out: t < tOut ? 0 : ease.inCubic(clamp((t - tOut) / outDur)),
    };
  }

  // Seeded randomness. Never Math.random.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(i, j = 0, k = 0) {
    let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(k | 0, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // 1D value noise, smooth, in [-1, 1].
  function noise1(x, seed = 0) {
    const i = Math.floor(x);
    const f = x - i;
    const a = hash(i, seed) * 2 - 1;
    const b = hash(i + 1, seed) * 2 - 1;
    return lerp(a, b, f * f * (3 - 2 * f));
  }

  // ---------------------------------------------------------------- type

  const FACE = {
    serif: '"Instrument Serif", serif',
    mono: '"Geist Mono", monospace',
  };
  function font(ctx, kind, size, opts = {}) {
    const style = opts.italic ? "italic " : "";
    const weight = opts.weight || (kind === "mono" ? 500 : 400);
    ctx.font = `${style}${weight} ${size}px ${FACE[kind]}`;
  }

  // A line of styled runs. Each run is {s, kind, size, italic, weight, color} or {arrow: true}.
  // Returns the total width. Draws when `draw` is true.
  function runs(ctx, parts, x, y, base, draw = true, align = "left") {
    const widths = parts.map((p) => {
      const size = p.size || base.size;
      if (p.arrow) return size * 0.9;
      if (p.gap) return size * p.gap;
      font(ctx, p.kind || base.kind, size, { italic: p.italic, weight: p.weight || base.weight });
      if (p.track) ctx.letterSpacing = `${p.track}px`;
      const w = ctx.measureText(p.s).width;
      ctx.letterSpacing = "0px";
      return w;
    });
    const total = widths.reduce((a, b) => a + b, 0);
    if (!draw) return total;
    let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    parts.forEach((p, i) => {
      const size = p.size || base.size;
      const color = p.color || base.color;
      if (p.arrow) {
        arrowGlyph(ctx, cx + size * 0.17, y - size * 0.27, size * 0.56, size * 0.05, color);
      } else if (!p.gap) {
        font(ctx, p.kind || base.kind, size, { italic: p.italic, weight: p.weight || base.weight });
        if (p.track) ctx.letterSpacing = `${p.track}px`;
        ctx.fillStyle = color;
        ctx.fillText(p.s, cx, y);
        ctx.letterSpacing = "0px";
      }
      cx += widths[i];
    });
    return total;
  }

  function arrowGlyph(ctx, x, y, len, weight, color) {
    const head = Math.max(weight * 3.2, len * 0.28);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.moveTo(x + len - head, y - head * 0.75);
    ctx.lineTo(x + len, y);
    ctx.lineTo(x + len - head, y + head * 0.75);
    ctx.stroke();
    ctx.restore();
  }

  // Draw something inside a mask that it rises into (p from 0 to 1) and leaves upward
  // (q from 0 to 1). The mask is the band [y - asc, y + desc] across [x0, x1].
  function masked(ctx, x0, x1, y, asc, desc, p, q, drawFn) {
    if (p <= 0.0005 || q >= 0.9995) return;
    const h = asc + desc;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y - asc, x1 - x0, h);
    ctx.clip();
    ctx.translate(0, (1 - p) * h * 1.05 - q * h * 1.05);
    drawFn();
    ctx.restore();
  }

  // A line of runs that rises in and leaves by mask.
  function riseRuns(ctx, parts, x, y, base, p, q, align = "left") {
    if (p <= 0.0005 || q >= 0.9995) return 0;
    const w = runs(ctx, parts, x, y, base, false, align);
    const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    const size = base.size;
    masked(ctx, x0 - size * 0.2, x0 + w + size * 0.3, y, size * 1.0, size * 0.34, p, q, () => {
      runs(ctx, parts, x, y, base, true, align);
    });
    return w;
  }

  // A rolling counter. `value` is continuous; each digit column scrolls like an odometer.
  // Right-aligned at x (the right edge of the last digit).
  function odometer(ctx, value, x, y, o) {
    const size = o.size;
    const dec = o.decimals || 0;
    const slot = size * (o.slot || 0.46);
    const lineH = size * 1.3;
    // Settle on whole digits: the last digit only rolls while the value is near a half step.
    const raw = Math.max(0, value * Math.pow(10, dec));
    const fl = Math.floor(raw);
    const v = fl + clamp((raw - fl - 0.5) * 4 + 0.5);
    const minDigits = (o.minDigits || 1) + dec;
    const cols = Math.max(minDigits, Math.floor(Math.log10(Math.max(1, v + 1e-9))) + 2);
    font(ctx, o.kind || "serif", size, { italic: o.italic });
    ctx.fillStyle = o.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const dotW = dec ? size * 0.22 : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - cols * slot - dotW - size * 0.1, y - size * 0.8, cols * slot + dotW + size * 0.2, size * 0.86);
    ctx.clip();
    let left = x;
    for (let k = 0; k < cols; k++) {
      const pk = v / Math.pow(10, k);
      const n = Math.floor(pk);
      let frac;
      if (k === 0) frac = pk - n;
      else frac = clamp(v - Math.floor(v / Math.pow(10, k)) * Math.pow(10, k) - (Math.pow(10, k) - 1));
      const cur = n % 10;
      const nxt = (n + 1) % 10;
      const lead = k >= minDigits;
      const curBlank = lead && n === 0;
      const nxtBlank = lead && n + 1 === 0;
      const cx = x - (k + 0.5) * slot - (k >= dec ? dotW : 0);
      if (!curBlank && frac < 0.9999) ctx.fillText(String(cur), cx, y - frac * lineH);
      if (!nxtBlank && frac > 0.0001) ctx.fillText(String(nxt), cx, y + (1 - frac) * lineH);
      if (!(curBlank && frac < 0.0001)) left = Math.min(left, cx - slot / 2);
    }
    if (dec) ctx.fillText(".", x - dec * slot - dotW / 2, y);
    ctx.restore();
    return left;
  }

  // A stacked fraction centered at cx. The bar sits at y.
  function fraction(ctx, num, den, cx, y, size, numColor, denColor, barColor) {
    font(ctx, "serif", size);
    const wn = ctx.measureText(num).width;
    const wd = ctx.measureText(den).width;
    const w = Math.max(wn, wd) + size * 0.24;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = numColor;
    ctx.fillText(num, cx, y - size * 0.14);
    ctx.fillStyle = denColor;
    ctx.fillText(den, cx, y + size * 0.86);
    ctx.fillStyle = barColor || denColor;
    ctx.fillRect(cx - w / 2, y - size * 0.03, w, Math.max(2, size * 0.035));
    return w;
  }

  FM.kit = {
    clamp, lerp, unlerp, TAU, ease, spring, SPR, sp, springTo, inOut, phase,
    mulberry32, hash, noise1, FACE, font, runs, arrowGlyph, masked, riseRuns, odometer, fraction,
  };
})();
