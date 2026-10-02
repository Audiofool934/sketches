# mosaic

Stack name in `brief.md`: `mosaic`.

WebGL2 instanced boxes.
One HTML file.
No libraries.

A mosaic is still a drawing.
The stones are the picture.
Paint flat, with thick contours and a few colors, then snap one color per stone.
The two grammars below share one way of cutting and setting the stones.
Leave behind Canvas `fillRect` for the stones, Three.js, and a mosaic filter on a photo.

The render contract in `CLAUDE.md` applies.
Headless Chrome needs a real WebGL context.
Use `--headless=new --use-angle=metal --enable-webgl --ignore-gpu-blocklist`.
`--disable-gpu` yields an empty canvas.

## How the stones are cut

A mosaic is small pieces of stone, glass, or ceramic, held in mortar.
Each piece is a tessera.
The gap the mortar fills is the interstice.
Andamento is the flow of the rows.
The opus is how the pieces are cut and set.
That history is summarized at https://en.wikipedia.org/wiki/Mosaic
Take the cut, the flow, and the bed.
Use a new picture under them.

Pick the palette before the cut.
A color the palette does not have is a course of two neighbors, not a new paint.
Two stones are enough for a pavement.
Roman black on white, and the later Portuguese limestone and basalt, both draw with the cut rather than with a long palette.

Opus regulatum is a grid, aligned both ways.
Use it for a pavement, a count, or a letter that wants to be type.
A figure laid on that grid reads as a tiled photograph.

Opus tessellatum keeps the rows in one direction.
The stones are larger, and the courses run across the field.
A running bond is this cut.

Opus vermiculatum lays one or more lines of smaller stones along an edge.
The outline of a face, a hand, or a letter is a worm of tesserae, not a stroke drawn on top.

Opus musivum carries that worm through the background, so the field bends around the figure.

Opus classicum sets a fine vermiculatum picture into a coarser tessellatum ground.
The eye, the face, and the hands get the small stones.
The field gets the large ones.
A wall of one fineness can stay even when the camera is what moves.

Opus sectile lets one piece be the whole shape.
A beak, a diamond, or a letter can be a single stone when dicing it would only add grout.

Opus circumactum lays fans and overlapping arcs.
A border of waves, braids, or scales is this cut, and it is part of the picture.
The brief's ban on a frame border is about a box around a title.
A mosaic border is a last course of ornament.

Opus palladianum is irregular stone with no rows.
Use it for rubble, rock, or a broken field.

The earliest floors were pebbles, left round.
A pebble field has no cut face and no square grid.

A gold stone is foil-backed glass, not a yellow cube.
Byzantine walls are built on that gold, with the figure in a few stone colors against it.
Vary the golds.
Do not paint a gold gradient and call it mortar.

Leave behind a photomosaic, a picture whose pixels are other pictures.
Leave behind a robot grid of equal tiles.

## How the stones are set

The direct method sets each tessera into the bed, over an underdrawing of the main outlines.
The picture is visible while it is unfinished.
Walls and ceilings were made this way, and the face stays uneven.
That uneven face is what lets one light catch the stones one at a time.
The underdrawing left bare is the sinopia in the panel grammar below.

The indirect method builds the picture face-down on paper, then beds it so the front is flat.
Floors and tabletops were made this way.
A floor piece wants that flat face.
A wall piece does not.

An emblema is a fine panel made apart and then set into coarser work.
The eye or the face can arrive as that panel.
The surround stays larger and quieter.
A Roman picture sits inside a strong geometric border, and that border is the last course.

## The wall resettles

This is the direct method on a wall.
The face stays uneven, the rows follow the contour, and the field can run as musivum.

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

This is the direct method with the underdrawing still showing.
The eye can be an emblema, and the border is the last course.

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
