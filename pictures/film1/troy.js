// Troy at night. The moon over the walls, the city asleep behind them, and on the plain
// the wooden horse. On four clanks the hatch in its belly falls open and a rope drops;
// small black figures slide down and run for the gate; the gate opens on firelight;
// on five sounds, five fires catch in the city.
import { blob, capsule, circle, ellipse, poly, stroke } from "../../engine/paint.js";
import { flame, walker } from "../../engine/figures.js";
import { rng } from "../../engine/util.js";

const W = 3200;
const H = 1340;
const MOON = [560, 250];
const MOON_R = 72;
const GATE = [1305, 900];
const FIRES = [
  { name: "fire1", at: 34.88, x: 760, y: 655, h: 120 },
  { name: "fire2", at: 35.18, x: 1430, y: 640, h: 90 },
  { name: "fire3", at: 35.31, x: 1080, y: 650, h: 150 },
  { name: "fire4", at: 35.76, x: 470, y: 660, h: 110 },
  { name: "fire5", at: 36.33, x: 1290, y: 625, h: 170 }
];
const MEN = [
  { name: "man1", at: 26.6, x: 2072, y: 1062, pose: "stand", arms: "up" },
  { name: "man2", at: 28.3, x: 1960, y: 1150, pose: "A", arms: "spear" },
  { name: "man3", at: 29.8, x: 1790, y: 1150, pose: "run", arms: "swing" },
  { name: "man4", at: 31.2, x: 1610, y: 1146, pose: "B", arms: "spear" },
  { name: "man5", at: 32.5, x: 1440, y: 1132, pose: "run", arms: "swing" }
];

export const config = {
  panel: { w: W, h: H },
  res: 2,
  background: "sky",
  camera: {
    keys: [
      [14.44, 1600, 640, 3000],
      [16.6, 1620, 660, 2900],
      [21.6, 1810, 770, 2200],
      [24.36, 2000, 900, 1300],
      [26.6, 1980, 940, 1250],
      [30.0, 1760, 960, 1400],
      [33.0, 1460, 880, 1650],
      [36.3, 1250, 700, 2650],
      [37.6, 1240, 680, 2900]
    ],
    tilt: [[14.44, 3], [24, 8], [33, 5], [37, 2]],
    yaw: [[14.44, 0], [24, -3], [33, 2], [37, 0]],
    aperture: 0.03
  },
  light: {
    key: { az: 152, el: 30, color: [0.58, 0.68, 1.0], power: [[14.4, 1.25], [21.5, 1.25], [21.7, 1.7], [22.8, 1.35]] },
    fill: { az: -20, el: 30, color: [0.35, 0.4, 0.6], power: 0.18 },
    sky: [0.03, 0.04, 0.08], ground: [0.012, 0.01, 0.012],
    exposure: [[14.4, 1.05], [33, 1.05], [36.5, 0.75]],
    grout: "#4d4c52",
    wet: [0.4, 1.2],
    points: [
      { x: 1305, y: 610, z: 80, color: "#ff9a40", power: [[21.5, 0.0], [21.65, 0.05], [22.4, 0.025]], flicker: 0.3, on: [21.6, null, 0.15] },
      { x: 780, y: 600, z: 160, color: "#ff8a30", power: 0.22, flicker: 0.35, on: [34.88, null, 0.6] },
      { x: 1180, y: 590, z: 200, color: "#ff9a40", power: 0.3, flicker: 0.35, on: [35.31, null, 0.6] },
      { x: 1300, y: 860, z: 150, color: "#ffa850", power: 0.16, flicker: 0.3, on: [33.6, null, 0.4] },
      { x: [[24.3, 2065], [29.5, 2000], [33.5, 1500]], y: [[24.3, 960], [29.5, 1100], [33.5, 1050]], z: 120, color: "#ffa040", power: [[24.3, 0.0], [24.6, 0.12], [26, 0.16], [33.4, 0.16], [34.5, 0.0]], flicker: 0.35 }
    ]
  },
  flicker: 0.35,
  rims: [
    { figures: ["horse", "mane"], light: MOON, warm: "horsehi", width: 5.5, min: 0.35 },
    { figures: ["wall", "tower"], light: MOON, warm: "walltop", width: 5, min: 0.5 },
    { figures: ["man"], light: MOON, warm: "manrim", width: 2.4, min: 0.3 }
  ],
  sinopia: { groups: [["sky", "halo", "star"], ["ground", "road", "hill"], ["wall", "tower", "walltop", "city"]] }
};

