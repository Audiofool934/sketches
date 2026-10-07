// Dawn on the wine-dark sea. The fire of Troy flies up and seats as the dawn: courses of
// rose and gold over a dark violet sea, and the black ships under sail. The sun clears
// the sea at 41.7 and lays a road of gold across the water. The camera closes on the
// painted eye at the lead ship's bow.
import { circle, poly, stroke } from "../../engine/paint.js";
import { bands, ship } from "../../engine/figures.js";
import { rng } from "../../engine/util.js";

const W = 3200;
const H = 1340;
const HORIZON = 660;
const SUN = [1600, HORIZON];
const LEAD = { x: 2470, y: 980, len: 760 };
const LEAD_SHIP = ship({ x: LEAD.x, y: LEAD.y, len: LEAD.len, face: -1, oars: 16, billow: 0.05,
  reg: { hull: "hull", rail: "rail", eye: "eye", eyeWhite: "eyewhite", mast: "mast", sail: "sail", sailDark: "sailline", oar: "oar", ram: "rail" } });
export const EYE = LEAD_SHIP.eye;

export const config = {
  panel: { w: W, h: H },
  res: 2,
  background: "sky",
  camera: {
    keys: [
      [37.12, 1600, 640, 3000],
      [38.6, 1600, 650, 2980],
      [41.7, 1640, 690, 2600],
      [46.0, 1800, 790, 1700],
      [49.5, EYE.x + 60, EYE.y - 40, 760],
      [51.6, EYE.x + 4, EYE.y - 4, 300],
      [52.65, EYE.x, EYE.y, 210]
    ],
    tilt: [[37.12, 2], [46, 6], [52.65, 14]],
    yaw: [[37.12, 0], [46, 3], [52.65, 6]],
    aperture: 0.032
  },
  light: {
    key: { az: 95, el: [[37.12, 4], [41.7, 9], [52.65, 16]], color: [1.0, 0.72, 0.5], power: [[37.12, 1.1], [41.7, 2.0], [52.65, 2.4]] },
    fill: { az: -90, el: 40, color: [0.55, 0.45, 0.75], power: 0.35 },
    sky: [0.14, 0.09, 0.12], ground: [0.03, 0.02, 0.04],
    exposure: [[37.12, 0.25], [41.7, 0.35], [52.65, 0.35]],
    grout: "#3e3446",
    wet: [0.4, 1.2],
    points: [
      { x: SUN[0], y: [[37.12, HORIZON + 30], [41.7, HORIZON - 40], [52.65, HORIZON - 120]], z: 260, color: "#ffc070", power: [[37.12, 0.15], [41.7, 0.5], [52.65, 0.55]] }
    ]
  },
  ripple: { dir: [1, 0.25], wavelength: 160, speed: 120 },
  rims: [{ figures: ["hull*", "sail*", "mast*"], light: SUN, warm: "rim", width: 4, min: 0.3 }],
  sinopia: { groups: [["sky*", "cloud*"], ["sea*", "glint*", "road*"], ["hull*", "sail*", "mast", "oar", "rail", "eye*"]] }
};

export function regions() {
  return [
    { name: "sky", size: 15, mode: "sky", mat: "glass", tray: ["#25244e", "#3e3c6e", "#5d4f80", "#7d5f86", "#a06c7e", "#c47c6e", "#d9937a", "#e8a98a", "#f2c3a0", "#f6d9bc"] },
    { name: "cloud", size: 10, mode: "sky", mat: "marble", tray: ["#5a3e5e", "#7a4e66", "#a46a74", "#d08e86", "#f0b89a"] },
    { name: "sun", size: 7, mode: "radial", center: SUN, mat: ["gold", "gold", "emit", "emit"], emit: [0, 0, 3.5, 5], tray: ["#e9b45c", "#f6cd78", "#ffe2a0", "#fff1cc"] },
    { name: "sea", size: 13, mode: "ground", mat: "glass", ripple: 0.07, tray: ["#0e0a1c", "#140c26", "#1c1132", "#24163e", "#2c1c4a", "#352654", "#4a3a6c"] },
    { name: "glint", size: 6, mode: "ground", mat: "glass", ripple: 0.12, tray: ["#6e4e86", "#9a6c9c", "#b48ab0", "#d6a8bc"] },
    { name: "road", size: 6, mode: "ground", mat: "gold", ripple: 0.16, tray: ["#8a6a2e", "#b38d42", "#d9b25e", "#efd38d"] },
    { name: "hull", size: 6, mode: "contour", mat: "glass", tray: ["#06050a", "#0b0910", "#120f18"] },
    { name: "hullfar", size: 7, mode: "contour", mat: "glass", tray: ["#1a1428", "#221a32", "#2a2040"] },
    { name: "sail", size: 6.5, mode: "flow", angle: Math.PI / 2, mat: "glass", tray: ["#140f18", "#1c1520", "#251c2a"] },
    { name: "sailfar", size: 7, mode: "flow", angle: Math.PI / 2, mat: "glass", tray: ["#2a2240", "#33284a"] },
    { name: "sailline", size: 3, mode: "contour", thin: true, mat: "glass", tray: ["#3a2a2a", "#4a3530"] },
    { name: "mast", size: 3.2, mode: "contour", thin: true, mat: "glass", tray: ["#0e0b10", "#16121a"] },
    { name: "oar", size: 2.8, mode: "contour", thin: true, mat: "glass", tray: ["#0e0b10", "#1a1520"] },
    { name: "rail", size: 3.2, mode: "contour", thin: true, mat: "gold", tray: ["#6a4e26", "#8a6a2e", "#b38d42"] },
    { name: "eyewhite", size: 2.6, mode: "contour", mat: "marble", tray: ["#d8d2c4", "#ece8de", "#f6f4ee"] },
    { name: "eye", size: 2.4, mode: "radial", center: [EYE.x, EYE.y], mat: "glass", tray: ["#5a1610", "#8a2a18", "#b33c1e"] },
    { name: "rim", size: 3.2, mode: "contour", thin: true, mat: "gold", tray: ["#8a6a2e", "#b38d42", "#d9b25e", "#efd38d"] }
  ];
}

