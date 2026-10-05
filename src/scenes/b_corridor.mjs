// Module B, part 1 - Movement III: every exit recognizes you (80 - 100.2 s)
// Screen space continues exactly from Module A's camera at t = 80 (door-local
// (u,v) → screen (960 + 2.5u, 952.5 - 2.5v)). The viewer dollies through the
// entry door; a distant version turns too early; echoes gather in the frames.
import { V, clamp, lerp, seg, es, ease, catmull, TAU, onN } from '../lib/math.mjs';
import { PAL, rgba, mixc } from '../lib/palette.mjs';
import { camMatrix } from '../lib/camera.mjs';
import { REST, drawProtagonist } from '../lib/rig.mjs';
import { COR, projUV, drawCorridor } from '../lib/corridor.mjs';
import { CAM_A } from './a_scene.mjs';
import { drawRoom } from './a_world.mjs';
import { drawSheet, sheetState } from './a_bed.mjs';
import { doorFrame, doorPt } from './a_door.mjs';
import { palmFingers, pDepth, P_SIZE } from './a_city.mjs';
import { M } from '../timeline.mjs';

export const M80 = camMatrix(CAM_A.at(80));
export const BX = 960, BY = 952.5, BPX = 2.5;
export const LW = Math.pow(2.5, 0.55); // Module A line weight at t = 80, in screen px per unit

// ---------------- camera dolly ----------------
export function pDepthB(t) {
  // walks in from the threshold at 22 u/s, decelerates to a stop between 86.2 and 88.6
  if (t >= T_WALL0) return pDepthWall(t);
  if (t <= 80) return pDepth(t);
  const v0 = 22, t1 = 86.2, t2 = 88.6;
  const z80 = pDepth(80);
  if (t <= t1) return z80 + v0 * (t - 80);
  const tt = Math.min(t, t2) - t1, T = t2 - t1;
  return z80 + v0 * (t1 - 80) + v0 * (tt - (tt * tt) / (2 * T));
}
export function zcamAt(t) {
  // hold, then glide through the entry door and settle behind the walker; eases back before the fold
  if (t >= T_WALL0) return zcamWall(t);
  const a = es(t, 80.0, 86.8, ease.io3);
  return lerp(0, pDepthB(t) + 118, a);
}
/** screen pan (the view tilts down as we enter, keeping the walker's feet in frame) */
export const panY = (t) => panAt(t);
let EYE = COR.VPV;

/** project a corridor point to screen for a given dolly */
let PAN = 0;
export function scr(X, Y, z, zcam) {
  const r = projUV(X, Y, z, zcam, EYE);
  if (!r) return null;
  return [BX + r[0] * BPX, BY - r[1] * BPX + PAN, r[2]];
}

import { mixPose, walkBack, STAND_BACK, REACH_BACK, FACE, REACH_FRONT, reachPose, pAtWall } from './poses.mjs';
import { eyeAt, panAt, zcamWall, pDepthWall, pXWall, T_WALL0, Z_STOP } from './b_geom.mjs';

export function nearPose(t) {
  const z = pDepthB(t);
  const walking = 1 - es(t, 86.2, 88.2);
  const ph = (pDepth(80) * 0.9 + (z - pDepth(80)) * 0.9 + 1712 - 1250) / 42;
  let pose = mixPose(STAND_BACK, walkBack(ph, 1), walking);
  // late reach (the distant one already finished)
  if (t > M.on89) pose = mixPose(pose, reachPose(t - M.on89), 1);
  return pose;
}

