# A Light That Endures

A 206.3-second mosaic journey through Middle-earth, from the first light to the Grey Havens, set to the supplied recording of Enya's “May It Be”.
This is an independent `piece/middle-earth-may-it-be` branch.
The other Lord of the Rings piece and Odyssey source remain separate.

## Watch

Open `out/movies/a-light-that-endures-4k.mp4` for the 4096 by 2160, 60 fps viewing copy.
The 27.17 GB 8K HEVC master was deleted at the user's request on 2026-10-05 and can be regenerated from the source and original music.
That export used HEVC 4:2:2 10-bit with FLAC; its video was quality-encoded, not lossless.
The 349.27 GB of lossless FFV1 intermediate frames were deleted at the user's request on 2026-10-05.
The source code and original music can regenerate them; small render records remain in `out/render/master-8k-records/`.
Outputs live in this worktree's real `out/` directory, and the original music is the local file `ref/may-it-be.flac`.
Both directories follow the repository convention for local assets excluded from Git.
The worktree is `.pieces/middle-earth-may-it-be` on branch `piece/middle-earth-may-it-be`.

| Delivery | Dimensions | Size | Sound |
| --- | --- | --- | --- |
| 4K viewing copy | 4096 by 2160 | 1.85 GB | AAC, 320 kbit/s |
| 8K HEVC master | 8192 by 4320 | Removed; regenerable | Original FLAC retained separately |
| Lossless RGB intermediates | 8192 by 4320, 75 FFV1 segments | Removed; regenerable | Supplied FLAC retained separately |

Both movies were exported with 12,379 frames at 60 fps, covering the complete 206.306895833-second recording.
The delivered 8K soundtrack was verified sample-for-sample identical to the supplied source.
The 4K soundtrack preserves all 9,902,731 samples with zero offset and a measured 45.33 dB signal-to-error ratio against the original.
File sizes use decimal GB.

For a browser player, run `npm run serve` and open http://127.0.0.1:8017/.
For an exact rendered moment, open `http://127.0.0.1:8017/?w=1920&sub=4&t=177`.
The single-time preview loads only the necessary scenes.
The preview uses a real WebGL2 context, with native Metal on macOS.

## Reproduce

Install Node.js, ffmpeg, Python with NumPy, and the dependencies in `package.json`.
Install the matching Playwright Chromium browser with `npx playwright@1.63.0 install chromium` if it is not already present.
For a fresh checkout, place the supplied recording at `ref/may-it-be.flac`; the current worktree already contains this local file.
Run `caffeinate -i node tools/finish.mjs` on macOS to render, encode, and verify the full delivery.
This command also regenerates the deleted intermediates and 8K movie.
It skips encoding only when both finished movies still match the saved encoding receipt; otherwise it encodes both delivery files.
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

`out/relocation.json` records the move into this worktree and SHA-256 verification of all 300 migrated files before the external copy was removed.
`out/review/` contains timestamped visual passes, transition strips, and deterministic-seek receipts.
`out/review/export/` contains a 360 px contact sheet of all nineteen scenes, the Ring-fall action strip, and thirty-one frames extracted from the finished 4K file.
`out/render/master-8k-records/bench.json` records the original completed frame ranges and actual render cost.
The corresponding `archive-removal.json` records the intermediate-frame deletion and preservation checks.
`out/movies/8k-removal.json` records the later deletion of the 8K movie while preserving the 4K file, source code, and original music.
`out/movies/verification.json` is written only after the complete exported dimensions, frame counts, and audio checks pass.
The 8K soundtrack must decode to the exact same PCM samples as the supplied FLAC.
The 4K soundtrack is AAC and is checked for zero sample offset and preservation of the complete recording.
See `REVIEW.md` for actual visual observations and remaining limits.
