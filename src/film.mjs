// Film entry: one absolute time reference (seconds from the first audio sample)
// drives every scene. renderFrame(t) is a pure function of t, so frames can be
// rendered in any order, in parallel, and seeking is exact.
import { createCanvas } from '@napi-rs/canvas';
import { loadTextures } from './lib/textures.mjs';
import { Painter, ensurePatternImage, warmupPatternFallback, drawWithPatterns } from './lib/draw.mjs';
import { SCENES } from './scenes/index.mjs';

export const FPS = 24;
export const DURATION = 256.705306; // measured audio duration (s)
export const FRAMES = Math.ceil(DURATION * FPS); // 6161

export async function createFilm({ scale = 1, animatic = false, only = null } = {}) {
  const tex = await loadTextures();
  const W = 1920, H = 1080;
  const canvas = createCanvas(Math.round(W * scale), Math.round(H * scale));
  const ctx = canvas.getContext('2d');
  const pt = new Painter(ctx, tex, { W, H, animatic });
  await warmupPatternFallback();
  for (const src of Object.values(tex)) await ensurePatternImage(src);
  function resetContext(g) {
    // Drawing leaves native surfaces in the context. reset() drops them; without it a
    // 1080p frame retains on the order of ten full framebuffers every frame.
    g.reset();
  }
  function drawFrame(frame) {
    // A pattern miss throws out through ctx.save, pt.ctx swaps and scene camera settings.
    // Put all of them back before drawing.
    pt.ctx = ctx;
    pt.zoom = 1;
    pt.lineComp = 0;
    resetContext(ctx);
    for (const layer of pt.scratch.values()) resetContext(layer.getContext('2d'));
    const t = frame / FPS;
    pt.frame = frame;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = '#ece3cf';
    ctx.fillRect(0, 0, W, H);
    const list = only ? SCENES.filter((s) => s.name === only) : SCENES.filter((s) => t >= s.t0 && t < s.t1);
    for (const s of list) {
      ctx.save();
      s.render(pt, t, frame);
      ctx.restore();
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    pt.finish();
    return canvas;
  }
  function render(frame) {
    return drawWithPatterns(() => drawFrame(frame));
  }
  return { canvas, ctx, pt, render, W, H, scale };
}
