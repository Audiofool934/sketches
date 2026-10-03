"""Flow Matching: a narrated visual explainer, rendered with manim (Community Edition).

Pipeline: `python precompute.py` (maths + training), `voice.py` (narration clips),
then `python render.py`, which renders these scenes and mixes voice and music.
Every scene is timed to the narration: `with self.voice(key) as b:` plays line
`key` of narration.py while the animations inside it run, and `b.word(...)`
gives the moment a word is spoken, for animations that must land on it.
"""

from __future__ import annotations

import json
import os
import re
from contextlib import contextmanager
from pathlib import Path

import numpy as np
from manim import *

import fmviz as V
from fmviz import M, T, TX
from narration import LINES

config.background_color = V.BG


def _better_encoder():
    """manim writes partial movies at CRF 23, which bands on dark glowing
    gradients. Raise the quality and bias x264 bits toward dark regions."""
    import inspect
    import textwrap
    from manim.scene import scene_file_writer as sfw

    src = textwrap.dedent(inspect.getsource(sfw.SceneFileWriter.open_partial_movie_stream))
    new = src.replace('"crf": "23",', '"crf": "16", "preset": "slow", "x264-params": "aq-mode=3",')
    if new == src:
        print("note: manim encoder settings changed upstream; using its defaults")
        return
    ns: dict = {}
    exec(new, sfw.__dict__, ns)
    sfw.SceneFileWriter.open_partial_movie_stream = ns["open_partial_movie_stream"]


_better_encoder()

S = 0.9                               # scene units per data unit
PC = np.array([-3.0, -0.32, 0.0])     # centre of the 2-D plane (split layout)
COL_L, COL_R = 0.85, 6.9              # the right-hand column
BLUE = V.hex_rgb(V.NOISE)
H1, BODY, SMALL = 50, 38, 34          # type scale

VOICE_DIR = Path(os.environ.get("FM_VOICE_DIR", Path(__file__).parent / "audio" / "voice"))
_manifest = VOICE_DIR / "manifest.json"
VOICE = json.loads(_manifest.read_text()) if _manifest.exists() else {}
if not VOICE:
    print(f"note: no narration in {VOICE_DIR}; timing lines from reading speed")


# ----------------------------------------------------------------------------
# small helpers
# ----------------------------------------------------------------------------
def guard(m, left=-7.0, right=7.0, what="", bottom=-3.8, top=3.85):
    """Log (rather than silently clip) anything that leaves its box."""
    (x0, y0, _), (x1, y1, _) = m.get_corner(DL), m.get_corner(UR)
    if x0 < left - 1e-3 or x1 > right + 1e-3 or y0 < bottom or y1 > top:
        print(f"LAYOUT WARNING {what}: x [{x0:.2f}, {x1:.2f}], y [{y0:.2f}, {y1:.2f}]")
    return m


def MC(*parts, size=42):
    """MathTex from (tex, colour) parts; plain strings are drawn in INK."""
    texs = [p if isinstance(p, str) else p[0] for p in parts]
    cols = [V.INK if isinstance(p, str) else p[1] for p in parts]
    m = M(*texs, size=size)
    for sub, c in zip(m, cols):
        sub.set_color(c)
    return m


def eq_xt(size=48):
    return MC("x_t", "=", "(1-t)", (r"\,x_0", V.NOISE), "+", "t", (r"\,x_1", V.DATA), size=size)


def eq_vel(size=48):
    return MC(r"\frac{d}{dt}\,x_t", "=", ("x_1", V.DATA), "-", ("x_0", V.NOISE), size=size)


def eq_loss(size=30):
    return MC(r"\mathcal{L}_{\mathrm{CFM}}(\theta)", "=", r"\mathbb{E}_{t,\,x_0,\,x_1}", r"\big\|",
              (r"v_\theta(x_t,\, t)", V.MODEL), "-", "(", ("x_1", V.DATA), "-", ("x_0", V.NOISE),
              ")", r"\big\|^2", size=size)


def streak(traj, t, cols, n=5, span=0.02, sign=1.0):
    """Particles plus a short fading tail along their own past trajectory."""
    N = traj.shape[1]
    ts = np.clip(t - sign * np.linspace(0, span, n), 0, 1)
    P = np.concatenate([V.interp_traj(traj, x) for x in ts])
    w = np.linspace(1.0, 0.15, n)
    w = w / w.sum()
    W = np.repeat(w, N).astype(np.float32)
    C = np.tile(np.broadcast_to(cols, (N, 3)), (n, 1))
    return P, C, W


def column(*mobs, buff=0.34, top=2.55):
    g = VGroup(*mobs).arrange(DOWN, aligned_edge=LEFT, buff=buff)
    g.align_to([COL_L, 0, 0], LEFT).align_to([0, top, 0], UP)
    guard(g, COL_L, COL_R, "column")
    return g


def nearest_s(P, base, s):
    d2 = ((P[:, None, :] - base[None, :, :]) ** 2).sum(-1)
    return s[d2.argmin(1)]


def title_colors(fin):
    u = (fin[:, 0] - fin[:, 0].min()) / np.ptp(fin[:, 0])
    return V.gradient([V.NOISE, "#8F8CFF", "#E4559C", V.DATA, V.VEL], u)


def slider_at(tt, y):
    s = V.TimeSlider(tt)
    s.move_to([0, y, 0]).align_to([COL_L + 0.3, 0, 0], LEFT)
    return s


class Beat:
    """Timing handle for one narration line; times are seconds from its start."""

    def __init__(self, scene, key, start):
        self.scene, self.start = scene, start
        info = VOICE.get(key, {})
        self.d = info.get("duration") or len(LINES[key].split()) / 2.6
        # one (token, start) per spoken token; Whisper's "x0" becomes ("x", t), ("zero", t)
        self.tokens = [(tok, t) for entry, t in info.get("words", []) for tok in entry.split()]

    def now(self):
        return self.scene.renderer.time - self.start

    def word(self, w, nth=1, fallback=0.5):
        """When word or phrase `w` is spoken (nth occurrence); else `fallback` * duration."""
        want = re.sub(r"[^a-z0-9 ]+", " ", w.lower()).split()
        toks = [x for x, _ in self.tokens]
        hits = [self.tokens[i][1] for i in range(len(toks) - len(want) + 1)
                if toks[i:i + len(want)] == want]
        return hits[nth - 1] if len(hits) >= nth else fallback * self.d

    def until(self, t):
        if t - self.now() > 1 / config.frame_rate:
            self.scene.wait(t - self.now())

    def left(self, t=None, minimum=0.6):
        """Time from now until `t` (default: the end of the line), at least `minimum`."""
        return max(minimum, (self.d if t is None else t) - self.now())


