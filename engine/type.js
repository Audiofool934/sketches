// Greek lapidary capitals: monoline and geometric, as cut on stone inscriptions.
// Each glyph is a set of strokes in a box one unit tall (y down), drawn as lines of
// the stroke width, so a letter is a region the tessellation lays in small stones.

const G = {
  "Α": { w: 0.84, s: [[[0, 1], [0.42, 0], [0.84, 1]], [[0.18, 0.64], [0.66, 0.64]]] },
  "Δ": { w: 0.84, s: [[[0, 1], [0.42, 0], [0.84, 1], [0, 1]]] },
  "Ε": { w: 0.58, s: [[[0.58, 0], [0, 0], [0, 1], [0.58, 1]], [[0, 0.5], [0.46, 0.5]]] },
  "Ι": { w: 0, s: [[[0, 0], [0, 1]]] },
  "Λ": { w: 0.84, s: [[[0, 1], [0.42, 0], [0.84, 1]]] },
  "Μ": { w: 0.92, s: [[[0, 1], [0.08, 0], [0.46, 0.64], [0.84, 0], [0.92, 1]]] },
  "Ν": { w: 0.72, s: [[[0, 1], [0, 0], [0.72, 1], [0.72, 0]]] },
  "Ο": { w: 0.84, o: [0.42, 0.5, 0.42] },
  "Π": { w: 0.72, s: [[[0, 1], [0, 0], [0.72, 0], [0.72, 1]]] },
  "Ρ": { w: 0.6, s: [[[0, 1], [0, 0], [0.34, 0]], [[0.34, 0.5], [0, 0.5]]], arc: [0.34, 0.25, 0.25, -Math.PI / 2, Math.PI / 2] },
  "Σ": { w: 0.7, s: [[[0.7, 0.03], [0, 0], [0.4, 0.5], [0, 1], [0.7, 0.97]]] },
  "Τ": { w: 0.76, s: [[[0, 0], [0.76, 0]], [[0.38, 0], [0.38, 1]]] },
  "Υ": { w: 0.8, s: [[[0, 0], [0.4, 0.5], [0.8, 0]], [[0.4, 0.5], [0.4, 1]]] }
};

const GAP = 0.3;
const SPACE = 0.55;

// Width of a line of text, in units of the cap height, for stroke width sw (units).
export function measure(text, sw) {
  let w = 0;
  for (const ch of text) {
    if (ch === " ") {
      w += SPACE;
      continue;
    }
    const g = G[ch];
    if (!g) throw new Error(`no glyph ${ch}`);
    w += g.w + sw + GAP;
  }
  return w - GAP;
}

// The strokes of a line of text as one path, with its left edge at x, its cap top at
// y, and cap height h (all in mm).
export function textPath(text, x, y, h, sw) {
  const p = new Path2D();
  let cx = x + (sw * h) / 2;
  for (const ch of text) {
    if (ch === " ") {
      cx += SPACE * h;
      continue;
    }
    const g = G[ch];
    const X = (u) => cx + u * h;
    const Y = (v) => y + v * h;
    for (const stroke of g.s || []) {
      p.moveTo(X(stroke[0][0]), Y(stroke[0][1]));
      for (let i = 1; i < stroke.length; i++) p.lineTo(X(stroke[i][0]), Y(stroke[i][1]));
    }
    if (g.o) {
      const [ox, oy, r] = g.o;
      p.moveTo(X(ox + r), Y(oy));
      p.arc(X(ox), Y(oy), r * h, 0, Math.PI * 2);
    }
    if (g.arc) {
      const [ax, ay, r, a0, a1] = g.arc;
      p.moveTo(X(ax + r * Math.cos(a0)), Y(ay + r * Math.sin(a0)));
      p.arc(X(ax), Y(ay), r * h, a0, a1);
    }
    cx += (g.w + sw + GAP) * h;
  }
  return p;
}

// Lines of text centred on cx, the first cap top at y, lines `lead` cap heights apart.
export function centred(lines, cx, y, h, sw, lead) {
  return lines.map((text, i) => {
    const w = measure(text, sw) * h;
    return { text, path: textPath(text, cx - w / 2, y + i * lead * h, h, sw), x: cx - w / 2, y: y + i * lead * h, w };
  });
}

// Centre of each letter of a line laid out by textPath: for build orders and lights.
export function letterCentres(text, x, y, h, sw) {
  const out = [];
  let cx = x + (sw * h) / 2;
  for (const ch of text) {
    if (ch === " ") {
      cx += SPACE * h;
      continue;
    }
    const g = G[ch];
    out.push([cx + (g.w / 2) * h, y + h / 2, ch]);
    cx += (g.w + sw + GAP) * h;
  }
  return out;
}
