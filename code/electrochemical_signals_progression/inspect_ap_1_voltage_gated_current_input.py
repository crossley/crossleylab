"""
Action potential — HH-style gating variables with particle-based ion flux.

This script simulates a qualitative action potential by combining:
    1. Particle simulation: Na⁺ and K⁺ ions with biological initial conditions,
       maintained by a Na/K pump.
    2. HH-style gating variables (m, h, n) driven by V_m and updated with
       Euler integration — these control ion channel open probability.
    3. V_m computed each step from the net charge imbalance across the membrane.
    4. A brief depolarising current pulse (added to V_m used for gating only)
       that triggers the action potential.

Gating variables and rate functions (simplified, qualitative — not authentic HH):
    m: Na⁺ activation   h: Na⁺ inactivation   n: K⁺ activation
    dm/dt = alpha_m(v)*(1-m) - beta_m(v)*m     (Euler step)
    dh/dt = alpha_h(v)*(1-h) - beta_h(v)*h
    dn/dt = alpha_n(v)*(1-n) - beta_n(v)*n

Channel open probabilities:
    p_na_open = m² × h   (Na⁺: activated by m, inactivated by h)
    p_k_open  = n²        (K⁺:  activated by n)

Ion crossing rule:
    At each step, each ion outside (Na⁺) or inside (K⁺) independently crosses
    with probability p_cross_na or p_cross_k respectively. This modulates
    with the gating probabilities to produce net inward Na⁺ and outward K⁺
    fluxes consistent with the AP shape.

V_m proxy (particle units, naturally spans ~−90 to ~+90):
    V_m = (n_k_in + n_na_in − n_anions) − (n_k_out + n_na_out)
    At biological IC with 90 anions: rest ≈ −90, peak AP ≈ +30 to +60

Model assumptions / simplifications:
    - Rate functions are sigmoid/exponential approximations, not real HH.
    - Particle crossing is stochastic; each particle decides independently.
    - V_m for gating uses the particle-count proxy + pulse offset.
    - Na/K pump runs at pump_rate to maintain the biological gradient.

Key parameters:
    - num_na = num_k = 100, n_anions = 90
    - pump_rate = 0.05
    - t_pulse_start = 200, t_pulse_end = 230, pulse_strength = 30

Output:
    - Saves 'action_potential.mp4' in the working directory.

Conceptual focus (Lesson 18 — Action Potential):
    The AP upstroke is driven by Na⁺ influx (m² h opens Na⁺ channels), the
    peak by Na⁺ inactivation (h → 0), and repolarisation by K⁺ outflux (n²).
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.lines import Line2D

# ── Simulation parameters ─────────────────────────────────────────────────────
T                = 1000
dt               = 1.0
t                = np.arange(0, T, dt)
N                = len(t)
num_na           = 100
num_k            = 100
num_particles    = num_na + num_k
box_width        = 100
box_height       = 80
wall_thick       = 4
left_wall        = -wall_thick / 2
right_wall       =  wall_thick / 2

n_anions          = 90       # fixed inside; sets resting V_m ≈ −90
electric_strength = 0.04     # leftward drift on all positive ions
pump_rate         = 0.05     # Na/K pump event probability per step

# Crossing scale: fraction of eligible particles that cross per step
# (scales with gating variable — keeps single-step flux qualitatively realistic)
p_cross_na = 0.012    # Na⁺ base crossing probability (modulated by p_na_open)
p_cross_k  = 0.010    # K⁺  base crossing probability (modulated by p_k_open)

# Current-injection pulse parameters (adds to V_m used for gating only)
t_pulse_start = 200
t_pulse_end   = 230
pulse_strength = 30.0   # arb. units added to V_m for gating during pulse

COLOR_NA = '#00d4f0'
COLOR_K  = '#9fff6a'

# Na⁺ and K⁺ selective channels
na_channel = (22, 32)
k_channel  = (-32, -22)

# ── HH-style gating rate functions (qualitative — V in particle-count units) ──
def alpha_m(v): return 0.1  / (1 + np.exp(-0.1  * v))
def beta_m(v):  return 0.1  * np.exp(-0.05 * v)
def alpha_h(v): return 0.05 * np.exp(-0.05 * v)
def beta_h(v):  return 0.1  / (1 + np.exp(-0.1  * v))
def alpha_n(v): return 0.05 / (1 + np.exp(-0.05 * v))
def beta_n(v):  return 0.05 * np.exp(-0.05 * v)

# ── Fixed anions ──────────────────────────────────────────────────────────────
np.random.seed(55)
anion_x = np.random.uniform(-box_width / 2 + 2, left_wall - 2, n_anions)
anion_y = np.random.uniform(-box_height / 2 + 2, box_height / 2 - 2, n_anions)
np.random.seed(None)

# ── Helper functions ──────────────────────────────────────────────────────────
def left_x(n):  return np.random.uniform(-box_width / 2 + 1, left_wall - 1, n)
def right_x(n): return np.random.uniform(right_wall + 1, box_width / 2 - 1, n)
def rand_y(n):  return np.random.uniform(-box_height / 2 + 1, box_height / 2 - 1, n)

# ── Particle type arrays ──────────────────────────────────────────────────────
types      = np.array([0] * num_na + [1] * num_k)
colors     = np.array([COLOR_NA if tp == 0 else COLOR_K for tp in types])
channel_lo = np.where(types == 0, na_channel[0], k_channel[0])
channel_hi = np.where(types == 0, na_channel[1], k_channel[1])

# ── Initial conditions: biological gradients ──────────────────────────────────
x    = np.zeros((N, num_particles))
y    = np.zeros((N, num_particles))

n_na_in = max(1, int(0.10 * num_na))
x[0, :n_na_in]       = left_x(n_na_in)
x[0, n_na_in:num_na] = right_x(num_na - n_na_in)
y[0, :num_na]        = rand_y(num_na)

n_k_in = max(1, int(0.90 * num_k))
x[0, num_na:num_na + n_k_in] = left_x(n_k_in)
x[0, num_na + n_k_in:]       = right_x(num_k - n_k_in)
y[0, num_na:]                 = rand_y(num_k)

# ── Gating variable arrays ────────────────────────────────────────────────────
m_g = np.zeros(N);  m_g[0] = 0.05
h_g = np.zeros(N);  h_g[0] = 0.60
n_g = np.zeros(N);  n_g[0] = 0.30

V_m_trace = np.zeros(N)

def compute_vm(xi):
    n_na_i = np.sum(xi[:num_na] < left_wall)
    n_na_o = np.sum(xi[:num_na] > right_wall)
    n_k_i  = np.sum(xi[num_na:] < left_wall)
    n_k_o  = np.sum(xi[num_na:] > right_wall)
    return (n_na_i + n_k_i - n_anions) - (n_na_o + n_k_o)

V_m_trace[0] = compute_vm(x[0])

# ── Simulation loop ───────────────────────────────────────────────────────────
for i in range(1, N):
    # V_m used for gating: add pulse offset if within injection window
    v_gate = V_m_trace[i-1]
    if t_pulse_start <= i < t_pulse_end:
        v_gate += pulse_strength

    # Euler update of gating variables
    dm = (alpha_m(v_gate) * (1 - m_g[i-1]) - beta_m(v_gate) * m_g[i-1]) * dt
    dh = (alpha_h(v_gate) * (1 - h_g[i-1]) - beta_h(v_gate) * h_g[i-1]) * dt
    dn = (alpha_n(v_gate) * (1 - n_g[i-1]) - beta_n(v_gate) * n_g[i-1]) * dt
    m_g[i] = np.clip(m_g[i-1] + dm, 0.0, 1.0)
    h_g[i] = np.clip(h_g[i-1] + dh, 0.0, 1.0)
    n_g[i] = np.clip(n_g[i-1] + dn, 0.0, 1.0)

    p_na_open = m_g[i]**2 * h_g[i]   # Na⁺ channel open probability
    p_k_open  = n_g[i]**2             # K⁺  channel open probability

    # Diffusion step
    dxdt = np.random.normal(0.0, 0.5, num_particles) - electric_strength
    dydt = np.random.normal(0.0, 0.5, num_particles)
    new_x = np.clip(x[i-1] + dxdt * dt, -box_width / 2, box_width / 2)
    new_y = np.clip(y[i-1] + dydt * dt, -box_height / 2, box_height / 2)

    # Standard selective-channel wall rule (baseline diffusion crossings)
    cross_lr = (x[i-1] > right_wall) & (new_x <= right_wall)
    cross_rl = (x[i-1] < left_wall)  & (new_x >= left_wall)
    trying   = cross_lr | cross_rl
    in_ch    = (y[i-1] >= channel_lo) & (y[i-1] <= channel_hi)
    blocked  = trying & ~in_ch
    new_x[blocked] = x[i-1][blocked]

    x[i] = new_x
    y[i] = new_y

    # Gating-driven Na⁺ inward flux: Na⁺ outside → inside through Na⁺ channel
    na_outside = np.where((types == 0) & (x[i] > right_wall))[0]
    if len(na_outside) > 0:
        cross_mask = np.random.rand(len(na_outside)) < (p_cross_na * p_na_open)
        for idx in na_outside[cross_mask]:
            x[i][idx] = left_x(1)[0]
            y[i][idx] = rand_y(1)[0]

    # Gating-driven K⁺ outward flux: K⁺ inside → outside through K⁺ channel
    k_inside = np.where((types == 1) & (x[i] < left_wall))[0]
    if len(k_inside) > 0:
        cross_mask = np.random.rand(len(k_inside)) < (p_cross_k * p_k_open)
        for idx in k_inside[cross_mask]:
            x[i][idx] = right_x(1)[0]
            y[i][idx] = rand_y(1)[0]

    # Na/K pump
    if np.random.rand() < pump_rate:
        na_in = np.where((types == 0) & (x[i] < left_wall))[0]
        if len(na_in) > 0:
            idx = np.random.choice(na_in)
            x[i][idx] = right_x(1)[0];  y[i][idx] = rand_y(1)[0]
        k_out = np.where((types == 1) & (x[i] > right_wall))[0]
        if len(k_out) > 0:
            idx = np.random.choice(k_out)
            x[i][idx] = left_x(1)[0];   y[i][idx] = rand_y(1)[0]

    V_m_trace[i] = compute_vm(x[i])

# ── Figure setup ──────────────────────────────────────────────────────────────
fig, (ax_box, ax_vm) = plt.subplots(1, 2, figsize=(13, 5))
fig.suptitle(
    f"Action Potential — HH-style gating  "
    f"(pulse {t_pulse_start}–{t_pulse_end} ms, strength {pulse_strength})",
    fontsize=11
)

ax_box.scatter(anion_x, anion_y, s=10, marker='s', color='#888888',
               alpha=0.7, zorder=1)
scat = ax_box.scatter(x[0], y[0], s=8, c=colors, zorder=2)
ax_box.set_xlim(-box_width / 2, box_width / 2)
ax_box.set_ylim(-box_height / 2, box_height / 2)
ax_box.set_xticks([]); ax_box.set_yticks([])
ax_box.set_title("Na⁺ (cyan) outside, K⁺ (lime) inside at rest")

# Membrane wall with two channel gaps
gaps = sorted([k_channel, na_channel])
ys   = [-box_height / 2] + [v for g in gaps for v in g] + [box_height / 2]
for j in range(0, len(ys) - 1, 2):
    for side in [left_wall, right_wall]:
        ax_box.plot([side, side], [ys[j], ys[j+1]], 'k-', lw=1.5)
for ch, col in [(na_channel, COLOR_NA), (k_channel, COLOR_K)]:
    ax_box.axvspan(left_wall, right_wall,
                   (ch[0] + box_height / 2) / box_height,
                   (ch[1] + box_height / 2) / box_height,
                   color=col, alpha=0.22)

legend_elems = [
    Line2D([0], [0], marker='o', color='w', markerfacecolor=COLOR_NA, label='Na⁺', markersize=7),
    Line2D([0], [0], marker='o', color='w', markerfacecolor=COLOR_K,  label='K⁺',  markersize=7),
    Line2D([0], [0], marker='s', color='w', markerfacecolor='#888888', label='Anions', markersize=7),
]
ax_box.legend(handles=legend_elems, loc='upper right')

# V_m trace
pad = 15
line_vm, = ax_vm.plot([], [], color='navy', lw=1.5, label='V_m (charge proxy)')
ax_vm.axvspan(t_pulse_start, t_pulse_end, color='gold', alpha=0.3,
              label=f'Stimulus pulse')
ax_vm.set_xlim(0, T)
ax_vm.set_ylim(np.min(V_m_trace) - pad, np.max(V_m_trace) + pad)
ax_vm.set_xlabel("Time (ms)")
ax_vm.set_ylabel("V_m proxy (arb. units)")
ax_vm.set_title("Action potential waveform")
ax_vm.legend()
ax_vm.axhline(0, color='gray', linestyle=':', lw=0.8)

time_vals, vm_vals = [], []

def update(frame):
    scat.set_offsets(np.c_[x[frame], y[frame]])
    time_vals.append(t[frame])
    vm_vals.append(V_m_trace[frame])
    line_vm.set_data(time_vals, vm_vals)
    return scat, line_vm

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("action_potential.mp4", writer="ffmpeg", fps=30)
