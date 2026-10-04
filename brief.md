# A Light That Endures

Stack: mosaic.

An illuminated history of Middle-earth, from the first light to the last ship, carried through thousands of years by one small light that power cannot extinguish.
The viewer should feel awe at the world's scale, grief for what it loses, and tenderness toward the small people who save it.
The history is compressed into emblematic episodes, with the trilogy at the heart of the film.

## Source and limits

The soundtrack is the supplied Enya recording, `May It Be.flac`, 206.306896 seconds, stereo, 48 kHz, 24 bit.
It starts at its original sample zero and plays once, at its original speed and level, without added dialogue or effects.
The source and renders remain local.
Odyssey Trailers is the approved material reference.
Its renderer, stone geometry, grout, contour-following courses, and raking light are preserved in this independent piece.
The separate `piece/the-road-home` branch is untouched.

## Frame and delivery

One-shot film, no loop.
Full-frame digital IMAX proportions: 4096:2160, conventionally described as 1.90:1.
Archival image: 8192 by 4320, verified by a native GPU render at the final settings.
Required viewing master: 4096 by 2160.
60 fps with four shutter samples per frame, using the repository film setting.
12,379 frames cover the complete recording; the final frame extends by less than 10 milliseconds beyond the source.
Render directories live at `/Volumes/Audioroom/Sketches/middle-earth-may-it-be`.
The viewing copy uses H.264, yuv420p, CRF 16 and AAC 320 kb/s.
The 8K movie uses HEVC 4:2:2 10-bit encoding at quality 70 and preserves the supplied FLAC audio.
The retained FFV1 RGB segments are the lossless image archive.
Resolution is not a substitute for composition, material detail, or musical timing.

## Musical reading

The exact source was measured before planning the scenes.
`analysis/music-analysis.json` retains the source hash, metadata, dynamic envelope, spectral onsets, pitch-class energy, phrase troughs, and harmonic change candidates.
`analysis/music-map.png` and the phrase strips show the evidence.
This is signal analysis, not a claim of auditory listening.
Automatic tempo candidates disagree strongly because the texture is sustained and the percussive pulse is weak.
The edit uses phrase-specific source anchors instead of an invented fixed BPM grid.
The first broad rise begins around 44 seconds and continues through 90 seconds.
The second verse is quieter, from about 94 to 135 seconds.
The second rise begins around 136 seconds, with large swells near 143.3, 149.5, 163.4, 173.0, and 185.6 seconds.
The last release begins after 195 seconds and carries the final ship into the distance.
Transitions begin in the preceding breath and settle at the next phrase's entrance.
Within a scene, a new light, figure, camera destination, reflection, or course of stones takes over every two to four seconds.

## Visual language

Actual irregular bevelled stone, glass, marble, silver, and gold in a lime bed.
No photographic underlay or grid filter.
The frame is a carved, illuminated landscape with deep foreground silhouettes, fine architecture, and monumental skies.
Figures are dignified and legible through pose and equipment, without imitating film actors.
The camera travels across the wall and through changes of scale, from a single tessera to a kingdom.
Light moves across the stone independently of the camera.
Gold is the recurring accent, changing meaning from creation to possessiveness to a freely given light.

- Midnight lapis: #081326, #14263d, #253e5b.
- Moonstone: #809daa, #b8cbd0, #e0e3d6.
- Living green: #163a33, #416647, #829366.
- Warm limestone: #8c775a, #b7a482, #ded0ab.
- Gold: #755026, #ad7935, #d5a956, #f0d48d.
- Ash and fire: #17141d, #49303a, #92432b, #d28a45.

No titles interrupt the film.
No fake Elvish lettering, logos, frame borders, decorative labels, bloom, or generic particle overlays.
The browser controls use the system UI font outside the exported canvas.
The document display face is Georgia.

## The clock and the transformations

