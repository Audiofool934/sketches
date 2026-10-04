# Review of The Road Home

## Scope

This is a new 36-second silent Lord of the Rings mosaic study.
The requested frame is full 16:9 at 3840 by 2160, with no encoded black bars.
The original Odyssey film and its source were preserved.

## Pass 1: drawings and composition

Inspected twelve browser frames across all five scenes and the four transformations.
The primary problems were the oak clipping the top of the wide Shire picture at 4.7 seconds, an overbright light on the traveller under Moria at 16 seconds, and lava losing its stone texture at 27 seconds.
The oak canopy was made smaller and lowered, the Moria light was moved to the staff and reduced, and the lava's emission was reduced.

The taller canvas also exposed the bed texture's 16-bit ownership limit.
Background stone sizes were adjusted while keeping fine stones in the door, Ring, silverwork, and figures.
The loader now reports an explicit error above 65,535 stones instead of silently wrapping ownership indices.

## Pass 2: small screens and transitions

Inspected eight hero frames at 360 pixels wide and a nine-frame strip of the door-to-Ring transformation from 6.6 to 8.2 seconds.
The round door, gold band, silver gate, volcano, and homecoming remain distinguishable at this size.
The travellers deliberately stay small in their landscapes.
The transition maintains a continuous physical flock and settles into a clean Ring close-up.

Repeated pixel-hash checks passed at 0.7, 7.4, 9.5, 12.8, 16, 20, 27, 29.7, and 35.5 seconds after seeking to another time between each pair.
The WebGL error result was zero, and the preview canvas was exactly 1280 by 720.

| Scene | Stones |
| --- | ---: |
| Shire | 59,548 |
| Ring | 61,328 |
| Moria | 38,127 |
| Mount Doom | 33,787 |
| Home | 59,549 |

## Pass 3: encoded movie

The 1080p movie contains exactly 2,160 decoded frames at 60 fps and lasts exactly 36 seconds.
All eighteen segments contain 120 frames.
A complete decode finished without errors.
The encoded opening close-up and a one-frame-per-second sheet covering the complete movie were inspected.
The final Shire shot holds the image through the last frame, and the live player also stops there.

The encoder printed a raw-input packet truncation diagnostic at some segment starts.
Frame counts, full decoding, and inspected images showed no missing frames or visible damage in the resulting review movie.
The diagnostic remains visible rather than being suppressed more broadly.

The completed 4K master contains exactly 2,160 decoded frames at 3840 by 2160, 60 fps, and 36 seconds.
It is H.264 with yuv420p pixels, television range, and a BT.709 color matrix.
The master is 440,375,409 bytes; the 1080p review movie is 191,432,584 bytes.
The 4K movie was played from beginning to end in Chrome's native video player and sampled at eight times.
The controlled playback run reached the ended state at 36 seconds with no media error and no additional dropped frames.
The playback measurements and screenshots are saved in `out/review/playback/`.

## Author assessment

These are subjective checks of this silent visual study, not measurements of audience response.

| Criterion | Score | Basis |
| --- | ---: | --- |
| Hook | 8/10 | The opening immediately presents the physical stone and brass detail. |
| Phone readability | 8/10 | Major objects remain recognizable at 360 pixels wide. |
| Motion | 8/10 | Continuous camera paths, sampled stone trajectories, and complete native playback preserve the transformations. |
| Variety | 9/10 | Five distinct compositions and a green, gold, blue, red, and warm green color progression. |
| Composition | 8/10 | Focal objects remain clear in the full 16:9 field after the canopy correction. |
| Audio sync | Not applicable | The study is silent. |

## Preservation and checks

All 28 fingerprinted Odyssey source files matched their original hashes after authoring this piece.
The WebGL material and stone-cutting logic are unchanged from that source.
Only trailing whitespace was normalized in the copied renderer.
Syntax checks passed for all eighteen JavaScript modules and tool scripts.
The browser measurements and source hashes are saved in `out/review/checks.json`.
Contact sheets, transition strips, encoded-frame checks, and render measurements are under `out/`.
