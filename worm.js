// The worm: it breaks the sand on the right and sweeps up in a long curve, its round mouth
// open toward us, ringed with crystal teeth, with a lone figure on a far ridge for scale.
import { circle, poly, stroke } from "./engine/paint.js";
import { W, H, box, camera, crest, dune, roll } from "./shared.js";

export const config = {
  panel: { w: W, h: H }, res: 1, background: "sky", camera,
  light: {
    key: { az: 120, el: 30, color: [1, 0.88, 0.7], power: 1.15 },
    fill: { az: -30, el: 35, color: [0.75, 0.62, 0.5], power: 0.32 },
    sky: [0.22, 0.17, 0.11], ground: [0.06, 0.04, 0.025], exposure: 0.48, grout: "#3b2a1c", wet: [0.18, 1.0]
  },
  sinopia: false
};

const ridge = roll(610, [[22, 900, 0.9], [9, 300, 2.3]]);
const near = roll(810, [[30, 1100, 1.8], [12, 400, 0.4]]);
const C = [830, 290], R = 168, SQ = 0.8, TILT = -0.12;

// The body's middle, from below the sand to the mouth, and its half-width, at t from 0 to 1.
const P = [[1330, 1010], [1280, 600], [620, 800], [800, 390]];
const at = (t) => {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [0, 1].map((i) => P.reduce((s, p, j) => s + p[i] * k[j], 0));
};
const half = (t) => 116 + 46 * t;
function across(t) {
  const [x0, y0] = at(Math.max(0, t - 0.01)), [x1, y1] = at(Math.min(1, t + 0.01));
  const l = Math.hypot(x1 - x0, y1 - y0) || 1, [x, y] = at(t), w = half(t);
  return [[x - ((y1 - y0) / l) * w, y + ((x1 - x0) / l) * w], [x + ((y1 - y0) / l) * w, y - ((x1 - x0) / l) * w]];
}
// A point on the mouth's rim, foreshortened and tilted toward us.
const rim = (a, r) => {
  const x = r * Math.cos(a), y = r * SQ * Math.sin(a);
  return [C[0] + x * Math.cos(TILT) - y * Math.sin(TILT), C[1] + x * Math.sin(TILT) + y * Math.cos(TILT)];
};
const oval = (r) => poly(Array.from({ length: 72 }, (_, i) => rim((i / 72) * 6.2832, r)));

export function regions() {
  return [
    { name: "sky", size: 14, mode: "sky", mat: "glass", tray: ["#b07a4a", "#c8945e", "#dcb078", "#ecc890", "#f6dcaa"] },
    { name: "haze", size: 10, mode: "radial", center: [260, 200], mat: "emit", emit: 0.5, tray: ["#f6dcaa", "#faeac4"] },
    { name: "ridge", size: 13, mode: "contour", mat: "limestone", tray: ["#a06a40", "#b47c4c", "#c48e5a"] },
    { name: "body", size: 9, mode: "contour", mat: "terracotta", tray: ["#4e3222", "#62402a", "#7a5436", "#926846"] },
    { name: "rib", size: 5, mode: "contour", mat: "terracotta", tray: ["#2e1e14", "#3a2618"] },
    { name: "lip", size: 7, mode: "contour", mat: "terracotta", tray: ["#9c744e", "#b88a5e", "#c89c6c"] },
    { name: "maw", size: 7, mode: "radial", center: C, mat: "basalt", tray: ["#100906", "#1c120a", "#2a1a0e"] },
    { name: "tooth", size: 4, mode: "contour", mat: "marble", tray: ["#d8ccb0", "#ece2c8", "#f6f0dc"] },
    { name: "spray", size: 7, mode: "contour", mat: "limestone", tray: ["#c89a66", "#dab27a", "#e8c894"] },
    { name: "near", size: 14, mode: "contour", mat: "limestone", tray: ["#a8703f", "#bc844c", "#d09a5c"] },
    { name: "crest", size: 6, mode: "contour", mat: "limestone", tray: ["#ecc894", "#f4d8a8"] },
    { name: "figure", size: 3, mode: "contour", mat: "basalt", tray: ["#1a120c"] }
  ];
}

export function draw(g, mode, D) {
  D.fill(box(0, 0, W, H), "sky", D.linear(0, 0, 0, 640, [[0, "#b07a4a"], [0.55, "#dcb078"], [1, "#f6dcaa"]]));
  D.fill(circle(260, 200, 70), "haze", "#faeac4");
  D.fill(dune(ridge), "ridge", "#b47c4c");
  // A lone figure stands on the ridge.
  D.fill(stroke([[240, ridge(240) - 2], [241, ridge(240) - 34]], 8, 6), "figure", "#1a120c");
  D.fill(circle(241, ridge(240) - 40, 5), "figure", "#1a120c");
  // The body: one smooth shape along the curve, shaded across, with a thin dark seam between
  // its segments.
  // A chain of discs along the curve, so the inner side of the bend never folds over itself.
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, [x, y] = at(t);
    D.fill(circle(x, y, half(t)), "body", D.linear(560, 0, 1400, 0, [[0, "#4e3222"], [0.5, "#926846"], [1, "#62402a"]]));
  }
  for (let i = 1; i < 9; i++) {
    const t = i / 9, [a0, b0] = across(t), [a1, b1] = across(t + 0.008);
    D.fill(poly([a0, b0, b1, a1]), "rib", "#2e1e14");
  }
  D.fill(oval(R + 20), "lip", "#b88a5e");
  D.fill(oval(R), "maw", "#1c120a");
  // Two rings of teeth point into the throat.
  for (const [count, r0, r1, w, turn] of [[30, R - 4, R - 46, 0.075, 0], [22, R - 64, R - 100, 0.1, 0.14]]) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 6.2832 + turn;
      D.fill(poly([rim(a - w, r0), rim(a + w, r0), rim(a, r1)]), "tooth", "#ece2c8");
    }
  }
  // Heaps of sand thrown up round the base.
  for (const [x, y, rx, ry] of [[1180, 800, 170, 56], [1440, 805, 150, 50], [1310, 830, 240, 64]]) {
    const heap = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI + (i / 20) * Math.PI;
      heap.push([x + rx * Math.cos(a), y + ry * Math.sin(a) * (1 + 0.15 * Math.sin(i * 1.7))]);
    }
    D.fill(poly(heap), "spray", "#e8c894");
  }
  D.fill(dune(near), "near", D.linear(0, 760, 0, 900, [[0, "#d09a5c"], [1, "#a8703f"]]));
  D.line(crest(near), 7, "crest", "#f4d8a8");
}
