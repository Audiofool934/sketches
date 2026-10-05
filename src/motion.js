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
  const stopD = (t) => springTo(t, [[0, 1], ...T.stopsD.map((tt, i) => [tt, 2 + i, SPR.snap])]);

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

  // When each domino's disc first fits the circle of confusion while stopping down in part D.
  function entries() {
    const out = [];
    O.ZS.forEach((z, i) => {
      if (i === O.FOCUS_INDEX) return;
      for (let t = T.stopsD[0]; t < T.stopsD[6] + 1; t += 0.001) {
        if (O.disc(z, O.stopN(stopD(t)), O.FOCUS) <= O.coc) {
          out.push({ i, z, t });
          break;
        }
      }
    });
    return out;
  }

  FM.motion = { focusA, stopA, stopD, B, vOf, uB, apB, opticsB, entries };
})();
