// The soundtrack, synthesized from the clock (src/clock.js) and the camera's motion
// (src/motion.js). Plain JavaScript, no samples, seeded noise, so it renders the same in
// Node and in the page.
//
//   FM.sound.render(48000) -> { L, R, lufs, peak }   (normalized to -14 LUFS)
(function () {
  const FM = (globalThis.FM = globalThis.FM || {});
  const { T, BEAT, DURATION, at } = FM.clock;
  const O = FM.optics;
  const M = FM.motion;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const TAU = Math.PI * 2;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // RBJ biquad, processed in place.
  function biquad(type, f0, Q, SR) {
    const w0 = (TAU * Math.min(f0, SR * 0.45)) / SR;
    const cs = Math.cos(w0);
    const al = Math.sin(w0) / (2 * Q);
    let b0, b1, b2;
    if (type === "lp") [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
    else if (type === "hp") [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    else [b0, b1, b2] = [al, 0, -al]; // band-pass, 0 dB peak
    const a0 = 1 + al;
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cs) / a0, a2: (1 - al) / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
  }
  function bq(f, x) {
    const y = f.b0 * x + f.b1 * f.x1 + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2;
    f.x2 = f.x1;
    f.x1 = x;
    f.y2 = f.y1;
    f.y1 = y;
    return y;
  }
  function blepSaw(ph, dt) {
    let v = 2 * ph - 1;
    if (ph < dt) {
      const x = ph / dt;
      v -= x + x - x * x - 1;
    } else if (ph > 1 - dt) {
      const x = (ph - 1) / dt;
      v -= x * x + x + x + 1;
    }
    return v;
  }

  function render(SR = 48000, opts = {}) {
    const N = Math.ceil(DURATION * SR);
    const mk = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
    const music = mk();
    const fx = mk();
    const send = mk(); // into the reverb
    const echo = mk(); // into the ping-pong delay
    const rnd = mulberry32(1607);
    const noise = () => rnd() * 2 - 1;

    // Write a mono voice into a bus with an equal-power pan, plus optional sends.
    function put(bus, t0, buf, gain, pan = 0, rev = 0, del = 0) {
      const i0 = Math.round(t0 * SR);
      const a = ((pan + 1) * Math.PI) / 4;
      const gl = Math.cos(a) * gain;
      const gr = Math.sin(a) * gain;
      for (let i = 0; i < buf.length; i++) {
        const k = i0 + i;
        if (k < 0) continue;
        if (k >= N) break;
        const v = buf[i];
        bus.L[k] += v * gl;
        bus.R[k] += v * gr;
        if (rev) {
          send.L[k] += v * gl * rev;
          send.R[k] += v * gr * rev;
        }
        if (del) {
          echo.L[k] += v * gl * del;
          echo.R[k] += v * gr * del;
        }
      }
    }
    const len = (s) => Math.max(1, Math.round(s * SR));

    // The film's state as sound: how sharp the music is. Wide detune and a dark filter mean
    // blur; both close in as the aperture stops down in parts A and D.
    function sharpness(t) {
      if (t < T.stopsA[0]) return 0;
      if (t < T.cone) return clamp01((M.stopA(t) - 1) / 7);
      if (t < T.chart) return 0.75;
      if (t < T.stopsD[0]) return 0;
      if (t < T.answer) return clamp01((M.stopD(t) - 1) / 7);
      return 0.85;
    }
    const detuneAt = (t) => 3 + 16 * (1 - sharpness(t));
    const cutoffAt = (t) => 760 * Math.pow(2.5, sharpness(t));

    // -------------------------------------------------------------- instruments

    // A warm pad note: two detuned band-limited saws through a low-pass. Detune and cutoff
    // follow the film's sharpness at the note's absolute time.
    function padNote(midi, t0, dur, bright = 1) {
      const out = new Float32Array(len(dur + 1.6));
      const f = mtof(midi);
      let lp = biquad("lp", 900, 0.6, SR);
      let lp2 = biquad("lp", 1200, 0.5, SR);
      let p1 = rnd();
      let p2 = rnd();
      let d1 = 0;
      let d2 = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        if (i % 128 === 0) {
          const ta = t0 + t;
          const c = detuneAt(ta);
          d1 = (f * Math.pow(2, c / 1200)) / SR;
          d2 = (f * Math.pow(2, -c / 1200)) / SR;
          const fc = cutoffAt(ta) * bright;
          lp = Object.assign(biquad("lp", fc, 0.6, SR), { x1: lp.x1, x2: lp.x2, y1: lp.y1, y2: lp.y2 });
          lp2 = Object.assign(biquad("lp", fc * 1.4, 0.5, SR), { x1: lp2.x1, x2: lp2.x2, y1: lp2.y1, y2: lp2.y2 });
        }
        const env = Math.min(1, t / 0.55) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.45));
        p1 += d1;
        if (p1 >= 1) p1 -= 1;
        p2 += d2;
        if (p2 >= 1) p2 -= 1;
        const v = (blepSaw(p1, d1) + blepSaw(p2, d2)) * 0.5;
        out[i] = bq(lp2, bq(lp, v)) * env;
      }
      return out;
    }

    // A glassy FM pluck.
    function glass(midi, vel = 1, decay = 0.5, index = 1.6) {
      const out = new Float32Array(len(decay * 5));
      const f = mtof(midi);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const idx = index * Math.exp(-t / 0.045) + 0.22;
        const m = Math.sin(TAU * f * 3 * t) * idx;
        const env = Math.min(1, t / 0.003) * Math.exp(-t / decay);
        out[i] = Math.sin(TAU * f * t + m) * env * vel;
      }
      return out;
    }

    // A soft, round pluck for the cones: sine with a gentle second partial and a slow attack.
    function bloop(midi, decay = 0.22) {
      const out = new Float32Array(len(decay * 6));
      const f = mtof(midi);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const env = Math.min(1, t / 0.012) * Math.exp(-t / decay);
        const bend = 1 + 0.03 * Math.exp(-t / 0.02);
        out[i] = (Math.sin(TAU * f * bend * t) + 0.2 * Math.sin(TAU * 2 * f * t)) * env;
      }
      return out;
    }

    function sub(midi, dur, decay = Infinity) {
      const out = new Float32Array(len(dur + 0.4));
      const f = mtof(midi);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const env = Math.min(1, t / 0.02) * Math.exp(-t / decay) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.12));
        const s = Math.sin(TAU * f * t) + 0.12 * Math.sin(TAU * 2 * f * t);
        out[i] = Math.tanh(s * 1.2) * env;
      }
      return out;
    }

    function kick(level = 1) {
      const out = new Float32Array(len(0.5));
      let ph = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const f = 46 + 95 * Math.exp(-t / 0.032);
        ph += f / SR;
        out[i] = (Math.sin(TAU * ph) * Math.exp(-t / 0.26) + (t < 0.002 ? noise() * 0.3 : 0)) * level;
      }
      return out;
    }

    function noiseHit(f0, Q, decay, dur = decay * 6, attack = 0.0008) {
      const out = new Float32Array(len(dur));
      const bp = biquad("bp", f0, Q, SR);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        out[i] = bq(bp, noise()) * Math.min(1, t / attack) * Math.exp(-t / decay);
      }
      return out;
    }

    function ping(f, decay, h2 = 0.25, dur = decay * 6) {
      const out = new Float32Array(len(dur));
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        out[i] = (Math.sin(TAU * f * t) + h2 * Math.sin(TAU * 2 * f * t)) * Math.min(1, t / 0.0015) * Math.exp(-t / decay);
      }
      return out;
    }

    function thump(f0, f1, decay) {
      const out = new Float32Array(len(decay * 6));
      let ph = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        ph += (f1 + (f0 - f1) * Math.exp(-t / 0.02)) / SR;
        out[i] = Math.sin(TAU * ph) * Math.exp(-t / decay);
      }
      return out;
    }

    // A wood block: a falling sine and a click.
    function tock(f0, decay = 0.045) {
      const out = new Float32Array(len(decay * 6));
      let ph = 0;
      let ph2 = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const f = f0 * (1 + 0.5 * Math.exp(-t / 0.004));
        ph += f / SR;
        ph2 += (f * 2.72) / SR;
        const env = Math.exp(-t / decay);
        out[i] = (Math.sin(TAU * ph) + 0.28 * Math.sin(TAU * ph2) * Math.exp(-t / 0.012)) * env + (t < 0.0015 ? noise() * 0.4 : 0);
      }
      return out;
    }

    // A domino set down on lacquer: a hard click, a second smaller one as it settles.
    function clack(f0) {
      const out = new Float32Array(len(0.18));
      const a = tock(f0, 0.022);
      const b = tock(f0 * 1.18, 0.012);
      const off = len(0.007);
      for (let i = 0; i < out.length; i++) {
        out[i] = (i < a.length ? a[i] : 0) + (i >= off && i - off < b.length ? 0.45 * b[i - off] : 0);
      }
      return out;
    }

    // Band-passed noise that sweeps between two frequencies.
    function whoosh(dur, fA, fB, seedShift) {
      const out = new Float32Array(len(dur));
      const r = mulberry32(1000 + seedShift);
      let f = biquad("bp", fA, 1.4, SR);
      const lp = biquad("lp", 6000, 0.7, SR);
      for (let i = 0; i < out.length; i++) {
        const x = i / out.length;
        if (i % 64 === 0) {
          const fc = fA * Math.pow(fB / fA, x);
          f = Object.assign(biquad("bp", fc, 1.4, SR), { x1: f.x1, x2: f.x2, y1: f.y1, y2: f.y2 });
        }
        const env = Math.pow(Math.sin(Math.PI * x), 1.6);
        out[i] = bq(lp, bq(f, r() * 2 - 1)) * env;
      }
      return out;
    }
    function whooshAt(t, dur, up, gain = 0.3) {
      const [fA, fB] = up ? [320, 2600] : [2600, 320];
      put(fx, t, whoosh(dur, fA, fB, Math.round(t * 10)), gain, -0.7, 0.25);
      put(fx, t, whoosh(dur, fA * 1.06, fB * 0.94, Math.round(t * 10) + 7), gain, 0.7, 0.25);
    }

    // Film grain: sparse impulses, each a tiny band-passed crack. coarse: bigger grains.
    function crackle(dur, rate, f0, seed) {
      const out = new Float32Array(len(dur));
      const r = mulberry32(seed);
      let next = 0;
      for (let i = 0; i < out.length; i++) {
        if (i >= next) {
          const amp = 0.3 + r() * 0.7;
          const L = Math.round(SR * (0.0015 + r() * 0.003));
          const fq = f0 * (0.7 + r() * 0.6);
          const sign = r() < 0.5 ? -1 : 1;
          for (let k = 0; k < L && i + k < out.length; k++) {
            out[i + k] += Math.sin((TAU * fq * k) / SR) * Math.exp(-k / (L * 0.25)) * amp * sign;
          }
          next = i + Math.round((-Math.log(1 - r()) * SR) / rate);
        }
      }
      const env = (x) => Math.min(1, x / 0.15) * Math.min(1, (out.length / SR - x) / 0.25);
      for (let i = 0; i < out.length; i++) out[i] *= env(i / SR);
      return out;
    }

    // ------------------------------------------------------------------ the score

    // A-flat major, with ninths. pad: the voicing above the bass.
    const CH = {
      Ab: { bass: 44, pad: [60, 63, 67, 70] },
      Fm: { bass: 41, pad: [56, 60, 63, 67] },
      Db: { bass: 37, pad: [53, 56, 60, 63] },
      Ebs: { bass: 39, pad: [58, 61, 63, 68] },
      Eb: { bass: 39, pad: [55, 58, 63, 70] },
      Bbm: { bass: 34, pad: [56, 61, 65, 72] },
      Cm: { bass: 36, pad: [55, 58, 63, 67] },
    };
    // bar -> [chord, pad level, arp level, bass level]
    const plan = {
      1: ["Ab", 1.25, 0, 0.8], 2: ["Ab", 1.3, 0.45, 0.9], 3: ["Fm", 1.3, 0.5, 0.95], 4: ["Ebs", 1.15, 0.8, 1],
      5: ["Ab", 1, 0.8, 1], 6: ["Fm", 1, 1, 1], 7: ["Db", 1, 1, 1], 8: ["Ebs", 1, 0.9, 1], 9: ["Ab", 1, 0.9, 1],
      10: ["Fm", 1, 0.8, 1], 11: ["Db", 1, 0.7, 1], 12: ["Cm", 0.9, 0.6, 0.9], 13: ["Ebs", 0.9, 0.7, 1],
      14: ["Fm", 1.15, 1, 1.15], 15: ["Db", 1, 1, 1], 16: ["Bbm", 1, 0.9, 1], 17: ["Ebs", 1.05, 0.9, 1.05],
      18: ["Ab", 1.3, 0.8, 1.15], 19: ["Fm", 1.35, 0.9, 1.2], 20: ["Db", 1.05, 0.5, 1.05], 21: ["Eb", 1.1, 0.5, 1.1],
      22: ["Ab", 1.2, 1.1, 1.2], 23: ["Fm", 1.05, 1, 1.05],
      24: ["Db", 1, 0.9, 1], 25: ["Ab", 1, 1, 1], 26: ["Fm", 1, 1, 1], 27: ["Ebs", 1.05, 1, 1.05], 28: ["Ab", 1.25, 0.8, 1.2], 29: ["Ab", 0.9, 0.3, 0.8],
    };
    const ARP = [3, 2, 1, 2, 3, 1, 2, 0];
    for (const [barS, [name, padL, arpL, bassL]] of Object.entries(plan)) {
      const bar = Number(barS);
      const t0 = at(bar);
      const ch = CH[name];
      const startAt = bar === 1 ? 0.35 : t0;
      const dur = at(bar + 1) - startAt;
      ch.pad.forEach((m, k) => {
        put(music, startAt, padNote(m, startAt, dur + 0.05, 1 + 0.12 * k), 0.034 * padL, k % 2 ? 0.45 : -0.45, 0.5);
      });
      for (let b = 0; b < 4; b += 2) {
        const tb = t0 + b * BEAT;
        if (tb < startAt - 1e-6) continue;
        put(music, tb, sub(ch.bass, BEAT * 2 - 0.04, 0.55), 0.075 * bassL, 0, 0);
      }
      if (arpL > 0) {
        for (let k = 0; k < 8; k++) {
          const t = t0 + k * (BEAT / 2);
          if (bar >= 29 && (k % 2 || k > 4)) continue;
          const note = ch.pad[ARP[k]] + 12;
          const vel = (k % 2 ? 0.7 : 1) * (k === 0 ? 1.15 : 1);
          // blurred passages play the arpeggio softer and duller
          const sh = sharpness(t);
          put(music, t, glass(note, vel, 0.42, 0.9 + 0.9 * sh), 0.05 * arpL * (0.7 + 0.3 * sh), ((k % 4) - 1.5) * 0.35, 0.35, 0.3);
        }
      }
    }
    // the lockup chord rings out
    put(music, at(28, 1), glass(75, 1, 1.5), 0.05, 0, 0.6, 0.2);
    put(music, at(28, 1), glass(84, 0.8, 1.7), 0.04, 0.3, 0.6, 0.2);
    put(music, at(28, 1), glass(79, 0.7, 1.6), 0.035, -0.3, 0.6, 0.2);

    // drums under the eye and the chart, bars 14 to 17 and 20 to 23
    for (const bar of [14, 15, 16, 17, 20, 21, 22, 23]) {
      for (let b = 0; b < 4; b++) {
        const t = at(bar, b);
        if (b === 0 || b === 2) put(music, t, kick(), bar >= 20 ? 0.36 : 0.32, 0, 0.05);
        if ((b === 1 || b === 3) && bar >= 15) put(music, t, noiseHit(1900, 1.2, 0.02), 0.16, 0.1, 0.2);
      }
      for (let k = 0; k < 16; k++) {
        const t = at(bar) + k * (BEAT / 4);
        const acc = k % 4 === 2 ? 1 : k % 2 ? 0.45 : 0.7;
        put(music, t, noiseHit(7200, 0.9, 0.022), 0.055 * acc, 0.25, 0.1);
      }
    }

    // ----------------------------------------------------------------- effects

    function shutter(t, g = 1) {
      put(fx, t, noiseHit(1800, 0.9, 0.022), 0.75 * g, 0, 0.12);
      put(fx, t, thump(120, 55, 0.05), 0.45 * g, 0, 0.05);
      put(fx, t + 0.055, noiseHit(4500, 1.5, 0.007), 0.8 * g, 0, 0.12);
      put(fx, t + 0.055, ping(3200, 0.03, 0), 0.05 * g, 0, 0.2);
      put(fx, t + 0.115, noiseHit(2300, 1.1, 0.014), 0.38 * g, 0, 0.1);
    }
    // nine blades sliding: a fast run of tiny ticks
    function blades(t, dur, g = 1) {
      for (let k = 0; k < 9; k++) {
        const tt = t + (k / 9) * dur * (0.85 + 0.3 * rnd());
        put(fx, tt, noiseHit(6400 + 300 * k, 2.2, 0.003), 0.16 * g, (k / 8 - 0.5) * 0.8, 0.12);
      }
      put(fx, t, whoosh(dur + 0.15, 900, 2400, 3), 0.12 * g, 0, 0.2);
    }
    // an aperture detent; k is the stop it lands on, and its ping climbs the A-flat scale
    const SCALE = [80, 82, 84, 85, 87, 89, 91, 92];
    function apClick(t, k, g = 1) {
      put(fx, t, noiseHit(5600, 2, 0.0035), 0.5 * g, 0, 0.1);
      put(fx, t, thump(200, 110, 0.02), 0.14 * g, 0, 0);
      put(fx, t, ping(mtof(SCALE[k - 1]), 0.09, 0.15, 0.5), 0.07 * g, 0, 0.25, 0.12);
    }

    // A. the iris opens on an impact
    shutter(T.open);
    blades(0.03, 0.42);
    put(fx, 0.02, thump(70, 34, 0.32), 0.6, 0, 0.25);
    put(fx, 0.02, noiseHit(900, 0.6, 0.09, 0.6, 0.002), 0.3, 0, 0.4);

    // the focus ring: a friction glide whose pitch follows the lens's travel
    {
      const t0 = T.rack1 - 0.05;
      const t1 = T.rack3 + 1.3;
      const out = new Float32Array(len(t1 - t0));
      const r = mulberry32(31);
      let bp = biquad("bp", 900, 2.2, SR);
      const ext = (t) => (O.f * M.focusA(t)) / (M.focusA(t) - O.f);
      const v0 = O.extension(O.FOCUS);
      let ph = 0;
      let env = 0;
      let target = 0;
      let fTone = 450;
      for (let i = 0; i < out.length; i++) {
        const t = t0 + i / SR;
        if (i % 64 === 0) {
          const v = ext(t);
          const speed = Math.abs(ext(t + 0.004) - ext(t - 0.004)) / 0.008;
          const fc = 900 * Math.pow(v / v0, 87);
          bp = Object.assign(biquad("bp", fc, 2.2, SR), { x1: bp.x1, x2: bp.x2, y1: bp.y1, y2: bp.y2 });
          target = Math.min(1, speed / 1.6);
          fTone = fc * 0.5;
        }
        env += (target - env) * 0.002;
        ph += fTone / SR;
        out[i] = (bq(bp, r() * 2 - 1) * 0.9 + Math.sin(TAU * ph) * 0.12) * env;
      }
      put(fx, t0, out, 0.62, 0, 0.2);
    }
    // a soft confirm when each rack settles
    for (const tr of [T.rack1, T.rack2, T.rack3]) put(fx, tr + 0.42, ping(2640, 0.05, 0.1), 0.05, 0.2, 0.25);

    // the stop-down: seven detents, climbing
    T.stopsA.forEach((t, i) => apClick(t, i + 2, 1.2));
    // the question
    put(fx, T.why, glass(87, 0.8, 0.6), 0.04, 0.2, 0.5, 0.25);

    // B. the cone
    whooshAt(T.cone, 0.9, false);
    {
      // light leaving a point: a sparkle of high glass
      for (let k = 0; k < 14; k++) {
        const tt = T.burst + k * 0.035 + rnd() * 0.02;
        put(fx, tt, glass(84 + ((k * 5) % 12), 0.5, 0.18, 1.2), 0.02, (rnd() * 2 - 1) * 0.8, 0.5);
      }
    }
    whooshAt(T.fold, 0.6, false, 0.18);
    put(fx, T.fold + 0.38, ping(mtof(87), 0.25, 0.1), 0.06, 0, 0.4, 0.2);
    whooshAt(T.nearer, 0.55, true, 0.2);
    whooshAt(T.farther, 0.6, false, 0.2);
    blades(T.irisB, 0.4, 0.8);
    blades(T.irisBOpen, 0.4, 0.8);
    // the focus tone: three voices on E-flat that spread apart as the disc grows
    {
      const t0 = T.fold + 0.3;
      const t1 = T.grid + 0.5;
      const out = new Float32Array(len(t1 - t0));
      const f = mtof(75);
      const ph = [0, 0, 0];
      let c = 0;
      for (let i = 0; i < out.length; i++) {
        const t = t0 + i / SR;
        if (i % 64 === 0) c = M.opticsB(t).disc * 0.24;
        const fr = [f, f * Math.pow(2, c / 1200), f * Math.pow(2, -c / 1200)];
        let v = 0;
        for (let k = 0; k < 3; k++) {
          ph[k] += fr[k] / SR;
          v += Math.sin(TAU * ph[k]);
        }
        const env = Math.min(1, (t - t0) / 0.3) * Math.min(1, (t1 - t) / 0.4);
        out[i] = (v / 3) * env;
      }
      put(fx, t0, out, 0.035, 0, 0.3);
    }

    // C. the mosaics
    whooshAt(T.grid - 0.15, 1.0, false, 0.26);
    for (const s of [{ t: T.dot, f: 2093 }, { t: T.smallDisc, f: 2093 }]) {
      put(fx, s.t, glass(91, 0.5, 0.12), 0.03, 0, 0.3);
      // the photosite reads it: the same tick for the point and the small disc
      put(fx, s.t + 0.42, ping(s.f, 0.035, 0.05), 0.13, 0, 0.12);
      put(fx, s.t + 0.42, noiseHit(8000, 2, 0.002), 0.08, 0, 0);
    }
    put(fx, T.bigDisc, glass(84, 0.5, 0.16), 0.03, 0.3, 0.3);
    for (let k = 0; k < 9; k++) put(fx, T.bigDisc + 0.42 + k * 0.016, ping(1568 + 40 * k, 0.03, 0.05), 0.045, 0.3 + (k - 4) * 0.04, 0.12);
    // film grain, then bigger grain
    put(fx, T.grain, crackle(T.fastFilm - T.grain + 0.2, 160, 5200, 3), 0.11, -0.2, 0.05);
    put(fx, T.grain, crackle(T.fastFilm - T.grain + 0.2, 160, 5000, 4), 0.11, 0.2, 0.05);
    put(fx, T.fastFilm, crackle(T.cones - T.fastFilm + 0.3, 55, 2100, 5), 0.2, -0.2, 0.05);
    put(fx, T.fastFilm, crackle(T.cones - T.fastFilm + 0.3, 55, 2000, 6), 0.2, 0.2, 0.05);
    // cones bubble in from the middle
    {
      const notes = [68, 72, 75, 79, 80, 84, 87];
      for (let k = 0; k < 22; k++) {
        const tt = T.cones + 0.05 + Math.pow(k / 22, 1.3) * 0.7;
        put(fx, tt, bloop(notes[(k * 3) % notes.length], 0.12), 0.05, (rnd() * 2 - 1) * 0.6, 0.35);
      }
    }
    whooshAt(T.eye, 0.8, true, 0.2);
    // the hero: one arcminute, on a downbeat
    put(fx, T.arcmin, kick(1.1), 0.5, 0, 0.1);
    put(fx, T.arcmin, thump(80, 38, 0.3), 0.3, 0, 0.3);
    for (const [m, p] of [[80, -0.3], [87, 0.3], [91, 0]]) put(fx, T.arcmin, glass(m, 0.9, 0.9), 0.035, p, 0.6, 0.2);
    whooshAt(T.print, 0.7, false, 0.16);
    whooshAt(T.shrink, 0.6, true, 0.16);
    // the print shrinks back to the sensor: a falling glide
    {
      const t0 = T.shrink + 1.25;
      const out = new Float32Array(len(0.6));
      let ph = 0;
      for (let i = 0; i < out.length; i++) {
        const x = i / out.length;
        ph += (1400 * Math.pow(1 / 4.17, x)) / SR;
        out[i] = Math.sin(TAU * ph) * Math.sin(Math.PI * x) * 0.6;
      }
      put(fx, t0, out, 0.05, 0, 0.3, 0.15);
    }
    whooshAt(T.coc - 0.4, 0.8, false, 0.24);
    // the ring lands: the circle of confusion
    put(fx, T.coc + 0.35, ping(mtof(87), 0.4, 0.2, 2), 0.08, 0, 0.4, 0.2);
    put(fx, T.coc + 0.35, ping(mtof(94), 0.3, 0.1, 1.6), 0.035, 0.2, 0.4);
    put(fx, T.cocLabel, glass(91, 0.6, 0.5), 0.03, -0.2, 0.5, 0.2);

    // D. the chart
    whooshAt(T.chart, 0.6, false, 0.16);
    for (let i = 0; i < 8; i++) {
      const tt = T.chart + 0.25 + Math.abs(i - O.FOCUS_INDEX) * 0.1 + 0.05;
      put(fx, tt, tock(1700 + 90 * i, 0.02), 0.08, ((i / 7) * 2 - 1) * 0.7, 0.15);
    }
    put(fx, T.band, ping(mtof(87), 0.3, 0.15), 0.05, 0, 0.4);
    T.stopsD.forEach((t, i) => apClick(t, i + 2, 1));
    // each domino clacks when its disc fits the ring, panned to where it stands
    M.entries().forEach(({ i, t }) => {
      const pan = ((i / 7) * 2 - 1) * 0.75;
      put(fx, t, clack(2100 + 140 * i), 0.3, pan, 0.18);
    });
    put(fx, T.light, glass(84, 0.8, 0.8), 0.035, 0, 0.5, 0.2);

    // E. the answer
    blades(T.answer + 0.35, 0.8, 0.9);
    whooshAt(T.answer, 0.9, true, 0.2);
    put(fx, T.inFocus + 0.15, ping(mtof(87), 0.2, 0.1), 0.05, -0.1, 0.3);
    put(fx, T.inset, glass(91, 0.6, 0.3), 0.035, 0.4, 0.4);
    put(fx, T.inset + 0.05, whoosh(0.35, 600, 2200, 9), 0.1, 0.4, 0.2);
    blades(T.close, 0.6, 0.9);
    shutter(T.close + 0.6, 0.8);
    put(fx, T.close + 0.66, thump(95, 42, 0.22), 0.35, 0, 0.2);

    // ------------------------------------------------------------------- mix

    // ping-pong delay, a dotted eighth
    {
      const d = Math.round(BEAT * 0.75 * SR);
      const fb = 0.32;
      const lpL = biquad("lp", 3500, 0.7, SR);
      const lpR = biquad("lp", 3500, 0.7, SR);
      const bufL = new Float32Array(d);
      const bufR = new Float32Array(d);
      let k = 0;
      for (let i = 0; i < N; i++) {
        const yl = bufL[k];
        const yr = bufR[k];
        bufL[k] = bq(lpL, echo.R[i] + yr * fb);
        bufR[k] = bq(lpR, echo.L[i] + yl * fb);
        music.L[i] += yl;
        music.R[i] += yr;
        send.L[i] += yl * 0.3;
        send.R[i] += yr * 0.3;
        if (++k >= d) k = 0;
      }
    }

    // Freeverb
    {
      const scale = SR / 44100;
      const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
      const apT = [556, 441, 341, 225];
      const room = 0.86 * 0.28 + 0.7;
      const damp = 0.32 * 0.4;
      const mkComb = (n) => ({ b: new Float32Array(Math.round(n * scale)), i: 0, s: 0 });
      const mkAp = (n) => ({ b: new Float32Array(Math.round(n * scale)), i: 0 });
      for (const [ch, spread] of [["L", 0], ["R", 23]]) {
        const combs = combT.map((n) => mkComb(n + spread));
        const aps = apT.map((n) => mkAp(n + spread));
        const inp = send[ch];
        const outB = music[ch];
        const pre = biquad("hp", 180, 0.7, SR);
        for (let i = 0; i < N; i++) {
          const x = bq(pre, inp[i]) * 0.015;
          let y = 0;
          for (const c of combs) {
            const o = c.b[c.i];
            c.s = o * (1 - damp) + c.s * damp;
            c.b[c.i] = x + c.s * room;
            if (++c.i >= c.b.length) c.i = 0;
            y += o;
          }
          for (const a of aps) {
            const bo = a.b[a.i];
            const o = -y + bo;
            a.b[a.i] = y + bo * 0.5;
            if (++a.i >= a.b.length) a.i = 0;
            y = o;
          }
          outB[i] += y * 2.2;
        }
      }
    }

    if (opts.stems) return { music, fx, lufs: (b) => lufs(b.L, b.R, SR) };
    const L = new Float32Array(N);
    const R = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      L[i] = music.L[i] + fx.L[i];
      R[i] = music.R[i] + fx.R[i];
    }
    // a short fade at the very end
    const fadeN = len(1.8);
    for (let i = 0; i < fadeN; i++) {
      const g = Math.pow(Math.sin((Math.PI / 2) * (i / fadeN)), 2);
      L[N - 1 - i] *= g;
      R[N - 1 - i] *= g;
    }
    // DC block
    for (const ch of [L, R]) {
      const hp = biquad("hp", 20, 0.7, SR);
      for (let i = 0; i < N; i++) ch[i] = bq(hp, ch[i]);
    }
    return master(L, R, SR);
  }

  // ------------------------------------------------------------ loudness, limiting

  // Integrated loudness, ITU-R BS.1770-4 (K-weighted, gated). 48 kHz coefficients.
  function lufs(L, R, SR) {
    if (SR !== 48000) throw new Error("lufs() expects 48 kHz");
    const kw = (x) => {
      const y = new Float64Array(x.length);
      const s1 = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585] };
      const s2 = { b: [1.0, -2.0, 1.0], a: [-1.99004745483398, 0.99007225036621] };
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, w1 = 0, w2 = 0;
      for (let i = 0; i < x.length; i++) {
        const a = s1.b[0] * x[i] + s1.b[1] * x1 + s1.b[2] * x2 - s1.a[0] * y1 - s1.a[1] * y2;
        x2 = x1; x1 = x[i]; y2 = y1; y1 = a;
        const b = s2.b[0] * a + s2.b[1] * z1 + s2.b[2] * z2 - s2.a[0] * w1 - s2.a[1] * w2;
        z2 = z1; z1 = a; w2 = w1; w1 = b;
        y[i] = b * b;
      }
      return y;
    };
    const pl = kw(L);
    const pr = kw(R);
    const blk = Math.round(0.4 * SR);
    const hop = Math.round(0.1 * SR);
    const z = [];
    for (let s = 0; s + blk <= L.length; s += hop) {
      let a = 0;
      for (let i = s; i < s + blk; i++) a += pl[i] + pr[i];
      z.push(a / blk);
    }
    const lk = (p) => -0.691 + 10 * Math.log10(p);
    const abs = z.filter((p) => lk(p) > -70);
    if (!abs.length) return -Infinity;
    const thr = lk(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
    const rel = abs.filter((p) => lk(p) > thr);
    return lk(rel.reduce((a, b) => a + b, 0) / rel.length);
  }

  // Peak of a 4x oversampled signal (windowed-sinc interpolation), a true-peak estimate.
  function truePeak(x) {
    const taps = 12;
    const kernel = [];
    for (let ph = 1; ph < 4; ph++) {
      const k = [];
      for (let j = -taps; j <= taps; j++) {
        const d = j - ph / 4;
        const w = 0.5 + 0.5 * Math.cos((Math.PI * d) / (taps + 1));
        k.push(d === 0 ? 1 : (Math.sin(Math.PI * d) / (Math.PI * d)) * w);
      }
      kernel.push(k);
    }
    let peak = 0;
    for (let i = 0; i < x.length; i++) {
      const a = Math.abs(x[i]);
      if (a > peak) peak = a;
      if (a < peak * 0.5) continue;
      for (const k of kernel) {
        let s = 0;
        for (let j = -taps; j <= taps; j++) {
          const n = i + j;
          if (n >= 0 && n < x.length) s += x[n] * k[j + taps];
        }
        if (Math.abs(s) > peak) peak = Math.abs(s);
      }
    }
    return peak;
  }

  // Look-ahead limiter: the gain reaches its floor before the peak, then recovers slowly.
  function limit(L, R, SR, ceiling) {
    const n = L.length;
    const need = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
      need[i] = p > ceiling ? ceiling / p : 1;
    }
    const la = Math.round(0.004 * SR);
    // minimum of need[i .. i + la], with a monotonic queue
    const mins = new Float32Array(n);
    const q = new Int32Array(n);
    let head = 0;
    let tail = 0;
    for (let i = n - 1; i >= 0; i--) {
      while (tail > head && need[q[tail - 1]] >= need[i]) tail--;
      q[tail++] = i;
      while (q[head] > i + la) head++;
      mins[i] = need[q[head]];
    }
    // average over the last la samples, so the gain ramps down before each peak
    const rel = Math.exp(-1 / (0.09 * SR));
    let acc = la * mins[0];
    let g = mins[0];
    for (let i = 0; i < n; i++) {
      acc += mins[i] - (i >= la ? mins[i - la] : mins[0]);
      const target = Math.min(1, acc / la);
      g = target < g ? target : g * rel + target * (1 - rel);
      L[i] *= g;
      R[i] *= g;
    }
  }

  function master(L, R, SR) {
    const target = -14;
    for (let pass = 0; pass < 3; pass++) {
      const now = lufs(L, R, SR);
      const gain = Math.pow(10, (target - now) / 20);
      for (let i = 0; i < L.length; i++) {
        L[i] *= gain;
        R[i] *= gain;
      }
      limit(L, R, SR, Math.pow(10, -2.4 / 20));
    }
    const peak = Math.max(truePeak(L), truePeak(R));
    return { L, R, lufs: lufs(L, R, SR), peak: 20 * Math.log10(peak) };
  }

  FM.sound = { render, lufs, truePeak };
})();
