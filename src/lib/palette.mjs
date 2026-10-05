// Borrowed Lines palette.
// Primary: aged off-white paper, deep indigo, vermilion.
// Local only, and always sourced from a separating print layer:
//   electric cyan  = the protagonist's indigo splitting (its blue component drifts)
//   acid yellow    = the companion's vermilion splitting (its yellow component drifts)

export const PAL = {
  paper: [236, 227, 207],
  paperLight: [243, 236, 220],
  paperShade: [219, 206, 180],
  paperDeep: [196, 180, 150],
  indigo: [31, 38, 88],
  indigoInk: [40, 50, 112],
  indigoDeep: [20, 24, 58],
  vermilion: [226, 72, 44],
  vermilionDeep: [182, 52, 34],
  vermilionLight: [238, 120, 88],
  cyan: [30, 208, 224],
  yellow: [226, 236, 50],
  // split components used when a colour separates
  indigoMinusCyan: [44, 22, 92],
  vermilionMinusYellow: [214, 40, 70],
};

export const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mixc = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
