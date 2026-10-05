// One Arcminute: the picture. Every frame is drawn from the time t alone.
(function () {
  const FM = globalThis.FM;
  const K = FM.kit;
  const { clamp, lerp, unlerp, ease, sp, SPR, springTo, inOut, phase, runs, riseRuns, odometer, font, TAU } = K;
  const { T, cues, BEAT, DURATION, FPS } = FM.clock;
  const O = FM.optics;
  const SC = FM.scene;

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

  // ------------------------------------------------------------------ helpers

  const lerpRect = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });
  const FULL = { x: 0, y: 0, w: W, h: H };

  // The photograph in rect r. The lens axis (and the horizon) sits at 39% of the height,
  // as with a shifted lens, so the camera stays level and the dominoes stay upright.
  function picture(ctx, r, cam) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    const S = r.w / 36;
    const view = { cx: r.x + r.w / 2, cy: r.y + r.h * 0.39, S };
    SC.draw(ctx, view, cam, { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h });
    ctx.restore();
    return view;
  }

  // A nine-blade iris. r is the aperture's circumradius; r >= 1250 is fully open.
  function iris(ctx, r, rot, cx = W / 2, cy = H / 2, colors = ["#14171d", "#181b22"]) {
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
      ctx.fillStyle = colors[i % 2];
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

  // A rounded chip with mono text. Anchored by its left edge (or right).
  function chip(ctx, text, x, yMid, p, q, opts = {}) {
    if (p <= 0.001 || q >= 0.999) return;
    const size = opts.size || 54;
    const parts = text.split(" ").flatMap((s, i) => (i ? [{ gap: 0.28 }, { s }] : [{ s }]));
    const base = { kind: "mono", size, weight: 600, color: opts.color || C.ground };
    const tw = runs(ctx, parts, 0, 0, base, false);
    const padX = size * 0.42;
    const w = tw + padX * 2;
    const h = size * 1.34;
    const x0 = opts.align === "right" ? x - w : opts.align === "center" ? x - w / 2 : x;
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

  // A label that flips through values: the old one leaves upward through a mask while the
  // new one rises in. values: [[t, text], ...]. Draws runs built by make(text).
  function flipLabel(ctx, t, values, x, y, base, make, align = "left", dur = 0.26) {
    let cur = -1;
    for (let i = 0; i < values.length; i++) if (t >= values[i][0]) cur = i;
    for (let i = Math.max(0, cur - 1); i <= cur; i++) {
      if (i < 0) continue;
      const tIn = values[i][0];
      const tOut = i + 1 < values.length ? values[i + 1][0] : Infinity;
      const p = i === 0 ? sp(t - tIn, SPR.type) : ease.outCubic(clamp((t - tIn) / dur));
      const q = t < tOut ? 0 : ease.inCubic(clamp((t - tOut) / dur));
      riseRuns(ctx, make(values[i][1]), x, y, base, p, q, align);
    }
  }

  // ------------------------------------------------------------------ act A

  // Focus is animated in lens extension (1/z), the aperture in stops.
  const focusA = (t) =>
    1 /
    springTo(t, [
      [0, 1 / O.FOCUS],
      [T.rack1, 1 / O.ZS[0], SPR.card],
      [T.rack2, 1 / O.ZS[7], SPR.card],
      [T.rack3, 1 / O.FOCUS, SPR.card],
    ]);
  const stopA = (t) => springTo(t, [[0, 1], ...T.stopsA.map((tt, i) => [tt, 2 + i, SPR.snap])]);
  const camA = (t) => ({ s: focusA(t), N: O.stopN(stopA(t)) });

  function actA(ctx, t) {
    const out = t < T.cone ? 0 : 1;
    if (!out) picture(ctx, FULL, camA(t));

    // the iris opens
    if (t < 0.9) {
      const r = 1250 * sp(t - 0.04, [110, 2 * Math.sqrt(110)]);
      iris(ctx, r, 0.4 + r * 0.0007);
    }

    // the f-number
    const fv = [[T.fLabel, "1.4"], ...T.stopsA.map((tt, i) => [tt, O.LABELS[2 + i]])];
    const fOut = phase(t, 0, T.cone - 0.3, SPR.type, 0.3);
    if (fOut.out < 0.999) {
      ctx.save();
      const base = { kind: "serif", size: 150, color: C.ink };
      flipLabel(ctx, t, fv, 150, 215, base, (s) => [{ s: "f/", italic: true }, { s }]);
      ctx.restore();
    }

    const base = { kind: "serif", size: 92, color: C.ink };
    const h1 = phase(t, T.headA, T.stopsA[0] - 0.2);
    riseRuns(ctx, [{ s: "A lens focuses at " }, { s: "one", italic: true }, { s: " distance." }], 150, 330, base, h1.in, h1.out);
    const w1 = phase(t, T.why, T.cone - 0.3);
    riseRuns(ctx, [{ s: "So why are all eight " }, { s: "sharp?", italic: true }], 150, 330, base, w1.in, w1.out);
  }

  // ------------------------------------------------------------------ act B

  // The side view is schematic: a thin lens of focal length fd px, a point u px in front of it.
  const B = { ax: 620, lx: 1040, la: 250, fd: 170, uF: 578, uNear: 391, uFar: 952 };
  const vOf = (u) => (B.fd * u) / (u - B.fd);
  B.xs = B.lx + vOf(B.uF);
  const PANEL = { x: 1400, y: B.ax - 135, w: 480, h: 270 };

  const uB = (t) =>
    springTo(t, [
      [0, B.uF],
      [T.nearer, B.uNear, SPR.card],
      [T.farther, B.uFar, SPR.card],
      [T.irisBOpen, B.uF, SPR.card],
    ]);
  const apB = (t) => springTo(t, [[0, 1], [T.irisB, 0.3, SPR.card], [T.irisBOpen, 1, SPR.card]]);
  function opticsB(t) {
    const u = uB(t);
    const v = vOf(u);
    const a = B.la * apB(t);
    const vs = B.xs - B.lx;
    return { u, v, a, xP: B.lx - u, xI: B.lx + v, disc: (2 * a * Math.abs(v - vs)) / v };
  }

  // A lens as a biconvex outline centered at (x, y), half-height hh, center thickness th.
  function lensPath(ctx, x, y, hh, th) {
    const sag = Math.max(0.5, th / 2);
    const R = (hh * hh + sag * sag) / (2 * sag);
    const a = Math.asin(clamp(hh / R, -1, 1));
    ctx.beginPath();
    ctx.arc(x - sag + R, y, R, Math.PI - a, Math.PI + a);
    ctx.arc(x + sag - R, y, R, -a, a);
    ctx.closePath();
  }

  function drawLens(ctx, x, y, hh, alpha) {
    if (alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    lensPath(ctx, x, y, hh, 54);
    ctx.fillStyle = "rgba(120,150,210,0.10)";
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // Iris blades seen side-on: two bars closing in from the rim to half-opening `a`.
  function irisSide(ctx, x, y, a, rim, alpha) {
    if (alpha <= 0.001 || a >= rim - 0.5) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const s of [-1, 1]) {
      const y0 = y + s * a;
      const y1 = y + s * (rim + 26);
      ctx.fillStyle = "#1a1e27";
      ctx.fillRect(x - 7, Math.min(y0, y1), 14, Math.abs(y1 - y0));
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 7, Math.min(y0, y1), 14, Math.abs(y1 - y0));
    }
    ctx.restore();
  }

  // A domino seen from the side, its face toward the lens, with the pip at (x, y).
  function dominoSide(ctx, x, y, alpha) {
    if (alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#e9dfc6";
    ctx.beginPath();
    ctx.roundRect(x - 24, y - 118, 24, 236, 6);
    ctx.fill();
    ctx.fillStyle = "#b9ab8b";
    ctx.fillRect(x - 24, y - 118 + 6, 7, 224);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(x + 1, y, 7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // The cone of light from a point at (xP, y) through a lens of half-aperture a at lx,
  // meeting at xI and stopped by the sensor at xs. p0: object side drawn, p1: image side.
  function coneB(ctx, o, y, p0, p1, alpha) {
    if (alpha <= 0.001 || p0 <= 0.001) return;
    const { xP, a, xI } = o;
    const lx = B.lx;
    const xs = B.xs;
    ctx.save();
    ctx.globalAlpha = alpha;
    // object side: from the point to the lens
    const xe = lerp(xP, lx, p0);
    const ae = a * p0;
    ctx.fillStyle = C.tint;
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath();
    ctx.moveTo(xP, y);
    ctx.lineTo(xe, y - ae);
    ctx.lineTo(xe, y + ae);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xP, y);
    ctx.lineTo(xe, y - ae);
    ctx.moveTo(xP, y);
    ctx.lineTo(xe, y + ae);
    ctx.stroke();
    if (p1 > 0.001) {
      // image side: from the lens rim toward xI, stopped at the sensor
      const xEnd = lerp(lx, xs, p1);
      const yAt = (x) => a * (1 - (x - lx) / (xI - lx));
      const pts = [];
      const xm = Math.min(xI, xEnd);
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = C.tint;
      ctx.beginPath();
      ctx.moveTo(lx, y - a);
      ctx.lineTo(xm, y - yAt(xm));
      ctx.lineTo(xm, y + yAt(xm));
      ctx.lineTo(lx, y + a);
      ctx.closePath();
      ctx.fill();
      if (xEnd > xI) {
        ctx.beginPath();
        ctx.moveTo(xI, y);
        ctx.lineTo(xEnd, y - yAt(xEnd));
        ctx.lineTo(xEnd, y + yAt(xEnd));
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (const s of [-1, 1]) {
        ctx.moveTo(lx, y + s * a);
        ctx.lineTo(xEnd, y + s * yAt(xEnd));
      }
      ctx.stroke();
      // where the cone would have met, behind the sensor
      if (xI > xs + 2 && p1 > 0.98) {
        ctx.setLineDash([6, 8]);
        ctx.strokeStyle = C.dim;
        ctx.beginPath();
        for (const s of [-1, 1]) {
          ctx.moveTo(xs, y + s * yAt(xs));
          ctx.lineTo(xI, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      pts.length = 0;
    }
    ctx.restore();
  }

  // What the sensor records: a spot of light in the aperture's shape.
  function spot(ctx, x, y, d, N, alpha) {
    if (alpha <= 0.001) return;
    const ap = SC.aperturePath(N);
    const dd = Math.max(d, 9);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const a = clamp(0.95 * Math.pow(9 / dd, 0.4), 0.62, 0.95) * alpha;
    SC.bokeh(ctx, ctx.getTransform(), ap, x, y, dd, [255, 238, 205], a);
    ctx.restore();
  }

  function actB(ctx, t) {
    const o = opticsB(t);
    const ax = B.ax;
    const leave = t < T.grid - 0.35 ? 0 : ease.inCubic(clamp((t - (T.grid - 0.35)) / 0.5));
    const pIn = sp(t - T.cone, SPR.card);

    // the picture shrinks into the panel, then gives way to the sensor's view of one point
    const zoomC = t < T.grid ? 0 : sp(t - T.grid, SPR.card);
    const r = lerpRect(lerpRect(FULL, PANEL, pIn), FULL, zoomC);
    if (zoomC < 0.999) {
      const dark = ease.inOutCubic(clamp((t - T.burst) / 0.9));
      if (dark < 0.999) picture(ctx, r, { s: O.FOCUS, N: 16 });
      ctx.save();
      ctx.fillStyle = "#07090e";
      ctx.globalAlpha = dark;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
    const sc = r.w / PANEL.w;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const spotOn = clamp((t - (T.fold + 0.35)) / 0.25) * (1 - clamp((t - (T.grid + 0.35)) / 0.3));
    spot(ctx, cx, cy, o.disc * sc, 1.414 / apB(t), spotOn);

    // labels on the panel
    const lp = phase(t, T.domino, T.grid - 0.35, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "on the sensor" }], PANEL.x, PANEL.y - 30, { kind: "mono", size: 34, color: C.dim }, lp.in * (1 - zoomC), lp.out);

    // the side view
    if (leave < 0.999) {
      ctx.save();
      ctx.translate(-leave * 900, 0);
      ctx.globalAlpha = 1 - leave;
      const ap = clamp((t - T.cone - 0.1) / 0.5);
      // axis
      ctx.strokeStyle = C.rule;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, ax);
      ctx.lineTo(lerp(60, B.xs, ease.outCubic(ap)), ax);
      ctx.stroke();
      // lens and sensor
      const lensP = sp(t - (T.cone + 0.15), SPR.card);
      drawLens(ctx, B.lx, ax, 250 * lerp(0.6, 1, lensP), lensP);
      irisSide(ctx, B.lx, ax, o.a, B.la, 1);
      const sensP = sp(t - (T.cone + 0.3), SPR.card);
      if (sensP > 0.001) {
        ctx.fillStyle = C.ink;
        const sh = 170 * sensP;
        ctx.fillRect(B.xs - 4, ax - sh, 8, sh * 2);
      }
      // the focus mark on the axis
      const fm = phase(t, T.fold + 0.6, T.grid - 0.4, SPR.ui, 0.3);
      if (fm.in > 0.001) {
        const x = B.lx - B.uF;
        ctx.save();
        ctx.globalAlpha *= clamp(fm.in * 1.3) * (1 - fm.out);
        ctx.strokeStyle = C.dim;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, ax + 134);
        ctx.lineTo(x, ax + 158);
        ctx.stroke();
        font(ctx, "mono", 34);
        ctx.fillStyle = C.dim;
        ctx.textAlign = "center";
        ctx.fillText("in focus", x, ax + 202);
        ctx.restore();
      }
      // the domino and its light
      const dp = sp(t - T.domino, SPR.card);
      dominoSide(ctx, o.xP - (1 - dp) * 60, ax, clamp(dp * 1.4));
      if (t >= T.burst && t < T.burst + 1.2) {
        const p = clamp((t - T.burst) / 1.1);
        ctx.save();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2;
        ctx.globalAlpha *= (1 - p) * 0.8;
        ctx.beginPath();
        for (let i = 0; i < 26; i++) {
          const ang = (i / 26) * TAU + 0.12;
          const r1 = 30 + 520 * ease.outCubic(p);
          const r0 = Math.max(14, r1 - 160);
          ctx.moveTo(o.xP + Math.cos(ang) * r0, ax + Math.sin(ang) * r0);
          ctx.lineTo(o.xP + Math.cos(ang) * r1, ax + Math.sin(ang) * r1);
        }
        ctx.stroke();
        ctx.restore();
      }
      const p0 = sp(t - (T.burst + 0.2), SPR.long);
      const p1 = sp(t - T.fold, SPR.card);
      coneB(ctx, o, ax, p0, p1, 1);
      // the disc the sensor cuts from the cone
      const dv = clamp((o.disc - 6) / 14) * clamp((t - T.nearer) / 0.3);
      if (dv > 0.001) {
        vdim(ctx, B.xs + 26, ax - o.disc / 2, ax + o.disc / 2, C.ink, dv);
      }
      ctx.restore();
    }

    // captions
    const base = { kind: "serif", size: 84, color: C.ink };
    const lines = [
      [T.burst, T.fold, [{ s: "Light leaves a point as a " }, { s: "cone", italic: true }, { s: "." }]],
      [T.fold, T.nearer, [{ s: "The lens folds it back to a " }, { s: "point", italic: true }, { s: "." }]],
      [T.nearer, T.farther, [{ s: "Nearer, it lands as a " }, { s: "disc", italic: true }, { s: "." }]],
      [T.farther, T.onlyOne, [{ s: "Farther, a " }, { s: "disc", italic: true }, { s: " again." }]],
      [T.onlyOne, T.irisB, [{ s: "Only " }, { s: "one", italic: true }, { s: " distance makes a point." }]],
      [T.irisB, T.grid - 0.3, [{ s: "A smaller aperture, a " }, { s: "smaller", italic: true }, { s: " disc." }]],
    ];
    for (const [a, b, parts] of lines) {
      const ph = phase(t, a + 0.05, b - 0.2, SPR.type, 0.25);
      riseRuns(ctx, parts, 150, 250, base, ph.in, ph.out);
    }
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
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    const head = Math.min(16, Math.abs(y1 - y0) * 0.3);
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

  // A horizontal dimension line from x0 to x1 at y.
  function hdim(ctx, x0, x1, y, color, alpha = 1, width = 2.5) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    const head = Math.min(16, Math.abs(x1 - x0) * 0.3);
    ctx.beginPath();
    ctx.moveTo(x0 + head * 0.6, y);
    ctx.lineTo(x1 - head * 0.6, y);
    ctx.stroke();
    if (head > 3) {
      arrowHead(ctx, x0, y, -1, 0, head);
      arrowHead(ctx, x1, y, 1, 0, head);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ act C

  // The mosaics. On screen one photosite is PX wide (6 µm, so 12 px per µm).
  const PX = 72;
  const UM = PX / 6;
  const WARM = [255, 238, 205];

  // Where the mosaic's origin (the center of cell 0,0) sits, and its pitch.
  function mosaicFrame(t) {
    const z = t < T.grid ? 0 : sp(t - T.grid, SPR.card);
    const zoomIn = ease.inOutCubic(clamp((t - T.grid) / 0.95));
    const pitch = Math.exp(lerp(Math.log(7), Math.log(PX), zoomIn));
    const pan = sp(t - (T.grid + 0.95), SPR.card);
    const x = lerp(lerp(PANEL.x + PANEL.w / 2, W / 2, z), W / 2 - 6 * PX, pan);
    const y = lerp(PANEL.y + PANEL.h / 2, H / 2, z);
    return { x, y, pitch, alpha: clamp((t - T.grid - 0.1) / 0.45) };
  }

  // The three spots: a focused point, a disc smaller than a photosite, a bigger disc.
  // Diameters in µm, positions in cells from the origin.
  const SPECIMENS = [
    { i: 0, d: 2, t: T.dot, label: "point" },
    { i: 6, d: 4.4, t: T.smallDisc, label: "small disc" },
    { i: 12, d: 22, t: T.bigDisc, label: "bigger disc" },
  ];

  // Photosites are squares on a grid. A film grain is one flake of silver halide per cell,
  // an angular polygon with its own size and turn. Cones sit on a jittered hexagonal grid.
  function pixelPoly(fr, i, j) {
    const p = fr.pitch;
    const h = p * 0.465;
    const x = fr.x + i * p;
    const y = fr.y + j * p;
    return [[x - h, y - h], [x + h, y - h], [x + h, y + h], [x - h, y + h]];
  }

  function grainPoly(fr, i, j, scale, grow) {
    const p = fr.pitch * scale;
    const cx = fr.x + (i + (K.hash(i, j, 21) - 0.5) * 0.32) * p;
    const cy = fr.y + (j + (K.hash(i, j, 22) - 0.5) * 0.32) * p;
    const R = p * (0.34 + 0.22 * K.hash(i, j, 23)) * grow;
    const n = 5 + Math.floor(K.hash(i, j, 24) * 3);
    const rot = K.hash(i, j, 25) * TAU;
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = rot + (k / n) * TAU + (K.hash(i, j, 30 + k) - 0.5) * 0.5;
      const r = R * (0.72 + 0.28 * K.hash(i, j, 40 + k));
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  function inPoly(pts, x, y) {
    let inside = false;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const [xa, ya] = pts[a];
      const [xb, yb] = pts[b];
      if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
    }
    return inside;
  }

  // How the light of the spots divides among cells. find(x, y) names the cell under a point.
  function shares(spots, pitch, find) {
    const out = new Map();
    for (const s of spots) {
      if (s.q <= 0.001) continue;
      const n = s.dpx < pitch * 0.75 ? 1 : 15;
      let total = 0;
      const local = new Map();
      for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) {
          const sx = n === 1 ? 0 : ((a + 0.5) / n - 0.5) * s.dpx;
          const sy = n === 1 ? 0 : ((b + 0.5) / n - 0.5) * s.dpx;
          if (n > 1 && sx * sx + sy * sy > (s.dpx * s.dpx) / 4) continue;
          total++;
          const key = find(s.x + sx, s.y + sy);
          if (key) local.set(key, (local.get(key) || 0) + 1);
        }
      }
      // a spread spot is dimmer per cell; a cell holding a whole spot is full
      const gain = n === 1 ? 1 : 4.2;
      for (const [k, v] of local) out.set(k, (out.get(k) || 0) + clamp((v / total) * gain) * s.q);
    }
    return out;
  }

  const range = (lo, hi, o, p) => [Math.floor((lo - o) / p) - 1, Math.ceil((hi - o) / p) + 1];

  function drawPixels(ctx, fr, lit, alpha, bb) {
    if (alpha <= 0.001 || fr.pitch < 9) return;
    const [i0, i1] = range(bb.x0, bb.x1, fr.x, fr.pitch);
    const [j0, j1] = range(bb.y0, bb.y1, fr.y, fr.pitch);
    const bayer = ["#271c21", "#1c2620", "#1c2620", "#1b2031"];
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const pts = pixelPoly(fr, i, j);
        ctx.fillStyle = bayer[(((i % 2) + 2) % 2) + 2 * (((j % 2) + 2) % 2)];
        ctx.fillRect(pts[0][0], pts[0][1], pts[1][0] - pts[0][0], pts[2][1] - pts[0][1]);
        const v = lit.get(i + "," + j);
        if (v) {
          ctx.fillStyle = `rgba(255,238,205,${clamp(v)})`;
          ctx.fillRect(pts[0][0], pts[0][1], pts[1][0] - pts[0][0], pts[2][1] - pts[0][1]);
        }
      }
    }
    ctx.restore();
  }

  function drawGrains(ctx, fr, scale, grow, lit, alpha, bb) {
    const p = fr.pitch * scale;
    if (alpha <= 0.001 || p < 6) return;
    const [i0, i1] = range(bb.x0, bb.x1, fr.x, p);
    const [j0, j1] = range(bb.y0, bb.y1, fr.y, p);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#1e1913";
    ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const gr = grow(i, j);
        if (gr <= 0.001) continue;
        const pts = grainPoly(fr, i, j, scale, gr);
        ctx.beginPath();
        pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        const tone = K.hash(i, j, 26);
        ctx.fillStyle = `rgb(${92 + tone * 34},${98 + tone * 34},${110 + tone * 36})`;
        ctx.fill();
        // one lighter facet
        ctx.fillStyle = "rgba(225,230,240,0.22)";
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[2][0], pts[2][1]);
        ctx.closePath();
        ctx.fill();
        const v = lit.get(i + "," + j);
        if (v) {
          ctx.fillStyle = `rgba(255,238,205,${clamp(v)})`;
          ctx.beginPath();
          pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function conePos(fr, pitch, i, j) {
    const rowH = (pitch * Math.sqrt(3)) / 2;
    const off = (((j % 2) + 2) % 2) * 0.5;
    return [fr.x + (i + off + (K.hash(i, j, 9) - 0.5) * 0.12) * pitch, fr.y + (j + (K.hash(i, j, 10) - 0.5) * 0.12) * rowH];
  }

  function findCone(fr, pitch, x, y) {
    const rowH = (pitch * Math.sqrt(3)) / 2;
    const jc = Math.round((y - fr.y) / rowH);
    let best = null;
    let bd = Infinity;
    for (let j = jc - 1; j <= jc + 1; j++) {
      const off = (((j % 2) + 2) % 2) * 0.5;
      const ic = Math.round((x - fr.x) / pitch - off);
      for (let i = ic - 1; i <= ic + 1; i++) {
        const [cx, cy] = conePos(fr, pitch, i, j);
        const d = Math.hypot(x - cx, y - cy);
        if (d < bd) {
          bd = d;
          best = i + "," + j;
        }
      }
    }
    return bd < pitch * 0.46 ? best : null;
  }

  function drawCones(ctx, fr, pitch, appear, lit, alpha, bb) {
    if (alpha <= 0.001 || pitch < 5) return;
    const rowH = (pitch * Math.sqrt(3)) / 2;
    const [j0, j1] = range(bb.y0, bb.y1, fr.y, rowH);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#130e10";
    ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
    for (let j = j0; j <= j1; j++) {
      const [i0, i1] = range(bb.x0, bb.x1, fr.x, pitch);
      for (let i = i0 - 1; i <= i1; i++) {
        const [x, y] = conePos(fr, pitch, i, j);
        const s = appear(Math.hypot(x - W / 2, y - H / 2) / 900);
        if (s <= 0.001) continue;
        const r = pitch * 0.44 * s;
        const L = K.hash(i, j, 11) < 0.64;
        ctx.fillStyle = L ? "#3a2b2c" : "#29342a";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = L ? "rgba(214,140,120,0.2)" : "rgba(150,190,120,0.18)";
        ctx.beginPath();
        ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.5, 0, TAU);
        ctx.fill();
        const v = lit.get(i + "," + j);
        if (v) {
          ctx.fillStyle = `rgba(255,238,205,${clamp(v)})`;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // A spot of light landing: grows in, then thins to a dashed outline once the cells read it.
  function landing(ctx, x, y, d, p, q, alpha = 1) {
    if (p <= 0.001 || alpha <= 0.001) return;
    const r = Math.max(4, (d / 2) * p);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,238,205,${0.75 * (1 - q)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha * clamp(p * 2);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.setLineDash(q > 0.5 ? [5, 5] : []);
    ctx.beginPath();
    ctx.arc(x, y, r + 1, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // The eye in section, looking left: cornea, iris, lens, and the retina with its fovea.
  const EYE = { x: 1360, y: 600, r: 230 };
  EYE.fovea = [EYE.x + EYE.r - 6, EYE.y];
  EYE.node = [EYE.x - 150, EYE.y];
  function drawEye(ctx, alpha) {
    if (alpha <= 0.001) return;
    const { x, y, r } = EYE;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = C.ink;
    ctx.fillStyle = "rgba(28,44,77,0.35)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI + 0.42, Math.PI - 0.42, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - r + 40, y, 105, Math.PI * 0.62, Math.PI * 1.38);
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.fillRect(x - r + 38, y - 104, 8, 62);
    ctx.fillRect(x - r + 38, y + 42, 8, 62);
    ctx.fillStyle = "rgba(120,150,210,0.14)";
    lensPath(ctx, EYE.node[0], y, 60, 52);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#a8645a";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, y, r - 8, -Math.PI * 0.62, Math.PI * 0.62, false);
    ctx.stroke();
    ctx.restore();
  }

  // The magnifier the retina shrinks into, pinned to the fovea.
  const BUB = { x: 1700, y: 300, r: 140 };

  function actC(ctx, t) {
    const fr = mosaicFrame(t);
    const g = ease.inOutCubic(clamp((t - T.grain) / 0.7));
    const scale = lerp(1, 1.9, sp(t - T.fastFilm, SPR.card));
    const mc = ease.inOutCubic(clamp((t - T.cones) / 0.7));
    const bub = t < T.eye ? 0 : sp(t - T.eye, SPR.card);
    const bubGone = ease.inCubic(clamp((t - (T.print - 0.1)) / 0.4));

    // the mosaic shrinks into a magnifier at the eye's fovea
    const ms = lerp(1, 0.42, bub);
    const cc = [lerp(W / 2, BUB.x, bub), lerp(H / 2, BUB.y, bub)];
    const clipR = lerp(1300, BUB.r, bub);
    const mfr = { x: cc[0] + (fr.x - W / 2) * ms, y: cc[1] + (fr.y - H / 2) * ms, pitch: fr.pitch * ms };
    const bb = { x0: Math.max(0, cc[0] - clipR), y0: Math.max(0, cc[1] - clipR), x1: Math.min(W, cc[0] + clipR), y1: Math.min(H, cc[1] + clipR) };

    const spots = SPECIMENS.map((s) => ({
      ...s,
      x: mfr.x + s.i * fr.pitch * ms,
      y: mfr.y,
      dpx: s.d * UM * (fr.pitch / PX) * ms,
      p: sp(t - s.t, SPR.ui),
      q: ease.inOutCubic(clamp((t - s.t - 0.35) / 0.35)),
    }));

    const mosaicA = fr.alpha * (1 - bubGone);
    if (mosaicA > 0.001) {
      ctx.save();
      if (bub > 0.001) {
        ctx.beginPath();
        ctx.arc(cc[0], cc[1], clipR, 0, TAU);
        ctx.clip();
      }
      ctx.globalAlpha = mosaicA;
      if (g < 0.999) {
        const lit = shares(spots, mfr.pitch, (x, y) => Math.round((x - mfr.x) / mfr.pitch) + "," + Math.round((y - mfr.y) / mfr.pitch));
        drawPixels(ctx, mfr, lit, 1 - g, bb);
      }
      if (g > 0.001 && mc < 0.999) {
        const grow = (i, j) => clamp(g * 1.7 - K.hash(i, j, 27) * 0.7);
        const lit = shares(spots, mfr.pitch * scale, (x, y) => {
          const p = mfr.pitch * scale;
          const ic = Math.round((x - mfr.x) / p);
          const jc = Math.round((y - mfr.y) / p);
          for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
            if (inPoly(grainPoly(mfr, ic + di, jc + dj, scale, 1), x, y)) return ic + di + "," + (jc + dj);
          }
          return null;
        });
        drawGrains(ctx, mfr, scale, grow, lit, g * (1 - mc), bb);
      }
      if (mc > 0.001) {
        const pitch = 76 * (fr.pitch / PX) * ms;
        const lit = shares(spots, pitch, (x, y) => findCone(mfr, pitch, x, y));
        drawCones(ctx, mfr, pitch, (dist) => clamp((mc * 1.6 - dist * 0.6) * 1.2), lit, clamp(mc * 1.5), bb);
      }
      for (const s of spots) landing(ctx, s.x, s.y, s.dpx, s.p, s.q, 1 - bub);
      ctx.restore();
    }

    // the magnifier's rim and its line to the fovea, and the eye around it
    if (bub > 0.001 && bubGone < 0.999) {
      ctx.save();
      ctx.globalAlpha = clamp(bub * 1.5) * (1 - bubGone);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cc[0], cc[1], clipR, 0, TAU);
      ctx.stroke();
      const [fx, fy] = EYE.fovea;
      const ang = Math.atan2(fy - cc[1], fx - cc[0]);
      ctx.globalAlpha *= clamp((bub - 0.6) / 0.4);
      ctx.beginPath();
      ctx.moveTo(cc[0] + Math.cos(ang) * clipR, cc[1] + Math.sin(ang) * clipR);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fx, fy, 9, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    const eyeA = clamp((bub - 0.35) / 0.5) * (1 - ease.inCubic(clamp((t - (T.shrink - 0.1)) / 0.5)));
    drawEye(ctx, eyeA);
    chain(ctx, t);

    // labels under the specimens
    spots.forEach((s) => {
      const ph = phase(t, s.t + 0.15, T.grain - 0.25, SPR.type, 0.25);
      riseRuns(ctx, [{ s: s.label }], s.x, H / 2 + 150, { kind: "mono", size: 40, color: C.ink }, ph.in, ph.out, "center");
    });

    // one photosite's width
    const pw = phase(t, T.grid + 1.1, T.grain - 0.2, SPR.ui, 0.25);
    if (pw.in > 0.001) {
      const x0 = fr.x - fr.pitch / 2;
      const y = fr.y - fr.pitch / 2 - 26;
      hdim(ctx, x0 + 3, x0 + fr.pitch - 3, y, C.ink, clamp(pw.in * 1.3) * (1 - pw.out), 2.5);
      chip(ctx, "6 µm", x0 + fr.pitch / 2, y - 52, pw.in, pw.out, { size: 44, align: "center", fill: C.ink });
    }
    // the cones' spacing, in the magnifier
    const cs = phase(t, T.eye + 0.5, T.print - 0.15, SPR.ui, 0.25);
    chip(ctx, "2.5 µm apart", BUB.x, BUB.y + BUB.r + 50, cs.in, cs.out, { size: 40, align: "center", fill: C.ink });

    // captions
    const base = { kind: "serif", size: 84, color: C.ink };
    const lines = [
      [T.grid + 0.3, T.dot, [{ s: "A sensor counts light in " }, { s: "pixels", italic: true }, { s: "." }]],
      [T.dot, T.smallDisc, [{ s: "A point lights one pixel." }]],
      [T.smallDisc, T.bigDisc, [{ s: "A smaller disc lights it " }, { s: "the same", italic: true }, { s: "." }]],
      [T.bigDisc, T.grain, [{ s: "Only a bigger one " }, { s: "shows", italic: true }, { s: "." }]],
      [T.grain, T.fastFilm, [{ s: "Film: grains of " }, { s: "silver", italic: true }, { s: "." }]],
      [T.fastFilm, T.cones, [{ s: "Faster film, " }, { s: "bigger", italic: true }, { s: " grains." }]],
      [T.cones, T.arcmin, [{ s: "Your eye: a mosaic of " }, { s: "cones", italic: true }, { s: "." }]],
    ];
    for (const [a, b, parts] of lines) {
      const ph = phase(t, a + 0.05, b - 0.2, SPR.type, 0.25);
      riseRuns(ctx, parts, 150, 190, base, ph.in, ph.out);
    }
  }

  // ------------------------------------------------------------------ the chain: eye, print, sensor

  const PRINT = { x: 180, y: 470, w: 390, h: 260 }; // a 15 x 10 cm print, held 40 cm from the eye

  // The dot the eye cannot split, from the print to the sensor and into its photosites.
  // Drawn wider than life (r = 15 px on the held print) so it can be seen; after the dive
  // its radius is 15 µm at 12 px per µm, so the photosites under it are 6 µm.
  const COC_R = 15 * UM;
  function diveRing(t) {
    const fwd = sp(t - T.shrink, SPR.card);
    const shrink = sp(t - (T.shrink + 1.25), SPR.card);
    const dive = ease.inOutCubic(clamp((t - (T.coc - 0.4)) / 0.75));
    const r0 = 15 * lerp(1, 2, fwd) * lerp(1, 1 / 4.17, shrink);
    const z = Math.exp(dive * Math.log(COC_R / ((15 * 2) / 4.17)));
    const cx = lerp(PRINT.x + PRINT.w / 2, 820, fwd);
    const cy = lerp(PRINT.y + PRINT.h / 2, 640, fwd);
    return { x: lerp(cx, W / 2, dive), y: lerp(cy, 600, dive), r: r0 * z, z, dive, fwd, shrink };
  }
  const chainOut = (t) => (t < T.coc - 0.3 ? 0 : ease.inCubic(clamp((t - (T.coc - 0.3)) / 0.45)));

  function chain(ctx, t) {
    if (t < T.arcmin - 0.1 || t > T.coc + 0.5) return;
    const o = 1 - chainOut(t);
    const nx = EYE.node[0];
    const ny = EYE.node[1];
    const [fx, fy] = EYE.fovea;
    const px = PRINT.x + PRINT.w / 2;
    const half = 15; // the wedge's half-width at the print, drawn wide so it can be seen
    // the 1' wedge from two cones through the lens
    const wp = sp(t - T.arcmin, SPR.long);
    const reach = lerp(nx, px, sp(t - T.print, SPR.card));
    const yAt = (x) => (half * (nx - x)) / (nx - px);
    ctx.save();
    ctx.globalAlpha = o * (1 - ease.inCubic(clamp((t - (T.shrink - 0.1)) / 0.5)));
    if (wp > 0.001) {
      ctx.fillStyle = "rgba(255,106,26,0.22)";
      ctx.beginPath();
      ctx.moveTo(fx, fy - yAt(fx) * wp);
      ctx.lineTo(fx, fy + yAt(fx) * wp);
      ctx.lineTo(nx, ny);
      ctx.closePath();
      ctx.fill();
      if (t >= T.print) {
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(reach, ny - yAt(reach));
        ctx.lineTo(reach, ny + yAt(reach));
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fx, fy - yAt(fx) * wp);
      ctx.lineTo(nx, ny);
      ctx.lineTo(Math.min(nx, reach), ny + yAt(Math.min(nx, reach)));
      ctx.moveTo(fx, fy + yAt(fx) * wp);
      ctx.lineTo(nx, ny);
      ctx.lineTo(Math.min(nx, reach), ny - yAt(Math.min(nx, reach)));
      ctx.stroke();
    }
    ctx.restore();

    // the print: held at 40 cm, then brought forward and shrunk back to the sensor that made it
    const pp = sp(t - T.print, SPR.card);
    const R = diveRing(t);
    const { fwd, shrink, dive } = R;
    const grow = 690 / PRINT.w;
    const k = lerp(1, grow, fwd) * lerp(1, 1 / 4.17, shrink) * R.z;
    const pr = { w: PRINT.w * k, h: PRINT.h * k };
    const pcx = R.x;
    const pcy = R.y;
    const dr = R.r;
    if (pp > 0.001) {
      ctx.save();
      ctx.globalAlpha = o * clamp(pp * 1.4) * (1 - dive);
      const r = { x: pcx - pr.w / 2, y: pcy - pr.h / 2, w: pr.w, h: pr.h };
      if (dive < 0.999) {
        picture(ctx, r, { s: O.FOCUS, N: 16 });
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
      }
      ctx.globalAlpha = o * clamp(pp * 1.4);
      if (dive <= 0) {
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(pcx, pcy, Math.max(5, dr), 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      // sizes: the print's width and the dot's
      const sizeA = o * clamp(pp * 1.4);
      ctx.save();
      ctx.globalAlpha = sizeA;
      font(ctx, "mono", 40);
      ctx.fillStyle = C.ink;
      ctx.textAlign = "center";
      const label = shrink < 0.5 ? "15 cm print" : "36 mm sensor";
      ctx.globalAlpha = sizeA * (1 - dive);
      ctx.fillText(label, pcx, pcy + pr.h / 2 + 56);
      ctx.globalAlpha = sizeA;
      if (fwd > 0.05) {
        // a leader from the dot to its size, outside the picture
        const lx = Math.max(pcx + pr.w / 2 + 40, 1240);
        ctx.globalAlpha = sizeA * clamp(fwd * 2) * (1 - dive);
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pcx + dr + 4, pcy);
        ctx.lineTo(lx - 14, pcy);
        ctx.stroke();
        font(ctx, "serif", 84);
        ctx.fillStyle = C.accent;
        ctx.textAlign = "left";
        ctx.fillText(shrink < 0.5 ? "0.12 mm" : "0.03 mm", lx, pcy + 28);
      }
      ctx.restore();
      // 40 cm, print to eye
      const dm = phase(t, T.print + 0.3, T.shrink - 0.2, SPR.ui, 0.3);
      hdim(ctx, pcx, nx - 8, 880, C.ink, clamp(dm.in * 1.3) * (1 - dm.out) * o);
      if (dm.in > 0.001) {
        ctx.save();
        ctx.globalAlpha = clamp(dm.in * 1.3) * (1 - dm.out) * o;
        font(ctx, "mono", 40);
        ctx.fillStyle = C.ink;
        ctx.textAlign = "center";
        ctx.fillText("40 cm", (pcx + nx) / 2, 858);
        ctx.restore();
      }
    }

    // captions and numbers
    const cap = phase(t, T.arcmin, T.print - 0.15, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "The finest detail it can see:" }], 150, 190, { kind: "serif", size: 84, color: C.ink }, cap.in, cap.out);
    const big = phase(t, T.arcmin + 0.15, T.print - 0.15, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "1′", color: C.accent }], 150, 520, { kind: "serif", size: 300, color: C.ink }, big.in, big.out);
    const cap2 = phase(t, T.arcmin + 0.625, T.print - 0.15, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "one arcminute, 1/60°" }], 150, 620, { kind: "mono", size: 44, color: C.ink }, cap2.in, cap2.out);
    const base = { kind: "serif", size: 84, color: C.ink };
    const l1 = phase(t, T.print + 0.1, T.shrink + 1.1, SPR.type, 0.25);
    riseRuns(ctx, [{ s: "At 40 cm, 1′ spans " }, { s: "0.12 mm", color: C.accent }, { s: " of a print." }], 150, 190, base, l1.in, l1.out);
    const l2 = phase(t, T.shrink + 1.35, T.coc - 0.3, SPR.type, 0.25);
    riseRuns(ctx, [{ s: "On the sensor, that is " }, { s: "0.03 mm", color: C.accent }, { s: "." }], 150, 190, base, l2.in, l2.out);
    const l3 = phase(t, T.shrink + 1.6, T.coc - 0.3, SPR.type, 0.25);
    riseRuns(ctx, [{ s: "The print is 4.2 times the sensor." }], 150, 280, { kind: "mono", size: 40, color: C.dim }, l3.in, l3.out);
  }

  // The circle of confusion on the sensor: five photosites across.
  function actC2(ctx, t) {
    const R = diveRing(t);
    const pitch = (R.r * 6) / 15;
    const fr = { x: R.x, y: R.y, pitch };
    const out = phase(t, T.coc - 0.4, T.chart, SPR.ui, 0.35);
    drawPixels(ctx, fr, new Map(), clamp((pitch - 10) / 30) * (1 - out.out), { x0: 0, y0: 0, x1: W, y1: H });
    // the ring then travels to the focused domino's place in the chart
    const travel = sp(t - T.chart, SPR.card);
    if (R.dive > 0 && t < T.chart + 0.7) {
      ctx.save();
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = lerp(lerp(3.5, 6, R.dive), 3, travel);
      ctx.beginPath();
      ctx.arc(lerp(fr.x, chX(O.FOCUS), travel), lerp(fr.y, CH.discY, travel), lerp(R.r, (O.coc * CH.k) / 2 + 1.5, travel), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    const dim = phase(t, T.coc + 0.4, T.chart - 0.3, SPR.ui, 0.3);
    hdim(ctx, fr.x - R.r, fr.x + R.r, fr.y + R.r + 46, C.accent, clamp(dim.in * 1.4) * (1 - dim.out));
    chip(ctx, "0.03 mm", fr.x, fr.y + R.r + 110, dim.in, dim.out, { size: 44, align: "center" });
    const five = phase(t, T.coc + 0.75, T.chart - 0.3, SPR.ui, 0.3);
    if (five.in > 0.001) {
      ctx.save();
      ctx.globalAlpha = clamp(five.in * 1.3) * (1 - five.out);
      font(ctx, "mono", 40);
      ctx.fillStyle = C.ink;
      ctx.textAlign = "left";
      ctx.fillText("5 photosites", fr.x + R.r + 40, fr.y + 14);
      ctx.restore();
    }
    const base = { kind: "serif", size: 84, color: C.ink };
    const l1 = phase(t, T.coc + 0.5, T.chart - 0.2, SPR.type, 0.25);
    riseRuns(ctx, [{ s: "Blur smaller than this looks " }, { s: "sharp", italic: true }, { s: "." }], 150, 190, base, l1.in, l1.out);
    const l2 = phase(t, T.cocLabel, T.chart - 0.2, SPR.type, 0.25);
    riseRuns(ctx, [{ s: "the circle of confusion", italic: true }], 150, 290, { kind: "serif", size: 72, color: C.accent }, l2.in, l2.out);
  }

  // ------------------------------------------------------------------ act D

  // The chart: distance along the bottom, each domino's blur disc above it, drawn 1200 times
  // life size, with the circle of confusion as an orange ring.
  const CH = { z0: 690, z1: 950, x0: 160, x1: 1760, axis: 860, discY: 560, k: 1200 };
  const chX = (z) => CH.x0 + ((z - CH.z0) * (CH.x1 - CH.x0)) / (CH.z1 - CH.z0);
  const PIPS_ICON = SC.DOMS.map((d) => d.pips);
  const stopD = (t) => springTo(t, [[0, 1], ...T.stopsD.map((tt, i) => [tt, 2 + i, SPR.snap])]);
  const ND = (t) => O.stopN(stopD(t));

  const PIP_LAYOUT = {
    0: [],
    1: [[0, 0]],
    2: [[1, 1], [-1, -1]],
    3: [[1, 1], [0, 0], [-1, -1]],
    4: [[1, 1], [-1, 1], [1, -1], [-1, -1]],
    5: [[1, 1], [-1, 1], [0, 0], [1, -1], [-1, -1]],
    6: [[1, 1], [-1, 1], [1, 0], [-1, 0], [1, -1], [-1, -1]],
  };

  // A small upright domino standing on yBase, centered at x.
  function dominoIcon(ctx, x, yBase, w, pips, alpha, lit) {
    if (alpha <= 0.001) return;
    const h = w * 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = lit ? "#efe6d0" : "#4b4a50";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, yBase - h, w, h, w * 0.12);
    ctx.fill();
    ctx.fillStyle = lit ? "#15130f" : "#22232a";
    ctx.fillRect(x - w * 0.36, yBase - h / 2 - 0.8, w * 0.72, 1.6);
    const pitch = w * 0.26;
    for (const [half, n] of [[-1, pips[0]], [1, pips[1]]]) {
      for (const [pu, pv] of PIP_LAYOUT[n]) {
        ctx.beginPath();
        ctx.arc(x + pu * pitch, yBase - h / 2 + half * (h / 4) - pv * pitch, w * 0.085, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function actD(ctx, t) {
    const N = ND(t);
    const s = O.FOCUS;
    const [zn, zf] = O.limits(N, s);
    const build = (i) => sp(t - (T.chart + 0.25 + Math.abs(i - O.FOCUS_INDEX) * 0.1), SPR.card);
    const gone = t < T.answer ? 0 : ease.inCubic(clamp((t - T.answer) / 0.35));
    if (gone >= 0.999) return;
    ctx.save();
    ctx.globalAlpha = 1 - gone;

    // the axis, its ticks, and the sharp zone on it
    const ap = ease.outCubic(clamp((t - T.chart - 0.1) / 0.6));
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CH.x0, CH.axis);
    ctx.lineTo(lerp(CH.x0, CH.x1, ap), CH.axis);
    ctx.stroke();
    font(ctx, "mono", 36);
    ctx.textAlign = "center";
    for (let z = 700; z <= 950; z += 50) {
      const x = chX(z);
      const a = clamp((ap - ((x - CH.x0) / (CH.x1 - CH.x0)) * 0.92) * 4);
      if (a <= 0) continue;
      ctx.globalAlpha = (1 - gone) * a;
      ctx.fillStyle = C.dim;
      ctx.fillRect(x - 1, CH.axis + 8, 2, 14);
      ctx.fillText(String(z / 10), x, CH.axis + 62);
    }
    ctx.globalAlpha = 1 - gone;
    const ul = phase(t, T.chart + 0.6, Infinity, SPR.type);
    riseRuns(ctx, [{ s: "cm from the lens" }], CH.x1, CH.axis + 112, { kind: "mono", size: 36, color: C.dim }, ul.in, 0, "right");

    const band = sp(t - T.band, SPR.ui);
    if (band > 0.001) {
      const xa = chX(Math.max(zn, CH.z0));
      const xb = chX(Math.min(zf, CH.z1));
      const mid = chX(s);
      const a = lerp(mid, xa, band);
      const b = lerp(mid, xb, band);
      ctx.fillStyle = C.accent;
      ctx.fillRect(a, CH.axis - 7, b - a, 14);
    }

    // dominoes, discs and rings
    const ap9 = SC.aperturePath(N);
    SC.DOMS.forEach((d, i) => {
      const x = chX(d.z);
      const p = build(i);
      if (p <= 0.001) return;
      const c = O.disc(d.z, N, s);
      const inside = c <= O.coc;
      dominoIcon(ctx, x, CH.axis - 10, 40, PIPS_ICON[i], clamp(p * 1.4), inside);
      // the blur disc
      const dpx = Math.max(c * CH.k, 7) * p;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const a = clamp(0.95 * Math.pow(12 / Math.max(dpx, 12), 0.62), 0.14, 0.95);
      SC.bokeh(ctx, ctx.getTransform(), ap9, x, CH.discY, dpx, WARM, a * clamp(p * 1.4));
      ctx.restore();
      // the limit (the focused domino's ring arrives from the sensor)
      ctx.save();
      ctx.globalAlpha *= i === O.FOCUS_INDEX ? clamp((t - (T.chart + 0.62)) / 0.08) : clamp(p * 1.4);
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, CH.discY, (O.coc * CH.k) / 2 + 1.5, 0, TAU);
      ctx.stroke();
      if (inside) {
        ctx.fillStyle = "rgba(255,106,26,0.18)";
        ctx.fill();
      }
      ctx.restore();
    });

    // the f-number, with the iris it sets
    const fv = [[T.chart + 0.3, "1.4"], ...T.stopsD.map((tt, i) => [tt, O.LABELS[2 + i]])];
    flipLabel(ctx, t, fv, 150, 250, { kind: "serif", size: 150, color: C.ink }, (v) => [{ s: "f/", italic: true }, { s: v }]);
    const ir = sp(t - (T.chart + 0.5), SPR.card);
    if (ir > 0.001) miniIris(ctx, 640, 200, 78 * ir, 1.414 / N);

    // light and depth
    const lv = [[T.chart + 0.7, "1"], ...T.stopsD.map((tt, i) => [tt, "1/" + Math.pow(2, i + 1)])];
    const lb = phase(t, T.chart + 0.6, Infinity, SPR.type);
    riseRuns(ctx, [{ s: "light" }], 1290, 130, { kind: "mono", size: 36, color: C.dim }, lb.in, 0, "right");
    flipLabel(ctx, t, lv, 1290, 250, { kind: "serif", size: 110, color: C.ink }, (v) => [{ s: v }], "right");
    const db = phase(t, T.band, Infinity, SPR.type);
    riseRuns(ctx, [{ s: "depth of field" }], 1770, 130, { kind: "mono", size: 36, color: C.accent }, db.in, 0, "right");
    if (db.in > 0.001) {
      K.masked(ctx, 1380, 1800, 250, 110, 40, db.in, 0, () => {
        const cm = (zf - zn) / 10;
        font(ctx, "serif", 70, { italic: true });
        ctx.fillStyle = C.ink;
        ctx.textAlign = "right";
        ctx.fillText("cm", 1770, 250);
        odometer(ctx, cm, 1770 - 92, 250, { size: 110, color: C.ink, decimals: 1, slot: 0.46 });
      });
    }

    ctx.restore();

    // captions, along the bottom
    const base = { kind: "serif", size: 76, color: C.ink };
    const lines = [
      [T.chart + 0.5, T.band, [{ s: "Each domino's blur, at f/1.4." }]],
      [T.band, T.stopsD[0], [{ s: "Inside the ring, it looks " }, { s: "sharp", italic: true }, { s: "." }]],
      [T.stopsD[0], T.light, [{ s: "Close the aperture one stop at a time." }]],
      [T.light, T.both, [{ s: "1/128 the light. About 12 times the " }, { s: "depth", italic: true }, { s: "." }]],
      [T.both, T.answer, [{ s: "The aperture sets the light " }, { s: "and", italic: true }, { s: " the blur." }]],
    ];
    for (const [a, b, parts] of lines) {
      const ph = phase(t, a + 0.05, b - 0.2, SPR.type, 0.25);
      riseRuns(ctx, parts, 150, 1020, base, ph.in, ph.out);
    }
  }

  // The aperture seen from the front: nine blades in a ring, open by `open` (1 = f/1.4).
  function miniIris(ctx, cx, cy, R, open) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.clip();
    ctx.fillStyle = "#1a1e27";
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    const r = R * 0.92 * open;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255,238,205,0.85)";
    ctx.translate(cx, cy);
    ctx.scale(r, r);
    ctx.fill(SC.aperturePath(1.414 / open));
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ act E

  const camE = { s: O.FOCUS, N: 16 };

  function actE(ctx, t) {
    // through the aperture: the iris from the chart grows to the frame and opens on the picture
    const move = sp(t - T.answer, SPR.card);
    const open = ease.inOutCubic(clamp((t - T.answer - 0.35) / 0.9));
    const cx = lerp(640, W / 2, move);
    const cy = lerp(200, H / 2, move);
    const fadeIn = clamp((t - T.answer) / 0.35);
    // the picture shows only once the blades have covered the chart
    const view = fadeIn >= 1 ? picture(ctx, FULL, camE) : { cx: W / 2, cy: H * 0.39, S: W / 36 };

    // one in focus
    const d4 = SC.DOMS[O.FOCUS_INDEX];
    const top = SC.proj(view, [d4.x, -SC.HCAM + 48, d4.z]);
    const mk = phase(t, T.inFocus + 0.15, T.close - 0.1, SPR.ui, 0.3);
    if (mk.in > 0.001) {
      ctx.save();
      ctx.globalAlpha = clamp(mk.in * 1.4) * (1 - mk.out);
      ctx.fillStyle = C.accent;
      const y = top[1] - 26 - (1 - mk.in) * 20;
      ctx.beginPath();
      ctx.moveTo(top[0], y);
      ctx.lineTo(top[0] - 14, y - 22);
      ctx.lineTo(top[0] + 14, y - 22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // the farthest domino's blur, magnified against the limit
    const ins = phase(t, T.inset, T.close - 0.1, SPR.card, 0.35);
    if (ins.in > 0.001) {
      const d8 = SC.DOMS[7];
      const pip = SC.proj(view, [d8.x + 6.4, -SC.HCAM + 48 - 12 + 6.4, d8.z]);
      const bc = [1560, 300];
      const R = 190 * ins.in * (1 - 0.3 * ins.out);
      ctx.save();
      ctx.globalAlpha = clamp(ins.in * 1.4) * (1 - ins.out);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.5;
      const ang = Math.atan2(pip[1] - bc[1], pip[0] - bc[0]);
      ctx.beginPath();
      ctx.moveTo(bc[0] + Math.cos(ang) * R, bc[1] + Math.sin(ang) * R);
      ctx.lineTo(pip[0], pip[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pip[0], pip[1], 10, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#0b0d13";
      ctx.beginPath();
      ctx.arc(bc[0], bc[1], R, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // the ring is the limit, 0.03 mm; the disc is this domino's blur at f/16
      const ringR = R * 0.62;
      const c = O.disc(d8.z, 16, O.FOCUS);
      ctx.globalCompositeOperation = "lighter";
      SC.bokeh(ctx, ctx.getTransform(), SC.aperturePath(16), bc[0], bc[1], ((2 * ringR * c) / O.coc) * clamp(ins.in * 1.2), WARM, 0.8);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bc[0], bc[1], ringR, 0, TAU);
      ctx.stroke();
      ctx.restore();
      const lb = phase(t, T.inset + 0.3, T.close - 0.1, SPR.type, 0.3);
      const mono = { kind: "mono", size: 38, color: C.ink };
      riseRuns(ctx, [{ s: "blur " }, { s: `${c.toFixed(3)} mm` }], 1470, 566, mono, lb.in, lb.out);
      riseRuns(ctx, [{ s: "limit " }, { s: "0.030 mm", color: C.accent }], 1470, 618, { ...mono, color: C.dim }, lb.in, lb.out);
    }

    // the iris: opening on the picture, closing on the lockup
    const closeP = t < T.close ? 0 : ease.inOutCubic(clamp((t - T.close) / 0.7));
    let r = lerp(9, 1250, open);
    if (closeP > 0) r = 1250 * (1 - closeP);
    const icx = closeP > 0 ? W / 2 : cx;
    const icy = closeP > 0 ? H / 2 : cy;
    if (r < 1250) {
      ctx.save();
      ctx.globalAlpha = fadeIn;
      iris(ctx, r, 0.4 + r * 0.0007, icx, icy);
      ctx.restore();
    }

    // captions
    const base = { kind: "serif", size: 92, color: C.ink };
    const c1 = phase(t, T.inFocus, T.rest - 0.2, SPR.type, 0.25);
    riseRuns(ctx, [{ s: "One distance is in " }, { s: "focus", italic: true }, { s: "." }], 150, 250, base, c1.in, c1.out);
    const c2 = phase(t, T.rest, T.close - 0.15, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "The rest blur less" }], 150, 250, base, c2.in, c2.out);
    const c3 = phase(t, T.rest + 0.3125, T.close - 0.15, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "than you can " }, { s: "see", italic: true }, { s: "." }], 150, 360, base, c3.in, c3.out);

    // lockup
    if (t >= T.lockup - 0.1) {
      const lk = phase(t, T.lockup, Infinity, SPR.type);
      const lk2 = phase(t, T.lockup + 0.3125, Infinity, SPR.type);
      const lb = { kind: "serif", size: 140, color: C.ink };
      riseRuns(ctx, [{ s: "Depth of field is" }], W / 2, 500, lb, lk.in, 0, "center");
      riseRuns(ctx, [{ s: "the blur you " }, { s: "can\u2019t see", italic: true, color: C.accent }, { s: "." }], W / 2, 660, lb, lk2.in, 0, "center");
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
    if (t < T.cone) actA(ctx, t);
    if (t >= T.cone && t < T.grid + 1.2) actB(ctx, t);
    if (t >= T.grid && t < T.coc + 0.6) actC(ctx, t);
    if (t >= T.coc - 0.5 && t < T.chart + 1.2) actC2(ctx, t);
    if (t >= T.chart && t < T.answer + 0.5) actD(ctx, t);
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

  FM.film = { W, H, C, duration: DURATION, fps: FPS, draw, drawBlurred, picture };
})();