| Time | Picture and action | Object carried forward |
| --- | --- | --- |
| 0-7.5 | A silver star tessera catches light within two seconds; musical courses unfold into a vast night. | Star becomes a fruit of the Two Trees. |
| 7.5-21.0 | Telperion and Laurelin rise beside a still pool; silver and gold wake branch by branch. | Bright fruits become three jewels. |
| 21.0-34.5 | Three Silmarils shine in a dark crown; two small figures face its power. | A circle of bright stone becomes the Ring. |
| 34.5-46.0 | The One Ring forms from hot gold between dark towers; the camera descends toward a broken blade. | Towers and gold become a sea kingdom. |
| 46.0-54.8 | Numenor's white terraces stand above an enormous blue sea; a foreground wave rolls across the masonry. | The drowned kingdom yields to its survivors. |
| 54.8-62.3 | Elendil faces Sauron before an army; Narsil breaks beneath a tiny circle of gold. | The Ring becomes the knob of a green door. |
| 62.3-71.0 | The camera pulls from that knob into the Shire; two travellers arrive on the road. | Winding road becomes the road from Rivendell. |
| 71.0-83.0 | Nine travellers cross a ridge beneath waterfalls and distant elven architecture. | Staff light becomes Moria's silver star. |
| 83.0-94.0 | The Doors of Durin lead into a colonnaded abyss; Gandalf faces the Balrog alone on the bridge. | Staff light becomes Galadriel's gift. |
| 94.0-108.5 | Lothlorien opens in the quiet; a silver basin and Galadriel's gift hold the scene. | Gift's light becomes the river below ancient kings. |
| 108.5-121.0 | The Argonath tower over a small boat; a broken horn carries grief. | Riverbank roots become living Ents. |
| 121.0-132.0 | Fangorn wakes from root to hand; two hobbits stand among immense tree shepherds. | Raised branch becomes a raised spear. |
| 132.0-146.0 | Rohan rides through rain toward a high wall; first light breaks over the riders. | First fire becomes the beacon chain. |
| 146.0-158.5 | Beacons ignite across a mountain range; the camera follows them to Minas Tirith. | Last beacon becomes a sword before a winged shadow. |
| 158.5-170.5 | Eowyn and Merry face the Witch-king; the crown falls as the shadow breaks into black stone. | Silver glint becomes the phial in darkness. |
| 170.5-182.5 | Sam supports Frodo on a vast ash slope; a tiny path climbs toward fire beneath a star. | Gold burden is isolated above the volcano. |
| 182.5-190.5 | The Ring drops into the chasm and unthreads into molten stone while two small figures remain on the ledge. | Pale stone becomes a leaf. |
| 190.5-198.5 | The White Tree grows in the restored city's court; branches open onto the western sea. | White leaf becomes a sail. |
| 198.5-206.307 | A ship leaves the Grey Havens; one evening star and its reflection remain through the musical decay. | A held farewell, no closing card. |

These anchors follow measured source phrases and are checked against rendered transitions.
Each transition preserves a focal object and a direction of travel.
Transformations vary between flowing courses, falling stone, branch-like growth, and re-laying from one light.
Arrival springs and departures are closed-form functions of time.

## Verification

Render stills and transition strips before the full film.
Review composition, material quality, motion, musical placement, and phone readability in three passes.
Compare repeated direct seeks for identical pixels.
Check bounded scene renders against the full timeline.
Measure exported frame count, dimensions, source-aligned audio, and absence of truncation.
Record actual checks and limits in `REVIEW.md`.
Do not describe an unviewed movie as watched or an unheard soundtrack as listened to.

## References

Tolkien's landscapes and architecture: https://www.tolkienestate.com/painting/the-lord-of-the-rings/.
Earlier ages and the Two Trees: https://www.tolkienestate.com/painting/the-silmarillion/.
Aspect ratio: https://www.imax.com/filmed-for-imax.
All compositions are original drawings for this piece.