class Base(Scene):
    def setup(self):
        self.bg = V.background()
        self.add(self.bg)
        self.timeline = []

    @contextmanager
    def voice(self, key, gap=0.45):
        """Play narration line `key`; afterwards hold until it (plus a breath) has finished."""
        b = Beat(self, key, self.renderer.time)
        self.timeline.append({"key": key, "start": round(b.start, 4), "duration": b.d})
        yield b
        b.until(b.d + gap)

    def tear_down(self):
        out = Path(config.media_dir) / "timeline.json"
        out.write_text(json.dumps({"scene": type(self).__name__, "voice_dir": str(VOICE_DIR),
                                   "duration": round(self.renderer.time, 4),
                                   "lines": self.timeline}, indent=1))

    def header(self, text):
        h = T(text, size=H1, medium=True, align="center").to_edge(UP, buff=0.38)
        return guard(h, what="header")

    def swap_header(self, old, text, run_time=1.0):
        new = self.header(text)
        self.play(FadeOut(old, shift=0.2 * UP), FadeIn(new, shift=0.2 * UP), run_time=run_time)
        return new

    def particles(self, fn, op=0.0, **kw):
        """A GlowCloud driven by fn() -> (points, colours, weights)."""
        c = V.GlowCloud(**kw)
        c.op = ValueTracker(op)
        blank = np.zeros((c.H, c.W, 4), np.uint8)

        def upd(m):
            o = m.op.get_value()
            if o <= 1e-3:
                m.pixel_array = blank
                return
            pts, cols, w = fn()
            m.draw(pts, cols, w, opacity=o)

        c.add_updater(upd)
        upd(c)
        return c

    def fade_everything(self, run_time=1.0, keep=()):
        mobs = [m for m in self.mobjects if m is not self.bg and m not in keep]
        anims = []
        for m in mobs:
            if isinstance(m, V.GlowCloud):
                anims.append(m.op.animate.set_value(0))
            elif not isinstance(m, ValueTracker):
                anims.append(FadeOut(m))
        if anims:
            self.play(*anims, run_time=run_time)
        self.remove(*mobs)


def title_cloud(scene):
    traj = V.load("title_flow")["traj"] * V.TITLE_NOISE_SCALE
    dest = title_colors(traj[-1])
    tt = ValueTracker(0.0)

    def fn():
        t = tt.get_value()
        k = V.smooth((t - 0.1) / 0.9)
        return streak(traj, t, BLUE * (1 - k) + dest * k, span=0.025)

    return scene.particles(fn, core=0.0105, glow=0.06, core_gain=0.95, glow_gain=0.2), tt


# ============================================================================
# 1. Cold open: noise flows into the title
# ============================================================================
class S01_Title(Base):
    def construct(self):
        cloud, tt = title_cloud(self)
        self.add(cloud)
        self.wait(0.5)
        with self.voice("s01_a") as b:
            self.play(cloud.op.animate.set_value(1), run_time=min(1.8, b.d))
        with self.voice("s01_b", gap=0.2) as b:
            self.play(tt.animate.set_value(1), run_time=max(5.5, b.d + 0.3), rate_func=smooth)
        title = V.title_text()
        sub = T("Turning noise into data, one straight line at a time", size=40, color=V.MUTED,
                align="center")
        sub.next_to(title, DOWN, buff=0.6)
        with self.voice("s01_c"):
            self.play(FadeIn(title), cloud.op.animate.set_value(0.4), run_time=1.6)
            self.play(FadeIn(sub, shift=0.15 * UP), run_time=1.2)
        self.wait(1.2)
        self.fade_everything(1.2)
        self.wait(0.3)


# ============================================================================
# 2. The goal of generative modelling
# ============================================================================
class S02_Goal(Base):
    def construct(self):
        sf = V.load("spiral_flow")
        noise, data = sf["traj"][0], sf["traj"][-1]
        dest = V.gradient(V.SUNSET, sf["dest_s"])
        cl, cr, sc = np.array([-3.55, -0.3]), np.array([3.55, -0.3]), 0.72
        mv = ValueTracker(0.0)  # 1 = noise sits where the next scene starts

        def fn_left():
            k = V.smooth(mv.get_value())
            c = cl * (1 - k) + PC[:2] * k
            s = sc * (1 - k) + S * k
            return noise * s + c, BLUE, None

        left = self.particles(fn_left, core=0.0105, glow=0.07, core_gain=0.9, glow_gain=0.2)
        right = self.particles(lambda: (data * sc + cr, dest, None), center=[*cr, 0], width=6.8,
                               height=7.2, core=0.0105, glow=0.07, core_gain=0.9, glow_gain=0.2)
        head = self.header("The goal of a generative model")
        tl = T("Noise", size=46, color=V.NOISE, medium=True).move_to([cl[0], 2.45, 0])
        tr = T("Data", size=46, color=V.DATA, medium=True).move_to([cr[0], 2.45, 0])
        ml = M(r"p_0 = \mathcal{N}(0, I)", size=44, color=V.NOISE).move_to([cl[0], -2.85, 0])
        mr = M(r"p_{\mathrm{data}}", size=46, color=V.DATA).move_to([cr[0], -2.85, 0])
        cap_l = T("easy to sample", size=SMALL, color=V.MUTED, align="center")
        cap_r = T("known only through examples", size=SMALL, color=V.MUTED, align="center")
        cap_l.next_to(ml, DOWN, buff=0.22)
        cap_r.next_to(mr, DOWN, buff=0.22)
        arrow = Arrow(LEFT * 0.95, RIGHT * 0.95, buff=0, color=V.INK, stroke_width=4,
                      max_tip_length_to_length_ratio=0.18).shift(DOWN * 0.2)
        q = T("?", size=60, medium=True).next_to(arrow, UP, buff=0.22)
        self.add(left, right)

        with self.voice("s02_a"):
            self.play(Write(head), run_time=1.3)
        with self.voice("s02_b") as b:
            self.play(left.op.animate.set_value(1), FadeIn(tl, shift=0.1 * DOWN), run_time=1.4)
            b.until(b.word("easy", fallback=0.6) - 0.3)
            self.play(FadeIn(ml), FadeIn(cap_l), run_time=1.0)
        with self.voice("s02_c") as b:
            self.play(right.op.animate.set_value(1), FadeIn(tr, shift=0.1 * DOWN), run_time=1.4)
            b.until(b.word("examples", fallback=0.85) - 0.6)
            self.play(FadeIn(mr), FadeIn(cap_r), run_time=1.0)
        with self.voice("s02_d") as b:
            b.until(b.word("turn", fallback=0.4) - 0.2)
            self.play(GrowArrow(arrow), FadeIn(q, scale=0.6), run_time=1.0)
        head2 = self.header("Idea: let every point flow")
        with self.voice("s02_e", gap=0.2) as b:
            self.play(FadeOut(VGroup(tl, tr, arrow, q, ml, mr, cap_l, cap_r)),
                      right.op.animate.set_value(0), FadeOut(head, shift=0.2 * UP), run_time=1.0)
            b.until(b.word("let", fallback=0.6) - 0.2)
            self.play(mv.animate.set_value(1), FadeIn(head2, shift=0.2 * UP), run_time=1.6)


