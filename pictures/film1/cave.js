// The Cyclops' cave. The painted eye of the ship becomes a living eye, filling the frame,
// and the camera pulls back to the giant asleep against the rock by his fire, his sheep,
// and the men among them. At 62.3 the eye closes. At 67.15 the point of the stake catches
// in the fire. The men lift it. At 72.0 it strikes, and the eye bursts.
import { blob, capsule, circle, ellipse, poly, stroke } from "../../engine/paint.js";
import { flame, sheep, walker } from "../../engine/figures.js";
import { rng } from "../../engine/util.js";

const W = 3000;
const H = 1256;
export const EYE = [1500, 470];
const EYE_W = 120;
const FIRE = [2260, 1070];
const STAKE = { a: [2180, 1090], b: [2560, 1010] };

export const config = {
  panel: { w: W, h: H },
  res: 2,
  background: "rock",
  camera: {
    keys: [
      [52.65, EYE[0], EYE[1], 210],
      [54.4, EYE[0], EYE[1] + 6, 360],
      [58.5, EYE[0] + 40, EYE[1] + 160, 1500],
      [62.3, 1560, 700, 2600],
      [64.0, 1600, 760, 2800],
      [67.15, 1850, 860, 2100],
      [70.2, 1720, 690, 1500],
      [71.9, EYE[0] + 30, EYE[1] + 40, 820],
      [73.2, EYE[0], EYE[1], 700]
    ],
    tilt: [[52.65, 14], [58, 8], [64, 4], [72, 10]],
    yaw: [[52.65, 6], [60, 0], [72, -4]],
    aperture: 0.03
  },
  light: {
    key: { az: 100, el: 30, color: [0.5, 0.42, 0.4], power: 0.25 },
    fill: { az: -90, el: 30, color: [0.4, 0.3, 0.25], power: 0.1 },
    sky: [0.03, 0.02, 0.02], ground: [0.02, 0.012, 0.01],
    exposure: [[52.65, 1.0], [58, 1.35], [72, 1.25]],
    grout: "#2e241e",
    wet: [0.4, 1.2],
    points: [
      { x: FIRE[0], y: FIRE[1] - 60, z: 240, color: "#ff9440", power: 1.0, flicker: 0.4 },
      { x: 2480, y: [[66.5, 1020], [70.5, 900], [72, 560]], z: 120, color: "#ffb050", power: [[66.5, 0], [67.15, 0.25], [72, 0.35], [72.3, 0.0]], flicker: 0.3 }
    ]
  },
  flicker: 0.4,
  rims: [
    { figures: ["giant", "giantdark"], light: [FIRE[0], FIRE[1] - 60], warm: "giantlit", width: 7, min: 0.25, reach: 2000 },
    { figures: ["men"], light: [FIRE[0], FIRE[1] - 60], warm: "menlit", width: 2.6, min: 0.2, reach: 1600 },
    { figures: ["wool"], light: [FIRE[0], FIRE[1] - 60], warm: "woollit", width: 4, min: 0.2, reach: 2200 }
  ],
  sinopia: { groups: [["rock*", "floor*"], ["giant*"], ["eye*", "iris", "pupil", "lid"], ["wool*", "dark"], ["men*"], ["fire*", "log"]] }
};

