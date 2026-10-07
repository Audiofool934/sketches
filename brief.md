# twenty-five millimeters

## Idea

An explainer film about background blur: what sets how much of it there is, and why it looks different from lens to lens.
An out-of-focus light is a picture of the lens's opening.
How big the blur is comes from how big the opening is, measured against the subject.
What the blur looks like comes from what the opening looks like, seen from the light: its blades, the barrel that clips it, and the glass that spreads light across it.
Focal length and f-number are not two separate controls of blur; they meet in one number, the width of the opening, focal length ÷ f-number.

The viewer should feel the click when a 200 mm lens at f/8 and a 50 mm lens at f/2 draw the city as the same discs, because both look through the same 25 mm opening.

It is the third film in the Photogram series (逐格, Fotograma), after Four Millimeters and One Arcminute, with the same type, diagram ink, accent, and picture world.
The city that stayed soft at f/16 in One Arcminute is the subject here.

## Who it is for

Two viewers, as in the rest of the series.

- Someone who knows nothing about cameras should follow every step. The opening is shown before it is measured, the f-number is recalled before it is used, and every link (far light → beam → opening at the subject → disc) gets its own scene.
- Someone who already knows the topic should gain intuition they did not have: the blur of a distant light is exactly the opening laid beside the subject; for a background just behind the subject the f-number decides and focal length hardly matters; and the same lens can draw a soft background and a hard foreground.

The pacing rule for the series: one idea per beat. Show it, name it, then let it sit for at least a bar before the next idea arrives. Every link between ideas is a visible morph, never a cut.

## Stack

`film`, kept as one HTML page.
Canvas 2D, drawn as a pure function of time.
Read `stacks/film.md` and `stacks/canvas.md` on main.
No Remotion, no HyperFrames, no libraries in the page.
Classic scripts under `src/` so the page opens from `file://`.
The page starts from a copy of One Arcminute's `src/` and `tools/` (kit, optics, scene, sound, render); the branches stay separate.
Playwright steps `window.seek(t)` and ffmpeg encodes.
The soundtrack is synthesized in plain JavaScript from the same clock (`src/clock.js`).

Blur is drawn from the thin-lens model, not faked by eye, as in One Arcminute.
Each object is blurred by its own blur-disc diameter at its own distance, and point lights are drawn as discs in the shape of the opening as seen from that light.

## Limits

Duration: 4:00, 96 bars at 96 BPM (one beat is 0.625 s, one bar is 2.5 s).
Frame size: 1920 × 1080, 60 fps, 4 motion-blur subframes per frame (180° shutter). A native 4K render from the same drawing.
Loop or one-shot: one-shot.

## Facts the film uses

Full-frame sensor, 36 × 24 mm, thin lenses, distances measured from the lens.
The opening is what you see looking into the front of the lens: its diameter is D = f / N.

The rule for a distant light.
A light at infinity sends parallel rays, so the opening admits a beam exactly D wide.
Every ray through a point of the focused plane lands on that point's image, so the beam's cross-section at the subject is imaged onto the sensor like the subject is.
On the sensor the disc is D × m, where m is the magnification; measured at the subject, the disc is D.

The rule for any background.
A point a gap g behind a subject at distance s, so at z = s + g, blurs into a disc that measures D × g / z at the subject, and D × m × g / z on the sensor.
For a far background g / z → 1 and the opening decides.
For a background close behind, keeping the framing means s grows with f, so the larger opening and the smaller share g / z cancel and the f-number decides.

The scene: one ivory domino, 48 mm tall, framed at m = 1/8, so it is 6 mm on the sensor, a quarter of the frame's height.
The subject distance is 9 f: 45 cm for 50 mm, 90 cm for 100 mm, 180 cm for 200 mm.
The city is at infinity.
The near background is a second domino 10 cm behind the first.
Circle of confusion, carried over from One Arcminute: 0.03 mm.

| lens | opening | light | city disc on the sensor | at the subject | domino 10 cm behind, at the subject | on the sensor |
| --- | --- | --- | --- | --- | --- | --- |
| 50 mm f/2 | 25 mm | 1 | 3.1 mm, 8.7 % of the width | 25 mm | 4.5 mm (share 10 / 55) | 0.57 mm |
| 100 mm f/4 | 25 mm | 1/4 | 3.1 mm | 25 mm | 2.5 mm (10 / 100) | 0.31 mm |
| 200 mm f/8 | 25 mm | 1/16 | 3.1 mm | 25 mm | 1.3 mm (10 / 190) | 0.16 mm |
| 100 mm f/2 | 50 mm | 1 | 6.3 mm | 50 mm | 5.0 mm | 0.62 mm |
| 200 mm f/2 | 100 mm | 1 | 12.5 mm, 35 % of the width | 100 mm | 5.3 mm | 0.66 mm |

