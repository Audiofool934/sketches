// The film's one clock. The picture (src/film.js) and the soundtrack (src/sound.js)
// both read these times, so every click you see is a click you hear.
// 96 BPM: one beat is 0.625 s, one bar is 2.5 s. Times are in seconds.
//
// Pacing rule for the series: one idea per beat. Show it, name it, then let it sit for at
// least a bar before the next idea arrives. Every link between ideas is a visible morph.
(function () {
  const FM = (globalThis.FM = globalThis.FM || {});

  const BPM = 96;
  const BEAT = 60 / BPM;
  const BAR = 4 * BEAT;
  const FPS = 60;

  // bar is 1-based, beat is 0-based and may be fractional.
  const at = (bar, beat = 0) => (bar - 1) * BAR + beat * BEAT;

  const T = {
    // A. The puzzle
    open: 0,
    fLabel: at(1, 1),
    rack1: at(1, 3), // focus to the nearest domino
    rack2: at(3, 0), // to the farthest
    headA: at(4, 0),
    rack3: at(4, 2), // back to the fourth
    stopsA: [0, 1, 2, 3, 4, 5, 6].map((i) => at(6, i)), // f/2 ... f/16, a stop a beat
    why: at(8, 0),

    // B. What an aperture is
    apIntro: at(10, 0), // the iris closes over the picture and we pull back to the lens
    apName: at(11, 0),
    apOpen: at(12, 0), // opens wide: f/1.4
    apStops: [0, 1, 2, 3, 4, 5, 6].map((i) => at(13, i)),
    apLight: at(14, 0),
    apHold: at(15, 0),
    apSecond: at(16, 0), // the iris opens again: "it does a second thing"

    // C. The cone
    turn: at(17, 0), // the iris turns edge-on and becomes the side view
    domino: at(18, 0),
    burst: at(19, 0),
    cone: at(20, 0),
    fold: at(21, 2),
    inFocusB: at(23, 0),
    nearer: at(25, 0),
    behind: at(26, 0),
    discNear: at(27, 0),
    farther: at(29, 0),
    discFar: at(30, 0),
    bridge: at(31, 0), // the disc is the blur in the photograph
    bridge2: at(32, 0),
    irisB: at(33, 0),
    irisB2: at(34, 0),
    irisBOpen: at(36, 0),

    // D. The limit
    question: at(37, 0),
    grid: at(39, 0),
    dot: at(41, 0),
    smallDisc: at(43, 0),
    same: at(44, 0),
    bigDisc: at(45, 0),
    grain: at(47, 0),
    fastFilm: at(48, 0),
    cones: at(49, 0),
    eye: at(50, 0),
    arcmin: at(51, 0),
    print: at(53, 0),
    shrink: at(55, 0), // the print comes forward
    shrink2: at(56, 0), // and shrinks to the sensor
    coc: at(57, 0), // into the sensor along the dot
    cocLabel: at(58, 2),

    // E. The zone
    back: at(61, 0), // back to the dominoes at f/1.4
    chart: at(63, 0), // the picture becomes the chart
    discs: at(64, 0),
    rings: at(65, 0),
    band: at(67, 0),
    band2: at(68, 0),
    stopsD: [0, 1, 2, 3, 4, 5, 6].map((i) => at(69, 2 * i)), // a stop every two beats
    light: at(73, 0),
    both: at(75, 0),
    sweepOpen: at(75, 0), // the aperture swings back open...
    sweepClose: at(76, 2), // ...and closes again

    // F. The answer
    answer: at(78, 0),
    inFocus: at(79, 0),
    rest: at(80, 2),
    inset: at(81, 0),

    // G. The whole chain, once
    recap: at(83, 0),
    recapRun: at(86, 0),

    // H. Who draws the ring
    coda: at(89, 0),
    closer: at(90, 0),
    thinner: at(92, 0),
    who: at(93, 0),
    close: at(94, 0),
    lockup: at(94, 1),
  };
  const DURATION = at(96, 2);
  T.end = DURATION;

  const cues = {
    shutter: [T.open, T.close],
  };

  FM.clock = { BPM, BEAT, BAR, DURATION, FPS, at, T, cues };
})();
