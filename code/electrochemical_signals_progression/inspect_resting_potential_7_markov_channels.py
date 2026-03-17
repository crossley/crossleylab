"""
Markov channel kinetics — macro current from micro gating events.

This script simulates N independent two-state (open / closed) ion channels
using discrete-time Markov kinetics. No particles or diffusion are involved;
the focus is purely on the relationship between single-channel stochastic
behaviour and the macroscopic current that emerges from summing many channels.

Channel state update per timestep:
    if open  : close with probability p_close
    if closed: open  with probability p_open
Each channel is updated independently (no coupling).

Current contribution:
    - Each open channel carries unit_current = +1 (arbitrary units).
    - Macro current I(t) = sum of all open channel currents.

Analytical steady-state:
    P_open_ss = p_open / (p_open + p_close)
    I_ss      = N * unit_current * P_open_ss

Two panels:
    Top:    Micro traces — each channel plotted at a separate y-offset
            (open = 1, closed = 0), showing stochastic flickering.
            Only the first min(N, 10) channels are shown for clarity.
    Bottom: Macro trace — total current summed over all N channels,
            with the analytical steady-state overlaid as a dashed line.

Model assumptions / simplifications:
    - Memoryless transitions (geometric dwell times).
    - No voltage dependence (unconditional transition probabilities).
    - Channels start closed.

Key parameters:
    - N_channels = 5
    - p_open = 0.1, p_close = 0.3
    - unit_current = 1
    - T = 1000 ms, dt = 1 ms

Output:
    - Saves 'markov_channels.png' in the working directory.

Conceptual focus (Lesson 15 — Macro vs Micro Currents):
    A single channel flickers unpredictably; the average over many channels
    gives a smooth current that reflects the open-state probability.
"""

import numpy as np
import matplotlib.pyplot as plt

# ── Simulation parameters ─────────────────────────────────────────────────────
T            = 1000
dt           = 1.0
t            = np.arange(0, T, dt)
N_steps      = len(t)
N_channels   = 5       # total channels
p_open       = 0.1     # closed→open transition probability per step
p_close      = 0.3     # open→closed transition probability per step
unit_current = 1.0     # current carried by one open channel (arb. units)

# ── Pre-allocate state arrays ─────────────────────────────────────────────────
# states[step, channel]: 0 = closed, 1 = open
states  = np.zeros((N_steps, N_channels), dtype=int)
current = np.zeros(N_steps)   # macro current at each step

# All channels start closed (states[0] already 0)
current[0] = np.sum(states[0]) * unit_current

# ── Simulation loop: Markov transitions ───────────────────────────────────────
for i in range(1, N_steps):
    prev   = states[i-1].copy()
    new_st = prev.copy()

    # Open channels: close with p_close
    open_mask   = prev == 1
    new_st[open_mask]  = (np.random.rand(np.sum(open_mask))  > p_close).astype(int)

    # Closed channels: open with p_open
    closed_mask = prev == 0
    new_st[closed_mask] = (np.random.rand(np.sum(closed_mask)) < p_open).astype(int)

    states[i]  = new_st
    current[i] = np.sum(new_st) * unit_current

# ── Analytical steady-state ───────────────────────────────────────────────────
P_open_ss = p_open / (p_open + p_close)
I_ss      = N_channels * unit_current * P_open_ss

# ── Figure ────────────────────────────────────────────────────────────────────
n_display = min(N_channels, 10)   # show at most 10 micro traces
fig, (ax_micro, ax_macro) = plt.subplots(
    2, 1, figsize=(11, 6),
    gridspec_kw={'height_ratios': [n_display, 2]}
)
fig.suptitle(
    f"Markov Channel Kinetics  (N = {N_channels},  p_open = {p_open},  p_close = {p_close})",
    fontsize=11
)

# ── Top panel: micro traces (EEG-style stacked) ───────────────────────────────
channel_colors = plt.cm.tab10(np.linspace(0, 0.9, n_display))
for ch in range(n_display):
    offset = ch                              # vertical offset per channel
    trace  = states[:, ch].astype(float) + offset
    ax_micro.plot(t, trace, color=channel_colors[ch], lw=0.8)
    ax_micro.text(-18, offset + 0.5, f"Ch {ch+1}", va='center',
                  fontsize=7, color=channel_colors[ch])

ax_micro.set_xlim(0, T)
ax_micro.set_ylim(-0.3, n_display + 0.3)
ax_micro.set_yticks(np.arange(n_display) + 0.5)
ax_micro.set_yticklabels(['closed→open'] * n_display, fontsize=6)
ax_micro.yaxis.tick_right()
ax_micro.set_xticklabels([])
ax_micro.set_ylabel("Individual channels")
ax_micro.set_title(f"Micro: first {n_display} channels  (0 = closed, 1 = open)")

# Running mean overlay (smoothed open fraction)
window = 50
smooth = np.convolve(np.mean(states[:, :n_display], axis=1),
                     np.ones(window) / window, mode='same')
ax_micro.plot(t, smooth * n_display + 0,
              color='black', lw=1, linestyle='--', alpha=0.5,
              label=f'Running mean × {n_display}')

# ── Bottom panel: macro current ───────────────────────────────────────────────
ax_macro.plot(t, current, color='steelblue', lw=1.2, label='Macro current')
ax_macro.axhline(I_ss, color='black', linestyle='--', lw=1.2,
                 label=f'Steady-state I = {I_ss:.2f}  (P_open = {P_open_ss:.2f})')
ax_macro.set_xlim(0, T)
ax_macro.set_ylim(-0.5, N_channels + 0.5)
ax_macro.set_xlabel("Time (ms)")
ax_macro.set_ylabel("Current (arb. units)")
ax_macro.set_title("Macro: sum of all channel currents")
ax_macro.legend(loc='upper right', fontsize=9)

plt.tight_layout()
plt.savefig("markov_channels.png", dpi=150, bbox_inches='tight')
plt.close()
