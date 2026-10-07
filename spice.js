// Spice at dawn: an orange sky, a plume of spice rising off the dunes, and a winged flyer.
import { capsule, circle, ellipse, stroke } from "./engine/paint.js";
import { W, H, box, camera, crest, dune, path, roll } from "./shared.js";

export const config = {
  panel: { w: W, h: H }, res: 1, background: "sky", camera,
  light: {
    key: { az: 160, el: 18, color: [1, 0.78, 0.55], power: 1.2 },
    fill: { az: 10, el: 40, color: [0.7, 0.55, 0.6], power: 0.3 },
    sky: [0.22, 0.13, 0.1], ground: [0.06, 0.035, 0.02], exposure: 0.5, grout: "#3a2418", wet: [0.18, 1.0]
  },
  sinopia: false
};

const far = roll(560, [[14, 800, 1.1], [7, 300, 0.2]]);
const mid = roll(640, [[30, 1000, 3.0], [12, 380, 2.0]]);
const near = roll(760, [[40, 1200, 0.6], [16, 460, 2.6]]);

export function regions() {
  return [
    { name: "sky", size: 14, mode: "sky", mat: "glass", tray: ["#3a1f2e", "#6a2c2e", "#a0442a", "#d06a34", "#e8954a", "#f2b866"] },
    { name: "sun", size: 7, mode: "radial", center: [380, 560], mat: "emit", emit: 0.9, tray: ["#f2c27a", "#f8daa0"] },
    { name: "plume", size: 10, mode: "contour", mat: "limestone", tray: ["#c05a30", "#d6743e", "#e08a50", "#f0b070"] },
    { name: "far", size: 13, mode: "contour", mat: "terracotta", tray: ["#8a4a30", "#9e5a38", "#b06a42"] },
    { name: "mid", size: 13, mode: "contour", mat: "limestone", tray: ["#b8723f", "#c8854a", "#d69a58"] },
    { name: "near", size: 14, mode: "contour", mat: "limestone", tray: ["#a8643a", "#c07a44", "#d49452", "#e2aa66"] },
    { name: "crest", size: 6, mode: "contour", mat: "limestone", tray: ["#efc890", "#f6d9a6"] },
    { name: "hull", size: 5, mode: "contour", mat: "basalt", tray: ["#1c1412", "#2c201a", "#3c2c22"] },
    { name: "canopy", size: 4, mode: "contour", mat: "glass", tray: ["#d89a5a", "#f0c080"] },
    { name: "wing", size: 5, mode: "flow", angle: 0, mat: "silver", tray: ["#8a7a70", "#b0a090", "#d0c0aa"] }
  ];
}

export function draw(g, mode, D) {
  D.fill(box(0, 0, W, H), "sky", D.linear(0, 0, 0, 640, [[0, "#3a1f2e"], [0.35, "#a0442a"], [0.7, "#e8954a"], [1, "#f2b866"]]));
  D.fill(circle(380, 560, 78), "sun", "#f8daa0");
  D.fill(dune(far), "far", "#9e5a38");
  // The plume billows up from the far dunes in lobes, leaning with the wind.
  for (const [x, y, r] of [[1120, 560, 95], [1180, 500, 90], [1150, 430, 80], [1215, 380, 85], [1190, 310, 70], [1260, 275, 62], [1240, 455, 70], [1080, 500, 60]]) {
    D.fill(circle(x, y, r), "plume", D.linear(0, 200, 0, 620, [[0, "#f0b070"], [0.6, "#e08a50"], [1, "#c05a30"]]));
  }
  D.fill(dune(mid), "mid", "#c8854a");
  D.line(crest(mid, -20, 900), 6, "crest", "#efc890");
  D.fill(dune(near), "near", D.linear(0, 700, 0, 900, [[0, "#e2aa66"], [1, "#a8643a"]]));
  D.line(crest(near), 7, "crest", "#f6d9a6");
  // The flyer: a long body with a bubble canopy and two pairs of long wings, raised like a
  // dragonfly's, the far pair behind the body.
  for (const [x, y, rx, a] of [[640, 322, 96, -0.5], [792, 318, 96, 0.48]]) D.fill(ellipse(x, y, rx, 26, a), "wing", "#8a7a70");
  for (const [x, y, rx, a] of [[624, 190, 112, 0.6], [796, 196, 108, -0.56]]) D.fill(ellipse(x, y, rx, 30, a), "wing", "#d0c0aa");
  D.fill(capsule(540, 268, 34, 880, 262, 16), "hull", "#2c201a");
  D.fill(stroke([[870, 262], [1000, 246]], 14, 6), "hull", "#3c2c22");
  D.fill(circle(552, 262, 32), "canopy", "#f0c080");
}
