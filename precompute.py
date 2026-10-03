"""Precompute every numerical ingredient of the video.

All flows use the linear (rectified / OT) interpolation path
    x_t = (1 - t) x0 + t x1,   x0 ~ N(0, I),   x1 ~ p_data,
with t = 0 at noise and t = 1 at data.

For a data distribution that is a mixture of isotropic Gaussians
    p_data = (1/M) sum_i N(y_i, sd^2 I)
the marginal flow matching velocity u_t(x) = E[x1 - x0 | x_t = x] is exact:
    s_t^2 = (1-t)^2 + t^2 sd^2
    c_t   = (t sd^2 - (1-t)) / s_t^2
    w_i   = softmax_i( -|x - t y_i|^2 / (2 s_t^2) )
    u_t(x) = c_t x + (1 - c_t t) sum_i w_i y_i
so the "ideal" flows in the video are computed exactly, not approximated.

A small MLP is also trained with the plain conditional flow matching loss, and
its checkpoints drive the training and sampling sections.

Outputs go to data/*.npz.
"""

from __future__ import annotations

import math
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

import fmviz as V

OUT = Path(__file__).parent / "data"
OUT.mkdir(exist_ok=True)
torch.set_num_threads(8)


# ----------------------------------------------------------------------------
# Exact marginal velocity + RK4 integration
# ----------------------------------------------------------------------------
def u_exact(x: torch.Tensor, t: float, Y: torch.Tensor, sd: float, chunk=2048):
    s2 = (1 - t) ** 2 + (t * sd) ** 2
    c = (t * sd * sd - (1 - t)) / s2
    out = torch.empty_like(x)
    tY = t * Y
    for a in range(0, len(x), chunk):
        xb = x[a : a + chunk]
        d2 = ((xb[:, None, :] - tY[None, :, :]) ** 2).sum(-1)
        w = torch.softmax(-d2 / (2 * s2), dim=1)
        ybar = w @ Y
        out[a : a + chunk] = c * xb + (1 - c * t) * ybar
    return out


DEV = "mps" if torch.backends.mps.is_available() else "cpu"


def integrate_exact(x0: np.ndarray, Y: np.ndarray, sd: float, steps: int):
    x = torch.tensor(x0, dtype=torch.float32, device=DEV)
    Yt = torch.tensor(Y, dtype=torch.float32, device=DEV)
    traj = [x0.astype(np.float32).copy()]
    dt = 1.0 / steps
    for k in range(steps):
        t = k * dt
        k1 = u_exact(x, t, Yt, sd)
        k2 = u_exact(x + 0.5 * dt * k1, t + 0.5 * dt, Yt, sd)
        k3 = u_exact(x + 0.5 * dt * k2, t + 0.5 * dt, Yt, sd)
        k4 = u_exact(x + dt * k3, t + dt, Yt, sd)
        x = x + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        traj.append(x.cpu().numpy().astype(np.float32).copy())
    return np.stack(traj)  # (steps+1, N, 2)


# ----------------------------------------------------------------------------
# Title text -> point cloud (rendered by manim itself so it lines up exactly)
# ----------------------------------------------------------------------------
def title_points(n: int, rng: np.random.Generator) -> np.ndarray:
    from manim import Camera, config

    config.pixel_width, config.pixel_height = 3840, 2160
    cam = Camera()
    cam.capture_mobject(V.title_text())
    arr = cam.pixel_array.astype(np.float32)  # (H, W, 4)
    lum = arr[..., :3].max(-1) / 255.0
    ys, xs = np.nonzero(lum > 0.5)
    idx = rng.choice(len(xs), size=n, replace=len(xs) < n)
    px = xs[idx] + rng.random(n)
    py = ys[idx] + rng.random(n)
    ppu = config.pixel_width / config.frame_width
    X = px / ppu - config.frame_width / 2
    Yc = config.frame_height / 2 - py / ppu
    return np.stack([X, Yc], 1).astype(np.float64)


# ----------------------------------------------------------------------------
# The network
# ----------------------------------------------------------------------------
class MLP(nn.Module):
    def __init__(self, hidden=256, n_freq=V.N_FREQ):
        super().__init__()
        self.register_buffer("freqs", torch.tensor(V.time_freqs(n_freq), dtype=torch.float32))
        d_in = 2 + 1 + 2 * n_freq
        self.net = nn.Sequential(
            nn.Linear(d_in, hidden), nn.SiLU(),
            nn.Linear(hidden, hidden), nn.SiLU(),
            nn.Linear(hidden, hidden), nn.SiLU(),
            nn.Linear(hidden, 2),
        )

    def forward(self, x, t):
        tf = t * self.freqs[None, :]
        z = torch.cat([x, t, torch.sin(tf), torch.cos(tf)], dim=1)
        return self.net(z)

    def weights(self):
        lins = [m for m in self.net if isinstance(m, nn.Linear)]
        return {
            **{f"W{i}": l.weight.detach().numpy().T.copy() for i, l in enumerate(lins)},
            **{f"b{i}": l.bias.detach().numpy().copy() for i, l in enumerate(lins)},
        }


