// The land of the dead. Grey ash, a pit of blood, and Odysseus kneeling at it, his sword
// drawn. The shades come up out of the dark in silver and grey marble, and his mother
// stands before him. Three times he reaches for her, and three times she breaks into
// stones and drifts away like smoke, until she is gone.
import { blob, circle, ellipse, poly, stroke } from "../../engine/paint.js";
import { walker } from "../../engine/figures.js";
import { rng } from "../../engine/util.js";

const W = 3000;
const H = 1256;
const PIT = [1380, 1050];
const MOTHER = { x: 1720, y: 1060, h: 590 };
const HERO = { x: 1180, y: 1070, h: 470 };

export const config = {
  panel: { w: W, h: H },
  res: 2,
  background: "ash",
  camera: {
    keys: [
      [71.99, 1500, 520, 700],
      [73.5, 1500, 600, 1400],
      [76.0, 1500, 700, 2600],
      [79.0, 1480, 760, 2000],
      [82.0, 1500, 780, 1700],
      [84.2, 1500, 760, 1900]
    ],
    tilt: [[72, 8], [76, 3], [84, 5]],
    yaw: [[72, -4], [78, 0], [84, 2]],
    aperture: 0.03
  },
  light: {
    key: { az: 90, el: 50, color: [0.7, 0.76, 0.86], power: [[71.99, 0.8], [76, 1.5], [84, 1.5]] },
    fill: { az: -90, el: 30, color: [0.4, 0.42, 0.5], power: 0.25 },
    sky: [0.06, 0.065, 0.075], ground: [0.02, 0.02, 0.022],
    exposure: [[71.99, 0.9], [76, 1.0]],
    grout: "#3a3a40",
    wet: [0.5, 1.4],
    points: [
      { x: PIT[0], y: PIT[1] - 40, z: 90, color: "#c03020", power: 0.06, flicker: 0.15 }
    ]
  },
  rims: [
    { figures: ["hero", "herocap"], dir: [1, -0.5], warm: "herorim", width: 3.5, min: 0.35 },
    { figures: ["shade*", "mother"], dir: [0, -1], warm: "shadelit", width: 4, min: 0.3 }
  ],
  sinopia: { groups: [["ash*", "mist*"], ["pit*", "blood"], ["hero*"], ["mother*", "shade*"]] }
};

export function regions() {
  return [
    { name: "ash", size: 14, mode: "ground", mat: "basalt", tray: ["#08080a", "#0c0c0e", "#121216", "#18181c", "#202026", "#2a2a30"] },
    { name: "mist", size: 12, mode: "sky", mat: "marble", tray: ["#1c1e24", "#24272e", "#2e3138", "#3a3e46"] },
    { name: "pit", size: 6, mode: "radial", center: PIT, mat: "basalt", tray: ["#050505", "#0a0808", "#120d0c"] },
    { name: "blood", size: 4.5, mode: "radial", center: PIT, mat: "glass", tray: ["#2a0606", "#3e0a0a", "#5a1210", "#6a1410"] },
    { name: "hero", size: 4.2, mode: "contour", mat: "basalt", tray: ["#050506", "#09090b", "#0e0e11"] },
    { name: "herocap", size: 3.6, mode: "contour", mat: "terracotta", tray: ["#2a1a10", "#3a2416"] },
    { name: "herorim", size: 2.8, mode: "contour", thin: true, mat: "silver", tray: ["#5a6474", "#7c8796", "#a6b1bf"] },
    { name: "sword", size: 2.6, mode: "contour", thin: true, mat: "silver", tray: ["#8a96a6", "#c0cad6", "#e6ecf3"] },
    { name: "mother", size: 5, mode: "flow", angle: Math.PI / 2, mat: ["marble", "marble", "marble", "silver"], tray: ["#7c8796", "#a6b1bf", "#cfd8e2", "#e6ecf3"] },
    { name: "motherveil", size: 4, mode: "flow", angle: Math.PI / 2, mat: "marble", tray: ["#b6c0cc", "#d4dce6", "#eef2f6"] },
    { name: "motherface", size: 3, mode: "contour", mat: "marble", tray: ["#8c96a4", "#a8b2be"] },
    { name: "shade", size: 6, mode: "flow", angle: Math.PI / 2, mat: "marble", tray: ["#2e333c", "#3e444e", "#4e5560", "#606874"] },
    { name: "shadefar", size: 7, mode: "flow", angle: Math.PI / 2, mat: "marble", tray: ["#1e2128", "#262a32", "#2e333c"] },
    { name: "shadelit", size: 3.6, mode: "contour", thin: true, mat: "silver", tray: ["#7c8796", "#a6b1bf", "#cfd8e2"] }
  ];
}

function shadeFig(x, y, h, lean) {
  // A standing shade: a column of drapery, narrowing at the shoulders to a hooded head.
  const l = lean || 0;
  return blob([[x - h * 0.13, y], [x - h * 0.16, y - h * 0.4], [x - h * 0.14 + l * h, y - h * 0.7], [x - h * 0.08 + l * h, y - h * 0.78],
    [x - h * 0.075 + l * h, y - h * 0.9], [x - h * 0.02 + l * h, y - h * 0.98], [x + h * 0.055 + l * h, y - h * 0.96], [x + h * 0.08 + l * h, y - h * 0.88],
    [x + h * 0.08 + l * h, y - h * 0.78], [x + h * 0.14 + l * h, y - h * 0.7], [x + h * 0.16, y - h * 0.38], [x + h * 0.14, y]]);
}

