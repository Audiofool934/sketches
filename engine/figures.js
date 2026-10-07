// Figures and things for the code drawings, as lists of [region, Path2D] parts drawn
// in order. Units are the panel's millimetres, y down.
import { blob, capsule, circle, ellipse, poly, ribbon, smoothLine, stroke } from "./paint.js";
import { lerp, rng } from "./util.js";

// Poses in figure units: height 1, feet on v = 0, facing +u. Leg 1 is the near leg.
// h is the heel and t the toe.
export const POSES = {
  A: { hip: [0, 0.5], k1: [0.08, 0.275], a1: [0.17, 0.065], h1: [0.145, 0.012], t1: [0.255, 0.012],
       k2: [-0.045, 0.27], a2: [-0.15, 0.08], h2: [-0.185, 0.06], t2: [-0.085, 0.008] },
  B: { hip: [0, 0.515], k1: [0.095, 0.3], a1: [0.04, 0.11], h1: [0.0, 0.1], t1: [0.115, 0.075],
       k2: [0.005, 0.272], a2: [-0.02, 0.05], h2: [-0.05, 0.008], t2: [0.07, 0.008] },
  C: { hip: [0, 0.505], k1: [-0.035, 0.275], a1: [-0.12, 0.075], h1: [-0.155, 0.05], t1: [-0.055, 0.008],
       k2: [0.065, 0.278], a2: [0.13, 0.06], h2: [0.105, 0.012], t2: [0.215, 0.012] },
  stand: { hip: [0, 0.52], k1: [0.02, 0.27], a1: [0.0, 0.05], h1: [-0.02, 0.01], t1: [0.09, 0.008],
           k2: [-0.02, 0.27], a2: [-0.04, 0.05], h2: [-0.06, 0.01], t2: [0.05, 0.008] },
  run: { hip: [0, 0.49], k1: [0.15, 0.32], a1: [0.12, 0.12], h1: [0.1, 0.11], t1: [0.21, 0.07],
         k2: [-0.08, 0.24], a2: [-0.25, 0.16], h2: [-0.29, 0.14], t2: [-0.22, 0.09] },
  crouch: { hip: [-0.04, 0.3], k1: [0.12, 0.25], a1: [0.1, 0.04], h1: [0.06, 0.01], t1: [0.17, 0.008],
            k2: [0.04, 0.22], a2: [-0.08, 0.04], h2: [-0.12, 0.01], t2: [-0.02, 0.008] },
  kneel: { hip: [-0.02, 0.33], k1: [0.14, 0.3], a1: [0.15, 0.04], h1: [0.12, 0.01], t1: [0.22, 0.008],
           k2: [0.04, 0.03], a2: [-0.18, 0.03], h2: [-0.22, 0.05], t2: [-0.27, 0.01] }
};