export function regions() {
  return [
    { name: "sky", size: 15, mode: "sky", mat: "glass", tray: ["#04060f", "#070b1a", "#0b1229", "#101a3a", "#16224a"] },
    { name: "halo", size: 9, mode: "radial", center: MOON, mat: "glass", tray: ["#1a2650", "#24335f", "#2f4172", "#3e5287", "#52689c"] },
    { name: "moon", size: 6.5, mode: "radial", center: MOON, mat: ["marble", "marble", "silver", "silver"], tray: ["#a8b4c4", "#c9d3df", "#e2e8ef", "#f4f7fa"] },
    { name: "star", size: 5, mode: "contour", mat: "silver", tray: ["#b8c4d4", "#e6ecf3"] },
    { name: "city", size: 9, mode: "contour", mat: "basalt", tray: ["#0d1018", "#141924", "#1b2230", "#242c3c"] },
    { name: "wall", size: 10, mode: "ground", mat: "limestone", tray: ["#1c2029", "#262b36", "#313744", "#3d4453", "#4b5363"] },
    { name: "tower", size: 9, mode: "ground", mat: "limestone", tray: ["#1e222c", "#292e39", "#343a47", "#414858"] },
    { name: "walltop", size: 4.5, mode: "contour", thin: true, mat: "limestone", tray: ["#5b6576", "#727d8f", "#8b96a8", "#a7b1c1"] },
    { name: "gate", size: 6, mode: "contour", mat: "basalt", tray: ["#030304", "#07080a"] },
    { name: "hill", size: 12, mode: "ground", mat: "basalt", tray: ["#0a0a0e", "#111016", "#18161e"] },
    { name: "ground", size: 13, mode: "ground", mat: "basalt", tray: ["#060608", "#0b0a0e", "#110f14", "#18151b", "#201b22"] },
    { name: "road", size: 11, mode: "contour", mat: "limestone", tray: ["#1d191c", "#262024", "#30282c"] },
    { name: "horse", size: 6, mode: "contour", mat: "glass", tray: ["#1a1109", "#28190c", "#3a2511", "#4e3117", "#643f1d", "#7c5026"] },
    { name: "mane", size: 4.5, mode: "contour", mat: "glass", tray: ["#100a05", "#1a1008", "#26180c"] },
    { name: "horseline", size: 3.2, mode: "contour", thin: true, mat: "basalt", tray: ["#0c0805", "#140d07"] },
    { name: "horsehi", size: 4, mode: "contour", thin: true, mat: ["glass", "glass", "silver", "silver"], tray: ["#6e6050", "#8e8070", "#b2a896", "#d6d0c4"] },
    { name: "platform", size: 6, mode: "contour", mat: "glass", tray: ["#140d07", "#20150b", "#2c1d10"] },
    { name: "wheel", size: 5, mode: "radial", center: [1900, 1212], mat: "glass", tray: ["#0e0905", "#1a1109", "#26190d"] },
    { name: "dark", size: 4, mode: "contour", mat: "basalt", tray: ["#020203", "#060607"] },
    { name: "rope", size: 3, mode: "contour", thin: true, mat: "glass", tray: ["#3a2a1a", "#4e3a24", "#62492e"] },
    { name: "man", size: 3.2, mode: "contour", mat: "basalt", tray: ["#030304", "#070709"] },
    { name: "manrim", size: 2.6, mode: "contour", thin: true, mat: "silver", tray: ["#4a5468", "#6a7488", "#8c96a8"] },
    { name: "tip", size: 2.6, mode: "contour", thin: true, mat: "silver", tray: ["#9aa6b6", "#d0d8e2"] },
    { name: "fire", size: 5, mode: "contour", mat: "emit", emit: [6.5, 4.8, 3.4, 2.2], tray: ["#ffe2a0", "#ffbe5a", "#ff8f30", "#e45a1e"] },
    { name: "smoke", size: 9, mode: "contour", mat: "marble", tray: ["#16151c", "#211f28", "#2d2a34"] },
    { name: "torch", size: 3.5, mode: "contour", mat: "emit", emit: [6, 4], tray: ["#ffe2a0", "#ffa040"] },
    { name: "hatchglow", size: 4, mode: "contour", mat: "emit", emit: [3.2, 2.2], tray: ["#ffb050", "#e07028"] }
  ];
}

