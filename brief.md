# borrowed lines

## Idea

A psychedelic 2D music video for a goodbye that may already have happened inside a dream.
The image keeps proving that a person exists, then withdraws the evidence.
The viewer should feel held and left at once, with nothing resolved.

## Stack

film.
A Node renderer, not a page: every frame is a pure function of time drawn with `@napi-rs/canvas`, piped to ffmpeg.
`src/film.mjs` is the entry, `src/scenes/` holds the movements, `src/lib/` the drawing primitives.
The song itself is not in the repo; render with `--audio <path to song.mp3>`.

## Look

Hand-drawn frame animation, paper cut-out planes, charcoal contours, opaque painted shapes.
Palette: aged paper `#ECE3CF`, deep indigo `#1F2658`, vermilion `#E2482C`.
Electric cyan `#1ED0E0` and acid yellow `#E2EC32` appear only where a print layer slips.
Protagonist: indigo line with a small unclosed gap at the right shoulder.
Companion: vermilion shapes with the left-hand fingertips left unpainted.
No titles, credits, subtitles, strobing, full-screen flashes or hard cuts.

## Beats

Full timing lives in `src/timeline.mjs` (landmarks measured from the recording in `analysis/`).

0.0s I: being settled into bed.
24.5s T01: touch becomes terrain.
40.0s II: the city.
56.2s T02: the city shows its palm lines.
67.2s T03: a finger gap opens into a corridor.
80.0s III: every exit recognizes you.
100.2s T04: the corridor folds into a profile.
114.1s T05: a delayed gesture peels up a sheet.
147.1s IV: the evidence breaks down; a paper wave.
177.4s T06: the wave becomes an embrace.
190.0s T07: the embrace unfolds into mirrors.
203.0s T08: disorder gathers into a taut line.
213.5s T09: the line relaxes into two profiles.
224.0s V: who is this goodbye happening to (colour exchange, lifted head, a hesitant touch).
232.6s T10: the touch travels into the sheet.
238.5s VI: absence as texture; T11 the hollow becomes the crack in the wall, which moves once and holds.

## Motion

Duration: 256.7 s, the whole recording, one-shot, 1920x1080, 24 fps.
Charcoal lines boil on twos.

## Notes

Render safely with `node src/render.mjs --out render/borrowed_lines.mp4 --audio <song>`; see `RENDERING.md` for the memory guard and resume.
`render/animatic_480p.mp4` is the low-res animatic made before the ending was redrawn.
The full 1080p render has not been made yet.