// A Greek figure in profile. o: { x, y (feet), h, face: 1 right or -1 left, pose,
// head: "helmet" | "pilos" | "bare", arms: "swing" | "spear" | "shield" | "forward" | "up" | "reach",
// cloak, lean, reg: { body, far, skirt, cloak, helmet, crest, cap, beard, skin, shield, rim, spear, tip, dark } }
export function walker(o) {
  const s = o.h;
  const f = o.face || 1;
  const X = (u) => o.x + f * u * s;
  const Y = (v) => o.y - v * s;
  const P = (u, v) => [X(u), Y(v)];
  const r = Object.assign({ body: "body", far: "body", skirt: "body", cloak: "body", helmet: "body", crest: "body", cap: "body",
    beard: "body", skin: "body", shield: "body", rim: "body", spear: "body", tip: "body", dark: "body" }, o.reg || {});
  const po = POSES[o.pose || "A"];
  const parts = [];
  const add = (reg, path) => parts.push([reg, path]);
  const lean = o.lean === undefined ? 0.06 : o.lean;

  function leg(k, a, h, t, near) {
    const hip = po.hip;
    const tone = near ? r.body : r.far;
    add(tone, capsule(X(hip[0] + (near ? 0.012 : -0.012)), Y(hip[1]), 0.052 * s, X(k[0]), Y(k[1]), 0.037 * s));
    add(tone, capsule(X(k[0]), Y(k[1]), 0.035 * s, X(a[0]), Y(a[1]), 0.023 * s));
    const dx = t[0] - h[0];
    const dy = t[1] - h[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    add(tone, poly([P(h[0], h[1]), P(a[0] - 0.022, a[1] + 0.01), P(a[0] + 0.022, a[1] + 0.004), P(t[0] + nx * 0.022, t[1] + ny * 0.022), P(t[0], t[1])]));
  }
  const hip = po.hip;
  const crouch = o.pose === "crouch" || o.pose === "kneel";
  const sh = [hip[0] + lean + (crouch ? 0.04 : 0), hip[1] + (crouch ? 0.29 : 0.305)];
  const neck = [sh[0] + 0.022, sh[1] + 0.05];
  const head = [neck[0] + 0.03, neck[1] + 0.07];

  leg(po.k2, po.a2, po.h2, po.t2, false);
  if (o.cloak) {
    add(r.cloak, blob([
      P(sh[0] - 0.01, sh[1] + 0.03), P(sh[0] - 0.1, sh[1] - 0.02), P(sh[0] - 0.19, sh[1] - 0.17),
      P(sh[0] - 0.26, sh[1] - 0.38), P(sh[0] - 0.29, sh[1] - 0.5), P(sh[0] - 0.2, sh[1] - 0.47),
      P(sh[0] - 0.1, sh[1] - 0.4), P(sh[0] - 0.03, sh[1] - 0.22), P(sh[0] + 0.03, sh[1] - 0.06)
    ]));
  }
  const arms = o.arms || "swing";
  // The far arm first.
  if (arms === "forward" || arms === "up" || arms === "reach") {
    const el = arms === "up" ? [sh[0] + 0.06, sh[1] + 0.12] : [sh[0] + 0.14, sh[1] - 0.02];
    const ha = arms === "up" ? [sh[0] + 0.1, sh[1] + 0.27] : [sh[0] + 0.28, sh[1] + (arms === "reach" ? 0.02 : 0.0)];
    add(r.far, capsule(X(sh[0] - 0.01), Y(sh[1] - 0.01), 0.032 * s, X(el[0]), Y(el[1]), 0.026 * s));
    add(r.far, capsule(X(el[0]), Y(el[1]), 0.025 * s, X(ha[0]), Y(ha[1]), 0.02 * s));
  }
  let spearHand = null;
  if (arms === "spear") {
    const beta = o.spear === undefined ? 0.2 : o.spear;
    const hand = [sh[0] + 0.11, sh[1] - 0.13];
    const dir = [Math.sin(beta), Math.cos(beta)];
    const top = [hand[0] + dir[0] * 0.8, hand[1] + dir[1] * 0.8];
    const tail = [hand[0] - dir[0] * 0.36, hand[1] - dir[1] * 0.36];
    const tipBase = [top[0] - dir[0] * 0.075, top[1] - dir[1] * 0.075];
    const nx = -dir[1];
    const ny = dir[0];
    spearHand = hand;
    add(r.spear, capsule(X(tail[0]), Y(tail[1]), 0.0085 * s, X(tipBase[0]), Y(tipBase[1]), 0.0085 * s));
    add(r.tip, poly([P(tipBase[0] + nx * 0.017, tipBase[1] + ny * 0.017), P(top[0], top[1]),
      P(tipBase[0] - nx * 0.017, tipBase[1] - ny * 0.017), P(tipBase[0] - dir[0] * 0.03, tipBase[1] - dir[1] * 0.03)]));
  }
  // Torso and skirt.
  add(r.body, poly([
    P(hip[0] - 0.075, hip[1] + 0.02), P(hip[0] + 0.07, hip[1] + 0.02), P(sh[0] + 0.088, sh[1] - 0.1),
    P(sh[0] + 0.074, sh[1] - 0.005), P(neck[0] + 0.03, neck[1] - 0.005), P(neck[0] - 0.035, neck[1] - 0.01),
    P(sh[0] - 0.088, sh[1] - 0.025), P(hip[0] - 0.092, hip[1] + 0.15)
  ]));
  add(r.skirt, poly([
    P(hip[0] - 0.098, hip[1] + 0.055), P(hip[0] + 0.088, hip[1] + 0.055), P(hip[0] + 0.122, hip[1] - 0.135),
    P(hip[0] + 0.02, hip[1] - 0.15), P(hip[0] - 0.13, hip[1] - 0.12)
  ]));
  leg(po.k1, po.a1, po.h1, po.t1, true);

  // Head.
  const hx = head[0];
  const hy = head[1];
  const kind = o.head || "helmet";
  if (kind === "helmet") {
    add(r.crest, blob([
      P(hx + 0.04, hy + 0.062), P(hx + 0.012, hy + 0.128), P(hx - 0.055, hy + 0.148), P(hx - 0.13, hy + 0.105),
      P(hx - 0.16, hy + 0.02), P(hx - 0.122, hy + 0.035), P(hx - 0.085, hy + 0.082), P(hx - 0.02, hy + 0.085)
    ]));
    add(r.helmet, poly(smoothLine([
      [X(hx - 0.07), Y(hy - 0.085)], [X(hx - 0.078), Y(hy - 0.01)], [X(hx - 0.058), Y(hy + 0.05)],
      [X(hx - 0.01), Y(hy + 0.077)], [X(hx + 0.045), Y(hy + 0.06)], [X(hx + 0.07), Y(hy + 0.02)],
      [X(hx + 0.078), Y(hy - 0.012)], [X(hx + 0.07), Y(hy - 0.045)], [X(hx + 0.062), Y(hy - 0.09)],
      [X(hx + 0.03), Y(hy - 0.098)], [X(hx + 0.008), Y(hy - 0.06)], [X(hx - 0.032), Y(hy - 0.072)],
      [X(hx - 0.07), Y(hy - 0.085)]
    ], 4)));
    add(r.dark, poly([P(hx + 0.022, hy + 0.004), P(hx + 0.074, hy + 0.012), P(hx + 0.074, hy - 0.006), P(hx + 0.03, hy - 0.016)]));
  } else {
    // A head in profile: brow, nose, beard; Odysseus wears the conical felt pilos.
    add(r.beard, blob([P(hx - 0.062, hy + 0.035), P(hx - 0.02, hy + 0.045), P(hx - 0.01, hy - 0.02), P(hx - 0.048, hy - 0.05), P(hx - 0.07, hy - 0.01)]));
    add(r.skin, poly(smoothLine([
      [X(hx - 0.04), Y(hy + 0.05)], [X(hx + 0.02), Y(hy + 0.06)], [X(hx + 0.056), Y(hy + 0.036)], [X(hx + 0.062), Y(hy + 0.012)],
      [X(hx + 0.088), Y(hy - 0.016)], [X(hx + 0.066), Y(hy - 0.028)], [X(hx + 0.064), Y(hy - 0.042)], [X(hx + 0.036), Y(hy - 0.048)],
      [X(hx - 0.006), Y(hy - 0.03)], [X(hx - 0.032), Y(hy + 0.0)], [X(hx - 0.04), Y(hy + 0.05)]
    ], 4)));
    add(r.beard, blob([P(hx + 0.064, hy - 0.04), P(hx + 0.07, hy - 0.07), P(hx + 0.042, hy - 0.112), P(hx - 0.004, hy - 0.098),
      P(hx - 0.03, hy - 0.06), P(hx - 0.008, hy - 0.032), P(hx + 0.034, hy - 0.05)]));
    if (kind === "pilos") {
      add(r.cap, poly([P(hx - 0.075, hy + 0.028), P(hx + 0.066, hy + 0.044), P(hx + 0.012, hy + 0.17), P(hx - 0.02, hy + 0.17)]));
    } else {
      add(r.beard, blob([P(hx - 0.07, hy + 0.024), P(hx - 0.02, hy + 0.07), P(hx + 0.05, hy + 0.06), P(hx + 0.03, hy + 0.03), P(hx - 0.04, hy + 0.01)]));
    }
  }

  // The near arm.
  if (arms === "shield") {
    const sc = [sh[0] + 0.025, sh[1] - 0.175];
    const sr = 0.13;
    add(r.rim, ellipse(X(sc[0]), Y(sc[1]), sr * s, sr * s * 1.03, 0));
    add(r.shield, ellipse(X(sc[0]), Y(sc[1]), (sr - 0.024) * s, (sr - 0.024) * s * 1.03, 0));
  } else if (arms === "spear") {
    add(r.body, capsule(X(sh[0] + 0.01), Y(sh[1] - 0.02), 0.031 * s, X(sh[0] + 0.07), Y(sh[1] - 0.17), 0.025 * s));
    add(r.body, capsule(X(sh[0] + 0.07), Y(sh[1] - 0.17), 0.024 * s, X(spearHand[0]), Y(spearHand[1]), 0.02 * s));
  } else if (arms === "forward" || arms === "up" || arms === "reach") {
    const el = arms === "up" ? [sh[0] + 0.08, sh[1] + 0.1] : [sh[0] + 0.15, sh[1] - 0.05];
    const ha = arms === "up" ? [sh[0] + 0.12, sh[1] + 0.25] : [sh[0] + 0.3, sh[1] + (arms === "reach" ? 0.04 : -0.02)];
    add(r.body, capsule(X(sh[0] + 0.01), Y(sh[1] - 0.02), 0.032 * s, X(el[0]), Y(el[1]), 0.026 * s));
    add(r.body, capsule(X(el[0]), Y(el[1]), 0.025 * s, X(ha[0]), Y(ha[1]), 0.02 * s));
  } else {
    add(r.body, capsule(X(sh[0] + 0.005), Y(sh[1] - 0.02), 0.031 * s, X(sh[0] - 0.03), Y(sh[1] - 0.17), 0.025 * s));
    add(r.body, capsule(X(sh[0] - 0.03), Y(sh[1] - 0.17), 0.024 * s, X(sh[0] + 0.02), Y(sh[1] - 0.3), 0.02 * s));
  }
  return parts;
}

// A Greek galley in profile, bow to the left when face is -1. o: { x (stern post foot),
// y (waterline), len, face, sail: true, oars: n, reg: { hull, rail, eye, eyeWhite,
// mast, sail, sailDark, oar, ram } }. Returns parts and the bow eye's centre and size.
export function ship(o) {
  const L = o.len;
  const f = o.face || -1;
  const X = (u) => o.x + f * u * L;
  const Y = (v) => o.y - v * L;
  const r = Object.assign({ hull: "hull", rail: "hull", eye: "hull", eyeWhite: "hull", mast: "hull", sail: "hull", sailDark: "hull", oar: "hull", ram: "hull" }, o.reg || {});
  const parts = [];
  const add = (reg, path) => parts.push([reg, path]);
  // Oars under the hull, slanting into the sea.
  const nO = o.oars === undefined ? 14 : o.oars;
  for (let i = 0; i < nO; i++) {
    const u = 0.22 + (i / Math.max(1, nO - 1)) * 0.5;
    const sw = (o.oarSwing || 0) * Math.sin(i * 0.7);
    add(r.oar, stroke([[X(u), Y(0.035)], [X(u + 0.025 + sw), Y(-0.055)]], L * 0.006, L * 0.004));
  }
  // Hull: a long low body, the stern curling up behind into the aphlaston, the bow
  // low with the ram at the waterline.
  add(r.hull, poly(smoothLine([
    [X(0.0), Y(0.27)], [X(0.04), Y(0.2)], [X(0.07), Y(0.11)], [X(0.12), Y(0.06)], [X(0.3), Y(0.04)], [X(0.6), Y(0.04)],
    [X(0.86), Y(0.05)], [X(0.95), Y(0.08)], [X(0.99), Y(0.12)], [X(1.0), Y(0.105)], [X(0.97), Y(0.06)], [X(1.04), Y(0.0)],
    [X(0.9), Y(-0.012)], [X(0.4), Y(-0.018)], [X(0.12), Y(-0.01)], [X(0.05), Y(0.03)], [X(0.0), Y(0.12)], [X(-0.03), Y(0.25)],
    [X(0.0), Y(0.27)]
  ], 5)));
  add(r.ram, poly([[X(0.97), Y(0.03)], [X(1.08), Y(0.0)], [X(0.97), Y(-0.012)]]));
  add(r.rail, stroke([[X(0.08), Y(0.085)], [X(0.4), Y(0.07)], [X(0.8), Y(0.075)], [X(0.96), Y(0.1)]], L * 0.01, L * 0.008));
  // The painted eye at the bow: white almond, dark iris.
  const ec = [X(0.9), Y(0.06)];
  const ew = L * 0.045;
  add(r.eyeWhite, blob([[ec[0] - ew, ec[1]], [ec[0], ec[1] - ew * 0.42], [ec[0] + ew, ec[1]], [ec[0], ec[1] + ew * 0.42]]));
  add(r.eye, circle(ec[0], ec[1], ew * 0.3));
  if (o.sail !== false) {
    const mx = X(0.5);
    add(r.mast, stroke([[mx, Y(0.04)], [mx, Y(0.62)]], L * 0.009, L * 0.007));
    add(r.mast, stroke([[X(0.3), Y(0.6)], [X(0.7), Y(0.6)]], L * 0.007, L * 0.007));
    const billow = o.billow === undefined ? 0.04 : o.billow;
    add(r.sail, poly(smoothLine([[X(0.31), Y(0.59)], [X(0.5), Y(0.6 - billow * 0.3)], [X(0.69), Y(0.59)], [X(0.69 + f * 0), Y(0.24)],
      [X(0.5), Y(0.22 - billow)], [X(0.31), Y(0.24)], [X(0.31), Y(0.59)]], 6)));
    for (const u of [0.38, 0.5, 0.62]) add(r.sailDark, stroke([[X(u), Y(0.58)], [X(u), Y(0.25)]], L * 0.004, L * 0.004));
  }
  return { parts, eye: { x: ec[0], y: ec[1], w: ew } };
}

// A sheep in profile: a woolly body of lobes, a dark head and legs.
export function sheep(o) {
  const s = o.h;
  const f = o.face || 1;
  const R = rng(o.seed || 1);
  const X = (u) => o.x + f * u * s;
  const Y = (v) => o.y - v * s;
  const parts = [];
  const r = Object.assign({ wool: "wool", head: "dark", leg: "dark" }, o.reg || {});
  for (const lx of [-0.32, -0.18, 0.18, 0.3]) parts.push([r.leg, capsule(X(lx), Y(0.38), 0.05 * s, X(lx + 0.02), Y(0.0), 0.035 * s)]);
  const pts = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = 1 + 0.08 * Math.sin(i * 2.7) + (R() - 0.5) * 0.06;
    pts.push([X(Math.cos(a) * 0.45 * rr), Y(0.6 + Math.sin(a) * 0.27 * rr)]);
  }
  parts.push([r.wool, blob(pts)]);
  parts.push([r.head, blob([[X(0.38), Y(0.78)], [X(0.52), Y(0.86)], [X(0.68), Y(0.7)], [X(0.62), Y(0.58)], [X(0.46), Y(0.6)]])]);
  return parts;
}

