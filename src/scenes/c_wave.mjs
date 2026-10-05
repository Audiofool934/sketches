// Movement IV (147.1 - 177.4) and T06 (177.4 - 190): all evidence of existence
// breaks down; the turning wave becomes an embrace.
// The standing sheets nearby turn on upward and are carried off; then, farther
// away, whole rows of sheets rise out of the ground into an immense wall that
// curls over like a wave. Their print layers separate: indigo sheds electric
// cyan, vermilion sheds acid yellow. At the lift the tiles flip one by one; the
// backs carry an indigo-and-vermilion embrace that assembles arm first, then
// shoulders, then whole, while the curl relaxes into a flat wall (a breath).
import { V, clamp, lerp, seg, es, ease, catmull, mulberry32, hash2, TAU, noise1 } from '../lib/math.mjs';
import { PAL, rgba, mixc } from '../lib/palette.mjs';
import { fk, drawProtagonist } from '../lib/rig.mjs';
import { project, projectPoly, projectLine, depth } from '../lib/field.mjs';
import { FIELD, itemsOf, sheetItems, drawSheet3, drawItem, liftOf, cam5, PSTAND, drawGroundSheets } from './c_t05.mjs';
import { STAND_BACK, mixPose } from './poses.mjs';
import { WALL, IMG, embraceImage, P_EMB, C_EMB, P_AT, C_AT } from './embrace.mjs';
import { P_END } from './b_profile.mjs';
import { M } from '../timeline.mjs';

const T4 = M.on147; // 147.1
const Z0 = 1900; // the wall's foot
const NU = 26, NH = 12;
const XS = Array.from({ length: NU + 1 }, (_, i) => lerp(WALL.x0, WALL.x1, i / NU));
const HS = Array.from({ length: NH + 1 }, (_, j) => j / NH);

// ---------- camera ----------
function camPos(pos, pitch, f, W = 1920, H = 1080) {
  const F = [0, -Math.sin(pitch), Math.cos(pitch)];
  const U = [0, Math.cos(pitch), Math.sin(pitch)];
  return { pos, F, U, R: [1, 0, 0], f, W, H };
}
const C5 = cam5(T4);
export function camW(t) {
  // settle low behind the walker with a wide lens: the wall looms; then rise and pull back to face it
  const a = es(t, T4, 158.5, ease.io3);
  const b = es(t, M.lift + 0.4, 189.4, ease.io3);
  const pos = [lerp(lerp(C5.pos[0], -300, a), -250, b), lerp(lerp(C5.pos[1], 62, a), 1240, b), lerp(lerp(C5.pos[2], -560, a), -3900, b)];
  const pitch0 = Math.atan2(-C5.F[1], C5.F[2]);
  const drift = 0.03 * Math.sin((t - T4) * 0.21) * a * (1 - b);
  const pitch = lerp(lerp(pitch0, -0.34, a), 0, b) + drift;
  const f = lerp(lerp(1350, 720, a), 1350, b);
  return camPos(pos, pitch, f);
}

// ---------- the wave surface ----------
export const curlAt = (t) => es(t, 158.5, 176.0, ease.io2) * (1 - es(t, 184.2, 189.6, ease.io3));
const Hx = (x) => WALL.h1 * (0.86 + 0.14 * Math.exp(-(((x + 300) / 2600) ** 2)));
function column(x, curl) {
  // integrate the profile: rises from the foot, curls toward the viewer near the top
  const n = 48, H = Hx(x);
  const cx = 0.75 + 0.25 * Math.exp(-(((x + 300) / 2000) ** 2));
  const out = [[0, Z0]];
  let y = 0, z = Z0;
  for (let k = 1; k <= n; k++) {
    const h = (k - 0.5) / n;
    const phi = curl * cx * 1.8 * Math.pow(h, 2.2);
    y += (H / n) * Math.cos(phi);
    z -= (H / n) * Math.sin(phi);
    out.push([y, z]);
  }
  return out;
}
function surf(colCache, i, h) {
  const col = colCache[i];
  const f = h * (col.length - 1);
  const k = Math.min(col.length - 2, Math.floor(f));
  const s = f - k;
  return [XS[i], lerp(col[k][0], col[k + 1][0], s), lerp(col[k][1], col[k + 1][1], s)];
}

