// Many traceUnion calls on the shared mask canvas: does time per call or memory grow?
// Run only under tools/render_guard.py.  usage: node tools/memtest_trace.mjs [calls]
import { traceUnion } from '../src/lib/trace.mjs';
if (process.env.BL_GUARDED !== '1') process.exit(2);
const n = parseInt(process.argv[2] || '3000');
const MB = 1 << 20, rss = () => (process.memoryUsage().rss / MB).toFixed(0);
const tick = () => new Promise((r) => setImmediate(r));
const poly = (i) => {
  const out = [];
  for (let k = 0; k < 120; k++) {
    const a = (k / 120) * Math.PI * 2, r = 180 + 40 * Math.sin(k * 0.3 + i * 0.1);
    out.push([600 + i % 50 + Math.cos(a) * r, 400 + Math.sin(a) * r * (0.6 + (i % 7) * 0.05)]);
  }
  return out;
};
let t = performance.now();
for (let i = 1; i <= n; i++) {
  traceUnion([poly(i), poly(i + 3).map(([x, y]) => [x + 90, y + 40])], 1.5, { smooth: 2 });
  if (i % 20 === 0) await tick();
  if (i % (n / 6) === 0) {
    const now = performance.now();
    console.log(`calls ${i}: ${((now - t) / (n / 6)).toFixed(2)} ms/call, rss ${rss()} MB`);
    t = now;
  }
}
await new Promise((r) => setTimeout(r, 1200));
