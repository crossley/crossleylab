"""
Nernst potential — single-ion electrochemical equilibrium.

This script simulates K⁺ ions diffusing in a 2D box with a central membrane.
Fixed negative anions (gray squares) are anchored inside (left compartment) and
create a constant leftward electrical drift on K⁺. K⁺ begins with equal numbers
on both sides and has one selective channel (always open).

Over time the electrical drift pulls K⁺ inward while the concentration gradient
(more K⁺ inside) pushes K⁺ outward through the channel. The system settles at
an electrochemical equilibrium described by the Nernst equation.

At each step two membrane-potential proxies are computed:
    E_K  (Nernst proxy) = log( (n_out + 0.5) / (n_in + 0.5) )
        Uses RT/zF = 1 for simplicity; qualitative, unitless.
        E_K → 0 means concentrations are equal; negative means more K⁺ inside.

    V_m  (charge proxy) = net_charge_inside − net_charge_outside
        = (n_k_in − n_anions) − n_k_out
        Negative when anions outnumber free positive charges inside.

At equilibrium V_m and E_K (scaled) should converge: the electrical force
exactly balances the diffusion force.

Model assumptions / simplifications:
    - Electrical drift is a uniform leftward constant force (not a Coulomb field).
    - Fixed anions contribute −1 charge each to the inside.
    - No Na⁺, no pump — purely electrochemical equilibrium for one ion.

Key parameters:
    - num_k = 150, n_anions = 80
    - electric_strength = 0.04  (leftward drift per timestep)
    - T = 1000 ms, dt = 1 ms

Output:
    - Saves 'nernst_one_ion.mp4' in the working directory.

Conceptual focus (Lesson 11 — Nernst Equation):
    The Nernst potential is the voltage at which the electrical and chemical
    driving forces for a single ion species exactly cancel.
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
num_k            = 150
box_width        = 100
box_height       = 80
wall_thick       = 4
left_wall        = -wall_thick / 2
right_wall       =  wall_thick / 2

electric_strength = 0.04     # constant leftward drift on K⁺
n_anions          = 80       # fixed negative anions inside (left)

# K⁺ channel gap
k_channel = (-12, 12)
COLOR_K   = '#9fff6a'

# ── Fixed anion positions (seeded for reproducibility) ────────────────────────
np.random.seed(21)
anion_x = np.random.uniform(-box_width / 2 + 2, left_wall - 2, n_anions)
anion_y = np.random.uniform(-box_height / 2 + 2, box_height / 2 - 2, n_anions)
np.random.seed(None)

# ── Initial conditions: K⁺ equal on both sides ───────────────────────────────
x    = np.zeros((N, num_k))
y    = np.zeros((N, num_k))
half = num_k // 2
x[0, :half]  = np.random.uniform(-box_width / 2 + 1, left_wall - 1,  half)
x[0, half:]  = np.random.uniform(right_wall + 1, box_width / 2 - 1, num_k - half)
y[0]         = np.random.uniform(-box_height / 2 + 1, box_height / 2 - 1, num_k)

# Track V_m and Nernst proxy over time
V_m_trace = np.zeros(N)
E_K_trace = np.zeros(N)

def compute_potentials(xi):
    n_in  = np.sum(xi < left_wall)
    n_out = np.sum(xi > right_wall)
    # Nernst proxy: log ratio of outside to inside (unitless, RT/zF = 1)
    E_K = np.log((n_out + 0.5) / (n_in + 0.5))
    # Charge proxy: inside net charge minus outside net charge
    V_m = (n_in - n_anions) - n_out
    return V_m, E_K

V_m_trace[0], E_K_trace[0] = compute_potentials(x[0])

# ── Simulation loop ───────────────────────────────────────────────────────────
for i in range(1, N):
    dxdt = np.random.normal(0.0, 0.5, num_k)
    dydt = np.random.normal(0.0, 0.5, num_k)

    # Leftward electrical drift (toward anion side)
    dxdt -= electric_strength

    new_x = x[i-1] + dxdt * dt
    new_y = y[i-1] + dydt * dt
    new_y = np.clip(new_y, -box_height / 2, box_height / 2)
    new_x = np.clip(new_x, -box_width  / 2, box_width  / 2)

    # K⁺ channel: block crossings outside the gap
    cross_lr = (x[i-1] > right_wall) & (new_x <= right_wall)
    cross_rl = (x[i-1] < left_wall)  & (new_x >= left_wall)
    trying   = cross_lr | cross_rl
    in_ch    = (y[i-1] >= k_channel[0]) & (y[i-1] <= k_channel[1])
    blocked  = trying & ~in_ch
    new_x[blocked] = x[i-1][blocked]

    x[i] = new_x
    y[i] = new_y
    V_m_trace[i], E_K_trace[i] = compute_potentials(x[i])

# ── Figure setup ──────────────────────────────────────────────────────────────
fig, (ax_box, ax_vm) = plt.subplots(1, 2, figsize=(12, 5))
fig.suptitle("Nernst Potential — K⁺ Electrochemical Equilibrium", fontsize=11)

# Fixed anions drawn once
ax_box.scatter(anion_x, anion_y, s=14, marker='s', color='#888888',
               alpha=0.8, zorder=1)

scat = ax_box.scatter(x[0], y[0], s=9, color=COLOR_K, zorder=2)
ax_box.set_xlim(-box_width / 2, box_width / 2)
ax_box.set_ylim(-box_height / 2, box_height / 2)
ax_box.set_xticks([]); ax_box.set_yticks([])
ax_box.set_title("K⁺ (lime) attracted inward by anions (gray)")

# Membrane wall with K⁺ channel gap
for side in [left_wall, right_wall]:
    ax_box.plot([side, side], [-box_height / 2, k_channel[0]], 'k-', lw=1.5)
    ax_box.plot([side, side], [k_channel[1], box_height / 2],  'k-', lw=1.5)
ax_box.axvspan(left_wall, right_wall,
               (k_channel[0] + box_height / 2) / box_height,
               (k_channel[1] + box_height / 2) / box_height,
               color=COLOR_K, alpha=0.25)

legend_elems = [
    Line2D([0], [0], marker='o', color='w', markerfacecolor=COLOR_K,   label='K⁺',     markersize=7),
    Line2D([0], [0], marker='s', color='w', markerfacecolor='#888888', label='Anions', markersize=7),
]
ax_box.legend(handles=legend_elems, loc='upper right')

# Right panel: V_m trace and Nernst prediction overlay
vm_ymin = min(np.min(V_m_trace), np.min(E_K_trace) * 20) * 1.2
vm_ymax = max(np.max(V_m_trace), np.max(E_K_trace) * 20) * 1.2

line_vm, = ax_vm.plot([], [], color='navy',   lw=1.5, label='V_m (charge proxy)')
line_ek, = ax_vm.plot([], [], color='darkorange', lw=1.5, linestyle='--',
                       label='E_K × 20 (Nernst proxy, scaled)')
ax_vm.axhline(0, color='gray', linestyle=':', lw=0.8)
ax_vm.set_xlim(0, T)
ax_vm.set_ylim(vm_ymin, vm_ymax)
ax_vm.set_xlabel("Time (ms)")
ax_vm.set_ylabel("Potential proxy (arb. units)")
ax_vm.set_title("V_m converges toward Nernst prediction")
ax_vm.legend()

time_vals, vm_vals, ek_vals = [], [], []

def update(frame):
    scat.set_offsets(np.c_[x[frame], y[frame]])
    time_vals.append(t[frame])
    vm_vals.append(V_m_trace[frame])
    ek_vals.append(E_K_trace[frame] * 20)   # scale to match V_m axis
    line_vm.set_data(time_vals, vm_vals)
    line_ek.set_data(time_vals, ek_vals)
    return scat, line_vm, line_ek

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("nernst_one_ion.mp4", writer="ffmpeg", fps=30)