function rect(x0, y0, x1, y1) {
  return poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
}

export function draw(g, mode, D) {
  // Night sky, darker overhead.
  D.fill(rect(0, 0, W, H), "sky", D.linear(0, 0, 0, 760, [[0, "#04060f"], [0.55, "#0b1229"], [1, "#16224a"]]));
  // Stars, kept clear of the moon's halo.
  const R = rng(41);
  for (let i = 0; i < 70; i++) {
    const x = R() * W;
    const y = R() * 520;
    if (Math.hypot(x - MOON[0], y - MOON[1]) < 260) continue;
    D.fill(circle(x, y, 2.6 + R() * 2.4), "star", R() > 0.5 ? "#e6ecf3" : "#b8c4d4");
  }
  D.fill(circle(MOON[0], MOON[1], 205), "halo", D.radial(MOON[0], MOON[1], MOON_R, 205, [[0, "#52689c"], [0.45, "#2f4172"], [1, "#1a2650"]]));
  D.fill(circle(MOON[0], MOON[1], MOON_R), "moon", D.radial(MOON[0] - 20, MOON[1] - 20, 5, MOON_R, [[0, "#f4f7fa"], [0.7, "#d8e0e8"], [1, "#a8b4c4"]]));

  // The city behind the walls: roofs, a temple, a citadel.
  D.fill(poly([[150, 700], [150, 640], [260, 600], [380, 640], [420, 590], [560, 560], [640, 600], [700, 590], [820, 610],
    [880, 545], [960, 510], [1060, 470], [1160, 510], [1240, 545], [1300, 590], [1420, 570], [1520, 600], [1600, 585], [1700, 620], [1760, 700]]), "city");
  // Temple pediment and columns on the citadel.
  D.fill(poly([[950, 520], [1060, 455], [1170, 520]]), "tower");
  for (let i = 0; i < 6; i++) D.fill(rect(965 + i * 36, 524, 979 + i * 36, 600), "tower");

  // The walls, crenellated, with towers and the gate.
  D.fill(poly([[100, 940], [100, 650], [1790, 650], [1790, 940]]), "wall", D.linear(0, 650, 0, 940, [[0, "#3d4453"], [1, "#1c2029"]]));
  for (let x = 100; x < 1790; x += 46) D.fill(rect(x, 626, x + 26, 652), "wall", "#3d4453");
  const towers = [[230, 350], [700, 820], [1190, 1260], [1350, 1420], [1640, 1760]];
  for (const [x0, x1] of towers) {
    D.fill(rect(x0, 540, x1, 940), "tower", D.linear(0, 540, 0, 940, [[0, "#414858"], [1, "#1e222c"]]));
    for (let x = x0; x < x1 - 8; x += 34) D.fill(rect(x, 518, x + 20, 542), "tower", "#414858");
  }
  // The gate between its towers, and a sentry's torch above it.
  D.fill(poly([[1262, 940], [1262, 790], [1272, 768], [1305, 754], [1338, 768], [1348, 790], [1348, 940]]), "gate");
  D.fill(stroke([[1305, 650], [1305, 616]], 7, 6), "platform");
  D.fill(flame(1305, 618, 30, 15, 0.08), "torch", "#ffc060");

  // The rise under the walls and the plain before them.
  D.fill(poly([[0, 1340], [0, 930], [400, 905], [900, 920], [1305, 915], [1800, 925], [2400, 960], [3200, 990], [3200, 1340]]), "ground",
    D.linear(0, 900, 0, 1340, [[0, "#18151b"], [1, "#060608"]]));
  D.fill(poly([[1262, 935], [1348, 935], [1500, 1040], [1760, 1150], [2050, 1215], [2400, 1300], [2400, 1340], [1900, 1340], [1600, 1200], [1400, 1060]]), "road",
    D.linear(1300, 935, 1900, 1340, [[0, "#30282c"], [1, "#1d191c"]]));

  // The wooden horse on its wheeled platform, facing the gate: a great wooden idol,
  // its head held high, its body boxed in planks.
  D.fill(rect(1600, 1150, 2440, 1190), "platform");
  for (const wx of [1680, 1890, 2160, 2380]) {
    D.fill(circle(wx, 1214, 46), "wheel");
    D.fill(circle(wx, 1214, 10), "horseline");
  }
  // Legs: thick posts, the far pair a shade darker.
  for (const [x0, x1, col] of [[1792, 1842, "#3a2511"], [2208, 2258, "#3a2511"], [1742, 1796, "#5a3a1b"], [2278, 2334, "#5a3a1b"]]) {
    D.fill(poly([[x0, 860], [x1, 860], [x1 - 4, 1152], [x0 + 4, 1152]]), "horse", col);
  }
  // The tail.
  D.fill(stroke([[2392, 760], [2440, 830], [2462, 930], [2446, 1010]], 30, 14), "mane", "#1a1008");
  // Barrel body, deep and long.
  const body = blob([[1700, 760], [1760, 690], [1900, 655], [2100, 650], [2300, 668], [2400, 720], [2428, 800], [2400, 880], [2280, 922], [2050, 932], [1820, 920], [1710, 860]]);
  D.fill(body, "horse", D.linear(1900, 650, 1900, 932, [[0, "#7c5026"], [0.45, "#4e3117"], [1, "#28190c"]]));
  // The neck rising tall and thick, and the head carried high.
  const neck = poly([[1700, 790], [1660, 640], [1640, 520], [1636, 420], [1650, 350], [1716, 330], [1768, 360], [1790, 440], [1810, 560], [1850, 680], [1880, 720]]);
  D.fill(neck, "horse", D.linear(1640, 360, 1860, 760, [[0, "#6a4420"], [1, "#3a2511"]]));
  const head = blob([[1652, 312], [1706, 280], [1756, 300], [1770, 352], [1726, 392], [1630, 448], [1560, 470], [1520, 452], [1532, 412], [1590, 370]]);
  D.fill(head, "horse", D.linear(1520, 300, 1770, 470, [[0, "#8a5a2c"], [1, "#4e3117"]]));
  D.fill(poly([[1690, 296], [1702, 226], [1726, 300]]), "horse", "#5a3a1b");
  D.fill(poly([[1724, 304], [1746, 236], [1760, 316]]), "horse", "#4e3117");
  D.fill(poly([[1700, 300], [1770, 330], [1800, 440], [1828, 560], [1868, 680], [1896, 712], [1912, 700], [1878, 620], [1846, 500], [1820, 380], [1786, 316]]), "mane");
  // Plank courses and their pegs, following the body and the neck.
  g.save();
  g.clip(body);
  for (const y of [712, 760, 808, 856, 904]) D.fill(stroke([[1680, y + 8], [2060, y - 6], [2440, y + 10]], 5, 5), "horseline");
  for (const [x, y0, y1] of [[1860, 660, 760], [2060, 712, 808], [2250, 760, 856], [1960, 808, 904], [2160, 656, 712], [2330, 690, 760], [1790, 760, 856], [2120, 856, 932]]) {
    D.fill(stroke([[x, y0], [x + 4, y1]], 4.5, 4.5), "horseline");
  }
  g.restore();
  g.save();
  g.clip(neck);
  for (const k of [0, 1, 2, 3, 4]) {
    const y = 760 - k * 92;
    D.fill(stroke([[1600, y + 50], [1900, y - 30]], 4.5, 4.5), "horseline");
  }
  g.restore();
  D.fill(circle(1690, 336, 10), "dark");
  // The closed hatch, a seam under the belly.
  D.fill(stroke([[2012, 930], [2118, 930]], 4.5, 4.5), "horseline");
}

