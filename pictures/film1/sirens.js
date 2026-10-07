// The Sirens. Golden haze over a still sea; the Sirens on their rocks among bones, women's
// heads on birds' bodies, their gold wings opening one after another as the ship passes;
// Odysseus bound to the mast, the crew rowing with their ears stopped.
import { blob, circle, poly, stroke } from "../../engine/paint.js";
import { bands, ship, walker } from "../../engine/figures.js";
import { rng } from "../../engine/util.js";

const W = 3000;
const H = 1256;
const HORIZON = 640;
const SHIP = ship({ x: 1960, y: 1010, len: 900, face: -1, oars: 18, oarSwing: 0.01, billow: 0.03,
  reg: { hull: "hull", rail: "rail", eye: "hull", eyeWhite: "rail", mast: "mast", sail: "sail", sailDark: "sailband", oar: "oar", ram: "rail" } });
const MAST_X = 1960 - 0.5 * 900;
// Perched on the rocks: x, y (feet), facing, size.
const SIRENS = [[640, 700, 1, 1.0], [1010, 640, -1, 0.85], [2560, 650, -1, 1.0]];

export const config = {
  panel: { w: W, h: H },
  res: 2,
  background: "haze",
  camera: {
    keys: [
      [83.29, 1500, 640, 2700],
      [86.0, 1400, 680, 2300],
      [88.5, MAST_X + 40, 660, 1500],
      [90.6, MAST_X, 650, 1300]
    ],
    tilt: [[83.29, 3], [90.6, 6]],
    yaw: [[83.29, 0], [90.6, -3]],
    aperture: 0.03
  },
  light: {
    key: { az: 80, el: 35, color: [1.0, 0.86, 0.62], power: 1.7 },
    fill: { az: -90, el: 40, color: [0.7, 0.6, 0.45], power: 0.4 },
    sky: [0.2, 0.16, 0.1], ground: [0.05, 0.04, 0.03],
    exposure: 0.2,
    grout: "#6a5a44",
    wet: [0.4, 1.2]
  },
  ripple: { dir: [1, 0.1], wavelength: 220, speed: 60 },
  rims: [{ figures: ["hull", "mast", "crew", "hero"], dir: [0.3, -1], warm: "rim", width: 3, min: 0.35 }],
  sinopia: { groups: [["haze*"], ["sea*"], ["rock*", "bone"], ["siren*", "wing*", "feather*"], ["hull", "mast", "rail", "oar", "crew", "hero", "rope", "sail*"]] }
};