# ============================================================================
# 3. A velocity field carries noise to data
# ============================================================================
class S03_Flow(Base):
    def construct(self):
        sf = V.load("spiral_flow")
        base = V.load("spiral")["base"]
        traj = sf["traj"] * S + PC[:2]
        dest = V.gradient(V.SUNSET, sf["dest_s"])
        tt, keep = ValueTracker(0.0), ValueTracker(0.0)
        sign = [1.0]

        def fn():
            t = tt.get_value()
            k = max(V.smooth(t), keep.get_value())
            return streak(traj, t, BLUE * (1 - k) + dest * k, sign=sign[0])

        cloud = self.particles(fn, op=1.0, center=PC, width=7.8, height=7.9, core=0.0105,
                               glow=0.07, core_gain=0.9, glow_gain=0.2)
        head = self.header("Idea: let every point flow")
        self.add(cloud, head)

        eq = MC(r"\frac{d x_t}{dt}", "=", (r"v(x_t,\, t)", V.MODEL), size=62)
        column(eq, top=2.3)
        slider = slider_at(tt, 0.1)

        G = V.grid_points(PC, 3.15, 3.15, 0.5, radius=3.3)
        arrows = V.FieldArrows(G, max_len=0.38, ref=1.3)
        aop = ValueTracker(0.0)
        arrows.add_updater(lambda a: a.set_vectors(
            V.u_exact_np((a.anchors - PC[:2]) / S, tt.get_value(), base) * S, master=aop.get_value()))
        arrows.update()

        # a few tracer particles with trails
        x0 = sf["traj"][0]
        picks = []
        for ang in np.linspace(0, 2 * np.pi, 8, endpoint=False) + 0.3:
            target = 1.55 * np.array([np.cos(ang), np.sin(ang)])
            picks.append(int(np.argmin(((x0 - target) ** 2).sum(1))))
        dots, trails = VGroup(), VGroup()
        for i in picks:
            path = traj[:, i]
            grp = VGroup(Dot(radius=0.13, color=WHITE, fill_opacity=0.18),
                         Dot(radius=0.055, color=WHITE)).move_to([*path[0], 0])

            def upd_dot(m, path=path):
                m.move_to([*V.interp_traj(path[:, None, :], tt.get_value())[0], 0])

            grp.add_updater(upd_dot)
            trail = VMobject(stroke_color=WHITE, stroke_width=2.2, stroke_opacity=0.7)

            def upd_trail(m, path=path):
                t = tt.get_value()
                k = int(t * (len(path) - 1))
                P = np.vstack([path[: k + 1], V.interp_traj(path[:, None, :], t)])
                if len(P) < 2 or np.allclose(P[0], P[-1]):
                    P = np.vstack([P[:1], P[:1] + 1e-3])
                m.set_points_as_corners(np.c_[P, np.zeros(len(P))])

            trail.add_updater(upd_trail)
            dots.add(grp)
            trails.add(trail)
        trails.update()

        with self.voice("s03_a") as b:
            self.play(Write(eq), run_time=1.4)
            self.add(arrows)
            b.until(b.word("arrow", fallback=0.35) - 0.2)
            self.play(aop.animate.set_value(1), run_time=1.5)
        with self.voice("s03_b"):
            self.play(FadeIn(slider), run_time=1.0)
        with self.voice("s03_c", gap=0.2):
            self.add(trails)
            self.play(LaggedStart(*[FadeIn(g, scale=2.5) for g in dots], lag_ratio=0.08),
                      run_time=1.2)
        with self.voice("s03_d", gap=0.3) as b:
            self.play(tt.animate.set_value(1), run_time=max(10, b.d + 0.4), rate_func=linear)
        done = MC(("x_0", V.NOISE), r"\sim p_0", r"\quad\Longrightarrow\quad", ("x_1", V.DATA),
                  r"\sim p_{\mathrm{data}}", size=46)
        column(done, top=-1.1)
        with self.voice("s03_e") as b:
            b.until(b.word("draw", fallback=0.45) - 0.2)
            self.play(FadeIn(done, shift=0.1 * UP), run_time=1.0)

        # run backwards with the destination colours kept: the map is invertible
        for m in (*dots, *trails):
            m.clear_updaters()
        with self.voice("s03_f", gap=0.2) as b:
            self.play(FadeOut(dots), FadeOut(trails), FadeOut(done), aop.animate.set_value(0),
                      keep.animate.set_value(1), run_time=1.0)
            sign[0] = -1.0
            self.play(tt.animate.set_value(0), run_time=max(4.0, b.left(b.d + 0.6)),
                      rate_func=smooth)
        with self.voice("s03_g") as b:
            sign[0] = 1.0
            b.until(b.word("lands", fallback=0.3) - 0.4)
            self.play(tt.animate.set_value(1), run_time=max(4.5, b.left(0.85 * b.d)),
                      rate_func=smooth)
        q = T(r"Which velocity field?\\And how do we learn it?", size=46, medium=True)
        column(q, top=0.55)
        with self.voice("s03_h", gap=0.8):
            self.play(FadeOut(VGroup(eq, slider)), run_time=0.8)
            self.play(FadeIn(q, shift=0.1 * UP), run_time=1.0)
        self.fade_everything(1.0)


# ============================================================================
# 4 + 5 share the "many straight lines" setup
# ============================================================================
N_PAIRS = 240
T_STAR = 0.5


def pairs():
    rng = np.random.default_rng(11)
    x0 = rng.standard_normal((N_PAIRS, 2))
    x1, s1 = V.sample_spiral(N_PAIRS, rng)
    return x0, x1, s1


def build_web(tt):
    x0, x1, s1 = pairs()
    c1 = V.gradient(V.SUNSET, s1)
    lines = VGroup()
    for a, b, c in zip(x0, x1, c1):
        ln = Line([*(a * S + PC[:2]), 0], [*(b * S + PC[:2]), 0], stroke_width=1.3)
        ln.set_stroke(color=[V.NOISE, ManimColor.from_rgb(c)], opacity=0.28)
        lines.add(ln)

    def fn():
        t = tt.get_value()
        P = ((1 - t) * x0 + t * x1) * S + PC[:2]
        k = V.smooth(t)
        return P, BLUE * (1 - k) + c1 * k, None

    return lines, fn


