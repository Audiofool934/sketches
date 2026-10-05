// How the camera moves over time: focus, aperture, and the side-view diagram.
// The picture (src/film.js) draws from these curves and the soundtrack (src/sound.js)
// listens to them, so the focus you hear is the focus you see.
(function () {
  const FM = globalThis.FM;
  const { springTo, SPR } = FM.kit;
  const { T } = FM.clock;
  const O = FM.optics;

  // Part A: focus racks to the nearest domino, the farthest, and back. Focus moves the lens,
  // so it is animated in 1/z, which is linear in the lens's travel.
  const focusA = (t) =>
    1 /
    springTo(t, [
      [0, 1 / O.FOCUS],
      [T.rack1, 1 / O.ZS[0], SPR.card],
      [T.rack2, 1 / O.ZS[7], SPR.card],
      [T.rack3, 1 / O.FOCUS, SPR.card],
    ]);
  // The aperture, in stops (1 = f/1.4, 8 = f/16), clicking down in part A and again in part D.
  const stopA = (t) => springTo(t, [[0, 1], ...T.stopsA.map((tt, i) => [tt, 2 + i, SPR.snap])]);
  // The aperture seen from the front in part B: clicks down a stop a beat, then opens again.
  const stopAp = (t) =>
    springTo(t, [[0, 8], [T.apOpen, 1, SPR.long], ...T.apStops.map((tt, i) => [tt, 2 + i, SPR.snap]), [T.apSecond, 1, SPR.long]]);
  const stopD = (t) =>
    springTo(t, [
      [0, 1],
      ...T.stopsD.map((tt, i) => [tt, 2 + i, SPR.snap]),
      [T.sweepOpen, 1, SPR.long],
      [T.sweepClose, 8, SPR.long],
    ]);

  // Part B is schematic: a thin lens of focal length fd px, a point u px in front of it.
  const B = { ax: 620, lx: 1040, la: 250, fd: 170, uF: 578, uNear: 391, uFar: 952 };
  const vOf = (u) => (B.fd * u) / (u - B.fd);
  B.xs = B.lx + vOf(B.uF);
  const uB = (t) =>
    springTo(t, [
      [0, B.uF],
      [T.nearer, B.uNear, SPR.card],
      [T.farther, B.uFar, SPR.card],
      [T.irisBOpen, B.uF, SPR.card],
    ]);
  const apB = (t) => springTo(t, [[0, 1], [T.irisB, 0.3, SPR.card], [T.irisBOpen, 1, SPR.card]]);
  function opticsB(t) {
    const u = uB(t);
    const v = vOf(u);
    const a = B.la * apB(t);
    const vs = B.xs - B.lx;
    return { u, v, a, xP: B.lx - u, xI: B.lx + v, disc: (2 * a * Math.abs(v - vs)) / v };
  }

  // Every time a domino's disc starts or stops fitting the circle of confusion in part D.
  function crossings() {
    const out = [];
    const inside = O.ZS.map(() => false);
    for (let t = T.stopsD[0] - 0.01; t < T.answer; t += 0.001) {
      const N = O.stopN(stopD(t));
      O.ZS.forEach((z, i) => {
        if (i === O.FOCUS_INDEX) return;
        const now = O.disc(z, N, O.FOCUS) <= O.coc;
        if (now !== inside[i]) {
          out.push({ i, z, t, enter: now });
          inside[i] = now;
        }
      });
    }
    return out;
  }

  // The marked stop a readout shows: it changes when the aperture crosses a half stop.
  // Returns [[t, k], ...] starting with [t0, k(t0)].
  function stopMarks(stopFn, t0, t1) {
    const out = [[t0, Math.round(stopFn(t0))]];
    for (let t = t0; t < t1; t += 0.001) {
      const k = Math.round(stopFn(t));
      if (k !== out[out.length - 1][1]) out.push([t, k]);
    }
    return out;
  }

  // What the part D readouts show: each click on its cue, then the swing's crossings.
  const marksD = () => [
    [T.chart + 0.8, 1],
    ...T.stopsD.map((tt, i) => [tt, 2 + i]),
    ...stopMarks(stopD, T.sweepOpen - 0.01, T.answer).slice(1),
  ];

  FM.motion = { focusA, stopA, stopAp, stopD, B, vOf, uB, apB, opticsB, crossings, stopMarks, marksD };
})();
