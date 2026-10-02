# four millimeters

## Idea

An explainer film that answers one photographer's puzzle.
Going from 24 mm to 28 mm changes the picture a lot.
Going from 200 mm to 204 mm changes almost nothing.
Both steps are 4 mm.
The viewer should feel the click of a ratio: 4 mm is a sixth of 24 and a fiftieth of 200, and the eye counts in fractions, not millimeters.

The film shows the effect first, then the geometry, then the ruler that fixes the intuition.
It ends by turning the opening question around: "Same 4 mm. Different jump." becomes "Different mm. Same jump."

## Stack

`film`, kept as one HTML page.
Canvas 2D, drawn as a pure function of time.
Read `stacks/film.md` and `stacks/canvas.md` on main.
No Remotion, no HyperFrames, no libraries in the page.
The page's code is split into a few classic scripts under `src/` so it still opens from `file://`.
Playwright steps `window.seek(t)` and ffmpeg encodes.
The soundtrack is synthesized in plain JavaScript from the same clock (`src/clock.js`).

## Limits

Duration: 75 s, 30 bars at 96 BPM (one beat is 0.625 s, one bar is 2.5 s).
Frame size: 1920 × 1080, 60 fps, 4 motion-blur subframes per frame (180° shutter).
Loop or one-shot: one-shot.

## Facts the film uses

Full-frame sensor, 36 mm wide.
The lens is drawn as a pinhole (thin lens focused far away), so the focal length is the lens-to-sensor distance.
Horizontal angle of view is 2 atan(18 / f).

| f (mm) | angle | picture size against the step before |
| --- | --- | --- |
| 24 | 73.7° | |
| 28 | 65.5° (−8.3°) | ×28/24 = ×1.17, a sixth bigger |
| 200 | 10.3° | |
| 204 | 10.1° (−0.2°) | ×204/200 = ×1.02, a fiftieth bigger |
| 233 | 8.8° | ×233/200 = ×1.17, the 24 → 28 jump |

Standing still and changing focal length only crops the picture, so every focal length in the film is a crop of one drawing.
24–70 mm is ×2.9 and 70–200 mm is ×2.9.

## Look

Two worlds.
The diagram world is ink on near-black, drawn like a technical plate: hairline rays, dimension lines with arrowheads, gauge blocks.
The picture world is a flat illustration of a harbor at blue hour with a clock tower at its center.
It is drawn once in angle coordinates, so 24 mm and 233 mm are crops of the same drawing.
The lamp posts and the railing frame the 24 mm view and fall out at 28 mm.
At 200 mm the clock face is readable.

Palette, diagram:

- Ground #0c0f17
- Ink #efe9dc
- Dim ink #8b8679
- Rule #343a48
- Field of view tint #1c2c4d

Accent: signal orange #ff6a1a, only for the 4 mm and whatever measures it.

Palette, harbor:

- Sky #0f1b33, #1c3157, #36507d, #6a7ba3, #b08c8e, horizon #d9a27e
- Hills #4f6290, #3a4c78
- City #2c3d63, #1d2a48, tower #23314f
- Windows #f3c978, clock face #f4e7c8
- Water #0f1a30 to #24365a
- Foreground #070b14

Display face: Instrument Serif, regular and italic, for numerals and headlines.
UI face: Geist Mono, for labels and measurements.
Banned: gradient behind a centered title, fade-in on everything, corner labels, frame borders, glow, invented product UI.
No camera HUD: no battery, no ISO, no shutter readout.

## Beats

The hook lands at 1.25 s, the first jump.
Something new every 1.25 to 2.5 s.
Every state change lands on a beat. Hero reveals land on a downbeat.

### A. The puzzle, 0:00–0:10

- 0.00 Black. Shutter. A nine-blade iris springs open on the harbor at 24 mm.
- 0.63 "24 mm" rises into the sky from behind a mask.
- 1.25 Click: 28 mm. The picture springs tighter. The lamps and the railing leave the frame. The numeral rolls 24 → 28 and an orange "+4" chip arrives.
- 1.88 Click: back to 24. 2.50 Click: 28 again.
- 3.13 Whoosh. The picture zooms to 200 mm at an even rate in log scale. The counter runs up.
- 4.38 The clock tower fills the frame.
- 5.00 Click: 204. Nothing moves but the numeral and the chip. 5.63 Click: 200. 6.25 Click: 204.
- 6.88 The picture shrinks into the right-hand print. The 24 mm print slides in on the left.
- 7.50 Both prints flip on every beat, left 24 ↔ 28, right 200 ↔ 204. Labels rise under them.
- 8.13 "Same 4 mm."
- 8.75 "Different jump."

