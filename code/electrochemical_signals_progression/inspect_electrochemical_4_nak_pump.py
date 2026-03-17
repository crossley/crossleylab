"""
Na/K pump simulation: maintaining biological ion gradients against diffusion.

This script simulates two ion species (Na⁺ and K⁺) in a 2D box separated by a
central membrane. Fixed negative anions (shown as small gray squares) are
anchored on the inside (left) and attract both positive ion species leftward via
a constant electrical drift. Each species has its own type-selective channel.

The Na/K pump is modelled as a probabilistic discrete event. On each timestep
with probability pump_rate the pump performs one exchange cycle:
    1. A Na⁺ found on the inside (x < left_wall) is teleported to a random
       position on the outside (right compartment) — pumping Na⁺ out.
    2. A K⁺ found on the outside (x > right_wall) is teleported to a random
       position on the inside (left compartment) — pumping K⁺ in.
If no qualifying particle is found on the expected side for either step, that
half of the swap is skipped.

Without the pump both ions would equilibrate to ~50 % inside (driven by
diffusion against the electrical attraction). The pump counteracts this by
continuously pushing Na⁺ out and K⁺ in, replicating the biological gradient.

Ion types and channels:
    - Na⁺ (cyan  '#00d4f0'): upper channel y in [22, 30]
    - K⁺  (lime  '#9fff6a'): lower channel y in [-30, -22]

Model assumptions / simplifications:
    - Electrical drift is a uniform leftward force (attraction toward anions).
    - Particles start with equal numbers on both sides.
    - No inter-particle repulsion (for speed; the pump effect is the focus).

Key parameters:
    - pump_rate = 0.05  : probability of a pump event per timestep
    - electric_strength = 0.04 : leftward drift magnitude

Output:
    - Saves 'nak_pump_simulation.mp4' in the working directory.

Conceptual focus (Lesson 9 — Na/K Pump):
    The pump maintains asymmetric ion distributions against both diffusion and
    the electrical drift, using energy to sustain the resting-state gradients.
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
num_na       = 100
num_k        = 100
num_particles = num_na + num_k
box_width    = 100
box_height   = 80
wall_thick   = 4
left_wall    = -wall_thick / 2
right_wall   =  wall_thick / 2

# Na/K pump probability per timestep
pump_rate        = 0.05
electric_strength = 0.04    # constant leftward drift (toward anions)
n_anions         = 60       # fixed anions on the inside (left)

# Ion colours
COLOR_NA = '#00d4f0'
COLOR_K  = '#9fff6a'

# Selective channel y-extents
na_channel = (22, 30)
k_channel  = (-30, -22)

types      = np.array([0] * num_na + [1] * num_k)
colors     = np.array([COLOR_NA if tp == 0 else COLOR_K for tp in types])
channel_lo = np.where(types == 0, na_channel[0], k_channel[0])
channel_hi = np.where(types == 0, na_channel[1], k_channel[1])

# ── Fixed anion positions (drawn once, never moved) ───────────────────────────
np.random.seed(42)
anion_x = np.random.uniform(-box_width / 2 + 2, left_wall - 2, n_anions)
anion_y = np.random.uniform(-box_height / 2 + 2, box_height / 2 - 2, n_anions)
np.random.seed(None)

# ── Helper functions ──────────────────────────────────────────────────────────
def left_x(n):
    return np.random.uniform(-box_width / 2 + 1, left_wall - 1, n)

def right_x(n):
    return np.random.uniform(right_wall + 1, box_width / 2 - 1, n)

def rand_y(n):
    return np.random.uniform(-box_height / 2 + 1, box_height / 2 - 1, n)

# ── Initial conditions: equal on both sides (50 % each) ──────────────────────
x    = np.zeros((N, num_particles))
y    = np.zeros((N, num_particles))
x[0, :num_na//2]                = left_x(num_na // 2)
x[0, num_na//2:num_na]          = right_x(num_na - num_na // 2)
x[0, num_na:num_na + num_k//2]  = left_x(num_k // 2)
x[0, num_na + num_k//2:]        = right_x(num_k - num_k // 2)
y[0] = rand_y(num_particles)

# Track inside fraction for each species
frac_na = np.zeros(N)
frac_k  = np.zeros(N)
frac_na[0] = np.mean(x[0, :num_na] < 0)
frac_k[0]  = np.mean(x[0, num_na:] < 0)

# ── Simulation loop ───────────────────────────────────────────────────────────
for i in range(1, N):
    dxdt = np.random.normal(0.0, 0.5, num_particles)
    dydt = np.random.normal(0.0, 0.5, num_particles)

    # Constant leftward drift toward anion side (electrical attraction)
    dxdt -= electric_strength

    new_x = x[i-1] + dxdt * dt
    new_y = y[i-1] + dydt * dt
    new_y = np.clip(new_y, -box_height / 2, box_height / 2)
    new_x = np.clip(new_x, -box_width  / 2, box_width  / 2)

    # Selective-channel crossing check
    cross_lr = (x[i-1] > right_wall) & (new_x <= right_wall)
    cross_rl = (x[i-1] < left_wall)  & (new_x >= left_wall)
    trying   = cross_lr | cross_rl
    in_ch    = (y[i-1] >= channel_lo) & (y[i-1] <= channel_hi)
    blocked  = trying & ~in_ch
    new_x[blocked] = x[i-1][blocked]

    x[i] = new_x
    y[i] = new_y

    # Na/K pump: probabilistic exchange event
    if np.random.rand() < pump_rate:
        # Pump Na⁺ out: find a Na⁺ inside, teleport it outside
        na_inside = np.where((types == 0) & (x[i] < left_wall))[0]
        if len(na_inside) > 0:
            idx = np.random.choice(na_inside)
            x[i][idx] = right_x(1)[0]
            y[i][idx] = rand_y(1)[0]
        # Pump K⁺ in: find a K⁺ outside, teleport it inside
        k_outside = np.where((types == 1) & (x[i] > right_wall))[0]
        if len(k_outside) > 0:
            idx = np.random.choice(k_outside)
            x[i][idx] = left_x(1)[0]
            y[i][idx] = rand_y(1)[0]

    frac_na[i] = np.mean(x[i, :num_na] < 0)
    frac_k[i]  = np.mean(x[i, num_na:] < 0)

# ── Figure setup ──────────────────────────────────────────────────────────────
fig, (ax_box, ax_conc) = plt.subplots(1, 2, figsize=(12, 5))
fig.suptitle("Na/K Pump — Maintaining Ion Gradients Against Diffusion", fontsize=11)

# Fixed anions drawn once as small gray squares
ax_box.scatter(anion_x, anion_y, s=12, marker='s', color='#888888',
               alpha=0.7, zorder=1, label='Fixed anions')

scat = ax_box.scatter(x[0], y[0], s=8, c=colors, zorder=2)
ax_box.set_xlim(-box_width / 2, box_width / 2)
ax_box.set_ylim(-box_height / 2, box_height / 2)
ax_box.set_xticks([])
ax_box.set_yticks([])
ax_box.set_title(f"pump_rate = {pump_rate}  |  electric drift = {electric_strength}")

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
                   color=col, alpha=0.25)

legend_elems = [
    Line2D([0], [0], marker='o',  color='w', markerfacecolor=COLOR_NA, label='Na⁺', markersize=7),
    Line2D([0], [0], marker='o',  color='w', markerfacecolor=COLOR_K,  label='K⁺',  markersize=7),
    Line2D([0], [0], marker='s',  color='w', markerfacecolor='#888888', label='Anions', markersize=7),
]
ax_box.legend(handles=legend_elems, loc='upper right')

# Concentration traces
line_na, = ax_conc.plot([], [], color=COLOR_NA, lw=1.5, label='Na⁺ inside fraction')
line_k,  = ax_conc.plot([], [], color=COLOR_K,  lw=1.5, label='K⁺  inside fraction')
ax_conc.axhline(0.5, color='gray', linestyle='--', lw=1, alpha=0.6)
ax_conc.set_xlim(0, T)
ax_conc.set_ylim(-0.05, 1.05)
ax_conc.set_xlabel("Time (ms)")
ax_conc.set_ylabel("Fraction inside (left compartment)")
ax_conc.set_title("Pump drives Na⁺ out and K⁺ in")
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
ani.save("nak_pump_simulation.mp4", writer="ffmpeg", fps=30)
