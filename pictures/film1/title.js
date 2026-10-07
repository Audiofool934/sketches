// The title. The homecoming lifts and flows into one word in gold on lapis: ΟΔΥΣΣΕΙΑ.
// The light rakes across it, and at the end dies away.
import { centred } from "../../engine/type.js";
import { poly } from "../../engine/paint.js";

const W = 3000;
const H = 1256;
const CAP = 285;
const SW = 0.15;
const LAYOUT = centred(["ΟΔΥΣΣΕΙΑ"], W / 2, H / 2 - CAP / 2, CAP, SW, 1);

export const config = {
  panel: { w: W, h: H },
  res: 2,
  background: "ground",
  camera: {
    keys: [
      [110.26, 1500, 628, 2880],
      [113.56, 1500, 628, 2780]
    ],
    tilt: [[110.26, 4], [113.56, 2]],
    yaw: [[110.26, -2], [113.56, 1]],
    aperture: 0.03
  },
  light: {
    key: { az: [[110.26, 170], [113.56, 115]], el: [[110.26, 14], [113.56, 26]], color: [0.85, 0.85, 1.0], power: [[110.26, 1.8], [112.9, 2.2], [113.5, 0.3]] },
    fill: { az: -30, el: 30, color: [0.4, 0.45, 0.7], power: 0.12 },
    sky: [0.03, 0.04, 0.08], ground: [0.01, 0.01, 0.015],
    exposure: 0.95,
    grout: "#3a3c48",
    wet: [0.4, 1.2]
  },
  sinopia: { groups: [["ground"], ["gold", "outline"]] }
};

export function regions() {
  return [
    { name: "ground", size: 10, mode: "contour", mat: "glass", tray: ["#060c1e", "#0b1530", "#101c3e", "#14224a", "#1c2c5c"] },
    { name: "outline", size: 4.4, mode: "contour", thin: true, type: true, mat: "basalt", tray: ["#020203", "#060608"] },
    { name: "gold", size: 5.5, mode: "contour", type: true, mat: "gold", tray: ["#8a6a2e", "#b38d42", "#d9b25e", "#efd38d"] }
  ];
}

export function draw(g, mode, D) {
  D.fill(poly([[0, 0], [W, 0], [W, H], [0, H]]), "ground", "#101c3e");
  for (const L of LAYOUT) D.line(L.path, CAP * SW + 16, "outline", "#040405", "butt", "miter");
  for (const L of LAYOUT) D.line(L.path, CAP * SW, "gold", D.linear(L.x, L.y, L.x + L.w * 0.2, L.y + CAP, [[0, "#efd38d"], [0.5, "#d0a650"], [1, "#9a7634"]]), "butt", "miter");
}
