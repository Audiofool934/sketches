// The soundtrack, synthesized from the cue sheet in src/clock.js. Plain JavaScript, no
// samples, seeded noise, so it renders the same in Node and in the page.
//
//   FM.sound.render(48000) -> { L, R, lufs, peak }   (normalized to -14 LUFS)
(function () {
  const FM = (globalThis.FM = globalThis.FM || {});
  const { T, cues, BEAT, BAR, DURATION, at } = FM.clock;
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
    const rnd = mulberry32(96);
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

    // -------------------------------------------------------------- instruments

    // A warm pad note: two detuned band-limited saws through a low-pass, slow envelope.
    function padNote(midi, dur, cutoff = 1100) {
      const out = new Float32Array(len(dur + 1.6));
      const f = mtof(midi);
      const lp = biquad("lp", cutoff, 0.6, SR);
      const lp2 = biquad("lp", cutoff * 1.4, 0.5, SR);
      let p1 = rnd();
      let p2 = rnd();
      const d1 = (f * Math.pow(2, 6 / 1200)) / SR;
      const d2 = (f * Math.pow(2, -6 / 1200)) / SR;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
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
    function glass(midi, vel = 1, decay = 0.5) {
      const out = new Float32Array(len(decay * 5));
      const f = mtof(midi);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const idx = 1.6 * Math.exp(-t / 0.045) + 0.22;
        const m = Math.sin(TAU * f * 3 * t) * idx;
        const env = Math.min(1, t / 0.003) * Math.exp(-t / decay);
        out[i] = Math.sin(TAU * f * t + m) * env * vel;
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

    // Band-passed noise that sweeps between two frequencies; one buffer per channel.
    function whoosh(dur, fA, fB, seedShift) {
      const out = new Float32Array(len(dur));
      const r = mulberry32(1000 + seedShift);
      let f = biquad("bp", fA, 1.4, SR);
      const lp = biquad("lp", 6000, 0.7, SR);
      for (let i = 0; i < out.length; i++) {
        const x = i / out.length;
        if (i % 64 === 0) {
          const fc = fA * Math.pow(fB / fA, x);
          const nf = biquad("bp", fc, 1.4, SR);
          nf.x1 = f.x1;
          nf.x2 = f.x2;
          nf.y1 = f.y1;
          nf.y2 = f.y2;
          f = nf;
        }
        const env = Math.pow(Math.sin(Math.PI * x), 1.6);
        out[i] = bq(lp, bq(f, r() * 2 - 1)) * env;
      }
      return out;
    }

    // ------------------------------------------------------------------ the score

    const CH = {
      D: { bass: 38, pad: [57, 61, 64, 66] },
      Bm: { bass: 47 - 12, pad: [50, 57, 61, 64] },
      G: { bass: 43, pad: [54, 59, 62, 69] },
      A: { bass: 45, pad: [57, 59, 64, 66] },
      Em: { bass: 40, pad: [55, 59, 62, 66] },
      A7: { bass: 45, pad: [55, 57, 62, 64] },
      Fm: { bass: 42, pad: [52, 57, 61, 64] },
      Bm9: { bass: 35, pad: [50, 54, 57, 61] },
      A6: { bass: 45, pad: [54, 57, 61, 64] },
    };
    // bar -> [chord, pad level, arp level, bass level]
    const plan = {
      4: ["D", 1.05, 0.9, 0.9],
      5: ["D", 1, 1, 1], 6: ["Bm", 1, 1, 1], 7: ["G", 1, 1, 1], 8: ["A", 1, 0.9, 1],
      9: ["D", 1, 1, 1], 10: ["Bm", 1, 1, 1], 11: ["G", 1, 0.8, 1], 12: ["Em", 1, 0.8, 1], 13: ["A7", 1, 0.9, 1],
      14: ["D", 1, 1, 1], 15: ["Fm", 1, 1, 1], 16: ["G", 1, 0.8, 1], 17: ["Bm9", 1.1, 1, 1.1],
      18: ["G", 1, 1, 1], 19: ["A6", 1, 1, 1], 20: ["D", 0.8, 0.5, 0.8],
      25: ["G", 0.55, 0.5, 0.5],
      26: ["G", 1.25, 1.2, 1.2], 27: ["A6", 1.3, 1.25, 1.2], 28: ["D", 1.4, 0.9, 1.3], 29: ["D", 1.0, 0.35, 0.9],
    };
    const ARP = [3, 2, 1, 2, 3, 1, 2, 0];
    for (const [barS, [name, padL, arpL, bassL]] of Object.entries(plan)) {
      const bar = Number(barS);
      const t0 = at(bar);
      const ch = CH[name];
      const startAt = bar === 4 ? T.flipsA[0] : t0;
      const dur = at(bar + 1) - startAt;
      ch.pad.forEach((m, k) => {
        put(music, startAt, padNote(m, dur + 0.05, 900 + 120 * k), 0.034 * padL, k % 2 ? 0.45 : -0.45, 0.5);
      });
      for (let b = 0; b < 4; b += 2) {
        const tb = t0 + b * BEAT;
        if (tb < startAt - 1e-6) continue;
        put(music, tb, sub(ch.bass, BEAT * 2 - 0.04, 0.55), 0.075 * bassL, 0, 0);
      }
      for (let k = 0; k < 8; k++) {
        const t = t0 + k * (BEAT / 2);
        if (t < startAt - 1e-6) continue;
        if (bar >= 29 && (k % 2 || k > 4)) continue;
        const note = ch.pad[ARP[k]] + 12;
        const vel = (k % 2 ? 0.7 : 1) * (k === 0 ? 1.15 : 1);
        put(music, t, glass(note, vel, 0.42), 0.05 * arpL, ((k % 4) - 1.5) * 0.35, 0.35, 0.3);
      }
    }
    // A held fifth under the "nothing changes" clicks, and a drone under part D.
    put(music, at(3), padNote(57, BAR * 1, 700), 0.03, -0.3, 0.6);
    put(music, at(3), padNote(64, BAR * 1, 700), 0.025, 0.3, 0.6);
    for (let bar = 21; bar <= 24; bar++) {
      put(music, at(bar), padNote(50, BAR, 650), 0.03, -0.4, 0.6);
      put(music, at(bar), padNote(57, BAR, 650), 0.024, 0.4, 0.6);
      put(music, at(bar), sub(38, BAR - 0.02), 0.032, 0, 0);
    }
    // the final chord rings out a little longer
    put(music, at(28), glass(74, 1, 1.4), 0.05, 0, 0.6, 0.2);
    put(music, at(28), glass(81, 0.8, 1.6), 0.04, 0.3, 0.6, 0.2);

    // drums under the ruler, bars 14 to 19
    for (let bar = 14; bar <= 19; bar++) {
      for (let b = 0; b < 4; b++) {
        const t = at(bar, b);
        if (b === 0 || b === 2) put(music, t, kick(), 0.42, 0, 0.05);
        if (b === 1 || b === 3) put(music, t, noiseHit(1900, 1.2, 0.02), 0.22, 0.1, 0.2);
      }
      for (let k = 0; k < 16; k++) {
        const t = at(bar) + k * (BEAT / 4);
        const acc = k % 4 === 2 ? 1 : k % 2 ? 0.45 : 0.7;
        put(music, t, noiseHit(7200, 0.9, 0.022), 0.07 * acc, 0.25, 0.1);
      }
    }

    // ----------------------------------------------------------------- effects

    function shutter(t) {
      put(fx, t, noiseHit(1800, 0.9, 0.022), 0.75, 0, 0.12);
      put(fx, t, thump(120, 55, 0.05), 0.45, 0, 0.05);
      put(fx, t + 0.055, noiseHit(4500, 1.5, 0.007), 0.8, 0, 0.12);
      put(fx, t + 0.055, ping(3200, 0.03, 0), 0.05, 0, 0.2);
      put(fx, t + 0.115, noiseHit(2300, 1.1, 0.014), 0.38, 0, 0.1);
    }
    cues.shutter.forEach(shutter);
    // the film opens on an impact under the iris
    put(fx, 0.02, thump(70, 34, 0.32), 0.6, 0, 0.25);
    put(fx, 0.02, noiseHit(900, 0.6, 0.09, 0.6, 0.002), 0.35, 0, 0.4);
    // the clock tower ticks the beat under the opening
    for (let k = 1; k <= 11; k++) {
      const t = k * BEAT;
      put(fx, t, tock(k % 2 ? 2350 : 1950, 0.016), 0.09, k % 2 ? 0.25 : -0.25, 0.3);
    }

    // detent clicks for every focal-length change
    cues.clicks.forEach((t, i) => {
      const j = 0.92 + 0.16 * rnd();
      const g = t < T.flipsA[0] ? 1.5 : 1;
      put(fx, t, noiseHit(5200 * j, 2, 0.004), 0.6 * g, 0, 0.1);
      put(fx, t, ping(1400 * j, 0.012, 0.3), 0.2 * g, 0, 0.1);
      put(fx, t, thump(180, 90, 0.025), 0.18 * g, 0, 0);
    });

    for (const w of cues.whooshes) {
      const [fA, fB] = w.up ? [320, 2600] : [2600, 320];
      const L = whoosh(w.dur, fA, fB, Math.round(w.t * 10));
      const R = whoosh(w.dur, fA * 1.06, fB * 0.94, Math.round(w.t * 10) + 7);
      const g = w.t < T.flipsA[0] ? 1.45 : 1;
      put(fx, w.t, L, 0.3 * g, -0.7, 0.25);
      put(fx, w.t, R, 0.3 * g, 0.7, 0.25);
    }

    // gauge blocks: big blocks tock low, thin ones tick high, the orange one thunks
    cues.blocksLeft.forEach((t) => put(fx, t + 0.06, tock(760), 0.34, -0.45, 0.2));
    cues.blocksRight.forEach((t, i) => put(fx, t + 0.04, tock(2300, 0.018), 0.085, 0.45, 0.12));
    put(fx, T.blockAccent + 0.05, tock(430, 0.08), 0.5, 0, 0.25);
    put(fx, T.blockAccent + 0.05, thump(90, 50, 0.09), 0.3, 0, 0);

    // blocks lying down into the ruler, panned to where each lands
    cues.cascade.forEach((t, i) => {
      const x = 260 + (1600 * (4 * i + 2)) / 240;
      put(fx, t + 0.22, tock(2600 + 8 * i, 0.012), 0.1, ((x - 960) / 960) * 0.8, 0.15);
    });
    // the ratio ruler drops in
    for (let i = 0; i < 75; i += 3) put(fx, T.marks + 0.32 + i * 0.012, tock(1500 + i * 6, 0.014), 0.06, ((i / 75) * 2 - 1) * 0.7, 0.15);

    // the riser into the ratio ruler, and the hit when it lands
    {
      const { t, dur } = cues.riser;
      const out = new Float32Array(len(dur));
      const r = mulberry32(5);
      let f = biquad("bp", 400, 1.1, SR);
      let ph = 0;
      for (let i = 0; i < out.length; i++) {
        const x = i / out.length;
        if (i % 64 === 0) {
          const nf = biquad("bp", 400 * Math.pow(12, x), 1.1, SR);
          Object.assign(nf, { x1: f.x1, x2: f.x2, y1: f.y1, y2: f.y2 });
          f = nf;
        }
        ph += (220 * Math.pow(4, x)) / SR;
        out[i] = (bq(f, r() * 2 - 1) * 0.8 + Math.sin(TAU * ph) * 0.18) * x * x;
      }
      put(fx, t, out, 0.32, 0, 0.35);
      put(fx, t + dur, kick(1.2), 0.5, 0, 0.1);
      put(fx, t + dur, noiseHit(5000, 0.5, 0.18, 1.2, 0.002), 0.2, -0.2, 0.5);
      put(fx, t + dur, noiseHit(5600, 0.5, 0.18, 1.2, 0.002), 0.2, 0.2, 0.5);
    }

    // part D: each click is a pitched tick at ten times the focal length
    const hudPan = (f) => {
      const x = 60 + (1800 * Math.log(f / 12)) / Math.log(25);
      return ((x - 960) / 960) * 0.75;
    };
    cues.ratchet1.forEach(({ t, f }) => {
      put(fx, t, ping(10 * f, 0.04, 0.22, 0.2), 0.155, hudPan(f), 0.12);
      put(fx, t, noiseHit(6000, 2, 0.003), 0.13, hudPan(f), 0);
    });
    cues.ratchet2.forEach(({ t, f }) => {
      put(fx, t, ping(10 * f, 0.11, 0.22, 0.6), 0.22, hudPan(f), 0.2, 0.15);
      put(fx, t, noiseHit(6000, 2, 0.003), 0.18, hudPan(f), 0);
    });
    // a low resolving thump under the closing iris
    put(fx, T.close + 0.06, thump(95, 42, 0.22), 0.35, 0, 0.2);

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
