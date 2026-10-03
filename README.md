# Four Millimeters

A 72-second animated explainer about one photographer's puzzle.
Going from a 24 mm lens to a 28 mm lens changes the picture a lot.
Going from 200 mm to 204 mm changes almost nothing.
Both steps are 4 mm.

The film shows the effect first, then the geometry behind it, then a ruler that fixes the intuition:
4 mm is a sixth of 24 mm but a fiftieth of 200 mm, and what you see in the picture follows that fraction.
Focal lengths add up like ratios, not like millimeters.

The picture and the sound are both made from code.
The finished film is [`four-millimeters.mp4`](four-millimeters.mp4) in this folder (1920 × 1080, 60 fps, stereo AAC), with a native 4K version in [`four-millimeters-4k.mp4`](four-millimeters-4k.mp4) (3840 × 2160, 60 fps, 44 MB).

## What it shows

| Time | Part | On screen |
| --- | --- | --- |
| 0:00 | The puzzle | An iris opens on a harbor at 24 mm. A click to 28 mm drops the lamps and the railing out of the frame. A zoom to 200 mm fills the frame with a clock tower, and a click to 204 mm changes nothing you can see. "Same 4 mm. Different jump." |
| 0:10 | The geometry | The 24 mm print lifts into a strip of the whole harbor, and its edges become the field of view of a lens above a sensor. Focal length is the lens-to-sensor distance. Adding 4 mm narrows the view from 73.7° to 65.5°. At 200 mm the same 4 mm narrows it from 10.3° to 10.1°. Drawn at the same height, the two triangles fold into gauge blocks: 4 mm is 1/6 of 24 and 1/50 of 200, so the picture grows ×1.17 against ×1.02. |
| 0:32 | The ruler | The blocks lie down as a millimeter ruler, where 24–28 and 200–204 are the same size. A copy is re-spaced by ratio, and a fan of lines shows every block stretching or squeezing. By ratio, 24–28 is almost eight times longer than 200–204, and the same step at 200 mm is 200–233. The 24–70 and 70–200 zooms are 46 mm and 130 mm wide but the same ×2.9. |
| 0:50 | Count it | The harbor again. Forty-four clicks of +4 mm zoom in fast and then crawl. Fourteen clicks of ×1.17 zoom in evenly. Each click is a tone at ten times the focal length, so the first run sounds like a climb that flattens out and the second climbs in even steps. |
| 1:02 | The answer | The two prints return as 24 → 28 and 200 → 233: "Different mm. Same jump." The iris closes on "Count in ratios, not millimeters." |

## The facts it relies on

- The sensor is full frame, 36 × 24 mm. All angles are horizontal, across the 36 mm width: 2 atan(18 / f).
  Lens makers usually quote the diagonal angle instead, which is 84° at 24 mm and 12.3° at 200 mm.
- The lens is drawn as a thin lens (a pinhole) focused far away, where the focal length is the distance from the lens to the sensor.
  A real lens folds that distance with more glass, a wide angle with a retrofocus design and a long lens with a telephoto group, but its angle of view is the same as the thin lens of the same focal length.
- When the camera stays where it is, changing the focal length only crops and enlarges the picture; it does not change perspective.
  That is why the harbor is drawn once, in angle coordinates (u = X/Z, v = Y/Z), and every focal length in the film is a crop of the same drawing.
  A lens of focal length f sees u from −18/f to 18/f.
- The picture's scale is proportional to f, so a change from f₁ to f₂ enlarges everything by f₂/f₁: 28/24 = 1.167 and 204/200 = 1.02.
  On a logarithmic ruler, ln(28/24) / ln(204/200) = 7.8, so 24–28 is almost eight times as long as 200–204.
  The step from 200 mm that looks like 24 → 28 is 200 × 28/24 = 233.3 mm.
- 70/24 = 2.92 and 200/70 = 2.86, so the 24–70 and 70–200 zooms both cover about ×2.9.
- Part D's ratchets are 24 + 4k mm for k = 1 to 44, and 24 × (7/6)ᵏ mm for k = 1 to 14.

## How it is made

- **Picture.** Canvas 2D in one page, `index.html`, split into classic scripts under `src/` so it also opens from `file://`.
  `src/harbor.js` draws the harbor in angle coordinates, `src/film.js` draws the five parts as pure functions of time, and `src/kit.js` holds the springs, seeded noise, and type helpers.
  Motion uses closed-form springs, so every pose is a function of time, and zooms animate the logarithm of the focal length.
  Each output frame averages four subframes inside a 180° shutter.
- **Sound.** `src/sound.js` synthesizes the soundtrack in plain JavaScript from the cue sheet in `src/clock.js`, the same clock the picture reads: a shutter, detent clicks, whooshes, wood-block tocks for the gauge blocks, a riser into the ratio ruler, pitched ticks for the ratchets, and a quiet chord bed in D at 96 BPM with an FM "glass" arpeggio, a pad, a sub, and soft drums under the ruler.
  It is mixed through a ping-pong delay and a Freeverb, normalized to −14 LUFS integrated (ITU-R BS.1770), and limited below −1 dBTP.
- **Type.** Instrument Serif for numerals and headlines, Geist Mono for labels, both bundled under the SIL Open Font License in `assets/fonts` and embedded into `src/fonts.js` by `tools/fonts.mjs`.

## Rebuild it

You need Node.js 20 or later and `ffmpeg`.
The tools drive Chromium through `playwright-core`; set `CHROME_PATH` if Playwright's browser is not installed.

```bash
npm install
node tools/sound.mjs      # soundtrack -> out/soundtrack.wav, prints loudness and true peak
node tools/render.mjs     # picture and sound -> out/four-millimeters.mp4
node tools/render.mjs --res 2 --preset medium --out out/four-millimeters-4k.mp4   # native 3840 x 2160
```

Rendering takes about seven minutes on four cores; the soundtrack takes a few seconds.
Every frame and every sample come out the same each time.

Other tools:

- Open `index.html` in a browser for a live preview. Hover for play, sound, and a scrubber; the space bar pauses.
- `node tools/still.mjs 12.5 40` writes full-size frames to `out/stills/`.
- `node tools/still.mjs --sheet 0:75 --count 30` writes a contact sheet, and `--phone` makes one at 360 px wide.
- `node tools/render.mjs --from 0 --to 600 --scale 0.5` renders a short, small test cut.
- `node tools/sound.mjs --stems` reports the loudness of the music and the effects, section by section.

`out/` is ignored by Git; the finished film above is the one rendered file kept on this branch.

## Limits

- The soundtrack was checked by measurement, not by ear: −14 LUFS integrated, true peak below −1 dBTP, loudness per bar, spectrograms, and click onsets within 3 ms of their cues in the encoded file.
  The balance and the taste of the music still need a listen on speakers or headphones.
- The film draws a thin lens. It does not show how real lens groups, focus breathing, or close focusing change the effective focal length.
- Angles are for a full-frame sensor. A smaller sensor sees a narrower view (the frame is narrower by the crop factor), but the ratios between focal lengths, and so the size of each jump, stay the same.

## Fonts

- Instrument Serif, Copyright 2022 The Instrument Serif Project Authors, SIL Open Font License 1.1 (`assets/fonts/OFL-Instrument-Serif.txt`).
- Geist Mono, Copyright 2024 The Geist Project Authors, SIL Open Font License 1.1 (`assets/fonts/OFL-Geist-Mono.txt`).

Both are the Latin subsets packaged by [Fontsource](https://fontsource.org/).
