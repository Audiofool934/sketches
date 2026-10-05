// The picture: eight ivory dominoes on a black lacquered table, in front of a tall window
// over a city at night, seen through the film's 50 mm lens. Everything is blurred by the
// disc its own distance makes on the sensor (FM.optics.disc), so focus and aperture act the
// way they do in a camera. Bright point lights are drawn as discs in the aperture's shape.
//
// Camera coordinates in millimeters: x right, y up (0 at the lens), z away from the lens.
// A view maps them to the screen: {cx, cy} is where the lens axis lands, S is px per mm
// of sensor. The 16:9 frame is a crop of the 36 mm wide sensor.
(function () {
  const FM = globalThis.FM;
  const K = FM.kit;
  const O = FM.optics;
  const { clamp, lerp, mulberry32, TAU } = K;

  const HCAM = 100; // lens height above the table
  const Z_EDGE = 2500; // far edge of the table
  const SIGMA = 1 / 3.6; // Gaussian sigma per unit of disc diameter: same edge spread as the disc

  // ------------------------------------------------------------------ blur helpers

  const pool = [];
  function scratch(i, w, h) {
    let c = pool[i];
    if (!c) c = pool[i] = document.createElement("canvas");
    if (c.width < w || c.height < h) {
      c.width = Math.max(c.width, w, 64);
      c.height = Math.max(c.height, h, 64);
    }
    return c;
  }

  // Draw drawFn's output blurred by a Gaussian of `sigma` (in the current user units).
  // box: the user-space bounds of what drawFn draws. Large blurs work at reduced resolution.
  // o.sprite: always go through an offscreen canvas (drawFn may use destination-out).
  // o.post(c): runs on the blurred result in user space, e.g. to apply a mask.
  // o.op: how the result is composited. o.minDown: the least downsampling to use.
  function blurred(ctx, box, sigma, drawFn, o = {}) {
    const m = ctx.getTransform();
    const ds = Math.hypot(m.a, m.b);
    const sd = sigma * ds;
    const minDown = o.minDown || 1;
    if (sd < (o.sharp || 0.3) && minDown <= 1 && !o.sprite && !o.post && !o.op) {
      drawFn(ctx);
      return;
    }
    const pad = Math.ceil(sd * 2.8) + 2;
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const X0 = Math.max(-pad, Math.floor(m.a * box.x0 + m.e) - pad);
    const Y0 = Math.max(-pad, Math.floor(m.d * box.y0 + m.f) - pad);
    const X1 = Math.min(cw + pad, Math.ceil(m.a * box.x1 + m.e) + pad);
    const Y1 = Math.min(ch + pad, Math.ceil(m.d * box.y1 + m.f) + pad);
    if (X1 <= X0 || Y1 <= Y0) return;
    const d = Math.max(minDown, sd > 4 ? Math.min(8, sd / 2.5) : 1);
    const w = Math.ceil((X1 - X0) / d) + 2;
    const h = Math.ceil((Y1 - Y0) / d) + 2;
    // a cleared margin keeps smoothing from sampling stale pixels at the edges
    const A = scratch(0, w + 4, h + 4);
    const B = scratch(1, w + 4, h + 4);
    const a = A.getContext("2d");
    const b = B.getContext("2d");
    const local = [m.a / d, m.b / d, m.c / d, m.d / d, (m.e - X0) / d, (m.f - Y0) / d];
    a.setTransform(1, 0, 0, 1, 0, 0);
    a.clearRect(0, 0, w + 4, h + 4);
    a.save();
    a.setTransform(...local);
    drawFn(a);
    a.restore();
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, w + 4, h + 4);
    b.save();
    b.beginPath();
    b.rect(0, 0, w, h);
    b.clip();
    if (sd >= 0.3) b.filter = `blur(${(sd / d).toFixed(3)}px)`;
    b.drawImage(A, 0, 0, w, h, 0, 0, w, h);
    b.restore();
    if (o.post) {
      b.save();
      b.beginPath();
      b.rect(0, 0, w, h);
      b.clip();
      b.setTransform(...local);
      o.post(b);
      b.restore();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (o.op) ctx.globalCompositeOperation = o.op;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(B, 0, 0, w, h, X0, Y0, w * d, h * d);
    ctx.restore();
  }

  // ------------------------------------------------------------------ the aperture

  // The opening of a nine-blade iris with rounded blades, circumradius 1, as a Path2D.
  // Wide open it is a circle; stopped down the blades show as nine slightly curved sides.
  function aperturePath(N) {
    const k = O.stopOf(N);
    const round = clamp(1 - (k - 1) * 0.28, 0.42, 1);
    const path = new Path2D();
    const n = 9;
    const rot = -Math.PI / 2 + 0.18;
    const sub = 6;
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i * TAU) / n;
      const a1 = rot + ((i + 1) * TAU) / n;
      for (let j = 0; j < sub; j++) {
        const s = j / sub;
        const a = lerp(a0, a1, s);
        // straight chord between the corners, pushed out toward the circle by `round`
        const chord = Math.cos(Math.PI / n) / Math.cos(a - (a0 + a1) / 2);
        const r = lerp(chord, 1, round);
        if (i === 0 && j === 0) path.moveTo(r * Math.cos(a), r * Math.sin(a));
        else path.lineTo(r * Math.cos(a), r * Math.sin(a));
      }
    }
    path.closePath();
    return path;
  }

  // ------------------------------------------------------------------ the city at infinity

  // Angles are tangents: u = x / z, v = y / z. The frame at S = 53.3 spans u = ±0.36.
  const CITY = { u0: -0.42, u1: 0.42, v0: -0.05, v1: 0.26, ppu: 2667 };
  const sky = [
    [0.26, [6, 9, 18]],
    [0.12, [10, 16, 32]],
    [0.04, [24, 31, 52]],
    [0.0, [52, 50, 66]],
    [-0.05, [40, 38, 52]],
  ];
  function skyAt(v) {
    for (let i = 1; i < sky.length; i++) {
      if (v >= sky[i][0]) {
        const t = (v - sky[i][0]) / (sky[i - 1][0] - sky[i][0]);
        const a = sky[i][1];
        const b = sky[i - 1][1];
        return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
      }
    }
    return sky[sky.length - 1][1];
  }
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  // Buildings and the bright lights that become bokeh, generated once from a seed.
  const BUILDINGS = [];
  const LIGHTS = [];
  (function city() {
    const rnd = mulberry32(1607);
    let u = CITY.u0;
    while (u < CITY.u1) {
      const w = 0.018 + rnd() * 0.05;
      // the skyline climbs to the right, leaving the upper left as quiet sky for type
      const rise = K.ease.smooth(clamp((u - CITY.u0) / (CITY.u1 - CITY.u0 - 0.1)));
      const tall = rnd() < 0.1 + 0.2 * rise;
      const top = (tall ? 0.07 + rnd() * 0.11 : 0.008 + rnd() * 0.06) * lerp(0.35, 1.05, rise);
      const shade = 8 + rnd() * 9;
      BUILDINGS.push({ u0: u, u1: u + w, top, color: [shade * 0.8, shade, shade * 1.8], seed: (rnd() * 1e9) | 0 });
      u += w + (rnd() < 0.3 ? rnd() * 0.012 : 0);
    }
    // bright lights: building tops, a few lit floors, and two rows of street lamps far below
    const pick = (a) => a[(rnd() * a.length) | 0];
    const cool = [[220, 233, 255], [200, 220, 255], [150, 190, 255], [235, 240, 255]];
    const warm = [[255, 190, 120], [255, 214, 160]];
    for (const b of BUILDINGS) {
      const n = Math.round(1 + rnd() * 2.4 + (b.top > 0.08 ? 1 : 0));
      for (let i = 0; i < n; i++) {
        const lu = lerp(b.u0 + 0.004, b.u1 - 0.004, rnd());
        const lv = lerp(-0.02, b.top - 0.004, Math.pow(rnd(), 0.7));
        LIGHTS.push({ u: lu, v: lv, c: rnd() < 0.2 ? pick(warm) : pick(cool), e: 0.5 + rnd() * 1.2 });
      }
    }
    for (let i = 0; i < 46; i++) {
      const lu = lerp(CITY.u0, CITY.u1, (i + rnd() * 0.6) / 46);
      LIGHTS.push({ u: lu, v: -0.006 - rnd() * 0.012, c: [255, 176, 92], e: 0.45 + rnd() * 0.5 });
    }
  })();

  // The dim city: building blocks and thousands of small windows, drawn once into a sprite.
  let citySprite = null;
  function getCitySprite() {
    if (citySprite) return citySprite;
    const W = Math.ceil((CITY.u1 - CITY.u0) * CITY.ppu);
    const H = Math.ceil((CITY.v1 - CITY.v0) * CITY.ppu);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    const X = (u) => (u - CITY.u0) * CITY.ppu;
    const Y = (v) => (CITY.v1 - v) * CITY.ppu;
    for (const b of BUILDINGS) {
      x.fillStyle = rgb(b.color);
      x.fillRect(X(b.u0), Y(b.top), (b.u1 - b.u0) * CITY.ppu, Y(CITY.v0) - Y(b.top));
      const rnd = mulberry32(b.seed);
      const cols = Math.max(2, Math.round((b.u1 - b.u0) / 0.0042));
      const rows = Math.max(2, Math.round((b.top - CITY.v0) / 0.0046));
      const p = 0.1 + rnd() * 0.3;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (rnd() > p) continue;
          const u = lerp(b.u0, b.u1, (i + 0.5) / cols);
          const v = b.top - (j + 0.7) * ((b.top - CITY.v0) / rows);
          const warm = rnd() < 0.55;
          x.fillStyle = warm ? `rgba(255,${200 + rnd() * 30},${130 + rnd() * 50},${0.35 + rnd() * 0.5})` : `rgba(${190 + rnd() * 40},${215 + rnd() * 30},255,${0.3 + rnd() * 0.5})`;
          x.fillRect(X(u) - 2.2, Y(v) - 1.6, 4.4, 3.2);
        }
      }
    }
    citySprite = c;
    return c;
  }

  // The city blurred at a ladder of sizes, made once and kept; a frame draws the two
  // nearest sizes, the second one faded in by how far between them it falls.
  const LEVELS = [0, 1.5, 3, 5, 8, 12, 18, 27, 40, 60]; // sigma, in sprite pixels
  const levelCache = [];
  function cityLevel(k) {
    if (levelCache[k]) return levelCache[k];
    const src = getCitySprite();
    const sg = LEVELS[k];
    const down = sg >= 18 ? 4 : sg >= 8 ? 2 : 1;
    const pad = Math.ceil((sg * 3) / down) + 2;
    const c = document.createElement("canvas");
    c.width = Math.ceil(src.width / down) + pad * 2;
    c.height = Math.ceil(src.height / down) + pad * 2;
    const x = c.getContext("2d");
    if (sg > 0) x.filter = `blur(${sg / down}px)`;
    x.drawImage(src, pad, pad, src.width / down, src.height / down);
    return (levelCache[k] = { c, down, pad });
  }
  // The city in box (user space), blurred by sigma (user px), drawn only where it meets
  // vis. flipAt mirrors it about a horizontal line (vis is then in the mirrored space).
  function drawCity(ctx, box, sigma, vis, flipAt) {
    const src = getCitySprite();
    const k = (box.x1 - box.x0) / src.width;
    const sg = sigma / k;
    let i = 0;
    while (i < LEVELS.length - 2 && LEVELS[i + 1] < sg) i++;
    const w = clamp((sg - LEVELS[i]) / (LEVELS[i + 1] - LEVELS[i]));
    // the visible rows, in the unmirrored drawing
    const vy0 = flipAt === undefined ? vis.y0 : 2 * flipAt - vis.y1;
    const vy1 = flipAt === undefined ? vis.y1 : 2 * flipAt - vis.y0;
    for (const [lv, a] of [[i, 1], [i + 1, w]]) {
      if (a <= 0.002) continue;
      const L = cityLevel(lv);
      const u = L.down * k;
      const dx = box.x0 - L.pad * u;
      const dy = box.y0 - L.pad * u;
      const x0 = Math.max(dx, vis.x0);
      const x1 = Math.min(dx + L.c.width * u, vis.x1);
      const y0 = Math.max(dy, vy0);
      const y1 = Math.min(dy + L.c.height * u, vy1);
      if (x1 <= x0 || y1 <= y0) continue;
      ctx.save();
      ctx.globalAlpha *= a;
      if (flipAt !== undefined) {
        ctx.translate(0, 2 * flipAt);
        ctx.scale(1, -1);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = lv === 0 ? "high" : "low";
      ctx.drawImage(L.c, (x0 - dx) / u, (y0 - dy) / u, (x1 - x0) / u, (y1 - y0) / u, x0, y0, x1 - x0, y1 - y0);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------ the dominoes

  const DOM = { w: 24, h: 48, t: 7.5, r: 2.6, pip: 2.15, pitch: 6.4 };
  const DOMS = [
    { x: -106.8, yaw: 0.06, pips: [4, 2] },
    { x: -77.9, yaw: -0.04, pips: [5, 3] },
    { x: -47.2, yaw: 0.03, pips: [3, 6] },
    { x: -13.8, yaw: -0.05, pips: [6, 6] },
    { x: 22.3, yaw: 0.05, pips: [1, 5] },
    { x: 60.7, yaw: -0.03, pips: [6, 2] },
    { x: 101.6, yaw: 0.07, pips: [2, 4] },
    { x: 146.0, yaw: -0.05, pips: [5, 1] },
  ].map((d, i) => ({ ...d, z: O.ZS[i], i }));

  const PIPS = {
    0: [],
    1: [[0, 0]],
    2: [[1, 1], [-1, -1]],
    3: [[1, 1], [0, 0], [-1, -1]],
    4: [[1, 1], [-1, 1], [1, -1], [-1, -1]],
    5: [[1, 1], [-1, 1], [0, 0], [1, -1], [-1, -1]],
    6: [[1, 1], [-1, 1], [1, 0], [-1, 0], [1, -1], [-1, -1]],
  };

  const proj = (view, p) => [view.cx + (view.S * O.f * p[0]) / p[2], view.cy - (view.S * O.f * p[1]) / p[2]];
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

  // The domino's frame: face center F, width axis U, height axis Y, back axis B.
  function frame(d, mirror) {
    const U = [Math.cos(d.yaw), 0, -Math.sin(d.yaw)];
    const B = [Math.sin(d.yaw), 0, Math.cos(d.yaw)];
    const yc = mirror ? -HCAM - DOM.h / 2 : -HCAM + DOM.h / 2;
    return { F: [d.x, yc, d.z], U, Y: [0, mirror ? -1 : 1, 0], B };
  }

  // Affine map from face coordinates (u right, v up, mm) to the screen.
  function faceTransform(view, fr) {
    const c = proj(view, fr.F);
    const pu = proj(view, add(fr.F, fr.U));
    const pv = proj(view, add(fr.F, fr.Y));
    return [pu[0] - c[0], pu[1] - c[1], pv[0] - c[0], pv[1] - c[1], c[0], c[1]];
  }

  function drawFace(c, d, mirror) {
    const hw = DOM.w / 2;
    const hh = DOM.h / 2;
    const g = c.createLinearGradient(-hw, hh, hw, -hh);
    g.addColorStop(0, "#f4ecd8");
    g.addColorStop(0.55, "#e6dbc1");
    g.addColorStop(1, "#c5b796");
    c.fillStyle = g;
    c.beginPath();
    c.roundRect(-hw, -hh, DOM.w, DOM.h, DOM.r);
    c.fill();
    if (!mirror) {
      // backlight from the window catches the rounded top edge
      c.fillStyle = "rgba(255,250,238,0.55)";
      c.beginPath();
      c.roundRect(-hw + 1.2, hh - 1.1, DOM.w - 2.4, 0.9, 0.45);
      c.fill();
    }
    c.fillStyle = "rgba(38,32,24,0.85)";
    c.fillRect(-hw + 2.6, -0.32, DOM.w - 5.2, 0.64);
    c.fillStyle = "#15130f";
    for (const [half, n] of [[1, d.pips[0]], [-1, d.pips[1]]]) {
      for (const [pu, pv] of PIPS[n]) {
        c.beginPath();
        c.arc(pu * DOM.pitch, half * (hh / 2) + pv * DOM.pitch, DOM.pip, 0, TAU);
        c.fill();
      }
    }
    const sg = c.createRadialGradient(-0.6, 0.6, 0.2, 0, 0, 1.9);
    sg.addColorStop(0, "#f2d9a0");
    sg.addColorStop(0.5, "#b8945a");
    sg.addColorStop(1, "#6e5228");
    c.fillStyle = sg;
    c.beginPath();
    c.arc(0, 0, 1.9, 0, TAU);
    c.fill();
  }

  // The visible side of the domino, as a screen quad, or null.
  function sideQuad(view, fr) {
    const Fu = fr.F[0] * fr.U[0] + fr.F[2] * fr.U[2];
    let sgn = 0;
    if (-Fu > DOM.w / 2) sgn = 1;
    else if (Fu > DOM.w / 2) sgn = -1;
    if (!sgn) return null;
    const e = add(fr.F, fr.U, (sgn * DOM.w) / 2);
    const pts = [
      add(e, fr.Y, DOM.h / 2 - 0.8),
      add(add(e, fr.Y, DOM.h / 2 - 0.8), fr.B, DOM.t),
      add(add(e, fr.Y, -DOM.h / 2 + 0.8), fr.B, DOM.t),
      add(e, fr.Y, -DOM.h / 2 + 0.8),
    ].map((p) => proj(view, p));
    return { pts, lit: sgn < 0 };
  }

  function dominoBox(view, d) {
    const hw = DOM.w / 2 + DOM.t;
    const top = proj(view, [d.x - hw, -HCAM + DOM.h + 1, d.z]);
    const bot = proj(view, [d.x + hw, -HCAM - DOM.h - 1, d.z]);
    return { x0: top[0], y0: top[1], x1: bot[0], y1: bot[1] };
  }

  function drawDomino(c, view, d) {
    for (const mirror of [true, false]) {
      const fr = frame(d, mirror);
      c.save();
      if (mirror) c.globalAlpha = 0.3;
      const side = mirror ? null : sideQuad(view, fr);
      if (side) {
        c.fillStyle = side.lit ? "#cbbd9e" : "#7d725e";
        c.beginPath();
        side.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
        c.fill();
      }
      const m = faceTransform(view, fr);
      c.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      drawFace(c, d, mirror);
      if (mirror) {
        // the reflection sinks into the black lacquer away from the contact line
        c.globalAlpha = 1;
        const g = c.createLinearGradient(0, -DOM.h / 2, 0, DOM.h / 2);
        g.addColorStop(0, "rgba(7,8,12,0)");
        g.addColorStop(1, "rgba(7,8,12,0.88)");
        c.fillStyle = g;
        c.beginPath();
        c.roundRect(-DOM.w / 2 - 0.5, -DOM.h / 2, DOM.w + 1, DOM.h + 0.5, DOM.r);
        c.fill();
      }
      c.restore();
    }
    // the contact itself is dark
    const base = proj(view, [d.x, -HCAM, d.z]);
    const half = ((DOM.w / 2 + DOM.t) * view.S * O.f) / d.z;
    c.fillStyle = "rgba(4,4,6,0.85)";
    const ch = Math.max(0.8, (0.7 * view.S * O.f) / d.z);
    c.fillRect(base[0] - half * 0.62, base[1] - ch * 0.5, half * 1.24, ch);
  }

  // ------------------------------------------------------------------ the picture

  // cam: {s: focus distance (mm), N: f-number}. Draws into the current clip.
  function draw(ctx, view, cam, bounds) {
    const { cx, cy, S } = view;
    const px = (mm) => mm * S; // sensor mm to screen px
    const discPx = (z) => px(O.disc(z, cam.N, cam.s));
    const sig = (z) => discPx(z) * SIGMA;
    const b = bounds;
    const U = (u) => cx + S * O.f * u;
    const V = (v) => cy - S * O.f * v;

    // sky: a gradient in v
    const g = ctx.createLinearGradient(0, V(0.26), 0, V(-0.05));
    for (const [v, c] of sky) g.addColorStop(clamp((0.26 - v) / 0.31), rgb(c));
    ctx.fillStyle = g;
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);

    // the dim city at infinity
    const inf = discPx(Infinity);
    const cityBox = { x0: U(CITY.u0), y0: V(CITY.v1), x1: U(CITY.u1), y1: V(CITY.v0) };
    drawCity(ctx, cityBox, inf * SIGMA, b);

    // bright lights as bokeh, in the aperture's shape
    const ap = aperturePath(cam.N);
    const dEff = Math.hypot(inf, px(0.035));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const m0 = ctx.getTransform();
    for (const L of LIGHTS) {
      const x = U(L.u);
      const y = V(L.v);
      if (x < b.x0 - dEff || x > b.x1 + dEff || y < b.y0 - dEff || y > b.y1 + dEff) continue;
      const a = clamp((L.e * 2400 * (S / 53.33) * (S / 53.33)) / (dEff * dEff + 40), 0, 1);
      bokeh(ctx, m0, ap, x, y, dEff, L.c, a);
    }
    ctx.restore();

    // the table: black lacquer, its far edge as soft as the lens makes it
    const yEdge = V(-HCAM / Z_EDGE);
    const soft = Math.max(0.8, sig(Z_EDGE) * 1.6);
    const r0 = skyAt(HCAM / Z_EDGE);
    const edgeC = [r0[0] * 0.42 + 4, r0[1] * 0.42 + 4, r0[2] * 0.42 + 6];
    {
      const y0 = yEdge - soft;
      const span = b.y1 - y0;
      const at = (y) => clamp((y - y0) / span);
      const tg = ctx.createLinearGradient(0, y0, 0, b.y1);
      tg.addColorStop(0, rgb(edgeC, 0));
      tg.addColorStop(at(yEdge + soft), rgb(edgeC, 1));
      tg.addColorStop(at(yEdge + soft) + (1 - at(yEdge + soft)) * 0.35, "rgb(9,10,15)");
      tg.addColorStop(1, "rgb(5,5,8)");
      ctx.fillStyle = tg;
      ctx.fillRect(b.x0, y0, b.x1 - b.x0, span);
    }
    // the lacquer reflects the city and its lights, fading in under the far edge
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x0, yEdge, b.x1 - b.x0, b.y1 - yEdge);
    ctx.clip();
    ctx.globalAlpha = 0.22;
    drawCity(ctx, cityBox, inf * SIGMA, { x0: b.x0, y0: yEdge, x1: b.x1, y1: b.y1 }, cy);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "lighter";
    const m1 = ctx.getTransform();
    for (const L of LIGHTS) {
      if (L.v < HCAM / Z_EDGE) continue;
      const x = U(L.u);
      const y = V(-L.v);
      if (x < b.x0 - dEff || x > b.x1 + dEff || y > b.y1 + dEff) continue;
      const fade = clamp((y - yEdge - dEff * 0.1) / (dEff * 0.55 + soft + 1));
      const a = 0.28 * fade * clamp((L.e * 2400 * (S / 53.33) * (S / 53.33)) / (dEff * dEff + 40), 0, 1);
      bokeh(ctx, m1, ap, x, y, dEff, L.c, a);
    }
    ctx.globalCompositeOperation = "source-over";
    const band = Math.max(4, soft * 1.3);
    const fg = ctx.createLinearGradient(0, yEdge, 0, yEdge + band);
    fg.addColorStop(0, rgb(edgeC, 1));
    fg.addColorStop(1, rgb(edgeC, 0));
    ctx.fillStyle = fg;
    ctx.fillRect(b.x0, yEdge, b.x1 - b.x0, band);
    ctx.restore();

    // dominoes, far to near
    for (let i = DOMS.length - 1; i >= 0; i--) {
      const d = DOMS[i];
      const box = dominoBox(view, d);
      if (box.x1 < b.x0 - 50 || box.x0 > b.x1 + 50) continue;
      blurred(ctx, box, sig(d.z), (c) => drawDomino(c, view, d), { sharp: 0.6 });
      // the brass spinner catches the lamp: a small specular point, drawn as bokeh
      const sp = proj(view, [d.x - 0.5, -HCAM + DOM.h / 2 + 0.6, d.z - 0.5]);
      const dd = Math.hypot(discPx(d.z), px(0.02));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const a = clamp((60 * (S / 53.33) * (S / 53.33)) / (dd * dd + 4), 0, 0.9);
      bokeh(ctx, ctx.getTransform(), ap, sp[0], sp[1], dd, [255, 236, 200], a);
      ctx.restore();
    }

    // wide open, the corners darken
    const vig = clamp(1 - (O.stopOf(cam.N) - 1) / 3) * 0.42;
    if (vig > 0.003) {
      const r = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2;
      const mx = (b.x0 + b.x1) / 2;
      const my = (b.y0 + b.y1) / 2;
      const vg = ctx.createRadialGradient(mx, my, r * 0.45, mx, my, r);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, `rgba(0,0,0,${vig})`);
      ctx.fillStyle = vg;
      ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    }
  }

  // A disc of light in the aperture's shape, diameter d, centered at (x, y) in user space.
  function bokeh(ctx, m, ap, x, y, d, c, a) {
    if (a <= 0.002) return;
    const r = d / 2;
    ctx.setTransform(m.a * r, m.b * r, m.c * r, m.d * r, m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(4)})`;
    ctx.fill(ap);
    if (d > 6) {
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(a * 0.3).toFixed(4)})`;
      ctx.stroke(ap);
    }
    ctx.setTransform(m);
  }

  FM.scene = { draw, DOMS, HCAM, aperturePath, bokeh, blurred, proj, SIGMA };
})();
