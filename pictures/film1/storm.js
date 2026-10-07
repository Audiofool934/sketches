// Charybdis and the storm. The haze darkens and the sea turns into a spiral, the ship
// heeled over at its rim. Lightning on five beats, each nearer. The camera turns slowly
// with the water. At 99.0 the music cuts and every stone falls off the wall.
import { circle, poly, stroke } from "../../engine/paint.js";
import { ship } from "../../engine/figures.js";
import { rng } from "../../engine/util.js";

const W = 3000;
const H = 1256;
const C = [1500, 700];
const STRIKES = [96.21, 97.18, 97.83, 98.15, 98.79];
const BOLTS = [[600, 0, 760, 330], [2500, 0, 2330, 360], [1050, 0, 1220, 400], [1960, 0, 1780, 430], [1480, 0, 1560, 500]];

// A point on the whirlpool's spiral: arm phase a, turn k (0 at the throat).
function spiral(a, k, wob) {
  const rr = 50 + k * 13 + wob;
  const ang = a + k * 0.07;
  return [C[0] + Math.cos(ang) * rr * 1.28, C[1] + Math.sin(ang) * rr * 0.56];
}

export const config = {
  panel: { w: W, h: H },
  res: 2,
  background: "sea",
  camera: {
    keys: [
      [90.0, 1500, 640, 2800],
      [94.0, 1580, 660, 2300],
      [97.0, 1650, 640, 1900],
      [99.0, 1600, 660, 1600]
    ],
    tilt: [[90, 4], [99, 9]],
    yaw: [[90, 0], [99, 3]],
    roll: [[90, 0], [99, -9]],
    aperture: 0.03
  },
  light: {
    key: { az: 100, el: 50, color: [0.45, 0.6, 0.62], power: [[90, 0.9], [99, 0.8]] },
    fill: { az: -90, el: 30, color: [0.2, 0.3, 0.32], power: 0.25 },
    sky: [0.03, 0.05, 0.05], ground: [0.01, 0.02, 0.02],
    exposure: 0.75,
    grout: "#1c2a28",
    wet: [0.4, 1.2],
    flashColor: [0.9, 0.95, 1.0],
    flashes: STRIKES.map((t, i) => ({ t, power: 3 + i * 1.0, decay: 0.07 }))
  },
  ripple: { dir: [1, 0.6], wavelength: 120, speed: 300 },
  sinopia: { groups: [["sky*", "cloud*"], ["sea*", "foam*", "swirl*", "throat"], ["hull", "sail", "mast", "oar"], ["bolt*"]] }
};

export function regions() {
  return [
    { name: "sky", size: 14, mode: "sky", mat: "glass", tray: ["#030807", "#061210", "#0a1c19", "#0f2622"] },
    { name: "cloud", size: 12, mode: "sky", mat: "marble", tray: ["#0e1c1a", "#16282a", "#203436", "#2c4244"] },
    { name: "sea", size: 10, mode: "radial", center: C, mat: "glass", ripple: 0.08, tray: ["#040c0b", "#0a1c19", "#12302a", "#1a3e36", "#245046"] },
    { name: "swirl", size: 6, mode: "radial", center: C, mat: "glass", ripple: 0.1, tray: ["#1e4a3e", "#2e6050", "#3e7462", "#548a76"] },
    { name: "foam", size: 4.2, mode: "radial", center: C, mat: "marble", ripple: 0.12, tray: ["#8aa49a", "#a8bcb4", "#c8d8d2", "#e4ece8"] },
    { name: "throat", size: 7, mode: "radial", center: C, mat: "basalt", tray: ["#000000", "#020403"] },
    { name: "hull", size: 5, mode: "contour", mat: "glass", tray: ["#020403", "#060a08"] },
    { name: "sail", size: 5.5, mode: "contour", mat: "glass", tray: ["#0c1412", "#141e1c"] },
    { name: "mast", size: 3, mode: "contour", thin: true, mat: "glass", tray: ["#020403", "#060a08"] },
    { name: "oar", size: 2.6, mode: "contour", thin: true, mat: "glass", tray: ["#020403", "#060a08"] },
    { name: "bolt", size: 3.4, mode: "contour", thin: true, mat: "emit", emit: [8, 6], tray: ["#eef4ff", "#c8d8ff"] }
  ];
}