### B. The geometry, 0:10–0:32.5

- 10.00 The right print leaves. The left print lifts and widens into a strip of the whole harbor, and its edges become the lit window of a field of view.
- 11.25 A lens and a sensor arrive below. Two rays draw from the sensor's edges through the lens to the window's edges.
- 12.50 Dimension line: focal length, 24 mm, lens to sensor.
- 13.75 Angle arc: 73.7°.
- 15.00 An orange 4 mm block extends the dimension. The sensor drops 4 mm. The wedge and the window narrow. 73.7° rolls to 65.5°.
- 16.25 "−8.3°" in orange.
- 17.50 Labels leave. The sensor runs out to 200 mm while the drawing rescales, so the triangle keeps its height and gets thinner. The window closes on the tower.
- 20.00 10.3°.
- 21.25 The orange block again, now a hairline. 10.1°.
- 22.50 "−0.2°".
- 23.75 The strip leaves. The 200 mm camera moves right. The 24 mm camera returns on the left at the same height.
- 25.00 Both triangles fold flat into columns of 4 mm blocks: 6 and 50, plus one orange block each.
- 27.50 "1/6" against "1/50".
- 30.00 "picture +17%" against "picture +2%".

### C. The ruler, 0:32.5–0:50

- 32.50 The left column leaves. The right column's blocks turn and lie end to end: a millimeter ruler.
- 35.00 The 24–28 and 200–204 blocks glow orange and measure the same.
- 36.25 Real focal lengths rise as ticks: 14, 16, 20, 24, 28, 35, 50, 70, 85, 105, 135, 200.
- 37.50 The ruler re-scales by ratio over 2.5 s. Short blocks stretch, long ones squeeze.
- 40.00 Downbeat. On the ratio ruler, 24–28 is eight times as long as 200–204.
- 41.25 The 24–28 step slides along and lands on 200–233.
- 43.75 Zoom brackets: 24–70 and 70–200 are the same length, ×2.9 each, though one is 46 mm and the other 130 mm.
- 47.50 The ruler drops to the bottom edge. A focal-plane shutter wipes up to the harbor at 24 mm.

### D. Count it, 0:50–1:02.5

- 50.00 Counter "24 mm", caption "+4 mm per click".
- 51.25 44 clicks in 3.4 s to 200 mm. The zoom slows to a crawl, the marks bunch up on the ruler, and the pitch of each click climbs less and less.
- 55.63 Snap back to 24.
- 56.25 Caption "×1.17 per click". 14 clicks to 208 mm. Even steps, even marks, and the pitch climbs in even steps.
- 61.25 "Equal ratios look equal."

### E. Answer, 1:02.5–1:15

- 62.50 The two prints return: left 24 ↔ 28, right 200 ↔ 233, flipping on the beat. Orange "×1.17" under both.
- 65.00 "Different mm. Same jump."
- 67.50 The iris closes.
- 68.13 Lockup: "Count in ratios, not millimeters."
- 75.00 End on the held line.

## Motion

Closed-form springs, so every pose is a function of time.
UI k = 260, d = 24. Cards and camera k = 170, d = 26. Long camera moves k = 40, d = 12.6.
Type uses a critically damped spring: no overshoot.
Zooms animate the logarithm of the focal length, so a zoom looks even.
When a value changes target more than once, each change adds a spring; old springs are never restarted.
Text leaves before a container changes shape, and new text arrives after the change has started.
Departures use eases.

## Sound

Yes. Synthesized in `src/sound.js` from the cue sheet in `src/clock.js`.
A quiet chord bed in D at 96 BPM, a glassy plucked arpeggio, a sub, and soft drums in the ruler section.
Effects: a shutter, clicks for each focal-length change, whooshes, wood-block tocks for the gauge blocks, a riser into the ratio ruler.
In part D every click is a pitched tick whose frequency is ten times the focal length.
Adding 4 mm sounds like a climb that flattens out; multiplying by 7/6 climbs in even steps, because the ear counts in ratios too.
Mix target −14 LUFS integrated, true peak below −1 dBTP.
No voice.

## Review

Three passes at least: hook, phone readability at 360 px, motion, variety, composition, sync, each scored 1 to 10.
Fix the three worst problems by timestamp until every score holds at 8.
Check a fast-action strip, a 360 px phone sheet, and that the last frame holds.

## Notes