export function draw(g, mode, D) {
  D.fill(poly([[0, 0], [W, 0], [W, H], [0, H]]), "ash", D.linear(0, 0, 0, H, [[0, "#0c0c0e"], [0.55, "#18181c"], [1, "#2a2a30"]]));
  // Mist banks.
  const R = rng(3);
  for (let i = 0; i < 6; i++) {
    const y = 360 + i * 90;
    const pts = [];
    for (let k = 0; k <= 20; k++) pts.push([k * (W / 20), y + Math.sin(k * 0.9 + i) * 18 + (R() - 0.5) * 10]);
    for (let k = 20; k >= 0; k--) pts.push([k * (W / 20), y + 34 + Math.sin(k * 0.7 + i * 2) * 10]);
    D.fill(poly(pts), "mist", i % 2 ? "#24272e" : "#2e3138");
  }
  // The host of the dead in three rows, the far row small and dark in the mist, the
  // near row tall and pale; some lean, some hold out an arm.
  const S = rng(9);
  const rows = [
    { y: 600, h: 190, n: 18, reg: "shadefar", col: "#262a32" },
    { y: 700, h: 280, n: 13, reg: "shadefar", col: "#2e333c" },
    { y: 830, h: 400, n: 9, reg: "shade", col: "#4e5560" }
  ];
  for (const [ri, row] of rows.entries()) {
    for (let i = 0; i < row.n; i++) {
      const x = 80 + ((i + 0.3 + S() * 0.4) / row.n) * (W - 160);
      if (Math.abs(x - 1450) < (ri === 2 ? 560 : 300)) continue;
      const h = row.h * (0.82 + S() * 0.36);
      const lean = (S() - 0.5) * 0.08;
      D.fill(shadeFig(x, row.y, h, lean), row.reg, row.col);
      if (S() < 0.3) {
        const dir = x < 1450 ? 1 : -1;
        D.fill(stroke([[x + dir * h * 0.08, row.y - h * 0.66], [x + dir * h * 0.22, row.y - h * 0.62], [x + dir * h * 0.32, row.y - h * 0.66]], h * 0.04, h * 0.03), row.reg, row.col);
      }
    }
    if (ri < 2) {
      const my = row.y + 20;
      const pts = [];
      for (let k = 0; k <= 20; k++) pts.push([k * (W / 20), my + Math.sin(k * 0.9 + ri) * 14]);
      for (let k = 20; k >= 0; k--) pts.push([k * (W / 20), my + 44 + Math.sin(k * 0.7 + ri * 2) * 10]);
      D.fill(poly(pts), "mist", ri ? "#2e3138" : "#24272e");
    }
  }
  // The pit, and the blood in it.
  D.fill(ellipse(PIT[0], PIT[1], 230, 62, 0), "pit");
  D.fill(ellipse(PIT[0], PIT[1] + 4, 180, 44, 0), "blood", D.radial(PIT[0], PIT[1], 10, 180, [[0, "#6a1410"], [1, "#2a0606"]]));
  // His mother, standing over the pit, veiled.
  const m = MOTHER;
  D.fill(shadeFig(m.x, m.y, m.h, -0.02), "mother", D.linear(m.x, m.y - m.h, m.x, m.y, [[0, "#e6ecf3"], [0.5, "#a6b1bf"], [1, "#7c8796"]]));
  D.fill(blob([[m.x - m.h * 0.1, m.y - m.h * 0.98], [m.x + m.h * 0.04, m.y - m.h * 1.0], [m.x + m.h * 0.12, m.y - m.h * 0.86], [m.x + m.h * 0.15, m.y - m.h * 0.6],
    [m.x + m.h * 0.04, m.y - m.h * 0.66], [m.x - m.h * 0.08, m.y - m.h * 0.8]]), "motherveil");
  // Her face, turned to her son, and her hands held out to him.
  D.fill(blob([[m.x - m.h * 0.075, m.y - m.h * 0.92], [m.x - m.h * 0.02, m.y - m.h * 0.95], [m.x + m.h * 0.02, m.y - m.h * 0.88], [m.x - m.h * 0.02, m.y - m.h * 0.81], [m.x - m.h * 0.07, m.y - m.h * 0.84]]), "motherface");
  D.fill(stroke([[m.x - m.h * 0.08, m.y - m.h * 0.62], [m.x - m.h * 0.2, m.y - m.h * 0.58], [m.x - m.h * 0.3, m.y - m.h * 0.6]], m.h * 0.035, m.h * 0.025), "mother", "#cfd8e2");
  // Odysseus, kneeling at the pit, reaching for her; his sword laid across the edge.
  const heroReg = { body: "hero", far: "hero", skirt: "hero", cloak: "hero", helmet: "hero", crest: "hero", cap: "herocap", beard: "hero", skin: "hero", shield: "hero", rim: "hero", spear: "hero", tip: "hero", dark: "hero" };
  for (const [reg, path] of walker({ x: HERO.x, y: HERO.y, h: HERO.h, face: 1, pose: "kneel", arms: "reach", head: "pilos", cloak: true, lean: 0.1, reg: heroReg })) D.fill(path, reg);
  D.fill(stroke([[PIT[0] - 300, PIT[1] - 30], [PIT[0] - 60, PIT[1] - 60]], 9, 7), "sword");
}

export const events = {
  // Three times she breaks into stones and drifts up into the dark.
  dissolve: [
    { regions: ["mother", "motherveil", "motherface", "shadelit"], within: [MOTHER.x - 240, MOTHER.y - 640, MOTHER.x + 220, MOTHER.y + 10], times: [77.56, 79.64, 82.66], rise: MOTHER.y, speed: 0.12, dur: 2.2 }
  ]
};
