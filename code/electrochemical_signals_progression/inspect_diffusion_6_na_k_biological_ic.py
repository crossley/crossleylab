"""
Na⁺/K⁺ diffusion from biological initial conditions.

This script extends the two-ion selective-channel simulation (inspect_diffusion_4)
with biologically realistic starting conditions: Na⁺ begins approximately 90 %
on the outside (right side) and K⁺ begins approximately 90 % on the inside
(left side), mirroring the concentration gradients found in real neurons.

Both ions have their own type-selective channel in the membrane (always open).
With no electrical forces or pump, both gradients are driven purely by diffusion
and therefore dissipate over time — both species converge to an equal split of
0.5 on each side.

Particle types and channels:
    - Na⁺ (cyan  '#00d4f0'): channel gap y in [20, 30]  (upper region)
    - K⁺  (lime  '#9fff6a'): channel gap y in [-30, -20] (lower region)

Model assumptions / simplifications:
    - Pure Brownian diffusion only (no electrical forces, no pump).
    - Channel selectivity is enforced by y-position at the moment of crossing.
    - Blocked particles have their x-position reverted; y is updated normally.
    - Top/bottom boundaries: y clamped to [-box_height/2, box_height/2].

Key parameters:
    - num_na = num_k = 150 (each species), T = 1000 ms, dt = 1 ms

Output:
    - Saves 'na_k_biological_ic.mp4' in the working directory.

Conceptual focus (Lesson 5 — Na⁺/K⁺ at Biological IC):
    Without a pump or electrical force there is no mechanism to maintain the
    biological gradient — both ions equilibrate to 0.5 regardless of the
    starting condition.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.lines import Line2D

# ── Simulation parameters ─────────────────────────────────────────────────────
T            = 1000
dt           = 1.0
t            = np.arange(0, T, dt)
N            = len(t)
num_na       = 150
num_k        = 150
num_particles = num_na + num_k
box_width    = 100
box_height   = 80
wall_thick   = 4
left_wall    = -wall_thick / 2
right_wall   =  wall_thick / 2

# Ion colours (fixed throughout the series)
COLOR_NA = '#00d4f0'   # cyan for Na⁺
COLOR_K  = '#9fff6a'   # lime for K⁺

# Selective channel y-extents
na_channel = (20, 30)    # Na⁺ upper gap
k_channel  = (-30, -20)  # K⁺  lower gap

# Per-particle type labels (0 = Na⁺, 1 = K⁺) and rendering colours
types  = np.array([0] * num_na + [1] * num_k)
colors = np.array([COLOR_NA if tp == 0 else COLOR_K for tp in types])

# Channel bounds arrays used during the simulation loop
channel_lo = np.where(types == 0, na_channel[0], k_channel[0])
channel_hi = np.where(types == 0, na_channel[1], k_channel[1])

# ── Helper: random positions in the left / right compartment ─────────────────
def left_x(n):
    return np.random.uniform(-box_width / 2 + 1, left_wall - 1, n)

def right_x(n):
    return np.random.uniform(right_wall + 1, box_width / 2 - 1, n)

def rand_y(n):
    return np.random.uniform(-box_height / 2 + 1, box_height / 2 - 1, n)

# ── Initial conditions: biological gradients ──────────────────────────────────
x    = np.zeros((N, num_particles))
y    = np.zeros((N, num_particles))

# Na⁺: 10 % inside (left), 90 % outside (right)
n_na_in  = max(1, int(0.10 * num_na))
n_na_out = num_na - n_na_in
x[0, :n_na_in]        = left_x(n_na_in)
x[0, n_na_in:num_na]  = right_x(n_na_out)
y[0, :num_na]         = rand_y(num_na)

# K⁺: 90 % inside (left), 10 % outside (right)
n_k_in   = max(1, int(0.90 * num_k))
n_k_out  = num_k - n_k_in
x[0, num_na:num_na + n_k_in] = left_x(n_k_in)
x[0, num_na + n_k_in:]       = right_x(n_k_out)
y[0, num_na:]                 = rand_y(num_k)

# Track inside (left) fraction for each species
frac_na = np.zeros(N)
frac_k  = np.zeros(N)
frac_na[0] = np.mean(x[0, :num_na] < 0)
frac_k[0]  = np.mean(x[0, num_na:] < 0)

# ── Simulation loop ───────────────────────────────────────────────────────────
for i in range(1, N):
    dxdt = np.random.normal(0.0, 0.5, num_particles)
    dydt = np.random.normal(0.0, 0.5, num_particles)

    new_x = x[i-1] + dxdt * dt
    new_y = y[i-1] + dydt * dt
    new_y = np.clip(new_y, -box_height / 2, box_height / 2)

    # Particles trying to cross either wall face
    cross_lr = (x[i-1] > right_wall) & (new_x <= right_wall)
    cross_rl = (x[i-1] < left_wall)  & (new_x >= left_wall)
    trying   = cross_lr | cross_rl

    # Allow crossing only through the ion's own selective channel
    in_channel = (y[i-1] >= channel_lo) & (y[i-1] <= channel_hi)
    blocked    = trying & ~in_channel
    new_x[blocked] = x[i-1][blocked]

    x[i] = new_x
    y[i] = new_y
    frac_na[i] = np.mean(x[i, :num_na] < 0)
    frac_k[i]  = np.mean(x[i, num_na:] < 0)

# ── Figure setup ──────────────────────────────────────────────────────────────
fig, (ax_box, ax_conc) = plt.subplots(1, 2, figsize=(12, 5))
fig.suptitle("Na⁺/K⁺ Diffusion from Biological Initial Conditions", fontsize=11)

scat = ax_box.scatter(x[0], y[0], s=8, c=colors)
ax_box.set_xlim(-box_width / 2, box_width / 2)
ax_box.set_ylim(-box_height / 2, box_height / 2)
ax_box.set_xticks([])
ax_box.set_yticks([])
ax_box.set_title("Na⁺ outside, K⁺ inside → both equilibrate to 0.5")

# Draw membrane: three wall segments around the two channel gaps
gaps  = sorted([k_channel, na_channel])             # sorted by lower bound
ys    = ([-box_height / 2] +
         [v for g in gaps for v in g] +
         [box_height / 2])                          # 6 breakpoints
for j in range(0, len(ys) - 1, 2):                 # wall segments at [0,1],[2,3],[4,5]
    for side in [left_wall, right_wall]:
        ax_box.plot([side, side], [ys[j], ys[j+1]], 'k-', lw=1.5)

# Shade the channel gaps with the ion's colour
for ch, col in [(na_channel, COLOR_NA), (k_channel, COLOR_K)]:
    ax_box.axvspan(left_wall, right_wall,
                   (ch[0] + box_height / 2) / box_height,
                   (ch[1] + box_height / 2) / box_height,
                   color=col, alpha=0.25)

legend_elems = [
    Line2D([0], [0], marker='o', color='w', markerfacecolor=COLOR_NA, label='Na⁺', markersize=7),
    Line2D([0], [0], marker='o', color='w', markerfacecolor=COLOR_K,  label='K⁺',  markersize=7),
]
ax_box.legend(handles=legend_elems, loc='upper left')

# Right panel: inside fraction over time
line_na, = ax_conc.plot([], [], color=COLOR_NA, lw=1.5, label='Na⁺ inside fraction')
line_k,  = ax_conc.plot([], [], color=COLOR_K,  lw=1.5, label='K⁺  inside fraction')
ax_conc.axhline(0.5, color='gray', linestyle='--', lw=1, label='Equilibrium (0.5)')
ax_conc.set_xlim(0, T)
ax_conc.set_ylim(-0.05, 1.05)
ax_conc.set_xlabel("Time (ms)")
ax_conc.set_ylabel("Fraction inside (left compartment)")
ax_conc.set_title("Both ions converge to 0.5 — no gradient is maintained")
ax_conc.legend()

time_vals, na_vals, k_vals = [], [], []

def update(frame):
    scat.set_offsets(np.c_[x[frame], y[frame]])
    time_vals.append(t[frame])
    na_vals.append(frac_na[frame])
    k_vals.append(frac_k[frame])
    line_na.set_data(time_vals, na_vals)
    line_k.set_data(time_vals, k_vals)
    return scat, line_na, line_k

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("na_k_biological_ic.mp4", writer="ffmpeg", fps=30)
