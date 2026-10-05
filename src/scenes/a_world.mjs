// Shared world for Module A (0-80 s): the unfolded room seen from above
// (bed on the floor plane, the wall folded flat beyond the head of the bed),
// and the city that grows out of the sheet into the companion's palm.
// Final Module D returns to this same room, so the geometry lives here.
import { createCanvas } from '@napi-rs/canvas';
import { V, clamp, lerp, catmull, resample, mulberry32, noise1 } from '../lib/math.mjs';
import { PAL, rgba, mixc } from '../lib/palette.mjs';
import { capsule } from '../lib/draw.mjs';

export const WALL_X = 60; // seam between the wall plane and the head of the bed
export const BED = { x0: 60, x1: 2900, y0: 150, y1: 930 };
export const PILLOW = { x: 320, y: 545, rx: 205, ry: 225 };
export const P_LIE = { X: 870, Y: 555, S: 1300, rot: -Math.PI / 2 };

// the old crack: starts at the seam where the sheet's north edge meets the head of the bed
export const CRACK = catmull([[WALL_X, 172], [44, 168], [22, 150], [4, 146], [-18, 128], [-30, 104], [-24, 84], [-12, 80]], 6);

export const weaveTile = (() => {
  let c = null;
  return () => {
    if (c) return c;
    const S = 192, n = 36, sp = S / n;
    c = createCanvas(S, S);
    const g = c.getContext('2d');
    g.clearRect(0, 0, S, S);
    const r = mulberry32(3);
    for (let i = 0; i < n; i++) {
      const a = 0.035 + r() * 0.05;
      g.fillStyle = `rgba(40,50,110,${a})`;
      g.fillRect(0, i * sp + 1.2, S, 0.9 + r() * 0.6);
      if (r() < 0.3) {
        g.fillStyle = `rgba(40,50,110,${a * 1.6})`;
        const x = r() * S;
        g.fillRect(x, i * sp + 1.0, 8 + r() * 30, 1.4);
      }
    }
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(40,50,110,${0.025 + r() * 0.035})`;
      g.fillRect(i * sp + 2.5, 0, 0.8 + r() * 0.5, S);
    }
    return c;
  };
})();

/** night room light: a warm pool on the bed, indigo dusk elsewhere (multiply, screen space) */
export function nightWash(pt, cx, cy, r0, r1, amt = 0.34) {
  const ctx = pt.ctx;
  ctx.save();
  ctx.setTransform(ctx.canvas.width / pt.W, 0, 0, ctx.canvas.width / pt.W, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(255,248,236,1)');
  g.addColorStop(0.55, `rgba(${255 - 60 * amt},${255 - 52 * amt},${255 - 22 * amt},1)`);
  g.addColorStop(1, `rgba(${255 - 150 * amt},${255 - 140 * amt},${255 - 70 * amt},1)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, pt.W, pt.H);
  ctx.restore();
}

/** the sheet's hem edge (a gently curved line across the bed) at edge x */
export function hemCurve(xe, bulge = 26, lift = 0) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const y = lerp(BED.y0 - 6, BED.y1 + 6, i / 24);
    const u = (y - P_LIE.Y) / 260;
    const x = xe - bulge * Math.exp(-u * u) - lift * Math.exp(-u * u * 0.5) + 3 * noise1(y * 0.02, 5);
    pts.push([x, y]);
  }
  return pts;
}

