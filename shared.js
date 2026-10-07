// What the four pictures share: the panel, a still camera on the whole composition, and a few
// drawing helpers.
import { poly } from "./engine/paint.js";

export const W = 1600, H = 900;
export const path = (d) => new Path2D(d);
export const box = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
export const camera = { keys: [[0, 800, 450, 1600], [30, 800, 450, 1600]], tilt: 0, yaw: 0, aperture: 0.012, drift: 0 };

// A band of dune between two wavy crests, from left to right across the panel, as a path that
// closes along the bottom: top(x) gives the crest's height at x.
export function dune(top, bottom = H + 10, step = 20) {
  const pts = [];
  for (let x = -20; x <= W + 20; x += step) pts.push([x, top(x)]);
  pts.push([W + 20, bottom], [-20, bottom]);
  return poly(pts);
}
// A crest line along the same curve, for the lit ridge of a dune.
export function crest(top, x0 = -20, x1 = W + 20, step = 16) {
  const p = new Path2D();
  for (let x = x0; x <= x1; x += step) (x === x0 ? p.moveTo.bind(p) : p.lineTo.bind(p))(x, top(x));
  return p;
}
// A smooth rolling height: a sum of waves.
export const roll = (base, waves) => (x) => base + waves.reduce((y, [a, l, ph]) => y + a * Math.sin((x / l) * 6.2832 + ph), 0);
