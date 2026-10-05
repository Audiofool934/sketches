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
    fLabel: at(1, 1),
    rack1: at(1, 2), // focus to the nearest domino
    rack2: at(2, 0), // to the farthest
    headA: at(2, 1),
    rack3: at(2, 2), // back to the third
    stopsA: [0, 1, 2, 3, 4, 5, 6].map((i) => at(3, 0) + (i * BEAT) / 2), // f/2 ... f/16
    why: at(4, 0),

    // B. The cone
    cone: at(5, 0),
    domino: at(5, 1),
    burst: at(5, 2),
    fold: at(6, 0),
    nearer: at(7, 0),
    farther: at(7, 2),
    onlyOne: at(8, 0),
    irisB: at(8, 2),
    irisBOpen: at(9, 2),

    // C. The limit
    grid: at(10, 0),
    dot: at(10, 2),
    smallDisc: at(11, 0),
    bigDisc: at(11, 2),
    grain: at(12, 0),
    fastFilm: at(12, 2),
    cones: at(13, 0),
    eye: at(13, 2),
    arcmin: at(14, 0),
    print: at(14, 2),
    shrink: at(15, 2),
    coc: at(16, 2),
    cocLabel: at(17, 0),

    // D. The zone
    chart: at(18, 0),
    band: at(19, 0),
    stopsD: [0, 1, 2, 3, 4, 5, 6].map((i) => at(20, 0) + i * BEAT), // f/2 ... f/16
    light: at(22, 0),
    both: at(23, 0),

    // E. The answer
    answer: at(24, 0),
    inFocus: at(25, 0),
    rest: at(26, 0),
    inset: at(26, 2),
    close: at(28, 0),
    lockup: at(28, 1),
    end: DURATION,
  };

  const cues = {
    shutter: [T.open, T.close],
  };

  FM.clock = { BPM, BEAT, BAR, DURATION, FPS, at, T, cues };
})();
