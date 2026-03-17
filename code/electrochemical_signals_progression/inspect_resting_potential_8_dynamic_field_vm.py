"""
Reversal potential — electrode-driven K⁺ flux and V_m vs Nernst potential.

This script simulates K⁺ in a 2D box with a membrane. Fixed anions inside
create a leftward electrical drift and the Na/K pump (K⁺-only version) actively
returns K⁺ to the inside, establishing and maintaining a K⁺ gradient (K⁺
mostly inside, as in a real neuron). A K⁺-selective channel is always open.

An electrode applies an additional constant drift force on K⁺:
    electrode_charge > 0  →  rightward push (drives K⁺ out, depolarises)
    electrode_charge < 0  →  leftward pull  (drives K⁺ in, hyperpolarises)
    electrode_charge = 0  →  no electrode (baseline)

Two potential proxies are computed each step:
    V_m  = (n_k_in − n_anions) − n_k_out   (net charge inside − outside)
    E_K  = log( (n_k_out + 0.5) / (n_k_in + 0.5) ) × 20   (Nernst proxy, scaled)

The right panel shows V_m over time with E_K as a dashed overlay.
When electrode_charge opposes E_K the ion flux reverses — this is the
reversal potential concept.

Model assumptions / simplifications:
    - Pump is a probabilistic event (pump_rate per step) that teleports one
      K⁺ from outside to inside; no counter-ion swap needed (K⁺ only).
    - Electric drift is a uniform force; Nernst scaling is qualitative.

Key parameters:
    - num_k = 150, n_anions = 100, pump_rate = 0.05
    - electric_strength = 0.05  (anion attraction leftward)
    - electrode_charge = 0.0    ← change this to explore reversal

Output:
    - Saves 'reversal_potential.mp4' in the working directory.

Conceptual focus (Lesson 13 — Reversal Potential):
    The reversal potential is the membrane voltage at which net ion flux
    through a channel is zero — the electrode balances the electrochemical
    gradient perfectly.
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

electric_strength = 0.05     # leftward drift magnitude (anion attraction)
electrode_charge  = 0.0      # student adjusts: +0.05 (pushes out), -0.05 (pulls in)
pump_rate         = 0.05     # probability of K⁺ pump event per step
n_anions          = 100      # fixed negative anions inside

COLOR_K   = '#9fff6a'
k_channel = (-14, 14)        # K⁺ channel gap

# ── Fixed anion positions ─────────────────────────────────────────────────────
np.random.seed(33)
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

# ── Initial conditions: K⁺ equal on both sides (pump will build gradient) ─────
x    = np.zeros((N, num_k))
y    = np.zeros((N, num_k))
half = num_k // 2
x[0, :half]  = left_x(half)
x[0, half:]  = right_x(num_k - half)
y[0]         = rand_y(num_k)

# Track potential proxies
V_m_trace = np.zeros(N)
E_K_trace = np.zeros(N)

def compute_potentials(xi):
    n_in  = np.sum(xi < left_wall)
    n_out = np.sum(xi > right_wall)
    V_m   = (n_in - n_anions) - n_out                        # net charge proxy
    E_K   = np.log((n_out + 0.5) / (n_in + 0.5)) * 20       # Nernst proxy (scaled)
    return V_m, E_K

V_m_trace[0], E_K_trace[0] = compute_potentials(x[0])

# ── Simulation loop ───────────────────────────────────────────────────────────
for i in range(1, N):
    dxdt = np.random.normal(0.0, 0.5, num_k)
    dydt = np.random.normal(0.0, 0.5, num_k)

    # Anion attraction (leftward) plus electrode force
    dxdt -= electric_strength
    dxdt += electrode_charge   # positive → rightward push (depolarising)

    new_x = x[i-1] + dxdt * dt
    new_y = y[i-1] + dydt * dt
    new_y = np.clip(new_y, -box_height / 2, box_height / 2)
    new_x = np.clip(new_x, -box_width  / 2, box_width  / 2)

    # K⁺-selective channel crossing check
    cross_lr = (x[i-1] > right_wall) & (new_x <= right_wall)
    cross_rl = (x[i-1] < left_wall)  & (new_x >= left_wall)
    trying   = cross_lr | cross_rl
    in_ch    = (y[i-1] >= k_channel[0]) & (y[i-1] <= k_channel[1])
    blocked  = trying & ~in_ch
    new_x[blocked] = x[i-1][blocked]

    x[i] = new_x
    y[i] = new_y

    # Pump: return one K⁺ from outside to inside each pump event
    if np.random.rand() < pump_rate:
        k_out = np.where(x[i] > right_wall)[0]
        if len(k_out) > 0:
            idx = np.random.choice(k_out)
            x[i][idx] = left_x(1)[0]
            y[i][idx] = rand_y(1)[0]

    V_m_trace[i], E_K_trace[i] = compute_potentials(x[i])

# ── Figure setup ──────────────────────────────────────────────────────────────
fig, (ax_box, ax_vm) = plt.subplots(1, 2, figsize=(12, 5))
title = (f"Reversal Potential — electrode_charge = {electrode_charge:+.3f}  "
         f"|  pump_rate = {pump_rate}")
fig.suptitle(title, fontsize=10)

ax_box.scatter(anion_x, anion_y, s=12, marker='s', color='#888888',
               alpha=0.7, zorder=1)
scat = ax_box.scatter(x[0], y[0], s=9, color=COLOR_K, zorder=2)
ax_box.set_xlim(-box_width / 2, box_width / 2)
ax_box.set_ylim(-box_height / 2, box_height / 2)
ax_box.set_xticks([]); ax_box.set_yticks([])
ax_box.set_title("K⁺ (lime) — pump keeps gradient; electrode shifts flux")

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

# V_m and Nernst proxy traces
vm_all = np.concatenate([V_m_trace, E_K_trace])
pad    = (np.max(vm_all) - np.min(vm_all)) * 0.15 + 5
line_vm, = ax_vm.plot([], [], color='navy',      lw=1.5, label='V_m (charge proxy)')
line_ek, = ax_vm.plot([], [], color='darkorange', lw=1.5, linestyle='--',
                       label='E_K (Nernst proxy, scaled)')
ax_vm.axhline(0, color='gray', linestyle=':', lw=0.8)
ax_vm.set_xlim(0, T)
ax_vm.set_ylim(np.min(vm_all) - pad, np.max(vm_all) + pad)
ax_vm.set_xlabel("Time (ms)")
ax_vm.set_ylabel("Potential proxy (arb. units)")
ax_vm.set_title("V_m relative to Nernst potential")
ax_vm.legend()

time_vals, vm_vals, ek_vals = [], [], []

def update(frame):
    scat.set_offsets(np.c_[x[frame], y[frame]])
    time_vals.append(t[frame])
    vm_vals.append(V_m_trace[frame])
    ek_vals.append(E_K_trace[frame])
    line_vm.set_data(time_vals, vm_vals)
    line_ek.set_data(time_vals, ek_vals)
    return scat, line_vm, line_ek

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("reversal_potential.mp4", writer="ffmpeg", fps=30)
