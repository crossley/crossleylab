#!/usr/bin/env python3
"""
Generate figures for the Striatal Reservoir tutorial page.

This script does three things:
1) Optionally runs the source striatal model script to regenerate its figure outputs.
2) Copies selected model output figures into this web app's public folder.
3) Creates extra teaching visuals not present in the source model script.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib import gridspec

SEQ_CMAP = "viridis"
DELTA_CMAP = "RdBu_r"
POOL_A_COLOR = "#1f6f8b"
POOL_B_COLOR = "#c95b43"
FIG_BG = "#f8f6f1"
AX_BG = "#fcfbf8"


def configure_plot_style() -> None:
    plt.rcParams.update(
        {
            "figure.facecolor": FIG_BG,
            "axes.facecolor": AX_BG,
            "axes.edgecolor": "#b8b2a4",
            "axes.labelcolor": "#2c2f33",
            "xtick.color": "#2c2f33",
            "ytick.color": "#2c2f33",
            "font.size": 10,
            "axes.titlesize": 11,
            "axes.titleweight": "semibold",
        }
    )


def style_matrix_axis(ax: plt.Axes, title: str, xlabel: str = "", ylabel: str = "") -> None:
    ax.set_title(title)
    if xlabel:
        ax.set_xlabel(xlabel)
    if ylabel:
        ax.set_ylabel(ylabel)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model-root",
        type=Path,
        default=Path("/Users/mq20185996/Dropbox/cat_learn_automaticity/striatal_reservoir_model"),
        help="Path to striatal_reservoir_model repo.",
    )
    parser.add_argument(
        "--run-model",
        action="store_true",
        help="Run code/striatal_model.py before copying figures.",
    )
    return parser.parse_args()


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def run_source_model(model_root: Path) -> None:
    script = model_root / "code" / "striatal_model.py"
    if not script.exists():
        raise FileNotFoundError(f"Missing source model script: {script}")
    subprocess.run([sys.executable, str(script)], cwd=str(script.parent), check=True)


def copy_core_figures(model_root: Path, out_dir: Path) -> list[str]:
    src_dir = model_root / "figures"
    required = [
        "generated_stimuli_scatter.png",
        "learning_curves_bioplausible.png",
        "learning_curves_double_reversal.png",
        "ensemble_dynamics.png",
        "surprise_fsi_curves.png",
        "assembly_similarity_to_acq.png",
    ]
    copied: list[str] = []
    for name in required:
        src = src_dir / name
        dst = out_dir / name
        if src.exists():
            shutil.copy2(src, dst)
            copied.append(name)
    return copied


def build_cortex_tuning_100x100(out_dir: Path, sigma: float = 10.0) -> None:
    side = 100
    axis = np.linspace(0.0, 100.0, side)
    gx, gy = np.meshgrid(axis, axis)
    preferred = np.column_stack([gx.ravel(), gy.ravel()])

    stimulus = np.array([63.0, 37.0], dtype=float)
    diff = preferred - stimulus
    sq_dist = np.sum(diff * diff, axis=1)
    response = np.exp(-0.5 * sq_dist / (sigma**2)).reshape(side, side)

    fig = plt.figure(figsize=(9.8, 4.2))
    gs = gridspec.GridSpec(1, 2, width_ratios=[1.0, 1.0], figure=fig, wspace=0.28)

    ax0 = fig.add_subplot(gs[0, 0])
    examples = np.array([[18.0, 18.0], [25.0, 80.0], [72.0, 32.0], [80.0, 78.0]], dtype=float)
    xx, yy = np.meshgrid(np.linspace(0.0, 100.0, 160), np.linspace(0.0, 100.0, 160))
    colors = ["#1d4ed8", "#be123c", "#059669", "#a16207"]
    for pref, color in zip(examples, colors):
        z = np.exp(-0.5 * (((xx - pref[0]) ** 2 + (yy - pref[1]) ** 2) / (sigma**2)))
        ax0.contour(xx, yy, z, levels=[0.2, 0.4, 0.6, 0.8], colors=[color], linewidths=1.2)
        ax0.scatter([pref[0]], [pref[1]], c=color, s=18)
    ax0.set_title("Example receptive fields")
    ax0.set_xlabel("Stimulus X")
    ax0.set_ylabel("Stimulus Y")
    ax0.set_xlim(0, 100)
    ax0.set_ylim(0, 100)

    ax1 = fig.add_subplot(gs[0, 1])
    im = ax1.imshow(response, origin="lower", extent=[0, 100, 0, 100], cmap=SEQ_CMAP, vmin=0.0, vmax=1.0)
    ax1.scatter([stimulus[0]], [stimulus[1]], c="white", s=28, edgecolors="black", linewidths=0.8)
    ax1.set_title("Bivariate Gaussian response to one stimulus")
    ax1.set_xlabel("Stimulus X")
    ax1.set_ylabel("Stimulus Y")
    fig.colorbar(im, ax=ax1, fraction=0.046, pad=0.03, label="Unit activity")

    fig.suptitle("Step 2: 2D cortical tuning as a 100x100 radial basis map", fontsize=12)
    plt.tight_layout()
    fig.savefig(out_dir / "cortex_tuning_100x100.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def make_lateral_matrix(n_msn: int, lambda_lat: float, seed: int = 7) -> np.ndarray:
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


def build_reservoir_architecture_layout(out_dir: Path, seed: int = 13) -> None:
    rng = np.random.default_rng(seed)
    cortex_grid = np.zeros((100, 100), dtype=float)
    cortex_grid[::5, :] = 0.35
    cortex_grid[:, ::5] = 0.75
    cortex_grid += rng.uniform(0.0, 0.08, size=cortex_grid.shape)

    msn_a = rng.uniform(0.2, 1.0, size=(10, 10))
    msn_b = rng.uniform(0.2, 1.0, size=(10, 10))

    fig = plt.figure(figsize=(11.8, 6.6))
    gs = gridspec.GridSpec(2, 3, width_ratios=[1.4, 0.25, 1.0], hspace=0.45, wspace=0.25, figure=fig)

    ax0 = fig.add_subplot(gs[:, 0])
    im0 = ax0.imshow(cortex_grid, cmap=SEQ_CMAP, origin="lower", vmin=0.0, vmax=1.0)
    ax0.set_title("Visual cortex grid (100 x 100)")
    ax0.set_xlabel("Cortex x")
    ax0.set_ylabel("Cortex y")
    fig.colorbar(im0, ax=ax0, fraction=0.033, pad=0.02, label="Relative activation")

    ax1 = fig.add_subplot(gs[0, 2])
    ax1.imshow(msn_a, cmap=SEQ_CMAP, origin="lower", vmin=0.0, vmax=1.0)
    ax1.set_title("MSN pool A (10 x 10)")
    ax1.set_xticks([])
    ax1.set_yticks([])
    ax1.text(
        0.03,
        0.93,
        "A channel",
        transform=ax1.transAxes,
        ha="left",
        va="top",
        color=POOL_A_COLOR,
        fontsize=10,
        fontweight="bold",
        bbox={"facecolor": "#ffffffcc", "edgecolor": "none", "pad": 1.8},
    )

    ax2 = fig.add_subplot(gs[1, 2])
    ax2.imshow(msn_b, cmap=SEQ_CMAP, origin="lower", vmin=0.0, vmax=1.0)
    ax2.set_title("MSN pool B (10 x 10)")
    ax2.set_xticks([])
    ax2.set_yticks([])
    ax2.text(
        0.03,
        0.93,
        "B channel",
        transform=ax2.transAxes,
        ha="left",
        va="top",
        color=POOL_B_COLOR,
        fontsize=10,
        fontweight="bold",
        bbox={"facecolor": "#ffffffcc", "edgecolor": "none", "pad": 1.8},
    )

    ax_mid = fig.add_subplot(gs[:, 1])
    ax_mid.axis("off")
    ax_mid.annotate(
        "",
        xy=(0.95, 0.72),
        xytext=(0.08, 0.72),
        arrowprops={"arrowstyle": "-|>", "lw": 2.0, "color": POOL_A_COLOR},
    )
    ax_mid.annotate(
        "",
        xy=(0.95, 0.28),
        xytext=(0.08, 0.28),
        arrowprops={"arrowstyle": "-|>", "lw": 2.0, "color": POOL_B_COLOR},
    )
    ax_mid.text(0.5, 0.80, "Dense projection via W_cx", ha="center", va="bottom", fontsize=9)
    ax_mid.text(0.5, 0.18, "All cortex units connect to both pools", ha="center", va="top", fontsize=9)

    fig.suptitle("Step 3A: Competitive reservoir architecture", fontsize=12)
    plt.tight_layout()
    fig.savefig(out_dir / "reservoir_architecture_layout.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def build_reservoir_connectivity_matrices(out_dir: Path, seed: int = 13) -> None:
    rng = np.random.default_rng(seed + 1)
    n_msn = 200
    split = n_msn // 2
    w_cx_view = rng.uniform(0.0, 1.0, size=(n_msn, 320))
    w_lat = make_lateral_matrix(n_msn=n_msn, lambda_lat=0.2, seed=seed + 91)

    fig, axes = plt.subplots(1, 2, figsize=(12.6, 4.9), gridspec_kw={"wspace": 0.28})

    im0 = axes[0].imshow(w_cx_view, aspect="auto", cmap=SEQ_CMAP, origin="lower", vmin=0.0, vmax=1.0)
    style_matrix_axis(axes[0], "Corticostriatal matrix W_cx", "Cortex columns (sample)", "MSN rows")
    fig.colorbar(im0, ax=axes[0], fraction=0.046, pad=0.03, label="Weight magnitude")

    vmax = np.max(np.abs(w_lat))
    im1 = axes[1].imshow(w_lat, aspect="auto", cmap=DELTA_CMAP, origin="lower", vmin=-vmax, vmax=vmax)
    axes[1].axhline(split - 0.5, color="#2c2f33", lw=0.9)
    axes[1].axvline(split - 0.5, color="#2c2f33", lw=0.9)
    style_matrix_axis(axes[1], "Lateral inhibition matrix", "MSN source", "MSN target")
    fig.colorbar(im1, ax=axes[1], fraction=0.046, pad=0.03, label="Inhibitory weight")

    fig.suptitle("Step 3B: Explicit connectivity matrices for competition", fontsize=12)
    plt.tight_layout()
    fig.savefig(out_dir / "reservoir_connectivity_matrices.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def _activity_to_pool_image(activity: np.ndarray) -> np.ndarray:
    split = activity.size // 2
    top = activity[:split].reshape(10, 10)
    bottom = activity[split:].reshape(10, 10)
    return np.vstack([top, bottom])


def build_readout_activity_stages(out_dir: Path, seed: int = 55) -> None:
    rng = np.random.default_rng(seed)
    side = 10
    n_msn = side * side * 2
    k = 10

    yy, xx = np.meshgrid(np.arange(side), np.arange(side), indexing="ij")

    def gaussian_blob(cx: float, cy: float, sigma: float, amp: float) -> np.ndarray:
        d2 = (xx - cx) ** 2 + (yy - cy) ** 2
        return amp * np.exp(-0.5 * d2 / (sigma**2))

    pre_a = gaussian_blob(3.0, 6.0, sigma=2.2, amp=1.0) + 0.08 * rng.random((side, side))
    pre_b = gaussian_blob(6.5, 3.0, sigma=2.8, amp=0.72) + 0.08 * rng.random((side, side))
    pre = np.concatenate([pre_a.ravel(), pre_b.ravel()])

    # Within-pool inhibition sharpens each pool's local competition.
    within_a = np.clip(pre_a - 0.30 * pre_a.mean(), 0.0, None) ** 1.15
    within_b = np.clip(pre_b - 0.30 * pre_b.mean(), 0.0, None) ** 1.15
    within = np.concatenate([within_a.ravel(), within_b.ravel()])

    # Cross-pool inhibition suppresses the currently weaker pool more strongly.
    cross_a = np.clip(within_a - 0.12 * within_b.mean(), 0.0, None)
    cross_b = np.clip(within_b - 0.48 * within_a.mean(), 0.0, None)
    cross = np.concatenate([cross_a.ravel(), cross_b.ravel()])

    winners = np.zeros(n_msn, dtype=float)
    idx = np.argpartition(cross, -k)[-k:]
    winners[idx] = 1.0

    stages = [
        (pre, "1) Pre-inhibition"),
        (within, "2) Within-pool inhibition"),
        (cross, "3) Cross-pool inhibition"),
        (winners, "4) k-WTA winners"),
    ]

    fig, axes = plt.subplots(2, 2, figsize=(11.0, 8.2))
    axes_flat = axes.ravel()
    vmin = 0.0
    vmax = max(float(np.max(pre)), float(np.max(within)), float(np.max(cross)))

    for ax, (arr, title) in zip(axes_flat, stages):
        image = _activity_to_pool_image(arr)
        if title.endswith("winners"):
            im = ax.imshow(image, cmap=SEQ_CMAP, origin="lower", vmin=0.0, vmax=1.0)
        else:
            im = ax.imshow(image, cmap=SEQ_CMAP, origin="lower", vmin=vmin, vmax=vmax)
        ax.axhline(9.5, color="#f8f6f1", lw=1.0, alpha=0.95)
        ax.set_title(title, fontsize=10)
        ax.set_xticks([])
        ax.set_yticks([])

    fig.subplots_adjust(wspace=0.22, hspace=0.32, right=0.90, bottom=0.08, top=0.90)
    cax = fig.add_axes([0.92, 0.20, 0.015, 0.60])
    fig.colorbar(im, cax=cax, label="Activity level")
    fig.text(0.15, 0.03, "Top half: pool A", fontsize=9, color=POOL_A_COLOR)
    fig.text(0.30, 0.03, "Bottom half: pool B", fontsize=9, color=POOL_B_COLOR)
    fig.suptitle("Step 4: Sequential reservoir activity snapshots through inhibition and selection", fontsize=12)

    fig.savefig(out_dir / "readout_activity_stages.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def build_wcx_before_after_update(out_dir: Path, seed: int = 77) -> None:
    rng = np.random.default_rng(seed)
    n_msn = 200
    n_cortex = 10_000
    cortex_side = 100
    eta = 0.10
    decay_rate = 0.002

    w_before = rng.uniform(0.0, 0.12, size=(n_msn, n_cortex))
    x_c = rng.uniform(0.0, 1.0, size=n_cortex)
    x_c /= np.linalg.norm(x_c)

    x_s = np.zeros(n_msn, dtype=float)
    active_rows = rng.choice(n_msn, size=10, replace=False)
    x_s[active_rows] = 1.0
    reward_sign = 1.0

    w_after = w_before.copy()
    w_after *= 1.0 - decay_rate
    active = x_s > 0
    w_after[active] += eta * reward_sign * np.outer(x_s[active], x_c)
    np.clip(w_after, 0.0, None, out=w_after)

    active_mask = x_s > 0
    inactive_mask = ~active_mask

    pre_active = w_before[active_mask].mean(axis=0).reshape(cortex_side, cortex_side)
    pre_inactive = w_before[inactive_mask].mean(axis=0).reshape(cortex_side, cortex_side)
    post_active = w_after[active_mask].mean(axis=0).reshape(cortex_side, cortex_side)
    post_inactive = w_after[inactive_mask].mean(axis=0).reshape(cortex_side, cortex_side)

    panels = [
        (pre_active, "Pre-update: active ensemble average"),
        (pre_inactive, "Pre-update: non-active ensemble average"),
        (post_active, "Post-update: active ensemble average"),
        (post_inactive, "Post-update: non-active ensemble average"),
    ]

    vmin = min(float(np.min(p[0])) for p in panels)
    vmax = max(float(np.max(p[0])) for p in panels)

    fig, axes = plt.subplots(2, 2, figsize=(11.4, 8.8))
    for ax, (arr, title) in zip(axes.ravel(), panels):
        im = ax.imshow(arr, origin="lower", cmap=SEQ_CMAP, vmin=vmin, vmax=vmax)
        ax.set_title(title)
        ax.set_xlabel("Cortex x")
        ax.set_ylabel("Cortex y")
        ax.set_xticks([])
        ax.set_yticks([])

    fig.subplots_adjust(wspace=0.16, hspace=0.22, right=0.90, top=0.90)
    cax = fig.add_axes([0.92, 0.20, 0.015, 0.62])
    fig.colorbar(im, cax=cax, label="Mean cortical weight")
    fig.suptitle("Step 5: Dopamine-signed corticostriatal update in W_cx", fontsize=12)
    fig.savefig(out_dir / "wcx_before_after_update.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    args = parse_args()
    here = Path(__file__).resolve().parent
    out_dir = (here.parent / "public" / "figures").resolve()
    ensure_dir(out_dir)
    configure_plot_style()

    if args.run_model:
        run_source_model(args.model_root.resolve())

    copied = copy_core_figures(args.model_root.resolve(), out_dir)

    build_cortex_tuning_100x100(out_dir)
    build_reservoir_architecture_layout(out_dir)
    build_reservoir_connectivity_matrices(out_dir)
    build_readout_activity_stages(out_dir)
    build_wcx_before_after_update(out_dir)

    print(f"Generated custom figures in: {out_dir}")
    if copied:
        print("Copied model figures:")
        for name in copied:
            print(f"  - {name}")
    else:
        print("No core model figures copied. Run with --run-model or verify model-root path.")


if __name__ == "__main__":
    main()