export function regions() {
  const wings = SIRENS.map(([x, y], i) => ({ name: `wing${i}`, size: 3.8, mode: "rays", center: [x, y - 120], mat: "gold", tray: ["#8a6a2e", "#b38d42", "#d9b25e", "#efd38d"] }));
  return [
    { name: "haze", size: 15, mode: "sky", mat: "marble", tray: ["#9e7c4a", "#b8925a", "#c9a05e", "#d8b272", "#e0bf7c", "#ecd29a"] },
    { name: "sea", size: 12, mode: "ground", mat: "glass", ripple: 0.05, tray: ["#5e4a2e", "#76603c", "#8e764c", "#a88e5e", "#c2a670"] },
    { name: "rock", size: 11, mode: "rubble", mat: "basalt", tray: ["#1c1610", "#2c241c", "#3c3226", "#4c4030"] },
    { name: "bone", size: 3.4, mode: "contour", mat: "marble", tray: ["#c8bea8", "#e6dcc6", "#f4ecdc"] },
    { name: "siren", size: 3.6, mode: "contour", mat: "terracotta", tray: ["#2a1a10", "#3e2818", "#563a24"] },
    { name: "sirenbreast", size: 3.2, mode: "contour", mat: "marble", tray: ["#a88464", "#c49e7c", "#dcba98"] },
    { name: "sirenface", size: 2.8, mode: "contour", mat: "marble", tray: ["#b8926e", "#d0aa86", "#e6c6a2"] },
    { name: "sirenhair", size: 3, mode: "contour", mat: "glass", tray: ["#140c08", "#22140c"] },
    { name: "featherline", size: 2.6, mode: "contour", thin: true, mat: "basalt", tray: ["#3a2a14", "#4e3a1c"] },
    ...wings,
    { name: "hull", size: 6, mode: "contour", mat: "glass", tray: ["#140e08", "#1e160c", "#2a1e12"] },
    { name: "sail", size: 6, mode: "flow", angle: Math.PI / 2, mat: "glass", tray: ["#4a1c10", "#5e2414", "#742e1a"] },
    { name: "sailband", size: 3.6, mode: "contour", thin: true, mat: "marble", tray: ["#c8b08a", "#dcc8a2"] },
    { name: "rail", size: 3, mode: "contour", thin: true, mat: "gold", tray: ["#6a4e26", "#8a6a2e"] },
    { name: "mast", size: 3.6, mode: "contour", thin: true, mat: "glass", tray: ["#1a120a", "#261a0e"] },
    { name: "oar", size: 2.8, mode: "contour", thin: true, mat: "glass", tray: ["#1a120a", "#261a0e"] },
    { name: "crew", size: 3.2, mode: "contour", mat: "basalt", tray: ["#0a0806", "#120e0a"] },
    { name: "hero", size: 3.4, mode: "contour", mat: "basalt", tray: ["#0a0806", "#120e0a"] },
    { name: "rope", size: 2.4, mode: "contour", thin: true, mat: "glass", tray: ["#8a6e48", "#a88a5e"] },
    { name: "rim", size: 2.8, mode: "contour", thin: true, mat: "gold", tray: ["#b38d42", "#d9b25e", "#efd38d"] }
  ];
}

// A siren: a woman's head and breast on a bird's body, perched on a rock, her wings
// folded along her back, or open in a fan of long gold feathers.
function siren(D, i, open) {
  const [x, y, f, sc] = SIRENS[i];
  const X = (u) => x + f * u * sc;
  const Y = (v) => y - v * sc;
  const wing = `wing${i}`;
  const root = [X(-20), Y(150)];
  if (open) {
    // Seven long feathers fanning up and back, each its own stroke so it reads.
    for (let k = 0; k < 7; k++) {
      const a = (Math.PI / 2) + f * (0.25 + k * 0.2);
      const len = (230 - Math.abs(k - 2) * 18) * sc;
      const tip = [root[0] + Math.cos(a) * len, root[1] - Math.sin(a) * len];
      const mid = [root[0] + Math.cos(a) * len * 0.55, root[1] - Math.sin(a) * len * 0.55];
      D.fill(stroke([root, mid, tip], 46 * sc, 16 * sc), wing, k % 2 ? "#d9b25e" : "#efd38d");
      D.fill(stroke([root, tip], 3.2, 2.4), "featherline");
    }
  } else {
    D.fill(blob([[X(-10), Y(160)], [X(-70), Y(140)], [X(-150), Y(80)], [X(-170), Y(40)], [X(-110), Y(60)], [X(-30), Y(100)]]), wing, "#b38d42");
    for (const v of [70, 95, 120]) D.fill(stroke([[X(-30), Y(v + 20)], [X(-140), Y(v - 30)]], 3.2, 2.4), "featherline");
  }
  // Body, tail, and taloned legs gripping the rock.
  D.fill(blob([[X(-40), Y(40)], [X(-60), Y(110)], [X(-20), Y(165)], [X(40), Y(170)], [X(70), Y(120)], [X(55), Y(50)], [X(10), Y(20)]]), "siren");
  D.fill(poly([[X(-40), Y(50)], [X(-120), Y(0)], [X(-60), Y(40)]]), "siren");
  for (const lx of [-8, 22]) D.fill(stroke([[X(lx), Y(30)], [X(lx + 4), Y(0)]], 9 * sc, 6 * sc), "siren");
  // A woman's breast and neck, her head turned to the ship, dark hair falling behind.
  D.fill(blob([[X(-10), Y(150)], [X(50), Y(160)], [X(60), Y(195)], [X(30), Y(215)], [X(0), Y(200)]]), "sirenbreast");
  D.fill(blob([[X(-20), Y(300)], [X(40), Y(318)], [X(70), Y(290)], [X(40), Y(230)], [X(0), Y(200)], [X(-40), Y(220)], [X(-60), Y(270)]]), "sirenhair");
  D.fill(blob([[X(10), Y(290)], [X(48), Y(296)], [X(66), Y(262)], [X(58), Y(232)], [X(34), Y(218)], [X(10), Y(236)]]), "sirenface");
}

