# A Light That Endures

A 206.3-second mosaic journey through Middle-earth, from the first light to the Grey Havens, set to the supplied recording of Enya's “May It Be”.
This is an independent `piece/middle-earth-may-it-be` branch.
The other Lord of the Rings piece and Odyssey source remain separate.

## Watch

Open `out/movies/a-light-that-endures-4k.mp4` for the 4096 by 2160, 60 fps viewing copy.
Open `out/movies/a-light-that-endures-8k.mkv` in a player supporting HEVC 4:2:2 10-bit and FLAC for the native 8192 by 4320 master.
The 8K movie uses the Mac's HEVC quality mode; it is not described as lossless video.
The lossless RGB archive is the ordered set of FFV1 segments and `segments.txt` in `out/render/master-8k/`.
All large outputs and the copied source audio live on `/Volumes/Audioroom/Sketches/middle-earth-may-it-be` through the local `out` link.

For a browser player, run `npm run serve` and open http://127.0.0.1:8017/.
For an exact rendered moment, open `http://127.0.0.1:8017/?w=1920&sub=4&t=177`.
The single-time preview loads only the necessary scenes.
The preview uses a real WebGL2 context, with native Metal on macOS.

## Reproduce

Install Node.js, ffmpeg, Python with NumPy, and the dependencies in `package.json`.
Install the Playwright Chromium browser with `npx playwright install chromium` if it is not already present.
Place the supplied recording at `ref/may-it-be.flac`, or keep the existing link to the Audioroom copy.
Run `caffeinate -i node tools/finish.mjs` on macOS to render, encode, and verify the full delivery.
The delivery encoder uses macOS VideoToolbox.
The native frame exporter can run on other systems with an appropriate WebGL backend selected through `ANGLE`.
The exact supplied audio hash is retained in `analysis/music-analysis.json`.

Rendering uses 12,379 independent frames at 60 fps, with four shutter samples for every frame.
Scene windows bound the GPU memory footprint.
Completed lossless segments have receipts and are reused after an interruption.
`job.json` fingerprints all visual source, refusing to mix versions in one archive.
Use a new output directory when changing the artwork or render settings.
The archival segments are not concatenated into a duplicate lossless movie, which would unnecessarily double storage.
Encoding rebuilds continuous timestamps from frame numbers, avoiding accumulated millisecond rounding from Matroska segment boundaries.

## Source map

`brief.md` records the musical reading, palette, chronology, scene anchors, and references.
`analysis/` contains the measurements made before planning the visual sequence.
`pictures/middle-earth/drawings.js` contains the original drawings; `craft.js` supplies shared drawing vocabulary.
`pictures/middle-earth/direction.js` controls camera, light, arrivals, and departures on the recording's clock.
`pictures/middle-earth/materials.js` defines stone palettes and coherent motion for the Ring and departing ship.
`shots/film-1.json` connects nineteen scenes through relays of physical tesserae.
`engine/` cuts, lights, and renders the stone geometry inherited from the approved Odyssey material language.

## Evidence

`out/review/` contains timestamped visual passes, transition strips, and deterministic-seek receipts.
`out/render/master-8k/bench.json` records the completed frame ranges and actual render cost.
`out/movies/verification.json` is written only after the complete exported dimensions, frame counts, and audio checks pass.
The 8K soundtrack must decode to the exact same PCM samples as the supplied FLAC.
The 4K soundtrack is AAC and is checked for zero sample offset and preservation of the complete recording.
See `REVIEW.md` for actual visual observations and remaining limits.