export function regions() {
  return [
    { name: "rock", size: 14, mode: "rubble", mat: "basalt", tray: ["#030203", "#070505", "#0d0908", "#150e0b", "#1e140d"] },
    { name: "rocklit", size: 11, mode: "rubble", mat: "basalt", tray: ["#2e1c12", "#3e2616", "#55331c"] },
    { name: "floor", size: 13, mode: "ground", mat: "basalt", tray: ["#080607", "#0f0b0a", "#18110d", "#22170f"] },
    { name: "giant", size: 9, mode: "contour", mat: "terracotta", tray: ["#1e130d", "#2c1c12", "#3c2618", "#4e321e", "#623f26"] },
    { name: "giantdark", size: 8, mode: "contour", mat: "terracotta", tray: ["#0e0907", "#160e0a", "#1e130d"] },
    { name: "giantlit", size: 6, mode: "contour", thin: true, mat: "terracotta", tray: ["#6a4630", "#8f6142", "#b07c56", "#cf9a70"] },
    { name: "hair", size: 7, mode: "contour", mat: "basalt", tray: ["#080505", "#0e0907", "#150d0a"] },
    { name: "lid", size: 5, mode: "contour", mat: "terracotta", tray: ["#4e321e", "#623f26", "#7a4e30"] },
    { name: "eyewhite", size: 4, mode: "contour", mat: "marble", tray: ["#b8ad98", "#d0c6b2", "#e2dacb", "#efe9de"] },
    { name: "iris", size: 3, mode: "radial", center: EYE, mat: ["glass", "glass", "glass", "gold"], tray: ["#5a3410", "#8a5418", "#c98a2e", "#e8b45a"] },
    { name: "pupil", size: 3, mode: "radial", center: EYE, mat: "glass", tray: ["#020202", "#060505"] },
    { name: "wool", size: 6, mode: "contour", mat: "marble", tray: ["#4a4236", "#6a6050", "#8c826e", "#aea48e"] },
    { name: "woollit", size: 4, mode: "contour", thin: true, mat: "marble", tray: ["#c8b08a", "#dcc8a2", "#efe0bc"] },
    { name: "dark", size: 4, mode: "contour", mat: "basalt", tray: ["#060505", "#0c0a09"] },
    { name: "men", size: 3.4, mode: "contour", mat: "basalt", tray: ["#030303", "#070606"] },
    { name: "menlit", size: 2.6, mode: "contour", thin: true, mat: "terracotta", tray: ["#8a4a24", "#b8642e", "#e08a42"] },
    { name: "log", size: 5, mode: "contour", mat: "basalt", tray: ["#100a07", "#1a100a"] },
    { name: "fire", size: 4.6, mode: "contour", mat: "emit", emit: [6.5, 4.8, 3.4, 2.2], tray: ["#ffe2a0", "#ffbe5a", "#ff8f30", "#e45a1e"] },
    { name: "firebed", size: 4.6, mode: "contour", mat: "emit", emit: [2.2, 1.4], tray: ["#d0501c", "#8a2a12"] },
    { name: "stake", size: 4, mode: "contour", thin: true, mat: "glass", tray: ["#2a1a0e", "#3e2816", "#54371e"] },
    { name: "stakepoint", size: 3.4, mode: "contour", mat: ["glass", "emit", "emit"], emit: [0, 3, 5], tray: ["#3e2816", "#ff8a30", "#ffd080"] },
    { name: "blood", size: 3.5, mode: "contour", mat: "glass", tray: ["#3e0a0a", "#6a1410", "#8a2216"] }
  ];
}

