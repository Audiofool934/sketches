// The film's one clock. The picture (src/film.js) and the soundtrack (src/sound.js)
// both read these times, so every click you see is a click you hear.
// 96 BPM: one beat is 0.625 s, one bar is 2.5 s. Times are in seconds.
(function () {
  const FM = (globalThis.FM = globalThis.FM || {});

  const BPM = 96;
  const BEAT = 60 / BPM;
  const BAR = 4 * BEAT;
  const DURATION = 72.5;
  const FPS = 60;

  // bar is 1-based, beat is 0-based and may be fractional.
  const at = (bar, beat = 0) => (bar - 1) * BAR + beat * BEAT;

  const T = {
    // A. The puzzle
    open: 0,
    numeral: at(1, 1),
    hookClicks: [at(1, 2), at(1, 3), at(2, 0)], // 28, 24, 28
    zoomOut: at(2, 1), // 28 -> 200
    teleClicks: [at(3, 0), at(3, 1), at(3, 2)], // 204, 200, 204
    split: at(3, 3),
    flipsA: [at(4, 0), at(4, 1), at(4, 2), at(4, 3)],
    same: at(4, 1),
    different: at(4, 2),

    // B. The geometry
    strip: at(5, 0),
    lens: at(5, 1),
    dim: at(6, 0),
    arc: at(6, 2),
    plus: at(7, 0),
    delta: at(7, 2),
    long: at(8, 0),
    arc200: at(9, 0),
    plus200: at(9, 2),
    delta200: at(10, 0),
    pair: at(10, 2),
    blocks: at(11, 0),
    blockAccent: at(11, 3),
    fraction: at(12, 0),
    percent: at(13, 0),

    // C. The ruler
    ruler: at(14, 0),
    equal: at(15, 0),
    marks: at(15, 2),
    morph: at(16, 0),
    morphEnd: at(17, 0),
    slide: at(17, 2),
    zooms: at(18, 2),
    rulerDown: at(20, 0),
    wipe: at(20, 1),

    // D. Count it
    count: at(21, 0),
    ratchet1: at(21, 2),
    ratchet1Step: BEAT / 8,
    back: at(23, 1),
    ratchet2: at(23, 2),
    ratchet2Step: BEAT / 2,
    equalLook: at(25, 2),

    // E. Answer
    answer: at(26, 0),
    flipsE: [1, 2, 3, 4, 5, 6, 7].map((i) => at(26, i)),
    swap: at(27, 0),
    close: at(28, 0),
    lockup: at(28, 1),
    end: DURATION,
  };

  // Focal lengths for the two ratchets in part D.
  const ratchet1 = []; // +4 mm per click, 24 -> 200
  for (let f = 28; f <= 200; f += 4) ratchet1.push(f);
  const ratchet2 = []; // x7/6 per click, 24 -> 207.7
  for (let k = 1; k <= 14; k++) ratchet2.push(24 * Math.pow(7 / 6, k));

  // Gauge blocks in part B: six for 24 mm, fifty for 200 mm, then the orange one.
  const blocksLeft = [];
  for (let i = 0; i < 6; i++) blocksLeft.push(T.blocks + i * (BEAT / 2));
  const blocksRight = [];
  for (let i = 0; i < 50; i++) blocksRight.push(T.blocks + i * (T.blockAccent - T.blocks) / 50);

  // Blocks lying down into the ruler in part C.
  const cascade = [];
  for (let i = 0; i < 51; i++) cascade.push(T.ruler + 0.15 + i * 0.018);

  const cues = {
    shutter: [T.open, T.wipe, T.close],
    clicks: [
      ...T.hookClicks,
      ...T.teleClicks,
      ...T.flipsA,
      T.plus,
      T.plus200,
      ...T.flipsE,
    ],
    whooshes: [
      { t: T.zoomOut, dur: 1.2, up: true },
      { t: T.split, dur: 0.6, up: false },
      { t: T.strip, dur: 0.9, up: false },
      { t: T.long, dur: 2.2, up: true },
      { t: T.pair, dur: 0.7, up: false },
      { t: T.ruler, dur: 1.0, up: false },
      { t: T.slide, dur: 0.9, up: true },
      { t: T.back, dur: 0.55, up: false },
      { t: T.answer, dur: 0.7, up: false },
    ],
    blocksLeft,
    blocksRight,
    cascade,
    ratchet1: ratchet1.map((f, i) => ({ t: T.ratchet1 + i * T.ratchet1Step, f })),
    ratchet2: ratchet2.map((f, i) => ({ t: T.ratchet2 + i * T.ratchet2Step, f })),
    riser: { t: T.morph, dur: T.morphEnd - T.morph },
  };

  FM.clock = { BPM, BEAT, BAR, DURATION, FPS, at, T, cues };
})();
