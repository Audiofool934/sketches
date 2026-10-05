# one arcminute

## Idea

An explainer film about the camera's focus, and why depth of field exists at all.
A lens brings exactly one distance to a point.
Everything nearer or farther lands on the sensor as a small disc.
We still see a whole range as sharp, because every receiver of light is made of discrete elements: pixels in a sensor, grains of silver in film, cones in the eye.
A disc smaller than the element reads as a point.
In the end the one that counts is the eye looking at the picture, and the eye cannot resolve much under one arcminute.
The aperture sets the width of the cone of light, so besides the amount of light, it sets how fast the disc grows away from focus, and so how deep the sharp zone is.

The viewer should feel the turn: "sharp" is not a property of the lens; it is the blur you can't see.

It is the second film in the series after Four Millimeters, with the same type, the same diagram ink, and the same accent.

## Stack

`film`, kept as one HTML page.
Canvas 2D, drawn as a pure function of time.
Read `stacks/film.md` and `stacks/canvas.md` on main.
No Remotion, no HyperFrames, no libraries in the page.
Classic scripts under `src/` so the page opens from `file://`.
Playwright steps `window.seek(t)` and ffmpeg encodes.
The soundtrack is synthesized in plain JavaScript from the same clock (`src/clock.js`).

Defocus is drawn from the thin-lens model, not faked by eye.
Each object is blurred by its own blur-disc diameter at its own distance: shapes go through a clipped Gaussian filter sized from the disc, and point lights are drawn as discs in the shape of the aperture.

## Limits

Duration: 72.5 s, 29 bars at 96 BPM (one beat is 0.625 s, one bar is 2.5 s).
Frame size: 1920 × 1080, 60 fps, 4 motion-blur subframes per frame (180° shutter). A native 4K render from the same drawing.
Loop or one-shot: one-shot.

## Facts the film uses

Full-frame sensor, 36 × 24 mm. A 50 mm lens, drawn as a thin lens.
A point at distance z, with the lens focused at s and set to f-number N, lands as a disc of diameter

c = f² |z − s| / (N z (s − f)).

The scene: eight dominoes 48 mm tall at 765, 784, 800, 817, 835, 856, 878 and 903 mm, focused at 800 mm on the third.
Circle of confusion: 0.03 mm on the sensor.
It comes from the eye: a 10 × 15 cm print held at 40 cm, an eye that resolves 1 arcminute.
1′ at 400 mm is 0.116 mm on the print; the print is 150 / 36 = 4.17 times the sensor, so that is 0.028 mm on the sensor.

| f-number | depth of field | dominoes inside | light |
| --- | --- | --- | --- |
| 1.4 | 790–810 mm, 2.0 cm | 1 | 1 |
| 2 | 2.9 cm | 1 | 1/2 |
| 2.8 | 4.1 cm | 3 | 1/4 |
| 4 | 5.8 cm | 3 | 1/8 |
| 5.6 | 8.2 cm | 5 | 1/16 |
| 8 | 11.6 cm | 6 | 1/32 |
| 11 | 16.5 cm | 7 | 1/64 |
| 16 | 699–935 mm, 23.5 cm | 8 | 1/128 |

Every crossing sits at least 0.3 stops from a marked stop, so no domino is drawn on the line.
f/1.4 to f/16 is seven stops: 1/128 the light, and 2.0 cm of depth becomes 23.5 cm (×11.6).
The f-numbers are the marked stops; the math uses the exact powers of √2 behind them (1.41, 2, 2.83, 4, 5.66, 8, 11.3, 16).

The receivers:

- A 24-megapixel full-frame sensor has photosites 6 µm wide, so 0.03 mm is five of them.
- Film records light in crystals of silver halide; faster film has bigger grains.
- In the center of the fovea, cones sit about 2.5 µm apart, half an arcminute. Normal vision (20/20) resolves about 1 arcminute, 1/60 of a degree.

## Look

Two worlds, as in Four Millimeters.
The diagram world is ink on near-black, drawn like a technical plate: hairline rays, a tinted cone of light, dimension lines with arrowheads.
The picture world is a photograph made in code: a row of ivory dominoes on a black lacquered table, in front of a tall window over a city at night.
The city lights become bokeh discs, and the dominoes and their reflections blur by distance. The city is at infinity, beyond the sharp zone, so it stays soft even at f/16.

Palette, diagram:

- Ground #0c0f17
- Ink #efe9dc
- Dim ink #8b8679
- Rule #343a48
- Cone tint #1c2c4d