def reference_cloud(scene, op):
    rng = np.random.default_rng(5)
    noise = rng.standard_normal((5000, 2))
    data, sd = V.sample_spiral(5000, rng)
    cols = np.concatenate([np.broadcast_to(BLUE, (5000, 3)), V.gradient(V.SUNSET, sd)])
    pts = np.concatenate([noise, data]) * S + PC[:2]
    return scene.particles(lambda: (pts, cols, None), op=op, center=PC, width=7.8, height=7.9,
                           core=0.0095, glow=0.07, core_gain=0.55, glow_gain=0.1)


def web_dots(scene, fn, op):
    return scene.particles(fn, op=op, center=PC, width=7.8, height=7.9, core=0.02, glow=0.06,
                           core_gain=1.0, glow_gain=2.5)


def loss_box():
    loss = eq_loss()
    loss.align_to([COL_L, 0, 0], LEFT).set_y(2.3)
    box = SurroundingRectangle(loss, buff=0.2, color=V.FAINT, corner_radius=0.12)
    return guard(VGroup(loss, box), what="loss box")


class S04_Lines(Base):
    def construct(self):
        ref = reference_cloud(self, 0.0)
        head = self.header("The trick: straight lines")
        lab_n = T("noise", size=SMALL, color=V.NOISE).move_to(PC + np.array([-2.6, 2.45, 0]))
        lab_d = T("data", size=SMALL, color=V.DATA).move_to(PC + np.array([2.35, 2.45, 0]))
        self.add(ref)
        with self.voice("s04_a"):
            self.play(Write(head), ref.op.animate.set_value(0.55), run_time=1.4)
            self.play(FadeIn(lab_n), FadeIn(lab_d), run_time=0.8)

        # --- one pair -----------------------------------------------------------
        base, _, _ = V.spiral_base()
        a = np.array([-1.65, -1.3])
        b_ = base[np.argmin(((base - np.array([1.95, 1.45])) ** 2).sum(1))]
        A, B = a * S + PC[:2], b_ * S + PC[:2]
        tt = ValueTracker(0.0)
        dA = Dot([*A, 0], radius=0.075, color=V.NOISE)
        dB = Dot([*B, 0], radius=0.075, color=V.DATA)
        lA = M("x_0", size=44, color=V.NOISE).next_to(dA, DL, buff=0.08)
        lB = M("x_1", size=44, color=V.DATA).next_to(dB, UR, buff=0.08)
        seg = DashedLine([*A, 0], [*B, 0], dash_length=0.08, stroke_width=2.5, color=V.INK)
        seg.set_opacity(0.75)
        e1, e2 = eq_xt(), eq_vel()
        column(e1, e2, buff=0.55, top=1.95)
        slider = slider_at(tt, -1.45)

        with self.voice("s04_b") as b:
            b.until(b.word("noise", fallback=0.3) - 0.2)
            self.play(FadeIn(dA, scale=2), FadeIn(lA), run_time=0.7)
            b.until(b.word("data", fallback=0.7) - 0.2)
            self.play(FadeIn(dB, scale=2), FadeIn(lB), run_time=0.7)
        with self.voice("s04_c") as b:
            self.play(Create(seg), run_time=min(1.4, b.d))

        vec = (b_ - a) * S * 0.36
        mover = VGroup(Dot(radius=0.16, color=WHITE, fill_opacity=0.2), Dot(radius=0.07, color=WHITE),
                       M("x_t", size=42), V.Arr(A, vec, width=0.03, head=0.16, color=V.VEL))
        arr_on = ValueTracker(0.0)

        def upd_mover(m):
            t = tt.get_value()
            p = (1 - t) * A + t * B
            m[0].move_to([*p, 0])
            m[1].move_to([*p, 0])
            m[2].next_to(m[1], DR, buff=0.02)
            m[3].put(p, vec).set_fill(opacity=arr_on.get_value())

        upd_mover(mover)
        with self.voice("s04_d") as b:
            self.play(Write(e1), FadeIn(slider), run_time=1.6)
            self.play(FadeIn(mover, scale=1.5), run_time=0.6)
            mover.add_updater(upd_mover)
            b.until(b.word("zero", nth=2, fallback=0.55))
            self.play(tt.animate.set_value(1), run_time=b.left(b.d - 0.2, 1.8), rate_func=smooth)
        with self.voice("s04_e") as b:
            self.play(Write(e2), arr_on.animate.set_value(1), run_time=1.3)
            self.play(tt.animate.set_value(0), run_time=b.left(0.62 * b.d, 1.4), rate_func=smooth)
            self.play(tt.animate.set_value(1), run_time=b.left(b.d, 1.4), rate_func=smooth)

        # --- many pairs ---------------------------------------------------------
        mover.clear_updaters()
        lines, fn = build_web(tt)
        dots = web_dots(self, fn, 0.0)
        with self.voice("s04_f") as b:
            self.play(FadeOut(VGroup(mover, dA, dB, lA, lB, seg, e2, lab_n, lab_d)),
                      ref.op.animate.set_value(0.22), run_time=1.0)
            tt.set_value(0.0)
            self.play(LaggedStart(*[Create(ln) for ln in lines], lag_ratio=0.01),
                      run_time=b.left(b.d + 0.4, 1.8))
            self.add(dots)
            self.play(dots.op.animate.set_value(1), run_time=0.6)
        pt = M("p_t", size=48).move_to(PC + np.array([2.55, 2.3, 0]))
        with self.voice("s04_g") as b:
            self.play(tt.animate.set_value(1), run_time=max(5.0, b.left(0.8 * b.d)),
                      rate_func=smooth)
            b.until(b.word("distributions", fallback=0.85))
            self.play(FadeIn(pt, scale=0.8), run_time=0.8)

        # --- the training objective ---------------------------------------------
        lg = loss_box()
        lg.generate_target()
        lg.set_y(0.3)
        with self.voice("s04_h", gap=0.3) as b:
            self.play(FadeOut(VGroup(e1, slider, pt)), run_time=0.8)
            b.until(b.word("ask", fallback=0.4) - 0.3)
            self.play(Write(lg[0]), run_time=2.0)
            self.play(Create(lg[1]), run_time=0.8)
        # hand-off state for the next scene
        self.play(MoveToTarget(lg), tt.animate.set_value(T_STAR), run_time=2.0)
        self.wait(0.3)


