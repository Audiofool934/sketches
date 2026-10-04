# The Road Home

A 36-second silent mosaic journey through the Shire, the Ring, Moria, Mount Doom, and home.
The picture fills a 16:9 frame at 3840 by 2160 and 60 frames per second.
The material engine is a snapshot of the current Odyssey Trailers renderer.
The scene drawings and direction are original to this piece.

## Finished files

- `out/master-4k/video.mp4`: 3840 by 2160, 60 fps, 36 seconds, silent.
- `out/review-1080p/video.mp4`: 1920 by 1080 review copy.
- `out/ring-4k.png` and `out/moria-4k.png`: full-resolution stills.

`REVIEW.md` records the visual checks and playback verification.

## Preview

```sh
npm ci
npm run serve
```

Open http://127.0.0.1:8036/ in a WebGL2-capable browser.
The film plays once and holds its final frame.
Reload to replay, or append `?t=9.5&sub=4` to inspect a specific moment.
The `w` parameter selects the internal picture width, independently of the display size.

## Render

The export tools use Playwright's installed Chromium and ffmpeg.
On this Mac they render through Metal.

```sh
node tools/render.mjs --film 1 --w 3840 --sub 4 --seg 120 --intermediate h264 --out out/master-4k
```

The resulting movie is `out/master-4k/video.mp4`.
Each completed segment can be resumed after an interruption.
Use a fresh output folder after changing drawings or timing, since existing segments are reused.
All rendering outputs stay under the ignored `out/` folder.

```sh
node tools/still.mjs --film 1 --w 1920 --sub 4 --t 0.7,4.7,9.5,16,27,35.5 --out out/stills
```

## Source map

`brief.md` defines the creative direction and timing.
`shots/film-1.json` defines the scene clock, output dimensions, and frame rate.
`pictures/` contains the drawings and light and camera settings.
`engine/` turns those drawings into physical stones and renders them at an arbitrary time.

## Reference

[Tolkien's illustrations](https://www.tolkienestate.com/painting/the-lord-of-the-rings/) informed the architectural and landscape vocabulary.
The film contains no external pictures, film frames, logos, or soundtrack.
The original Odyssey piece was kept intact in its own branch and folder.