export function draw(g, mode, D) {
  // The dawn sky in courses, from violet overhead to gold at the sea.
  const sky = bands(0, 0, W, HORIZON, 10, 10, 11);
  const skyCols = ["#25244e", "#3e3c6e", "#5d4f80", "#7d5f86", "#a06c7e", "#c47c6e", "#d9937a", "#e8a98a", "#f2c3a0", "#f6d9bc"];
  sky.forEach((p, i) => D.fill(p, "sky", skyCols[i]));
  // Long clouds lit from below.
  const R = rng(17);
  for (const [cx, cy, cw, ch] of [[700, 380, 620, 24], [2350, 330, 760, 28], [1300, 250, 520, 20], [2900, 470, 420, 18], [420, 520, 380, 16]]) {
    const pts = [];
    for (let k = 0; k <= 16; k++) pts.push([cx - cw / 2 + (k / 16) * cw, cy - ch * Math.sin((k / 16) * Math.PI) * (0.8 + 0.4 * R())]);
    for (let k = 16; k >= 0; k--) pts.push([cx - cw / 2 + (k / 16) * cw, cy + ch * 0.3]);
    D.fill(poly(pts), "cloud", D.linear(0, cy - ch, 0, cy + ch * 0.3, [[0, "#5a3e5e"], [1, "#f0b89a"]]));
  }
  // The sun, half risen at first; the picture holds it whole.
  D.fill(circle(SUN[0], SUN[1], 95), "sun", D.radial(SUN[0], SUN[1], 10, 95, [[0, "#fff1cc"], [0.6, "#ffe2a0"], [1, "#e9b45c"]]));
  // The sea, darker toward us.
  D.fill(poly([[0, HORIZON], [W, HORIZON], [W, H], [0, H]]), "sea", D.linear(0, HORIZON, 0, H, [[0, "#4a3a6c"], [0.25, "#2c1c4a"], [1, "#0e0a1c"]]));
  // Glints on the swell: short bright dashes in rows.
  const G = rng(29);
  for (let i = 0; i < 160; i++) {
    const y = HORIZON + 20 + Math.pow(G(), 1.6) * (H - HORIZON - 40);
    const x = G() * W;
    const len = 20 + (y - HORIZON) * 0.16 * (0.5 + G());
    D.fill(stroke([[x - len / 2, y], [x + len / 2, y + 2]], 5 + (y - HORIZON) * 0.008, 4), "glint", G() > 0.5 ? "#b48ab0" : "#9a6c9c");
  }
  // The road of gold under the sun.
  for (let i = 0; i < 46; i++) {
    const v = i / 46;
    const y = HORIZON + 14 + v * v * (H - HORIZON - 30);
    const halfw = 30 + v * 260;
    const off = Math.sin(i * 2.3) * halfw * 0.3;
    D.fill(stroke([[SUN[0] - halfw * 0.6 + off, y], [SUN[0] + halfw * 0.6 + off, y + 3]], 6 + v * 10, 5 + v * 8), "road", v < 0.4 ? "#efd38d" : "#d9b25e");
  }
  // Two far ships, then the lead ship.
  for (const [x, y, len] of [[880, 720, 300], [1240, 700, 220]]) {
    for (const [reg, path] of ship({ x, y, len, face: -1, oars: 10, reg: { hull: "hullfar", rail: "hullfar", eye: "hullfar", eyeWhite: "hullfar", mast: "mast", sail: "sailfar", sailDark: "sailfar", oar: "hullfar", ram: "hullfar" } }).parts) D.fill(path, reg);
  }
  for (const [reg, path] of LEAD_SHIP.parts) D.fill(path, reg);
}