# ============================================================================
# 5. Why it works: regression averages the lines
# ============================================================================
class S05_Average(Base):
    def construct(self):
        base, _, s_base = V.spiral_base()
        tt = ValueTracker(T_STAR)
        lines, fn = build_web(tt)
        ref = reference_cloud(self, 0.22)
        dots = web_dots(self, fn, 1.0)
        lg = loss_box()
        head = self.header("The trick: straight lines")
        self.add(ref, lines, dots, head, lg)
        self.wait(0.3)
        with self.voice("s05_a") as b:
            head = self.swap_header(head, "But the lines cross")
            self.play(lines.animate.set_stroke(opacity=0.55), run_time=b.left(0.6 * b.d, 0.8))
            self.play(lines.animate.set_stroke(opacity=0.28), run_time=0.8)

        # the point x* at time t*
        xs = np.array([0.55, 0.42])
        XS = xs * S + PC[:2]
        s2 = (1 - T_STAR) ** 2 + (T_STAR * V.SPIRAL_SD) ** 2
        lw = -((xs[None, :] - T_STAR * base) ** 2).sum(1) / (2 * s2)
        w = np.exp(lw - lw.max())
        w /= w.sum()
        # stratified draw from the posterior over data points given x_t = x*
        order = np.argsort(np.arctan2(*(base - xs).T[::-1]))
        cdf = np.cumsum(w[order])
        K = 18
        idx = order[np.searchsorted(cdf, (np.arange(K) + 0.5) / K)]
        y = base[idx]
        a0 = (xs - T_STAR * y) / (1 - T_STAR)
        vel = y - a0                                     # x1 - x0 for each line
        v_star = V.u_exact_np(xs[None, :], T_STAR, base)[0]

        ring = Circle(radius=0.2, color=V.INK, stroke_width=2.5).move_to([*XS, 0])
        with self.voice("s05_b"):
            self.play(Create(ring), lines.animate.set_stroke(opacity=0.12),
                      dots.op.animate.set_value(0.45), run_time=1.2)

        hi = VGroup()
        cols = V.gradient(V.SUNSET, s_base[idx])
        for p, q, c in zip(a0, y, cols):
            ln = Line([*(p * S + PC[:2]), 0], [*(q * S + PC[:2]), 0], stroke_width=2.2)
            ln.set_stroke(color=[V.NOISE, ManimColor.from_rgb(c)], opacity=0.85)
            hi.add(ln)
        sc = 0.42 * S
        arrs = [V.Arr(XS, v * sc, width=0.024, head=0.13, color=V.VEL, opacity=0.95) for v in vel]
        with self.voice("s05_c") as b:
            self.play(LaggedStart(*[Create(ln) for ln in hi], lag_ratio=0.08),
                      run_time=b.left(b.word("asks", fallback=0.5) - 0.2, 1.4))
            self.play(LaggedStart(*[GrowFromPoint(a_, [*XS, 0]) for a_ in arrs], lag_ratio=0.05),
                      run_time=1.8)
        with self.voice("s05_d"):
            self.play(*[Indicate(a_, color=V.VEL, scale_factor=1.12) for a_ in arrs], run_time=1.2)

        vs = MC((r"v^\star(x, t)", V.MODEL), "=", r"\mathbb{E}\big[", ("x_1", V.DATA), "-",
                ("x_0", V.NOISE), r"\;\big|\;", r"x_t = x", r"\big]", size=42)
        column(vs, top=1.35)
        with self.voice("s05_e") as b:
            b.until(b.word("average", fallback=0.8) - 1.2)
            self.play(Write(vs), run_time=1.6)
        mean = V.Arr(XS, v_star * sc, width=0.05, head=0.2, color=V.MODEL)
        with self.voice("s05_f") as b:
            self.play(*[Transform(a_, mean.copy().set_fill(opacity=0.9)) for a_ in arrs],
                      hi.animate.set_stroke(opacity=0.35), FadeOut(ring), run_time=2.0)
            self.add(mean)
            self.remove(*arrs)
            self.play(Indicate(mean, color=V.MODEL, scale_factor=1.15), run_time=1.0)

        # every point -> a vector field
        G = V.grid_points(PC, 3.15, 3.15, 0.5, radius=3.3)
        field = V.FieldArrows(G, max_len=0.38, ref=1.3)
        fop = ValueTracker(0.0)
        field.add_updater(lambda a: a.set_vectors(
            V.u_exact_np((a.anchors - PC[:2]) / S, tt.get_value(), base) * S, master=fop.get_value()))
        field.update()
        with self.voice("s05_g") as b:
            head = self.swap_header(head, "Average everywhere: one velocity field")
            self.add(field)
            self.play(fop.animate.set_value(1), FadeOut(hi), FadeOut(mean),
                      lines.animate.set_stroke(opacity=0.05), run_time=2.0)

        # follow it: particles from the exact marginal flow (same p_t as the dots)
        sf = V.load("spiral_flow")
        traj = sf["traj"] * S + PC[:2]
        dest = V.gradient(V.SUNSET, sf["dest_s"])

        def fn_flow():
            t = tt.get_value()
            k = V.smooth(t)
            return streak(traj, t, BLUE * (1 - k) + dest * k)

        flow = self.particles(fn_flow, center=PC, width=7.8, height=7.9, core=0.0105, glow=0.07,
                              core_gain=0.9, glow_gain=0.2)
        self.add(flow)
        self.bring_to_front(field)
        with self.voice("s05_h") as b:
            self.play(flow.op.animate.set_value(1), dots.op.animate.set_value(0),
                      ref.op.animate.set_value(0), FadeOut(lines), run_time=1.5)
            self.play(tt.animate.set_value(1), run_time=max(5.0, b.left(0.9 * b.d)),
                      rate_func=linear)

        thm = MC(r"\nabla_\theta\,\mathcal{L}_{\mathrm{CFM}}", "=", r"\nabla_\theta\,\mathbb{E}\,\big\|",
                 (r"v_\theta(x_t,t)", V.MODEL), "-", (r"v^\star(x_t,t)", V.MODEL), r"\big\|^2",
                 size=32)
        column(thm, top=0.0)
        thm_box = SurroundingRectangle(thm, buff=0.2, color=V.FAINT, corner_radius=0.12)
        cite = T("Lipman et al., 2023", size=26, color=V.MUTED)
        cite.next_to(thm_box, DOWN, buff=0.18).align_to(thm, LEFT)
        guard(thm_box, what="theorem box")
        with self.voice("s05_i", gap=0.8) as b:
            b.until(b.word("gradients", fallback=0.75) - 1.0)
            self.play(Write(thm), Create(thm_box), run_time=1.6)
            self.play(FadeIn(cite), run_time=0.6)
        self.fade_everything(1.0)


# ============================================================================
# 6. One dimension: lines cross, the flow does not
# ============================================================================
PIS = np.array([0.3, 0.44, 0.26])
MUS = np.array([-2.0, 0.45, 2.1])
SDS = np.array([0.3, 0.22, 0.28])


def dens1d(x, t):
    s2 = (1 - t) ** 2 + (t * SDS) ** 2
    return (PIS / np.sqrt(2 * np.pi * s2) * np.exp(-(x[:, None] - t * MUS) ** 2 / (2 * s2))).sum(1)