export function draw(g, mode, D) {
  const sky = bands(0, 0, W, HORIZON, 6, 12, 7);
  const cols = ["#9e7c4a", "#b8925a", "#c9a05e", "#d8b272", "#e0bf7c", "#ecd29a"];
  sky.forEach((p, i) => D.fill(p, "haze", cols[i]));
  D.fill(poly([[0, HORIZON], [W, HORIZON], [W, H], [0, H]]), "sea", D.linear(0, HORIZON, 0, H, [[0, "#c2a670"], [1, "#5e4a2e"]]));
  // The rocks, and bones on them.
  const R = rng(13);
  for (const [cx, cy, w, h] of [[700, 860, 560, 230], [1040, 790, 380, 180], [2560, 820, 520, 220]]) {
    const pts = [];
    for (let i = 0; i <= 14; i++) pts.push([cx - w / 2 + (i / 14) * w, cy - h * Math.sin((i / 14) * Math.PI) * (0.7 + 0.5 * R())]);
    pts.push([cx + w / 2 + 30, cy + 60], [cx - w / 2 - 30, cy + 60]);
    D.fill(poly(pts), "rock", "#2c241c");
    for (let k = 0; k < 7; k++) {
      const bx = cx - w / 2.4 + R() * w * 0.8;
      const by = cy + 10 + R() * 30;
      D.fill(stroke([[bx - 22, by], [bx + 22, by + (R() - 0.5) * 10]], 7, 7), "bone");
      if (R() > 0.6) D.fill(circle(bx + 30, by - 8, 13), "bone");
    }
  }
  for (let i = 0; i < SIRENS.length; i++) siren(D, i, false);
  // The ship, the crew at the oars, and Odysseus bound to the mast.
  for (const [reg, path] of SHIP.parts) D.fill(path, reg);
  const crewReg = { body: "crew", far: "crew", skirt: "crew", cloak: "crew", helmet: "crew", crest: "crew", cap: "crew", beard: "crew", skin: "crew", shield: "crew", rim: "crew", spear: "crew", tip: "crew", dark: "crew" };
  for (let i = 0; i < 6; i++) {
    const x = 1300 + i * 105;
    if (Math.abs(x - MAST_X) < 70) continue;
    for (const [reg, path] of walker({ x, y: 950, h: 120, face: 1, pose: "crouch", arms: "forward", head: "bare", reg: crewReg })) D.fill(path, reg);
  }
  const heroReg = Object.assign({}, crewReg, { body: "hero", far: "hero", skirt: "hero", cap: "hero", beard: "hero", skin: "hero" });
  for (const [reg, path] of walker({ x: MAST_X + 12, y: 955, h: 200, face: 1, pose: "stand", arms: "swing", head: "pilos", lean: -0.02, reg: heroReg })) D.fill(path, reg);
  for (const y of [870, 900, 930]) D.fill(stroke([[MAST_X - 30, y], [MAST_X + 50, y + 4]], 5, 5), "rope");
}

// Their wings open one after another, on the beat, as the ship comes abreast.
export const arrivals = SIRENS.map((_, i) => ({
  name: `open${i}`, at: [85.55, 86.81, 87.49][i], dur: 0.35, from: [0, -1],
  draw(g, mode, D) {
    siren(D, i, true);
  }
}));
