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

## Who it is for

Two viewers, and the film has to work for both.

- Someone who knows nothing about cameras should be able to follow every step and come away understanding it. Nothing is assumed: the aperture is introduced as a thing before it is used, the f-number is defined, and every link in the chain (aperture → cone → disc → limit → zone) gets its own scene.
- Someone who already knows the topic should gain intuition they did not have: the disc is drawn from the real lens, the circle of confusion is derived from the eye rather than quoted, and the coda shows that the viewer, not the lens, sets the depth of field.

The pacing rule for the series: one idea per beat. Show it, name it, then let it sit for at least a bar before the next idea arrives. Every link between ideas is a visible morph, never a cut.

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

Duration: 3:58.75, 95½ bars at 96 BPM (one beat is 0.625 s, one bar is 2.5 s).
Frame size: 1920 × 1080, 60 fps, 4 motion-blur subframes per frame (180° shutter). A native 4K render from the same drawing.
Loop or one-shot: one-shot.

## Facts the film uses

Full-frame sensor, 36 × 24 mm. A 50 mm lens, drawn as a thin lens.
A point at distance z, with the lens focused at s and set to f-number N, lands as a disc of diameter

c = f² |z − s| / (N z (s − f)).

The f-number is the focal length divided by the diameter of the opening: 50 mm at f/1.4 is a 35 mm opening, at f/16 a 3.1 mm one.

The scene: eight dominoes 48 mm tall at 712, 737, 767, 800, 825, 852, 880 and 914 mm, focused at 800 mm on the fourth.
Circle of confusion: 0.03 mm on the sensor.
It comes from the eye: a 10 × 15 cm print held at 40 cm, an eye that resolves 1 arcminute.
1′ at 400 mm is 0.116 mm on the print; the print is 150 / 36 = 4.17 times the sensor, so that is 0.028 mm on the sensor.

| f-number | depth of field | dominoes inside | light |
| --- | --- | --- | --- |
| 1.4 | 790–810 mm, 2.0 cm | 1 | 1 |
| 2 | 786–815 mm, 2.9 cm | 1 | 1/2 |
| 2.8 | 780–821 mm, 4.1 cm | 1 | 1/4 |
| 4 | 772–830 mm, 5.8 cm | 2 | 1/8 |
| 5.6 | 761–843 mm, 8.2 cm | 3 | 1/16 |
| 8 | 746–862 mm, 11.6 cm | 4 | 1/32 |
| 11 | 726–891 mm, 16.5 cm | 6 | 1/64 |
| 16 | 699–935 mm, 23.5 cm | 8 | 1/128 |

Every crossing sits at least 0.3 stops from a marked stop, so no domino is drawn on the line.
f/1.4 to f/16 is seven stops: 1/128 the light, and 2.0 cm of depth becomes 23.5 cm (×11.6).
The f-numbers are the marked stops; the math uses the exact powers of √2 behind them (1.41, 2, 2.83, 4, 5.66, 8, 11.3, 16).

The coda: print three times bigger, or look from a third of the distance, and the circle of confusion becomes 0.01 mm. At f/16 the sharp zone shrinks to 763–840 mm, 7.7 cm, and holds three dominoes.
The film leaves out diffraction. At f/16 the Airy disc is about 0.021 mm: under the 0.03 mm ring, but over the coda's 0.01 mm one. The README says so.

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
One idea per beat, and each one holds for at least a bar.
Every state change lands on a beat. Hero reveals land on a downbeat.
Captions are short serif sentences, at most two lines, placed where the picture leaves room.

### A. The puzzle, 0:00–0:22.5

- 0:00 A nine-blade iris springs open on eight dominoes at f/1.4, focused on the fourth. The city is a field of big discs. "f/1.4" rises in.
- 0:01.9 The focus racks to the nearest domino; 0:05 to the farthest; 0:08.8 back to the fourth.
- 0:07.5 "A lens focuses at one distance. / Everything nearer or farther is soft." under the dominoes.
- 0:12.5 The aperture clicks down a stop a beat, f/2 to f/16. The window's discs shrink into nine-sided dots and all eight dominoes come sharp.
- 0:17.5 "So why do all eight look sharp?" Held for two bars.

### B. The aperture, 0:22.5–0:40

- 0:22.5 The iris closes over the picture and the camera pulls back: it was the lens, seen from the front, with the photograph showing through its opening.
- 0:25 "This is the aperture: / an opening in the lens." A leader names it.
- 0:27.5 It opens wide. "The f-number says how wide it is. / f/1.4 is wide open." An "opening 35 mm" dimension sits above the lens, and "f-number = focal length ÷ opening" below.
- 0:30 It closes a stop a beat to f/16, the opening dimension counting down to 3.1 mm. "A bigger number, / a smaller opening."
- 0:32.5 A "light" readout halves with each stop, and the photograph seen through the opening darkens with it. "Each stop lets in / half as much light."
- 0:35 "f/16 lets in 1/128 / of the light at f/1.4." A note: the opening shot held its brightness with a longer exposure.
- 0:37.5 The aperture opens again. "But the aperture does / a second thing." The lens slides to the right of the frame.

