# between hand and sound

## Idea

A short animated history of the machines between a plucked string and an instrument you play with your hands, ending on Sway.
The viewer should feel the material change while the music stays the same: one tune survives every new way of holding sound.

## Stack

Canvas 2D in a Chromium page, stepped frame by frame in headless Chromium and piped to ffmpeg (`tools/render.mjs`).
Sound for chapters 1 to 10 is a small synthesis library in plain Node (`audio/`).
The finale is played offline in the browser by Sway's own synth, band, and looper (`vendor/sway/`).
No Remotion, no HyperFrames, no recorded samples.

## Limits

Duration: 220.8 s (3:41), 92 bars at 100 BPM.
Frame size: 1920 × 1080, 30 fps.
Loop or one-shot: one-shot.

## Look

Each chapter is a sheet of flat color with its name set huge and faint behind the scene, a serif headline, and a short caption.
One vermilion line runs through every scene.

Palette, one ground per chapter:

- Vibrate #171f3d, Write #ecdcb8, Repeat #1d6a68, Record #3c2a50
- Electrify #242d73, Control #e0a43a, Count #12141f, Connect #24252f
- Assemble #1b1d2a, Delegate #f6eedc, Play and End #07090b

Accent: vermilion #ff5b3a, the Line and whatever it touches.
Display face: Fraunces.
UI face: DM Sans for captions, IBM Plex Mono for dates, labels, and numbers.
Banned: gradient behind a centered title, fade-in on everything, corner labels, frame borders, glow, invented product UI.

## Beats

Hook inside the first 2 seconds: a string is plucked and the Line is born vibrating.
Every chapter starts on a bar line, and each slides in as a sheet of cut paper while the Line morphs into its next shape.

| Time | Chapter   | On screen                                                          |
| ---- | --------- | ------------------------------------------------------------------ |
| 0:00 | Vibrate   | A monochord: halve the string, double the pitch. Pitch is a ratio. |
| 0:19 | Write     | Staff notation, solfège, and the later mnemonic hand.              |
| 0:34 | Repeat    | A pinned cylinder, then a punched paper roll.                      |
| 0:48 | Record    | A wobbling line, a wax cylinder, then tape that is cut and looped. |
| 1:07 | Electrify | The theremin and the Hammond organ's nine drawbars.                |
| 1:26 | Control   | One volt per octave turns a melody into a staircase.               |
| 1:36 | Count     | Sampling, bit depth, the Nyquist limit, and a spectrum.            |
| 1:55 | Connect   | The TR-808 grid, the MIDI message, and the sampler.                |
| 2:14 | Assemble  | A workstation built from every earlier machine, then a hard stop.  |
| 2:34 | Delegate  | Software supplies harmony, timing, arrangement, and sound.         |
| 2:53 | Play      | Sway: two hands, a ladder of pitches, a band that follows, a loop. |
| 3:31 | End       | The chord resolves and the verbs light up in order.                |

## Motion

Each chapter is a pure function of its local time on the shared bar grid (`src/timeline.js`).
Picture and sound read the same cue sheets (`src/score.js`), so a drawbar moves when its chord starts and a step lights when its drum hits.
`window.seek(t)` draws film time `t`; `window.film.frame(i)` returns frame `i` as an image.

## Sound

Yes. One short tune in A minor, re-performed on each era's technology and processed like its medium: wax, tape, a lowered sample rate.
The mix is normalized to -17 LUFS integrated with a -1 dBFS ceiling, 3 dB under the sketchbook's -14 LUFS target.
The film opens quietly and builds.

## Notes

Made in Sway's repository and moved here with its history on 2 October 2026; see the README for the sources behind every date and for how to rebuild.
The finished cut is `between-hand-and-sound.mp4` (33 MB).
It has been checked by measurement, not yet by ear: the mix still needs a listen on speakers or headphones.
Open it with `npm install` and `npm run serve`; the page uses ES modules, so it will not run from a `file://` URL.