export function draw(g, mode, D) {
  const R = rng(5);
  // The cave: rock in irregular stones, a lit patch round the fire, the floor.
  D.fill(poly([[0, 0], [W, 0], [W, H], [0, H]]), "rock", "#120c0a");
  D.fill(blob([[1700, 1250], [1800, 860], [2060, 700], [2400, 690], [2720, 800], [2900, 1000], [2960, 1250]]), "rocklit",
    D.radial(FIRE[0], FIRE[1] - 80, 40, 760, [[0, "#55331c"], [0.6, "#3e2616"], [1, "#2e1c12"]]));
  D.fill(poly([[0, 1100], [700, 1070], [1500, 1080], [2200, 1100], [3000, 1120], [3000, 1256], [0, 1256]]), "floor");

  // The giant, seated against the rock, filling the frame: shoulders, the great head,
  // the beard, the arm across the knee.
  D.fill(blob([[700, 1110], [640, 900], [700, 760], [900, 690], [1150, 700], [1290, 760], [1330, 900], [1300, 1110]]), "giantdark");
  D.fill(blob([[980, 1120], [1000, 820], [1120, 720], [1300, 690], [1500, 690], [1700, 700], [1880, 740], [1990, 840], [2020, 1000], [2000, 1120]]), "giant",
    D.linear(2000, 700, 1000, 1100, [[0, "#623f26"], [0.5, "#3c2618"], [1, "#1e130d"]]));
  // The great head: a craggy skull, heavy cheekbones, a broad nose, a cruel mouth.
  const head = blob([[1236, 600], [1222, 470], [1250, 360], [1310, 270], [1400, 210], [1520, 190], [1640, 208], [1730, 270], [1790, 360], [1812, 470],
    [1800, 590], [1760, 690], [1680, 770], [1560, 810], [1440, 805], [1330, 760], [1262, 690]]);
  D.fill(head, "giant", D.radial(1660, 360, 40, 680, [[0, "#7a4e30"], [0.35, "#5a3a22"], [0.7, "#3c2618"], [1, "#1e130d"]]));
  // Hollows under the cheekbones, and the light on the bones themselves.
  D.fill(blob([[1290, 560], [1360, 640], [1420, 690], [1380, 720], [1300, 660]]), "giantdark");
  D.fill(blob([[1700, 560], [1640, 640], [1590, 690], [1630, 720], [1720, 650]]), "giantdark");
  D.fill(stroke([[1640, 548], [1700, 560], [1752, 600]], 16, 8), "giantlit");
  D.fill(stroke([[EYE[0] - 180, EYE[1] - 96], [EYE[0], EYE[1] - 128], [EYE[0] + 190, EYE[1] - 94]], 10, 6), "giantlit");
  D.fill(blob([[EYE[0] - 40, EYE[1] + 80], [EYE[0] + 40, EYE[1] + 80], [EYE[0] + 70, EYE[1] + 190], [EYE[0] + 30, EYE[1] + 215], [EYE[0] - 30, EYE[1] + 215], [EYE[0] - 70, EYE[1] + 190]]), "giant", "#4e321e");
  D.fill(blob([[EYE[0] + 30, EYE[1] + 100], [EYE[0] + 70, EYE[1] + 185], [EYE[0] + 40, EYE[1] + 205], [EYE[0] + 20, EYE[1] + 140]]), "giantlit");
  D.fill(blob([[EYE[0] - 60, EYE[1] + 200], [EYE[0] - 30, EYE[1] + 222], [EYE[0] - 50, EYE[1] + 232]]), "giantdark");
  D.fill(blob([[EYE[0] + 60, EYE[1] + 200], [EYE[0] + 30, EYE[1] + 222], [EYE[0] + 50, EYE[1] + 232]]), "giantdark");
  D.fill(blob([[1230, 380], [1270, 250], [1380, 170], [1520, 140], [1660, 160], [1770, 230], [1830, 360], [1790, 340], [1700, 260], [1540, 220], [1380, 250], [1290, 320]]), "hair");
  // Beard over the chest.
  D.fill(blob([[1290, 700], [1380, 790], [1500, 820], [1640, 800], [1740, 720], [1770, 860], [1690, 1000], [1500, 1060], [1320, 990], [1260, 840]]), "hair");
  // The mouth, at the top of the beard.
  D.fill(stroke([[EYE[0] - 100, EYE[1] + 312], [EYE[0] - 40, EYE[1] + 292], [EYE[0] + 40, EYE[1] + 290], [EYE[0] + 104, EYE[1] + 314]], 13, 10), "giantdark");
  // The brow ridge over the single eye.
  D.fill(blob([[EYE[0] - 230, EYE[1] - 50], [EYE[0] - 120, EYE[1] - 120], [EYE[0] + 120, EYE[1] - 120], [EYE[0] + 230, EYE[1] - 50], [EYE[0] + 150, EYE[1] - 70], [EYE[0] - 150, EYE[1] - 70]]), "giantdark");
  // The eye: white, amber iris, black pupil, the lids.
  D.fill(blob([[EYE[0] - EYE_W * 1.5, EYE[1]], [EYE[0] - EYE_W * 0.7, EYE[1] - EYE_W * 0.62], [EYE[0] + EYE_W * 0.7, EYE[1] - EYE_W * 0.62], [EYE[0] + EYE_W * 1.5, EYE[1]],
    [EYE[0] + EYE_W * 0.7, EYE[1] + EYE_W * 0.55], [EYE[0] - EYE_W * 0.7, EYE[1] + EYE_W * 0.55]]), "eyewhite",
    D.radial(EYE[0] - 30, EYE[1] - 30, 10, EYE_W * 1.5, [[0, "#efe9de"], [0.7, "#d0c6b2"], [1, "#b8ad98"]]));
  D.fill(circle(EYE[0], EYE[1], EYE_W * 0.52), "iris", D.radial(EYE[0], EYE[1], EYE_W * 0.18, EYE_W * 0.52, [[0, "#e8b45a"], [0.5, "#c98a2e"], [1, "#5a3410"]]));
  D.fill(circle(EYE[0], EYE[1], EYE_W * 0.2), "pupil");
  D.fill(stroke([[EYE[0] - EYE_W * 1.55, EYE[1] + 4], [EYE[0] - EYE_W * 0.7, EYE[1] - EYE_W * 0.7], [EYE[0] + EYE_W * 0.7, EYE[1] - EYE_W * 0.7], [EYE[0] + EYE_W * 1.55, EYE[1] + 4]], 20, 20), "lid");

  // Sheep in the near dark, and the men among them.
  for (const [x, y, h, f, sd] of [[350, 1150, 150, 1, 1], [560, 1170, 140, -1, 2], [190, 1200, 130, 1, 3], [2700, 1160, 150, -1, 4], [2860, 1190, 130, 1, 5], [2560, 1200, 120, 1, 6]]) {
    for (const [reg, path] of sheep({ x, y, h, face: f, seed: sd, reg: { wool: "wool", head: "dark", leg: "dark" } })) D.fill(path, reg);
  }
  // The fire: a log pile and the flames.
  D.fill(blob([[FIRE[0] - 150, FIRE[1] + 30], [FIRE[0] - 100, FIRE[1] - 10], [FIRE[0] + 100, FIRE[1] - 10], [FIRE[0] + 150, FIRE[1] + 30], [FIRE[0], FIRE[1] + 50]]), "firebed");
  for (const [a, b] of [[[FIRE[0] - 160, FIRE[1] + 30], [FIRE[0] + 60, FIRE[1] - 30]], [[FIRE[0] + 160, FIRE[1] + 30], [FIRE[0] - 60, FIRE[1] - 30]]]) D.fill(stroke([a, b], 30, 24), "log");
  D.fill(flame(FIRE[0] - 50, FIRE[1] - 10, 170, 110, -0.05), "fire", "#e45a1e");
  D.fill(flame(FIRE[0] + 50, FIRE[1] - 10, 200, 120, 0.06), "fire", "#ff8f30");
  D.fill(flame(FIRE[0], FIRE[1] - 10, 260, 140, 0.0), "fire", "#ffbe5a");
  D.fill(flame(FIRE[0], FIRE[1] - 10, 130, 70, 0.0), "fire", "#ffe2a0");
  // The stake laid by the fire, its point in the embers.
  D.fill(stroke([STAKE.a, STAKE.b], 22, 26), "stake");
  D.fill(poly([[STAKE.a[0] + 10, STAKE.a[1] - 12], [STAKE.a[0] - 60, STAKE.a[1] + 18], [STAKE.a[0] + 14, STAKE.a[1] + 12]]), "stakepoint", "#3e2816");
  // The men, crouched in the shadow by the sheep.
  const menReg = { body: "men", far: "men", skirt: "men", cloak: "men", helmet: "men", crest: "men", cap: "men", beard: "men", skin: "men", shield: "men", rim: "men", spear: "men", tip: "men", dark: "men" };
  for (const [x, y, f, pose, head] of [[2440, 1160, -1, "crouch", "pilos"], [2600, 1150, -1, "crouch", "bare"], [760, 1160, 1, "crouch", "bare"]]) {
    for (const [reg, path] of walker({ x, y, h: 240, face: f, pose, arms: "forward", head, reg: menReg })) D.fill(path, reg);
  }
}

