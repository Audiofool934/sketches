// Four Millimeters: the picture. Every frame is drawn from the time t alone.
(function () {
  const FM = globalThis.FM;
  const K = FM.kit;
  const { clamp, lerp, unlerp, ease, sp, SPR, springTo, inOut, phase, runs, riseRuns, odometer, fraction, font, TAU } = K;
  const { T, cues, BEAT, DURATION, FPS } = FM.clock;
  const HB = FM.harbor;

  const W = 1920;
  const H = 1080;
  const C = {
    ground: "#0c0f17",
    ink: "#efe9dc",
    dim: "#8b8679",
    rule: "#343a48",
    tint: "#1c2c4d",
    accent: "#ff6a1a",
  };
  const LN = Math.log;
  const SPR_MOVE = [14, 2 * Math.sqrt(14)]; // the long diagram move in part B

  // Horizontal angle of view of a 36 mm wide sensor, in degrees.
  const aov = (f) => (2 * Math.atan(18 / f) * 180) / Math.PI;

  // ------------------------------------------------------------------ helpers

  function rectPath(ctx, r) {
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
  }
  const lerpRect = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });

  // The harbor at focal length f, filling rect r, clipped to it (or to `poly`).
  function picture(ctx, r, f, t, poly) {
    ctx.save();
    if (poly) {
      ctx.beginPath();
      poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    } else rectPath(ctx, r);
    ctx.clip();
    const b = poly
      ? {
          x0: Math.min(...poly.map((p) => p[0])),
          x1: Math.max(...poly.map((p) => p[0])),
          y0: Math.min(...poly.map((p) => p[1])),
          y1: Math.max(...poly.map((p) => p[1])),
        }
      : { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h };
    HB.draw(ctx, HB.viewFor(f, r.x, r.y, r.w, r.h), t, b);
    ctx.restore();
  }

  // A nine-blade iris. r is the aperture's circumradius; r >= 1250 is fully open.
  function iris(ctx, r, rot, cx = W / 2, cy = H / 2) {
    if (r >= 1250) return;
    const N = 9;
    const P = [];
    const D = [];
    for (let i = 0; i < N; i++) {
      const a = rot + (i * TAU) / N;
      P.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      const d = rot + ((i + 0.5) * TAU) / N + Math.PI / 2;
      D.push([Math.cos(d), Math.sin(d)]);
    }
    const L = 3200;
    ctx.save();
    for (let i = 0; i < N; i++) {
      const a = P[(i + 1) % N];
      const b = P[(i + 2) % N];
      const da = D[i];
      const db = D[(i + 1) % N];
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(b[0] + db[0] * L, b[1] + db[1] * L);
      ctx.lineTo(a[0] + da[0] * L, a[1] + da[1] * L);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? "#14171d" : "#181b22";
      ctx.fill();
    }
    ctx.strokeStyle = "#2b303b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = P[(i + 1) % N];
      const da = D[i];
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(a[0] + da[0] * L, a[1] + da[1] * L);
    }
    ctx.stroke();
    ctx.strokeStyle = "#454b58";
    ctx.lineWidth = 2;
    ctx.beginPath();
    P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // A rounded chip with mono text, e.g. "+4 mm". Anchored by its left edge (or right).
  function chip(ctx, text, x, yMid, p, q, opts = {}) {
    if (p <= 0.001 || q >= 0.999) return;
    const size = opts.size || 54;
    const parts = text.split(" ").flatMap((s, i) => (i ? [{ gap: 0.28 }, { s }] : [{ s }]));
    const base = { kind: "mono", size, weight: 600, color: opts.color || C.ground };
    const tw = runs(ctx, parts, 0, 0, base, false);
    const padX = size * 0.42;
    const w = tw + padX * 2;
    const h = size * 1.34;
    const x0 = opts.align === "right" ? x - w : x;
    const sc = lerp(0.6, 1, p) * (1 - 0.4 * q);
    ctx.save();
    ctx.globalAlpha = clamp(p * 1.4) * (1 - q);
    ctx.translate(x0 + w / 2, yMid);
    ctx.scale(sc, sc);
    ctx.translate(-w / 2, 0);
    ctx.fillStyle = opts.fill || C.accent;
    ctx.beginPath();
    ctx.roundRect(0, -h / 2, w, h, h * 0.2);
    ctx.fill();
    runs(ctx, parts, padX, size * 0.36, base, true);
    ctx.restore();
    return w;
  }

  function arrowHead(ctx, x, y, dx, dy, size) {
    const l = Math.hypot(dx, dy) || 1;
    const ux = dx / l;
    const uy = dy / l;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - ux * size - uy * size * 0.45, y - uy * size + ux * size * 0.45);
    ctx.lineTo(x - ux * size + uy * size * 0.45, y - uy * size - ux * size * 0.45);
    ctx.closePath();
    ctx.fill();
  }

  // A vertical dimension line from y0 to y1 at x, with arrowheads at both ends.
  function vdim(ctx, x, y0, y1, color, alpha = 1, width = 2.5) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    const head = Math.min(18, Math.abs(y1 - y0) * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, y0 + head * 0.6);
    ctx.lineTo(x, y1 - head * 0.6);
    ctx.stroke();
    if (head > 3) {
      arrowHead(ctx, x, y0, 0, -1, head);
      arrowHead(ctx, x, y1, 0, 1, head);
    }
    ctx.restore();
  }

  function hline(ctx, x0, x1, y, color, width = 1.5, dash = null, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.restore();
  }

  // A bracket over [x0, x1] at y, ticks pointing down (dir = 1) or up (dir = -1).
  function bracket(ctx, x0, x1, y, color, p = 1, dir = 1, width = 3) {
    if (p <= 0.001) return;
    const mid = (x0 + x1) / 2;
    const a = lerp(mid, x0, p);
    const b = lerp(mid, x1, p);
    const tick = 16 * dir;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(a, y + tick);
    ctx.lineTo(a, y);
    ctx.lineTo(b, y);
    ctx.lineTo(b, y + tick);
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------ the camera drawing

  // A lens as a biconvex outline centered at (x, y), half-width hw, center thickness th.
  function lensPath(ctx, x, y, hw, th) {
    const sag = Math.max(0.5, th / 2);
    const R = (hw * hw + sag * sag) / (2 * sag);
    const a = Math.asin(clamp(hw / R, -1, 1));
    ctx.beginPath();
    ctx.arc(x, y - sag + R, R, -Math.PI / 2 - a, -Math.PI / 2 + a);
    ctx.arc(x, y + sag - R, R, Math.PI / 2 - a, Math.PI / 2 + a);
    ctx.closePath();
  }

  // One camera seen from above: sensor at the bottom, lens above it, the field of view
  // opening upward. o: {x, y (lens center), f, s (px per mm), fBase, rays, lensP, sensorP,
  // wedgeTop, fold, colW, tintA}
  function camera(ctx, o) {
    const { x, y, f, s } = o;
    const fold = o.fold || 0;
    const ys = y + f * s;
    const half = 18 * s;
    const cw = o.colW || 46;
    const baseHalf = lerp(half, cw, fold);
    const apexHalf = cw * fold;
    const lensP = o.lensP === undefined ? 1 : o.lensP;
    const sensorP = o.sensorP === undefined ? 1 : o.sensorP;
    const rays = o.rays === undefined ? 1 : o.rays;

    // field of view above the lens
    if (o.wedgeTop !== undefined && rays > 0 && fold < 0.999) {
      const top = lerp(o.wedgeTop, y, ease.inOutCubic(fold));
      const spread = ((y - top) * 18) / f;
      ctx.save();
      ctx.globalAlpha = (o.tintA === undefined ? 0.75 : o.tintA) * clamp(rays * 1.5) * (1 - fold);
      ctx.fillStyle = C.tint;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - spread * (1 - fold), top);
      ctx.lineTo(x + spread * (1 - fold), top);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // the cone of light inside the camera
    if (rays > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55 * clamp(rays * 1.5) + 0.35 * fold;
      ctx.fillStyle = C.tint;
      ctx.beginPath();
      ctx.moveTo(x - apexHalf, y);
      ctx.lineTo(x + apexHalf, y);
      ctx.lineTo(x + baseHalf, ys);
      ctx.lineTo(x - baseHalf, ys);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // the two edge rays: from the sensor's edges, crossing at the lens, out to the world
    if (rays > 0 && fold < 0.999) {
      const top = lerp(o.wedgeTop === undefined ? y : o.wedgeTop, y, ease.inOutCubic(fold));
      const spread = ((y - top) * 18) / f;
      const pts = [
        [[x + baseHalf, ys], [x + apexHalf, y], [x - spread * (1 - fold), top]],
        [[x - baseHalf, ys], [x - apexHalf, y], [x + spread * (1 - fold), top]],
      ];
      ctx.save();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      for (const [a, b, c] of pts) {
        const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
        const total = l1 + l2;
        const reach = rays * total;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        if (reach <= l1) ctx.lineTo(lerp(a[0], b[0], reach / l1), lerp(a[1], b[1], reach / l1));
        else {
          ctx.lineTo(b[0], b[1]);
          ctx.lineTo(lerp(b[0], c[0], (reach - l1) / l2), lerp(b[1], c[1], (reach - l1) / l2));
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    // the folded column outline
    if (fold > 0) {
      ctx.save();
      ctx.globalAlpha = fold;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - cw, y, cw * 2, ys - y);
      ctx.restore();
    }
    // lens
    if (lensP > 0) {
      const hw = lerp(Math.max(Math.min(22 * s, 18 * s + 24), 26), cw, fold) * lensP;
      const th = lerp(Math.max(3.6 * s, 7), 4, fold) * lensP;
      ctx.save();
      lensPath(ctx, x, y, hw, th);
      ctx.fillStyle = "rgba(239,233,220,0.16)";
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
    // sensor
    if (sensorP > 0) {
      const sh = Math.max(9, 1.1 * s) * lerp(1, 0.55, fold);
      ctx.fillStyle = C.ink;
      ctx.fillRect(x - baseHalf * sensorP, ys - sh / 2, baseHalf * 2 * sensorP, sh);
    }
    return ys;
  }

  // The angle arc above the lens.
  function angleArc(ctx, x, y, f, r, p, alpha = 1) {
    if (p <= 0.001) return;
    const half = Math.atan(18 / f);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2 - half * p, -Math.PI / 2 + half * p);
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ the ruler

  // Two rulers of 4 mm blocks. The top one is in millimeters. The bottom one starts as a copy
  // and is re-spaced by ratio (m: 0 = millimeters, 1 = ratio). In part D the ratio ruler drops
  // to the bottom edge and runs the full width.
  const RUL = { x0: 260, span: 1600, upY: 400, upH: 44, loY: 730, loH: 56, hudY: 1010, hudH: 18 };
  function rulerX(f, m, x0 = RUL.x0, span = RUL.span) {
    const lin = x0 + (span * f) / 240;
    const log = x0 + (span * LN(Math.max(f, 0.02) / 12)) / LN(25);
    return lerp(lin, log, m);
  }
  const hudX = (f) => rulerX(f, 1, 60, 1800);
  const MARKS = [14, 16, 20, 24, 28, 35, 50, 70, 85, 105, 135, 200];

  // ------------------------------------------------------------------ act A

  // Focal length of the opening picture.
  const stepsA = [
    [0, LN(24)],
    [T.hookClicks[0], LN(28), SPR.ui],
    [T.hookClicks[1], LN(24), SPR.ui],
    [T.hookClicks[2], LN(28), SPR.ui],
    [T.zoomOut, LN(200), SPR.long],
    [T.teleClicks[0], LN(204), SPR.ui],
    [T.teleClicks[1], LN(200), SPR.ui],
    [T.teleClicks[2], LN(204), SPR.ui],
  ];
  const fA = (t) => Math.exp(springTo(t, stepsA));
  const shownA = (t) => Math.exp(springTo(t, stepsA.map(([a, b, p]) => [a, b, p === SPR.long ? SPR.long : SPR.snap])));

  const PL = { x: 90, y: 300, w: 840, h: 472.5 }; // left print
  const PR = { x: 990, y: 300, w: 840, h: 472.5 }; // right print
  const FULL = { x: 0, y: 0, w: W, h: H };

  // Flip a print between two focal lengths on the given beats, starting on `start`.
  function flips(t, a, b, times, startOnB, t0 = -1) {
    const steps = [[t0, LN(startOnB ? b : a)]];
    let onB = startOnB;
    for (const tt of times) {
      onB = !onB;
      steps.push([tt, LN(onB ? b : a), SPR.ui]);
    }
    return Math.exp(springTo(t, steps));
  }

  function bigNumber(ctx, value, t, p, q, xRight, y, size, decimals = 0) {
    if (p <= 0.001 || q >= 0.999) return;
    const asc = size * 0.95;
    const desc = size * 0.3;
    K.masked(ctx, xRight - size * 2.4, xRight + size * 1.4, y, asc, desc, p, q, () => {
      odometer(ctx, value, xRight, y, { size, color: C.ink, decimals, slot: 0.45 });
      font(ctx, "serif", size * 0.5, { italic: true });
      ctx.fillStyle = C.ink;
      ctx.textAlign = "left";
      ctx.fillText("mm", xRight + size * 0.12, y);
    });
  }

  function printLabels(ctx, t, a, b, tIn, tOut, chipText) {
    const base = { kind: "serif", size: 84, color: C.ink };
    const P1 = phase(t, tIn, tOut);
    const P2 = phase(t, tIn + 0.08, tOut);
    const parts = (x, y) => [{ s: x }, { arrow: true }, { s: y }, { s: " mm", italic: true }];
    riseRuns(ctx, parts(a[0], a[1]), PL.x, 875, base, P1.in, P1.out);
    riseRuns(ctx, parts(b[0], b[1]), PR.x, 875, base, P2.in, P2.out);
    const cp = phase(t, tIn + 0.25, tOut, SPR.ui, 0.25);
    chip(ctx, chipText, PL.x + PL.w, 848, cp.in, cp.out, { align: "right" });
    chip(ctx, chipText, PR.x + PR.w, 848, cp.in, cp.out, { align: "right" });
  }

  function actA(ctx, t) {
    // the full picture, until it becomes the right print
    const fFull = fA(t);
    const pSplit = t < T.split ? 0 : sp(t - T.split, SPR.card);
    const rFull = lerpRect(FULL, PR, pSplit);
    const fRight = t < T.flipsA[0] ? fFull : flips(t, 200, 204, T.flipsA, true, T.teleClicks[2]);
    if (t < T.strip + 0.8) {
      const out = t < T.strip ? 0 : ease.inCubic(clamp((t - T.strip) / 0.55));
      const r = { ...rFull, x: rFull.x + out * 1100 };
      picture(ctx, r, t < T.flipsA[0] ? fFull : fRight, t);
    }
    // the left print slides in at the split
    if (t >= T.split && t < T.strip) {
      const r = { ...PL, x: lerp(-PL.w - 40, PL.x, pSplit) };
      picture(ctx, r, flips(t, 24, 28, T.flipsA, true), t);
    }

    // the iris opens
    if (t < 0.9) {
      const r = 1250 * sp(t - 0.04, [110, 2 * Math.sqrt(110)]);
      iris(ctx, r, 0.4 + r * 0.0007);
    }

    // the focal length numeral and its +4 chip
    const num = phase(t, T.numeral, T.split - 0.22, SPR.type, 0.26);
    bigNumber(ctx, shownA(t), t, num.in, num.out, 455, 330, 230);
    const chipOn = [
      [T.hookClicks[0], T.hookClicks[1]],
      [T.hookClicks[2], T.zoomOut],
      [T.teleClicks[0], T.teleClicks[1]],
      [T.teleClicks[2], T.split - 0.22],
    ];
    for (const [a, b] of chipOn) {
      if (t < a || t > b + 0.3) continue;
      const cp = phase(t, a, b, SPR.ui, 0.2);
      chip(ctx, "+4 mm", 735, 268, cp.in, cp.out, { size: 58 });
    }

    // the split: labels and headline
    if (t >= T.flipsA[0] - 0.1) {
      printLabels(ctx, t, ["24", "28"], ["200", "204"], T.flipsA[0], T.strip - 0.25, "+4 mm");
      const h1 = phase(t, T.same, T.strip - 0.3);
      const h2 = phase(t, T.different, T.strip - 0.25);
      const base = { kind: "serif", size: 128, color: C.ink };
      riseRuns(ctx, [{ s: "Same " }, { s: "4 mm", color: C.accent }, { s: "." }], PL.x, 215, base, h1.in, h1.out);
      riseRuns(ctx, [{ s: "Different jump.", italic: true }], PR.x, 215, base, h2.in, h2.out);
    }
  }

  // ------------------------------------------------------------------ act B

  const LX = 960;
  const LY = 600;
  const S0 = 12; // px per mm at 24 and 28 mm
  const S1 = 2.0; // px per mm at 200 mm
  const STRIP = { y0: 40, y1: 330, yc: 185, v0: 0.05 };
  STRIP.K = LY - STRIP.yc;
  const PAIR = { lx: 440, rx: 1340, y: 230, h: 400 };
  const lensHalf = (s) => Math.max(Math.min(22 * s, 18 * s + 24), 26);

  // The long move to 200 mm drives both the focal length and the drawing's scale,
  // so the triangle keeps its height and only gets thinner.
  const pLong = (t) => sp(t - T.long, SPR_MOVE);
  function fB(t) {
    return Math.exp(
      LN(24) +
        (LN(28) - LN(24)) * sp(t - T.plus, SPR.ui) +
        (LN(200) - LN(28)) * pLong(t) +
        (LN(204) - LN(200)) * sp(t - T.plus200, SPR.ui),
    );
  }
  const sB = (t) => Math.exp(LN(S0) + (LN(S1) - LN(S0)) * pLong(t));

  // The lit window on the strip for focal length f: the field of view crossing the strip.
  function litPoly(f, dy = 0) {
    const k = 18 / f;
    return [
      [LX - (LY - STRIP.y0) * k, STRIP.y0 + dy],
      [LX + (LY - STRIP.y0) * k, STRIP.y0 + dy],
      [LX + (LY - STRIP.y1) * k, STRIP.y1 + dy],
      [LX - (LY - STRIP.y1) * k, STRIP.y1 + dy],
    ];
  }
  const stripView = { cx: LX, cy: STRIP.yc, S: STRIP.K, u0: 0, v0: STRIP.v0 };

  function clipPoly(ctx, poly) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
  }
  const polyBounds = (poly) => ({
    x0: Math.min(...poly.map((p) => p[0])),
    x1: Math.max(...poly.map((p) => p[0])),
    y0: Math.min(...poly.map((p) => p[1])),
    y1: Math.max(...poly.map((p) => p[1])),
  });

  function drawStrip(ctx, t, f, reveal, dy, litP = 1) {
    const y0 = STRIP.y0 + dy;
    const y1 = STRIP.y1 + dy;
    const view = { ...stripView, cy: STRIP.yc + dy };
    if (reveal > 0.001) {
      const half = lerp(310, 1000, reveal);
      ctx.save();
      ctx.beginPath();
      ctx.rect(LX - half, y0, half * 2, y1 - y0);
      ctx.clip();
      HB.draw(ctx, view, t, { x0: LX - half, y0, x1: LX + half, y1 });
      ctx.fillStyle = C.ground;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(LX - half, y0, half * 2, y1 - y0);
      ctx.restore();
    }
    if (litP > 0.001) {
      const poly = litPoly(f, dy);
      ctx.save();
      clipPoly(ctx, poly);
      ctx.globalAlpha = litP;
      HB.draw(ctx, view, t, polyBounds(poly));
      ctx.restore();
    }
  }

  // A rolling number with a unit, masked so it rises in and leaves upward.
  // o: {size, decimals, unit, unitScale, unitItalic, unitGap, align, color}
  function readout(ctx, value, x, y, o, p, q) {
    if (p <= 0.001 || q >= 0.999) return;
    const size = o.size;
    const slot = 0.45 * size;
    const color = o.color || C.ink;
    const us = size * (o.unitScale || 1);
    font(ctx, "serif", us, { italic: o.unitItalic });
    const unitW = ctx.measureText(o.unit).width;
    const gapU = o.unitGap === undefined ? size * 0.1 : o.unitGap;
    const v = Math.max(0, value);
    const dec = o.decimals || 0;
    const digits = 1 + clamp(v - 9) + clamp(v - 99);
    const numW = (digits + dec) * slot + (dec ? size * 0.22 : 0);
    const xr = o.align === "right" ? x - unitW - gapU : x + numW;
    const x0 = xr - numW;
    K.masked(ctx, x0 - size * 0.25, xr + gapU + unitW + size * 0.25, y, size * 0.95, size * 0.32, p, q, () => {
      odometer(ctx, v, xr, y, { size, color, decimals: dec, slot: 0.45 });
      font(ctx, "serif", us, { italic: o.unitItalic });
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.fillText(o.unit, xr + gapU, y);
    });
  }

  function accentText(ctx, s, x, y, size, p, q, align = "left", kind = "serif") {
    riseRuns(ctx, [{ s }], x, y, { kind, size, color: C.accent, weight: kind === "mono" ? 600 : 400 }, p, q, align);
  }

  function actB(ctx, t) {
    const f = fB(t);
    const s = sB(t);
    const q = sp(t - T.strip, SPR.card);
    const pairP = t < T.pair ? 0 : sp(t - T.pair, SPR.card);
    const stripOut = t < T.pair ? 0 : ease.inCubic(clamp((t - T.pair) / 0.6));
    const dy = -stripOut * 420;

    // B1: the left print lifts into the strip; its frame becomes the lit window
    if (q < 0.999) {
      const fp = Math.exp(springTo(t, [[0, LN(28)], [T.strip, LN(24), SPR.card]]));
      const v0 = HB.viewFor(fp, PL.x, PL.y, PL.w, PL.h);
      const view = {
        cx: lerp(v0.cx, stripView.cx, q),
        cy: lerp(v0.cy, stripView.cy, q),
        S: Math.exp(lerp(LN(v0.S), LN(stripView.S), q)),
        u0: 0,
        v0: lerp(v0.v0, stripView.v0, q),
      };
      const rectPoly = [[PL.x, PL.y], [PL.x + PL.w, PL.y], [PL.x + PL.w, PL.y + PL.h], [PL.x, PL.y + PL.h]];
      const lit = litPoly(fp);
      const poly = rectPoly.map((p, i) => [lerp(p[0], lit[i][0], q), lerp(p[1], lit[i][1], q)]);
      const reveal = sp(t - T.strip - 0.35, SPR.card);
      if (reveal > 0) drawStrip(ctx, t, fp, reveal, 0, 0);
      ctx.save();
      clipPoly(ctx, poly);
      HB.draw(ctx, view, t, polyBounds(poly));
      ctx.restore();
    } else if (stripOut < 0.999) {
      drawStrip(ctx, t, f, sp(t - T.strip - 0.35, SPR.card), dy);
    }

    const lensIn = sp(t - T.lens, SPR.card);
    const rays = ease.inOutCubic(clamp((t - T.lens - 0.25) / 0.7));
    const camX = lerp(LX, PAIR.rx, pairP);
    const camY = lerp(LY, PAIR.y, pairP);
    const fold = t < T.blocks ? 0 : sp(t - T.blocks, SPR.card);
    const hw = lensHalf(s);

    // the single camera, which becomes the right-hand camera of the pair
    if (t < T.ruler + 0.4) {
      const gone = t < T.ruler ? 0 : ease.inCubic(clamp((t - T.ruler) / 0.3));
      ctx.save();
      ctx.globalAlpha = 1 - gone;
      camera(ctx, {
        x: camX,
        y: camY + (1 - lensIn) * 60,
        f,
        s,
        lensP: lensIn,
        sensorP: sp(t - T.lens - 0.12, SPR.card),
        rays,
        wedgeTop: lerp(STRIP.y1 + dy, 110, pairP),
        fold,
      });
      ctx.restore();
    }

    // the dimension line: lens to sensor, with the orange 4 mm on the end
    if (t >= T.dim && t < T.blocks + 0.4) {
      const xd = camX + hw + 28;
      const inP = t < T.long ? sp(t - T.dim, SPR.card) : 1;
      const out = ease.inCubic(clamp((t - T.blocks) / 0.3));
      const fBase = t < T.long ? 24 : 200;
      const yb = camY + fBase * s;
      const ys = camY + f * s;
      // the line measures to the sensor, except while the orange 4 mm is shown on its end
      const split = (t >= T.plus && t < T.long) || t >= T.plus200;
      vdim(ctx, xd, camY, lerp(camY, split ? yb : ys, inP), C.ink, 1 - out);
      hline(ctx, camX + hw * 0.6, xd + 14, camY, C.dim, 1.5, [5, 6], inP * (1 - out));
      const accP = t < T.long ? (t >= T.plus ? sp(t - T.plus, SPR.ui) : 0) : t >= T.plus200 ? sp(t - T.plus200, SPR.ui) : 0;
      const accOut = t < T.long ? ease.inCubic(clamp((t - (T.long - 0.25)) / 0.25)) : out;
      if (accP > 0.001 && accOut < 0.999) {
        ctx.save();
        ctx.globalAlpha = 1 - accOut;
        ctx.fillStyle = C.accent;
        ctx.fillRect(xd - 7, yb, 14, Math.max((ys - yb) * clamp(accP), 2.5));
        ctx.restore();
      }
    }

    // part names, before the angle takes their place
    const mono = { kind: "mono", size: 58, color: C.dim };
    const nm = phase(t, T.lens + 0.6, T.arc - 0.35, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "lens" }], LX - hw - 30, LY + 17, mono, nm.in, nm.out, "right");
    const ysB = LY + f * s;
    riseRuns(ctx, [{ s: "sensor" }], LX - 18 * s - 30, ysB + 17, mono, nm.in, nm.out, "right");
    const sw = phase(t, T.lens + 0.8, T.long, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "36 mm wide" }], LX, ysB + 74, { ...mono, size: 52 }, sw.in, sw.out, "center");

    // the angle of view: arc and readout on the left
    const arcP = sp(t - T.arc, SPR.card) * (1 - ease.inCubic(clamp((t - T.pair) / 0.3)));
    angleArc(ctx, LX, LY, f, 118, arcP);
    const xA = 650;
    const al = phase(t, T.arc, T.pair, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "angle of view" }], xA, 500, mono, al.in, al.out, "right");
    const av = phase(t, T.arc + 0.1, T.pair, SPR.type, 0.3);
    readout(ctx, aov(f), xA, 660, { size: 160, decimals: 1, unit: "°", unitGap: 2, align: "right" }, av.in, av.out);
    const d1 = phase(t, T.delta, T.long - 0.1, SPR.type, 0.3);
    accentText(ctx, "−8.3°", xA, 790, 100, d1.in, d1.out, "right");
    const d2 = phase(t, T.delta200, T.pair, SPR.type, 0.3);
    accentText(ctx, "−0.2°", xA, 790, 100, d2.in, d2.out, "right");

    // the focal length readout on the right, following the camera's width
    const xF = LX + hw + 80;
    const fl = phase(t, T.dim, T.pair, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "focal length" }], xF, LY + 100, mono, fl.in, fl.out);
    const fv = phase(t, T.dim + 0.1, T.pair, SPR.type, 0.3);
    readout(ctx, f, xF, LY + 260, { size: 160, unit: "mm", unitScale: 0.5, unitItalic: true, unitGap: 16, align: "left" }, fv.in, fv.out);
    const p1 = phase(t, T.plus + 0.1, T.long - 0.1, SPR.ui, 0.25);
    accentText(ctx, "+4 mm", xF, LY + 360, 56, p1.in, p1.out, "left", "mono");
    const p2 = phase(t, T.plus200 + 0.1, T.pair, SPR.ui, 0.25);
    accentText(ctx, "+4 mm", xF, LY + 360, 56, p2.in, p2.out, "left", "mono");

    // B4: the 24 mm camera returns, drawn at the same height; both fold into gauge blocks
    if (t >= T.pair) {
      const inP = sp(t - T.pair - 0.36, SPR.card);
      const outP = t < T.ruler ? 0 : ease.inCubic(clamp((t - T.ruler) / 0.55));
      const lx = lerp(-420, PAIR.lx, inP) - outP * 900;
      const ly = PAIR.y;
      const ls = PAIR.h / 24;
      camera(ctx, { x: lx, y: ly, f: 28, s: ls, rays: 1, wedgeTop: 110, fold });
      if (fold < 0.999) {
        const xd = lx + lensHalf(ls) + 28;
        vdim(ctx, xd, ly, ly + 24 * ls, C.ink, 1 - fold);
        ctx.save();
        ctx.globalAlpha = 1 - fold;
        ctx.fillStyle = C.accent;
        ctx.fillRect(xd - 7, ly + 24 * ls, 14, 4 * ls);
        ctx.restore();
      }
      const cap = phase(t, T.pair + 0.3, T.blocks, SPR.type, 0.3);
      riseRuns(ctx, [{ s: "both drawn the same height" }], W / 2, 90, { ...mono, size: 54 }, cap.in, cap.out, "center");
      const rd = phase(t, T.pair + 0.55, T.blocks, SPR.type, 0.3);
      const rb = { kind: "serif", size: 84, color: C.ink };
      riseRuns(ctx, [{ s: "73.7°" }, { arrow: true }, { s: "65.5°" }], PAIR.lx, 830, rb, rd.in, rd.out, "center");
      accentText(ctx, "−8.3°", PAIR.lx, 930, 72, rd.in, rd.out, "center");
      riseRuns(ctx, [{ s: "10.3°" }, { arrow: true }, { s: "10.1°" }], PAIR.rx, 830, rb, rd.in, rd.out, "center");
      accentText(ctx, "−0.2°", PAIR.rx, 930, 72, rd.in, rd.out, "center");

      // gauge blocks, then the fractions they make
      if (t >= T.blocks) {
        drawBlocks(ctx, t, lx, ly, ls, 6, cues.blocksLeft, 46, t < T.ruler + 0.1);
        if (t < T.ruler) drawBlocks(ctx, t, camX, camY, s, 50, cues.blocksRight, 46);
        const fx = 800 - outP * 900;
        const fxR = 1620;
        const fr = phase(t, T.fraction, T.ruler, SPR.type, 0.35);
        const frR = phase(t, T.fraction + 0.15, T.ruler, SPR.type, 0.35);
        if (fr.in > 0.001 && fr.out < 0.999)
          K.masked(ctx, fx - 220, fx + 220, 560, 300, 240, fr.in, fr.out, () =>
            fraction(ctx, "1", "6", fx, 460, 210, C.accent, C.ink, C.ink),
          );
        if (frR.in > 0.001 && frR.out < 0.999)
          K.masked(ctx, fxR - 220, fxR + 220, 560, 300, 240, frR.in, frR.out, () =>
            fraction(ctx, "1", "50", fxR, 460, 210, C.accent, C.ink, C.ink),
          );
        const cp = phase(t, T.fraction + 0.45, T.ruler, SPR.type, 0.3);
        riseRuns(ctx, [{ s: "4 mm of 24" }], fx, 815, { ...mono, size: 60 }, cp.in, cp.out, "center");
        riseRuns(ctx, [{ s: "4 mm of 200" }], fxR, 815, { ...mono, size: 60 }, cp.in, cp.out, "center");
        const pc = phase(t, T.percent, T.ruler, SPR.type, 0.3);
        const pcR = phase(t, T.percent + 0.12, T.ruler, SPR.type, 0.3);
        const pb = { kind: "serif", size: 96, color: C.ink };
        riseRuns(ctx, [{ s: "picture ", kind: "mono", size: 58, color: C.dim }, { s: "×1.17" }], fx, 945, pb, pc.in, pc.out, "center");
        riseRuns(ctx, [{ s: "picture ", kind: "mono", size: 58, color: C.dim }, { s: "×1.02" }], fxR, 945, pb, pcR.in, pcR.out, "center");
      }
    }
  }

  // A column of 4 mm gauge blocks from the lens (top) down, then the orange one.
  function drawBlocks(ctx, t, x, y, s, n, times, cw, accent = true) {
    const bh = 4 * s;
    const gap = Math.min(3, bh * 0.16);
    for (let i = 0; i < n; i++) {
      const p = sp(t - times[i], SPR.ui);
      if (p <= 0.001) continue;
      const by = y + i * bh;
      ctx.fillStyle = C.ink;
      ctx.globalAlpha = clamp(p * 1.5) * 0.92;
      const sh = lerp(0.4, 1, p);
      ctx.fillRect(x - cw * sh, by + gap / 2 - (1 - p) * 26, cw * 2 * sh, bh - gap);
    }
    ctx.globalAlpha = 1;
    const pa = sp(t - T.blockAccent, SPR.ui);
    if (accent && pa > 0.001) {
      ctx.fillStyle = C.accent;
      const by = y + n * bh;
      const sh = lerp(0.4, 1, pa);
      ctx.fillRect(x - cw * sh, by + gap / 2 - (1 - pa) * 26, cw * 2 * sh, Math.max(bh - gap, 2));
    }
  }

  // ------------------------------------------------------------------ act C

  // Morph progress from millimeters to ratio.
  const morphM = (t) => ease.inOutCubic(clamp((t - T.morph) / (T.morphEnd - T.morph)));
  function lowerLayout(t) {
    const d = t < T.rulerDown ? 0 : sp(t - T.rulerDown, SPR.card);
    return {
      y: lerp(RUL.loY, RUL.hudY, d),
      h: lerp(RUL.loH, RUL.hudH, d),
      x0: lerp(RUL.x0, 60, d),
      span: lerp(RUL.span, 1800, d),
      m: morphM(t),
      d,
    };
  }
  const dropP = (t, i) => sp(t - (T.marks + 0.1 + i * 0.012), SPR.card);
  const upperOut = (t) => (t < T.rulerDown ? 0 : ease.inCubic(clamp((t - T.rulerDown) / 0.45)));
  function blockSpan(i, m, x0, span) {
    let a = rulerX(4 * i, m, x0, span) + 1;
    let b = rulerX(4 * i + 4, m, x0, span) - 1;
    if (b - a < 1.2) {
      const c = (a + b) / 2;
      a = c - 0.6;
      b = c + 0.6;
    }
    return [a, b];
  }
  const isAccent = (i, t) => i === 50 || (i === 6 && t >= T.ruler + 0.75);

  // The millimeter ruler: its first 51 blocks fly in from part B's 200 mm stack.
  function drawUpper(ctx, t) {
    const out = upperOut(t);
    if (out >= 1) return;
    const yC = RUL.upY - out * 560;
    for (let i = 0; i < 61; i++) {
      let [x0, x1] = blockSpan(i, 0, RUL.x0, RUL.span);
      let y0 = yC - RUL.upH / 2;
      let h = RUL.upH;
      let a = 1;
      if (i <= 50) {
        const p = sp(t - cues.cascade[i], SPR.card);
        if (p < 1) {
          const sx0 = PAIR.rx - 46;
          const sy0 = PAIR.y + i * 4 * S1;
          const arc = Math.sin(Math.PI * clamp(p)) * 120;
          x0 = lerp(sx0, x0, p);
          x1 = lerp(sx0 + 92, x1, p);
          y0 = lerp(sy0, y0, p) - arc;
          h = lerp(4 * S1 - 1, h, p);
        }
      } else {
        const p = sp(t - (T.ruler + 1.1 + (i - 51) * 0.03), SPR.card);
        x0 += (1 - p) * 300;
        x1 += (1 - p) * 300;
        a = clamp(p * 2);
      }
      ctx.globalAlpha = a * 0.92;
      ctx.fillStyle = isAccent(i, t) ? C.accent : C.ink;
      ctx.fillRect(x0, y0, x1 - x0, h);
    }
    ctx.globalAlpha = 1;
    // the 24 mm stack's orange block flies onto 24-28
    if (t >= T.ruler && t < T.ruler + 1.0) {
      const p = sp(t - T.ruler - 0.1, SPR.card);
      const ls = PAIR.h / 24;
      const [tx0, tx1] = blockSpan(6, 0, RUL.x0, RUL.span);
      const arc = Math.sin(Math.PI * clamp(p)) * 160;
      ctx.fillStyle = C.accent;
      ctx.fillRect(
        lerp(PAIR.lx - 46, tx0, p),
        lerp(PAIR.y + 24 * ls, yC - RUL.upH / 2, p) - arc,
        lerp(92, tx1 - tx0, p),
        lerp(4 * ls - 3, RUL.upH, p),
      );
    }
  }

  // The ratio ruler: a copy of the millimeter ruler that drops and re-spaces.
  function drawLower(ctx, t) {
    if (t < T.marks) return;
    const L = lowerLayout(t);
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.x0 - 4, 0, W, H);
    ctx.clip();
    for (let i = 0; i < 75; i++) {
      const p = dropP(t, i);
      if (p <= 0.001) continue;
      const [x0, x1] = blockSpan(i, L.m, L.x0, L.span);
      if (x1 < L.x0 - 10 || x0 > W + 10) continue;
      const y = lerp(RUL.upY, L.y, p);
      const h = lerp(RUL.upH, L.h, p);
      ctx.globalAlpha = lerp(0.92, 0.62, L.d);
      ctx.fillStyle = isAccent(i, t) ? C.accent : C.ink;
      ctx.fillRect(x0, y - h / 2, x1 - x0, h);
    }
    ctx.restore();
  }

  // Lines from each 4 mm mark on the millimeter ruler to the same mark on the ratio ruler.
  function drawFan(ctx, t) {
    if (t < T.marks) return;
    const out = upperOut(t);
    if (out >= 1) return;
    const L = lowerLayout(t);
    ctx.save();
    ctx.beginPath();
    ctx.rect(RUL.x0 - 4, 0, W, H);
    ctx.clip();
    for (let i = 0; i <= 75; i++) {
      const p = dropP(t, Math.min(i, 74));
      if (p <= 0.001) continue;
      const f = 4 * i;
      const key = f === 24 || f === 28 || f === 200 || f === 204;
      const ya = RUL.upY + RUL.upH / 2 - out * 560;
      const yb = lerp(RUL.upY, L.y, p) - lerp(RUL.upH, L.h, p) / 2;
      if (yb <= ya + 1) continue;
      const xa = rulerX(f, 0);
      const xb = rulerX(f, L.m, L.x0, L.span);
      ctx.strokeStyle = key ? C.accent : C.ink;
      ctx.globalAlpha = (key ? 0.9 : 0.26) * (1 - out);
      ctx.lineWidth = key ? 2.5 : 1.25;
      ctx.beginPath();
      ctx.moveTo(xa, ya);
      ctx.lineTo(lerp(xa, xb, 1), lerp(ya, yb, 1) - (1 - out) * 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function actC(ctx, t) {
    const L = lowerLayout(t);
    const m = L.m;
    drawFan(ctx, t);
    drawUpper(ctx, t);
    drawLower(ctx, t);

    const allOut = T.rulerDown;
    const mono = { kind: "mono", size: 58, color: C.dim };
    const head = { kind: "serif", size: 100, color: C.ink };
    const HY = 175;
    const upOff = -upperOut(t) * 560;

    // row names
    const rn1 = phase(t, T.ruler + 1.1, allOut, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "mm" }], 60, RUL.upY + 18 + upOff, mono, rn1.in, rn1.out);
    const rn2 = phase(t, T.marks + 0.4, allOut, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "ratio" }], 60, RUL.loY + 18, mono, rn2.in, rn2.out);

    // on the millimeter ruler the two steps are the same size
    const eb = phase(t, T.equal, T.zooms, SPR.card, 0.3);
    const ebP = eb.in * (1 - eb.out);
    bracket(ctx, rulerX(24, 0), rulerX(28, 0), RUL.upY - 44 + upOff, C.accent, ebP, 1, 3);
    bracket(ctx, rulerX(200, 0), rulerX(204, 0), RUL.upY - 44 + upOff, C.accent, ebP, 1, 3);
    const el = phase(t, T.equal + 0.15, T.zooms, SPR.type, 0.3);
    const eqs = { kind: "mono", size: 54, color: C.ink };
    riseRuns(ctx, [{ s: "24–28" }], rulerX(26, 0), RUL.upY - 64, eqs, el.in, el.out, "center");
    riseRuns(ctx, [{ s: "200–204" }], rulerX(202, 0), RUL.upY - 64, eqs, el.in, el.out, "center");
    const h1 = phase(t, T.ruler + 1.5, T.morph, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "In millimeters, the same size." }], 60, HY, head, h1.in, h1.out);
    const h2 = phase(t, T.morph + 0.3, T.morphEnd, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "Now space the blocks by ratio." }], 60, HY, head, h2.in, h2.out);

    // lens focal lengths under the ratio ruler, once there is room
    for (let k = 0; k < MARKS.length; k++) {
      const fm = MARKS[k];
      const p = sp(t - (T.morphEnd - 0.4 + k * 0.04), SPR.ui) * (1 - phase(t, 0, allOut, SPR.type, 0.3).out);
      if (p <= 0.001) continue;
      const x = rulerX(fm, m);
      ctx.fillStyle = C.ink;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x - 1.5, RUL.loY + RUL.loH / 2 + 8, 3, 22 * p);
      ctx.globalAlpha = 1;
      const lp = phase(t, T.morphEnd + k * 0.04, allOut, SPR.type, 0.3);
      riseRuns(ctx, [{ s: String(fm) }], x, RUL.loY + RUL.loH / 2 + 76, { kind: "mono", size: 46, color: C.dim }, lp.in, lp.out, "center");
    }

    // on the ratio ruler: 24-28 is eight times 200-204
    const BY = 900;
    const rb = phase(t, T.morphEnd, T.zooms, SPR.card, 0.3);
    const rbP = rb.in * (1 - rb.out);
    bracket(ctx, rulerX(24, 1), rulerX(28, 1), BY, C.accent, rbP, -1, 3);
    bracket(ctx, rulerX(200, 1), rulerX(204, 1), BY, C.accent, rbP, -1, 3);
    const rl = phase(t, T.morphEnd + 0.15, T.zooms, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "24–28" }], rulerX(26, 1), BY + 64, eqs, rl.in, rl.out, "center");
    const rl2 = phase(t, T.morphEnd + 0.15, T.slide, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "200–204" }], rulerX(202, 1), BY + 64, eqs, rl2.in, rl2.out, "center");
    const h3 = phase(t, T.morphEnd + 0.2, T.slide, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "By ratio, " }, { s: "24–28", color: C.accent }, { s: " is almost 8× longer." }], 60, HY, head, h3.in, h3.out);

    // the 24-28 step slides along to 200-233
    if (t >= T.slide) {
      const p = sp(t - T.slide - 0.1, [60, 2 * Math.sqrt(60)]);
      const out = phase(t, 0, T.zooms, SPR.type, 0.3).out;
      const w = rulerX(28, 1) - rulerX(24, 1);
      const x0 = lerp(rulerX(24, 1), rulerX(200, 1), p);
      const lift = Math.sin(Math.PI * clamp(p)) * 40;
      ctx.save();
      ctx.globalAlpha = 1 - out;
      ctx.fillStyle = C.accent;
      ctx.fillRect(x0 + 1, BY - 6 + lift, w - 2, 12);
      ctx.restore();
      const lb = phase(t, T.slide + 0.85, T.zooms, SPR.type, 0.3);
      riseRuns(ctx, [{ s: "200–233" }], rulerX(200, 1) + w / 2, BY + 64, { ...eqs, color: C.accent }, lb.in, lb.out, "center");
      const hd = phase(t, T.slide + 0.6, T.zooms, SPR.type, 0.3);
      riseRuns(
        ctx,
        [{ s: "24" }, { arrow: true }, { s: "28" }, { s: "   =   ", color: C.dim }, { s: "200" }, { arrow: true }, { s: "233" }],
        60, HY, { ...head, size: 112 }, hd.in, hd.out,
      );
    }

    // zoom ranges: unequal in millimeters, equal by ratio
    const z = phase(t, T.zooms, allOut, SPR.card, 0.3);
    const zp = z.in * (1 - z.out);
    if (zp > 0.001) {
      bracket(ctx, rulerX(24, 0) + 2, rulerX(70, 0) - 2, RUL.upY - 44 + upOff, C.ink, zp, 1, 3);
      bracket(ctx, rulerX(70, 0) + 2, rulerX(200, 0) - 2, RUL.upY - 44 + upOff, C.ink, zp, 1, 3);
      bracket(ctx, rulerX(24, 1) + 2, rulerX(70, 1) - 2, BY, C.ink, zp, -1, 3);
      bracket(ctx, rulerX(70, 1) + 2, rulerX(200, 1) - 2, BY, C.ink, zp, -1, 3);
    }
    const zl = phase(t, T.zooms + 0.2, allOut, SPR.type, 0.3);
    const zu1 = (rulerX(24, 0) + rulerX(70, 0)) / 2;
    const zu2 = (rulerX(70, 0) + rulerX(200, 0)) / 2;
    riseRuns(ctx, [{ s: "24–70: 46 mm" }], zu1, RUL.upY - 64, eqs, zl.in, zl.out, "center");
    riseRuns(ctx, [{ s: "70–200: 130 mm" }], zu2, RUL.upY - 64, eqs, zl.in, zl.out, "center");
    const zl2 = phase(t, T.zooms + 0.45, allOut, SPR.type, 0.3);
    const zc1 = (rulerX(24, 1) + rulerX(70, 1)) / 2;
    const zc2 = (rulerX(70, 1) + rulerX(200, 1)) / 2;
    const zb = { kind: "serif", size: 84, color: C.ink };
    riseRuns(ctx, [{ s: "24–70 " }, { s: "×2.9", color: C.accent }], zc1, BY + 82, zb, zl2.in, zl2.out, "center");
    riseRuns(ctx, [{ s: "70–200 " }, { s: "×2.9", color: C.accent }], zc2, BY + 82, zb, zl2.in, zl2.out, "center");
    const zh = phase(t, T.zooms + 0.7, allOut, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "Two zooms, one size: " }, { s: "×2.9", italic: true }, { s: "." }], 60, HY, head, zh.in, zh.out);
  }

  // ------------------------------------------------------------------ act D

  const stepsD = (preset) => {
    const s = [[T.wipe - 1, LN(24)]];
    for (const c of cues.ratchet1) s.push([c.t, LN(c.f), preset]);
    s.push([T.back, LN(24), preset === SPR.ui ? SPR.card : preset]);
    for (const c of cues.ratchet2) s.push([c.t, LN(c.f), preset]);
    return s;
  };
  const STEPS_D = stepsD(SPR.ui);
  const STEPS_D_TYPE = stepsD(SPR.type);
  const fD = (t) => Math.exp(springTo(t, STEPS_D));
  const shownD = (t) => Math.exp(springTo(t, STEPS_D_TYPE));
  // The setting on the lens: the last click's value, with no roll in between.
  function settingD(t) {
    let f = 24;
    for (const c of cues.ratchet1) if (t >= c.t) f = c.f;
    if (t >= T.back) f = 24;
    for (const c of cues.ratchet2) if (t >= c.t) f = c.f;
    return Math.round(f * 10) / 10;
  }

  function actD(ctx, t) {
    const toE = t < T.answer ? 0 : sp(t - T.answer, SPR.card);
    const r = lerpRect(FULL, PR, toE);
    const f = t < T.answer ? fD(t) : Math.exp(springTo(t, [[0, LN(fD(T.answer))], [T.answer, LN(200), SPR.card]]));
    // the curtain wipe reveals the picture from the bottom
    const wipe = ease.inOutCubic(clamp((t - T.wipe) / 0.42));
    if (wipe > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, H * (1 - wipe), W, H * wipe);
      ctx.clip();
      picture(ctx, r, f, t);
      ctx.restore();
      if (wipe < 1) {
        // the curtain's leading edge
        const yEdge = H * (1 - wipe);
        ctx.fillStyle = "#1d212a";
        ctx.fillRect(0, yEdge - 10, W, 10);
        ctx.fillStyle = "#3a404c";
        ctx.fillRect(0, yEdge - 2, W, 2);
      }
    }

    // the ruler along the bottom, with the playhead and the marks each click leaves
    const rOut = t < T.answer ? 0 : ease.inCubic(clamp((t - T.answer) / 0.4));
    if (rOut < 1) {
      ctx.save();
      ctx.translate(0, rOut * 160);
      ctx.globalAlpha = 1 - rOut;
      drawLower(ctx, t);
      const L = lowerLayout(t);
      for (const c of cues.ratchet1) {
        const p = sp(t - c.t, SPR.ui);
        if (p <= 0.001) continue;
        ctx.fillStyle = C.ink;
        ctx.fillRect(hudX(c.f) - 1.5, L.y - L.h / 2 - 8 - 40 * p, 3, 40 * p);
      }
      for (const c of cues.ratchet2) {
        const p = sp(t - c.t, SPR.ui);
        if (p <= 0.001) continue;
        ctx.fillStyle = C.accent;
        ctx.fillRect(hudX(c.f) - 3, L.y - L.h / 2 - 8 - 56 * p, 6, 56 * p);
      }
      const ph = sp(t - T.count, SPR.card);
      if (ph > 0.001 && t < T.answer + 0.5) {
        const x = hudX(shownD(t));
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.moveTo(x, L.y + L.h / 2 + 6);
        ctx.lineTo(x - 13 * ph, L.y + L.h / 2 + 6 + 20 * ph);
        ctx.lineTo(x + 13 * ph, L.y + L.h / 2 + 6 + 20 * ph);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // counter and captions
    const n = phase(t, T.count, T.answer - 0.15, SPR.type, 0.3);
    const dec = t >= T.back ? 1 : 0;
    bigNumber(ctx, settingD(t), t, n.in, n.out, dec ? 560 : 480, 300, 220, dec);
    const c1 = phase(t, T.count + 0.3, T.back - 0.1, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "+4 mm", color: C.accent }, { s: " per click" }], 150, 400, { kind: "mono", size: 58, color: C.ink }, c1.in, c1.out);
    const c2 = phase(t, T.back + 0.35, T.answer - 0.15, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "×1.17", color: C.accent }, { s: " per click" }], 150, 400, { kind: "mono", size: 58, color: C.ink }, c2.in, c2.out);
    const eqL = phase(t, T.equalLook, T.answer - 0.15, SPR.type, 0.3);
    const eqL2 = phase(t, T.equalLook + 0.3125, T.answer - 0.15, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "Equal ratios" }], 150, 560, { kind: "serif", size: 116, color: C.ink }, eqL.in, eqL.out);
    riseRuns(ctx, [{ s: "look equal.", italic: true }], 150, 680, { kind: "serif", size: 116, color: C.ink }, eqL2.in, eqL2.out);
  }

  // ------------------------------------------------------------------ act E

  function actE(ctx, t) {
    const inP = sp(t - T.answer - 0.08, SPR.card);
    const closing = t >= T.close;
    if (t < T.close + 1.0) {
      // left print slides in; right print is drawn by act D's handoff below
      const rl = { ...PL, x: lerp(-PL.w - 40, PL.x, inP) };
      picture(ctx, rl, flips(t, 24, 28, T.flipsE, false), t);
      if (t >= T.answer + 0.9) {
        picture(ctx, PR, flips(t, 200, 233.33, T.flipsE, false), t);
      }
      printLabels(ctx, t, ["24", "28"], ["200", "233"], T.flipsE[0], T.close, "×1.17");
      const base = { kind: "serif", size: 128, color: C.ink };
      const h1 = phase(t, T.swap, T.close);
      const h2 = phase(t, T.swap + 0.3125, T.close);
      riseRuns(ctx, [{ s: "Different mm." }], PL.x, 215, base, h1.in, h1.out);
      riseRuns(ctx, [{ s: "Same jump.", italic: true }], PR.x, 215, base, h2.in, h2.out);
    }
    if (closing) {
      const r = 1250 * (1 - ease.inOutCubic(clamp((t - T.close) / 0.6)));
      iris(ctx, r, 0.4 + r * 0.0007);
      const lk = phase(t, T.lockup, Infinity, SPR.type);
      const base = { kind: "serif", size: 150, color: C.ink };
      riseRuns(ctx, [{ s: "Count in " }, { s: "ratios", color: C.accent }, { s: "," }], W / 2, 500, base, lk.in, 0, "center");
      const lk2 = phase(t, T.lockup + 0.3125, Infinity, SPR.type);
      riseRuns(ctx, [{ s: "not millimeters.", italic: true }], W / 2, 670, base, lk2.in, 0, "center");
    }
  }

  // ------------------------------------------------------------------ the frame

  // res: device pixels per design pixel (2 renders 3840 x 2160 from the same drawing).
  function draw(ctx, t, res = 1) {
    t = clamp(t, 0, DURATION);
    ctx.save();
    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);
    if (t < T.strip + 0.8) actA(ctx, t);
    if (t >= T.strip && t < T.ruler + 1.2) actB(ctx, t);
    if (t >= T.ruler && t < T.wipe + 0.5) actC(ctx, t);
    if (t >= T.wipe && t < T.answer + 1.0) actD(ctx, t);
    if (t >= T.answer) actE(ctx, t);
    ctx.restore();
  }

  // One output frame with motion blur: subframes inside a 180 degree shutter, averaged.
  function drawBlurred(ctx, scratch, t, n = 4, res = 1) {
    const sctx = scratch.getContext("2d");
    const shutter = 0.5 / FPS;
    for (let i = 0; i < n; i++) {
      const ts = t + ((i + 0.5) / n - 0.5) * shutter;
      draw(sctx, ts, res);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1 / (i + 1);
      ctx.drawImage(scratch, 0, 0);
      ctx.restore();
    }
  }

  FM.film = { W, H, C, duration: DURATION, fps: FPS, draw, drawBlurred, aov };
})();
