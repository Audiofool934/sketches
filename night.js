// The deep desert at night: dunes under two moons, and a dark spur of rock.
import { circle, ring } from "./engine/paint.js";
import { W, H, box, camera, crest, dune, path, roll } from "./shared.js";

export const config = {
  panel: { w: W, h: H }, res: 1, background: "sky", camera,
  light: {
    key: { az: 40, el: 26, color: [0.78, 0.82, 1], power: 0.9 },
    fill: { az: -140, el: 35, color: [0.55, 0.5, 0.9], power: 0.3 },
    sky: [0.09, 0.09, 0.2], ground: [0.03, 0.025, 0.04], exposure: 0.55, grout: "#1c1a2b", wet: [0.18, 1.0]
  },
  sinopia: false
};

const far = roll(470, [[18, 900, 0.4], [9, 340, 1.9]]);
const mid = roll(565, [[34, 1100, 2.2], [14, 420, 0.3]]);
const near = roll(705, [[48, 1300, 4.1], [18, 520, 1.2]]);

export function regions() {
  return [
    { name: "sky", size: 14, mode: "sky", mat: "glass", tray: ["#0c1029", "#151b3f", "#232858", "#363572", "#4a4282"] },
    { name: "star", size: 4, mode: "contour", mat: "emit", emit: 1.0, tray: ["#cfd2e8", "#e8e6f2"] },
    { name: "halo", size: 10, mode: "radial", center: [1140, 215], mat: "glass", tray: ["#3d4378", "#555b8c", "#6d70a0"] },
    { name: "moon", size: 8, mode: "radial", center: [1140, 215], mat: "marble", tray: ["#b9b6cf", "#d3d0e2", "#e9e6f0"] },
    { name: "small", size: 6, mode: "radial", center: [1352, 118], mat: "silver", tray: ["#9fa3c0", "#c4c6dc"] },
    { name: "far", size: 13, mode: "contour", mat: "limestone", tray: ["#2c2a48", "#3a3656", "#4a4462"] },
    { name: "mid", size: 13, mode: "contour", mat: "limestone", tray: ["#4a4460", "#5d536c", "#706276"] },
    { name: "near", size: 14, mode: "contour", mat: "limestone", tray: ["#6a5a6c", "#806b74", "#957c7a", "#a88b80"] },
    { name: "crest", size: 6, mode: "contour", mat: "limestone", tray: ["#b8a59a", "#cdbcae"] },
    { name: "rock", size: 9, mode: "contour", mat: "basalt", tray: ["#14121f", "#1f1b2c", "#2c2638"] }
  ];
}

export function draw(g, mode, D) {
  D.fill(box(0, 0, W, H), "sky", D.linear(0, 0, 0, 560, [[0, "#0c1029"], [0.6, "#232858"], [1, "#4a4282"]]));
  for (let i = 0; i < 70; i++) {
    const x = (i * 337.7) % W, y = (i * 173.3) % 420;
    if (Math.hypot(x - 1140, y - 215) < 170 || Math.hypot(x - 1352, y - 118) < 70) continue;
    D.fill(circle(x, y, i % 5 ? 2.6 : 3.6), "star", "#e8e6f2");
  }
  D.fill(circle(1140, 215, 150), "halo", "#555b8c");
  D.fill(circle(1140, 215, 112), "moon", D.linear(1060, 120, 1220, 320, [[0, "#e9e6f0"], [1, "#b9b6cf"]]));
  D.fill(ring(1140, 215, 84, 92), "moon", "#d3d0e2");
  D.fill(circle(1352, 118, 44), "small", "#c4c6dc");
  D.fill(dune(far), "far", "#3a3656");
  D.fill(dune(mid), "mid", "#5d536c");
  D.line(crest(mid, 600, 1620), 6, "crest", "#b8a59a");
  // A spur of rock on the left, where the stonework is darkest.
  D.fill(path("M-20 640 L60 520 L130 470 L175 410 L240 395 L300 430 L350 505 L420 560 L470 640 L-20 700Z"), "rock", "#1f1b2c");
  D.fill(dune(near), "near", D.linear(0, 650, 0, 900, [[0, "#a88b80"], [1, "#6a5a6c"]]));
  D.line(crest(near), 7, "crest", "#cdbcae");
}
