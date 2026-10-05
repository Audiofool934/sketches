// Smooth 2D warps: Gaussian radial-basis interpolation of control-point
// displacements. Used to fold drawn architecture into anatomy without
// breaking its lines (right angles loosen into curves).
export function makeWarp(src, dst, sigma = 300, fixed = []) {
  // fixed points map to themselves (zero displacement)
  const S = [...src, ...fixed];
  const D = [...dst, ...fixed];
  const n = S.length;
  const k = (a, b) => Math.exp(-((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) / (sigma * sigma));
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => k(S[i], S[j]) + (i === j ? 1e-6 : 0)));
  const solve = (b) => {
    const M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      const d = M[c][c] || 1e-12;
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = M[r][c] / d;
        for (let q = c; q <= n; q++) M[r][q] -= f * M[c][q];
      }
    }
    return M.map((row, i) => row[n] / (row[i] || 1e-12));
  };
  const wx = solve(S.map((p, i) => D[i][0] - p[0]));
  const wy = solve(S.map((p, i) => D[i][1] - p[1]));
  const f = (p, amt = 1) => {
    let dx = 0, dy = 0;
    for (let i = 0; i < n; i++) {
      const w = k(p, S[i]);
      dx += wx[i] * w;
      dy += wy[i] * w;
    }
    return [p[0] + dx * amt, p[1] + dy * amt];
  };
  return f;
}
