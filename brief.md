# odyssey lantern

## Stack

mosaic.
One HTML file.
No libraries.

The panel-laid grammar from `stacks/mosaic.md`: direct method, sinopia on the bare bed, laid from the eye outward, border last, camera pulling back from macro.
About eighteen thousand bevelled stones. Each one drops, turns in the light and casts a shadow, so they are real geometry in WebGL2.
The stones are one merged mesh that pulls each stone's data from a float texture, instead of instanced boxes: SwiftShader, the only renderer on a machine without a GPU, spends about six times longer on 18k instances than on the same geometry merged.
Canvas 2D paints the flat picture and the sinopia once, offscreen. The tessellation reads them.
Playwright seeks `window.seek(t)`, ffmpeg encodes.

## Idea

A Roman mosaic panel is laid stone by stone outward from a lantern, until Odysseus and his crew stand on black volcanic ground where a river of ice meets a river of fire, at blue hour.
The viewer should feel the cold, a small warm light, and the weight of real stones being set.

The place is the meeting of the rivers at the edge of the underworld, where Pyriphlegethon, the river of fire, runs into the Acheron beside a rock (Odyssey 10).
The lantern is the eye of the picture. Its flame is the first stone laid, and it lights the panel as it lands.

## Look

Frame: 1920 by 1080, 60 fps, 26 seconds, one shot.
Panel: 1600 by 900 mm with a 62 mm border.

Palette, as tesserae:

- Sky, blue hour: #060a1b #0f1b44 #1c3270 #304f99 #5877b4 #8a9cc6
- Halo, warm into cold: #fff0c2 #ffc265 #e88a3c #ad5a42 #5f405c #2b335f
- Basalt ground and rock: #050507 #0f0f14 #1c1c25 #24242e
- Ice: #eef3f9 #c3d5ea #8dabd1 with cracks #15264c #2f538c
- Fire: #ffe39a #ff9a36 #d9481a with crust #150605 #47170b
- Steam: #ccd4e3 #97a4bd #65748f, lit underneath #ecc8ae #c4917c
- Crew: navy glass #0d1322 #172243, bronze #7a5025 #e9ae55, crest #661a14
- Odysseus: tunic #4c331e, cloak #6c2116, cap #a06a34, skin #b56f44 #f2bf86
- Border: black #0c0c10, cream marble #d3c7ad, gold #cc9a40
- Mortar #a59b8c, sinopia #7a2a18

Accent: lantern orange #ff9a36. Every other warm stone is the lantern's light or the fire.
No type, so no display face or UI face.
Banned: gradient behind a centered title, fade-in on everything, corner labels, frame borders, bloom glow, invented product UI.
The lantern's glow is stone and light, not a filter: concentric rings of tesserae around it, and a real warm point light above it that rakes the stones and throws their shadows.

Materials: glass smalti set broken face up, gold leaf, silver leaf for the stars, marble for the whites, basalt for the ground.
Each stone has its own tilt, so the light glints one stone at a time.
Mortar shows between every stone.

## Beats

0.0 to 0.8. Macro, oblique, shallow focus. Bare rough coat in cold light with the lantern drawn on it in red sinopia. The camera breathes.
0.8 to 2.4. Hook. The first flame stone drops, turns once and seats. It glows as it lands and the warm light comes on over the bed. The camera adapts down as the flame fills.
2.4 to 4.2. The lantern's amber panes, then its dark cage and brass cap. Fresh lime is spread just ahead of each stone and hides the drawing.
4.2 to 6.5. The halo goes down ring by ring. Odysseus's hand, arm, face and cap. The camera starts to pull back.
6.5 to 10.0. Odysseus's tunic and crimson cloak, then the crew stand up one by one out of the bare mortar, ahead of the sky around them. Shields and crests, spears into the sky. The river of ice behind them.
10.0 to 14.0. The last of the crew, the steam and the river of fire, the rock where the rivers meet, the glacier and the mountains.
14.0 to 17.4. The camera reaches the whole panel. Basalt and the blue sky are laid in courses into the corners.
17.0 to 21.4. The border goes on last: two runs of the meander start at the bottom centre and meet at the top.
21.4 to 26.0. The finished panel. The lantern's light sways as if carried on the march, and the gold glints move with it. A slow push in.

## Motion

Duration: 26 seconds. Frame size: 1920 by 1080. One shot, not a loop.
The front moves out from the lantern along geodesic distance. Figures carry it 2.6 times faster than the ground, so each man stands up before the background around him.
Each course is started where the front first reaches it and then laid stone after stone along the row.
After the first four seconds the seat times are remapped by rank, so the pace rises to about 1100 stones a second, holds, and eases into the corners without a lull.
The camera keys are written against the build and retimed by the same map.
A stone drops a little more than two of its own sizes, tumbles less than a turn, and seats with a damped spring: omega 36, zeta 0.4.
Camera: monotone cubic through keys in log width, tilt 50 to under 1 degree, arriving at rest.
Exposure adapts once, when the lamp catches.
Motion blur is four subframes of the same instant, 180 degree shutter, each jittered for anti-aliasing.

## Sound

Silent.

## Notes

The picture is painted flat with thick contours, then every region is laid in its own andamento:
evenly spaced streamlines of a direction field that follows each region's edge, horizontal in the sky and on the ground, concentric in the halo.
Stones are cut along each course, take the pixels nearest to them in their own square metric, and are shrunk to leave mortar.
Gaps no course reached get their own cut stones.
Tesserae are picked from each region's tray, so gradients come out as a mix of neighbouring shades.
Rim light on the figures is its own course of warm stones on the side that faces the lantern, and blue on the side that faces the sky.
Seeded noise only. Every frame is a pure function of t.

## Render

Open `index.html` to watch it live. `?t=12` holds one frame, `?w=960` renders smaller, `?sub=4` turns on the film's motion blur.
`?view=color`, `?view=labels` and `?view=tiles&cx=1100&cy=400&zoom=6` show the flat picture, the regions, and the laid stones in 2D.

```bash
node tools/render.mjs --out out --w 1920 --fps 60 --sub 4
```

Playwright seeks every frame, the page posts raw pixels back, ffmpeg keeps lossless segments so a stopped render resumes, and the finish is H.264, `yuv420p`, CRF 16.
On a 4-core machine with SwiftShader and no GPU, the film takes about two hours.

The film is on this branch in Git LFS (`git lfs pull` if a clone only has the pointer): `odyssey-lantern.mp4`, H.264 CRF 16, 120 MB.