def vel1d(x, t):
    """Exact E[x1 - x0 | x_t = x] for the 1-D Gaussian mixture."""
    s2 = (1 - t) ** 2 + (t * SDS) ** 2
    c = (t * SDS ** 2 - (1 - t)) / s2
    lw = np.log(PIS) - 0.5 * np.log(s2) - (x[:, None] - t * MUS) ** 2 / (2 * s2)
    w = np.exp(lw - lw.max(1, keepdims=True))
    w /= w.sum(1, keepdims=True)
    return (w * (MUS + c * (x[:, None] - t * MUS))).sum(1)


class S06_OneD(Base):
    def construct(self):
        X0, X1, Y0, KY, XR = -4.3, 4.3, -0.45, 0.8, 3.25

        def pt(t, x):
            return np.array([X0 + (X1 - X0) * t, Y0 + KY * x, 0.0])

        head = self.header("In 1-D: lines cross, the flow does not")

        # density heat map
        ppu = config.pixel_width / config.frame_width
        Wp, Hp = int((X1 - X0) * ppu), int(2 * XR * KY * ppu)
        ts = (np.arange(Wp) + 0.5) / Wp
        xs = XR - (np.arange(Hp) + 0.5) / Hp * 2 * XR
        Dm = np.stack([dens1d(xs, t) for t in ts], 1)  # (Hp, Wp)
        A = np.clip(Dm / Dm.max(), 0, 1) ** 0.6
        ccol = V.gradient(["#3E8EDB", "#8F7BFF", "#F07A8C", "#FFB067"], ts)
        rgb = np.broadcast_to(ccol[None], (Hp, Wp, 3))
        img = np.concatenate([rgb, (0.85 * A)[..., None]], 2)
        heat = ImageMobject((img * 255).astype(np.uint8), scale_to_resolution=config.pixel_height)
        heat.stretch_to_fit_width(X1 - X0).stretch_to_fit_height(2 * XR * KY)
        heat.move_to([(X0 + X1) / 2, Y0, 0])

        frame = VGroup(Line(pt(0, -XR), pt(0, XR)), Line(pt(1, -XR), pt(1, XR)))
        frame.set_stroke(V.MUTED, 1.5, opacity=0.6)
        tl0 = M("t=0", size=36, color=V.NOISE).next_to(pt(0, -XR), DOWN, buff=0.16)
        tl1 = M("t=1", size=36, color=V.DATA).next_to(pt(1, -XR), DOWN, buff=0.16)
        xl = M("x", size=40).next_to(pt(0, XR), UP, buff=0.1)

        xx = np.linspace(-XR, XR, 400)
        wmax = 1.25

        def side(p, x_edge, sgn, color):
            q = p / p.max() * wmax
            P = [np.array([x_edge + sgn * (0.12 + v), Y0 + KY * x, 0]) for x, v in zip(xx, q)]
            curve = VMobject().set_points_smoothly(P).set_stroke(color, 2.5)
            fill = VMobject().set_points_as_corners(
                [np.array([x_edge + sgn * 0.12, Y0 - KY * XR, 0])] + P
                + [np.array([x_edge + sgn * 0.12, Y0 + KY * XR, 0])])
            fill.set_stroke(width=0).set_fill(color, 0.18)
            return VGroup(fill, curve)

        s0 = side(dens1d(xx, 0.0), X0, -1, V.NOISE)
        s1 = side(dens1d(xx, 1.0), X1, +1, V.DATA)
        lp0 = M("p_0", size=42, color=V.NOISE).next_to(s0, UP, buff=0.1)
        lp1 = M(r"p_{\mathrm{data}}", size=42, color=V.DATA).next_to(s1, UP, buff=0.1)

        with self.voice("s06_a"):
            self.play(Write(head), run_time=1.2)
        with self.voice("s06_b") as b:
            self.play(FadeIn(heat), Create(frame), FadeIn(tl0), FadeIn(tl1), FadeIn(xl),
                      run_time=1.5)
            b.until(b.word("gaussian", fallback=0.6) - 0.4)
            self.play(FadeIn(s0), FadeIn(lp0), run_time=1.0)
            b.until(b.word("bumps", fallback=0.85) - 0.8)
            self.play(FadeIn(s1), FadeIn(lp1), run_time=1.0)

        # conditional straight lines (keep both ends inside the plot)
        rng = np.random.default_rng(3)
        n = 26
        a = rng.standard_normal(4 * n)
        a = a[np.abs(a) < 2.6][:n]
        comp = rng.choice(3, size=n, p=PIS)
        b_ = MUS[comp] + SDS[comp] * rng.standard_normal(n)
        lines = VGroup()
        for u, v in zip(a, b_):
            ln = Line(pt(0, u), pt(1, v), stroke_width=2.2)
            ln.set_stroke(color=[V.NOISE, V.DATA], opacity=0.9)
            lines.add(ln)
        with self.voice("s06_c") as b:
            self.play(LaggedStart(*[Create(l_) for l_ in lines], lag_ratio=0.06),
                      run_time=max(2.6, b.left(0.9 * b.d)))

        # the marginal flow, integrated with RK4
        m = 26
        from scipy.stats import norm
        x = norm.ppf((np.arange(m) + 0.5) / m)
        K = 400
        path = [x.copy()]
        for k in range(K):
            t, dt = k / K, 1 / K
            k1 = vel1d(x, t)
            k2 = vel1d(x + dt / 2 * k1, t + dt / 2)
            k3 = vel1d(x + dt / 2 * k2, t + dt / 2)
            k4 = vel1d(x + dt * k3, t + dt)
            x = x + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
            path.append(x.copy())
        path = np.array(path)
        tgrid = np.linspace(0, 1, K + 1)
        flows = VGroup()
        for j in range(m):
            P = [pt(t, xv) for t, xv in zip(tgrid[::4], path[::4, j])]
            flows.add(VMobject().set_points_smoothly(P).set_stroke(V.MODEL, 2.6, opacity=0.95))
        with self.voice("s06_d") as b:
            self.play(lines.animate.set_stroke(opacity=0.18), run_time=1.0)
            self.play(LaggedStart(*[Create(f) for f in flows], lag_ratio=0.03),
                      run_time=max(3.2, b.left(b.d)))
        with self.voice("s06_e") as b:
            self.play(flows.animate.set_stroke(width=3.6), run_time=0.8)
            self.play(flows.animate.set_stroke(width=2.6), run_time=0.8)

        # both transport the same density: scan in time
        tt = ValueTracker(0.0)
        scan = always_redraw(lambda: Line(pt(tt.get_value(), -XR), pt(tt.get_value(), XR),
                                          stroke_width=2, color=V.INK).set_opacity(0.6))
        fdots = always_redraw(lambda: VGroup(*[
            Dot(pt(tt.get_value(), float(np.interp(tt.get_value(), tgrid, path[:, j]))),
                radius=0.05, color=V.MODEL) for j in range(m)]))
        ldots = always_redraw(lambda: VGroup(*[
            Dot(pt(tt.get_value(), (1 - tt.get_value()) * u + tt.get_value() * v), radius=0.045,
                color=interpolate_color(ManimColor(V.NOISE), ManimColor(V.DATA), tt.get_value()))
            for u, v in zip(a, b_)]))
        with self.voice("s06_f", gap=0.8) as b:
            self.play(lines.animate.set_stroke(opacity=0.4), FadeIn(scan), FadeIn(fdots),
                      FadeIn(ldots), run_time=0.8)
            self.play(tt.animate.set_value(1), run_time=max(6.0, b.left(b.d)), rate_func=linear)
        self.fade_everything(1.0)


