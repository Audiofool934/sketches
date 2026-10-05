# Review record

## Scope

The film is a condensed interpretation of Middle-earth's history, not a claim to contain every event in the legendarium.
The creative ambition is a distinct illuminated mosaic epic.
Superiority to another film is not a measurable technical acceptance test.

## Musical evidence

The supplied recording was measured before the shot plan.
Its complete duration is 206.306895833 seconds, containing 9,902,731 stereo samples at 48 kHz.
The edit follows the measured swells, harmonic-change candidates, and phrase troughs rather than asserting an unreliable fixed tempo.
Signal analysis and source-alignment checks are documented separately from auditory listening.
No auditory listening claim is made by this record.

## Visual passes

Pass one inspected the opening light, Two Trees, crown, Ring, Numenor, Shire, Fellowship, Moria, Lorien, Argonath, Fangorn, Rohan, beacons, courage, burden, unmaking, renewal, and havens at representative times.
The three most consequential problems were oversized mountain highlights around 77 seconds, flat city terraces around 49 seconds, and unreadable close-up figures at 177 seconds.
Mountain highlights were narrowed; the cities gained curved walls, arcades, windows, and varied towers; human profiles were refined.

Pass two inspected the Ring drop at 185 and 187.5 seconds, the ship at 203 and 205.5 seconds, and the late-film compositions.
The departing ship initially exposed a stale silhouette in the mortar.
Floating arrivals now preserve the continuous background beneath the ship and Ring.
The Moria camera cropped the Balrog at 90.5 seconds, and Frodo's cloak hid Sam's face at 177 seconds.
The Moria camera now frames both adversaries, and the burden scene uses an explicit carrying pose with visible faces and supporting hands.

Pass three checked five frames around all eighteen transitions, repeated direct seeks, and equivalent timestamps rendered with different loaded scene windows.
The window-equivalence checks at 12, 90.5, 177, and 203 seconds all produced identical pixels.
The final Moria and burden images are in `out/review/pass-3-heroes/`.
Phone sheets and action strips are derived from these rendered pixels, not from the flat source drawings.
This is a one-shot film; a loop seam is not applicable.

The delivery pass decoded the complete 4K movie with ffmpeg's fatal-error checking enabled and extracted thirty-one frames.
The resulting nineteen-scene 360 px sheet, eleven-frame Ring action strip, opening frame, and final frame were inspected.
The Ring falls and disappears without leaving a fixed copy in the background.
The harbor water remains continuous beneath the departing ship.
These images are in `out/review/export/`.

## Editorial assessment

These scores are a bounded assessment of the rendered frames, transitions, action strip, and measured musical structure.
They do not represent a full human viewing or auditory listening session.

| Criterion | Score | Evidence |
| --- | --- | --- |
| Hook | 9 | Physical stones assemble into the first light within the opening two seconds. |
| Phone readability | 8 | The main objects and silhouettes remain distinct in all nineteen 360 px panels; small faces are secondary detail. |
| Motion | 8 | The stone relays, camera travel, Ring fall, and ship departure have distinct physical roles and deterministic timing. |
| Variety | 8 | Celestial light, trees, the sea, monumental cities, armies, intimate figures, fire, and a quiet harbor share one material language. |
| Composition | 8 | The corrected Moria framing includes both adversaries, and the burden scene keeps both faces and supporting hands visible. |
| Sync | 8 | The scene anchors and exposure changes follow the measured phrase structure and swells; both exported soundtracks have zero sample offset. |

## Technical evidence

The completed native render contains 12,379 frames at 8192 by 4320, 60 fps, with four shutter samples per frame.
The original lossless RGB archive contained 75 FFV1 segments totaling 349,267,312,853 bytes.
Those regenerable intermediate videos were deleted at the user's request on 2026-10-05, preserving the source, original music, both finished movies, and small render records in `out/render/master-8k-records/`.
The 8K HEVC movie was subsequently deleted at the user's request on the same day, as recorded in `out/movies/8k-removal.json`.
The 4K movie, source code, and original music remain available.
On 2026-10-05, all remaining external files were moved into the original repository worktree, with outputs under `out/` and music at `ref/may-it-be.flac`.
Every one of the 300 migrated files passed SHA-256 verification before the external copy was removed.
The relocation receipt is `out/relocation.json`; older reports retain their historical source paths.
The 8K HEVC 4:2:2 10-bit movie is 27,171,066,274 bytes, and the 4K H.264 movie is 1,848,109,316 bytes.
The encoder reported zero dropped and zero duplicated frames.
Both deliveries passed the complete frame-count, dimensions, pixel-format, frame-clock, and source-fingerprint checks.
Maximum frame timestamp rounding is 0.334 ms in the Matroska file and less than 0.001 ms in the MP4.
The 8K FLAC decodes to the exact original 9,902,731 stereo samples at 48 kHz.
The 4K AAC also contains 9,902,731 decoded samples, with zero sample offset and 45.33 dB measured signal-to-error ratio.
The complete machine-readable receipt is `out/movies/verification.json`.
The complete 8K movie also decoded through VideoToolbox with fatal-error checking enabled, reaching all 12,379 frames and exiting successfully.
Its decoder log is `out/review/decode-8k.log`.
The renderer's bed ownership was widened from 16 to 24 bits because the Moria panel contains more than 100,000 stones.
Repeated seeks produce identical pixels, with zero WebGL errors in the saved still reviews.
The visual source hash is `fa04836ee4404aec7304dd77a9d6268c78d2a855b2f05b1aa5bce8c07488160e`.

## Player and cleanup

The 4K player was tested in an isolated, muted Chrome session.
The opening advanced to 5.46 seconds, a seek landed exactly at 177 seconds and continued to 182.46 seconds, and playback from the final second reached the ended state at 206.316667 seconds.
No media error occurred, and Chrome reported decoded audio data during playback.
The initial 5.5-second headless playback sample reported 11 dropped display frames out of 332, and the sample after seeking reported 1 out of 329.
These display observations are separate from the verified zero dropped or duplicated frames in the encoded files.
The desktop player and a 390 px emulated mobile viewport were inspected; the latter had a 390 px document width and a 366 by 193 px video, with no horizontal overflow.
HTTP metadata and byte-range responses passed direct checks.
The evidence is in `out/review/player/`.

The render, encoding, decoder, and preview-server processes exited.
The named Chrome session and its bridge were stopped, all tracked browser helper PIDs were verified absent, and the temporary browser profile was removed.
The final cleanup receipt is `out/review/player/cleanup.json`.

## Assessment limits

Rendered stills and action strips establish composition and sampled motion, but do not establish a complete human playback review.
Musical alignment remains an editorial judgment beyond sample-accurate muxing and measured phrase placement.
The sync score assesses measured editorial placement and signal alignment.
User listening and viewing remain the appropriate test of the emotional pacing and artistic ambition.
