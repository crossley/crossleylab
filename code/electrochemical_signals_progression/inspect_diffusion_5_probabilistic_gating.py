"""
Probabilistic channel gating: permeability as open probability.

This script simulates 2D Brownian diffusion of particles in a box split into
left and right compartments by a central membrane. Particles start entirely on
the right side. A single gap in the membrane (channel) allows crossing between
compartments, but only when the channel is open.

At each timestep the channel state is resampled independently from a Bernoulli
distribution with parameter open_prob (no memory between steps). A particle
may cross the membrane only when (a) its y-position falls inside the channel
gap and (b) the channel is open at that step.

Model assumptions / simplifications:
    - Pure diffusion (Gaussian random walk, no external forces).
    - Channel gating is independent of particle identity and position history.
    - Wall reflections: blocked particles have their x-position reverted to the
      previous step; y is still updated.
    - Top/bottom boundaries: y is clamped to [-box_height/2, box_height/2].

Key parameters:
    - open_prob = 0.3   : probability the channel is open each timestep
    - channel_y_lo/hi   : y-extent of the single channel gap
    - num_particles = 200
    - T = 1000 ms, dt = 1 ms

Output:
    - Saves 'diffusion_probabilistic_gating.mp4' in the working directory.

Conceptual focus (Lesson 3 — Permeability as Probability):
    Even with low open_prob the system reaches the same equilibrium fraction
    of 0.5 on each side — permeability controls the rate, not the endpoint.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# ── Simulation parameters ─────────────────────────────────────────────────────
T            = 1000
dt           = 1.0
t            = np.arange(0, T, dt)
N            = len(t)
num_particles = 200
box_width    = 100
box_height   = 80
wall_thick   = 4
left_wall    = -wall_thick / 2
right_wall   =  wall_thick / 2

# Probabilistic gating
open_prob    = 0.3    # fraction of time channel is open (independent each step)
channel_y_lo = -8.0  # lower edge of channel gap
channel_y_hi =  8.0  # upper edge of channel gap

# ── Initial conditions: all particles on the right side ───────────────────────
x    = np.zeros((N, num_particles))
y    = np.zeros((N, num_particles))
x[0] = np.random.uniform(right_wall + 1, box_width / 2 - 1, num_particles)
y[0] = np.random.uniform(-box_height / 2 + 1, box_height / 2 - 1, num_particles)

# Pre-sample channel open/closed state for every timestep
channel_open = np.random.rand(N) < open_prob  # True = open

# Track fraction of particles that have reached the left side
frac_left    = np.zeros(N)
frac_left[0] = np.mean(x[0] < 0)

# ── Simulation loop (Euler / random walk) ─────────────────────────────────────
for i in range(1, N):
    dxdt = np.random.normal(0.0, 0.5, num_particles)
    dydt = np.random.normal(0.0, 0.5, num_particles)

    new_x = x[i-1] + dxdt * dt
    new_y = y[i-1] + dydt * dt
    new_y = np.clip(new_y, -box_height / 2, box_height / 2)

    # Identify particles trying to cross either face of the membrane
    cross_lr = (x[i-1] > right_wall) & (new_x <= right_wall)
    cross_rl = (x[i-1] < left_wall)  & (new_x >= left_wall)
    trying   = cross_lr | cross_rl

    # Passage allowed only when channel is open AND particle is in the gap
    in_gap  = (y[i-1] >= channel_y_lo) & (y[i-1] <= channel_y_hi)
    blocked = trying & ~(channel_open[i] & in_gap)
    new_x[blocked] = x[i-1][blocked]   # revert blocked particles to last x

    x[i]        = new_x
    y[i]        = new_y
    frac_left[i] = np.mean(x[i] < 0)

# ── Figure and axes ───────────────────────────────────────────────────────────
fig, (ax_box, ax_frac) = plt.subplots(1, 2, figsize=(11, 5))
fig.suptitle("Probabilistic Gating — Permeability as Open Probability", fontsize=11)

scat = ax_box.scatter(x[0], y[0], s=8, color='steelblue')
# Green line segment in the gap drawn when channel is open
gate_line, = ax_box.plot([], [], color='limegreen', lw=5, solid_capstyle='round')

ax_box.set_xlim(-box_width / 2, box_width / 2)
ax_box.set_ylim(-box_height / 2, box_height / 2)
ax_box.set_xticks([])
ax_box.set_yticks([])
ax_box.set_title(f"open_prob = {open_prob}   (green = open channel)")

# Draw membrane wall with gap at the channel position
for side in [left_wall, right_wall]:
    ax_box.plot([side, side], [-box_height / 2, channel_y_lo], 'k-', lw=1.5)
    ax_box.plot([side, side], [channel_y_hi,  box_height / 2], 'k-', lw=1.5)

# Light highlight of the gap region so it is visible even when closed
ax_box.axvspan(left_wall, right_wall,
               (channel_y_lo + box_height / 2) / box_height,
               (channel_y_hi + box_height / 2) / box_height,
               color='limegreen', alpha=0.12)

# ── Right panel: fraction on left over time ───────────────────────────────────
line_frac, = ax_frac.plot([], [], color='steelblue', lw=1.5)
ax_frac.axhline(0.5, color='gray', linestyle='--', lw=1, label='Equilibrium (0.5)')
ax_frac.set_xlim(0, T)
ax_frac.set_ylim(-0.05, 1.05)
ax_frac.set_xlabel("Time (ms)")
ax_frac.set_ylabel("Fraction on left side")
ax_frac.set_title("Convergence to Equilibrium")
ax_frac.legend()

time_vals = []
frac_vals = []

def update(frame):
    scat.set_offsets(np.c_[x[frame], y[frame]])

    # Illuminate the gap when the channel is open this frame
    if channel_open[frame]:
        gate_line.set_data([0, 0], [channel_y_lo, channel_y_hi])
    else:
        gate_line.set_data([], [])

    time_vals.append(t[frame])
    frac_vals.append(frac_left[frame])
    line_frac.set_data(time_vals, frac_vals)
    return scat, gate_line, line_frac

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("diffusion_probabilistic_gating.mp4", writer="ffmpeg", fps=30)