Accent: signal orange #ff6a1a, only for the limit: one arcminute, the circle of confusion, and the sharp zone.

Palette, picture:

- Night sky #070b16 to #13213d, city haze #2a2f45
- City lights: cool white #dce9ff, blue #8fb8ff, sodium #ffb766 (few)
- Window frame #05060a
- Table #07080b with reflections
- Dominoes: ivory #efe6d0 to #c9bb9c, pips #15130f, spinner brass #b8945a

Display face: Instrument Serif, regular and italic, for numerals and headlines.
UI face: Geist Mono, for labels and measurements.
Banned: gradient behind a centered title, fade-in on everything, corner labels, frame borders, glow, invented product UI.
No camera HUD. Bokeh discs are drawn as hard-edged discs, not halos.

## Beats

The hook is moving by 0.6 s: the iris opens on a shallow picture and the focus starts to travel.
Something new every 1.25 to 2.5 s.
Every state change lands on a beat. Hero reveals land on a downbeat.

### A. The puzzle, 0:00–0:10

- 0.00 Black. A nine-blade iris springs open on the dominoes at f/1.4, focused on the third. The city is a field of big discs.
- 0.63 "f/1.4" rises in at the left.
- 1.25 The focus racks to the nearest domino. The sharpness slides forward; the far ones melt.
- 2.50 It racks to the farthest. 3.75 Back to the third.
- 3.13 "A lens focuses at one distance." rises in.
- 5.00 The aperture clicks down on eighth notes, f/2 to f/16. The readout flips each click. The discs in the window shrink into small nine-sided dots. All eight dominoes come sharp. The exposure is held, as a camera would by slowing the shutter.
- 7.50 "So why are all eight sharp?"

### B. The cone, 0:10–0:22.5

- 10.00 Text leaves. The picture shrinks to a face-on panel at the right: the sensor's view. A side view builds to its left: axis, lens, sensor.
- 10.63 The third domino stands at the left, side-on, its pip a point on the axis.
- 11.25 Rays burst from the pip; the ones that reach the lens fill a tinted cone. "Light leaves a point as a cone."
- 12.50 The lens bends the cone back to a point exactly on the sensor. The panel shows one dot. "The lens folds it back to a point."
- 15.00 The domino slides nearer. The cone now meets behind the sensor, and the sensor cuts it as a disc. A dimension line measures it. The panel's dot opens into a disc. "Nearer: a disc."
- 16.25 It slides farther. The cone meets in front, and the disc opens again. "Farther: a disc."
- 17.50 "Only one distance makes a point."
- 18.75 The domino stays out of focus. The iris blades close in the lens: the cone narrows and the disc shrinks. "Smaller aperture, smaller disc."
- 21.25 The blades open, the domino returns to focus, the dot returns.

### C. The limit, 0:22.5–0:42.5

- 22.50 The panel grows to fill the screen, and its surface turns out to be a grid of photosites. "6 µm" over one of them.
- 23.75 A focused point lands in one photosite; it lights.
- 25.00 A disc smaller than a photosite lands in another; it lights exactly the same. "A smaller disc lights it the same."
- 26.25 A bigger disc spreads over a patch of photosites, each dimmer. "Only a bigger one shows."
- 27.50 The photosites give way to flakes of silver halide. "Film: grains of silver."
- 28.75 The grains grow. "Faster film, bigger grains."
- 30.00 The grains give way to the jittered hexagons of a cone mosaic. "Your eye: a mosaic of cones."
- 31.25 The mosaic shrinks into a magnifier pinned to the fovea of an eye in section. "2.5 µm apart".
- 32.50 Hero: "The finest detail it can see:" "1′", one arcminute, 1/60°. An orange wedge opens from two cones through the eye's lens.
- 33.75 The wedge reaches a print 40 cm away. "At 40 cm, 1′ spans 0.12 mm of a print."
- 36.25 The eye leaves; the print comes forward with its orange dot.
- 37.50 The print shrinks 4.2 times to the sensor that made it. "On the sensor, that is 0.03 mm."
- 38.35 Into the sensor along the dot, until it is a ring five photosites across. "Blur smaller than this looks sharp."
- 40.00 "the circle of confusion"

### D. The zone, 0:42.5–0:57.5