// ---------------- scene ----------------
export function drawCorridorScene(pt, t) {
  const ctx = pt.ctx;
  const scale = ctx.canvas.width / pt.W;
  const zc = zcamAt(t);
  PAN = panY(t);
  EYE = eyeAt(t);
  // door plane (z = 0): the room wall with the entry door, scaled as we dolly through it
  const s0 = COR.Zc / (COR.Zc - zc);
  const vp = [BX, BY - COR.VPV * BPX + PAN];
  const doorVisible = s0 < 7;
  // the paper the corridor is drawn on: identical to the sheet seen through the door at t = 80
  {
    const main = ctx;
    ctx.save();
    ctx.setTransform(M80[0] * scale, M80[1] * scale, M80[2] * scale, M80[3] * scale, M80[4] * scale, M80[5] * scale);
    pt.zoom = 2.5;
    pt.lineComp = 0.45;
    const bd = 1 - es(t, 84.5, 88.5);
    pt.paper(M80);
    if (bd > 0.001) {
      ctx.globalAlpha = bd;
      drawRoom(pt, M80, { crack: false });
      drawSheet(pt, M80, 80, sheetState(80), { moundScale: 0 });
      ctx.globalAlpha = 1;
    }
    pt.zoom = 1;
    pt.lineComp = 0;
    ctx.restore();
  }
  // corridor behind the door
  drawCorridor(pt, (u, v) => [BX + u * BPX, BY - v * BPX + PAN], { zcam: zc, on: 1, skipEntry: true, lw: LW, texM: M80, eye: EYE });
  if (doorVisible) {
    // everything that lies on the door plane: paper wall, bed edge, doorframe line
    const g = pt.layer('doorPlane');
    const main = pt.ctx;
    pt.ctx = g;
    const k = s0;
    // world → screen for the door plane, scaled about the vanishing point
    const vp0 = [BX, BY - COR.VPV * BPX];
    const Mw = [M80[0] * k, M80[1] * k, M80[2] * k, M80[3] * k, (M80[4] - vp0[0]) * k + vp0[0], (M80[5] - vp0[1]) * k + vp0[1] + PAN];
    g.setTransform(Mw[0] * scale, Mw[1] * scale, Mw[2] * scale, Mw[3] * scale, Mw[4] * scale, Mw[5] * scale);
    pt.zoom = 2.5 * k;
    pt.lineComp = 0.45;
    drawRoom(pt, Mw, { crack: false });
    drawSheet(pt, Mw, 80, sheetState(80), { moundScale: 0 });
    const frame = doorFrame(80, palmFingers(80));
    pt.ink(frame.concat([frame[0]]).slice(0, frame.length), { w: 3.0, color: PAL.indigo, alpha: 1, seed: 88, taper: [0.02, 0.02], press: 0.3 });
    // cut the door opening out of the wall plane
    g.save();
    g.globalCompositeOperation = 'destination-out';
    const inner = frame.map(([x, y], i) => [x, y]);
    pt.path(inner, true, g);
    g.fillStyle = '#000';
    g.fill();
    g.restore();
    pt.ink(frame.concat([frame[0]]).slice(0, frame.length), { w: 3.0, color: PAL.indigo, alpha: 1, seed: 88, taper: [0.02, 0.02], press: 0.3 });
    pt.zoom = 1;
    pt.lineComp = 0;
    pt.ctx = main;
    pt.put(g);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  drawFigures(pt, t, zc);
}

function drawFigureAt(pt, pose, z, X, zc, o = {}) {
  const f = scr(X, 0, z, zc);
  if (!f || f[2] <= 0) return null;
  const S = P_SIZE * f[2] * BPX;
  if (S < 3) return null;
  // same pen as Module A at the threshold (1.25 units at zoom 2.5), easing with size
  const lw = 1.25 * LW * Math.sqrt(f[2] / 0.88);
  return drawProtagonist(pt, {
    pose, X: f[0], Y: f[1] - 0.49 * S, S, zoom: 1, lineW: Math.max(0.6, lw) * (o.lwMul || 1),
    wash: o.wash ?? 0.05, seed: o.seed || 131, trace: o.trace ?? 1, alpha: o.alpha ?? 1, lineAlpha: o.lineAlpha,
    fillAlpha: o.fillAlpha, gapLen: 0.06, regShadow: o.regShadow,
  });
}

function drawFigures(pt, t, zc) {
  // the far version, standing in the last frame before the exit
  const zFar = COR.EXIT_Z - 260;
  const turn = es(t, M.on83, M.on83 + 0.7, ease.io3);
  let far = mixPose({ ...STAND_BACK }, { ...FACE }, turn);
  far.yaw = lerp(2, 0, turn);
  if (t > 86) far = mixPose(far, reachPose(t - 86, true), 1);
  // echoes: the same reach, unsynchronised, gathering in the frames between (89 → 98)
  const echoOn = es(t, 89.0, 91.5) * (1 - es(t, M.on98 - 0.2, M.on98 + 0.5));
  const sync = Math.exp(-Math.pow((t - M.on94) / 0.35, 2)); // a moment of registration
  const echoes = [
    { k: 8, lag: 0.9, X: -10 },
    { k: 5, lag: 1.9, X: 12 },
    { k: 3, lag: 2.9, X: -14 },
  ];
  // draw far to near
  // the far version emerges from the bright exit as we come through the door
  drawFigureAt(pt, far, zFar, 0, zc, { seed: 171, lwMul: 1.2, alpha: es(t, 80.2, 82.2) * (1 - es(t, 97.6, 99.0)) });
  if (echoOn > 0.01) {
    echoes.forEach((e, i) => {
      const z = e.k * COR.SPACING + 30;
      const lt = t - 86 - e.lag * (1 - sync);
      const pose = mixPose(reachPose(lt, true), reachPose(t - M.on89), sync);
      pose.yaw = lerp(0, 1.7, sync * 0.0) + (sync > 0.5 ? 0 : 0);
      drawFigureAt(pt, pose, z, e.X * (1 - sync), zc, { alpha: echoOn * (0.55 + 0.45 * sync), lineAlpha: 0.8, fillAlpha: 0.35, wash: 0.02, seed: 181 + i, trace: 0 });
    });
  }
  // the near protagonist (keeps the right-shoulder gap in view)
  const zp = pDepthB(t);
  let pose = nearPose(t);
  let X = 0;
  if (t > T_WALL0) {
    // walk on along the right wall, the fingertip trailing along it (carrying the hook)
    const k = es(t, T_WALL0, T_WALL0 + 0.8);
    const ph = (pDepthB(t) - Z_STOP) / 40;
    const walk = mixPose(walkBack(ph, 0.9), { yaw: 1.55, yawH: 1.35 }, 1);
    const touch = pAtWall(t, T_WALL0 + 0.6, M.layer2).pose;
    const walkArm = { ...walk, shR: touch.shR, elR: touch.elR, haR: touch.haR, yaw: touch.yaw, yawH: touch.yawH, head: touch.head, neck: touch.neck };
    const settle = es(t, 99.4, M.layer2);
    pose = mixPose(pose, mixPose(walkArm, touch, settle), k);
    X = pXWall(t);
  }
  // afterimages of the recent reach stay on the paper, then clear
  if (t > M.on89 && t < M.on98 + 0.5) {
    const clear = 1 - es(t, M.on98 - 0.3, M.on98 + 0.4);
    for (let j = 3; j >= 1; j--) {
      const pp = nearPose(t - j * 0.28);
      drawFigureAt(pt, pp, zp, X, zc, { alpha: 0.18 * clear * (1 - j / 4), lineAlpha: 0.7, fillAlpha: 0.0, seed: 191 + j, trace: 0 });
    }
  }
  drawFigureAt(pt, pose, zp, X, zc, { seed: 131 });
}
