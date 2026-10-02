# laid glass

## Idea

A plaster wall holds a heron in gold and glass, then the same stones lift and settle into a night harbor.
The viewer should feel the click of a real mosaic being set.

## Stack

WebGL2, instanced tesserae, one HTML file, no libraries.
The stones have to turn in the light, and a 1920 frame holds about sixty thousand of them.
Canvas 2D would spend the frame filling rectangles.
Three.js would add a scene graph this wall does not need.

## Look

Palette: mortar #867254, ink #1c120c, gold #e4b84a #c4922a #f4d68c #fff6d6 #b07a26, heron white #f3eee4, teal #145e62 #0c3c40, indigo #1a2744 #0e1a30, silver #d5dbe3 #f7f4ee.
Accent: coral #d4654a, on the beak and the pennant.
No type.
Banned: gradient behind a centered title, fade-in on everything, corner labels, frame borders, glow, invented product UI.

## Beats

0.0 to 0.2. The heron is set, cropped close on the neck. Gold ground, coral beak. The light is already raking the glass.
0.2 to 3.4. The neck stones lift first, still in the close frame. A wave spreads across the wall. Mortar shows in the gaps. The stones tumble and seat into the harbor: indigo sky, a gold horizon that stays put, a silver moon, one boat.
3.4 to 5.8. The harbor holds. The camera is already there. Sparkles walk across the moon.
5.8 to 9.0. The moon stones lift first. The wall seats back into the heron, and the camera arrives as the head clicks in.
9.0 to 12.0. The heron is still. The light matches the opening. The loop closes on a finished wall.

## Motion

Duration: 12 seconds. Frame size: 1920 by 1080. Loop.
Flight spring k = 14, d = 5.5.
Camera spring k = 16, d = 6.4.
Arrivals use the spring, so a stone clicks once and sits.
Departures are the rising half of the lift.
No type, so no type overshoot.
Stones whose color barely changes only shiver.
The frame at 0 seconds and the frame at 12 seconds are the same picture, including the light.

## Sound

Silent.

## Notes

The picture is painted flat, then sampled once per stone and snapped to the palette.
Each stone keeps its own tilt, so the glint is per tile.
Contour stones turn to follow the drawing.
Grout is the plaster showing through, because each stone is smaller than its cell.
The grid does not move.
The scene change is the same stones lifting into a new color.
