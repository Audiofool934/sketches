// Module B shared camera geometry (no scene imports, so both parts can use it)
import { es, ease, lerp } from '../lib/math.mjs';
import { projUV, COR } from '../lib/corridor.mjs';
import { M } from '../timeline.mjs';

export const BX = 960, BY = 952.5, BPX = 2.5;
export const P_SIZE = 72;
// the walker stops here after the entry (22 u/s from the threshold, eased stop 86.2 → 88.6)
export const Z_STOP = 22 * (80 - M.open) + 22 * (86.2 - 80) + 22 * 1.2;
export const ZC_STOP = Z_STOP + 118;
// before the fold: walks on along the right wall, fingertip trailing; the camera cranes down and eases back
export const T_WALL0 = 95.5;
export const Z_WALL = 330, X_WALL = 33, ZC_T = 250;
export const wallK = (t) => es(t, T_WALL0, M.layer2, ease.io2);
export const eyeAt = (t) => lerp(COR.VPV, 40, es(t, T_WALL0, M.layer2, ease.io3));
export const panAt = (t) => lerp(-300 * es(t, 80.4, 86.8, ease.io3), -150, es(t, T_WALL0, M.layer2, ease.io3));
export const zcamWall = (t) => lerp(ZC_STOP, ZC_T, es(t, T_WALL0, M.layer2, ease.io3));
export const pDepthWall = (t) => lerp(Z_STOP, Z_WALL, wallK(t));
export const pXWall = (t) => lerp(0, X_WALL, es(t, T_WALL0 + 0.8, M.layer2, ease.io3));
export function scrB(X, Y, z, zcam, t) {
  const r = projUV(X, Y, z, zcam, eyeAt(t));
  if (!r) return null;
  return [BX + r[0] * BPX, BY - r[1] * BPX + panAt(t), r[2]];
}
export const K2 = 2; // the nearest doorframe ahead: its jamb becomes the nose bridge
