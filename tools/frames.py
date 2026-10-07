"""Read trailer frames for the tools. Frames stay in ref/, which is gitignored.

A trailer's picture is a 3840 x 1608 band (2.39:1) between black bars, so every
tool works in band pixels: x from 0 to 3840, y from 0 to 1608.
"""
import json
import os
import subprocess
from fractions import Fraction

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, "ref")
FULL_W, FULL_H = 3840, 2160
BAND_TOP, BAND_H = 276, 1608
FPS = {1: Fraction(24, 1), 2: Fraction(24000, 1001)}


def trailer_path(film):
    return os.path.join(REF, f"t{film}.webm")


def frame_time(film, n):
    """Exact time of frame n, in seconds, as a Fraction."""
    return Fraction(n) / FPS[film]


def _select(n):
    return f"select='eq(n\\,{n})'"


def band(film, n, cache=True):
    """Frame n of a trailer as an RGB uint8 array of the picture band, 1608 x 3840."""
    path = os.path.join(REF, "frames", f"t{film}", f"{n:05d}.png")
    if cache and os.path.exists(path):
        return np.asarray(Image.open(path).convert("RGB"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", trailer_path(film), "-an", "-vf", _select(n), "-frames:v", "1",
         "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True, capture_output=True).stdout
    full = np.frombuffer(raw, np.uint8).reshape(FULL_H, FULL_W, 3)
    out = np.ascontiguousarray(full[BAND_TOP:BAND_TOP + BAND_H])
    if cache:
        Image.fromarray(out).save(path)
    return out


def gray_run(film, first, last, width):
    """Frames first..last inclusive as float32 grey bands scaled to `width`, decoded in one pass."""
    h = round(BAND_H * width / FULL_W)
    vf = (f"select='between(n\\,{first}\\,{last})',crop={FULL_W}:{BAND_H}:0:{BAND_TOP},"
          f"scale={width}:{h}:flags=area,format=gray")
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", trailer_path(film), "-an", "-vf", vf, "-fps_mode", "passthrough",
         "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        check=True, capture_output=True).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, h, width).astype(np.float32) / 255.0
    if len(frames) != last - first + 1:
        raise RuntimeError(f"expected {last - first + 1} frames, got {len(frames)}")
    return frames


def load_json(path):
    with open(path) as f:
        return json.load(f)