- 42.50 The ring travels into a chart: the eight dominoes stand on a distance axis in centimeters, each with its blur disc at f/1.4 above it, drawn 1200 times life size, and an orange ring for the limit. "f/1.4", a front view of the iris, and "light 1" at the top.
- 45.00 Only the fourth fits its ring. An orange band on the axis marks the depth of field: 2.0 cm. "Inside the ring, it looks sharp."
- 47.50 The aperture closes one stop per beat to f/16. Every disc shrinks by √2 per stop. A domino lights with a wooden clack when its disc fits the ring. The band and its readout grow to 23.5 cm. The iris closes and the light halves each stop, to 1/128.
- 52.50 "1/128 the light. About 12 times the depth."
- 55.00 "The aperture sets the light and the blur." The aperture swings back open to f/1.4 and closes again to f/16: the light and the depth move against each other, the dominoes fall out of the zone with soft ticks and clack back in.

### E. The answer, 0:57.5–1:12.5

- 57.50 The chart's iris grows to fill the frame and opens on the picture at f/16.
- 60.00 "One distance is in focus." A small orange marker over the fourth domino.
- 62.50 "The rest blur less than you can see."
- 63.75 A magnifier on the farthest domino's pip: its blur disc, 0.026 mm, inside the 0.030 mm ring.
- 67.50 The iris closes. Lockup: "Depth of field is the blur you can't see."

## Motion

Duration 72.5 s, one-shot.
Springs for arrivals: UI k = 260, d = 24; cards and camera k = 170, d = 26; type critically damped, no overshoot.
Eases for exits.
Each change of target adds a spring; nothing restarts.
Text leaves before a container morphs.
Focus is animated in lens extension (1/z), the aperture in stops (log N), so both move the way the controls do.

## Sound

Clock: 96 BPM, 29 bars; every cue comes from `src/clock.js`.
Synthesized in the page's code, mixed to −14 LUFS integrated, true peak under −1 dBTP.

- Iris and shutter, detent clicks for each stop, whooshes for the big moves.
- The focus ring: a soft friction glide whose pitch follows the lens extension.
- The focus tone: a sustained note whose voices detune in proportion to the blur disc. Out of focus it beats; in focus it is pure.
- Mosaics: a clean tick for a photosite, a dry crackle for grain, a soft pluck for a cone.
- A wooden clack when a domino enters the sharp zone.
- Music: a quiet chord bed with an FM glass arpeggio, a pad, and a plucked bass, in a new key. In part D the bed comes into tune stop by stop.

No voice. On-screen text carries the argument.

## Review

Three passes, scored 1 to 10 on hook, phone readability (360 px), motion, variety, composition, and sync.
Fix the three worst problems by timestamp each pass. Ship when every score is 8 or more.
Also check a fast-action strip and a 360 px phone sheet.

## Notes

Review passes, scored hook / phone readability / motion / variety / composition / sync.

Pass 1, the first cut: 8 / 6 / 7 / 9 / 7 / 8.

- Labels were too small to read at 360 px wide all through the diagrams (12–21 s, 23–42 s, 43–57 s, 63–67 s). Labels that carry meaning are now 46–56 px.
- 22.5–23.0: the zoom into the sensor showed an empty dark box before the grid appeared. The photosites now show inside the panel as it grows.
- 42.3–42.9: the circle of confusion's labels hung on while the ring travelled into the chart. They leave first, then the ring moves.

Pass 2, with the soundtrack and the first full render: 8 / 7 / 8 / 9 / 8 / 9.
In the encoded file every aperture click lands within 2 ms of its cue.

- 5.0–6.9 and 47.5–51.3: the f-number and light readouts overlapped as they flipped ("f/2.8" over "f/4"). They roll like counters now, the old value rising out as the new one rises in.
- 48.8–51.4: a domino entering the sharp zone clacked but did nothing on screen. It pops.
- 43–57: the last axis label stayed dim and the readout labels were small. Fixed.

Pass 3: 8 / 8 / 8 / 9 / 8 / 9.

- 52.5–57.5: the chart held still for five seconds under two captions. Under "The aperture sets the light and the blur." the aperture now swings back open to f/1.4 and shut again, so the light and the depth trade places; the dominoes tick out and clack back in.
- Left as they are: 58.5–60.0, a second and a half of the picture with no caption after the iris opens, as a breath before the answer; and the axis numbers in part D, small on a phone but secondary to the dominoes and the band.

Rendering: the photograph first took 200 ms a subframe. The city is now blurred from a ladder of pre-blurred copies, and the table and its reflections are drawn directly, so a subframe takes 50–80 ms and the film renders in about five minutes on four cores.

The soundtrack is checked by measurement, not by ear: −14.0 LUFS integrated, true peak −1.3 dBTP, every bar between −12 and −16 LUFS except the fade-out.