// A tongue of flame, base at (x, y), height h, leaning by lean.
export function flame(x, y, h, w, lean) {
  const l = lean || 0;
  return blob([[x - w * 0.5, y], [x - w * 0.42, y - h * 0.35], [x - w * 0.15 + l * h * 0.5, y - h * 0.75], [x + l * h, y - h],
    [x + w * 0.2 + l * h * 0.5, y - h * 0.62], [x + w * 0.45, y - h * 0.3], [x + w * 0.5, y]]);
}

// Evenly spaced horizontal bands across a rectangle, each a closed path with a gentle
// wave on its upper edge: for sky and sea in courses of colour.
export function bands(x0, y0, x1, y1, n, wave, seed) {
  const R = rng(seed || 5);
  const out = [];
  const step = (y1 - y0) / n;
  const edge = (yy, k) => {
    const pts = [];
    const ph = R() * 6.28;
    for (let x = x0; x <= x1 + 1; x += (x1 - x0) / 40) pts.push([x, yy + Math.sin(x / 210 + ph + k) * wave + Math.sin(x / 77 + ph * 2) * wave * 0.35]);
    return pts;
  };
  let prev = edge(y0, 0);
  for (let i = 0; i < n; i++) {
    const next = i === n - 1 ? edge(y1, i + 1).map((p) => [p[0], y1]) : edge(y0 + step * (i + 1), i + 1);
    out.push(poly(prev.concat(next.slice().reverse())));
    prev = next;
  }
  return out;
}

export { lerp, ribbon };