The three f/2 lenses blur the near domino within 16 % of each other; the three 25 mm openings blur it 0.57, 0.31 and 0.16 mm.
Every near-domino blur is at least five times the 0.03 mm ring, so it reads as soft in every picture, and none is near the line.
Horizontal angle of view: 39.6° at 50 mm, 20.4° at 100 mm, 10.3° at 200 mm, so the 200 mm picture shows a quarter as much city, four times bigger.
At the same opening the discs are the same size, but the city's shapes behind them are four times bigger, so the long lens's city reads more clearly; the film shows this rather than calling the two pictures identical.

The look of the blur:

- Wide open, the opening is the round rim of the lens, so the disc is round whatever the blades.
- Stopped down, the blades set the opening: nine curved blades give a nine-sided disc with soft corners, seven straight blades a heptagon.
- Toward the edge of the frame a light sees the opening at an angle, and the barrel's front rim clips it. The visible opening is the overlap of two circles, a cat's eye, long across the radius. Lined up around the center, the cat's eyes make the swirl. Stopping down a stop or two makes the blades the narrowest opening, and the discs round out.
- Spherical aberration, undercorrected as in most fast lenses: rays through the edge of the glass cross the axis a little early. Behind the focus (a background light) the edge rays spread wider and the disc fades toward its rim. In front of the focus (a foreground light) they crowd toward the rim and it draws a bright ring. Overcorrected lenses swap the two.
- Molded or polished aspherical elements leave fine ripples that show as onion rings. An apodization filter darkens toward its edge, so the disc fades out. A mirror lens has a mirror in the middle of its opening, so its discs are rings.

Left out, and said so in the README: the entrance pupil's position in a real thick lens (distances here are from the thin lens), chromatic aberration (purple fringes in front of the focus, green behind; off the palette), diffraction, and focus breathing.
The pictures in the hook differ by four stops; the film holds their brightness with exposure time and says so, as One Arcminute did.

## Look

Two worlds, as in the rest of the series.
The diagram world is ink on near-black, drawn like a technical plate: hairline rays, a tinted beam, dimension lines with arrowheads.
The picture world is One Arcminute's photograph: an ivory domino on a black lacquered table, in front of a tall window over a city at night.
The city lights are the bokeh, and here they are the subject.

Palette, diagram:

- Ground #0c0f17
- Ink #efe9dc
- Dim ink #8b8679
- Rule #343a48
- Beam tint #1c2c4d

Accent: signal orange #ff6a1a, only for the opening: its outline, its width, and the hoop that shows it at the subject.

Palette, picture:

- Night sky #070b16 to #13213d, city haze #2a2f45
- City lights: cool white #dce9ff, blue #8fb8ff, sodium #ffb766 (few)
- Window frame #05060a
- Table #07080b with reflections
- Dominoes: ivory #efe6d0 to #c9bb9c, pips #15130f, spinner brass #b8945a

Display face: Instrument Serif, regular and italic, for numerals and headlines.
UI face: Geist Mono, for labels and measurements.
Banned: gradient behind a centered title, fade-in on everything, corner labels, frame borders, glow, invented product UI.
No camera HUD. Bokeh discs are drawn with their true edges: hard where the optics make them hard, soft only where the film is about a soft edge (spherical aberration, apodization). No halos.
Lenses are drawn as generic barrels with no brand or model marks.

## Beats

The hook is moving by 0.6 s: the iris opens and the city blooms into discs.
One idea per beat, and each one holds for at least a bar.
Every state change lands on a beat. Hero reveals land on a downbeat.
Captions are short serif sentences, at most two lines, placed where the picture leaves room.

### A. The puzzle, 0:00–0:20

- 0:00 A nine-blade iris springs open on one domino, 45 cm from a 50 mm lens at f/2, focused on it. Behind the window the city blooms into discs. "50 mm  f/2" rises in.
- 0:05 The camera steps back to 180 cm while the lens lengthens to 200 mm and closes to f/8, keeping the domino the same size. The city swells four times behind it; the discs keep their size. The readout rolls to "200 mm  f/8".
- 0:10 The frame splits: 50 mm f/2 on the left, 200 mm f/8 on the right. An orange outline lands on one disc in each, the same size. "50 mm at f/2. / 200 mm at f/8."
- 0:12.5 "f/8 lets in 1/16 of the light. / The discs are the same size." A small note: the exposure was lengthened to match.
- 0:17.5 "So what sets the size of the blur?" Held for a bar.

