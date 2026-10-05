// Module A (0 - 80 s): Movement I, T01, Movement II, T02, T03.
import { es, ease, seg, clamp, lerp, V } from '../lib/math.mjs';
import { CamPath, camMatrix, applyCam, toScreenPt } from '../lib/camera.mjs';
import { drawRoom, drawPillow, nightWash } from './a_world.mjs';
import { sheetState, drawSheet, drawLying, drawCompanionTop, drawPArm } from './a_bed.mjs';
import { drawCity, pCity, uHead, creaseAt } from './a_city.mjs';
import { M } from '../timeline.mjs';

export const CAM_A = new CamPath([
  { t: 0, x: 760, y: 600, z: 1.0 },
  { t: 8.8, x: 800, y: 640, z: 1.12 },
  { t: 11.6, x: 900, y: 760, z: 1.9 },
  { t: 14.0, x: 950, y: 805, z: 2.9 },
  { t: 19.5, x: 955, y: 808, z: 3.25, hold: true },
  { t: 22.6, x: 940, y: 775, z: 2.6 },
  { t: 24.5, x: 945, y: 752, z: 2.45, hold: true },
  { t: 27.3, x: 975, y: 748, z: 2.7 },
  { t: 29.3, x: 1000, y: 748, z: 2.7 },
  { t: 34.09, x: 1150, y: 770, z: 2.35 },
  { t: 37.2, x: 1225, y: 745, z: 2.9 },
  { t: 39.6, x: 1262, y: 728, z: 3.35, hold: true },
  { t: 47.53, x: 1418, y: 722, z: 3.45 },
  { t: 53.2, x: 1420, y: 722, z: 3.45, hold: true },
  { t: 56.16, x: 1480, y: 715, z: 3.2 },
  { t: 62.5, x: 1640, y: 690, z: 1.42 },
  { t: 67.18, x: 1690, y: 690, z: 1.38, hold: true },
  { t: 70.2, x: 1772, y: 706, z: 1.8, r: -0.62 },
  { t: 73.4, x: 1877, y: 710, z: 2.5, r: -Math.PI / 2, hold: true },
  { t: 80, x: 1877, y: 710, z: 2.5, r: -Math.PI / 2, hold: true },
]);

// where the light pool sits (world) and how dark the room is around it
function lightAt(t) {
  const bed = [820, 560];
  const follow = pCity(t);
  const target = follow ? [follow.x, follow.y] : creaseAt(uHead(t));
  const k = es(t, 29.5, 37);
  return { p: V.lerp(bed, target, k), amt: lerp(0.42, 0.3, k) * (1 - es(t, 57, 63) * 0.75) * (1 - es(t, 70, 76)), r1: lerp(1300, 700, k) };
}

export const sceneA = {
  name: 'A',
  t0: 0,
  t1: 80,
  render(pt, t) {
    const ctx = pt.ctx;
    const scale = ctx.canvas.width / pt.W;
    const cam = CAM_A.at(t);
    const m = camMatrix(cam, pt.W, pt.H);
    applyCam(ctx, m, scale);
    pt.zoom = cam.z;
    pt.lineComp = 0.45;
    drawRoom(pt, m);
    drawPillow(pt, m);
    // while we are inside the city the bedside quietly empties: the lying body,
    // its arm and the companion at the bedside fade out of the room (off screen)
    const roomFade = 1 - es(t, 43, 50);
    if (roomFade > 0) {
      ctx.save();
      ctx.globalAlpha = roomFade;
      drawLying(pt, t);
      ctx.restore();
    }
    const st = sheetState(t);
    drawSheet(pt, m, t, st, { moundScale: roomFade });
    drawCity(pt, t, cam);
    if (roomFade > 0) {
      ctx.save();
      ctx.globalAlpha = roomFade;
      drawCompanionTop(pt, t);
      drawPArm(pt, t);
      ctx.restore();
    }
    const L = lightAt(t);
    const lp = toScreenPt(m, L.p);
    if (L.amt > 0.001) nightWash(pt, lp[0], lp[1], 240 * cam.z, L.r1 * Math.max(1, cam.z * 0.8), L.amt);
    pt.zoom = 1;
    pt.lineComp = 0;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  },
};