### C. The cone, 0:40–1:35

- 0:40 The lens turns edge-on and becomes the lens of a side view: axis, lens, sensor. The photograph shrinks to a small panel, "on the sensor". "To see it, look from the side."
- 0:42.5 A domino stands at the left. "Take one point: a dot on a domino."
- 0:45 Rays burst from the pip. "Light leaves it in every direction."
- 0:47.5 The ones that reach the lens fill a tinted cone. "aperture" marks the lens's opening. "The aperture lets in a cone of it."
- 0:51.3 The lens folds the cone back to a point on the sensor. "The lens bends the cone back to a point."
- 0:55 The panel shows a dot. "The point lands on the sensor as a dot. / That dot is in focus." Held for two bars.
- 1:00 The domino slides nearer; the cone meets behind the sensor. 1:05 The sensor cuts it: a dimension line, and a disc in the panel. "The sensor cuts the cone: / a disc, not a dot."
- 1:10 It slides farther; the cone meets in front. "A disc again."
- 1:15 The panel becomes the photograph, magnified on the domino's pip, as soft as the disc says. "That disc is blur. / Every soft point in a photo is one."
- 1:20 The blades close in the side view: the cone narrows, the disc shrinks, and the magnified pip sharpens with it. "Now close the aperture. / The cone narrows, so the disc shrinks."
- 1:27.5 The blades open and the domino returns to focus. "That is its second job: / it sets how big the blur gets."
- 1:30 "But a disc is never a point. / So when does a disc look sharp?"

### D. The limit, 1:35–2:30

- 1:35 The panel grows to fill the frame, and its surface is a grid of photosites. "Zoom into the sensor: / a grid of tiny light meters, pixels." "6 µm".
- 1:40 "A sharp point lights one pixel."
- 1:45 "A disc smaller than a pixel / lights it exactly the same." 1:47.5 "To the sensor, it is still a point."
- 1:50 A bigger disc spreads over a patch. "Only a disc bigger than a pixel / spreads out and shows as blur."
- 1:55 The photosites crack into grains of silver. 1:57.5 The grains grow: "Faster film, bigger grains."
- 2:00 The grains pack into cones. "So does your eye, / with cells called cones." 2:02.5 The mosaic shrinks into a magnifier on the fovea of an eye in section.
- 2:05 Hero on the downbeat: "The finest detail it can see:" "1′", one arcminute.
- 2:10 The wedge reaches a print 40 cm away. "Hold a 15 cm print 40 cm away: / 1′ covers just 0.12 mm of it."
- 2:15 The print comes forward. "The print is 4.2 times the sensor," 2:17.5 and shrinks to the sensor: "so on the sensor, it is 0.03 mm."
- 2:20 Into the sensor along the dot until it is a ring five photosites across. "Any blur smaller than this ring / looks sharp to you."
- 2:23.8 "Photographers call it the circle of confusion."

### E. The zone, 2:30–3:12.5

- 2:30 The photograph rises again. "Back to the eight dominoes, at f/1.4."
- 2:35 The dominoes leave the photograph and land, one after another, on a distance axis in centimeters. "Stand them along a line, by distance from the lens."
- 2:37.5 Above each, its blur disc, enlarged 1200 times. "Above each: the blur disc it makes, enlarged."
- 2:40 Around each, the orange ring. "Around each: the ring, the smallest blur you can see."
- 2:45 "Only one disc fits inside its ring." 2:47.5 An orange band marks the depth of field, 2.0 cm. "That narrow range is the depth of field."
- 2:50 The aperture closes a stop every two beats to f/16. Every disc shrinks by √2 per stop; a domino lights with a wooden clack when its disc fits its ring; the band grows to 23.5 cm; the light halves to 1/128. "Now close the aperture, a stop at a time."
- 3:00 "1/128 of the light, but about 12 times the depth."
- 3:05 The aperture swings open to f/1.4 and shut again: the light and the depth trade places, and the dominoes tick out and clack back in. "The aperture trades light for depth."

### F. The answer, 3:12.5–3:25

- 3:12.5 The chart's iris grows to fill the frame and opens on the picture at f/16.
- 3:15 "Only one distance is in focus." A small orange marker over the fourth domino.
- 3:18.8 "The other seven blur by less / than you can see."
- 3:20 A magnifier on the farthest domino's pip: its blur disc, 0.026 mm, inside the 0.030 mm ring.

### G. The chain, 3:25–3:40

- 3:25 The picture gives way to a ladder of five small figures, built one every two beats: aperture, cone of light, blur disc, against the ring, depth of field. "The whole chain, once:"
- 3:32.5 The aperture closes, and each link follows in turn: the cone narrows, the disc shrinks, the disc drops inside its ring, the band widens. "Close the aperture, and every link follows: / a narrower cone, a smaller disc, a deeper sharp zone."

