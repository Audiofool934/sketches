# sketches

This is a sketchbook.
Each piece is an orphan branch named `piece/<slug>`, checked out at `.pieces/<slug>`.
Work only in that folder.
`main` is the index.
Do not merge pieces together.

The aim is a visually stunning coded animation.
Default to 2D.
A lot of the strong Claude Opus 5.5 and Sonnet 5.5 pieces are flat drawings, type, and UI, and they do not need a 3D renderer.

## Pick the stack before writing code

Decide from the idea, then write the choice at the top of `brief.md`.

Use 2D when the piece can be storyboarded as shapes, type, layers, and overlap.
Fake depth with scale, parallax, and overlap.
A chart, a logo loop, a kinetic headline, a paper explainer, a pixel scene, an ink film, and a morphing interface are 2D.

Use a 3D renderer only when the idea fails as a drawing.

- The camera has to travel through a volume.
- An object has to turn in light so new sides are revealed.
- The subject is a mechanism whose depth is the point, such as joinery, a linkage, or a product coming apart.

| Idea | Stack | Leave behind |
| --- | --- | --- |
| Loop, UI morph, type, diagram, chart | One `index.html`. Canvas 2D or inline SVG. No libraries. | Remotion, HyperFrames, Three.js, Blender |
| Hand-drawn or textured 2D film | Still Canvas 2D. One HTML file until a helper file earns its place. | A 3D renderer, an image model |
| Scene you orbit or walk through in the browser | Three.js, in the same HTML page if it fits. | Blender |
| Path-traced materials, cloth, or a lit film shot | Blender, driven by Python. | The browser |
| The deliverable is an MP4 of a page you already drew | Playwright seeks `window.seek(t)`, ffmpeg encodes. | A second animation framework |

SVG fits a short vector loop with a few shapes.
Canvas 2D fits many marks, brushes, particles, type, and anything that must be a pure function of time.
Three.js is the 3D renderer for a sketch, because the piece still opens in a browser.
Blender is for a shot you would light like a film.
Do not install it for a loop.

Remotion (React timelines) and HyperFrames (HTML plus GSAP, then an MP4) are video-production stacks.
Use one only when the brief asks for an edited multi-scene film and names that tool.
A 6-second loop does not need either.

Optional craft packs exist for drawn films: `alesha-pro` hand-drawn canvas, `alexgreensh/anidoodle`, and `iart-ai/javascript-animation-skills`.
Read one only if the brief asks for that look.
Do not add a pack to a plain motion loop.

## Render contract

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

Order matters.
Logline and limits first.
Look second.
Tools last.
If you start from a library, the technique eats the idea.

Write this into `brief.md` before the animation, and show it before a long render.

- One sentence: what it is, and what the viewer should feel.
- Duration, frame size, and loop or one-shot.
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

## Sources

Read in full: the 18-page playbook "Opus 5.5 Motion Design Prompting Techniques" (Movez, linked from https://x.com/0xMovez/status/2104576360119206296).
Read in full: the hand-drawn canvas skill at https://github.com/alesha-pro/tools/tree/main/skills/hand-drawn-canvas-animation.
Read: the READMEs for https://github.com/alexgreensh/anidoodle and https://github.com/iart-ai/javascript-animation-skills.
Read the free portion of https://charliehills.substack.com/p/claude-code-motion-graphics (steps 1 and 2; the rest is paywalled).
Read the free portion of https://aiblewmymind.substack.com/p/claude-opus-5-5-video-animations (the method; the prompt spreadsheet is paywalled).
Earlier X posts that match this contract: https://x.com/aakashgupta/status/2105542250650624265 and https://x.com/hideki_climax/status/2105219525280948455.
