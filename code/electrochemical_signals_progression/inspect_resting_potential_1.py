"""
Toy “resting potential” simulation with a transient depolarizing input.

This script simulates ion-like particles moving in a 2D box split into left and
right compartments by a central membrane (a vertical wall) containing a single
shared channel (channel_y_range). Particle motion combines:

    1) Brownian motion (Gaussian diffusion with diffusion_sd),
    2) attraction toward a fixed negative source on the left (neg_charge_pos),
    3) mutual particle–particle repulsion (∝ 1 / r^2),
    4) a *temporary* depolarizing input: during the middle third of the run,
       a positive “source” at the same location as the negative source repels
       particles (depol_start → depol_end), opposing the baseline attraction.

Geometry / membrane rule:
    - Particles can cross the membrane only through the channel opening
      channel_y_range = (-10, 10).
    - If a particle attempts to cross the wall outside the channel, its x-step
      is blocked by reverting x (reflection).

Initial condition:
    - Particles are split across both sides (≈65% left, ≈35% right) and
      clustered near the channel in y to encourage exchange across the pore.

Membrane potential proxy:
    - A simple “membrane potential” time series is computed each timestep as
      the negative of (count_left - count_right), where counts are determined
      by whether particles lie fully left of left_wall or right of right_wall.
      This is a qualitative charge-imbalance indicator, not a biophysical
      voltage in physical units.

Visual output:
    - Left panel: particle motion with membrane + channel drawn; the permanent
      negative source shown as a red dot; the depolarizing input shown as a
      green dot only during its active window.
    - Right panel: membrane potential proxy plotted over time as the animation
      progresses.
    - Saves 'resting_potential_simulation.mp4' using ffmpeg.

Conceptual focus:
    - How diffusion + electrical bias + crowding can produce a steady imbalance
      across a membrane-like barrier.
    - How a transient opposing drive (depolarizing input) perturbs that balance
      and how the system relaxes afterward.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.lines import Line2D

# Simulation parameters
T = 3000
dt = 1
t = np.arange(0, T, dt)
N = len(t)
num_particles = 200
box_width = 200
box_height = 200
wall_thickness = 4
left_wall = -wall_thickness / 2
right_wall = wall_thickness / 2

# Forces
electric_strength_depol = 0.2
electric_strength = 0.1
repulsion_strength = 0.05

diffusion_sd = 0.1

# Channel range (same for all)
channel_y_range = (-10, 10)

# Fixed negative attractor (permanent)
neg_charge_pos = np.array([-box_width/2 + 20, 0])

# Temporary depolarizing (positive) input (same location)
depol_charge_pos = neg_charge_pos.copy()
depol_start = int(N / 3)
depol_end = int(2 * N / 3)

# Initialize particle positions on the right side
def init_particles():
    n_left = int(num_particles * 0.65)
    n_right = num_particles - n_left

    # Cluster near the channel (for realism)
    y_left = np.random.uniform(low=channel_y_range[0] - 5, high=channel_y_range[1] + 5, size=n_left)
    y_right = np.random.uniform(low=channel_y_range[0] - 5, high=channel_y_range[1] + 5, size=n_right)

    x_left = np.random.uniform(low=-box_width/2 + 1, high=left_wall - 1, size=n_left)
    x_right = np.random.uniform(low=right_wall + 1, high=box_width/2 - 1, size=n_right)

    x0 = np.concatenate([x_left, x_right])
    y0 = np.concatenate([y_left, y_right])
    return x0, y0


def simulate():
    x = np.zeros((N, num_particles))
    y = np.zeros((N, num_particles))
    x[0], y[0] = init_particles()
    membrane_potential = np.zeros(N)

    for i in range(1, N):
        dxdt = np.random.normal(0.0, diffusion_sd, num_particles)
        dydt = np.random.normal(0.0, diffusion_sd, num_particles)

        # Base attraction to negative source
        diff_x = neg_charge_pos[0] - x[i-1]
        diff_y = neg_charge_pos[1] - y[i-1]
        dist = np.sqrt(diff_x**2 + diff_y**2) + 1e-3
        attract_x = electric_strength * diff_x / dist
        attract_y = electric_strength * diff_y / dist

        # Repulsion
        repel_x = np.zeros(num_particles)
        repel_y = np.zeros(num_particles)
        for j in range(num_particles):
            dx = x[i-1][j] - x[i-1]
            dy = y[i-1][j] - y[i-1]
            d2 = dx**2 + dy**2 + 1e-3
            inv_d2 = 1 / d2
            inv_d2[j] = 0
            repel_x[j] = repulsion_strength * np.sum(dx * inv_d2)
            repel_y[j] = repulsion_strength * np.sum(dy * inv_d2)

        # Depolarizing input during middle third (positive source repels particles)
        if depol_start <= i <= depol_end:
            depol_dx = x[i-1] - depol_charge_pos[0]
            depol_dy = y[i-1] - depol_charge_pos[1]
            depol_dist = np.sqrt(depol_dx**2 + depol_dy**2) + 1e-3
            depol_force_x = electric_strength_depol * depol_dx / depol_dist
            depol_force_y = electric_strength_depol * depol_dy / depol_dist
        else:
            depol_force_x = 0
            depol_force_y = 0

        total_dx = dxdt + attract_x + repel_x + depol_force_x
        total_dy = dydt + attract_y + repel_y + depol_force_y

        new_x = x[i-1] + total_dx * dt
        new_y = y[i-1] + total_dy * dt
        new_y = np.clip(new_y, -box_height/2, box_height/2)

        # Channel logic
        in_channel = (y[i-1] >= channel_y_range[0]) & (y[i-1] <= channel_y_range[1])
        trying_to_cross_left = (x[i-1] > right_wall) & (new_x <= right_wall)
        trying_to_cross_right = (x[i-1] < left_wall) & (new_x >= left_wall)
        trying_to_cross = trying_to_cross_left | trying_to_cross_right
        reflect = trying_to_cross & ~in_channel
        new_x[reflect] = x[i-1][reflect]

        x[i] = new_x
        y[i] = new_y

        # Membrane potential = count left - count right
        count_left = np.sum(x[i] < left_wall)
        count_right = np.sum(x[i] > right_wall)
        membrane_potential[i] = -(count_left - count_right)

    return x, y, membrane_potential

# Run simulation
x_data, y_data, V_data = simulate()

# Set up plot
fig, (ax_particles, ax_potential) = plt.subplots(1, 2, figsize=(12, 6))

# Left panel: particles
scat = ax_particles.scatter(x_data[0], y_data[0], s=10, color='orange')
ax_particles.set_xlim(-box_width/2, box_width/2)
ax_particles.set_ylim(-box_height/2, box_height/2)
ax_particles.set_title("Ion Movement with Channel")

# Draw channel and permanent negative source
def draw_environment():
    ymin, ymax = channel_y_range
    if ymin > -box_height/2:
        ax_particles.plot([left_wall, left_wall], [-box_height/2, ymin], 'k-')
        ax_particles.plot([right_wall, right_wall], [-box_height/2, ymin], 'k-')
    if ymax < box_height/2:
        ax_particles.plot([left_wall, left_wall], [ymax, box_height/2], 'k-')
        ax_particles.plot([right_wall, right_wall], [ymax, box_height/2], 'k-')
    ax_particles.axvspan(left_wall, right_wall,
                         (ymin + box_height/2) / box_height,
                         (ymax + box_height/2) / box_height,
                         color='gray', alpha=0.2)

draw_environment()
ax_particles.plot(*neg_charge_pos, 'ro', markersize=8, label='Neg charge')
depol_marker, = ax_particles.plot([], [], 'go', markersize=12, label='Depolarizing input')
ax_particles.legend(loc='upper right')

# Right panel: membrane potential
line, = ax_potential.plot([], [], color='purple')
ax_potential.set_xlim(0, T)
ax_potential.set_ylim(-num_particles/2, num_particles/2)
ax_potential.set_xlabel("Time (ms)")
ax_potential.set_ylabel("Membrane Potential (Δcharge)")
ax_potential.set_title("Membrane Potential Over Time")
time_vals = []
voltage_vals = []

# Animation update
def update(frame):
    scat.set_offsets(np.c_[x_data[frame], y_data[frame]])

    if depol_start <= frame <= depol_end:
        depol_marker.set_data(*depol_charge_pos)
    else:
        depol_marker.set_data([], [])  # hide

    time_vals.append(t[frame])
    voltage_vals.append(V_data[frame])
    line.set_data(time_vals, voltage_vals)

    return scat, depol_marker, line

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("resting_potential_simulation.mp4", writer="ffmpeg", fps=30)