const menReg2 = { body: "men", far: "men", skirt: "men", cloak: "men", helmet: "men", crest: "men", cap: "men", beard: "men", skin: "men", shield: "men", rim: "men", spear: "men", tip: "men", dark: "men" };

export const arrivals = [
  // The eye closes: the lid comes down over it.
  {
    name: "lidshut", at: 62.0, dur: 0.6, from: [0, -1],
    draw(g, mode, D) {
      D.fill(blob([[EYE[0] - EYE_W * 1.6, EYE[1] + 6], [EYE[0] - EYE_W * 0.7, EYE[1] - EYE_W * 0.72], [EYE[0] + EYE_W * 0.7, EYE[1] - EYE_W * 0.72],
        [EYE[0] + EYE_W * 1.6, EYE[1] + 6], [EYE[0] + EYE_W * 0.7, EYE[1] + EYE_W * 0.5], [EYE[0] - EYE_W * 0.7, EYE[1] + EYE_W * 0.5]]), "lid");
      D.fill(stroke([[EYE[0] - EYE_W * 1.4, EYE[1] + 8], [EYE[0], EYE[1] + EYE_W * 0.32], [EYE[0] + EYE_W * 1.4, EYE[1] + 8]], 10, 10), "giantdark");
    }
  },
  // The men lift the stake: three of them, running it up toward the eye.
  {
    name: "lift", at: 69.0, dur: 0.8, from: [1, 0.3],
    draw(g, mode, D) {
      D.fill(stroke([[1640, 640], [2240, 860]], 26, 30), "stake");
      D.fill(poly([[1650, 628], [1560, 610], [1652, 656]]), "stakepoint", "#ff8a30");
      for (const [x, y, pose] of [[1960, 1080, "run"], [2150, 1080, "A"], [2330, 1090, "run"]]) {
        for (const [reg, path] of walker({ x, y, h: 220, face: -1, pose, arms: "up", head: "bare", lean: 0.12, reg: menReg2 })) D.fill(path, reg);
      }
    }
  }
];

export const events = {
  ignite: [
    { regions: ["stakepoint"], at: 67.15, jitter: 0.08 },
    { arrival: "lift", regions: ["stakepoint"], at: 69.0, jitter: 0.04 }
  ],
  burst: [
    { regions: ["eyewhite", "iris", "pupil", "lid", "stake*", "giant", "hair"], within: [EYE[0] - 320, EYE[1] - 260, EYE[0] + 320, EYE[1] + 280], center: EYE, at: 72.0, speed: 2600, v: 2.6, dur: 0.7 }
  ]
};
