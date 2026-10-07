// Ithaca. In the dark after the wreck, the bare coat with the red sinopia of a woman at a
// loom. On the pure note at 103.25 a single flame stone catches: Penelope's lamp. The
// room is laid outward from the flame: the loom, Penelope at her weaving, the olive by
// the window. At 108.3 a man in a pilos cap stands in the doorway, and she turns.
import { blob, capsule, circle, ellipse, poly, stroke } from "../../engine/paint.js";
import { flame, walker } from "../../engine/figures.js";

const W = 3000;
const H = 1256;
export const LAMP = [1330, 610];
const DOOR = { x0: 2280, x1: 2560, y0: 360, y1: 1100 };

export const config = {
  panel: { w: W, h: H },
  res: 2,
  background: "dark",
  camera: {
    keys: [
      [99.0, LAMP[0], LAMP[1] + 40, 1400],
      [103.25, LAMP[0], LAMP[1], 700],
      [105.0, LAMP[0] + 60, LAMP[1] + 30, 1100],
      [108.0, 1700, 690, 2300],
      [110.3, 1720, 700, 2500]
    ],
    tilt: [[99, 30], [103.25, 26], [108, 6], [110.3, 3]],
    yaw: [[99, -8], [106, -2], [110.3, 0]],
    aperture: 0.03
  },
  light: {
    key: { az: 100, el: 30, color: [0.42, 0.46, 0.62], power: [[99, 0.0], [99.8, 0.7], [103.1, 0.7], [103.6, 0.15], [108, 0.45]] },
    fill: { az: -90, el: 30, color: [0.3, 0.25, 0.22], power: 0.06 },
    sky: [0.02, 0.016, 0.014], ground: [0.01, 0.008, 0.007],
    exposure: [[99, 1.4], [103.25, 1.3], [108, 1.2]],
    grout: "#3a2c20",
    wet: [0.4, 1.4],
    points: [
      { x: LAMP[0], y: LAMP[1] - 40, z: 80, color: "#ffb050", power: [[103.1, 0.0], [103.4, 0.06], [106, 0.4], [110, 0.45]], flicker: 0.12 }
    ]
  },
  flicker: 0.12,
  rims: [
    { figures: ["penelope", "veil"], light: LAMP, warm: "lamplit", width: 4.5, min: 0.25, reach: 1800 },
    { figures: ["loom*"], light: LAMP, warm: "lamplit", width: 3, min: 0.3, reach: 1500 }
  ],
  build: {
    origin: LAMP,
    start: 103.3,
    speeds: { "lamp*": 3, "flame": 3, penelope: 2.5, veil: 2.5, "loom*": 2, "cloth*": 2 },
    stages: [{ reach: 60, end: 104.0, rise: 0.5, ease: 0.1 }, { end: 108.2, rise: 0.12, ease: 0.3 }]
  },
  sinopia: { groups: [["dark", "wall*", "floor*"], ["loom*", "cloth*"], ["penelope", "veil", "lamplit"], ["window*", "olive*"], ["night*", "door*"], ["lamp*", "flame"]] }
};

export function regions() {
  return [
    { name: "dark", size: 14, mode: "contour", mat: "basalt", tray: ["#060403", "#0a0705", "#100a07"] },
    { name: "wall", size: 13, mode: "ground", mat: "terracotta", tray: ["#140c08", "#1e130c", "#2a1a0e", "#3a2414", "#4a2e16"] },
    { name: "floor", size: 13, mode: "ground", mat: "terracotta", tray: ["#0c0806", "#140d08", "#1e130c", "#2a1a10"] },
    { name: "window", size: 9, mode: "sky", mat: "glass", tray: ["#0a1224", "#101a32", "#18243e"] },
    { name: "olive", size: 4.4, mode: "contour", mat: ["glass", "glass", "silver"], tray: ["#1e2418", "#2e3622", "#5e6b46"] },
    { name: "loom", size: 4, mode: "contour", thin: true, mat: "glass", tray: ["#24160c", "#342012", "#46301a"] },
    { name: "cloth", size: 4.6, mode: "flow", angle: Math.PI / 2, mat: "glass", tray: ["#3e1a18", "#5a2420", "#7a3228", "#9a4a30"] },
    { name: "clothband", size: 3.2, mode: "contour", thin: true, mat: "gold", tray: ["#8a6a2e", "#b38d42", "#d9b25e"] },
    { name: "penelope", size: 4.6, mode: "flow", angle: Math.PI / 2, mat: "glass", tray: ["#0c1222", "#121a32", "#1a2848", "#24365e"] },
    { name: "veil", size: 4, mode: "flow", angle: Math.PI / 2, mat: "marble", tray: ["#8a8270", "#aca48e", "#d6cdb4", "#ece6d4"] },
    { name: "lamplit", size: 3, mode: "contour", thin: true, mat: ["glass", "gold", "gold"], tray: ["#b06a2e", "#e09444", "#ffc070"] },
    { name: "night", size: 8, mode: "sky", mat: "glass", tray: ["#0e1830", "#16244a", "#1e3058", "#2a4070"] },
    { name: "nightstar", size: 3.4, mode: "contour", mat: "silver", tray: ["#cfd8e2", "#eef2f6"] },
    { name: "doorframe", size: 5, mode: "contour", thin: true, mat: "terracotta", tray: ["#3a2414", "#4e321c"] },
    { name: "lamp", size: 3.4, mode: "contour", mat: "terracotta", tray: ["#5a3a1e", "#7a5028", "#9a6834"] },
    { name: "flame", size: 2.8, mode: "contour", mat: "emit", emit: [8, 6, 4.5], tray: ["#fff1cc", "#ffd27a", "#ffb050"] },
    { name: "him", size: 4, mode: "contour", mat: "basalt", tray: ["#0e0a08", "#16100c"] },
    { name: "himcap", size: 3.4, mode: "contour", mat: "terracotta", tray: ["#5a3a1e", "#7a5028"] },
    { name: "himrim", size: 2.8, mode: "contour", thin: true, mat: "gold", tray: ["#b06a2e", "#e09444"] }
  ];
}

