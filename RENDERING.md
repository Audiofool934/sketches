# Rendering Borrowed Lines safely

## Running a render

`node src/render.mjs --out render/borrowed_lines.mp4` renders the whole film at 1920x1080, 24 fps, crf 16, preset slow, and muxes the original recording.
It re-launches itself under `tools/render_guard.py`, so every render is watched by an independent process.
It chooses the number of workers from measured memory needs and the memory that is reclaimable at launch; `--workers N` can ask for fewer, and a request for more is capped.
Segments of 240 frames go to `render/segments/`, and each finished segment gets a `.ok` mark holding its size.
Running the same command again resumes: finished segments are skipped, unfinished ones are rendered again.
`plan.json` in the segment folder refuses to mix segments made with different settings.
After any stop nothing is retried automatically.
A guard stop is recorded in `render/segments/guard/<time>/guard_summary.json` (reason, limits, peaks, anything left running), with a sample log beside it.
A worker or encoder failure is recorded in `render/segments/failure.json`.

## The resource guard

The guard runs the render in its own session and process group.
Every 0.1 s it reads the physical footprint of every process in the job (the driver, the Node workers, the ffmpeg encoders, anything they start) from the kernel with `proc_pid_rusage`, so native canvas and encoder memory is counted, not only the JavaScript heap.
Every 0.5 s it reads the kernel memory-pressure level, swap in use and the memory held by the compressor.
It stops the job when the pressure level reaches 2 (warning), swap grows by 256 MB, compressed memory grows by 1536 MB, the job's total footprint passes its limit, or any single process passes its limit.
To stop, it sends SIGTERM to the job's process group and to every descendant, waits 4 s, sends SIGKILL to anything left, and checks that nothing from the job remains.
Workers kill their own encoder when they receive SIGTERM.
The guard exits with status 3 after a stop and 4 if memory pressure was already high at launch.

The driver sets the limits from measurements with a 1.35 margin: 1323 MB for any one process and 2295 MB per worker for the job.
It keeps 4096 MB of the reclaimable memory (free, speculative and inactive pages) for the rest of the system.
With about 5.5 GB reclaimable on 28 September this gives one worker.
Two workers need about 8.7 GB reclaimable.

## The crash on 28 September 2026: cause

The 2D context of `@napi-rs/canvas` 1.0.9 records draw calls and rasterizes them later, on readback.
A fill whose pattern source is a canvas stores a full copy of that canvas in the recording: 16 MB per paper fill, 4 MB per gouache fill, 1 MB per charcoal stroke.
Garbage collection does not release these copies.
The contexts were never reset, so the copies accumulated across frames.
Measured in isolation: 40 paper-pattern fills added 16.0 MB each, also after `global.gc()`; the same texture as a decoded image added nothing.
With rasterization forced and no reset, 60 fills per frame grew by about 370 MB per frame until the guard stopped the test at 2.65 GB.
On real frames the original path peaked at 2.49 GB for one city frame and passed 3.17 GB within one wave frame before the guard stopped it.
Eight workers each accumulating frame after frame matches the 74 GiB recorded before the restart.
Layers composited with `drawImage` are also kept in the recording until the context is reset.

Checked and ruled out by measurement:
the shared trace-mask canvas (3000 calls: flat 110 MB, constant 1.2 ms per call);
pixel readback (its buffers are freed once the event loop turns; flat at about 140 MB with one turn per frame);
the pipe into ffmpeg (fast; the apparent 4 s per frame was deferred rasterization happening inside the readback).
The per-size mask cache and per-colour pattern caches could grow in principle but held only tens of MB; they were bounded anyway.

## Changes

`src/lib/draw.mjs`: every pattern source is a decoded image instead of a canvas; a frame that meets a texture not yet decoded is drawn once more to collect every missing source, which are decoded together before the real draw (`drawWithPatterns`).
Colour keys for the per-colour patterns use the integer channels that `rgba()` already uses, so the pixels are unchanged.
`src/film.mjs`: the main context and every layer context are reset before each frame, and so is every piece of painter state a redraw could inherit (context, frame, zoom, line compensation).
`src/scenes/embrace.mjs`: the embrace image stays marked for redrawing until one complete real draw has finished (a partial draw could otherwise have been cached for a whole worker).
`src/lib/trace.mjs`: one mask canvas for all silhouettes.
`src/render_worker.mjs`: one event-loop turn per frame so readback memory is released; four x264 threads; the encoder is killed if the worker is stopped.
`src/render.mjs`: runs under the guard, resumable segments, no retry, workers from measured memory.

## Measurements (28 September 2026, Apple M2 Pro, 16 GB)

All figures are kernel physical footprints.
One worker with its encoder, 8 frames in each of 18 places across the film: renderer 210-578 MB, whole job 369-749 MB, 0.2-1.7 s per frame.
The city at 24 frames: renderer 693 MB, encoder 426 MB.
Two workers for 720 frames (three 240-frame chunks of city and palm, one worker doing two chunks in a row): job peak 2864 MB, flat from the fifth minute to the end; renderers 853, 488 and 530 MB; encoders 817-851 MB at x264's default threading; pressure stayed normal and swap unused.
x264 on 120 real frames: 887 MB at default threading, 693 MB with 4 threads, 645 MB with 2, with the same SSIM against the source (0.99414) in all three.
One process rendering every 60th frame of the whole film peaked at 980 MB and averaged 0.92 s per frame, about 94 worker-minutes for the film.

Output check: on frames 1100, 2600 and 5400 the fixed render differs from the original canvas-pattern render by a mean of 0.03-0.25 levels, at most 18, and no pixel by more than 24.
The difference comes from how the library samples an image-backed pattern versus a canvas-backed one; zoomed crops are indistinguishable.

The scripts behind these measurements are in `tools/` (`memtest_*.mjs`, `memprobe.mjs`, `pattern_equivalence.mjs`, `frame_ab.mjs`, `timing_sample.mjs`), and each refuses to run outside the guard.