### H. Who draws the ring, 3:40–3:58.75

- 3:40 The chart returns at f/16, all eight inside. "One last question: who draws the ring?"
- 3:42.5 "Print it three times bigger, or look closer, / and you can see three times finer blur." The ring shrinks from 0.030 to 0.010 mm.
- 3:47.5 Dominoes fall out of the zone; the band shrinks to 7.7 cm. "The ring shrinks, fewer dominoes fit, / and the sharp zone gets thinner."
- 3:50 "Depth of field depends on who is looking."
- 3:52.5 The iris closes. Lockup: "Sharp is just / blur you can't see." Held to the end.

## Motion

Duration 3:58.75, one-shot.
Springs for arrivals: UI k = 260, d = 24; cards and camera k = 170, d = 26; type critically damped, no overshoot. The big diagram moves (the cone, the fold, the chart morph) use slower, critically damped springs so they read as one motion.
Eases for exits.
Each change of target adds a spring; nothing restarts.
Text leaves before a container morphs.
Focus is animated in lens extension (1/z), the aperture in stops (log N), so both move the way the controls do.

## Sound

Clock: 96 BPM, 96 bars; every cue comes from `src/clock.js`.
Synthesized in the page's code, mixed to −14 LUFS integrated, true peak under −1 dBTP.

- Iris and shutter, detent clicks for each stop, whooshes for the big moves.
- The focus ring: a soft friction glide whose pitch follows the lens extension.
- The focus tone: a sustained note whose voices detune in proportion to the blur disc. Out of focus it beats; in focus it is pure.
- Mosaics: a clean tick for a photosite, a dry crackle for grain, a soft pluck for a cone.
- A wooden clack when a domino enters the sharp zone, a soft tick when it leaves.
- The chain: each figure lands on a note of the A-flat scale, and each link glides as it follows the aperture.
- The coda: the ring's shrink is a falling glide, and each domino that drops out ticks.
- Music: a quiet chord bed with an FM glass arpeggio, a pad, and a plucked bass, in A-flat. The arpeggio runs in full eighths only while the aperture clicks; while the captions explain, it thins to quarters or half notes so there is room to read. Drums only under the eye, the stop-down, and the chain.

No voice. On-screen text carries the argument.

## Review

Three passes, scored 1 to 10 on hook, phone readability (360 px), motion, variety, composition, and sync.
Fix the three worst problems by timestamp each pass. Ship when every score is 8 or more.
Also check a fast-action strip and a 360 px phone sheet.

## Next

Open work, for whoever picks this up next. Delete each line when it is done.

1. Listen once on headphones or speakers. The mix was only checked by measurement (-14.0 LUFS, true peak -1.05 dBTP). If something sounds wrong, fix it in `src/sound.js`, then re-render (`npm run sound`, `npm run video`, `node tools/render.mjs --res 2 --preset medium --out out/one-arcminute-4k.mp4`; set `CHROME_PATH` to Chrome if Playwright has no matching Chromium).
2. Audiofool934/sketches#4 (the index line on `main`) can be marked ready and merged.

## Notes

### The 3:59 cut

The 72.5 s first cut was too fast: someone who already knew the optics could follow it, a beginner could not.
It was rebuilt on a new clock, with one idea per beat and at least a bar for each to sit.
New scenes: the aperture introduced on its own from the front (B), the disc shown to be the blur in the photograph (C, 1:15), the photograph morphing into the chart (E), the whole chain recapped (G), and the coda showing that the viewer sets the circle of confusion (H).

Rebuild review, scored hook / phone readability / motion / variety / composition / sync.

Pass 1: 8 / 7 / 8 / 8 / 7 / 8.

- 0:22.5–0:40: the front view of the lens sat under the captions. The lens moved right, and slides into the side view's lens position before turning edge-on.
- 3:40–3:52: the coda captions overlapped the axis. Moved above the chart.
- 0:27.5–0:40: the "opening" dimension collided with the formula note. It sits above the lens now.

Pass 2: 8 / 8 / 8 / 9 / 8 / 8.

- 0:07.5–0:22: the opening captions sat across the city's brightest bokeh. They moved under the dominoes, over the dark table.
- 1:15–1:28: "the photograph, magnified" ran off the right edge. Now "photo, magnified".
- 2:40: the long chart caption ran into "cm from the lens". The unit joins the last tick, "95 cm", and the first caption says "by distance from the lens".

Pass 3: 8 / 8 / 8 / 9 / 8 / 9. Measured: −14.0 LUFS integrated, true peak −1.05 dBTP, every bar between −11.7 and −16.1 LUFS except the fade-out.

- Left as they are: the small mono labels in the diagrams ("on the sensor", "6 µm") are small on a phone, but the captions carry the argument without them.

### The first cut, 72.5 s

Pass 1: 8 / 6 / 7 / 9 / 7 / 8.

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
