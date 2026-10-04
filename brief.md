# The Road Home

## Idea

A small round door becomes a great journey: the Shire, the Ring, Moria, Mount Doom, and the warmth of home, told on one transforming mosaic wall.
The viewer should feel the scale of the world and the smallness of the people who cross it.
The film is a personal Lord of the Rings study for Everett.
The visual benchmark is the current Odyssey Trailers mosaic: physical stone, imperfect courses, deep grout, raking light, and gold that catches the eye one tessera at a time.

## Stack

mosaic.
The existing Odyssey WebGL2 renderer, stone cutter, and timeline are copied into this independent piece.
The drawings, choreography, color script, and camera paths are new.
The Odyssey source and its saved films stay untouched.

## Format

36 seconds, one shot, no loop.
Full-frame 16:9 at 3840 by 2160, with no encoded letterbox bars.
The composition uses the full height for tall doors, mountains, sky, and foreground.
60 fps, 2160 frames, four shutter samples for the final export.
A 1920 by 1080 review movie is rendered first.
This first study is silent.

## Look

Limestone, dark glass, marble, silver leaf, and gold leaf.
Gold is the one recurring accent: the door knob, the Ring, a traveller's lantern, fire, and the lamp at home.
The Shire uses leaf green #52693f, dark moss #182c22, cream limestone #cbb78e, and straw #9a834a.
The Ring sits on blue-black stone #090f1b with gold #8a6a2e #b38d42 #d9b25e #efd38d.
Moria uses blue slate #132431 #294454, silver #aab9c6, and cold marble #e0e8e7.
Mount Doom uses basalt #0b0b0c, ash #373139, iron red #632923, and molten orange #cf612d.
Home returns to green and warm cream, with amber windows and a quiet blue evening.
No display text or UI appears in the picture.
The document face is Georgia; the player uses the system UI face only when controls are needed.
No bloom, equal square grids, photographic mosaic filters, fake runes, copied film frames, logos, corner labels, or boxed titles.

## Beats

0.0 to 2.0: macro on a brass knob and the green tesserae of a round door, with warm light travelling across their edges.
2.0 to 6.6: pull back to a grassy hobbit hillside, flowers, chimney, winding road, and two small travellers leaving home.
6.6 to 8.1: the round door lifts from its bed and the wall reassembles as the Ring.
8.1 to 12.0: close study of the gold band; a moving firelight reflection reveals its thickness and different gold stones.
12.0 to 13.6: the circular band opens into the arch of the Doors of Durin.
13.6 to 19.1: cold cliff, silver trees and stars, the dark water, and small travellers beneath the door; the silverwork catches moonlight progressively.
19.1 to 21.0: silver courses break into ash and settle as the slopes of Mount Doom.
21.0 to 26.0: two small figures cross the foreground ridge, a river of fire leads the eye to the crater, and the camera closes toward the mountain.
26.0 to 28.5: volcanic light swells, then the black and red wall breaks apart.
28.5 to 30.2: the stones return as the Shire at dusk, assembling outward from the lamp beside the round door.
30.2 to 36.0: a gentle approach to home; warm windows and an open gate hold the final image without a title or abrupt fade.

## Motion

Every frame is a pure function of time through window.seek(t).
Arrivals use the inherited closed-form spring; departures follow a continuous physical arc.
The camera does not cut.
Outgoing and incoming pictures share their focal point at every transition.
Light and very small stone tilts provide motion in the settled wall.
The Ring and the hobbit door share a circle, and the Ring and Moria share an arch.
Mount Doom's branching lava courses become the road through the final green hills.

## Reference

Tolkien Estate: https://www.tolkienestate.com/painting/the-lord-of-the-rings/
Consulted for Tolkien's landscape and architectural vocabulary, especially the Moria gate and the Ring.
All pictures are original code drawings made for this mosaic.
No soundtrack or external image is copied into the piece.

## Validation

Inspect hero frames, dense transition strips, and a 360-pixel-wide contact sheet.
Check repeat seeking and seeking directly to a late frame.
Review the complete silent movie for motion and pacing.
The piece is one-shot; its ending is a hold, not a loop seam.
Record actual checks and remaining limitations in REVIEW.md after rendering.