### B. The disc is the opening, 0:20–1:05

- 0:20 The split closes on the 50 mm picture. The iris closes and the camera pulls back: it was the lens, seen from the front. Its opening is outlined in orange. "Start with the opening of the lens."
- 0:25 An orange dimension: "25 mm". "On a 50 mm lens at f/2, / it is 25 mm across."
- 0:30 The lens turns edge-on into the side view: axis, lens, sensor, and the domino in front. A city light is far off to the left, and its rays arrive parallel. "A city light is so far away / its rays arrive side by side."
- 0:35 Only the rays that fit through the opening get in: a tinted beam exactly as wide as the opening. "The opening lets in a beam / as wide as itself."
- 0:40 Where the beam passes the domino, an orange hoop marks its width: 25 mm. "Where the domino stands, / the beam is 25 mm wide."
- 0:45 The lens folds the domino's plane onto the sensor, eight times smaller: the domino's image and the hoop's image together. The beam crosses and lands on the sensor as a 3.1 mm disc, exactly the hoop's image. "The lens shrinks that plane onto the sensor, / the domino and the beam alike."
- 0:52.5 Back to the picture: the orange hoop stands beside the domino at life size, and a city disc slides onto it, an exact fit. "In the photo, every distant light / is the opening, laid beside the subject."
- 0:57.5 "25 mm beside a 48 mm domino: / about half its height."
- 1:02.5 "So what sets the opening?"

### C. Focal length and f-number, 1:05–1:50

- 1:05 The picture shrinks back into the front view of the lens, and two longer lenses slide in beside it: 100 mm and 200 mm. "The f-number is the focal length / divided by the opening."
- 1:10 They click to f/2, f/4 and f/8, and the three orange openings come out the same. "50 ÷ 2, 100 ÷ 4, 200 ÷ 8: / three 25 mm openings."
- 1:15 Three pictures, each framed on the same domino from 45, 90 and 180 cm. Their discs match. "Same opening, same disc."
- 1:20 A light readout under each: 1, 1/4, 1/16. "The f-number sets the light. / The opening sets the blur."
- 1:25 All three click to f/2. The openings grow to 25, 50 and 100 mm, and the discs to half a domino, a whole one, and two. The light readouts all read 1. "At the same f-number, / a longer lens has a wider opening."
- 1:32.5 "A 200 mm f/2 needs a 100 mm opening. / That is why fast long lenses are so big."
- 1:37.5 Back to the hook's pair, 50 mm f/2 and 200 mm f/8. Two angle-of-view wedges, 40° and 10°, reach into the city. "The long lens also sees / a quarter as much city."
- 1:42.5 In the 200 mm picture the city is four times bigger behind discs of the same size. "The blur is the same size. / The city behind it is bigger." Held to 1:50.

### D. Just behind the subject, 1:50–2:30

- 1:50 The side view again. A second domino stands 10 cm behind the first. "Now a background close behind: / a domino 10 cm back."
- 1:55 From a pip on it, a cone reaches the edges of the opening. Where it passes the first domino, the orange hoop is only 4.5 mm wide. "Its cone is still narrow / where it passes the subject."
- 2:00 A note below: "blur at the subject = opening × gap ÷ distance". "Its blur is the opening, / times 10 cm out of 55."
- 2:07.5 The 200 mm lens at f/2 from 180 cm: the opening four times wider, the gap now 10 cm out of 190. The hoop is 5.3 mm, about the same. "Step back for the long lens: / 4 × the opening, but 10 cm out of 190."
- 2:15 Three pictures of the back domino: 50 mm f/2 and 200 mm f/2 nearly the same, 200 mm f/8 much sharper. "Just behind the subject, / the f-number decides."
- 2:22.5 "Far behind: the opening. / Close behind: the f-number." Held to 2:30.

### E. The shape of the blur, 2:30–3:05

