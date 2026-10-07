# odyssey trailers

## Idea

ΟΔΥΣΣΕΙΑ: Homer's Odyssey told on one mosaic wall in a dark room, in 113.56 seconds, to the soundtrack of the first Odyssey trailer.
The viewer should feel the weight of stone and the pull of home: a story that keeps breaking apart and setting itself again, until the last stone is laid and the man is home.

The first line of the poem calls Odysseus polytropos, the man of many turns.
That is the rule of the film: every scene is made from the stones of the scene before.
The stones lift, fly, and seat again as the next picture.
The film opens with words becoming a world, ΑΝΔΡΑ ΜΟΙ ΕΝΝΕΠΕ ΜΟΥΣΑ ΠΟΛΥΤΡΟΠΟΝ, "tell me, Muse, of the man of many turns", and it ends with the world becoming one word, ΟΔΥΣΣΕΙΑ.

The trailer gives the sound and nothing else.
No frame, composition, character design, or logo is taken from it; every picture is drawn in code.
The trailer audio and every render that carries it stay on this machine.

## Stack

mosaic.
No libraries.

Real bevelled stones in WebGL2, read from float textures, mortar with sinopia, damped-spring seating, raking light, thin-lens depth of field, AgX, grown from `piece/odyssey-lantern`.
`index.html` is a player and the engine lives in `engine/` as ES modules, because a film of nine pictures does not fit in one file:

- `engine/timeline.js` is the director: scenes on one clock, the laid build, the flock, the fall, ignitions, dissolves, bursts, cameras, lights.
- `engine/renderer.js` draws the stones, the bed, shadows, point lights, blur, lens, and tone.
- `engine/tessellate.js` cuts the stones: courses along every region's edge, irregular rubble, gap fill.
- `engine/picture.js` paints a picture's regions and colours, rim light, and arrivals.
- `engine/figures.js` and `engine/type.js` are the drawing kit: Greek figures, ships, sheep, flames, bands of colour, Greek lapidary capitals.
- `pictures/film1/*.js` are the nine pictures, and `shots/film-1.json` is the film's clock.

The page is served over HTTP (`npm run serve`), because a browser will not load modules or read pixels from `file://`.

## The wall, the light, and the camera

There is one wall and one camera, and the camera never cuts.
The light is the cinematographer: each scene has a key light at its own hour, and fire, lamps, torches, the sun, and lightning are real lights that rake the stones.
Every camera is clamped inside its picture, so the edge of a panel never shows.

Four ways the wall changes:

- Laid: stones drop and seat over the red sinopia, outward from one focal stone. The invocation and the homecoming are laid.
- Flow: the stones of one picture lift and fly as one flock and seat as the next. Stones are paired by tone and then by place on the screen, so gold goes where gold is needed and neighbours travel together. Each flock lands on a beat.
- Burst and fall: the Cyclops' eye bursts off the wall; at the wreck every stone falls.
- Ignite: fire, torches, the lamp, and lightning are lit smalti that catch on cue.

## Look

Frame: 3840 by 2160, the picture in a 3840 by 1608 band (2.39:1) between black bars.
24 fps exactly, 2,725 frames, the length of the soundtrack.

Silhouettes on luminous grounds, in the manner of black-figure vases: figures are dark stone with a rim course of lit stones on the side that faces the light.
Odysseus is known by his conical pilos cap.
Grounds run in courses, level in sky and sea, bending around every figure; rubble in rock; spirals in the whirlpool; rings around every light.

Accent: gold leaf, `#8a6a2e` `#b38d42` `#d9b25e` `#efd38d`.
Gold is in every scene in one place, and it travels: the letters, the moonlit horse's rim, the sun's road on the sea, the giant's iris, the Sirens' wings, the lamp, the title.
Silver leaf is its cold twin, for the moon and the dead.

The colour of the film is the colour of the journey:

