#!/usr/bin/env python3
"""Contact sheet of stills: python3 tools/sheet.py ref/stills/r2 [--cols 2] [--w 640] [--ref 1]

With --ref N, each still is paired with the trailer frame at the same time, for a
side-by-side check of framing and timing.
"""
import argparse
import glob
import os
import re
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import frames  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--cols", type=int, default=2)
    ap.add_argument("--w", type=int, default=640)
    ap.add_argument("--ref", type=int, default=0, help="film number to pair with trailer frames")
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.dir, "t*.png")), key=lambda f: float(re.findall(r"t([\d.]+)\.png", f)[0]))
    tiles = []
    for f in files:
        t = float(re.findall(r"t([\d.]+)\.png", f)[0])
        im = Image.open(f).convert("RGB")
        h = round(a.w * im.height / im.width)
        tiles.append((f"t={t:.3f}", im.resize((a.w, h), Image.LANCZOS)))
        if a.ref:
            n = round(t * float(frames.FPS[a.ref]))
            band = Image.fromarray(frames.band(a.ref, n)).resize((a.w, h), Image.LANCZOS)
            tiles.append((f"trailer frame {n}", band))
    cols = a.cols * (2 if a.ref else 1)
    h = tiles[0][1].height
    S = Image.new("RGB", (cols * a.w, ((len(tiles) + cols - 1) // cols) * (h + 16)), (24, 24, 24))
    d = ImageDraw.Draw(S)
    for i, (label, im) in enumerate(tiles):
        x, y = (i % cols) * a.w, (i // cols) * (h + 16)
        S.paste(im, (x, y + 16))
        d.text((x + 4, y + 2), label, fill=(255, 220, 120))
    out = os.path.join(a.dir, "sheet.png")
    S.save(out)
    print(out)


if __name__ == "__main__":
    main()
