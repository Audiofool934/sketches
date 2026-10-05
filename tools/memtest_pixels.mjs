// Does reading pixels back retain memory? getImageData vs canvas.data(), with and without yielding
// to the event loop (native finalizers only run when the loop turns). The process pauses at the end
// so the guard can read its lifetime maximum footprint from the kernel.
// Run only under tools/render_guard.py.  usage: node tools/memtest_pixels.mjs <mode> [iterations]
import { createCanvas } from '@napi-rs/canvas';

if (process.env.BL_GUARDED !== '1') process.exit(2);
const c = createCanvas(1920, 1080), ctx = c.getContext('2d');
ctx.fillStyle = '#ece3cf';
ctx.fillRect(0, 0, 1920, 1080);
const MB = 1 << 20, rss = () => (process.memoryUsage().rss / MB).toFixed(0);
const mode = process.argv[2];
const n = parseInt(process.argv[3] || '240');
const tick = () => new Promise((r) => setImmediate(r));
const out = [];
for (let i = 1; i <= n; i++) {
  if (mode.startsWith('gid')) {
    const d = ctx.getImageData(0, 0, 1920, 1080).data;
    if (d[3] !== 255) throw new Error('unexpected pixel');
  } else if (mode.startsWith('data')) {
    const d = c.data();
    if (d.length !== 1920 * 1080 * 4) throw new Error('unexpected size');
  } else if (mode.startsWith('mask')) {
    // the trace mask pattern: many mid-size readbacks inside one frame
    for (let k = 0; k < 20; k++) ctx.getImageData(0, 0, 700, 500);
  }
  if (mode.endsWith('await')) await tick();
  if (i % Math.max(1, n / 6) === 0) out.push(`${i}:${rss()}`);
}
console.log(mode.padEnd(10), 'rss MB by iteration', out.join('  '));
await new Promise((r) => setTimeout(r, 1500));