// ---------- tiles ----------
const TILES = (() => {
  const out = [];
  const kinds = ['door', 'foot', 'figure', 'hook', 'door', 'palm', 'figure', 'foot', 'blank', 'blank', 'palm'];
  for (let j = 0; j < NH; j++) {
    for (let i = 0; i < NU; i++) {
      const hsh = hash2(i, j, 77);
      const cx = (XS[i] + XS[i + 1]) / 2, ch = ((HS[j] + HS[j + 1]) / 2) * WALL.h1;
      const r = mulberry32(i * 97 + j * 13 + 5);
      out.push({
        i, j, hsh, cx, ch,
        jit: { rot: (r() - 0.5) * 0.34, sc: 0.9 + r() * 0.32, du: (r() - 0.5) * 0.3, dv: (r() - 0.5) * 0.3, tint: r() },
        tRise: 149.2 + j * 1.3 + Math.abs(i - NU / 2) * 0.05 + hsh * 0.5,
        kind: kinds[Math.floor(hash2(i, j, 5) * kinds.length)],
        seed: Math.floor(hsh * 1e5),
      });
    }
  }
  return out;
})();

// flip order: the companion's arm first, then the shoulders, then outward from the embrace
const JP = fk(P_EMB), JC = fk(C_EMB);
const wp = (J, at, k) => [at.x + J[k][0] * at.S, at.h - J[k][1] * at.S];
const ARM = [wp(JC, C_AT, 'shL'), wp(JC, C_AT, 'elL'), wp(JC, C_AT, 'wrL'), wp(JC, C_AT, 'haL')];
const SHOULDERS = [wp(JP, P_AT, 'shR'), wp(JP, P_AT, 'head'), wp(JC, C_AT, 'head'), wp(JC, C_AT, 'shL')];
function distTo(p, poly) {
  let d = 1e9, along = 0, best = 0, acc = 0;
  for (let k = 0; k < poly.length - 1; k++) {
    const a = poly[k], b = poly[k + 1];
    const ab = V.sub(b, a), L = V.len(ab) || 1;
    const s = clamp(V.dot(V.sub(p, a), ab) / (L * L));
    const q = V.add(a, V.mul(ab, s));
    const dd = V.dist(p, q);
    if (dd < d) {
      d = dd;
      best = acc + s * L;
    }
    acc += L;
  }
  return { d, along: best / acc };
}
const CENTER = [(ARM[3][0] + SHOULDERS[1][0]) / 2, 1500];
for (const T of TILES) {
  const pc = [T.cx, T.ch];
  const a = distTo(pc, ARM), s = distTo(pc, SHOULDERS);
  if (a.d < 260) T.tFlip = 178.2 + (1 - a.along) * 1.8; // down the arm toward the hand on the back
  else if (s.d < 380) T.tFlip = 180.4 + s.along * 1.4 + T.hsh * 0.3;
  else T.tFlip = 182.2 + V.dist(pc, CENTER) / 1500 + T.hsh * 0.5;
}

// print-layer separation: indigo sheds cyan, vermilion sheds yellow; brief re-registrations
export function sepAt(t) {
  const base = es(t, 157.5, 171.0, ease.io2) * (1 - es(t, M.lift + 1.5, 185.5, ease.io3));
  const reg = Math.exp(-Math.pow((t - M.on169) / 0.4, 2)) + Math.exp(-Math.pow((t - M.lift) / 0.45, 2));
  return clamp(base * (1 - 0.85 * clamp(reg)));
}