# ============================================================================
# 7. Training is just regression
# ============================================================================
C_KW, C_NUM, C_COM, C_TXT = "#C792EA", "#F78C6C", "#5D6882", "#C3CAD9"


def _c(color, s):
    return f'<span fgcolor="{color}">{s}</span>'


X1_, X0_, V_ = _c(V.DATA, "x1"), _c(V.NOISE, "x0"), _c(V.MODEL, "v")


def _commented(code, comment, col=34):
    """Pad marked-up code so that comments line up in column ``col``."""
    plain = re.sub(r"<[^>]+>", "", code)
    return code + " " * (col - len(plain)) + _c(C_COM, "# " + comment)


CODE = [
    f'{_c(C_KW, "for")} step {_c(C_KW, "in")} range({_c(C_NUM, "20_000")}):',
    _commented(f'    {X1_} = sample_data()', "data"),
    _commented(f'    {X0_} = torch.randn_like({X1_})', "noise"),
    _commented(f'    t  = torch.rand(len({X1_}), {_c(C_NUM, "1")})', "time"),
    _commented(f'    xt = ({_c(C_NUM, "1")} - t) * {X0_} + t * {X1_}', "on the line"),
    f'    loss = (({V_}(xt, t) - ({X1_} - {X0_}))**{_c(C_NUM, "2")}).mean()',
    '    opt.zero_grad()',
    '    loss.backward(); opt.step()',
]


def code_block(size):
    """One MarkupText for correct spacing, regrouped into per-line VGroups."""
    txt = MarkupText("\n".join(CODE), font=V.MONO, font_size=size, color=C_TXT, line_spacing=1.15)
    counts = [len(re.sub(r"\s", "", re.sub(r"<[^>]+>", "", ln))) for ln in CODE]
    glyphs = list(txt.submobjects)
    assert sum(counts) == len(glyphs), (sum(counts), len(glyphs))
    lines, i = VGroup(), 0
    for c in counts:
        lines.add(VGroup(*glyphs[i:i + c]))
        i += c
    return txt, lines


class S07_Train(Base):
    def construct(self):
        head = self.header("Training is just regression")
        txt, lines = code_block(24)
        txt.scale_to_fit_width(7.6).move_to([-2.85, 0.1, 0])
        panel = RoundedRectangle(width=txt.width + 0.7, height=txt.height + 0.7, corner_radius=0.18)
        panel.set_stroke(V.FAINT, 1.5).set_fill("#0E1320", 0.85).move_to(txt)
        guard(panel, what="code panel")

        with self.voice("s07_a") as b:
            self.play(Write(head), run_time=1.2)
            self.play(FadeIn(panel), run_time=0.6)
            b.until(b.word("loop", fallback=0.8) - 0.3)
            self.play(FadeIn(lines[0], shift=0.1 * RIGHT), run_time=0.5)
        with self.voice("s07_b") as b:
            for i, (w, f) in zip((1, 2, 3, 4), (("data", 0.1), ("noise", 0.3),
                                                 ("times", 0.55), ("mix", 0.75))):
                b.until(b.word(w, fallback=f) - 0.25)
                self.play(FadeIn(lines[i], shift=0.1 * RIGHT), run_time=0.5)
        with self.voice("s07_c") as b:
            b.until(b.word("predict", fallback=0.2) - 0.2)
            self.play(FadeIn(lines[5], shift=0.1 * RIGHT), run_time=0.5)
            b.until(b.word("gradient", fallback=0.6) - 0.2)
            self.play(FadeIn(lines[6:], shift=0.1 * RIGHT), run_time=0.6)

        # samples from the network as training proceeds
        tr = V.load("training")
        steps, samples = tr["ckpt_steps"].astype(float), tr["ckpt_samples"]
        base, _, s_base = V.spiral_base()
        cols = V.gradient(V.SUNSET, nearest_s(samples[-1], base, s_base))
        pc = np.array([4.5, 0.1])
        sc = 0.52
        st = ValueTracker(0.0)
        lsteps = np.log1p(steps)

        def fn():
            u = np.log1p(st.get_value())
            i = int(np.clip(np.searchsorted(lsteps, u) - 1, 0, len(steps) - 2))
            f = np.clip((u - lsteps[i]) / (lsteps[i + 1] - lsteps[i]), 0, 1)
            f = f * f * (3 - 2 * f)
            P = samples[i] * (1 - f) + samples[i + 1] * f
            return P * sc + pc, cols, None

        cloud = self.particles(fn, center=[*pc, 0], width=4.2, height=4.2, core=0.0105,
                               glow=0.06, core_gain=1.0, glow_gain=0.35)
        ptitle = TX("Samples from ", (r"$v_\theta$", V.MODEL), size=SMALL, color=V.MUTED)
        ptitle.move_to([pc[0], 2.35, 0])
        counter = Integer(0, group_with_commas=True, font_size=40, color=V.INK, mob_class=Tex)
        clab = T("training step", size=SMALL, color=V.MUTED)
        cg = VGroup(clab, counter).arrange(RIGHT, buff=0.25).move_to([pc[0] - 0.25, -2.1, 0])
        counter.add_updater(lambda m: m.set_value(int(round(st.get_value()))))
        n_max = float(steps[-1])
        self.add(cloud)
        with self.voice("s07_d") as b:
            self.play(FadeIn(ptitle), FadeIn(cg), cloud.op.animate.set_value(1), run_time=1.0)
            self.play(st.animate.set_value(n_max), run_time=max(9.0, b.left(0.95 * b.d)),
                      rate_func=lambda x: np.expm1(x * np.log1p(n_max)) / n_max)
        with self.voice("s07_e", gap=0.9):
            self.play(Indicate(lines[5], color=V.INK, scale_factor=1.04), run_time=1.4)
        self.fade_everything(1.0)


