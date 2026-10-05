// Rig test sheet (not part of the film timeline)
import { drawProtagonist, drawCompanion, REST } from '../lib/rig.mjs';
import { handGeom, drawHand } from '../lib/hand.mjs';
import { PAL } from '../lib/palette.mjs';

export const testRig = {
  name: 'test',
  t0: -1,
  t1: -1,
  render(pt, t) {
    pt.paper();
    const poses = [
      { yaw: 1 },
      { yaw: 1, shR: 20, elR: -10, haR: -10, thR: 60, snR: 110, thL: 115, snL: 100, spine: -84 },
      { yaw: 0 },
      { yaw: 2, shR: 60, elR: 40 },
      { yaw: -1, head: -120, neck: -100 },
    ];
    poses.forEach((p, i) => drawProtagonist(pt, { pose: { ...REST, ...p }, X: 180 + i * 190, Y: 360, S: 300, trace: 1 }));
    drawCompanion(pt, { pose: { ...REST, yaw: 1, shL: 20, elL: -20, haL: -20 }, X: 1150, Y: 360, S: 300 });
    drawCompanion(pt, { pose: { ...REST, yaw: 0, shL: 150, elL: 170 }, X: 1350, Y: 360, S: 300 });
    const h1 = handGeom({ x: 350, y: 1000, rot: 0, scale: 190, mirror: 1, curl: [0.1, 0.1, 0.1, 0.1, 0.1], spread: 1 });
    drawHand(pt, h1, { style: 'protagonist', traceAlpha: 1 });
    const h2 = handGeom({ x: 800, y: 1000, rot: 0.2, scale: 190, mirror: 1, curl: [0.2, 0.6, 0.7, 0.8, 0.9], spread: 0.5 });
    drawHand(pt, h2, { style: 'protagonist', view: 'palmar' });
    const h3 = handGeom({ x: 1350, y: 1000, rot: -0.3, scale: 190, mirror: 1, curl: [0, 0, 0, 0, 0], spread: 1.2 });
    drawHand(pt, h3, { style: 'companion', view: 'palmar' });
    const h4 = handGeom({ x: 1750, y: 1000, rot: 0, scale: 190, mirror: -1, curl: [0.1, 0.4, 0.4, 0.5, 0.5], spread: 0.6 });
    drawHand(pt, h4, { style: 'companion', view: 'dorsal' });
  },
};