- 2:30 The picture at 50 mm f/2. A magnifier settles on one disc. "So why do lenses blur differently?"
- 2:35 The view turns to look from the city light back at the lens: the opening, and beside it the disc, the same shape. "Each disc is a picture of the opening, / seen from the light."
- 2:40 The aperture closes to f/4, then f/5.6. Nine blades enter, and every disc turns nine-sided, its corners softened by the curved blades. "Close the aperture, / and the blades draw their shape."
- 2:45 Four irises in a row with their discs: nine curved blades, seven straight, six, five. "Every iris draws its own."
- 2:50 A light near the corner of the frame. From there the opening is seen at an angle, cut by the barrel's front rim: two circles overlap into a cat's eye. "From the corner, the light sees the opening / at an angle, cut by the barrel."
- 2:55 The picture's edges fill with cat's eyes, lined up around the center: a swirl. "Lined up, the cat's eyes swirl."
- 3:00 The aperture closes a stop. The blades become the narrowest opening, and the discs round out. "Close a stop, and they round out."

### F. The light inside the disc, 3:05–3:35

- 3:05 The side view, a fan of rays through the lens. The edge rays cross the axis a little early, exaggerated so it shows. "Glass bends light at its edge / a little more than at its center."
- 3:10 The sensor cuts the fan behind its crossing, as for a background light. The rays thin out toward the rim, and the disc beside it fades at its edge. "Behind the focus, the edge thins out: / a soft disc."
- 3:15 The sensor cuts in front of the crossing, as for a foreground light. The rays crowd at the rim, and the disc draws a bright ring. "In front of it, the edge piles up: / a hard ring."
- 3:20 "The same lens draws a soft background / and a hard foreground."
- 3:25 Three more discs, each with a small mono label: onion rings (molded glass), a fading edge (an apodization filter), a ring (a mirror lens). "Rings from molded glass, a fading filter, / a mirror in the middle."
- 3:30 "Every lens leaves its fingerprint / in the blur."

### G. The answer, 3:35–4:00

- 3:35 Back to the picture at 50 mm f/2. "How big the blur is: / the opening, measured at the subject."
- 3:40 "What it looks like: / the opening, seen from the light."
- 3:45 The lens changes every two beats, with no caption: 200 mm f/2 (huge discs), seven straight blades at f/5.6 (heptagons), a swirly lens wide open (cat's eyes), a mirror lens (rings).
- 3:50 The iris closes. Lockup: "Out of focus, / every light draws the lens." Held to the end.

## Motion

Duration 4:00, one-shot.
Springs for arrivals: UI k = 260, d = 24; cards and camera k = 170, d = 26; type critically damped, no overshoot. The big diagram moves (the beam, the fold onto the sensor, the lens swaps) use slower, critically damped springs so they read as one motion.
Eases for exits.
Each change of target adds a spring; nothing restarts.
Text leaves before a container morphs.
Focus is animated in lens extension (1/z), the aperture in stops (log N), and focal length in log f, so each moves the way its control does.
The step back and the lens change in the hook are one move: distance and focal length both follow log f, so the domino holds its size on every frame.

## Sound

Clock: 96 BPM, 96 bars; every cue comes from `src/clock.js`.
Synthesized in the page's code, mixed to −14 LUFS integrated, true peak under −1 dBTP.
The same instruments as One Arcminute, in E-flat, so the series sounds related and this film has its own key.

- Iris and shutter, detent clicks for each stop.
- The lens change: a zoom glide whose pitch follows log f, under a dolly whoosh for the step back.
- The opening has a voice: a glass tone whose pitch drops an octave each time the opening doubles. Three equal openings ring in unison; at f/2 the three lenses ring an octave apart.
- The hoop fitting the disc: a clean two-note click.
- In D the near domino's blur has its own tone; the f/2 lenses land almost in unison, and f/8 jumps away.
- Blades: a short plucked run per iris, one note per blade. The swirl: a slow phaser sweep.
- The soft disc is a pad with a slow attack; the hard ring is a bell with a sharp one.
- Music: a quiet chord bed with an FM glass arpeggio, a pad, and a plucked bass. The arpeggio runs in eighths while the lenses change and the aperture clicks, and thins under the captions so there is room to read. Drums only under the hook's lens change, the f/2 lens swaps, and the closing montage.

No voice. On-screen text carries the argument.

## Review

Three passes, scored 1 to 10 on hook, phone readability (360 px), motion, variety, composition, and sync.
Fix the three worst problems by timestamp each pass. Ship when every score is 8 or more.
Also check a fast-action strip and a 360 px phone sheet.

## Next

Open work, for whoever picks this up next. Delete each line when it is done.

1. Copy One Arcminute's `src/`, `tools/`, `assets/` and `package.json` onto this branch, rename the film, and draw the first cut. The brief is signed off.
2. Push this branch and the index commit on `main` only when Everett says so. One Arcminute went online on 2026-10-06, so there is no hurry.
