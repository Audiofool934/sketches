// Musical landmarks measured from the recording (analysis/audio_map.json and
// the zoomed spectrogram / onset pass). Visual events are placed on these,
// not on an even division of the runtime.
export const M = {
  pulse: 11.95, // low pulse enters after the near-silent intro
  on17: 17.04, // strong onset inside the first pulse phrase
  on22: 22.41,
  layer1: 34.09, // bright harmonic layer enters
  on42: 42.36,
  on47: 47.53,
  on51: 51.37,
  on56: 56.16, // phrase boundary
  on67: 67.18, // phrase boundary, build begins
  on73: 73.71, // percussive build peak
  open: 78.24, // texture opens out (fuller band, harmonic bed)
  on83: 83.72,
  on89: 89.22,
  on94: 94.75,
  on98: 98.2,
  layer2: 100.2, // denser harmonic layer, bar-long blocks every ~2.75 s
  on108: 108.55,
  on114: 114.09,
  on122: 122.32,
  sparse: 125.1, // gliding texture, percussion drops away (breakdown)
  ret: 129.97, // upper layer returns
  on136: 136.15,
  on141: 141.28,
  on147: 147.1,
  on155: 155.3,
  on163: 163.72,
  on169: 169.26,
  lift: 177.4, // fullest section: upper bands jump, loudest passage
  on188: 188.5,
  on199: 199.7,
  on213: 213.5,
  on221: 221.7,
  breath: 232.6, // sub-bass drops out: the release
  sub234: 234.5,
  last: 243.9, // final small event before the resonance
  resonance: 244.45, // last onsets 244.45 / 245.46, decays to inaudible ~251
  silent: 252.5,
  end: 256.705,
};

// Movement / transition plan (narrative order, durations from phrases)
export const PLAN = [
  { id: 'I', name: 'Being settled into bed for the last time', t0: 0, t1: 24.5 },
  { id: 'T01', name: 'Touch becomes terrain', t0: 24.5, t1: 40.0 },
  { id: 'II', name: 'Outside the body is inside the body', t0: 40.0, t1: 56.16 },
  { id: 'T02', name: 'The city reveals its palm lines', t0: 56.16, t1: 67.18 },
  { id: 'T03', name: 'A gap between fingers opens into a corridor', t0: 67.18, t1: 80.0 },
  { id: 'III', name: 'Every exit recognizes you', t0: 80.0, t1: 100.2 },
  { id: 'T04', name: 'The corridor folds into a profile', t0: 100.2, t1: 114.09 },
  { id: 'T05', name: 'A delayed gesture peels up a sheet of paper', t0: 114.09, t1: 147.1 },
  { id: 'IV', name: 'All evidence of existence breaks down', t0: 147.1, t1: 177.4 },
  { id: 'T06', name: 'The turning wave becomes an embrace', t0: 177.4, t1: 190.0 },
  { id: 'T07', name: 'The embrace unfolds into mirrors along its joints', t0: 190.0, t1: 203.0 },
  { id: 'T08', name: 'Disorder gathers into a line carrying the weight', t0: 203.0, t1: 213.5 },
  { id: 'T09', name: 'The taut line relaxes into two profiles', t0: 213.5, t1: 224.0 },
  { id: 'V', name: 'Who is this goodbye happening to?', t0: 224.0, t1: 232.6 },
  { id: 'T10', name: 'An unfinished touch travels into the sheet', t0: 232.6, t1: 238.5 },
  { id: 'VI', name: 'Absence might only be texture', t0: 238.5, t1: 256.705 },
  { id: 'T11', name: 'The indentation returns to the room, leaving a gap in the wall', t0: 240.5, t1: 247.0 },
];