# ============================================================================
# 8. Sampling: integrate the learned field
# ============================================================================
class S08_Sample(Base):
    def construct(self):
        lf = V.load("learned_flow")
        W = V.load("model")
        base, _, s_base = V.spiral_base()
        traj = lf["traj"] * S + PC[:2]
        dest = V.gradient(V.SUNSET, nearest_s(lf["traj"][-1], base, s_base))
        tt = ValueTracker(0.0)

        def fn():
            t = tt.get_value()
            k = V.smooth(t)
            return streak(traj, t, BLUE * (1 - k) + dest * k)

        cloud = self.particles(fn, center=PC, width=7.8, height=7.9, core=0.0105, glow=0.07,
                               core_gain=0.9, glow_gain=0.2)
        head = self.header("Sampling: follow the learned field")
        G = V.grid_points(PC, 3.15, 3.15, 0.5, radius=3.3)
        field = V.FieldArrows(G, max_len=0.38, ref=1.3)
        fop = ValueTracker(0.0)
        field.add_updater(lambda a: a.set_vectors(
            V.mlp_forward(W, (a.anchors - PC[:2]) / S, tt.get_value()) * S, master=fop.get_value()))
        field.update()
        e1 = MC(r"x_{t+\Delta t}", "=", "x_t", "+", r"\Delta t\;", (r"v_\theta(x_t,\, t)", V.MODEL),
                size=46)
        column(e1, top=2.1)
        slider = slider_at(tt, 0.2)

        self.add(cloud, field)
        with self.voice("s08_a") as b:
            self.play(Write(head), cloud.op.animate.set_value(1), run_time=1.4)
            b.until(b.word("arrows", fallback=0.8) - 0.6)
            self.play(fop.animate.set_value(1), run_time=1.2)
        with self.voice("s08_b"):
            self.play(Write(e1), FadeIn(slider), run_time=1.4)
        with self.voice("s08_c", gap=0.9) as b:
            self.play(tt.animate.set_value(1), run_time=max(7.0, b.left(b.d)), rate_func=linear)
        self.fade_everything(1.0)

        # how many steps?
        head2 = self.header("How many steps?")
        xs_ = np.linspace(-5.4, 5.4, len(V.EULER_STEPS))
        sc = 0.45
        sets = [lf[f"n{k}"] for k in V.EULER_STEPS]
        colsm = V.gradient(V.SUNSET, nearest_s(sets[-1], base, s_base))
        shown = ValueTracker(0.0)

        def fn2():
            P, C, Wt = [], [], []
            for j, (x, Q) in enumerate(zip(xs_, sets)):
                a_ = np.clip(shown.get_value() - j, 0, 1)
                if a_ <= 0:
                    continue
                P.append(Q * sc + np.array([x, -0.05]))
                C.append(colsm)
                Wt.append(np.full(len(Q), a_, np.float32))
            if not P:
                return np.zeros((0, 2)), np.zeros((0, 3)), None
            return np.concatenate(P), np.concatenate(C), np.concatenate(Wt)

        multi = self.particles(fn2, op=1.0, center=[0, -0.05, 0], width=14.2, height=3.9,
                               core=0.0085, glow=0.05, core_gain=0.9, glow_gain=0.1)
        labels = VGroup(*[
            T(f"{k} step" + ("" if k == 1 else "s"), size=BODY, align="center").move_to([x, 2.15, 0])
            for x, k in zip(xs_, V.EULER_STEPS)])
        self.add(multi)

        def reveal(j):
            self.play(FadeIn(labels[j]), shown.animate.set_value(j + 1), run_time=0.9)

        with self.voice("s08_d"):
            self.play(Write(head2), run_time=1.0)
        with self.voice("s08_e1", gap=0.3) as b:
            b.until(b.word("single", fallback=0.1) - 0.2)
            reveal(0)
        with self.voice("s08_e2", gap=0.3):
            reveal(1)
        with self.voice("s08_e3", gap=0.3) as b:
            b.until(b.word("four", fallback=0.2) - 0.2)
            reveal(2)
        with self.voice("s08_e4") as b:
            b.until(b.word("eight", fallback=0.3) - 0.2)
            reveal(3)
            b.until(b.word("thirty two", fallback=0.55) - 0.2)
            reveal(4)
        with self.voice("s08_f", gap=0.9):
            pass
        self.fade_everything(1.0)


# ============================================================================
# 9. Recap and credits
# ============================================================================
class S09_Recap(Base):
    def construct(self):
        head = self.header("Flow matching in three lines")
        items = [
            ("s09_b", "Interpolate", eq_xt(50)),
            ("s09_c", "Regress", MC((r"v_\theta(x_t,\, t)", V.MODEL), r"\;\approx\;", ("x_1", V.DATA),
                                    "-", ("x_0", V.NOISE), size=50)),
            ("s09_d", "Integrate", MC(r"\frac{dx}{dt}", "=", (r"v_\theta(x,\, t)", V.MODEL), size=50)),
        ]
        rows = VGroup()
        for i, (_, name, eq) in enumerate(items):
            num = T(str(i + 1), size=34, color=V.BG, medium=True)
            badge = VGroup(Circle(radius=0.28, fill_color=V.INK, fill_opacity=1, stroke_width=0), num)
            nm = T(name, size=46, medium=True)
            badge.move_to([0, 0, 0])
            nm.next_to(badge, RIGHT, buff=0.4)
            eq.move_to(ORIGIN).align_to([4.1, 0, 0], LEFT)
            rows.add(VGroup(badge, nm, eq).shift(UP * (1.45 - 1.45 * i)))
        rows.move_to([0, -0.1, 0])
        guard(rows, what="recap")

        with self.voice("s09_a"):
            self.play(Write(head), run_time=1.2)
        for (key, _, _), row in zip(items, rows):
            with self.voice(key, gap=0.3):
                self.play(FadeIn(row[0], scale=0.6), FadeIn(row[1], shift=0.1 * RIGHT), run_time=0.6)
                self.play(Write(row[2]), run_time=1.2)
        with self.voice("s09_e", gap=0.8):
            self.play(*[Indicate(r[2], color=V.INK, scale_factor=1.05) for r in rows], run_time=1.5)
        self.fade_everything(1.0)

        # closing card: the title once more
        cloud, tt = title_cloud(self)
        self.add(cloud)
        self.play(cloud.op.animate.set_value(1), run_time=0.8)
        self.play(tt.animate.set_value(1), run_time=4.0, rate_func=smooth)
        refs = VGroup(*[T(s, size=22, color=V.MUTED, align="center") for s in (
            r"Lipman, Chen, Ben-Hamu, Nickel, Le. \textit{Flow Matching for Generative Modeling.} ICLR 2023",
            r"Liu, Gong, Liu. \textit{Flow Straight and Fast: Learning to Generate and Transfer Data with Rectified Flow.} ICLR 2023",
            r"Albergo, Vanden-Eijnden. \textit{Building Normalizing Flows with Stochastic Interpolants.} ICLR 2023",
        )]).arrange(DOWN, buff=0.16).move_to([0, -2.5, 0])
        guard(refs, what="refs")
        with self.voice("s09_f", gap=3.5):
            self.play(FadeIn(refs, shift=0.1 * UP), run_time=1.2)
        self.fade_everything(1.5)
        self.wait(0.5)
