// The city at dusk: a stepped pyramid and leaning slab towers against a low, swollen sun.
import { circle, poly } from "./engine/paint.js";
import { W, H, box, camera, crest, dune, roll } from "./shared.js";

export const config = {
  panel: { w: W, h: H }, res: 1, background: "sky", camera,
  light: {
    key: { az: 95, el: 14, color: [1, 0.72, 0.5], power: 1.1 },
    fill: { az: -60, el: 40, color: [0.55, 0.45, 0.7], power: 0.32 },
    sky: [0.2, 0.11, 0.12], ground: [0.05, 0.03, 0.03], exposure: 0.5, grout: "#2a1a1c", wet: [0.18, 1.0]
  },
  sinopia: false
};

const ground = roll(640, [[10, 900, 0.2], [5, 300, 1.4]]);
const near = roll(790, [[34, 1200, 2.4], [12, 420, 0.8]]);

export function regions() {
  return [
    { name: "sky", size: 14, mode: "sky", mat: "glass", tray: ["#24162e", "#43203a", "#6b2f3a", "#9c4636", "#c8683a", "#e8a050"] },
    { name: "sun", size: 7, mode: "radial", center: [800, 500], mat: "emit", emit: 0.85, tray: ["#e8904a", "#f2b064", "#f8cc86"] },
    { name: "moon", size: 5, mode: "radial", center: [1290, 150], mat: "silver", tray: ["#a8a0b8", "#c8c0d4"] },
    { name: "ground", size: 13, mode: "contour", mat: "terracotta", tray: ["#4a2a28", "#5a3430", "#6a3e36"] },
    { name: "wall", size: 8, mode: "contour", mat: "basalt", tray: ["#1a1218", "#24181e", "#2e2026"] },
    { name: "light", size: 4, mode: "contour", mat: "emit", emit: 0.8, tray: ["#f0b060", "#f8cc80"] },
    { name: "near", size: 14, mode: "contour", mat: "limestone", tray: ["#5a3a34", "#6e4a3e", "#84584a"] },
    { name: "crest", size: 6, mode: "contour", mat: "limestone", tray: ["#c08a64", "#d6a07a"] }
  ];
}

export function draw(g, mode, D) {
  D.fill(box(0, 0, W, H), "sky", D.linear(0, 0, 0, 650, [[0, "#24162e"], [0.4, "#6b2f3a"], [0.8, "#c8683a"], [1, "#e8a050"]]));
  D.fill(circle(800, 500, 250), "sun", D.linear(0, 250, 0, 750, [[0, "#f8cc86"], [1, "#e8904a"]]));
  D.fill(circle(1290, 150, 34), "moon", "#c8c0d4");
  D.fill(circle(1385, 96, 18), "moon", "#a8a0b8");
  D.fill(box(-20, ground(0), W + 40, H), "ground", "#5a3430");
  // The city: a great stepped pyramid in the middle, slab towers leaning in either side of it,
  // and low walls between, all one dark mass against the sun.
  D.fill(poly([[520, 662], [580, 600], [600, 600], [650, 540], [670, 540], [720, 470], [740, 470], [785, 400], [815, 400], [860, 470], [880, 470], [930, 540], [950, 540], [1000, 600], [1020, 600], [1080, 662]]), "wall", "#24181e");
  for (const [x0, x1, top, lean] of [[300, 400, 430, 30], [420, 480, 500, 14], [1120, 1180, 500, -14], [1200, 1300, 430, -30]]) D.fill(poly([[x0, 662], [x0 + lean, top], [x1 + lean, top], [x1, 662]]), "wall", "#2e2026");
  for (const [x, w, h] of [[60, 180, 60], [1360, 200, 70], [230, 70, 120], [1310, 60, 110]]) D.fill(box(x, 662 - h, w, h), "wall", "#1a1218");
  D.fill(box(-20, 640, W + 40, 30), "wall", "#1a1218");
  for (const [x, y] of [[794, 430], [690, 520], [898, 520], [620, 590], [968, 590], [340, 520], [360, 600], [1230, 520], [1250, 600], [440, 570], [1150, 570], [110, 630], [1420, 630], [255, 600]]) D.fill(box(x, y, 11, 15), "light", "#f8cc80");
  D.fill(dune(near), "near", D.linear(0, 740, 0, 900, [[0, "#84584a"], [1, "#5a3a34"]]));
  D.line(crest(near), 7, "crest", "#d6a07a");
}