- Invocation: lapis `#05070c` to `#141e35`, gold letters with a black outline course.
- Troy at night: sky `#04060f` to `#16224a`, moon in marble and silver, limestone walls, the horse in wood `#1a1109` to `#7c5026`, fire and torches in lit smalti.
- Dawn: sky in ten courses from `#25244e` through `#c47c6e` to `#f6d9bc`, the wine-dark sea `#0e0a1c` to `#4a3a6c`, rose glints, the sun's road in gold, black hulls with painted eyes.
- The cave: rubble `#050405` to `#24170f`, the giant in terracotta `#1e130d` to `#7a4e30`, his eye in marble with an amber iris, wool, firelight.
- The dead: ash `#08080a` to `#2a2a30`, shades in grey marble, the mother in white marble and silver, the blood pit.
- The Sirens: haze `#9e7c4a` to `#ecd29a`, rocks and bones, bird-women with gold feather fans, a red sail.
- The storm: black-green sea `#040c0b` to `#245046`, foam in marble, lightning in lit smalti.
- Ithaca: lamplight in terracotta, Penelope's robe `#0c1222` to `#24365e`, her veil in marble, the loom's red web with gold bands, the night in the doorway.
- Title: gold on lapis `#060c1e` to `#1c2c5c`.

Display face: Greek lapidary capitals, monoline and geometric as on cut inscriptions, drawn in code and laid in gold tesserae with a black outline course.
UI face: none; there is no interface.

Banned: gradient behind a centred title, fade-in on everything, corner labels, a frame border around a title, glow and bloom, invented product UI, a mosaic filter on a photo, a robot grid of equal tiles, anything traced from the trailer.

## Beats

Times are soundtrack seconds, measured from the file with `tools/score.py`.

0.0 to 6.55. Silence.
Hook: a candle comes up on the bare lime wall and finds the red sinopia of a letter.
At 1.2 the first gold stone, the crossbar of the Α, drops and seats.
In silence, macro, shallow focus, the word ΑΝΔΡΑ is laid.

6.55 to 14.44. The drone enters.
The line lays faster, ΜΟΙ ΕΝΝΕΠΕ ΜΟΥΣΑ, then ΠΟΛΥΤΡΟΠΟΝ, while the lapis ground fills in courses that bend around the letters.
The camera pulls back to the whole inscription.

14.44 to 16.6. The letters fly, and the flock seats as Troy at night, landing outward from the moon.

16.6 to 37.12. Troy.
The camera closes on the horse.
At 21.62 a gust: the moonlight swells and the sentry's torch flares.
At 24.36 the hatch in the horse's belly falls open on its four clanks, glowing with torchlight, and a rope drops.
From 26.6 men with torches come down one by one and run for the gate; at 33.6 the gate opens on fire.
On the five sounds from 34.88 to 36.33, five fires catch in the city.

37.12 to 52.65. Dawn.
The fire flies up and seats as the dawn sea, with the ships under sail.
The sun stands on the sea and lays a road of gold across it.
The camera closes on the painted eye at the lead ship's bow.

52.65. The downbeat.
The painted eye flows into a living eye: the Cyclops.

52.65 to 71.99. The cave.
The camera pulls back from the eye to the giant by his fire, his sheep, the men crouched among them.
At 62.0 his eye closes; he sleeps.
At 67.15 the point of the stake catches in the fire.
At 69.0 the men run it up toward the eye.
At 72.0 the eye bursts off the wall.

71.99 to 83.29. The dead.
The burst settles as ash: the land of the dead, in grey and silver.
Odysseus kneels at the blood pit with his sword, the shades stand in the mist, and his mother stands before him with her hands held out.
At 77.56, 79.64, and 82.66 she breaks into stones and drifts up like smoke, until she is gone.

83.29 to 90.0. The Sirens.
The ash flies and seats as golden haze: the Sirens on their rocks among bones, the ship passing with its red sail, Odysseus bound to the mast, the crew rowing.
At 85.55, 86.81, and 87.49 the Sirens' gold wings open, one after another.

90.0 to 99.0. Charybdis.
The haze darkens into a spiral sea, the ship heeled over at its rim, the camera rolling slowly with the water.
Lightning on 96.21, 97.18, 97.83, 98.15, and 98.79, each strike brighter.

99.0. The music cuts.
Every stone falls off the wall.

99.0 to 103.25. A voice in the dark.
Only the bare coat in a cold faint light, and on it the red sinopia of a woman at a loom.

103.25. One pure note.
A single flame stone catches in the dark: Penelope's lamp.

