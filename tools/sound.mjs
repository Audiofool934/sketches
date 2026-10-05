// Render the soundtrack to out/soundtrack.wav (48 kHz, 24-bit stereo).
//
//   node tools/sound.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { ROOT } from "./lib.mjs";

// The page's classic scripts attach themselves to globalThis.FM.
for (const f of ["src/clock.js", "src/kit.js", "src/optics.js", "src/motion.js", "src/sound.js"]) {
  vm.runInThisContext(readFileSync(resolve(ROOT, f), "utf8"), { filename: f });
}
const SR = 48000;
if (process.argv.includes("--stems")) {
  const { music, fx, lufs } = globalThis.FM.sound.render(SR, { stems: true });
  const part = (b, a, z) => ({ L: b.L.subarray(a * SR, z * SR), R: b.R.subarray(a * SR, z * SR) });
  console.log(`music ${lufs(music).toFixed(1)} LUFS, effects ${lufs(fx).toFixed(1)} LUFS (whole film, before mastering)`);
  for (const [a, z] of [[0, 10], [10, 22.5], [22.5, 42.5], [42.5, 57.5], [57.5, 72.5]]) {
    console.log(`  ${a}-${z} s: music ${lufs(part(music, a, z)).toFixed(1)}, effects ${lufs(part(fx, a, z)).toFixed(1)}`);
  }
  process.exit(0);
}
const started = Date.now();
const { L, R, lufs, peak } = globalThis.FM.sound.render(SR);
console.log(`rendered ${(L.length / SR).toFixed(2)} s in ${((Date.now() - started) / 1000).toFixed(1)} s`);
console.log(`integrated loudness ${lufs.toFixed(2)} LUFS, true peak ${peak.toFixed(2)} dBTP`);

function wav24(L, R, SR) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 6);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 6, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 6, 28);
  buf.writeUInt16LE(6, 32);
  buf.writeUInt16LE(24, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 6, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (const v of [L[i], R[i]]) {
      const x = Math.max(-8388608, Math.min(8388607, Math.round(v * 8388607)));
      buf.writeIntLE(x, o, 3);
      o += 3;
    }
  }
  return buf;
}
mkdirSync(resolve(ROOT, "out"), { recursive: true });
const out = resolve(ROOT, "out/soundtrack.wav");
writeFileSync(out, wav24(L, R, SR));
console.log(`wrote ${out}`);
