# sketches

This is a sketchbook.
Each piece is an orphan branch named `piece/<slug>`, checked out at `.pieces/<slug>`.
Work only in that folder.
`main` is the index.
Do not merge pieces together.
Do not clone toolkits into this repo.

The aim is a visually stunning coded animation.
Default to 2D.
A lot of the strong pieces are flat drawings, type, and UI, and they do not need a 3D renderer.

## How the repo is split

`main` holds the index, the starter, the templates, and the notes below.
A piece holds `brief.md` and the files that draw it.
A stack is how the picture is made.
A grammar is a way of building inside one stack.
A kit is an outside reference, listed in `kits.md`.

Read the one stack note that matches the idea.
Read a kit only when the brief names that look.
A piece names its stack in `brief.md` and does not copy these notes onto its branch.

## Pick the stack before writing code

Decide from the idea, then write the stack name at the top of `brief.md`.
Logline and limits first.
Look second.
Tools last.
If you start from a library, the technique eats the idea.

Use 2D when the piece can be storyboarded as shapes, type, layers, and overlap.
Fake depth with scale, parallax, and overlap.
A chart, a logo loop, a kinetic headline, a paper explainer, a pixel scene, an ink film, and a morphing interface are 2D.

Use a 3D renderer only when the idea fails as a drawing.

- The camera has to travel through a volume.
- An object has to turn in light so new sides are revealed.
- The subject is a mechanism whose depth is the point, such as joinery, a linkage, or a product coming apart.

| Idea | Stack | Leave behind |
| --- | --- | --- |
| Loop, UI morph, type, diagram, chart, ink, pixels | `canvas`. Read `stacks/canvas.md`. | Remotion, HyperFrames, Three.js, Blender |
| Stones that are the picture | `mosaic`. Read `stacks/mosaic.md`. | Canvas `fillRect` for the stones, Three.js, a mosaic filter on a photo |
| Scene you orbit or walk through in the browser | `three`. Read `stacks/three.md`. | Blender |
| Path-traced materials, cloth, or a lit film shot | `blender`. Read `stacks/blender.md`. | The browser |
| Edited multi-scene film | `film`. Read `stacks/film.md`. | A stack change just to export a loop |

A 6-second loop is `canvas`, or `mosaic` when the stones are the picture.
An MP4 of a page you already drew stays on the stack that drew it.
The export steps are in the render contract below.

## Render contract

This contract covers `canvas`, `mosaic`, `three`, and any `film` that is still one HTML page.
`blender` does not use it.
`stacks/blender.md` says what a Blender shot uses instead.

Every frame is a pure function of time.
Expose `window.seek(t)` that draws time `t` in seconds and returns.
No CSS transitions, no timers, and no state carried between frames while rendering.
Seeded noise only.
Never `Math.random`.
Frame 0 matches the last frame, including velocity, when the piece loops.
Seeking to frame 300 twice must produce the same pixels.
A later frame must draw correctly without simulating the frames before it.

Live preview may use `requestAnimationFrame` only when `navigator.webdriver` is absent.
The render path calls `seek(t)` directly.

For an MP4 export, capture in Playwright and encode with ffmpeg: H.264, `yuv420p`, CRF 16.
Motion blur blends subframes of the same instant.
It does not smear the previous frame.
60 fps with 4 subframes is the film setting.
A loop that will be posted as a GIF can stay at 15 fps, one palette, no dither.

## How to take the brief

Write this into `brief.md` before the animation, and show it before a long render.

- One sentence: what it is, and what the viewer should feel.
- Duration, frame size, and loop or one-shot.
- The stack name, from the table above.
- Palette as hex. One accent. One display face and one UI face, named.
- Banned looks: gradient behind a centered title, fade-in on everything, corner labels, frame borders, glow, invented product UI.
- Beats with times. Something new every 2 to 4 seconds. Hook inside the first 2 seconds.
- For each beat: what is on screen, how it enters, the action, how it leaves.
- Motion rule: springs for arrivals, eases for departures, no overshoot on type.
- Whether sound exists. A silent loop is complete.

For a story film, a visible object in one scene becomes the first object of the next.
Do not hard-cut a deck of slides.
Do not repeat narration as on-screen text.
Labels stay short enough to read at phone width.

A reference image or clip is welcome.
Take its grammar: palette, grid, pacing, camera, texture.
Do not take its story, logo, characters, or composition.

## Motion

Replace generic easing with a closed-form spring so the pose stays a function of time.
Starting points from the playbook: snappy UI `k = 260`, `d = 24`.
Cards and camera `k = 170`, `d = 26`.
Mascots `k = 130`, `d = 18`.
Tiny overshoot on UI.
None on type.
A larger overshoot only on a mascot.

If a value changes target more than once, add a new spring at each change.
Do not restart the old spring.
Text leaves before a container morphs, and the new text arrives after the morph has started.
If the only description of a move is slide, scale, or fade, find a physical idea.

## Sound

Design the clock before the motion when the piece has sound.
State changes land on beats.
Hero reveals land on downbeats.
Clicks, pops, thumps, and whooshes can be synthesized in the page.
That is enough for a sketch.

Claude cannot sing, speak with a natural voice, or film a real room by writing canvas code.
Those need a separate audio or video model, named in the brief.
Do not block a 2D piece on them.
Do not time-stretch speech.
A mix target, when there is a mix, is about -14 LUFS.

## Review

Match the review to the length.

A loop: open the HTML, then render about 8 frames across the duration side by side.
Fix by timestamp.
Read the sheet yourself.

A film: at least three passes.
Score hook, phone readability, motion, variety, composition, and sync from 1 to 10.
Name the three worst problems with timestamps.
Fix only those seconds.
Ship when every score holds at 8 or above.
Also check a fast-action strip, a 360 px phone sheet, and a loop seam.

Hunt for overlapping text, blurry scaled type, linear slides, dead beats, and a seam where the loop jumps.

## Model effort

Sonnet 5.5 is enough for a 2D loop and a first pass.
Move to Opus 5.5 when the drawing, the staging, or the critique is failing.
High effort for the picture.
Low effort only for a small fix.
Set the loop length and the frame size up front so the model does not guess.