// ---------- drawing ----------
let IMGC = null;
export function drawWave(pt, t) {
  const ctx = pt.ctx;
  const cam = camW(t);
  // embraceImage redraws itself when the previous draw was only a pattern probe
  IMGC = embraceImage(pt.tex);
  pt.paper([1, 0, 0, 1, 0, 0]);
  // ground wash toward the horizon (the paper plane recedes)
  if (!pt.animatic) {
    const hz = project(cam, [0, 0, 60000]);
    if (hz) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const g = ctx.createLinearGradient(0, hz[1], 0, pt.H);
      g.addColorStop(0, rgba([200, 196, 205], 0.9));
      g.addColorStop(0.25, rgba([235, 230, 222], 0.6));
      g.addColorStop(1, rgba([255, 255, 255], 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, hz[1], pt.W, pt.H - hz[1]);
      ctx.restore();
    }
  }
  // the turned sheet with the hooked crease stays in front; in T06 its bend lifts and pulls the crest
  drawGroundSheets(pt, cam, t, { s1Lift: es(t, M.lift - 1.2, 181.5, ease.io3) * 1.35, s1Alpha: 1 - es(t, 182.5, 185.5), s2Alpha: 1 - es(t, 181, 186) });
  const curl = curlAt(t);
  const cols = XS.map((x) => column(x, curl));
  const sep = sepAt(t);
  const list = [];
  // T05's field sheets: nearby ones turn on upward and are carried off toward the wall
  for (const s of FIELD) {
    const up = es(t, 147.6 + s.dist / 1100, 147.6 + s.dist / 1100 + 3.2, ease.io2);
    if (up >= 1) continue;
    const th = liftOf(s, t) * (Math.PI / 2) * 0.96 + up * 0.6;
    const lift = up * up * 900;
    const al = 1 - es(up, 0.55, 1);
    const sh = { i: s.i, o: [s.x, lift, s.z + up * 700], w: s.w, d: s.d, theta: th, hinge: 'far', rotY: s.rotY + up * 0.6, items: itemsOf(s) };
    list.push({ d: depth(cam, [s.x + s.w / 2, lift, s.z + s.d]), draw: () => drawSheetLifted(pt, cam, sh, al, sep) });
  }
  for (const T of TILES) {
    const k = es(t, T.tRise, T.tRise + 2.0, ease.io3);
    if (k <= 0) continue;
    // slot on the wall
    const s0 = surf(cols, T.i, HS[T.j]), s1 = surf(cols, T.i + 1, HS[T.j]);
    const s2 = surf(cols, T.i + 1, HS[T.j + 1]), s3 = surf(cols, T.i, HS[T.j + 1]);
    // origin: lying on the ground at the wall's foot, sliding up into its slot
    const gz = Z0 - 80 - (NH - T.j) * 14;
    const g0 = [XS[T.i], 0, gz], g1 = [XS[T.i + 1], 0, gz], g2 = [XS[T.i + 1], 0, gz - 170], g3 = [XS[T.i], 0, gz - 170];
    const arc = Math.sin(Math.PI * k) * 160;
    const L = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k) - arc];
    let q = jitterQuad([L(g0, s0), L(g1, s1), L(g2, s2), L(g3, s3)], T.jit, es(t, T.tFlip + 0.4, T.tFlip + 1.4));
    // flip about the tile's own vertical axis (T06)
    const fl = es(t, T.tFlip, T.tFlip + 1.0, ease.io3);
    if (fl > 0) q = flipQuad(q, fl);
    const c = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, (q[0][2] + q[2][2]) / 2];
    list.push({ d: depth(cam, c), draw: () => drawTile(pt, cam, T, q, fl, sep, t) });
  }
  list.sort((a, b) => b.d - a.d);
  for (const it of list) it.draw();
  drawWalkerW(pt, t, cam);
}

