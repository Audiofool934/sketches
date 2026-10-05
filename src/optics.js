// The camera the film is about: a 50 mm thin lens on a full-frame sensor.
// All lengths are in millimeters. Distances are measured from the lens.
(function () {
  const FM = (globalThis.FM = globalThis.FM || {});

  const f = 50;
  const coc = 0.03; // circle of confusion on the sensor
  const sensor = { w: 36, h: 24 };

  // The eight dominoes, front faces, and the distance the lens is focused at (the fourth).
  // Stopping down from f/1.4, the sharp zone takes in 1, 1, 1, 2, 3, 4, 6 and 8 of them;
  // each one crosses at least a third of a stop away from a marked stop.
  const ZS = [712, 737, 767, 800, 825, 852, 880, 914];
  const FOCUS = 800;
  const FOCUS_INDEX = 3;

  // Stop k is f-number 2^(k/2): k = 1 is f/1.4, k = 8 is f/16.
  const stopN = (k) => Math.pow(2, k / 2);
  const stopOf = (N) => 2 * Math.log2(N);
  const LABELS = { 0: "1", 1: "1.4", 2: "2", 3: "2.8", 4: "4", 5: "5.6", 6: "8", 7: "11", 8: "16", 9: "22" };

  // Diameter of the disc a point at distance z makes on the sensor, focused at s, at f-number N.
  function disc(z, N, s) {
    if (!isFinite(z)) return (f * f) / (N * (s - f));
    return (f * f * Math.abs(z - s)) / (N * z * (s - f));
  }

  // Near and far limits of the sharp zone (blur no larger than c).
  function limits(N, s, c = coc) {
    const r = (c * N * (s - f)) / (f * f);
    return [s / (1 + r), r < 1 ? s / (1 - r) : Infinity];
  }

  // Lens-to-sensor distance when focused at s.
  const extension = (s) => (f * s) / (s - f);

  FM.optics = { f, coc, sensor, ZS, FOCUS, FOCUS_INDEX, stopN, stopOf, LABELS, disc, limits, extension };
})();
