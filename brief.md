# lighthouse sunset

## Idea

At sunset the sun hands its light to a lighthouse, which keeps it through one night and hands it back at dawn.
The viewer should feel looked after, as if the dark has a keeper.

By day the tower's shadow sweeps the heath like a sundial hand.
By night its beam sweeps the sea.
It is the same gesture with the ink reversed.

## Stack

2D canvas.
One HTML file.
No libraries.
A small 3D model only places things: the sun, the shadow, the beam cone, its footprint on the water, and the boat agree with each other.
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

Palette:
- Paper #f2ecdf
- Blue ink #3255a4: night, sea, rock, shadow
- Pink ink #ff48b0: dusk, dawn, heather, the band on the tower

Accent: yellow ink #ffe800, used only for light: the sun, the lamp, the beam.
Display face: none. The piece is wordless.
UI face: none.
Banned: gradient behind a centered title, fade-in on everything, corner labels, frame borders, glow, invented product UI.

## Beats

Hook inside the first 2 seconds.
Something new every 2 to 4 seconds.
For each beat: what is on screen, how it enters, the action, how it leaves.

0.0s Golden hour.
A low orange sun over the sea on the right, ringed in yellow and pink.
The tower is backlit, with a rim of light on its right edge and a long shadow across the heath to the lower left.
The sun slides down at an angle and squashes as it meets the water.
The shadow stretches to the edge of the frame.

1.4s Handoff, the hook.
The last sliver of sun drops under the sea.
In the same frame the lantern fills with yellow on a spring, and the first beam swings out.

1.8s Dusk.
The earth's shadow rises from the left horizon as a blue band with a pink band riding on it.
It climbs over the whole sky.
Stars punch through the ink, brightest first, each on a small spring.

4.0s Flash.
The beam swings round to face us.
It widens, then the whole frame goes pale for a few frames, with a bright disc around the lamp.
Then it swings away to the right.

4.5s Night.
A sailboat crosses far out, shown only by its masthead light.
Each time the beam passes, it lights a strip of wave crests and the sail flashes paper white.
The stars wheel slowly left to right.

7.6s Dawn.
The night sinks into the right horizon.
Pink and yellow bands rise on the left.
The stars go out from the left, with an ease.

9.2s Handback.
The first sliver of sun breaks the sea on the left.
The lantern goes dark in the same frame.

9.2s to 12.0s Day.
The sun arcs high across the frame.
The tower's shadow swings across the heath like a sundial hand, short at noon and long again toward evening.
Two gulls cross.
The shadow and the sun land where frame 0 began.

## Motion

Springs for arrivals: the lamp k = 260, d = 24; the stars k = 260, d = 24.
Eases for exits: the lamp going out, the stars going out.
No overshoot on type. There is no type.
The sun's angle and the lens angle are periodic in t, so position and velocity match across the seam.
The lens turns three times per loop, one flash every 4 s (Fl W 4s), and only shows at night.
The boat and the gulls enter and leave off frame, so they are absent at the seam.
The frame at 0 seconds and the frame at the end match.

## Sound

None. A silent loop is complete.

## Notes

Looking south from behind the lighthouse, so the sun rises on the left and sets on the right.
The scene is a time lapse, but the lens keeps real time. That is deliberate.
