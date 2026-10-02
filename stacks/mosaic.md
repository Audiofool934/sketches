# mosaic

Stack name in `brief.md`: `mosaic`.

WebGL2 instanced boxes.
One HTML file.
No libraries.

A mosaic is still a drawing.
The stones are the picture.
Paint flat, with thick contours and a few colors, then snap one color per stone.
Same stack for both grammars below.
Leave behind Canvas `fillRect` for the stones, Three.js, and a mosaic filter on a photo.

The render contract in `CLAUDE.md` applies.
Headless Chrome needs a real WebGL context.
Use `--headless=new --use-angle=metal --enable-webgl --ignore-gpu-blocklist`.
`--disable-gpu` yields an empty canvas.

## The wall resettles

Vary the golds and the silvers per stone.
Leave mortar by making each stone smaller than its cell.
Break the square grid with a running bond, a little jitter, and a turn that follows the contour.
Give every stone its own tilt, so one light glints them one at a time.
When the picture changes, the same stones lift, tumble, and seat.
Stones whose color barely changes only shiver.
A few tens of thousands fill a 1920 frame.
The loop rests on a finished wall, with the light back where it started.
`piece/laid-glass` is that wall.

## The panel is laid

Each stone is a physical object with thickness.
It drops, tumbles, and seats in mortar, and the seated stone casts a shadow on the bed and on its neighbors.
The mortar starts bare, with the whole picture already drawn on it in sinopia.
Lay from the eye outward.
The unfinished edge is the action.
The border goes on last.
Keep the count low enough that a stone stays an object.
A few thousand fill a panel.
The camera starts macro on the first stones and pulls back as the panel grows, so the stones stay large until the wide shot.
Once a stone is seated it stays.
The reference example is Paolo Rosson's Roman panel: https://x.com/redp314/status/2105745567712477403
Take the build order, the shadow, the sinopia, and the pullback.
Use a new picture under that build.
