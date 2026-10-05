import { testRig } from './test_rig.mjs';
import { sceneA } from './a_scene.mjs';
import { drawCorridorScene } from './b_corridor.mjs';
import { drawProfileScene } from './b_profile.mjs';
import { drawT05 } from './c_t05.mjs';
import { drawWave } from './c_wave.mjs';
import { drawKaleido } from './d_kaleido.mjs';
import { drawLineScene } from './d_line.mjs';
import { drawEnding } from './d_bed.mjs';
import { M } from '../timeline.mjs';

const sceneB = {
  name: 'B', t0: 80, t1: 147.1,
  render: (pt, t) => (t < M.layer2 ? drawCorridorScene(pt, t) : t < M.on114 ? drawProfileScene(pt, t) : drawT05(pt, t)),
};

const sceneC = { name: 'C', t0: 147.1, t1: 190, render: (pt, t) => drawWave(pt, t) };

const sceneD = { name: 'D', t0: 190, t1: 256.8, render: (pt, t) => (t < 203 ? drawKaleido(pt, t) : t < 224 ? drawLineScene(pt, t) : drawEnding(pt, t)) };

// Film scenes in timeline order. Each: {name, t0, t1, render(pt, t, frame)}
export const SCENES = [testRig, sceneA, sceneB, sceneC, sceneD];
