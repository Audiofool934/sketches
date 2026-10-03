# flow matching

## Idea

A narrated explainer of flow matching: random noise flows along a learned velocity field into a spiral, and the film shows why regressing on straight lines learns that field.
The viewer should feel the click of "oh, it's just regression", the way a 3Blue1Brown video lands.

## Stack

film.
Made with manim Community Edition 0.21 in Python, not an HTML page, so the render contract in `CLAUDE.md` does not apply.
Scenes are timed to the narration: `with self.voice(key)` holds each beat until its line has been spoken, and `b.word(...)` lands animations on spoken words.
Particles are a raster layer drawn inside manim (`fmviz.GlowCloud`).
The flows are exact: closed-form marginal velocity of a smoothed two-armed spiral, integrated with RK4.
A small MLP is trained with the conditional flow matching loss shown on screen; its checkpoints drive the training and sampling scenes.

Voice: Everett's recorded reference, replicated with Gemini 3.8 Flash TTS (`gemini_voice.py`).
`voice.py` is the local alternative: Qwen3-TTS cloning from Timbreloom's models, checked by Whisper.
Music: an original felt-piano and pad score synthesised by `music.py`, ducked under the voice in `render.py`.

## Look

Palette: background `#090C13`, ink `#E9ECF2`, muted `#8E97AB`.
Meaning colors: noise `#5DB7FF`, data `#FF8A65`, velocity `#FFD166`, network `#7BE3B6`.
Data is drawn with a sunset ramp `#FFE08A` to `#9E6BFF`.
Type: Avenir Next through XeLaTeX for prose, Computer Modern for maths, Menlo for code.
Exceptions to the house bans, kept on purpose: the particles glow, the background has a soft vignette, and the opening title is centred.

## Beats

0:00 noise flows into the title.
0:24 the goal: noise beside data.
0:56 a velocity field carries noise to the spiral, then runs backwards.
2:06 one straight line from x0 to x1, then many.
3:18 the lines cross; least squares averages them into one field.
4:28 one dimension: straight lines cross, the flow does not.
5:14 the training loop, and the spiral emerging over 20,000 steps.
5:56 sampling with Euler steps, and how many steps it takes.
6:51 recap in three lines, then the title again with references.

## Motion

Duration: 7:27, one-shot, 3840 by 2160 at 60 fps.
Narration drives the clock; animations follow the voice, not a fixed beat grid.

## Build

```bash
python precompute.py          # flows and training, about 5 minutes, writes data/
python gemini_voice.py        # narration, needs GEMINI_API_KEY and audio/ref/
python render.py -q k         # render, stitch, mix; writes flow_matching.mp4
```

`data/`, `audio/`, `build/` and the MP4 are local only.
`audio/` holds the voice reference recording and is kept out of git on purpose.

## Notes

Fixed after the render: the pause after "p t" near 3:00 was lengthened by patching the mix, not by a re-render.
"Interpolate" in the recap near 6:55 is slightly mispronounced; left as is.
