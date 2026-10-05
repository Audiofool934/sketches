# One Arcminute

A 72-second animated explainer about focus, and why depth of field exists at all.
A lens brings exactly one distance to a point.
Everything nearer or farther lands on the sensor as a small disc.
A whole range still looks sharp, because every receiver of light is made of discrete elements: photosites in a sensor, grains of silver in film, cones in the eye.
A disc smaller than the element reads as a point, and the one that counts in the end is the eye looking at the picture, which cannot resolve much under one arcminute.
The aperture sets the width of the cone of light, so it sets how fast the disc grows away from focus: closing it costs light and buys depth.

It is the second film in the series after [Four Millimeters](https://github.com/Audiofool934/sketches/tree/piece/four-millimeters), with the same type, ink and accent.
The picture and the sound are both made from code.
The finished film is [`one-arcminute.mp4`](one-arcminute.mp4) in this folder (1920 × 1080, 60 fps, stereo AAC), with a native 4K version in [`one-arcminute-4k.mp4`](one-arcminute-4k.mp4) (3840 × 2160, 60 fps).

## What it shows

| Time | Part | On screen |
| --- | --- | --- |
| 0:00 | The puzzle | An iris opens on eight ivory dominoes in front of a night window, shot at f/1.4. The focus racks to the nearest domino and the farthest: one distance at a time is sharp. The aperture clicks down to f/16 and all eight come sharp. "So why are all eight sharp?" |
| 0:10 | The cone | The picture shrinks into a panel, "on the sensor", beside a side view of a domino, a lens and a sensor. Light leaves the pip as a cone and the lens folds it back to a point on the sensor. Nearer, the cone meets behind the sensor; farther, in front; either way the sensor cuts it as a disc. Closing the iris narrows the cone and shrinks the disc. |
| 0:22.5 | The limit | Into the sensor: photosites 6 µm wide. A point lights one photosite, a smaller-than-a-pixel disc lights it exactly the same, and only a bigger disc shows. The grid cracks into grains of silver (faster film, bigger grains), then packs into the cones of a retina. Out to the eye: the finest detail it can see is one arcminute. From 40 cm that is 0.12 mm on a 15 cm print, and 0.03 mm on the sensor: five photosites, the circle of confusion. |
| 0:42.5 | The zone | The ring becomes a chart: the eight dominoes on a distance axis, each with its blur disc at f/1.4 and the 0.03 mm ring. Only the focused one fits. The aperture closes a stop per beat; every disc shrinks by √2, dominoes light up with a clack as they fit, and the depth of field grows from 2.0 cm to 23.5 cm while the light falls to 1/128. |
| 0:57.5 | The answer | Through the aperture, back to the picture at f/16. One distance is in focus; a magnifier shows the farthest domino's blur, 0.026 mm, inside the 0.030 mm limit. The iris closes on "Depth of field is the blur you can't see." |

## The facts it relies on

- The camera is a 50 mm thin lens on a full-frame sensor (36 × 24 mm).
  Focused at distance s and set to f-number N, a point at distance z lands as a disc of diameter c = f² |z − s| / (N z (s − f)) on the sensor.
  Every blur in the photograph is drawn from this formula, per object and per distance.
- The scene: dominoes 48 mm tall at 712, 737, 767, 800, 825, 852, 880 and 914 mm from the lens, focused at 800 mm on the fourth.
  The distances are chosen so that stopping down from f/1.4 the sharp zone takes in 1, 1, 1, 2, 3, 4, 6 and 8 dominoes, each crossing at least a third of a stop away from a marked stop, so no domino sits on the line.
- The circle of confusion is 0.03 mm, the usual figure for full frame.
  The film derives it from the eye: an eye that resolves 1 arcminute (20/20 vision), holding a 10 × 15 cm print at 40 cm.
  1′ at 400 mm is 0.116 mm on the print, and the print is 150 / 36 = 4.17 times the sensor, so 0.028 mm on the sensor.
- A 24-megapixel full-frame sensor has photosites 6 µm wide, so 0.03 mm is five of them: the eye, not the sensor, sets the limit for a print held in the hand.
- In the center of the fovea, cones sit about 2.5 µm apart, about half an arcminute; normal vision resolves about 1 arcminute.
- Depth of field at 800 mm with this lens: 790–810 mm at f/1.4 (2.0 cm) and 699–935 mm at f/16 (23.5 cm).
  f/1.4 to f/16 is seven stops, 1/128 of the light, and about 12 times the depth.
  The marked f-numbers stand for powers of √2 (1.41, 2, 2.83, 4, 5.66, 8, 11.3, 16), which the math uses.
- The city outside the window is at infinity, beyond the sharp zone even at f/16, so it stays soft (0.21 mm discs) while the dominoes are sharp.
  At f/16 the nearest and the farthest dominoes are both 0.026 mm out of focus, just inside the limit.

## How it is made

- **Picture.** Canvas 2D in one page, `index.html`, split into classic scripts under `src/` so it also opens from `file://`.
  `src/optics.js` is the thin-lens model and `src/motion.js` the camera's moves (focus racks animate 1/z, the lens's travel; the aperture animates in stops).
  `src/scene.js` draws the photograph in camera coordinates: each domino and its reflection are drawn once and blurred by a Gaussian matched to its own blur disc, the city at infinity is blurred from a ladder of pre-blurred copies, and the bright lights are drawn as discs in the shape of the nine-blade aperture, round wide open and nine-sided stopped down.
  `src/film.js` draws the five parts as pure functions of time, and `src/kit.js` holds the springs, seeded noise and type helpers.
  Each output frame averages four subframes inside a 180° shutter.