export function draw(g, mode, D) {
  D.fill(poly([[0, 0], [W, 0], [W, H], [0, H]]), "dark");
  D.fill(poly([[140, 120], [2860, 120], [2860, 1000], [140, 1000]]), "wall", D.radial(LAMP[0], LAMP[1], 50, 1800, [[0, "#4a2e16"], [0.4, "#2a1a0e"], [1, "#140c08"]]));
  D.fill(poly([[140, 1000], [2860, 1000], [2860, 1256], [140, 1256]]), "floor", D.radial(LAMP[0], 1050, 50, 1600, [[0, "#2a1a10"], [1, "#0c0806"]]));
  // A window with the night and an olive branch.
  D.fill(poly([[300, 300], [620, 300], [620, 680], [300, 680]]), "window");
  for (const [cx, cy, a] of [[380, 620, -0.6], [450, 560, 0.5], [520, 610, -0.3], [560, 520, 0.7], [470, 470, -0.5], [400, 520, 0.4]]) D.fill(ellipse(cx, cy, 40, 12, a), "olive");
  D.fill(stroke([[330, 680], [430, 560], [600, 450]], 8, 5), "olive");
  // The loom: two uprights, a beam, the web half woven with its gold band.
  D.fill(stroke([[740, 1000], [760, 260]], 22, 20), "loom");
  D.fill(stroke([[1180, 1000], [1160, 260]], 22, 20), "loom");
  D.fill(stroke([[720, 280], [1200, 280]], 20, 20), "loom");
  D.fill(poly([[770, 300], [1150, 300], [1146, 720], [774, 720]]), "cloth", D.linear(770, 300, 770, 720, [[0, "#9a4a30"], [1, "#3e1a18"]]));
  for (const y of [400, 520, 640]) D.fill(stroke([[774, y], [1148, y]], 12, 12), "clothband");
  for (let x = 790; x < 1140; x += 40) D.fill(stroke([[x, 720], [x, 960]], 3, 3), "loom");
  // Penelope at the loom, seated, her back to the door.
  D.fill(blob([[1260, 1000], [1240, 860], [1250, 720], [1290, 600], [1340, 530], [1380, 520], [1420, 560], [1440, 680], [1470, 820], [1500, 1000]]), "penelope",
    D.linear(1260, 520, 1500, 1000, [[0, "#24365e"], [1, "#0c1222"]]));
  D.fill(blob([[1310, 470], [1360, 430], [1410, 450], [1430, 520], [1450, 640], [1400, 600], [1350, 560], [1300, 540]]), "veil");
  D.fill(stroke([[1300, 640], [1220, 600], [1170, 560]], 22, 16), "penelope");
  // The lamp on its stand beside her.
  D.fill(stroke([[LAMP[0] - 120, 1000], [LAMP[0] - 120, 680]], 12, 10), "lamp");
  D.fill(blob([[LAMP[0] - 170, 690], [LAMP[0] - 70, 690], [LAMP[0] - 50, 660], [LAMP[0] - 190, 660]]), "lamp");
  D.fill(flame(LAMP[0], LAMP[1] + 10, 70, 34, 0.04), "flame", "#ffd27a");
  // The doorway, black, with its frame.
  // The doorway opens on the night: blue sky, a star.
  D.fill(poly([[DOOR.x0, DOOR.y1], [DOOR.x0, DOOR.y0], [DOOR.x1, DOOR.y0], [DOOR.x1, DOOR.y1]]), "night", D.linear(0, DOOR.y0, 0, DOOR.y1, [[0, "#0e1830"], [0.7, "#1e3058"], [1, "#2a4070"]]));
  D.fill(circle(DOOR.x0 + 70, DOOR.y0 + 90, 7), "nightstar");
  D.fill(stroke([[DOOR.x0 - 16, DOOR.y1], [DOOR.x0 - 16, DOOR.y0 - 16], [DOOR.x1 + 16, DOOR.y0 - 16], [DOOR.x1 + 16, DOOR.y1]], 22, 22), "doorframe");
}

const himReg = { body: "him", far: "him", skirt: "him", cloak: "him", helmet: "him", crest: "him", cap: "himcap", beard: "him", skin: "him", shield: "him", rim: "him", spear: "him", tip: "him", dark: "him" };

export const arrivals = [
  {
    name: "him", at: 108.32, dur: 0.3, from: [0, -1],
    rims: [{ figures: ["him", "himcap"], light: LAMP, warm: "himrim", width: 3.5, min: 0.2, reach: 2000 }],
    draw(g, mode, D) {
      for (const [reg, path] of walker({ x: (DOOR.x0 + DOOR.x1) / 2 - 20, y: DOOR.y1, h: 640, face: -1, pose: "stand", arms: "swing", head: "pilos", cloak: true, lean: 0.02, reg: himReg })) D.fill(path, reg);
    }
  },
  {
    // She turns: her veiled head toward the door.
    name: "turn", at: 108.6, dur: 0.35, drop: 0.5,
    draw(g, mode, D) {
      D.fill(blob([[1330, 470], [1380, 432], [1440, 448], [1462, 510], [1470, 620], [1420, 590], [1370, 560], [1330, 540]]), "veil");
    }
  }
];

export const events = {
  ignite: [{ regions: ["flame"], at: 103.25, jitter: 0.02 }]
};
