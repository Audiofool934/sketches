# lighthouse sunset

## Idea

At sunset the sun hands its light to a lighthouse, which keeps it through one night and hands it back at dawn.
The viewer should feel looked after, as if the dark has a keeper.

By day the tower's shadow sweeps the grass like a sundial hand.
By night its beam sweeps the sea.
It is the same gesture with the ink reversed.

## Stack

2D canvas.
One HTML file.
No libraries.
A small 3D model only places things: the sun, the shadow, the beam cone, where the cone meets the water, and the boat agree with each other.
Every mark is still drawn flat.

## Limits

Duration: 12 s.
Frame size: 1080 × 1350 (4:5), letterboxed to fit the window.
Loop or one-shot: loop.

## Look

A three-ink risograph print.
Inks overprint by multiply.
Grain is fixed to the paper, and each ink sits a pixel or two out of register.
Light is paper showing through the ink. Nothing blurs.
Gradients are printed as hard steps that move, never as fades.

Palette:
- Paper #f2ecdf
- Blue ink #0078bf: sky, sea, shadow, night
- Pink ink #ff48b0: dusk, dawn, the band on the tower

Accent: yellow ink #ffe800, used only for light: the sun, sunlit grass and paint, the lamp, the beam.
Blue under yellow makes the grass green, so the grass is only green where the sun reaches it.
Display face: none. The piece is wordless.
UI face: none.
Banned: gradient behind a centered title, fade-in on everything, corner labels, frame borders, glow, invented product UI.

## Beats

Hook inside the first 2 seconds.
Something new every 2 to 4 seconds.
For each beat: what is on screen, how it enters, the action, how it leaves.

0.0s Golden hour.
A low sun over the sea on the right, in yellow rings, with a road of glints on the water.
The tower is backlit, with a rim of light on its right edge and a long shadow across the grass to the left.
Two gulls cross the sky and leave the left edge by 1.3 s.
The sun slides down at an angle and squashes as it meets the water.

0.6s The light drains.
As the sun goes under, the sunlit grass shrinks from the bottom of the frame toward the cliff edge.
The rim light climbs the tower, then catches the dome.

1.27s Handoff, the hook.
The last sliver of sun drops under the sea.
In that frame the lamp starts from a point and fills the lantern on a spring.
Its beam faces where the sun went down.

1.3s Dusk.
The earth's shadow rises from the left horizon as a blue band, with the pink belt of Venus riding on it.
Night comes down from the top of the sky in printed steps.
Below the horizon, night climbs as one stepped edge from the bottom of the frame over the sea and up the tower.
Stars punch through the ink as it deepens, brightest first, each on a small spring.

3.0s First flash.
The beam swings round to face us.
Its fans widen across the frame, the whole picture goes pale for a few frames, and the beam swings away to the left.

5.07s The boat.
A sailboat crosses far out, shown only by its masthead light.
The beam points out to sea, lights a patch of wave crests, and the sail flashes white as the patch passes.

6.28s Moonrise.
A thin waning crescent rises where the sun will rise, with a short road of moonlight under it.

7.0s Second flash.

7.6s Dawn.
Night lifts back up the sky.
The earth's shadow sinks into the right horizon with the pink belt on it.
Stars go out on an ease as the ink thins under them.
The stepped night edge goes back down the tower and over the sea.

9.24s Handback.
The first sliver of sun breaks the sea on the left.
The lamp goes out on a fast ease while the dome catches the first light.
The light comes down the tower and spreads over the grass toward us.

9.3s to 12.0s Day.
The sun arcs high across the frame.
The tower's shadow swings across the grass like a sundial hand, short at noon and long again toward evening.
The moon whitens into the day sky, because it is bare paper on paper.
The gulls come back in from the right at 9.9 s.
Everything lands where frame 0 began.

## Motion

Springs for arrivals: the lamp and the stars, k = 260, d = 24.
Eases for exits: the lamp going out, the stars going out.
No overshoot on type. There is no type.
The sun's angle is a periodic monotone spline, so position and speed match across the seam.
The lens turns three times per loop at a steady rate, so its flashes are 4 s apart (Fl W 4s) and only show at night.
Haze scatters forward: the beam is brightest coming at us and faint going away.
The boat crosses at night only. The gulls, the stars, and the wave shimmer are periodic or off frame at the seam.
The frame at 0 seconds and the frame at the end match.

## Sound

None. A silent loop is complete.

## Notes

Looking south from behind the lighthouse, so the sun rises on the left and sets on the right.
The day is a time lapse, but the lens keeps real time. That is deliberate.
Checked: the same t gives the same pixels twice and from a cold page; t = 0, 12, and 24 match; the frame step across the seam matches the steps beside it; the piece reads at 360 px wide.
In headless Chromium without a GPU a frame takes about 60 ms; almost all of it is rasterising the three ink layers.