/** loose sheets: rotate/scale/offset each tile within its own plane; settles as the embrace aligns */
function jitterQuad(q, J, settle) {
  const k = 1 - settle;
  if (k <= 0) return q;
  const c = [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4, (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4];
  const ex = V.lerp3(q[0], q[1], 1).map((v, i) => v - q[0][i]), ey = V.lerp3(q[0], q[3], 1).map((v, i) => v - q[0][i]);
  const rot = J.rot * k, sc = lerp(1, J.sc, k);
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const off = [ex[0] * J.du * k + ey[0] * J.dv * k, ex[1] * J.du * k + ey[1] * J.dv * k, ex[2] * J.du * k + ey[2] * J.dv * k];
  return q.map((p) => {
    // local coordinates along the tile's own edges
    const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
    const lx = (d[0] * ex[0] + d[1] * ex[1] + d[2] * ex[2]) / (ex[0] ** 2 + ex[1] ** 2 + ex[2] ** 2);
    const ly = (d[0] * ey[0] + d[1] * ey[1] + d[2] * ey[2]) / (ey[0] ** 2 + ey[1] ** 2 + ey[2] ** 2);
    const ax = (lx * cr - ly * sr) * sc, ay = (lx * sr + ly * cr) * sc;
    return [c[0] + ex[0] * ax + ey[0] * ay + off[0], c[1] + ex[1] * ax + ey[1] * ay + off[1], c[2] + ex[2] * ax + ey[2] * ay + off[2]];
  });
}

function flipQuad(q, fl) {
  // rotate the quad about the vertical line through its centre, by π·fl
  const c = [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4, (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4];
  const R = V.norm([q[1][0] - q[0][0], q[1][2] - q[0][2]]); // horizontal right vector (x, z)
  const N = [-R[1], R[0]];
  const a = Math.PI * fl, ca = Math.cos(a), sa = Math.sin(a);
  return q.map((p) => {
    const dx = p[0] - c[0], dz = p[2] - c[2];
    const u = dx * R[0] + dz * R[1], w = dx * N[0] + dz * N[1];
    const u2 = u * ca, w2 = u * sa + w;
    return [c[0] + u2 * R[0] + w2 * N[0], p[1], c[2] + u2 * R[1] + w2 * N[1]];
  });
}

function drawTile(pt, cam, T, q, fl, sep, t) {
  const ctx = pt.ctx;
  const shrink = 0.035;
  const ctr = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, (q[0][2] + q[2][2]) / 2];
  const qs = q.map((p) => [p[0] + (ctr[0] - p[0]) * shrink, p[1] + (ctr[1] - p[1]) * shrink, p[2] + (ctr[2] - p[2]) * shrink]);
  const P = projectPoly(cam, qs);
  if (P.length < 3) return;
  const scr = P.map((p) => [p[0], p[1]]);
  const back = fl > 0.5;
  const dm = P.reduce((a, p) => a + p[2], 0) / P.length;
  const lw = cam.f / dm;
  ctx.save();
  pt.path(scr, true);
  if (pt.animatic) {
    ctx.fillStyle = rgba(back ? PAL.paperLight : PAL.paper);
    ctx.fill();
  } else {
    ctx.fillStyle = pt.pattern(pt.tex.paper, [1, 0, 0, 1, T.i * 41, T.j * 67], 0.62);
    ctx.fill();
    ctx.globalCompositeOperation = 'multiply';
    // lit from above: tiles high in the curl a little brighter, those tucked under it darker
    ctx.fillStyle = rgba(back ? PAL.paperLight : mixc(PAL.paperLight, PAL.paperShade, 0.15 + 0.35 * T.jit.tint + 0.4 * (1 - T.j / NH) * curlAt(t)), 0.45);
    ctx.fill();
  }
  ctx.restore();
  if (!back) {
    // the front: evidence drawings, whose print layers separate
    const w = 1, d = 1;
    const F = (u, v) => {
      // bilinear on the (possibly non-planar) quad; v = 0 at the top edge (drawings stand upright)
      const top = V.lerp3(qs[3], qs[2], u), bot = V.lerp3(qs[0], qs[1], u);
      return V.lerp3(top, bot, v);
    };
    const mapL = (pts) => projectLine(cam, pts.map((p) => F(p[0], p[1])));
    const items = T.kind === 'blank' ? [] : sheetItems(T.kind === 'palm' ? 'palm' : T.kind, 1, 1, T.seed);
    ctx.save();
    pt.path(scr, true);
    ctx.clip();
    const off = sep * 0.045;
    for (const it of items) {
      const isV = it.color && it.color[0] > 200 && it.color[1] < 120; // vermilion item
      if (sep > 0.02) {
        // displaced print layers first (the new colours have a source)
        const layerA = isV ? PAL.yellow : PAL.cyan;
        const layerB = isV ? PAL.vermilionMinusYellow : PAL.indigoMinusCyan;
        drawItem(pt, shiftItem(it, off, -off * 0.6, layerA), mapL, lw, 0.9 * sep, cam, F);
        drawItem(pt, shiftItem(it, -off * 0.7, off * 0.5, layerB), mapL, lw, 0.55 * sep, cam, F);
      }
      drawItem(pt, it, mapL, lw, 1 - 0.5 * sep, cam, F);
    }
    ctx.restore();
  } else {
    // the back: this tile's piece of the embrace (mirrored mapping so it reads the right way round)
    drawEmbracePiece(pt, T, scr, qs, cam);
  }
  pt.ink(scr.concat([scr[0]]), { w: Math.max(0.5, Math.min(2.2, 2.4 * lw)), color: PAL.indigo, alpha: 0.4, seed: 1100 + T.i * 13 + T.j, taper: [0, 0], boilAmp: 0.2 });
}

V.lerp3 = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
function shiftItem(it, du, dv, color) {
  const sh = (p) => [p[0] + du, p[1] + dv];
  const o = { ...it, color };
  if (it.pts) o.pts = it.pts.map(sh);
  if (it.fill) o.fill = it.fill.map(sh);
  if (it.ellipse) o.ellipse = [it.ellipse[0] + du, it.ellipse[1] + dv, it.ellipse[2], it.ellipse[3]];
  if (it.figure) {
    o.x = it.x + du;
    o.top = it.top + dv;
  }
  return o;
}

function drawEmbracePiece(pt, T, scr, qs, cam) {
  const ctx = pt.ctx;
  // image rect of this tile
  const ix0 = ((XS[T.i] - WALL.x0) / (WALL.x1 - WALL.x0)) * IMG.w, ix1 = ((XS[T.i + 1] - WALL.x0) / (WALL.x1 - WALL.x0)) * IMG.w;
  const iy0 = (1 - HS[T.j + 1]) * IMG.h, iy1 = (1 - HS[T.j]) * IMG.h;
  // flipped: the tile's local right corner now carries the image's left edge
  const pBL = project(cam, qs[1]), pBR = project(cam, qs[0]), pTL = project(cam, qs[2]);
  if (!pBL || !pBR || !pTL) return;
  // affine: image (ix0,iy1)→pBL, (ix1,iy1)→pBR, (ix0,iy0)→pTL
  const ax = (pBR[0] - pBL[0]) / (ix1 - ix0), ay = (pBR[1] - pBL[1]) / (ix1 - ix0);
  const bx = (pTL[0] - pBL[0]) / (iy0 - iy1), by = (pTL[1] - pBL[1]) / (iy0 - iy1);
  const ex = pBL[0] - ax * ix0 - bx * iy1, ey = pBL[1] - ay * ix0 - by * iy1;
  const s = ctx.canvas.width / pt.W;
  ctx.save();
  pt.path(scr, true);
  ctx.clip();
  ctx.setTransform(ax * s, ay * s, bx * s, by * s, ex * s, ey * s);
  ctx.drawImage(IMGC, ix0 - 2, iy0 - 2, ix1 - ix0 + 4, iy1 - iy0 + 4, ix0 - 2, iy0 - 2, ix1 - ix0 + 4, iy1 - iy0 + 4);
  ctx.restore();
}

function drawSheetLifted(pt, cam, sh, al, sep) {
  drawSheet3(pt, cam, sh, { alpha: al, backSee: 0.28 });
}

function drawWalkerW(pt, t, cam) {
  // the walker stands at the corner of the frame, watching the wall rise
  const w = PSTAND;
  const q = project(cam, [w[0], 0, w[1]]);
  if (!q) return;
  const S = P_END(M.on114).S * (cam.f / q[2]);
  if (q[1] - 0.9 * S > pt.H + 20) return;
  const look = es(t, 160, 164);
  const pose = mixPose(STAND_BACK, { ...STAND_BACK, head: -98, neck: -95 }, look);
  drawProtagonist(pt, { pose, X: q[0], Y: q[1] - 0.49 * S, S, zoom: 1, lineW: Math.max(0.8, Math.min(5, S * 0.02)), wash: 0.06, seed: 131, trace: 1, gapLen: 0.07 });
}
