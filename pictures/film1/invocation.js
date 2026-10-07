// The invocation. The first line of the Odyssey, laid in gold on a lapis ground whose
// courses bend around every letter: ΑΝΔΡΑ ΜΟΙ ΕΝΝΕΠΕ ΜΟΥΣΑ ΠΟΛΥΤΡΟΠΟΝ, "tell me, Muse,
// of the man of many turns". In silence a candle slides across the bare wall and the
// first word is laid; when the drone enters, the rest follows and the camera pulls back.
import { centred, letterCentres } from "../../engine/type.js";
import { poly } from "../../engine/paint.js";

const W = 3000;
const H = 1255;
const CAP = 104;
const SW = 0.17;
const LINES = ["ΑΝΔΡΑ ΜΟΙ ΕΝΝΕΠΕ ΜΟΥΣΑ", "ΠΟΛΥΤΡΟΠΟΝ"];
const TOP = 452;
const LEAD = 1.95;
const LAYOUT = centred(LINES, W / 2, TOP, CAP, SW, LEAD);
const LETTERS = letterCentres(LINES[0], LAYOUT[0].x, LAYOUT[0].y, CAP, SW);
const A0 = LETTERS[0];
// The first stone: the middle of the Α's crossbar.
const A_BAR = [LAYOUT[0].x + (SW * CAP) / 2 + 0.42 * CAP, TOP + 0.64 * CAP];
const WORD_END = LETTERS[4];

export const config = {
  panel: { w: W, h: H },
  res: 2,
  background: "ground",
  camera: {
    keys: [
      [0, A0[0] - 30, A0[1] + 18, 300],
      [2.2, A0[0] + 90, A0[1] + 12, 360],
      [6.55, WORD_END[0] - 40, A0[1] + 10, 640],
      [9.6, 1250, 560, 1500],
      [12.4, 1500, 600, 2350],
      [16.6, 1500, 606, 2500]
    ],
    tilt: [[0, 46], [2.2, 40], [6.55, 26], [10, 9], [13, 2.5]],
    yaw: [[0, -14], [6.55, -6], [12, 0]],
    aperture: 0.028,
    drift: 0.004
  },
  light: {
    key: { az: 150, el: 34, color: [0.62, 0.7, 0.95], power: [[0, 0.0], [1.0, 0.06], [6.55, 0.35], [12, 1.3], [16, 1.35]] },
    fill: { az: -30, el: 25, color: [0.5, 0.55, 0.75], power: 0.12 },
    sky: [0.035, 0.045, 0.08], ground: [0.01, 0.01, 0.012],
    exposure: [[0, 0.9], [6.55, 0.8], [12, 1.2]],
    grout: "#5d5a55",
    wet: [0.7, 1.6],
    points: [
      // A candle carried across the bare wall, raking it, then held above the line.
      { x: [[0, A0[0] - 260], [2.4, A0[0] + 40], [6.55, WORD_END[0]], [12, 1500], [16, 1500]],
        y: [[0, A0[1] + 90], [6.55, A0[1] + 70], [12, 380]], z: [[0, 55], [6.55, 70], [12, 420]],
        color: "#ffb36a", power: [[0, 0], [0.3, 0.006], [1.2, 0.03], [6.55, 0.04], [12, 0.16], [16, 0.16]], flicker: 0.18 }
    ]
  },
  build: {
    origin: A_BAR,
    start: 1.2,
    speeds: { gold: 4, outline: 4, ground: 0.55 },
    stages: [{ reach: 20, end: 2.8, rise: 0.7, ease: 0.0 }, { reach: 470, end: 6.5, rise: 0.2, ease: 0.2 }, { end: 13.0, rise: 0.08, ease: 0.3 }]
  },
  sinopia: { groups: [["ground"], ["gold", "outline"]] }
};

export function regions() {
  return [
    { name: "ground", size: 9.5, mode: "contour", mat: "glass", tray: ["#05070c", "#080b14", "#0b111e", "#0f1729", "#141e35"] },
    { name: "outline", size: 3.6, mode: "contour", thin: true, type: true, mat: "basalt", tray: ["#020203", "#060608"] },
    { name: "gold", size: 4.4, mode: "contour", type: true, mat: "gold", tray: ["#8a6a2e", "#b38d42", "#d9b25e", "#efd38d"] }
  ];
}

export function draw(g, mode, D) {
  D.fill(poly([[0, 0], [W, 0], [W, H], [0, H]]), "ground", "#0c1222");
  for (const L of LAYOUT) D.line(L.path, CAP * SW + 9, "outline", "#040405", "butt", "miter");
  for (const L of LAYOUT) {
    const gr = D.linear(L.x, L.y, L.x + L.w * 0.15, L.y + CAP, [[0, "#efd38d"], [0.5, "#d0a650"], [1, "#9a7634"]]);
    D.line(L.path, CAP * SW, "gold", gr, "butt", "miter");
  }
}

export { LETTERS, LAYOUT };