- **Sound.** `src/sound.js` synthesizes the soundtrack in plain JavaScript from the clock and the camera's moves.
  The focus ring is a friction glide whose pitch follows the lens's travel; each aperture detent pings one step higher up the A-flat scale; in the cone diagram a tone on E-flat splits into three beating voices as the blur disc grows and becomes pure again in focus; the point and the small disc land on a photosite with the same tick; film grain crackles, coarser for fast film; cones bubble in; each domino clacks as its disc fits the ring.
  The music is a chord bed in A-flat at 96 BPM that is detuned and dark while the picture is blurred, and comes into tune and brightens stop by stop as the aperture closes.
  It is mixed through a ping-pong delay and a Freeverb, normalized to −14 LUFS integrated (ITU-R BS.1770), and limited below −1 dBTP.
- **Type.** Instrument Serif for numerals and headlines, Geist Mono for labels, both bundled under the SIL Open Font License in `assets/fonts` and embedded into `src/fonts.js` by `tools/fonts.mjs`.

## Rebuild it

You need Node.js 20 or later and `ffmpeg`.
The tools drive Chromium through `playwright-core`; set `CHROME_PATH` if Playwright's browser is not installed.

```bash
npm install
node tools/sound.mjs      # soundtrack -> out/soundtrack.wav, prints loudness and true peak
node tools/render.mjs     # picture and sound -> out/one-arcminute.mp4
node tools/render.mjs --res 2 --preset medium --out out/one-arcminute-4k.mp4   # native 3840 x 2160
```

Every frame and every sample come out the same each time.

Other tools:

- Open `index.html` in a browser for a live preview. Hover for play, sound, and a scrubber; the space bar pauses.
- `node tools/still.mjs 3.4 50` writes full-size frames to `out/stills/`.
- `node tools/still.mjs --sheet 0:72.5 --count 30` writes a contact sheet, and `--phone` makes one at 360 px wide.
- `node tools/render.mjs --from 0 --to 600 --scale 0.5` renders a short, small test cut.
- `node tools/sound.mjs --stems` reports the loudness of the music and the effects, section by section.

`out/` is ignored by Git; the finished films above are the rendered files kept on this branch.

## Limits

- The lens is a thin lens with an ideal aperture. The film leaves out diffraction (at f/16 the Airy disc is about 0.02 mm, under the limit), aberrations, focus breathing and the difference between distances measured from the lens and from the sensor.
- The blur of shapes is a Gaussian with the same edge spread as the disc, not the disc itself; point lights get the true disc.
- The cone diagram in part B is schematic: distances are exaggerated so the cone's meeting point can be seen moving. The numbers in parts D and E are computed from the real lens.
- The mosaics in part C are drawn at the same screen scale so the idea reads; their real sizes are in the labels.
- 0.03 mm is a convention. Print bigger, look closer, or view at 100% on a screen and the circle of confusion shrinks, and so does the depth of field.
- The soundtrack was checked by measurement, not by ear: −14 LUFS integrated, true peak below −1 dBTP, loudness per bar, and click onsets against their cues in the encoded file.
  The balance and the taste of the music still need a listen on speakers or headphones.

## Fonts

- Instrument Serif, Copyright 2022 The Instrument Serif Project Authors, SIL Open Font License 1.1 (`assets/fonts/OFL-Instrument-Serif.txt`).
- Geist Mono, Copyright 2024 The Geist Project Authors, SIL Open Font License 1.1 (`assets/fonts/OFL-Geist-Mono.txt`).

Both are the Latin subsets packaged by [Fontsource](https://fontsource.org/).