@torch.no_grad()
def euler_sample(model, x0: torch.Tensor, steps: int, keep=False):
    x = x0.clone()
    traj = [x.numpy().copy()]
    for k in range(steps):
        t = torch.full((len(x), 1), k / steps)
        x = x + (1.0 / steps) * model(x, t)
        if keep:
            traj.append(x.numpy().copy())
    return np.stack(traj) if keep else x.numpy()


def main():
    rng = np.random.default_rng(7)
    t0 = time.time()

    # --- spiral dataset (data units) ---------------------------------------
    base, arm, s = V.spiral_base(V.SPIRAL_M)
    sd = V.SPIRAL_SD
    np.savez(OUT / "spiral.npz", base=base, arm=arm, s=s, sd=sd)

    # --- exact flow of the spiral ------------------------------------------
    N = 9000
    x0 = rng.standard_normal((N, 2))
    traj = integrate_exact(x0, base, sd, steps=300)
    # destination parameter of each particle: nearest base point
    fin = traj[-1]
    d2 = ((fin[:, None, :] - base[None, :, :]) ** 2).sum(-1)
    j = d2.argmin(1)
    np.savez(OUT / "spiral_flow.npz", traj=traj, dest_s=s[j], dest_arm=arm[j])
    print(f"spiral flow done {time.time() - t0:.1f}s")

    # --- exact flow into the title -----------------------------------------
    Tn = 9000
    tgt = title_points(Tn, rng) / V.TITLE_NOISE_SCALE  # units where the noise is N(0, I)
    xT0 = rng.standard_normal((Tn, 2))
    trajT = integrate_exact(xT0, tgt, V.TITLE_SD, steps=300)
    np.savez(OUT / "title_flow.npz", traj=trajT)
    print(f"title flow done {time.time() - t0:.1f}s")

    # --- train a flow matching network ---------------------------------------
    torch.manual_seed(0)
    model = MLP()
    steps, batch = 20000, 4096
    opt = torch.optim.Adam(model.parameters(), lr=2e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=steps, eta_min=2e-5)
    base_t = torch.tensor(base, dtype=torch.float32)
    ckpts = [0, 25, 60, 120, 200, 350, 600, 1000, 1600, 2500, 4000, 6500, 10000, 14000, 20000]
    xs0 = torch.randn(4000, 2, generator=torch.Generator().manual_seed(1))
    ck_samples, ck_weights, losses = [], [], []

    def snapshot():
        ck_samples.append(euler_sample(model, xs0, 100))
        ck_weights.append(model.weights())

    snapshot()
    for step in range(1, steps + 1):
        idx = torch.randint(0, len(base_t), (batch,))
        x1 = base_t[idx] + sd * torch.randn(batch, 2)          # data
        x0b = torch.randn_like(x1)                              # noise
        t = torch.rand(batch, 1)                                # time
        xt = (1 - t) * x0b + t * x1                             # point on the line
        loss = ((model(xt, t) - (x1 - x0b)) ** 2).mean()        # regress the velocity
        opt.zero_grad()
        loss.backward()
        opt.step()
        sched.step()
        losses.append(loss.item())
        if step in ckpts:
            snapshot()
        if step % 2000 == 0:
            print(f"step {step} loss {np.mean(losses[-500:]):.4f}  {time.time() - t0:.1f}s")

    np.savez(
        OUT / "training.npz",
        ckpt_steps=np.array(ckpts),
        ckpt_samples=np.stack(ck_samples).astype(np.float32),
        loss=np.array(losses, dtype=np.float32),
    )
    np.savez(OUT / "model.npz", **ck_weights[-1])

    # --- sampling with the trained network -----------------------------------
    xs = torch.randn(9000, 2, generator=torch.Generator().manual_seed(2))
    trajL = euler_sample(model, xs, 300, keep=True).astype(np.float32)
    xm = torch.randn(3500, 2, generator=torch.Generator().manual_seed(3))
    multi = {f"n{k}": euler_sample(model, xm, k).astype(np.float32) for k in V.EULER_STEPS}
    np.savez(OUT / "learned_flow.npz", traj=trajL, **multi)
    print(f"all done {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
