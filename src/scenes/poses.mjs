// Shared pose library (all modules use the same drawings for the same actions)
import { clamp, lerp, ease, es, TAU } from '../lib/math.mjs';
import { REST } from '../lib/rig.mjs';

export function mixPose(a, b, s) {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    if (typeof b[k] !== 'number') continue;
    if (typeof a[k] !== 'number') {
      out[k] = s > 0.5 ? b[k] : a[k];
      continue;
    }
    let d = b[k] - a[k];
    if (!['x', 'y', 'yaw', 'yawU', 'yawH', 'lean', 'hair'].includes(k)) d = ((d + 540) % 360) - 180;
    out[k] = a[k] + d * s;
  }
  return out;
}

/** side-view walk (profile facing right for yaw >= 0) */
export function walkPose(ph, amp = 1, yaw = 1) {
  const f = ph * TAU;
  const s = Math.sin(f), c = Math.cos(f);
  const kR = 36 * Math.pow(Math.max(0, c), 1.4) + 5, kL = 36 * Math.pow(Math.max(0, -c), 1.4) + 5;
  const dir = yaw >= 0 ? 1 : -1;
  const th = (a) => 90 - dir * a;
  return {
    ...REST, yaw,
    y: -0.012 * Math.cos(2 * f) * amp,
    spine: -90 + dir * 3 * amp, neck: -90 + dir * 4, head: -90 + dir * 5,
    thR: th(24 * s * amp), snR: th(24 * s * amp) + dir * kR * amp, ftR: dir > 0 ? -2 : 182,
    thL: th(-24 * s * amp), snL: th(-24 * s * amp) + dir * kL * amp, ftL: dir > 0 ? -2 : 182,
    shR: 90 + dir * 19 * s * amp, elR: 90 + dir * (19 * s - 14) * amp, haR: 90 + dir * (19 * s - 18) * amp,
    shL: 90 - dir * 19 * s * amp, elL: 90 - dir * (19 * s + 14) * amp, haL: 90 - dir * (19 * s + 18) * amp,
  };
}

/** walking away from the viewer (back view) */
export function walkBack(ph, amp = 1) {
  const f = ph * TAU, s = Math.sin(f);
  const liftR = Math.max(0, s), liftL = Math.max(0, -s);
  return {
    ...REST, yaw: 2,
    y: -0.01 * Math.cos(2 * f) * amp,
    spine: -90 + 1.5 * s * amp, neck: -90, head: -90 + s * amp,
    thR: 90 - 2 * amp, snR: 90 + 14 * liftR * amp, thL: 90 + 2 * amp, snL: 90 - 14 * liftL * amp,
    ftR: 90, ftL: 90,
    shR: 94 + 6 * s * amp, elR: 96 + 8 * s * amp, haR: 96 + 8 * s * amp,
    shL: 86 + 6 * s * amp, elL: 84 + 8 * s * amp, haL: 84 + 8 * s * amp,
  };
}

export const STAND = { ...REST, yaw: 1, spine: -90, neck: -88, head: -86, thR: 88, snR: 90, thL: 92, snL: 91, shR: 93, elR: 95, haR: 96, shL: 88, elL: 86, haL: 85 };
export const LOOK_BACK = { ...STAND, yawU: 0.45, yawH: -1, spine: -92, neck: -95, head: -100, shR: 97, elR: 100, shL: 84, elL: 80, haL: 78, thR: 86, snR: 92 };
export const STAND_BACK = { ...REST, yaw: 2, spine: -90, neck: -90, head: -90, thR: 89, snR: 90, thL: 91, snL: 90, ftR: 90, ftL: 90, shR: 96, elR: 97, haR: 97, shL: 84, elL: 83, haL: 83 };
export const REACH_BACK = { ...STAND_BACK, yaw: 1.7, spine: -88, head: -86, shR: -38, elR: -30, haR: -26, shL: 92, elL: 94, haL: 95 };
export const FACE = { ...REST, yaw: 0, thR: 89, snR: 90, thL: 91, snL: 90, ftR: 90, ftL: 90, shR: 96, elR: 97, haR: 97, shL: 84, elL: 83, haL: 83 };
export const REACH_FRONT = { ...FACE, shR: 150, elR: 160, haR: 164, spine: -92, head: -95 };

/** a reach, as a function of seconds since it began */
export function reachPose(lt, front = false) {
  const base = front ? FACE : STAND_BACK;
  const tgt = front ? REACH_FRONT : REACH_BACK;
  const up = ease.io3(clamp(lt / 1.6));
  const hold = lt > 1.6 && lt < 5.5 ? 0.04 * Math.sin((lt - 1.6) * 2.1) : 0;
  const down = ease.io3(clamp((lt - 7.2) / 1.8));
  const p = mixPose(base, tgt, up * (1 - down));
  p.shR += hold * 30;
  return p;
}

// Movement III → T04: step toward the right and lift a fingertip to the far jamb
export const P_TOUCH = { ...STAND_BACK, yaw: 1.55, yawH: 1.35, spine: -89, neck: -86, head: -84, shR: 8, elR: -8, haR: -14, shL: 96, elL: 99, haL: 100, thR: 86, snR: 91 };
export const P_X_TOUCH = 12; // door units right of the centre line
export function pAtWall(t, t0 = 98.2, t1 = 100.2, Xt = P_X_TOUCH) {
  const k = es(t, t0, t1, ease.io3);
  return { pose: mixPose(STAND_BACK, P_TOUCH, k), X: lerp(0, Xt, k), k };
}
