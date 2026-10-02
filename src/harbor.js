// The picture: a harbor at blue hour with a clock tower at its center.
//
// It is drawn once, in image-plane coordinates: u = X/Z to the right and v = Y/Z up,
// the tangent of the angle off the lens axis. A lens of focal length f on a 36 mm wide
// sensor sees u in [-18/f, 18/f], so every focal length is a crop of this one drawing.
// That is what a real lens does when the camera stays put.
(function () {
  const FM = globalThis.FM;
  const { mulberry32, hash, noise1, clamp, lerp, TAU } = FM.kit;

  const V0 = 0.057; // the lens axis: the clock's center
  const WL = -0.012; // the far waterline

  const PAL = {
    sky: [
      [-0.02, "#d9a27e"],
      [0.004, "#c4937f"],
      [0.03, "#8a85a0"],
      [0.07, "#5a6f9a"],
      [0.14, "#36507d"],
      [0.26, "#1f355c"],
      [0.5, "#0f1b33"],
    ],
    farHills: "#566a95",
    nearHills: "#3e5079",
    farCity: "#2e4068",
    farCityDark: "#283a60",
    midCity: "#1d2a48",
    midCityShade: "#172340",
    midCityLit: "#24365a",
    tower: "#22314f",
    towerLit: "#2b3d62",
    towerDark: "#1a2743",
    front: "#121c33",
    water: [
      [WL, "#6b6782"],
      [WL - 0.006, "#46557a"],
      [WL - 0.03, "#2a3c62"],
      [-0.12, "#1a2845"],
      [-0.42, "#0d1629"],
    ],
    win: ["#f3c978", "#f7e2b5", "#c8d9ee", "#e9b866"],
    clock: "#f4e7c8",
    hands: "#18223c",
    lamp: "#f6d99b",
    near: "#070b14",
    moon: "#efe8d6",
    sail: "#b5bfd3",
    sailShade: "#95a3bf",
    gull: "#0d1528",
    gullPale: "#cfd7e3",
  };

  const rnd = mulberry32(20241002);
  const R = (a, b) => a + (b - a) * rnd();

  // ------------------------------------------------------------ static geometry

  // Hills: a far range drawn as a jagged ridge and a near range of soft hills.
  const FAR = [
    [-3.4, 0.05], [-2.8, 0.085], [-2.3, 0.06], [-1.95, 0.125], [-1.6, 0.08], [-1.25, 0.1],
    [-0.98, 0.07], [-0.62, 0.135], [-0.38, 0.075], [-0.16, 0.05], [0.0, 0.036], [0.17, 0.05],
    [0.4, 0.098], [0.66, 0.15], [0.9, 0.088], [1.2, 0.118], [1.55, 0.072], [1.95, 0.105],
    [2.4, 0.06], [2.9, 0.09], [3.4, 0.05],
  ];
  function farRidge(u) {
    let i = 0;
    while (i < FAR.length - 2 && u > FAR[i + 1][0]) i++;
    const [u0, h0] = FAR[i];
    const [u1, h1] = FAR[i + 1];
    const f = clamp((u - u0) / (u1 - u0));
    const base = lerp(h0, h1, f);
    const rough =
      0.007 * noise1(u * 9, 1) + 0.003 * noise1(u * 23, 2) + 0.0013 * noise1(u * 61, 3) +
      0.0005 * noise1(u * 160, 4) + 0.0002 * noise1(u * 420, 5);
    return WL + base + rough * (0.4 + base * 6);
  }
  function nearRidge(u) {
    const h =
      0.022 + 0.011 * Math.sin(u * 3.1 + 0.4) + 0.008 * Math.sin(u * 7.3 + 2.1) +
      0.003 * noise1(u * 30, 7) + 0.001 * noise1(u * 90, 8);
    return WL + Math.max(0.008, h - 0.012 * Math.exp(-(u * u) / 0.02));
  }
  function ridgePath(fn, u0, u1, step) {
    const p = new Path2D();
    p.moveTo(u0, WL - 0.002);
    for (let u = u0; u <= u1 + 1e-9; u += step) p.lineTo(u, fn(u));
    p.lineTo(u1, WL - 0.002);
    p.closePath();
    return p;
  }
  const farHills = ridgePath(farRidge, -3.4, 3.4, 0.0008);
  const nearHills = ridgePath(nearRidge, -3.4, 3.4, 0.0015);

  // Buildings. Each is {x0, x1, top, layer}; windows are collected per color.
  const winBuckets = [[], [], [], []]; // rects [u, v, w, h, alpha]
  const lights = []; // lit windows that reflect in the water: [u, v, w, h, color, alpha]
  const farPath = new Path2D();
  const farDark = new Path2D();
  const midPath = new Path2D();
  const midShade = new Path2D();
  const midLit = new Path2D();
  const roofLines = []; // antennas: [u, v0, v1]

  function addWindows(x0, x1, y0, y1, density, warmth, seedBase, sizeMul = 1) {
    const ww = 0.0016 * sizeMul;
    const wh = 0.0024 * sizeMul;
    const gx = 0.0034 * sizeMul;
    const gy = 0.0047 * sizeMul;
    const cols = Math.floor((x1 - x0 - 0.002) / gx);
    const rows = Math.floor((y1 - y0 - 0.003) / gy);
    if (cols < 1 || rows < 1) return;
    const ox = x0 + (x1 - x0 - (cols - 1) * gx - ww) / 2;
    for (let r = 0; r < rows; r++) {
      const floorLit = hash(seedBase, r, 11) < 0.82;
      for (let c = 0; c < cols; c++) {
        const h = hash(seedBase, r * 131 + c, 3);
        if (!floorLit || h > density) continue;
        const pick = hash(seedBase, r * 131 + c, 5);
        const ci = pick < warmth ? 0 : pick < warmth + 0.16 ? 1 : pick < warmth + 0.26 ? 3 : 2;
        const a = 0.55 + 0.45 * hash(seedBase, r * 131 + c, 9);
        const u = ox + c * gx;
        const v = y1 - 0.0035 * sizeMul - r * gy - wh;
        winBuckets[ci].push([u, v, ww, wh, a]);
        lights.push([u, v, ww, wh, ci, a]);
      }
    }
  }

  // Far city: hazy, low, few lights.
  {
    let u = -2.7;
    let i = 0;
    while (u < 2.7) {
      const w = R(0.006, 0.02);
      const env = 0.006 + 0.026 * Math.exp(-(u * u) / 0.5) + 0.008 * Math.exp(-((u - 1.4) ** 2) / 0.08);
      const h = env * R(0.45, 1.15) + 0.002;
      const top = WL + h;
      (i % 3 === 0 ? farDark : farPath).rect(u, WL - 0.001, w, h + 0.001);
      if (Math.abs(u) > 0.03) addWindows(u, u + w, WL, top, 0.1, 0.8, 1000 + i, 0.7);
      u += w * R(0.85, 1.05);
      i++;
    }
  }

  // Mid city: downtown around the tower, with roof furniture.
  const mids = [];
  {
    let u = -1.6;
    let i = 0;
    while (u < 1.6) {
      const w = R(0.009, 0.026);
      const c = u + w / 2;
      let env =
        0.006 + 0.04 * Math.exp(-(c * c) / 0.11) + 0.02 * Math.exp(-((c + 0.74) ** 2) / 0.03) +
        0.015 * Math.exp(-((c - 0.86) ** 2) / 0.04);
      let h = env * R(0.55, 1.15) + 0.003;
      if (Math.abs(c) < 0.07) h = Math.min(h, 0.046 + Math.abs(c) * 0.1); // keep the clock clear
      if (u < 0.0175 && u + w > -0.0175) {
        u = 0.0175; // the tower's own slot
        continue;
      }
      mids.push({ x0: u, x1: u + w, top: WL + h, i });
      u += w * R(0.92, 1.08);
      i++;
    }
    for (const b of mids) {
      const w = b.x1 - b.x0;
      midPath.rect(b.x0, WL - 0.001, w, b.top - WL + 0.001);
      if (hash(b.i, 1) < 0.55) midShade.rect(b.x0 + w * 0.68, WL - 0.001, w * 0.32, b.top - WL + 0.001);
      else if (hash(b.i, 2) < 0.4) midLit.rect(b.x0, WL - 0.001, w * 0.22, b.top - WL + 0.001);
      let roof = b.top;
      if (hash(b.i, 3) < 0.35 && w > 0.012) {
        const inset = w * 0.22;
        const sh = 0.003 + 0.006 * hash(b.i, 4);
        midPath.rect(b.x0 + inset, roof - 0.0002, w - 2 * inset, sh);
        roof += sh;
      }
      if (hash(b.i, 5) < 0.28) roofLines.push([b.x0 + w * (0.3 + 0.4 * hash(b.i, 6)), roof, roof + 0.004 + 0.008 * hash(b.i, 7)]);
      if (hash(b.i, 8) < 0.18 && w > 0.012) {
        const tx = b.x0 + w * 0.25;
        midPath.rect(tx, roof - 0.0002, 0.0034, 0.0032);
        midPath.moveTo(tx - 0.0004, roof + 0.003);
        midPath.lineTo(tx + 0.0017, roof + 0.0047);
        midPath.lineTo(tx + 0.0038, roof + 0.003);
        midPath.closePath();
      }
      addWindows(b.x0, b.x1, WL + 0.002, b.top, 0.22 + 0.33 * hash(b.i, 9), 0.72, 2000 + b.i, 1);
    }
  }

  // Waterfront sheds and quays, in front of the city.
  const frontPath = new Path2D();
  const quayLights = [];
  {
    let u = -2.6;
    let i = 0;
    while (u < 2.6) {
      const w = R(0.01, 0.05);
      const h = R(0.0015, 0.0065) * (Math.abs(u) < 0.04 ? 0.4 : 1);
      if (hash(i, 31) < 0.7) {
        frontPath.rect(u, WL - 0.0012, w, h + 0.0012);
        if (hash(i, 32) < 0.6) quayLights.push([u + w * hash(i, 33), WL + h * 0.4]);
      }
      u += w * R(1.0, 1.6);
      i++;
    }
  }

  // Two harbor cranes.
  const cranePath = new Path2D();
  const craneTops = [];
  for (const [cu, s, dir] of [[-1.13, 1, 1], [1.04, 0.85, -1]]) {
    const h = 0.055 * s;
    const lw = 0.0011 * s;
    const leg = 0.012 * s;
    cranePath.rect(cu - leg / 2, WL - 0.001, lw, h);
    cranePath.rect(cu + leg / 2 - lw, WL - 0.001, lw, h);
    for (let k = 0; k < 6; k++) {
      const y0 = WL + (k * h) / 6;
      const y1 = WL + ((k + 1) * h) / 6;
      cranePath.moveTo(cu - leg / 2, y0);
      cranePath.lineTo(cu + leg / 2, y1);
      cranePath.lineTo(cu + leg / 2, y1 + lw * 0.8);
      cranePath.lineTo(cu - leg / 2, y0 + lw * 0.8);
      cranePath.closePath();
    }
    const by = WL + h;
    cranePath.rect(cu - 0.018 * s * (dir > 0 ? 0.35 : 1), by, 0.018 * s * 1.35, 0.0022 * s);
    cranePath.rect(cu - 0.0035 * s, by, 0.007 * s, 0.006 * s);
    craneTops.push([cu, by + 0.0068 * s, s]);
  }

  // Stars, upper sky only.
  const stars = [];
  for (let i = 0; i < 110; i++) {
    const v = 0.15 + Math.pow(rnd(), 0.7) * 0.42;
    stars.push([R(-2.8, 2.8), v, R(0.0005, 0.0013), R(0.3, 0.9) * clamp((v - 0.14) / 0.12), R(0, TAU), R(0.6, 2.2)]);
  }

  // Glints on the water: short strokes, denser near the horizon.
  const glints = [];
  for (let i = 0; i < 700; i++) {
    const d = Math.pow(rnd(), 1.8); // 0 near the waterline
    const v = WL - 0.004 - d * 0.33;
    glints.push([R(-2.8, 2.8), v, 0.004 + d * 0.05, 0.0004 + d * 0.0018, R(0.06, 0.2), R(0, TAU)]);
  }

  // ------------------------------------------------------------------ drawing

  function rectsPath(list, cull) {
    const p = new Path2D();
    for (const r of list) {
      if (cull && (r[0] > cull.u1 || r[0] + r[2] < cull.u0 || r[1] > cull.v1 || r[1] + r[3] < cull.v0)) continue;
      p.rect(r[0], r[1], r[2], r[3]);
    }
    return p;
  }
  // Windows are grouped by color and alpha step so each group is one fill.
  const winPaths = winBuckets.map((list) => {
    const steps = [[], [], []];
    for (const r of list) steps[r[4] < 0.7 ? 0 : r[4] < 0.85 ? 1 : 2].push(r);
    return steps.map((s) => rectsPath(s));
  });

  function gradient(ctx, stops, va, vb) {
    const g = ctx.createLinearGradient(0, va, 0, vb);
    for (const [v, c] of stops) g.addColorStop(clamp((v - va) / (vb - va)), c);
    return g;
  }

  function drawTower(ctx, t, cull) {
    if (cull.u0 > 0.02 || cull.u1 < -0.02) return;
    const P = PAL;
    // shaft, two-tone
    ctx.fillStyle = P.tower;
    ctx.fillRect(-0.0135, WL - 0.001, 0.027, 0.0475 - WL);
    ctx.fillStyle = P.towerLit;
    ctx.fillRect(-0.0135, WL - 0.001, 0.0085, 0.0475 - WL);
    ctx.fillStyle = P.towerDark;
    ctx.fillRect(0.0085, WL - 0.001, 0.005, 0.0475 - WL);
    // pilasters
    ctx.fillStyle = P.towerDark;
    ctx.fillRect(-0.0135, WL, 0.0012, 0.0465 - WL);
    // slit windows, some lit
    for (let k = 0; k < 5; k++) {
      const v = 0.004 + k * 0.0085;
      for (const su of [-0.0065, 0.0045]) {
        const lit = hash(k, su > 0 ? 1 : 2, 77) < 0.55;
        ctx.fillStyle = lit ? P.win[0] : P.towerDark;
        ctx.globalAlpha = lit ? 0.85 : 1;
        ctx.fillRect(su, v, 0.002, 0.005);
        ctx.beginPath();
        ctx.arc(su + 0.001, v + 0.005, 0.001, 0, Math.PI);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // cornices
    ctx.fillStyle = P.towerLit;
    ctx.fillRect(-0.016, 0.0458, 0.032, 0.0017);
    ctx.fillRect(-0.0165, 0.0672, 0.033, 0.0019);
    ctx.fillRect(-0.0142, 0.0806, 0.0284, 0.0014);
    // clock stage
    ctx.fillStyle = P.tower;
    ctx.fillRect(-0.0153, 0.0475, 0.0306, 0.0197);
    ctx.fillStyle = P.towerLit;
    ctx.fillRect(-0.0153, 0.0475, 0.007, 0.0197);
    ctx.fillStyle = P.towerDark;
    ctx.fillRect(0.0108, 0.0475, 0.0045, 0.0197);
    // clock
    const cx = 0;
    const cy = V0;
    ctx.fillStyle = P.towerDark;
    ctx.beginPath();
    ctx.arc(cx, cy, 0.0093, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.clock;
    ctx.beginPath();
    ctx.arc(cx, cy, 0.0084, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.hands;
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * TAU;
      const big = k % 5 === 0;
      const r0 = big ? 0.0068 : 0.0075;
      const wdt = big ? 0.0007 : 0.00025;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-a);
      ctx.fillRect(-wdt / 2, r0, wdt, 0.0079 - r0);
      ctx.restore();
    }
    const minutes = 7 * 60 + 44 + t / 2;
    const ma = ((minutes % 60) / 60) * TAU;
    const ha = (((minutes / 60) % 12) / 12) * TAU;
    for (const [ang, len, wdt] of [[ha, 0.0046, 0.0009], [ma, 0.0068, 0.0006]]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-ang);
      ctx.beginPath();
      ctx.moveTo(-wdt / 2, -0.0011);
      ctx.lineTo(wdt / 2, -0.0011);
      ctx.lineTo(wdt * 0.2, len);
      ctx.lineTo(-wdt * 0.2, len);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 0.0006, 0, TAU);
    ctx.fill();
    // belfry with two lit arches
    ctx.fillStyle = P.tower;
    ctx.fillRect(-0.0124, 0.0691, 0.0248, 0.0116);
    ctx.fillStyle = P.towerLit;
    ctx.fillRect(-0.0124, 0.0691, 0.0055, 0.0116);
    ctx.fillStyle = P.win[3];
    ctx.globalAlpha = 0.8;
    for (const ax of [-0.0062, 0.0062]) {
      ctx.beginPath();
      ctx.moveTo(ax - 0.0032, 0.0705);
      ctx.lineTo(ax - 0.0032, 0.0765);
      ctx.arc(ax, 0.0765, 0.0032, Math.PI, 0, true);
      ctx.lineTo(ax + 0.0032, 0.0705);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.towerDark;
    for (const ax of [-0.0062, 0.0062]) ctx.fillRect(ax - 0.0003, 0.0705, 0.0006, 0.0085);
    // spire, two-tone, and finial
    ctx.fillStyle = P.tower;
    ctx.beginPath();
    ctx.moveTo(-0.0128, 0.082);
    ctx.lineTo(0.0128, 0.082);
    ctx.lineTo(0, 0.0928);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.towerLit;
    ctx.beginPath();
    ctx.moveTo(-0.0128, 0.082);
    ctx.lineTo(-0.002, 0.082);
    ctx.lineTo(0, 0.0928);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.towerDark;
    ctx.fillRect(-0.00025, 0.0925, 0.0005, 0.0028);
    ctx.beginPath();
    ctx.arc(0, 0.0956, 0.00055, 0, TAU);
    ctx.fill();
  }

  function gullShape(ctx, x, y, s, flap, color) {
    // a gull seen from below: two bent wings
    const up = 0.35 + 0.65 * flap;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.15 * up);
    ctx.quadraticCurveTo(x - s * 0.5, y + s * 0.45 * up, x - s * 0.08, y + s * 0.02);
    ctx.lineTo(x, y - s * 0.08);
    ctx.lineTo(x + s * 0.08, y + s * 0.02);
    ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.45 * up, x + s, y + s * 0.15 * up);
    ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.3 * up, x, y + s * 0.07);
    ctx.quadraticCurveTo(x - s * 0.5, y + s * 0.3 * up, x - s, y + s * 0.15 * up);
    ctx.closePath();
    ctx.fill();
  }

  function sailboat(ctx, u, v, s, t, ph) {
    const bob = 0.0006 * s * Math.sin(1.3 * t + ph);
    const tilt = 0.025 * Math.sin(0.9 * t + ph * 1.7);
    ctx.save();
    ctx.translate(u, v + bob);
    ctx.rotate(tilt);
    ctx.fillStyle = PAL.sail;
    ctx.beginPath();
    ctx.moveTo(0.0012 * s, 0.009 * s);
    ctx.lineTo(0.0012 * s, 0.085 * s);
    ctx.lineTo(0.026 * s, 0.011 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.sailShade;
    ctx.beginPath();
    ctx.moveTo(-0.0012 * s, 0.012 * s);
    ctx.lineTo(-0.0012 * s, 0.075 * s);
    ctx.lineTo(-0.019 * s, 0.012 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.near;
    ctx.fillRect(-0.0006 * s, 0.004 * s, 0.0012 * s, 0.084 * s);
    ctx.beginPath();
    ctx.moveTo(-0.026 * s, 0.0068 * s);
    ctx.lineTo(0.03 * s, 0.0068 * s);
    ctx.lineTo(0.022 * s, -0.0005 * s);
    ctx.lineTo(-0.02 * s, -0.0005 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#eef3fb";
    ctx.beginPath();
    ctx.arc(0, 0.0895 * s, 0.0011 * s, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function ferry(ctx, u, v, t) {
    ctx.save();
    ctx.translate(u, v + 0.0003 * Math.sin(t * 1.1));
    ctx.fillStyle = "#0e172c";
    ctx.beginPath();
    ctx.moveTo(-0.04, 0.0072);
    ctx.lineTo(0.042, 0.0072);
    ctx.lineTo(0.036, -0.0005);
    ctx.lineTo(-0.037, -0.0005);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1a2846";
    ctx.fillRect(-0.03, 0.0071, 0.058, 0.0068);
    ctx.fillRect(-0.016, 0.0138, 0.026, 0.0045);
    ctx.fillStyle = "#0e172c";
    ctx.fillRect(0.004, 0.0182, 0.0035, 0.0052);
    ctx.fillStyle = PAL.win[0];
    for (let k = 0; k < 11; k++) ctx.fillRect(-0.027 + k * 0.0049, 0.0093, 0.0026, 0.0026);
    ctx.fillStyle = PAL.win[1];
    for (let k = 0; k < 4; k++) ctx.fillRect(-0.0135 + k * 0.0058, 0.0153, 0.0028, 0.0018);
    ctx.restore();
  }

  function lampPost(ctx, u, mirror) {
    const P = PAL;
    ctx.fillStyle = P.near;
    ctx.beginPath();
    ctx.moveTo(u - 0.0042, -0.6);
    ctx.lineTo(u + 0.0042, -0.6);
    ctx.lineTo(u + 0.0028, 0.15);
    ctx.lineTo(u - 0.0028, 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(u - 0.0062, -0.2, 0.0124, 0.012);
    ctx.fillRect(u - 0.005, 0.088, 0.01, 0.006);
    ctx.fillRect(u - 0.0052, 0.148, 0.0104, 0.007);
    // lantern
    ctx.fillStyle = P.lamp;
    ctx.beginPath();
    ctx.moveTo(u - 0.0085, 0.157);
    ctx.lineTo(u + 0.0085, 0.157);
    ctx.lineTo(u + 0.0118, 0.191);
    ctx.lineTo(u - 0.0118, 0.191);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.near;
    ctx.fillRect(u - 0.0009, 0.157, 0.0018, 0.034);
    ctx.fillRect(u - 0.0125, 0.189, 0.025, 0.004);
    ctx.beginPath();
    ctx.moveTo(u - 0.0135, 0.192);
    ctx.lineTo(u + 0.0135, 0.192);
    ctx.lineTo(u, 0.205);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(u - 0.001, 0.204, 0.002, 0.006);
    ctx.fillRect(u - 0.0095, 0.155, 0.019, 0.003);
  }

  function perchedGull(ctx, u, v) {
    ctx.fillStyle = PAL.gullPale;
    ctx.beginPath();
    ctx.ellipse(u, v + 0.0052, 0.0078, 0.0042, -0.12, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(u + 0.0062, v + 0.0098, 0.0029, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e9b866";
    ctx.beginPath();
    ctx.moveTo(u + 0.0088, v + 0.0101);
    ctx.lineTo(u + 0.0118, v + 0.0094);
    ctx.lineTo(u + 0.0088, v + 0.0089);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.gull;
    ctx.beginPath();
    ctx.moveTo(u - 0.0045, v + 0.0072);
    ctx.lineTo(u - 0.0118, v + 0.0034);
    ctx.lineTo(u - 0.0035, v + 0.0028);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(u - 0.0004, v - 0.0008, 0.0007, 0.0022);
    ctx.fillRect(u + 0.0018, v - 0.0008, 0.0007, 0.0022);
    ctx.beginPath();
    ctx.arc(u + 0.0071, v + 0.0103, 0.00045, 0, TAU);
    ctx.fill();
  }

  // view: {cx, cy, S, u0, v0}. bounds: screen rect to cull against {x0, y0, x1, y1}.
  function draw(ctx, view, t, bounds) {
    const { cx, cy, S, u0, v0 } = view;
    const b = bounds || { x0: 0, y0: 0, x1: 1920, y1: 1080 };
    const cull = {
      u0: u0 + (b.x0 - cx) / S,
      u1: u0 + (b.x1 - cx) / S,
      v0: v0 - (b.y1 - cy) / S,
      v1: v0 - (b.y0 - cy) / S,
    };
    const px = 1 / S; // one screen pixel in scene units
    ctx.save();
    ctx.transform(S, 0, 0, -S, cx - u0 * S, cy + v0 * S);

    // sky
    ctx.fillStyle = gradient(ctx, PAL.sky, -0.02, 0.5);
    ctx.fillRect(cull.u0, Math.max(cull.v0, WL - 0.01), cull.u1 - cull.u0, cull.v1 - Math.max(cull.v0, WL - 0.01));

    // stars
    if (cull.v1 > 0.15) {
      ctx.fillStyle = PAL.moon;
      for (const [su, sv, r, a, ph, w] of stars) {
        if (su < cull.u0 || su > cull.u1 || sv < cull.v0 || sv > cull.v1) continue;
        ctx.globalAlpha = a * (0.72 + 0.28 * Math.sin(t * w + ph));
        ctx.beginPath();
        ctx.arc(su, sv, Math.max(r, 0.55 * px), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // moon
    if (cull.u1 > 0.44 && cull.u0 < 0.5 && cull.v1 > 0.3) {
      ctx.fillStyle = PAL.moon;
      ctx.beginPath();
      ctx.arc(0.47, 0.322, 0.0125, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#d8d0bc";
      ctx.globalAlpha = 0.55;
      for (const [mx, my, mr] of [[-0.004, 0.003, 0.0035], [0.003, -0.002, 0.0028], [0.0045, 0.005, 0.0017], [-0.002, -0.006, 0.002]]) {
        ctx.beginPath();
        ctx.arc(0.47 + mx, 0.322 + my, mr, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // flying gulls, high in the sky
    for (let i = 0; i < 4; i++) {
      const gu = -1.2 + i * 0.83 + 0.0105 * t * (i % 2 ? 1 : 0.8) + 0.04 * Math.sin(t * 0.2 + i);
      const gv = 0.2 + 0.07 * hash(i, 41) + 0.006 * Math.sin(t * 0.6 + i * 2.1);
      const gs = 0.0075 + 0.004 * hash(i, 42);
      if (gu < cull.u0 - 0.02 || gu > cull.u1 + 0.02 || gv < cull.v0 - 0.02 || gv > cull.v1 + 0.02) continue;
      const flap = 0.5 + 0.5 * Math.sin(TAU * (1.9 + 0.3 * hash(i, 43)) * t + i * 1.3);
      gullShape(ctx, gu, gv, gs, flap, PAL.gull);
    }

    // hills
    ctx.fillStyle = PAL.farHills;
    ctx.fill(farHills);
    ctx.fillStyle = PAL.nearHills;
    ctx.fill(nearHills);

    // far city
    ctx.fillStyle = PAL.farCity;
    ctx.fill(farPath);
    ctx.fillStyle = PAL.farCityDark;
    ctx.fill(farDark);

    // mid city
    ctx.fillStyle = PAL.midCity;
    ctx.fill(midPath);
    ctx.fillStyle = PAL.midCityShade;
    ctx.fill(midShade);
    ctx.fillStyle = PAL.midCityLit;
    ctx.fill(midLit);
    ctx.strokeStyle = PAL.midCity;
    ctx.lineWidth = Math.max(0.00035, 0.8 * px);
    ctx.beginPath();
    for (const [lu, a, z] of roofLines) {
      if (lu < cull.u0 || lu > cull.u1) continue;
      ctx.moveTo(lu, a);
      ctx.lineTo(lu, z);
    }
    ctx.stroke();

    // windows
    winPaths.forEach((steps, ci) => {
      ctx.fillStyle = PAL.win[ci];
      steps.forEach((p, k) => {
        ctx.globalAlpha = [0.6, 0.78, 0.95][k];
        ctx.fill(p);
      });
    });
    ctx.globalAlpha = 1;

    drawTower(ctx, t, cull);

    // cranes, with a slow white beacon
    ctx.fillStyle = PAL.front;
    ctx.fill(cranePath);
    for (const [cu, cv, s] of craneTops) {
      if (cu < cull.u0 - 0.05 || cu > cull.u1 + 0.05) continue;
      const blink = Math.pow(Math.max(0, Math.sin(TAU * 0.55 * t + cu * 3)), 12);
      ctx.fillStyle = "#eef3fb";
      ctx.globalAlpha = 0.25 + 0.75 * blink;
      ctx.beginPath();
      ctx.arc(cu, cv, 0.0011 * s, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // waterfront
    ctx.fillStyle = PAL.front;
    ctx.fill(frontPath);
    ctx.fillStyle = PAL.win[3];
    for (const [qu, qv] of quayLights) {
      if (qu < cull.u0 || qu > cull.u1) continue;
      ctx.fillRect(qu, qv, 0.0012, 0.0012);
    }

    // water
    if (cull.v0 < WL) {
      ctx.fillStyle = gradient(ctx, PAL.water, -0.42, WL);
      ctx.fillRect(cull.u0, cull.v0, cull.u1 - cull.u0, Math.min(WL, cull.v1) - cull.v0);

      // glints of sky
      ctx.fillStyle = "#9aa3c2";
      for (const [gu, gv, gw, gh, a, ph] of glints) {
        const du = (gu + 0.004 * t + 0.01 * Math.sin(t * 0.7 + ph)) % 5.6;
        const uu = du < -2.8 ? du + 5.6 : du > 2.8 ? du - 5.6 : du;
        if (uu > cull.u1 || uu + gw < cull.u0 || gv < cull.v0 || gv > cull.v1) continue;
        ctx.globalAlpha = a * (0.55 + 0.45 * Math.sin(t * 1.7 + ph * 3));
        ctx.fillRect(uu, gv, gw, Math.max(gh, 0.7 * px));
      }
      ctx.globalAlpha = 1;

      // reflections of the lit windows: each light smears into a broken vertical streak
      if (cull.v1 > WL - 0.2) {
        for (let ci = 0; ci < 4; ci++) {
          const strong = new Path2D();
          const weak = new Path2D();
          for (const [lu, lv, lw, lh, c, a] of lights) {
            if (c !== ci || lu > cull.u1 + 0.003 || lu + lw < cull.u0 - 0.003) continue;
            const top = WL - (lv + lh - WL);
            const len = (lv - WL) * 0.7 + 0.004;
            if (top < cull.v0 - 0.002 || top - len > cull.v1) continue;
            const seed = Math.round(lu * 1e5) + Math.round(lv * 1e5) * 7;
            const n = 5;
            for (let k = 0; k < n; k++) {
              const ph = hash(seed, k, 91) * TAU;
              const yv = top - (k / n) * len - hash(seed, k, 92) * (len / n);
              const off = 0.0011 * Math.sin(TAU * 0.35 * t + ph + yv * 300);
              const wv = lw * (0.7 + 0.9 * hash(seed, k, 93)) * (1 + 0.25 * Math.sin(t * 2.1 + ph));
              const hv = Math.max(lh * 0.22, 0.6 * px);
              (k < 2 ? strong : weak).rect(lu + lw / 2 - wv / 2 + off, yv, wv, hv * (0.5 + 0.5 * a));
            }
          }
          ctx.fillStyle = PAL.win[ci];
          ctx.globalAlpha = 0.5;
          ctx.fill(strong);
          ctx.globalAlpha = 0.26;
          ctx.fill(weak);
        }
        ctx.globalAlpha = 1;
        // the clock's reflection
        ctx.fillStyle = PAL.clock;
        for (let k = 0; k < 7; k++) {
          const rv = WL - (V0 - WL) - 0.006 + k * 0.0018;
          const off = 0.0012 * Math.sin(TAU * 0.4 * t + k * 1.9);
          ctx.globalAlpha = 0.2 + 0.05 * Math.sin(t * 3 + k);
          ctx.fillRect(-0.005 + off, rv, 0.01 - k * 0.0005, 0.0007);
        }
        ctx.globalAlpha = 1;
      }

      // boats
      sailboat(ctx, -0.36, -0.072, 1, t, 0.3);
      sailboat(ctx, 0.27, -0.034, 0.46, t, 2.1);
      ferry(ctx, -0.62 + 0.0105 * t, -0.046, t);
    }

    // promenade railing and lamps, close to the camera
    if (cull.v0 < -0.29) {
      ctx.fillStyle = PAL.near;
      ctx.fillRect(cull.u0, -0.7, cull.u1 - cull.u0, 0.39);
      ctx.fillStyle = "#16203a";
      ctx.fillRect(cull.u0, -0.3115, cull.u1 - cull.u0, 0.0025);
    }
    // balusters show through as gaps of water just under the rail
    if (cull.v0 < -0.31) {
      ctx.fillStyle = gradient(ctx, PAL.water, -0.42, WL);
      for (let k = Math.floor(cull.u0 / 0.03) - 1; k <= Math.ceil(cull.u1 / 0.03) + 1; k++) {
        ctx.fillRect(k * 0.03 + 0.0045, -0.4, 0.0255, 0.0805);
      }
      ctx.fillStyle = PAL.near;
      ctx.fillRect(cull.u0, -0.345, cull.u1 - cull.u0, 0.0045);
    }
    for (const lu of [-0.685, 0.685]) {
      if (lu + 0.02 < cull.u0 || lu - 0.02 > cull.u1) continue;
      lampPost(ctx, lu);
    }
    if (cull.u0 < -0.67 && cull.v1 > 0.2) perchedGull(ctx, -0.6845, 0.2095);

    ctx.restore();
  }

  // The view of a focal length filling a screen rect: the 36 mm sensor width spans w.
  function viewFor(f, x, y, w, h, v0 = V0) {
    return { cx: x + w / 2, cy: y + h / 2, S: (w * f) / 36, u0: 0, v0 };
  }

  FM.harbor = { V0, WL, PAL, draw, viewFor };
})();
