// One Arcminute: the picture. Every frame is drawn from the time t alone.
(function () {
  const FM = globalThis.FM;
  const K = FM.kit;
  const { clamp, lerp, unlerp, ease, sp, SPR, springTo, inOut, phase, runs, riseRuns, odometer, font, TAU } = K;
  const { T, cues, BEAT, DURATION, FPS } = FM.clock;
  const O = FM.optics;
  const SC = FM.scene;
  const M = FM.motion;

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
  // zoom: {z, fx, fy} magnifies the picture z times about the screen point (fx, fy).
  function picture(ctx, r, cam, zoom) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    const S = r.w / 36;
    const view = { cx: r.x + r.w / 2, cy: r.y + r.h * 0.39, S };
    if (zoom && zoom.z !== 1) {
      view.S *= zoom.z;
      view.cx = zoom.fx + (view.cx - zoom.fx) * zoom.z;
      view.cy = zoom.fy + (view.cy - zoom.fy) * zoom.z;
    }
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

  // A label that rolls through values like a counter: the old one rises out of a mask as
  // the new one rises in, a fixed distance apart. values: [[t, text], ...]. The first value
  // springs in; the last leaves at tOut.
  function flipLabel(ctx, t, values, x, y, base, make, align = "left", dur = 0.24, tOut = Infinity) {
    let cur = -1;
    for (let i = 0; i < values.length; i++) if (t >= values[i][0]) cur = i;
    if (cur < 0) return;
    const tIn = values[cur][0];
    const e = cur === 0 ? sp(t - tIn, SPR.type) : ease.inOutCubic(clamp((t - tIn) / dur));
    const out = t < tOut ? 0 : ease.inCubic(clamp((t - tOut) / 0.3));
    if (cur > 0 && e < 0.999) riseRuns(ctx, make(values[cur - 1][1]), x, y, base, 1, e, align);
    riseRuns(ctx, make(values[cur][1]), x, y, base, e, out, align);
  }

  // Captions: [tIn, tOut, parts, line] each, rising in through a mask and leaving upward.
  // line 1 sits under line 0, so a thought can take two lines.
  function captions(ctx, t, lines, x = 150, y = 190, base = { kind: "serif", size: 84, color: C.ink }) {
    for (const [a, b, parts, line = 0] of lines) {
      if (t < a - 0.01 || t > b + 0.4) continue;
      const ph = phase(t, a + 0.05, b - 0.2, SPR.type, 0.3);
      riseRuns(ctx, parts, x, y + line * base.size * 1.22, base, ph.in, ph.out);
    }
  }
  const it = (s) => ({ s, italic: true });
  const ac = (s) => ({ s, color: C.accent });

  // ------------------------------------------------------------------ act A

  const camA = (t) => ({ s: M.focusA(t), N: O.stopN(M.stopA(t)) });

  function actA(ctx, t) {
    picture(ctx, FULL, camA(t));

    // the iris opens
    if (t < 0.9) {
      const r = 1250 * sp(t - 0.04, [110, 2 * Math.sqrt(110)]);
      iris(ctx, r, 0.4 + r * 0.0007);
    }
    captions(ctx, t, [
      [T.headA, T.stopsA[0] - 0.4, [{ s: "A lens focuses at " }, it("one"), { s: " distance." }]],
      [T.headA + 1.25, T.stopsA[0] - 0.4, [{ s: "Everything nearer or farther is soft." }], 1],
      [T.why, T.apIntro - 0.3, [{ s: "So why do all eight look " }, it("sharp?")]],
    ], 150, 945, { kind: "serif", size: 76, color: C.ink });
  }

  // The f-number, top left, from the opening shot through the aperture scene.
  function fNumber(ctx, t) {
    if (t > T.turn + 0.5) return;
    const fv = [[T.fLabel, "1.4"], ...T.stopsA.map((tt, i) => [tt, O.LABELS[2 + i]])];
    for (const [tt, k] of M.stopMarks(M.stopAp, T.apIntro + 1, T.turn).slice(1)) fv.push([tt, O.LABELS[k]]);
    // the scene's own clicks land exactly on their cues
    const clean = fv.filter(([tt]) => !(tt > T.apStops[0] - 0.05 && tt < T.apStops[6] + 0.3));
    T.apStops.forEach((tt, i) => clean.push([tt, O.LABELS[2 + i]]));
    clean.sort((a, b) => a[0] - b[0]);
    flipLabel(ctx, t, clean, 150, 215, { kind: "serif", size: 150, color: C.ink }, (v) => [it("f/"), { s: v }], "left", 0.24, T.turn - 0.3);
  }

  // ------------------------------------------------------------------ act AP: the aperture

  const LENS = { x: 1360, y: 600, ring: 300, inner: 266, open: 250 };

  function actAp(ctx, t) {
    const N = O.stopN(M.stopAp(t));
    // 1. the iris closes over the picture; 2. we pull back to see it is inside a lens
    const close = ease.inOutCubic(clamp((t - T.apIntro) / 0.9));
    const pull = sp(t - (T.apIntro + 0.8), [26, 2 * Math.sqrt(26)]);
    const Z0 = 6;
    const z = lerp(Z0, 1, pull);
    const turnP = t < T.turn ? 0 : ease.inOutCubic(clamp((t - T.turn) / 0.9));
    if (turnP >= 0.999) return;
    // during the turn the lens slides to where the side view's lens will stand
    const slide = ease.inOutCubic(clamp((t - (T.apSecond + 1.25)) / 1.2));
    const lx = lerp(LENS.x, M.B.lx, slide);
    const ly = lerp(LENS.y, M.B.ax, slide);
    const cx = lerp(W / 2, LENS.x, pull) + (lx - LENS.x);
    const cy = lerp(H / 2, LENS.y, pull) + (ly - LENS.y);
    const rOpen = LENS.open * (Math.SQRT2 / N);
    const r = lerp(1250, rOpen * Z0, close) * (z / Z0) * (close < 1 ? 1 : 1);

    // light through the opening: the picture, dimmer by half each stop once it opens wide
    const lightK = t < T.apOpen ? 1 : Math.pow(2, -(M.stopAp(t) - 1));
    const sx = 1 - turnP * 0.94;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, 1);
    ctx.translate(-cx, -cy);
    // the lens body around the barrel
    if (pull > 0.001) {
      ctx.save();
      ctx.globalAlpha = clamp(pull * 2);
      ctx.fillStyle = "#11141b";
      ctx.beginPath();
      ctx.arc(cx, cy, LENS.ring * z, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(r, 0.5), 0, TAU);
    ctx.clip();
    picture(ctx, FULL, { s: O.FOCUS, N: 16 });
    ctx.fillStyle = `rgba(4,5,8,${(1 - Math.pow(lightK, 0.45)).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, LENS.inner * z, 0, TAU);
    ctx.clip();
    iris(ctx, r, 0.4 + r * 0.0007, cx, cy);
    ctx.restore();
    if (pull > 0.001) {
      ctx.save();
      ctx.globalAlpha = clamp(pull * 2);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      for (const rr of [LENS.ring, LENS.inner]) {
        ctx.beginPath();
        ctx.arc(cx, cy, rr * z, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    // outside the barrel, before the pull: blades to the frame's edge
    if (pull < 0.001 && close < 1) {
      // covered by the iris already
    }

    // the opening's width, and the light that gets through
    const wv = phase(t, T.apStops[0] - 0.4, T.apSecond - 0.2, SPR.ui, 0.3);
    if (wv.in > 0.001 && turnP <= 0) {
      const y = LENS.y - LENS.ring - 100;
      hdim(ctx, cx - rOpen, cx + rOpen, y + 40, C.ink, clamp(wv.in * 1.4) * (1 - wv.out));
      ctx.save();
      ctx.globalAlpha = clamp(wv.in * 1.4) * (1 - wv.out);
      font(ctx, "mono", 48);
      ctx.fillStyle = C.ink;
      ctx.textAlign = "center";
      const mm = 50 / N;
      ctx.fillText(`opening ${mm < 10 ? mm.toFixed(1) : mm.toFixed(0)} mm`, cx, y);
      ctx.restore();
    }
    const lv = phase(t, T.apLight, T.apSecond - 0.2, SPR.type, 0.3);
    if (lv.in > 0.001) {
      const lab = Math.round(M.stopAp(t));
      riseRuns(ctx, [{ s: "light" }], 150, 720, { kind: "mono", size: 54, color: C.dim }, lv.in, lv.out);
      riseRuns(ctx, [{ s: lab <= 1 ? "1" : "1/" + Math.pow(2, lab - 1) }], 150, 850, { kind: "serif", size: 130, color: C.ink }, lv.in, lv.out);
    }
    // name it
    const nm = phase(t, T.apName + 0.3, T.apOpen - 0.2, SPR.ui, 0.3);
    if (nm.in > 0.001) {
      ctx.save();
      ctx.globalAlpha = clamp(nm.in * 1.4) * (1 - nm.out);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx + rOpen * 0.7, cy - rOpen * 0.7);
      ctx.lineTo(1640, 250);
      ctx.lineTo(1690, 250);
      ctx.stroke();
      ctx.restore();
      riseRuns(ctx, [{ s: "aperture" }], 1650, 220, { kind: "mono", size: 54, color: C.ink }, nm.in, nm.out, "center");
    }

    const mono = { kind: "mono", size: 44, color: C.dim };
    captions(ctx, t, [
      [T.apName, T.apOpen, [{ s: "This is the " }, it("aperture"), { s: ":" }]],
      [T.apName + 0.625, T.apOpen, [{ s: "an opening in the lens." }], 1],
      [T.apOpen, T.apStops[0], [{ s: "The f-number says how wide it is." }]],
      [T.apOpen + 0.625, T.apStops[0], [{ s: "f/1.4 is wide open." }], 1],
      [T.apStops[0], T.apLight, [{ s: "A bigger number," }]],
      [T.apStops[0] + 0.625, T.apLight, [it("a smaller opening.")], 1],
      [T.apLight, T.apHold, [{ s: "Each stop lets in" }]],
      [T.apLight + 0.625, T.apHold, [{ s: "half as much light." }], 1],
      [T.apHold, T.apSecond, [{ s: "f/16 lets in 1/128" }]],
      [T.apHold + 0.625, T.apSecond, [{ s: "of the light at f/1.4." }], 1],
      [T.apSecond, T.turn + 0.6, [{ s: "But the aperture does" }]],
      [T.apSecond + 0.625, T.turn + 0.6, [{ s: "a " }, it("second"), { s: " thing." }], 1],
    ], 150, 420);
    captions(ctx, t, [
      [T.apStops[0] + 1.25, T.apHold, [{ s: "f-number = focal length ÷ opening" }]],
      [T.apHold + 0.5, T.apSecond, [{ s: "(The opening shot held its brightness with a longer exposure.)" }]],
    ], 150, 1010, mono);
  }

  // ------------------------------------------------------------------ act B

  const B = M.B;
  const PANEL = { x: 1400, y: B.ax - 135, w: 480, h: 270 };
  const { opticsB, apB } = M;

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

  // The panel shows the sensor's view: one dot, a disc, or (as the bridge) the photograph
  // itself, magnified around the farthest domino's pip at the same aperture.
  function bridgePicture(ctx, r, t) {
    const d8 = SC.DOMS[7];
    const N = Math.SQRT2 / apB(t);
    const z = 4.8; // the pip's blur disc comes out about the size of the schematic disc
    const full = { cx: W / 2, cy: H * 0.39, S: W / 36 };
    const pip = SC.proj(full, [d8.x + 6.4, -SC.HCAM + 48 - 12 + 6.4, d8.z]);
    const pcx = r.x + r.w / 2;
    const pcy = r.y + r.h / 2;
    const view = { S: full.S * z, cx: pcx + (full.cx - pip[0]) * z, cy: pcy + (full.cy - pip[1]) * z };
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    SC.draw(ctx, view, { s: O.FOCUS, N }, { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h });
    ctx.restore();
  }

  function actB(ctx, t) {
    const o = opticsB(t);
    const ax = B.ax;
    const leave = t < T.grid - 0.35 ? 0 : ease.inCubic(clamp((t - (T.grid - 0.35)) / 0.5));
    const turnP = ease.inOutCubic(clamp((t - T.turn) / 0.9));

    // the sensor's view
    const zoomC = t < T.grid ? 0 : sp(t - T.grid, SPR.card);
    const r = lerpRect(PANEL, FULL, zoomC);
    const panelIn = sp(t - (T.turn + 0.6), SPR.card);
    if (zoomC < 0.999 && panelIn > 0.001) {
      ctx.save();
      ctx.globalAlpha = clamp(panelIn * 1.4);
      ctx.fillStyle = "#07090e";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      // the bridge: the photograph's own blur, in place of the schematic disc
      const br = phase(t, T.bridge, T.irisBOpen + 0.6, SPR.card, 0.5);
      if (br.in > 0.001) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x, r.y, r.w, r.h);
        ctx.clip();
        ctx.globalAlpha *= clamp(br.in * 1.2) * (1 - br.out);
        bridgePicture(ctx, r, t);
        ctx.restore();
      }
      ctx.restore();
    }
    const sc = r.w / PANEL.w;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const spotOn = clamp((t - (T.inFocusB - 0.2)) / 0.3) * (1 - clamp((t - (T.grid + 0.35)) / 0.3));
    const brHide = phase(t, T.bridge, T.irisBOpen + 0.6, SPR.card, 0.5);
    spot(ctx, cx, cy, o.disc * sc, 1.414 / apB(t), spotOn * (1 - clamp(brHide.in * 1.3) * (1 - brHide.out)));
    const lp = phase(t, T.turn + 0.8, T.grid - 0.35, SPR.type, 0.3);
    const ptxt = t >= T.bridge && t < T.irisBOpen + 0.3 ? "photo, magnified" : "on the sensor";
    riseRuns(ctx, [{ s: ptxt }], PANEL.x, PANEL.y - 30, { kind: "mono", size: 46, color: C.dim }, lp.in * (1 - zoomC), lp.out);

    // the side view
    if (leave < 0.999) {
      ctx.save();
      ctx.translate(-leave * 900, 0);
      ctx.globalAlpha = 1 - leave;
      const ap = clamp((t - T.turn - 0.4) / 0.6);
      ctx.strokeStyle = C.rule;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, ax);
      ctx.lineTo(lerp(60, B.xs, ease.outCubic(ap)), ax);
      ctx.stroke();
      // the lens: the front view turned edge-on becomes this
      drawLens(ctx, B.lx, ax, 250, clamp((turnP - 0.5) * 2));
      if (turnP > 0.5) irisSide(ctx, B.lx, ax, o.a, B.la, clamp((turnP - 0.5) * 2));
      const sensP = sp(t - (T.turn + 0.5), SPR.card);
      if (sensP > 0.001) {
        ctx.fillStyle = C.ink;
        const sh = 170 * sensP;
        ctx.fillRect(B.xs - 4, ax - sh, 8, sh * 2);
        const sl = phase(t, T.turn + 0.9, T.domino + 1.2, SPR.type, 0.3);
        riseRuns(ctx, [{ s: "sensor" }], B.xs, ax + 236, { kind: "mono", size: 46, color: C.dim }, sl.in, sl.out, "center");
        riseRuns(ctx, [{ s: "lens" }], B.lx, ax + 316, { kind: "mono", size: 46, color: C.dim }, sl.in, sl.out, "center");
      }
      // the aperture is the base of the cone
      const apl = phase(t, T.cone + 0.9, T.fold, SPR.ui, 0.3);
      if (apl.in > 0.001) {
        vdim(ctx, B.lx - 40, ax - o.a, ax + o.a, C.ink, clamp(apl.in * 1.4) * (1 - apl.out));
        riseRuns(ctx, [{ s: "aperture" }], B.lx - 64, ax - o.a - 26, { kind: "mono", size: 46, color: C.ink }, apl.in, apl.out, "right");
      }
      // the focus mark on the axis
      const fm = phase(t, T.inFocusB + 0.3, T.grid - 0.4, SPR.ui, 0.3);
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
        font(ctx, "mono", 46);
        ctx.fillStyle = C.dim;
        ctx.textAlign = "center";
        ctx.fillText("in focus", x, ax + 212);
        ctx.restore();
      }
      // the domino and its light
      const dp = sp(t - T.domino, SPR.card);
      dominoSide(ctx, o.xP - (1 - dp) * 60, ax, clamp(dp * 1.4));
      if (t >= T.burst && t < T.burst + 2.2) {
        const p = clamp((t - T.burst) / 2.0);
        ctx.save();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2;
        ctx.globalAlpha *= Math.sin(Math.PI * p) * 0.8;
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
      const p0 = sp(t - T.cone, [26, 2 * Math.sqrt(26)]);
      const p1 = sp(t - T.fold, [40, 2 * Math.sqrt(40)]);
      coneB(ctx, o, ax, p0, p1, 1);
      // the disc the sensor cuts from the cone
      const dv = clamp((o.disc - 6) / 14) * clamp((t - T.behind) / 0.4);
      if (dv > 0.001) vdim(ctx, B.xs + 26, ax - o.disc / 2, ax + o.disc / 2, C.ink, dv);
      ctx.restore();
    }

    captions(ctx, t, [
      [T.turn, T.domino, [{ s: "To see it, look from the side." }]],
      [T.domino, T.burst, [{ s: "Take one point: a dot on a domino." }]],
      [T.burst, T.cone, [{ s: "Light leaves it in every direction." }]],
      [T.cone, T.fold, [{ s: "The aperture lets in a " }, it("cone"), { s: " of it." }]],
      [T.fold, T.inFocusB, [{ s: "The lens bends the cone back to a " }, it("point"), { s: "." }]],
      [T.inFocusB, T.nearer, [{ s: "The point lands on the sensor as a dot." }]],
      [T.inFocusB + 1.25, T.nearer, [{ s: "That dot is " }, it("in focus"), { s: "." }], 1],
      [T.nearer, T.discNear, [{ s: "Move the domino closer," }]],
      [T.behind, T.discNear, [{ s: "and the cone meets " }, it("behind"), { s: " the sensor." }], 1],
      [T.discNear, T.farther, [{ s: "The sensor cuts the cone:" }]],
      [T.discNear + 0.625, T.farther, [{ s: "a " }, it("disc"), { s: ", not a dot." }], 1],
      [T.farther, T.bridge, [{ s: "Farther away, it meets " }, it("in front"), { s: "." }]],
      [T.discFar, T.bridge, [{ s: "A disc again." }], 1],
      [T.bridge, T.irisB, [{ s: "That disc " }, it("is"), { s: " blur." }]],
      [T.bridge2, T.irisB, [{ s: "Every soft point in a photo is one." }], 1],
      [T.irisB, T.irisBOpen, [{ s: "Now close the aperture." }]],
      [T.irisB2, T.irisBOpen, [{ s: "The cone narrows, so the disc " }, it("shrinks"), { s: "." }], 1],
      [T.irisBOpen, T.question, [{ s: "That is its second job:" }]],
      [T.irisBOpen + 0.625, T.question, [{ s: "it sets how big the blur gets." }], 1],
      [T.question, T.grid - 0.2, [{ s: "But a disc is never a point." }]],
      [T.question + 1.25, T.grid - 0.2, [{ s: "So when does a disc look " }, it("sharp?")], 1],
    ], 150, 200);
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
    return { x, y, pitch, alpha: clamp((t - T.grid - 0.05) / 0.3) };
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
    if (alpha <= 0.001 || fr.pitch < 5) return;
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
      const zc = sp(t - T.grid, SPR.card);
      if (zc < 0.999) {
        const pr = lerpRect(PANEL, FULL, zc);
        ctx.beginPath();
        ctx.rect(pr.x, pr.y, pr.w, pr.h);
        ctx.clip();
      }
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
      riseRuns(ctx, [{ s: s.label }], s.x, H / 2 + 160, { kind: "mono", size: 52, color: C.ink }, ph.in, ph.out, "center");
    });

    // one photosite's width
    const pw = phase(t, T.grid + 1.1, T.grain - 0.2, SPR.ui, 0.25);
    if (pw.in > 0.001) {
      const x0 = fr.x - fr.pitch / 2;
      const y = fr.y - fr.pitch / 2 - 26;
      hdim(ctx, x0 + 3, x0 + fr.pitch - 3, y, C.ink, clamp(pw.in * 1.3) * (1 - pw.out), 2.5);
      chip(ctx, "6 µm", x0 + fr.pitch / 2, y - 56, pw.in, pw.out, { size: 52, align: "center", fill: C.ink });
    }
    // the cones' spacing, in the magnifier
    const cs = phase(t, T.eye + 0.5, T.print - 0.15, SPR.ui, 0.25);
    chip(ctx, "2.5 µm apart", BUB.x - 60, BUB.y + BUB.r + 56, cs.in, cs.out, { size: 48, align: "center", fill: C.ink });

    captions(ctx, t, [
      [T.grid + 0.3, T.dot, [{ s: "Zoom into the sensor:" }]],
      [T.grid + 1.25, T.dot, [{ s: "a grid of tiny light meters, " }, it("pixels"), { s: "." }], 1],
      [T.dot, T.smallDisc, [{ s: "A sharp point lights one pixel." }]],
      [T.smallDisc, T.same, [{ s: "A disc smaller than a pixel" }]],
      [T.smallDisc + 0.625, T.same, [{ s: "lights it " }, it("exactly the same"), { s: "." }], 1],
      [T.same, T.bigDisc, [{ s: "To the sensor, it is still a point." }]],
      [T.bigDisc, T.grain, [{ s: "Only a disc bigger than a pixel" }]],
      [T.bigDisc + 0.625, T.grain, [{ s: "spreads out and shows as " }, it("blur"), { s: "." }], 1],
      [T.grain, T.fastFilm, [{ s: "Film works the same way," }]],
      [T.grain + 0.625, T.fastFilm, [{ s: "with grains of " }, it("silver"), { s: "." }], 1],
      [T.fastFilm, T.cones, [{ s: "Faster film, " }, it("bigger"), { s: " grains." }]],
      [T.cones, T.arcmin, [{ s: "So does your eye," }]],
      [T.cones + 0.625, T.arcmin, [{ s: "with cells called " }, it("cones"), { s: "." }], 1],
    ]);
  }

  // ------------------------------------------------------------------ the chain: eye, print, sensor

  const PRINT = { x: 180, y: 470, w: 390, h: 260 }; // a 15 x 10 cm print, held 40 cm from the eye

  // The dot the eye cannot split, from the print to the sensor and into its photosites.
  // Drawn wider than life (r = 15 px on the held print) so it can be seen; after the dive
  // its radius is 15 µm at 12 px per µm, so the photosites under it are 6 µm.
  const COC_R = 15 * UM;
  function diveRing(t) {
    const fwd = sp(t - T.shrink, SPR.card);
    const shrink = sp(t - T.shrink2, SPR.card);
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
      font(ctx, "mono", 50);
      ctx.fillStyle = C.ink;
      ctx.textAlign = "center";
      const label = shrink < 0.5 ? "15 cm print" : "36 mm sensor";
      ctx.globalAlpha = sizeA * (1 - dive);
      ctx.fillText(label, pcx, pcy + pr.h / 2 + 64);
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
        font(ctx, "mono", 50);
        ctx.fillStyle = C.ink;
        ctx.textAlign = "center";
        ctx.fillText("40 cm", (pcx + nx) / 2, 854);
        ctx.restore();
      }
    }

    // captions and numbers
    const cap = phase(t, T.arcmin, T.print - 0.15, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "The finest detail it can see:" }], 150, 190, { kind: "serif", size: 84, color: C.ink }, cap.in, cap.out);
    const big = phase(t, T.arcmin + 0.15, T.print - 0.15, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "1′", color: C.accent }], 150, 520, { kind: "serif", size: 300, color: C.ink }, big.in, big.out);
    const cap2 = phase(t, T.arcmin + 0.625, T.print - 0.15, SPR.type, 0.3);
    riseRuns(ctx, [{ s: "one arcminute, 1/60°" }], 150, 630, { kind: "mono", size: 52, color: C.ink }, cap2.in, cap2.out);
    captions(ctx, t, [
      [T.print, T.shrink, [{ s: "Hold a 15 cm print 40 cm away:" }]],
      [T.print + 1.25, T.shrink2, [{ s: "1′ covers just " }, ac("0.12 mm"), { s: " of it." }], 1],
      [T.shrink, T.shrink2, [{ s: "The print is 4.2 times the sensor," }]],
      [T.shrink2, T.coc - 0.3, [{ s: "so on the sensor, it is " }, ac("0.03 mm"), { s: "." }]],
    ]);
  }

  // The circle of confusion on the sensor: five photosites across.
  function actC2(ctx, t) {
    const R = diveRing(t);
    const pitch = (R.r * 6) / 15;
    const fr = { x: R.x, y: R.y, pitch };
    const out = phase(t, T.coc - 0.4, T.back, SPR.ui, 0.5);
    drawPixels(ctx, fr, new Map(), clamp((pitch - 10) / 30) * (1 - out.out), { x0: 0, y0: 0, x1: W, y1: H });
    if (R.dive > 0) {
      ctx.save();
      ctx.globalAlpha = 1 - out.out;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = lerp(3.5, 6, R.dive);
      ctx.beginPath();
      ctx.arc(fr.x, fr.y, R.r, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    const dim = phase(t, T.coc + 0.6, T.back - 0.3, SPR.ui, 0.3);
    hdim(ctx, fr.x - R.r, fr.x + R.r, fr.y + R.r + 46, C.accent, clamp(dim.in * 1.4) * (1 - dim.out));
    chip(ctx, "0.03 mm", fr.x, fr.y + R.r + 110, dim.in, dim.out, { size: 44, align: "center" });
    const five = phase(t, T.coc + 1.25, T.back - 0.3, SPR.ui, 0.3);
    if (five.in > 0.001) {
      ctx.save();
      ctx.globalAlpha = clamp(five.in * 1.3) * (1 - five.out);
      font(ctx, "mono", 50);
      ctx.fillStyle = C.ink;
      ctx.textAlign = "left";
      ctx.fillText("5 photosites", fr.x + R.r + 40, fr.y + 16);
      ctx.restore();
    }
    captions(ctx, t, [
      [T.coc + 0.5, T.back, [{ s: "Any blur smaller than this ring" }]],
      [T.coc + 1.1, T.back, [{ s: "looks " }, it("sharp"), { s: " to you." }], 1],
    ]);
    captions(ctx, t, [[T.cocLabel, T.back, [{ s: "Photographers call it " }, { s: "the circle of confusion", italic: true, color: C.accent }, { s: "." }]]], 150, 1010, { kind: "serif", size: 64, color: C.ink });
  }

  // ------------------------------------------------------------------ act D

  // The chart: distance along the bottom, each domino's blur disc above it, drawn 1200 times
  // life size, with the circle of confusion as an orange ring.
  const CH = { z0: 690, z1: 950, x0: 160, x1: 1760, axis: 860, discY: 560, k: 1200 };
  const chX = (z) => CH.x0 + ((z - CH.z0) * (CH.x1 - CH.x0)) / (CH.z1 - CH.z0);
  const PIPS_ICON = SC.DOMS.map((d) => d.pips);
  const ND = (t) => O.stopN(M.stopD(t));

  const PIP_LAYOUT = {
    0: [],
    1: [[0, 0]],
    2: [[1, 1], [-1, -1]],
    3: [[1, 1], [0, 0], [-1, -1]],
    4: [[1, 1], [-1, 1], [1, -1], [-1, -1]],
    5: [[1, 1], [-1, 1], [0, 0], [1, -1], [-1, -1]],
    6: [[1, 1], [-1, 1], [1, 0], [-1, 0], [1, -1], [-1, -1]],
  };

  // When each domino's disc comes to fit its ring, and the stops the readouts show.
  const ENTRIES = M.crossings().filter((c) => c.enter);
  const lastEntry = (i, t) => ENTRIES.reduce((m, c) => (c.i === i && c.t <= t ? c.t : m), undefined);
  const MARKS_D = M.marksD();

  // A small upright domino standing on yBase, centered at x. pop: a brief jump in scale.
  function dominoIcon(ctx, x, yBase, w, pips, alpha, lit, pop = 0) {
    if (alpha <= 0.001) return;
    const h = w * 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (pop > 0.001) {
      ctx.translate(x, yBase);
      ctx.scale(1 + pop, 1 + pop);
      ctx.translate(-x, -yBase);
    }
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

  // Where each domino stands in the photograph (face center and width), to morph from.
  const photoView = { cx: W / 2, cy: H * 0.39, S: W / 36 };
  function photoDomino(d) {
    const c = SC.proj(photoView, [d.x, -SC.HCAM + 24, d.z]);
    return { x: c[0], y: c[1], w: (24 * photoView.S * O.f) / d.z };
  }

  function actD(ctx, t) {
    const N = ND(t);
    const s = O.FOCUS;
    const [zn, zf] = O.limits(N, s);
    const gone = t < T.answer ? 0 : ease.inCubic(clamp((t - T.answer) / 0.35));
    if (gone >= 0.999) return;

    // back to the photograph at f/1.4, which then gives way to the chart
    const rise = sp(t - T.back, SPR.card);
    const photoA = clamp(rise * 1.3) * (1 - ease.inOutCubic(clamp((t - T.chart) / 1.2)));
    if (photoA > 0.001) {
      ctx.save();
      ctx.globalAlpha = photoA;
      ctx.translate(0, (1 - rise) * 120);
      picture(ctx, FULL, { s, N: Math.SQRT2 });
      ctx.restore();
    }
    captions(ctx, t, [[T.back + 0.3, T.chart, [{ s: "Back to the eight dominoes, at f/1.4." }]]], 150, 200);

    ctx.save();
    ctx.globalAlpha = 1 - gone;
    // the axis, its ticks, and the sharp zone on it
    const ap = ease.outCubic(clamp((t - T.chart - 0.8) / 0.8));
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CH.x0, CH.axis);
    ctx.lineTo(lerp(CH.x0, CH.x1, ap), CH.axis);
    ctx.stroke();
    font(ctx, "mono", 42);
    ctx.textAlign = "center";
    for (let z = 700; z <= 950; z += 50) {
      const x = chX(z);
      const a = clamp((ap - ((x - CH.x0) / (CH.x1 - CH.x0)) * 0.75) * 4);
      if (a <= 0) continue;
      ctx.globalAlpha = (1 - gone) * a;
      ctx.fillStyle = C.dim;
      ctx.fillRect(x - 1, CH.axis + 8, 2, 14);
      ctx.fillText(String(z / 10), x, CH.axis + 66);
    }
    ctx.globalAlpha = 1 - gone;
    const ul = phase(t, T.chart + 1.3, Infinity, SPR.type);
    riseRuns(ctx, [{ s: "cm" }], CH.x1 + 34, CH.axis + 66, { kind: "mono", size: 42, color: C.dim }, ul.in, 0, "left");

    const band = sp(t - T.band2, SPR.ui);
    if (band > 0.001) {
      const xa = chX(Math.max(zn, CH.z0));
      const xb = chX(Math.min(zf, CH.z1));
      const mid = chX(s);
      ctx.fillStyle = C.accent;
      ctx.fillRect(lerp(mid, xa, band), CH.axis - 7, lerp(mid, xb, band) - lerp(mid, xa, band), 14);
    }

    // dominoes leave the photograph for their places on the axis; discs and rings follow
    const ap9 = SC.aperturePath(N);
    SC.DOMS.forEach((d, i) => {
      const x = chX(d.z);
      const m = sp(t - (T.chart + 0.15 + i * 0.07), [60, 2 * Math.sqrt(60)]);
      if (t < T.chart) return;
      const from = photoDomino(d);
      const c = O.disc(d.z, N, s);
      const inside = c <= O.coc;
      const te = lastEntry(i, t);
      const pop = te !== undefined && t >= te ? 0.28 * Math.pow(clamp(1 - (t - te) / 0.3), 2) : 0;
      const w = lerp(from.w, 40, m);
      const yBase = lerp(from.y + from.w, CH.axis - 10, m);
      dominoIcon(ctx, lerp(from.x, x, m), yBase, w, PIPS_ICON[i], clamp((t - T.chart) * 3), inside || m < 0.6, pop);
      // the blur disc
      const p = sp(t - (T.discs + Math.abs(i - O.FOCUS_INDEX) * 0.1), SPR.card);
      if (p > 0.001) {
        const dpx = Math.max(c * CH.k, 7) * p;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const a = clamp(0.95 * Math.pow(12 / Math.max(dpx, 12), 0.62), 0.14, 0.95);
        SC.bokeh(ctx, ctx.getTransform(), ap9, x, lerp(CH.axis - 60, CH.discY, p), dpx, WARM, a * clamp(p * 1.4));
        ctx.restore();
      }
      // the limit you can see
      const rp = sp(t - (T.rings + Math.abs(i - O.FOCUS_INDEX) * 0.1), SPR.ui);
      if (rp > 0.001) {
        ctx.save();
        ctx.globalAlpha *= clamp(rp * 1.4);
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, CH.discY, ((O.coc * CH.k) / 2 + 1.5) * lerp(2.5, 1, rp), 0, TAU);
        ctx.stroke();
        if (inside && t > T.band) {
          ctx.fillStyle = "rgba(255,106,26,0.18)";
          ctx.fill();
        }
        ctx.restore();
      }
    });

    // the f-number, with the iris it sets
    const fv = MARKS_D.map(([tt, k]) => [tt, O.LABELS[k]]);
    flipLabel(ctx, t, fv, 150, 250, { kind: "serif", size: 150, color: C.ink }, (v) => [it("f/"), { s: v }]);
    const ir = sp(t - (T.chart + 1.0), SPR.card);
    if (ir > 0.001) miniIris(ctx, 640, 200, 78 * ir, 1.414 / N);

    // light and depth
    const tl = T.stopsD[0] - 1.25;
    const lname = (k) => (k === 1 ? "1" : "1/" + Math.pow(2, k - 1));
    const lv = [[tl, "1"], ...MARKS_D.slice(1).map(([tt, k]) => [tt, lname(k)])];
    const lb = phase(t, tl, Infinity, SPR.type);
    riseRuns(ctx, [{ s: "light" }], 1290, 124, { kind: "mono", size: 54, color: C.dim }, lb.in, 0, "right");
    flipLabel(ctx, t, lv, 1290, 250, { kind: "serif", size: 110, color: C.ink }, (v) => [{ s: v }], "right");
    const db = phase(t, T.band2, Infinity, SPR.type);
    riseRuns(ctx, [{ s: "depth of field" }], 1770, 124, { kind: "mono", size: 54, color: C.accent }, db.in, 0, "right");
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

    captions(ctx, t, [
      [T.chart + 0.3, T.discs, [{ s: "Stand them along a line, by distance from the lens." }]],
      [T.discs, T.rings, [{ s: "Above each: the blur disc it makes, enlarged." }]],
      [T.rings, T.band, [{ s: "Around each: the ring, the smallest blur you can see." }]],
      [T.band, T.band2, [{ s: "Only one disc fits inside its ring." }]],
      [T.band2, T.stopsD[0], [{ s: "That narrow range is the " }, it("depth of field"), { s: "." }]],
      [T.stopsD[0], T.light, [{ s: "Now close the aperture, a stop at a time." }]],
      [T.light, T.both, [{ s: "1/128 of the light, but about 12 times the " }, it("depth"), { s: "." }]],
      [T.both, T.answer, [{ s: "The aperture trades " }, it("light"), { s: " for " }, it("depth"), { s: "." }]],
    ], 150, 1020, { kind: "serif", size: 72, color: C.ink });
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
    const mk = phase(t, T.inFocus + 0.15, T.recap - 0.1, SPR.ui, 0.3);
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
    const ins = phase(t, T.inset, T.recap - 0.1, SPR.card, 0.35);
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
      const lb = phase(t, T.inset + 0.3, T.recap - 0.1, SPR.type, 0.3);
      const mono = { kind: "mono", size: 46, color: C.ink };
      riseRuns(ctx, [{ s: "blur " }, { s: `${c.toFixed(3)} mm` }], 1460, 572, mono, lb.in, lb.out);
      riseRuns(ctx, [{ s: "limit " }, { s: "0.030 mm", color: C.accent }], 1460, 632, { ...mono, color: C.dim }, lb.in, lb.out);
    }

    // the iris opening on the picture
    const r = lerp(9, 1250, open);
    if (r < 1250) {
      ctx.save();
      ctx.globalAlpha = fadeIn;
      iris(ctx, r, 0.4 + r * 0.0007, cx, cy);
      ctx.restore();
    }
    // the picture gives way to the chain
    const out = ease.inOutCubic(clamp((t - T.recap) / 0.7));
    if (out > 0) {
      ctx.fillStyle = `rgba(12,15,23,${out})`;
      ctx.fillRect(0, 0, W, H);
    }
    captions(ctx, t, [
      [T.inFocus, T.rest, [{ s: "Only one distance is in " }, it("focus"), { s: "." }]],
      [T.rest, T.recap, [{ s: "The other seven blur by less" }]],
      [T.rest + 0.625, T.recap, [{ s: "than you can " }, it("see"), { s: "." }], 1],
    ], 150, 250, { kind: "serif", size: 92, color: C.ink });
  }

  // ------------------------------------------------------------------ act G: the chain, once

  const LADDER = [250, 600, 960, 1320, 1670];
  const LADDER_Y = 560;
  const LS = 1.2; // ladder scale

  function actG(ctx, t) {
    const gone = ease.inCubic(clamp((t - T.coda) / 0.5));
    if (gone >= 0.999) return;
    ctx.save();
    ctx.globalAlpha = 1 - gone;
    const openAt = (k) => lerp(1, Math.SQRT2 / 16, ease.inOutCubic(clamp((t - T.recapRun - k * 0.45) / 1.4)));
    const names = ["aperture", "cone of light", "blur disc", "against the ring", "depth of field"];
    LADDER.forEach((x, k) => {
      const p = sp(t - (T.recap + 0.625 + k * 1.25), SPR.card);
      if (p <= 0.001) return;
      const o = openAt(k);
      const y = LADDER_Y + (1 - p) * 40;
      ctx.save();
      ctx.globalAlpha *= clamp(p * 1.4);
      if (k === 0) miniIris(ctx, x, y, 100 * LS, o);
      if (k === 1) {
        ctx.fillStyle = C.tint;
        ctx.beginPath();
        ctx.moveTo(x - 120, y - 110 * o);
        ctx.lineTo(x + 120, y);
        ctx.lineTo(x - 120, y + 110 * o);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      if (k === 2 || k === 3) {
        const d = Math.max(8, 210 * o);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        SC.bokeh(ctx, ctx.getTransform(), SC.aperturePath(Math.SQRT2 / o), x, y, d, WARM, clamp(0.95 * Math.pow(14 / d, 0.55), 0.2, 0.95));
        ctx.restore();
        if (k === 3) {
          ctx.strokeStyle = C.accent;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x, y, 40, 0, TAU);
          ctx.stroke();
          if (d < 80) {
            ctx.fillStyle = "rgba(255,106,26,0.18)";
            ctx.fill();
          }
        }
      }
      if (k === 4) {
        ctx.strokeStyle = C.rule;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 130, y + 20);
        ctx.lineTo(x + 130, y + 20);
        ctx.stroke();
        const half = clamp(14 / o, 14, 125);
        ctx.fillStyle = C.accent;
        ctx.fillRect(x - half, y + 13, half * 2, 14);
      }
      ctx.restore();
      riseRuns(ctx, [{ s: names[k] }], x, LADDER_Y + 210, { kind: "serif", size: 58, color: C.ink }, p, 0, "center");
      // the arrow from the link before
      if (k > 0) {
        ctx.save();
        ctx.globalAlpha *= clamp(p * 1.4);
        ctx.fillStyle = C.dim;
        const ax = (LADDER[k - 1] + x) / 2 + 10;
        arrowHead(ctx, ax + 12, LADDER_Y, 1, 0, 20);
        ctx.fillRect(ax - 22, LADDER_Y - 1.5, 28, 3);
        ctx.restore();
      }
    });
    ctx.restore();
    captions(ctx, t, [
      [T.recap, T.recapRun, [{ s: "The whole chain, once:" }]],
      [T.recapRun, T.coda, [{ s: "Close the aperture, and every link follows:" }]],
      [T.recapRun + 2.5, T.coda, [{ s: "a narrower cone, a smaller disc, a deeper sharp zone." }], 1],
    ], 150, 220, { kind: "serif", size: 76, color: C.ink });
  }

  // ------------------------------------------------------------------ act H: who draws the ring

  // The limit you can see, as the picture is looked at more closely in the coda.
  const cocH = (t) => lerp(O.coc, 0.01, ease.inOutCubic(clamp((t - (T.closer + 1.25)) / 2.2)));
  const ENTER_H = [];

  function actH(ctx, t) {
    const N = 16;
    const s = O.FOCUS;
    const coc = cocH(t);
    const [zn, zf] = O.limits(N, s, coc);
    const shrinkR = (coc / O.coc) * ((O.coc * CH.k) / 2 + 1.5);
    const gone = t < T.close ? 0 : ease.inCubic(clamp((t - T.close) / 0.5));
    ctx.save();
    ctx.globalAlpha = 1 - gone;
    const ap = ease.outCubic(clamp((t - T.coda - 0.2) / 0.8));
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CH.x0, CH.axis);
    ctx.lineTo(lerp(CH.x0, CH.x1, ap), CH.axis);
    ctx.stroke();
    font(ctx, "mono", 42);
    ctx.textAlign = "center";
    ctx.fillStyle = C.dim;
    for (let z = 700; z <= 950; z += 50) {
      const x = chX(z);
      ctx.save();
      ctx.globalAlpha *= clamp((ap - ((x - CH.x0) / (CH.x1 - CH.x0)) * 0.75) * 4);
      ctx.fillRect(x - 1, CH.axis + 8, 2, 14);
      ctx.fillText(String(z / 10), x, CH.axis + 66);
      ctx.restore();
    }
    const bandP = sp(t - (T.coda + 0.6), SPR.ui);
    ctx.fillStyle = C.accent;
    const xa = chX(Math.max(zn, CH.z0));
    const xb = chX(Math.min(zf, CH.z1));
    const mid = chX(s);
    ctx.fillRect(lerp(mid, xa, bandP), CH.axis - 7, lerp(mid, xb, bandP) - lerp(mid, xa, bandP), 14);
    const ap9 = SC.aperturePath(N);
    SC.DOMS.forEach((d, i) => {
      const x = chX(d.z);
      const p = sp(t - (T.coda + 0.2 + Math.abs(i - O.FOCUS_INDEX) * 0.06), SPR.card);
      const c = O.disc(d.z, N, s);
      const inside = c <= coc;
      dominoIcon(ctx, x, CH.axis - 10, 40, PIPS_ICON[i], clamp(p * 1.4), inside);
      const dpx = Math.max(c * CH.k, 7) * p;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      SC.bokeh(ctx, ctx.getTransform(), ap9, x, CH.discY, dpx, WARM, clamp(0.95 * Math.pow(12 / Math.max(dpx, 12), 0.62), 0.14, 0.95) * clamp(p * 1.4));
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= clamp(p * 1.4);
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, CH.discY, shrinkR, 0, TAU);
      ctx.stroke();
      if (inside) {
        ctx.fillStyle = "rgba(255,106,26,0.18)";
        ctx.fill();
      }
      ctx.restore();
    });
    // readouts: the limit and the depth it allows
    const rd = phase(t, T.coda + 0.6, Infinity, SPR.type);
    riseRuns(ctx, [{ s: "f/16" }], 150, 250, { kind: "serif", size: 150, color: C.ink }, rd.in, 0);
    riseRuns(ctx, [{ s: "limit" }], 1290, 124, { kind: "mono", size: 54, color: C.accent }, rd.in, 0, "right");
    riseRuns(ctx, [{ s: "depth of field" }], 1770, 124, { kind: "mono", size: 54, color: C.accent }, rd.in, 0, "right");
    if (rd.in > 0.001) {
      K.masked(ctx, 860, 1800, 250, 110, 40, rd.in, 0, () => {
        font(ctx, "serif", 70, { italic: true });
        ctx.fillStyle = C.ink;
        ctx.textAlign = "right";
        ctx.fillText("mm", 1290, 250);
        odometer(ctx, coc, 1290 - 120, 250, { size: 110, color: C.ink, decimals: 3, slot: 0.46 });
        font(ctx, "serif", 70, { italic: true });
        ctx.textAlign = "right";
        ctx.fillText("cm", 1770, 250);
        odometer(ctx, (zf - zn) / 10, 1770 - 92, 250, { size: 110, color: C.ink, decimals: 1, slot: 0.46 });
      });
    }
    ctx.restore();
    captions(ctx, t, [
      [T.coda + 0.3, T.closer, [{ s: "One last question: who draws the ring?" }]],
      [T.closer, T.thinner, [{ s: "Print it three times bigger, or look closer," }]],
      [T.closer + 1.25, T.thinner, [{ s: "and you can see three times finer blur." }], 1],
      [T.thinner, T.who, [{ s: "The ring shrinks, fewer dominoes fit," }]],
      [T.thinner + 0.625, T.who, [{ s: "and the sharp zone gets " }, it("thinner"), { s: "." }], 1],
      [T.who, T.close, [{ s: "Depth of field depends on " }, it("who is looking"), { s: "." }]],
    ], 150, 400, { kind: "serif", size: 72, color: C.ink });

    // the iris closes on the lockup
    const closeP = t < T.close ? 0 : ease.inOutCubic(clamp((t - T.close) / 0.7));
    if (closeP > 0) iris(ctx, 1250 * (1 - closeP), 0.4 + 1250 * (1 - closeP) * 0.0007);
    if (t >= T.lockup - 0.1) {
      const lk = phase(t, T.lockup, Infinity, SPR.type);
      const lk2 = phase(t, T.lockup + 0.3125, Infinity, SPR.type);
      const lb = { kind: "serif", size: 140, color: C.ink };
      riseRuns(ctx, [{ s: "Sharp is just" }], W / 2, 500, lb, lk.in, 0, "center");
      riseRuns(ctx, [{ s: "blur you " }, { s: "can\u2019t see", italic: true, color: C.accent }, { s: "." }], W / 2, 660, lb, lk2.in, 0, "center");
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
    if (t < T.apIntro + 1.0) actA(ctx, t);
    if (t >= T.apIntro && t < T.turn + 1.0) actAp(ctx, t);
    if (t < T.turn + 0.5) fNumber(ctx, t);
    if (t >= T.turn && t < T.grid + 1.2) actB(ctx, t);
    if (t >= T.grid && t < T.coc + 0.6) actC(ctx, t);
    if (t >= T.coc - 0.5 && t < T.back + 1.0) actC2(ctx, t);
    if (t >= T.back && t < T.answer + 0.5) actD(ctx, t);
    if (t >= T.answer && t < T.recap + 0.8) actE(ctx, t);
    if (t >= T.recap && t < T.coda + 0.6) actG(ctx, t);
    if (t >= T.coda) actH(ctx, t);
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