export function drawRoom(pt, m, opts = {}) {
  const ctx = pt.ctx;
  // floor (outside the bed) and the wall plane
  pt.paper(m);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  // wall plane: cooler paper beyond the seam
  ctx.fillStyle = rgba([214, 214, 212], 1);
  ctx.fillRect(-3000, -3000, 3000 + WALL_X, 7000);
  ctx.restore();
  // floorboards north and south of the bed
  for (const [y0, y1] of [[-2000, BED.y0], [BED.y1, 3000]]) {
    for (let y = y0 + 40; y < y1; y += 86) {
      pt.ink([[WALL_X, y], [BED.x1 + 800, y + 4]], { w: 1.4, color: PAL.paperDeep, alpha: 0.55, seed: 700 + y, taper: [0, 0], boil: false });
    }
  }
  // baseboard / seam line
  pt.ink([[WALL_X, -2000], [WALL_X, 3000]], { w: 2.4, color: PAL.indigo, alpha: 0.55, seed: 11, taper: [0, 0], boil: false });
  pt.ink([[WALL_X - 18, -2000], [WALL_X - 18, 3000]], { w: 1.2, color: PAL.indigo, alpha: 0.28, seed: 12, taper: [0, 0], boil: false });
  // the old crack in the wall (present from the first frame, unremarked)
  if (opts.crack !== false) {
    pt.ink(opts.crackPts || CRACK, { w: opts.crackW || 2.1, color: PAL.indigoDeep, alpha: opts.crackAlpha ?? 0.8, seed: 13, taper: [0.1, 0.5], boil: false, rough: 0.5 });
  }
  // bed: mattress edge band and headboard
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgba([205, 196, 178], 0.55);
  ctx.fillRect(BED.x0, BED.y0 - 16, BED.x1 - BED.x0, 16);
  ctx.fillRect(BED.x0, BED.y1, BED.x1 - BED.x0, 20);
  ctx.restore();
  pt.paperFill([[BED.x0, BED.y0], [BED.x1, BED.y0], [BED.x1, BED.y1], [BED.x0, BED.y1]], m, { tint: PAL.paperLight, tintAlpha: 0.0 });
  pt.ink([[BED.x0, BED.y0], [BED.x1, BED.y0]], { w: 2, color: PAL.indigo, alpha: 0.5, seed: 14, taper: [0, 0], boil: false });
  pt.ink([[BED.x0, BED.y1], [BED.x1, BED.y1]], { w: 2, color: PAL.indigo, alpha: 0.5, seed: 15, taper: [0, 0], boil: false });
  // headboard band
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgba(PAL.paperShade, 0.9);
  ctx.fillRect(WALL_X, BED.y0 - 30, 34, BED.y1 - BED.y0 + 60);
  ctx.restore();
  pt.ink([[WALL_X + 34, BED.y0 - 30], [WALL_X + 34, BED.y1 + 30]], { w: 1.6, color: PAL.indigo, alpha: 0.45, seed: 16, taper: [0, 0], boil: false });
}

export function drawPillow(pt, m, press = 1, o = {}) {
  const P = PILLOW;
  const pts = [];
  const N = 64;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const c = Math.cos(a), sn = Math.sin(a);
    // superellipse body, corners pinched inward like a stuffed pillow
    const e = 4.2;
    let x = Math.sign(c) * Math.pow(Math.abs(c), 2 / e) * P.rx;
    let y = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e) * P.ry;
    const pinch = 1 - 0.07 * Math.pow(Math.abs(Math.sin(2 * a)), 6);
    const bulge = 1 + 0.035 * Math.cos(4 * a + Math.PI);
    pts.push([P.x + x * pinch * bulge, P.y + y * pinch * bulge]);
  }
  pt.shadow(pts, { dx: 6, dy: 10, blur: 14, alpha: 0.2 });
  pt.paperFill(pts, m, { tint: PAL.paperLight, tintAlpha: 0.35 });
  pt.ink(pts.concat([pts[0], pts[1]]), { w: 2.2, color: PAL.indigo, alpha: 0.7, seed: 21, taper: [0, 0], press: 0.4 });
  // head dent: soft shading where the head rests
  const ctx = pt.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(P.x + 20, P.y + 5, 30, P.x + 20, P.y + 5, 170);
  g.addColorStop(0, rgba(PAL.indigo, 0.0));
  g.addColorStop(0.6, rgba(PAL.indigo, 0.07 * press));
  g.addColorStop(1, rgba(PAL.indigo, 0));
  ctx.fillStyle = g;
  ctx.fillRect(P.x - 220, P.y - 240, 440, 480);
  ctx.restore();
  // a few seam creases toward the corners
  if (o.creases !== false) for (const [a, b] of [[[P.x - 150, P.y - 150], [P.x - 95, P.y - 105]], [[P.x - 150, P.y + 150], [P.x - 100, P.y + 100]], [[P.x + 160, P.y - 160], [P.x + 120, P.y - 110]]]) {
    pt.ink(resample([a, b], 6), { w: 1.3, color: PAL.indigo, alpha: 0.35, seed: 22 + a[0], taper: [0.4, 0.4] });
  }
}