function rectP(x0, y0, x1, y1) {
  return poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
}

const manReg = { body: "man", far: "man", skirt: "man", cloak: "man", helmet: "man", crest: "man", cap: "man", beard: "man", skin: "man", shield: "man", rim: "man", spear: "man", tip: "tip", dark: "man" };

export const arrivals = [
  {
    name: "hatch", at: 24.36, dur: 1.0, drop: 0.7,
    draw(g, mode, D) {
      D.fill(rectP(2015, 922, 2115, 940), "hatchglow");
      D.fill(poly([[2014, 936], [2030, 936], [1992, 1042], [1976, 1036]]), "platform");
      D.fill(stroke([[2092, 938], [2088, 1040], [2080, 1150]], 7, 6), "rope");
    }
  },
  ...MEN.map((m) => ({
    name: m.name, at: m.at, dur: 0.35, from: [0, -1],
    draw(g, mode, D) {
      const h = 160;
      for (const [reg, path] of walker({ x: m.x, y: m.y, h, face: -1, pose: m.pose, arms: "up", head: "helmet", reg: manReg })) D.fill(path, reg);
      // The torch: the raised hand of walker's "up" pose is at about (sh + 0.12, sh + 0.25).
      const hx = m.x - (0.06 + 0.12) * h;
      const hy = m.y - (0.81 + 0.25) * h;
      D.fill(stroke([[hx, hy + 14], [hx - 4, hy - 26]], 6, 5), "platform");
      D.fill(flame(hx - 4, hy - 24, 44, 22, -0.1), "torch", "#ffc060");
    }
  })),
  {
    name: "gateopen", at: 33.6, dur: 0.5, drop: 0.5,
    draw(g, mode, D) {
      D.fill(poly([[1270, 936], [1270, 794], [1278, 774], [1305, 762], [1332, 774], [1340, 794], [1340, 936]]), "fire",
        D.linear(1305, 762, 1305, 936, [[0, "#ffbe5a"], [1, "#e45a1e"]]));
    }
  },
  ...FIRES.map((f) => ({
    name: f.name, at: f.at, dur: 0.22, drop: 0.6,
    draw(g, mode, D) {
      D.fill(blob([[f.x - f.h * 0.5, f.y - f.h * 0.8], [f.x - f.h * 0.2, f.y - f.h * 1.9], [f.x + f.h * 0.35, f.y - f.h * 2.6], [f.x + f.h * 0.75, f.y - f.h * 2.2], [f.x + f.h * 0.45, f.y - f.h * 1.2], [f.x + f.h * 0.3, f.y - f.h * 0.7]]), "smoke");
      D.fill(flame(f.x - f.h * 0.22, f.y, f.h * 0.75, f.h * 0.4, -0.05), "fire", "#e45a1e");
      D.fill(flame(f.x + f.h * 0.2, f.y, f.h * 0.85, f.h * 0.42, 0.06), "fire", "#ff8f30");
      D.fill(flame(f.x, f.y, f.h, f.h * 0.5, 0.02), "fire", "#ffbe5a");
      D.fill(flame(f.x, f.y, f.h * 0.5, f.h * 0.25, 0.0), "fire", "#ffe2a0");
    }
  }))
];

export const events = {
  ignite: [
    { regions: ["torch"], arrival: undefined, at: 21.62, jitter: 0.04 },
    { regions: ["hatchglow"], arrival: "hatch", at: 24.4, jitter: 0.3 },
    ...MEN.map((m) => ({ regions: ["torch"], arrival: m.name, at: m.at + 0.3, jitter: 0.05 })),
    { arrival: "gateopen", at: 33.65, jitter: 0.12 },
    ...FIRES.map((f) => ({ arrival: f.name, regions: ["fire"], at: f.at + 0.08, from: [f.x, f.y], speed: 900, jitter: 0.06 }))
  ]
};