103.3 to 110.26. Ithaca is laid outward from the flame: the lamp, Penelope at her loom, the red web with its gold bands, the room.
At 108.32 a man in a pilos cap stands in the doorway against the night, and at 108.6 she turns.

110.26 to 112.9. The room lifts and flows into one word in gold: ΟΔΥΣΣΕΙΑ, the light raking across it.

112.9 to 113.56. Silence; the light dies away.

## Motion

Every frame is a pure function of time through `window.seek(t)`.
A laid stone drops about a stone's size, tumbles less than a turn, and seats with a closed-form damped spring, omega 36, zeta 0.4; letters seat without overshoot or tumble.
A flock launches in a wave from the outgoing picture, arcs toward the lens with a quarter turn of tumble, and seats in a wave outward from the incoming picture's focus; each stone changes colour from its source to its seat in flight.
Departures ease out; arrivals spring.
Water carries a travelling glint: the sea's stones rock a few degrees in a wave, so the light runs across them.
Fire and lamps flicker on seeded noise.
The camera runs monotone cubics through keys in seconds, can roll, and blends across a flow.
Motion blur is four subframes of the same instant, 180 degree shutter, each jittered for anti-aliasing.

## Sound

The soundtrack of Trailer 1, whole, 0 to 113.56 s, sample-exact, muxed as AAC.
No sound is added.
The picture is cut to the sound: every flock lands on a beat, every ignition on a sound.

## Render

Both trailers live in `ref/` under their own names, gitignored with everything else there.
`ref/t1.webm` and `ref/t2.webm` link to them, and only Trailer 1's audio is used.
`npm run serve` and open `http://127.0.0.1:8017/?film=1`, or hold one frame with `&t=52.7`.
`?view=labels`, `?view=color`, and `?view=tiles` with `&shot=cave` show a picture before it is stone.

```bash
node tools/render.mjs --film 1 --intermediate h264 --out out/film1
```

```bash
tools/mux.sh 1 0 2725 out/film1/video.mp4 out/odyssey-film-1.mp4
```

`tools/still.mjs` and `tools/sheet.py` make review stills and contact sheets; `tools/score.py` reads the soundtrack into onsets, hits, and spectrogram strips.

## Notes

The soundtrack, measured: silent to 6.55 s; a drone from 6.55; effects bursts at 24.36 to 25.38 and 34.88 to 36.33; the music opens at 37.12; section turns at 52.65, 67.15, and 72.0; a hit at 83.29; percussion accelerating from 96.21 to 98.79; a hard cut to near silence at 99.0; a voice at 99.69 to 101.14 and 102.39 to 102.89; a pure tone at 103.25; the music back at 103.90; the swell decays into silence at 112.94.

Phase 0, the shot-for-shot slice of the trailer, is retired.
Its pictures and the tools that traced and tracked trailer frames are archived in `ref/phase0/`, which stays on this machine.

The master renders at 3840 by 2160 with four subframes in about 11 minutes after a 65-second setup: 0.21 s per frame end to end, 73 to 82 ms of it on the GPU.
It is 684 MB, H.264 CRF 16, with the soundtrack as AAC at 320 kb/s, offset 0 samples from the source.

Review, three passes, out of 10: hook 8, phone readability 8, motion 8, variety 9, composition 8, sync 8.
The first pass found Troy dark and static, the sinopia in the dark unreadable, and the invocation and the cave dim.
The second lit the raid with torches and the hatch, and lifted the dark beat.
The third gave the dead three rows of mist, shaped the giant's face with shadow, and turned the whirlpool's rings into a turning sea.
What would come next: the cave's long middle (58 to 66) holds one composition for eight seconds; the title arrives late in its own flow.

The stone engine has since been extracted into the mosAIc project and its `mosaic` skill, by way of `piece/the-road-home`, whose engine began as a copy of this one.
This piece keeps its own engine, so it still renders exactly as it did.

Found while building:

- A rubble region has no courses, so the gap fill seeds it. Farthest-point seeding is quadratic, and a whole wall of rubble hung the page; large gaps now use a jittered grid, and a gap's stone size is averaged over its own pixels, because the centroid of a wrapped region can fall inside another.
- An arrival is painted and cut only inside its own bounds, which made loading Troy five times faster.
