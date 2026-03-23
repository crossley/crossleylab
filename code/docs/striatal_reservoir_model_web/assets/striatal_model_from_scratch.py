"""
From-scratch teaching implementation of a biologically-plausible striatal reservoir.

Revised tutorial alignment:
- Stimulus/category trial streams are defined before encoding.
- Cortex uses a conceptual full 100x100 2D grid mode.
- Practical defaults run in a smaller grid/trial regime for speed.
- Reservoir competition, fixed readout, and W_cx learning are unchanged in logic.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import matplotlib.pyplot as plt
import numpy as np


@dataclass
class Params:
    # Step 1 style: practical defaults for classroom runtime.
    n_msn: int = 200
    n_acq: int = 300
    n_rev: int = 300
    n_sim: int = 12

    stim_lo: float = 0.0
    stim_hi: float = 100.0
    n_stim_per_cat: int = 250

    # Conceptual full cortex mode is 100x100; default uses a lighter grid.
    cortex_side_full: int = 100
    cortex_side_fast: int = 35
    use_full_cortex: bool = False

    sigma_noise: float = 0.05
    sigma_tuning: float = 10.0
    lambda_lat: float = 0.2
    k_frac: float = 0.05

    eta: float = 0.10
    decay_rate: float = 0.002
    w_init_scale: float = 0.1
    readout_temp: float = 0.5

    encoder_seed: int = 42
    trial_seed: int = 99

    window: int = 30


def cortex_side(params: Params) -> int:
    return params.cortex_side_full if params.use_full_cortex else params.cortex_side_fast


def build_cortex_preferred(params: Params) -> np.ndarray:
    side = cortex_side(params)
    axis = np.linspace(params.stim_lo, params.stim_hi, side)
    gx, gy = np.meshgrid(axis, axis)
    return np.column_stack([gx.ravel(), gy.ravel()])


def encode_stimulus(stimulus: np.ndarray, preferred: np.ndarray, sigma_tuning: float) -> np.ndarray:
    diff = preferred - stimulus
    sq_dist = np.sum(diff * diff, axis=1)
    x_c = np.exp(-0.5 * sq_dist / (sigma_tuning**2))
    norm = np.linalg.norm(x_c)
    return x_c / norm if norm > 0 else x_c


def make_lat_inhibition(n_msn: int, lambda_lat: float, seed: int) -> np.ndarray:
    if n_msn % 2 != 0:
        raise ValueError("n_msn must be even")

    rng = np.random.default_rng(seed)
    split = n_msn // 2
    w_lat = np.zeros((n_msn, n_msn), dtype=float)

    sparsity = 0.10
    mask_a = rng.random((split, split)) < sparsity
    np.fill_diagonal(mask_a, False)
    w_lat[:split, :split] = -lambda_lat * mask_a / (sparsity * split)

    n_b = n_msn - split
    mask_b = rng.random((n_b, n_b)) < sparsity
    np.fill_diagonal(mask_b, False)
    w_lat[split:, split:] = -lambda_lat * mask_b / (sparsity * n_b)

    cross_strength = lambda_lat * 5.0
    w_lat[:split, split:] = -cross_strength
    w_lat[split:, :split] = -cross_strength
    return w_lat


def compete(
    x_c: np.ndarray,
    w_cx: np.ndarray,
    w_lat: np.ndarray,
    k: int,
    adaptation: np.ndarray,
    sigma_noise: float,
    rng: np.random.Generator,
) -> np.ndarray:
    drive = w_cx @ x_c + rng.normal(0.0, sigma_noise, size=w_cx.shape[0])
    drive_adapted = drive - adaptation
    drive_inh = drive_adapted + w_lat @ np.clip(drive_adapted, 0.0, None)

    idx = np.argpartition(drive_inh, -k)[-k:]
    x_s = np.zeros(w_cx.shape[0], dtype=float)
    x_s[idx] = 1.0

    adaptation *= 0.7
    adaptation[idx] += 1.0
    return x_s


def sample_bounded_bivariate(
    rng: np.random.Generator,
    mean: np.ndarray,
    cov: np.ndarray,
    n_samples: int,
    lo: float,
    hi: float,
) -> np.ndarray:
    samples = np.empty((n_samples, 2), dtype=float)
    filled = 0
    while filled < n_samples:
        need = n_samples - filled
        batch = rng.multivariate_normal(mean=mean, cov=cov, size=max(16, 2 * need))
        keep = (batch[:, 0] >= lo) & (batch[:, 0] <= hi) & (batch[:, 1] >= lo) & (batch[:, 1] <= hi)
        chosen = batch[keep]
        take = min(need, chosen.shape[0])
        if take > 0:
            samples[filled : filled + take] = chosen[:take]
            filled += take
    return samples


def build_trials(params: Params, reversal_mode: str = "full_swap"):
    # Introduce category geometry before encoder/reservoir steps.
    if reversal_mode not in {"full_swap", "partial_rotate"}:
        raise ValueError("reversal_mode must be full_swap or partial_rotate")

    lo, hi = params.stim_lo, params.stim_hi
    center = np.array([50.0, 50.0], dtype=float)
    perp = np.array([-1.0, 1.0], dtype=float) / np.sqrt(2.0)

    mean_offset = 20.0
    mean_a = center + mean_offset * perp
    mean_b = center - mean_offset * perp

    theta = np.deg2rad(45.0)
    rot = np.array([[np.cos(theta), -np.sin(theta)], [np.sin(theta), np.cos(theta)]], dtype=float)
    cov = rot @ np.diag([18.0**2, 8.0**2]) @ rot.T

    rng_pool = np.random.default_rng(params.trial_seed + 11)
    rng_idx_a = np.random.default_rng(params.trial_seed + 31)
    rng_idx_r = np.random.default_rng(params.trial_seed + 47)

    acq_a = sample_bounded_bivariate(rng_pool, mean_a, cov, params.n_stim_per_cat, lo, hi)
    acq_b = sample_bounded_bivariate(rng_pool, mean_b, cov, params.n_stim_per_cat, lo, hi)

    acq_stim = np.vstack([acq_a, acq_b])
    acq_label = np.array([0] * params.n_stim_per_cat + [1] * params.n_stim_per_cat, dtype=int)

    if reversal_mode == "full_swap":
        rev_stim = acq_stim.copy()
        rev_label = 1 - acq_label
    else:
        phi = np.deg2rad(90.0)
        rot2 = np.array([[np.cos(phi), -np.sin(phi)], [np.sin(phi), np.cos(phi)]], dtype=float)

        mean_a_rot = center + rot2 @ (mean_a - center)
        mean_b_rot = center + rot2 @ (mean_b - center)
        cov_rot = rot2 @ cov @ rot2.T

        rev_a = sample_bounded_bivariate(rng_pool, mean_a_rot, cov_rot, params.n_stim_per_cat, lo, hi)
        rev_b = sample_bounded_bivariate(rng_pool, mean_b_rot, cov_rot, params.n_stim_per_cat, lo, hi)
        rev_stim = np.vstack([rev_a, rev_b])
        rev_label = np.array([0] * params.n_stim_per_cat + [1] * params.n_stim_per_cat, dtype=int)

    acq_idx = rng_idx_a.integers(0, len(acq_stim), size=params.n_acq)
    rev_idx = rng_idx_r.integers(0, len(rev_stim), size=params.n_rev)

    trials = (
        [(acq_stim[i].copy(), int(acq_label[i]), "acq") for i in acq_idx]
        + [(rev_stim[i].copy(), int(rev_label[i]), "rev") for i in rev_idx]
    )
    return trials


def rolling_mean_1d(arr: np.ndarray, window: int) -> np.ndarray:
    arr = np.asarray(arr, dtype=float)
    if arr.size < window:
        return np.array([])
    csum = np.cumsum(np.r_[0.0, arr])
    return (csum[window:] - csum[:-window]) / window


def run_one(
    params: Params,
    trials,
    preferred: np.ndarray,
    reservoir_seed: int,
    sim_seed: int,
):
    rng_res = np.random.default_rng(reservoir_seed)
    w_cx = rng_res.uniform(0.0, params.w_init_scale, size=(params.n_msn, preferred.shape[0]))
    w_lat = make_lat_inhibition(params.n_msn, params.lambda_lat, seed=reservoir_seed + 500)

    adaptation = np.zeros(params.n_msn, dtype=float)
    rng = np.random.default_rng(sim_seed)
    split = params.n_msn // 2
    k = max(1, int(params.k_frac * params.n_msn))

    acq_acc = []
    rev_acc = []

    for stim, correct, phase in trials:
        x_c = encode_stimulus(stim, preferred, params.sigma_tuning)
        x_s = compete(x_c, w_cx, w_lat, k, adaptation, params.sigma_noise, rng)

        n_a = float(x_s[:split].sum())
        n_b = float(x_s[split:].sum())

        if n_a == 0.0 and n_b == 0.0:
            probs = np.array([0.5, 0.5])
        else:
            logits = np.array([n_a, n_b]) / params.readout_temp
            ex = np.exp(logits - logits.max())
            probs = ex / ex.sum()

        resp = int(rng.choice(2, p=probs))
        reward_sign = 1.0 if resp == correct else -1.0

        w_cx *= 1.0 - params.decay_rate
        active = x_s > 0
        w_cx[active] += params.eta * reward_sign * np.outer(x_s[active], x_c)
        np.clip(w_cx, 0.0, None, out=w_cx)

        is_correct = float(resp == correct)
        if phase == "acq":
            acq_acc.append(is_correct)
        elif phase == "rev":
            rev_acc.append(is_correct)

    return np.array(acq_acc, dtype=float), np.array(rev_acc, dtype=float)


def summarize_params(params: Params) -> str:
    # End-of-guide recommendation: students can consolidate all used params in one block.
    side = cortex_side(params)
    lines = [
        "Consolidated parameters used in this run:",
        f"  n_msn={params.n_msn}, cortex_side={side} (full={params.use_full_cortex})",
        f"  n_acq={params.n_acq}, n_rev={params.n_rev}, n_sim={params.n_sim}",
        f"  sigma_tuning={params.sigma_tuning}, sigma_noise={params.sigma_noise}",
        f"  k_frac={params.k_frac}, lambda_lat={params.lambda_lat}",
        f"  eta={params.eta}, decay_rate={params.decay_rate}, readout_temp={params.readout_temp}",
        f"  seeds: encoder={params.encoder_seed}, trial={params.trial_seed}",
    ]
    return "\n".join(lines)


def main() -> None:
    params = Params()
    os.makedirs("../figures", exist_ok=True)

    preferred = build_cortex_preferred(params)

    full_trials = build_trials(params, reversal_mode="full_swap")
    partial_trials = build_trials(params, reversal_mode="partial_rotate")

    full_acq_runs, full_rev_runs, partial_rev_runs = [], [], []

    for i in range(params.n_sim):
        acq, rev = run_one(params, full_trials, preferred, reservoir_seed=i, sim_seed=2000 + i)
        full_acq_runs.append(acq)
        full_rev_runs.append(rev)

    for i in range(params.n_sim):
        _, rev = run_one(params, partial_trials, preferred, reservoir_seed=100 + i, sim_seed=2100 + i)
        partial_rev_runs.append(rev)

    fig, axes = plt.subplots(1, 3, figsize=(13, 4), sharey=True)

    for ax, phase_runs, title, color in [
        (axes[0], full_acq_runs, "Acquisition", "steelblue"),
        (axes[1], full_rev_runs, "Full Reversal", "darkorange"),
        (axes[2], partial_rev_runs, "Partial Reversal", "firebrick"),
    ]:
        rms = [rolling_mean_1d(run, params.window) for run in phase_runs]
        rms = [r for r in rms if r.size > 0]
        if not rms:
            continue

        min_len = min(len(r) for r in rms)
        arr = np.array([r[:min_len] for r in rms], dtype=float)
        x = np.arange(min_len)
        for row in arr:
            ax.plot(x, row, color=color, alpha=0.18, lw=1.0)
        ax.plot(x, arr.mean(axis=0), color=color, lw=2.5)
        ax.axhline(0.5, ls="--", color="gray", lw=1)
        ax.set_title(title)
        ax.set_ylim(-0.05, 1.05)
        ax.set_xlabel("Trial (rolling)")
        ax.set_ylabel("Accuracy")

    plt.tight_layout()
    plt.savefig("../figures/from_scratch_learning_curves.png", dpi=150, bbox_inches="tight")
    plt.close(fig)

    print(summarize_params(params))


if __name__ == "__main__":
    main()