export function draw(g, mode, D) {
  D.fill(poly([[0, 0], [W, 0], [W, 330], [0, 330]]), "sky", D.linear(0, 0, 0, 330, [[0, "#030807"], [1, "#0f2622"]]));
  const R = rng(19);
  for (let i = 0; i < 9; i++) {
    const cx = R() * W;
    const cy = 60 + R() * 220;
    const pts = [];
    for (let k = 0; k <= 12; k++) pts.push([cx - 300 + k * 50, cy - Math.sin((k / 12) * Math.PI) * (40 + R() * 40)]);
    pts.push([cx + 300, cy + 20], [cx - 300, cy + 20]);
    D.fill(poly(pts), "cloud", ["#0e1c1a", "#16282a", "#203436"][i % 3]);
  }
  // The whirlpool: the sea darker toward the throat, crossed by many short crests of
  // uneven length and width that all follow the spiral, with clumps of foam torn along
  // them, so the water reads as a turning sea and not as rings.
  D.fill(poly([[0, 300], [W, 300], [W, H], [0, H]]), "sea", D.radial(C[0], C[1], 40, 1600, [[0, "#040c0b"], [0.3, "#12302a"], [1, "#245046"]]));
  const crests = 46;
  for (let c = 0; c < crests; c++) {
    const a0 = R() * Math.PI * 2;
    const k0 = 4 + R() * 100;
    const len = 10 + R() * 26;
    const pts = [];
    for (let k = 0; k < len; k++) pts.push(spiral(a0, k0 + k, Math.sin((k0 + k) * 0.29 + c) * 12));
    const w = (5 + k0 * 0.32) * (0.5 + R());
    D.fill(stroke(pts, w * 0.3, w), "swirl", R() > 0.5 ? "#2e6050" : "#3e7462");
    // Foam torn off the crest's leading edge: streaks drawn out along the flow.
    for (let k = 2; k < len - 3; k += 2 + Math.floor(R() * 3)) {
      if (R() < 0.4) continue;
      const off = Math.sin((k0 + k) * 0.29 + c) * 12 - w * 0.45;
      const n = 2 + Math.floor(R() * 3);
      const seg = [];
      for (let q = 0; q <= n; q++) seg.push(spiral(a0, k0 + k + q * 0.8, off + Math.sin(q * 1.7 + c) * 3));
      const fw = (2.5 + (k0 + k) * 0.07) * (0.6 + R() * 0.8);
      D.fill(stroke(seg, fw * 0.4, fw), "foam", R() > 0.4 ? "#c8d8d2" : "#e4ece8");
    }
  }
  // The lip of the throat, churned white in broken streaks round it, and the black
  // water going down.
  for (let i = 0; i < 34; i++) {
    const a0 = R() * Math.PI * 2;
    const rr = 106 + R() * 44;
    const seg = [];
    const n = 2 + Math.floor(R() * 5);
    for (let q = 0; q <= n; q++) {
      const a = a0 + q * 0.05;
      seg.push([C[0] + Math.cos(a) * (rr - q * 3) * 1.28, C[1] + Math.sin(a) * (rr - q * 3) * 0.56]);
    }
    D.fill(stroke(seg, 4 + R() * 4, 9 + R() * 8), "foam", R() > 0.5 ? "#a8bcb4" : "#c8d8d2");
  }
  D.fill(poly(Array.from({ length: 28 }, (_, i) => [C[0] + Math.cos((i / 28) * Math.PI * 2) * 100, C[1] + Math.sin((i / 28) * Math.PI * 2) * 44])), "throat");
  // The ship heeled over on the rim, mast leaning toward the throat.
  g.save();
  g.translate(2240, 560);
  g.rotate(-0.24);
  g.translate(-2240, -560);
  const sh = ship({ x: 2420, y: 560, len: 520, face: -1, oars: 12, billow: 0.12, oarSwing: 0.02,
    reg: { hull: "hull", rail: "hull", eye: "hull", eyeWhite: "foam", mast: "mast", sail: "sail", sailDark: "hull", oar: "oar", ram: "hull" } });
  for (const [reg, path] of sh.parts) D.fill(path, reg);
  g.restore();
}

export const arrivals = BOLTS.map(([x0, y0, x1, y1], i) => ({
  name: `bolt${i}`, at: STRIKES[i] - 0.02, dur: 0.04, drop: 0.2,
  draw(g, mode, D) {
    const R = rng(100 + i);
    const main = [[x0, y0]];
    const n = 8;
    for (let k = 1; k <= n; k++) {
      const u = k / n;
      main.push([x0 + (x1 - x0) * u + (R() - 0.5) * 100 * (1 - u * 0.5), y0 + (y1 - y0) * u]);
    }
    D.fill(stroke(main, 22, 9), "bolt");
    // A branch or two off the main stroke.
    for (let b = 0; b < 2; b++) {
      const k = 2 + Math.floor(R() * 4);
      const p = main[k];
      const dir = R() > 0.5 ? 1 : -1;
      const br = [p, [p[0] + dir * (60 + R() * 60), p[1] + 50 + R() * 40], [p[0] + dir * (90 + R() * 80), p[1] + 110 + R() * 50]];
      D.fill(stroke(br, 10, 4), "bolt");
    }
  }
}));

export const events = {
  ignite: STRIKES.map((t, i) => ({ arrival: `bolt${i}`, at: t, out: t + 0.2, jitter: 0.01 }))
};
