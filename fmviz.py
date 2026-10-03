"""Shared look-and-feel and helpers for the flow matching video."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

from manim import (
    BOLD, DOWN, LEFT, ORIGIN, RIGHT, UP, Circle, DecimalNumber, ImageMobject,
    Line, MathTex, Tex, TexTemplate, Text, VGroup, VMobject, config, interpolate_color,
    ManimColor,
)
from manim.constants import RESAMPLING_ALGORITHMS

DATA_DIR = Path(__file__).parent / "data"

# ----------------------------------------------------------------------------
# Palette
# ----------------------------------------------------------------------------
BG = "#090C13"
BG_CENTER = "#131A28"
INK = "#E9ECF2"
MUTED = "#8E97AB"
FAINT = "#2A3242"
NOISE = "#5DB7FF"      # x0, p0
DATA = "#FF8A65"       # x1, p_data
VEL = "#FFD166"        # velocities
MODEL = "#7BE3B6"      # v_theta, the network
ACCENT = "#F2668B"

SUNSET = ["#FFE08A", "#FFB35C", "#FF7B6B", "#E4559C", "#9E6BFF"]

FONT = "Avenir Next"
MONO = "Menlo"


def hex_rgb(c) -> np.ndarray:
    return np.array(ManimColor(c).to_rgb(), dtype=np.float32)


def gradient(stops, x) -> np.ndarray:
    """Piecewise-linear colour ramp. x in [0,1] -> (N,3) rgb."""
    x = np.clip(np.asarray(x, dtype=np.float32), 0, 1)
    cols = np.stack([hex_rgb(c) for c in stops])
    pos = x * (len(stops) - 1)
    i = np.minimum(pos.astype(int), len(stops) - 2)
    f = (pos - i)[..., None]
    return cols[i] * (1 - f) + cols[i + 1] * f


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


# ----------------------------------------------------------------------------
# Text helpers: prose is typeset by XeLaTeX in Avenir Next (Pango's Text has
# kerning artefacts at small sizes), maths stays in Computer Modern.
# ----------------------------------------------------------------------------
TEX = TexTemplate(tex_compiler="xelatex", output_format=".xdv")
TEX.add_to_preamble(r"""
\usepackage[no-math]{fontspec}
\setmainfont{Avenir Next}[UprightFont={* Regular}, BoldFont={* Demi Bold}, ItalicFont={* Italic}]
\newfontfamily\medium{Avenir Next}[UprightFont={* Medium}]
\renewcommand{\arraystretch}{1.15}
""")
config.tex_template = TEX


def TX(*parts, size=34, color=INK, align="left", medium=False):
    """Prose with optional coloured parts: TX("velocity ", ("$x_1$", DATA))."""
    strs = [p if isinstance(p, str) else p[0] for p in parts]
    cols = [color if isinstance(p, str) else p[1] for p in parts]
    if medium:  # font switches are per table cell, so repeat after every line break
        strs = [x.replace("\\\\", "\\\\\\medium ") for x in strs]
        strs[0] = "\\medium " + strs[0]
    # a tabular never auto-wraps: line breaks happen only where "\\\\" says so
    env = "{tabular}{@{}l@{}}" if align == "left" else "{tabular}{@{}c@{}}"
    m = Tex(*strs, font_size=size, tex_environment=env, tex_template=TEX)
    for sub, c in zip(m, cols):
        sub.set_color(c)
    return m


def T(s, size=34, color=INK, align="left", medium=False):
    return TX(s, size=size, color=color, align=align, medium=medium)


def M(*s, size=40, color=INK, **kw) -> MathTex:
    return MathTex(*s, font_size=size, color=color, tex_template=TEX, **kw)


def title_text() -> Text:
    t = Text("Flow Matching", font=FONT, weight=BOLD, color=INK)
    t.scale_to_fit_width(10.6).move_to(UP * 0.35)
    return t


# ----------------------------------------------------------------------------
# Data: a two-armed spiral (data units; noise is N(0, I))
# ----------------------------------------------------------------------------
SPIRAL_M = 1200
SPIRAL_SD = 0.075
TITLE_NOISE_SCALE = 1.25   # scene units per unit of noise for the title flow
TITLE_SD = 0.012
N_FREQ = 4
EULER_STEPS = (1, 2, 4, 8, 32)


def spiral_base(M=SPIRAL_M, r0=0.32, r1=2.75, turns=1.22, theta0=0.35):
    per = M // 2
    u = np.linspace(0, 1, 6001)
    r = r0 + (r1 - r0) * u
    dth = 2 * np.pi * turns
    ds = np.sqrt((r1 - r0) ** 2 + (r * dth) ** 2)
    s_cum = np.concatenate([[0], np.cumsum(0.5 * (ds[1:] + ds[:-1]) * np.diff(u))])
    s_cum /= s_cum[-1]
    s = (np.arange(per) + 0.5) / per
    uu = np.interp(s, s_cum, u)
    rr = r0 + (r1 - r0) * uu
    pts, arms, ss = [], [], []
    for a in (0, 1):
        th = theta0 + dth * uu + a * np.pi
        pts.append(np.stack([rr * np.cos(th), rr * np.sin(th)], 1))
        arms.append(np.full(per, a))
        ss.append(s)
    return np.concatenate(pts), np.concatenate(arms), np.concatenate(ss)


def sample_spiral(n, rng):
    base, _, s = spiral_base()
    j = rng.integers(0, len(base), n)
    return base[j] + SPIRAL_SD * rng.standard_normal((n, 2)), s[j]


def u_exact_np(x, t, Y, sd=SPIRAL_SD):
    """Exact marginal velocity E[x1 - x0 | x_t = x] (see precompute.py)."""
    s2 = (1 - t) ** 2 + (t * sd) ** 2
    c = (t * sd * sd - (1 - t)) / s2
    d2 = ((x[:, None, :] - t * Y[None, :, :]) ** 2).sum(-1)
    logits = -d2 / (2 * s2)
    logits -= logits.max(1, keepdims=True)
    w = np.exp(logits)
    w /= w.sum(1, keepdims=True)
    return c * x + (1 - c * t) * (w @ Y)


def time_freqs(n=N_FREQ):
    return np.pi * 2.0 ** np.arange(n)


def mlp_forward(W, x, t):
    x = np.asarray(x, dtype=np.float32)
    tt = np.broadcast_to(np.asarray(t, dtype=np.float32).reshape(-1, 1), (len(x), 1))
    tf = tt * time_freqs().astype(np.float32)[None, :]
    h = np.concatenate([x, tt, np.sin(tf), np.cos(tf)], 1)
    n = sum(1 for k in W if k.startswith("W"))
    for i in range(n):
        h = h @ W[f"W{i}"] + W[f"b{i}"]
        if i < n - 1:
            h = h / (1 + np.exp(-h))  # SiLU
    return h


def load(name):
    with np.load(DATA_DIR / f"{name}.npz") as f:
        return {k: f[k] for k in f.files}


def interp_traj(traj, t):
    """Positions at flow time t in [0,1] from a (K+1, N, 2) trajectory."""
    K = len(traj) - 1
    u = np.clip(t, 0, 1) * K
    i = min(int(u), K - 1)
    f = u - i
    return traj[i] * (1 - f) + traj[i + 1] * f


# ----------------------------------------------------------------------------
# Background
# ----------------------------------------------------------------------------
def background() -> ImageMobject:
    pw, ph = config.pixel_width, config.pixel_height
    y, x = np.mgrid[0:ph, 0:pw].astype(np.float32)
    r = np.sqrt(((x - pw / 2) / (0.62 * pw)) ** 2 + ((y - ph * 0.46) / (0.62 * pw)) ** 2)
    k = np.clip(1 - r, 0, 1) ** 1.6
    c0, c1 = hex_rgb(BG), hex_rgb(BG_CENTER)
    img = c0[None, None] * (1 - k[..., None]) + c1[None, None] * k[..., None]
    img += (np.random.default_rng(0).random(img.shape) - 0.5) / 255.0  # dither
    rgba = np.concatenate([img, np.ones((ph, pw, 1), np.float32)], 2)
    im = ImageMobject((np.clip(rgba, 0, 1) * 255).astype(np.uint8), scale_to_resolution=ph)
    im.stretch_to_fit_width(config.frame_width).stretch_to_fit_height(config.frame_height)
    im.set_z_index(-100)
    return im


# ----------------------------------------------------------------------------
# Glowing particles: a raster layer re-rendered every frame
# ----------------------------------------------------------------------------
class GlowCloud(ImageMobject):
    """Additive-looking glowing particles drawn into a pixel-aligned image.

    Sizes are given in scene units so the look is identical at any render
    quality.  Call ``draw(points, colors, weights)`` from an updater.
    """

    def __init__(self, center=ORIGIN, width=None, height=None, core=0.011, glow=0.075,
                 core_gain=1.0, glow_gain=1.0, **kw):
        self.ppu = config.pixel_width / config.frame_width
        width = config.frame_width if width is None else width
        height = config.frame_height if height is None else height
        W, H = int(round(width * self.ppu)), int(round(height * self.ppu))
        left = int(round(center[0] * self.ppu + config.pixel_width / 2 - W / 2))
        top = int(round(-center[1] * self.ppu + config.pixel_height / 2 - H / 2))
        self.W, self.H, self.left, self.top = W, H, left, top
        super().__init__(np.zeros((H, W, 4), np.uint8), scale_to_resolution=config.pixel_height, **kw)
        self.stretch_to_fit_width(W / self.ppu).stretch_to_fit_height(H / self.ppu)
        q = 0.25  # quarter-pixel nudge so integer corner coords never round down
        cx = (left + W / 2 + q - config.pixel_width / 2) / self.ppu
        cy = -(top + H / 2 + q - config.pixel_height / 2) / self.ppu
        self.move_to([cx, cy, 0])
        self.set_resampling_algorithm(RESAMPLING_ALGORITHMS["nearest"])
        self.core_px = max(core * self.ppu, 0.75)
        self.glow_px = glow * self.ppu
        self.core_gain, self.glow_gain = core_gain, glow_gain
        # kernel offsets for the core splat
        rad = int(np.ceil(self.core_px * 2.6))
        oy, ox = np.mgrid[-rad : rad + 1, -rad : rad + 1]
        self._ox, self._oy = ox.ravel(), oy.ravel()
        self._ds = 4 if self.glow_px > 6 else 2
        self.set_z_index(0)

    # scene -> pixel coordinates inside this canvas
    def to_px(self, pts):
        px = pts[:, 0] * self.ppu + config.pixel_width / 2 - self.left
        py = -pts[:, 1] * self.ppu + config.pixel_height / 2 - self.top
        return px, py

    def _core(self, px, py, vals):
        H, W = self.H, self.W
        cx, cy = np.floor(px).astype(np.int64), np.floor(py).astype(np.int64)
        xi = cx[:, None] + self._ox[None, :]
        yi = cy[:, None] + self._oy[None, :]
        dx = xi + 0.5 - px[:, None]
        dy = yi + 0.5 - py[:, None]
        k = np.exp(-(dx * dx + dy * dy) / (2 * self.core_px ** 2)).astype(np.float32)
        k /= k.sum(1, keepdims=True)
        # normalise so an isolated particle peaks at ~1 regardless of resolution
        k *= 2 * np.pi * self.core_px ** 2
        m = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < H)
        idx = (yi * W + xi)[m]
        out = np.empty((H, W, 3), np.float32)
        kk = k[m]
        rows = np.broadcast_to(np.arange(len(px))[:, None], m.shape)[m]
        for c in range(3):
            out[..., c] = np.bincount(idx, weights=kk * vals[rows, c], minlength=H * W).reshape(H, W)
        return out

    def _glow(self, px, py, vals):
        d = self._ds
        h, w = -(-self.H // d), -(-self.W // d)
        x, y = px / d - 0.5, py / d - 0.5
        x0, y0 = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
        fx, fy = (x - x0).astype(np.float32), (y - y0).astype(np.float32)
        idxs, wts, rows = [], [], []
        n = len(px)
        for ddx, ddy, ww in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)),
                             (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
            xi, yi = x0 + ddx, y0 + ddy
            m = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < h)
            idxs.append((yi * w + xi)[m]); wts.append(ww[m]); rows.append(np.arange(n)[m])
        idx, wt, row = np.concatenate(idxs), np.concatenate(wts), np.concatenate(rows)
        out = np.empty((self.H, self.W, 3), np.float32)
        s = self.glow_px / d
        for c in range(3):
            g = np.bincount(idx, weights=wt * vals[row, c], minlength=h * w).reshape(h, w)
            g = gaussian_filter(g.astype(np.float32), s, mode="constant")
            im = Image.fromarray(g, mode="F").resize((w * d, h * d), Image.BILINEAR)
            out[..., c] = np.asarray(im)[: self.H, : self.W]
        return out

    def draw(self, pts, colors, weights=None, opacity=1.0, glow_opacity=None):
        """pts (N,2) scene coords, colors (N,3) or (3,), weights (N,) or None."""
        if glow_opacity is None:
            glow_opacity = opacity
        if len(pts) == 0 or (opacity <= 0 and glow_opacity <= 0):
            self.pixel_array = np.zeros((self.H, self.W, 4), np.uint8)
            return
        pts = np.asarray(pts, dtype=np.float64)
        colors = np.broadcast_to(np.asarray(colors, np.float32), (len(pts), 3))
        w = np.ones(len(pts), np.float32) if weights is None else np.asarray(weights, np.float32)
        vals = colors * w[:, None]
        px, py = self.to_px(pts)
        L = np.zeros((self.H, self.W, 3), np.float32)
        if opacity > 0:
            L += self._core(px, py, vals) * (self.core_gain * opacity)
        if glow_opacity > 0 and self.glow_gain > 0:
            # glow ~ local density in (1000 particles / unit^2), resolution independent
            dens = (self.ppu / self._ds) ** 2 / 1000.0
            L += self._glow(px, py, vals) * (self.glow_gain * glow_opacity * dens)
        L = 1 - np.exp(-L)
        a = L.max(-1)
        rgb = L / np.maximum(a, 1e-6)[..., None]
        rgba = np.concatenate([rgb, a[..., None]], -1)
        self.pixel_array = (np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8)


# ----------------------------------------------------------------------------
# Arrows for vector fields (updated in place every frame)
# ----------------------------------------------------------------------------
def arrow_polys(base, vec, width=0.016, head=0.1, head_w=None):
    """Closed polygons (N, 8, 3) for arrows from ``base`` along ``vec`` (both (N, 2))."""
    base = np.atleast_2d(np.asarray(base, dtype=np.float64))[:, :2]
    vec = np.atleast_2d(np.asarray(vec, dtype=np.float64))[:, :2]
    L = np.linalg.norm(vec, axis=1)
    d = vec / np.maximum(L, 1e-9)[:, None]
    n = np.stack([-d[:, 1], d[:, 0]], 1)
    h = np.minimum(head, 0.45 * L)
    ws = width * np.minimum(1, L / (1.5 * head))
    wh = (5.2 * width if head_w is None else head_w) * (h / head)
    tip = base + vec
    neck = tip - d * h[:, None]
    a, b = n * (ws / 2)[:, None], n * (wh / 2)[:, None]
    pts = np.stack([base + a, neck + a, neck + b, tip, neck - b, neck - a, base - a, base + a], 1)
    return np.concatenate([pts, np.zeros(pts.shape[:2] + (1,))], 2)


class Arr(VMobject):
    """A single filled arrow with the same geometry as the field arrows."""

    def __init__(self, start, vec, width=0.026, head=0.15, color=VEL, opacity=1.0, **kw):
        super().__init__(stroke_width=0, fill_color=color, fill_opacity=opacity, **kw)
        self._aw, self._ah = width, head
        self.put(start, vec)

    def put(self, start, vec):
        self.set_points_as_corners(arrow_polys(start, vec, self._aw, self._ah)[0])
        return self


class FieldArrows(VGroup):
    """A grid of arrows whose vectors are set each frame.

    Vectors are given in scene units; lengths are soft-capped at ``max_len``.
    """

    def __init__(self, anchors, max_len=0.42, width=0.016, color=MODEL, dim_color="#2D5A4C",
                 opacity=0.95, ref=1.0):
        super().__init__()
        self.anchors = np.asarray(anchors, dtype=np.float64)[:, :2]
        # NB: Mobject already owns .width/.color, so use private names
        self._max_len, self._w, self._op, self._ref = max_len, width, opacity, ref
        self._col = ManimColor(color)
        self._dim = ManimColor(dim_color)
        for _ in range(len(self.anchors)):
            self.add(VMobject(stroke_width=0, fill_opacity=opacity))
        self.master = 1.0

    def set_vectors(self, vecs, master=None):
        if master is not None:
            self.master = master
        vecs = np.asarray(vecs, dtype=np.float64)
        mag = np.linalg.norm(vecs, axis=1)
        L = self._max_len * np.tanh(mag / self._ref)
        d = vecs / np.maximum(mag, 1e-9)[:, None]
        polys = arrow_polys(self.anchors - d * (L / 2)[:, None], d * L[:, None], self._w, 0.1)
        strength = np.clip(L / self._max_len, 0, 1)
        for arrow, p, s_ in zip(self.submobjects, polys, strength):
            arrow.set_points_as_corners(p)
            arrow.set_fill(interpolate_color(self._dim, self._col, 0.3 + 0.7 * s_),
                           opacity=self._op * self.master * (0.3 + 0.7 * s_))
        return self


def grid_points(center, half_w, half_h, step, radius=None):
    xs = np.arange(-half_w, half_w + 1e-9, step)
    ys = np.arange(-half_h, half_h + 1e-9, step)
    X, Y = np.meshgrid(xs, ys)
    P = np.stack([X.ravel(), Y.ravel()], 1)
    if radius is not None:
        P = P[np.linalg.norm(P, axis=1) <= radius]
    return P + np.asarray(center)[:2]


# ----------------------------------------------------------------------------
# Time slider
# ----------------------------------------------------------------------------
class TimeSlider(VGroup):
    def __init__(self, tracker, length=3.8):
        super().__init__()
        self.tracker = tracker
        line = Line(LEFT * length / 2, RIGHT * length / 2, stroke_width=2.5, color="#3A4356")
        fill = Line(LEFT * length / 2, LEFT * length / 2 + RIGHT * 1e-3, stroke_width=4,
                    color=MUTED)
        l0 = M("0", size=32, color=NOISE).next_to(line, LEFT, buff=0.2)
        l1 = M("1", size=32, color=DATA).next_to(line, RIGHT, buff=0.2)
        knob = Circle(radius=0.085, stroke_width=0, fill_color=INK, fill_opacity=1)
        lab = M("t", "=", size=38).next_to(line, UP, buff=0.25).shift(LEFT * 0.42)
        num = DecimalNumber(0, num_decimal_places=2, font_size=38, color=INK)
        num.next_to(lab, RIGHT, buff=0.14)
        self.add(line, fill, l0, l1, knob, lab, num)
        self.track, self.bar, self.knob, self.num, self.lab = line, fill, knob, num, lab

        def upd(m):
            t = float(np.clip(tracker.get_value(), 0, 1))
            p = m.track.point_from_proportion(t)
            m.knob.move_to(p)
            m.bar.put_start_and_end_on(m.track.get_start(), p + RIGHT * 1e-3)
            m.num.set_value(t)
            m.num.next_to(m.lab, RIGHT, buff=0.14)
        self.add_updater(upd)
        upd(self)
