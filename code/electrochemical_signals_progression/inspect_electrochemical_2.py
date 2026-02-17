"""
Electrically biased diffusion with particle–particle repulsion through a channel.

This script simulates a population of (conceptually) positive ions moving in a
2D box split into left/right compartments by a central wall (membrane) with a
single open channel (channel_y_range). Particles start on the right side and
move each timestep according to three components:

    1) Brownian motion: independent Gaussian noise in x and y.
    2) Electrical attraction: drift toward a fixed negative point charge
       (neg_charge_pos), scaled by electric_strength and normalised by distance.
    3) Mutual repulsion: a simple pairwise repulsive term computed for each
       particle from all others, scaled by repulsion_strength and decaying with
       squared distance (∝ 1 / r^2). This prevents unrealistic clustering near
       the attractor and introduces crowding/spacing effects.

Crossing rule (membrane + channel):
    - Particles may cross the wall only when their y-position lies within
      channel_y_range = (-10, 10).
    - If a particle attempts to cross outside that opening, its x-position is
      reverted (blocked/reflected), keeping it on the original side.

Other constraints / simplifications:
    - Top/bottom boundaries: y is clamped to [-box_height/2, box_height/2].
    - Forces are heuristic “cartoon physics” (not a full electrostatics solver).
    - Repulsion is computed with an O(N^2) loop (fine for 100 particles, but
      becomes slow for much larger counts).

Visual output:
    - Animates particle motion with the membrane/channel drawn and the negative
      charge marked as a blue dot.
    - Saves 'repulsion_and_gradient.mp4' using ffmpeg.

Conceptual focus:
    - Diffusion + external electrical drift produces directed transport.
    - Adding repulsion yields more realistic spatial distributions by resisting
      aggregation around the attractor and reducing particle crowding.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# Simulation parameters
T = 1000
dt = 1.0
t = np.arange(0, T, dt)
N = len(t)
num_particles = 100
box_width = 100
box_height = 60
wall_thickness = 4
left_wall = -wall_thickness / 2
right_wall = wall_thickness / 2

# Position of fixed negative charge (attractor)
neg_charge_pos = np.array([-box_width/2 + 15, 0])

# Channel range (open to all)
channel_y_range = (-10, 10)

# Strength of forces
electric_strength = 0.3
repulsion_strength = 0.2

# Initialize particles on the right
def init_particles():
    x0 = np.random.uniform(right_wall + 1, box_width/2 - 1, num_particles)
    y0 = np.random.uniform(-box_height/2 + 1, box_height/2 - 1, num_particles)
    return x0, y0

def simulate_with_repulsion():
    x = np.zeros((N, num_particles))
    y = np.zeros((N, num_particles))
    x[0], y[0] = init_particles()

    for i in range(1, N):
        # Brownian noise
        dxdt = np.random.normal(0.0, 0.5, num_particles)
        dydt = np.random.normal(0.0, 0.5, num_particles)

        # Attraction to negative point
        diff_x = neg_charge_pos[0] - x[i-1]
        diff_y = neg_charge_pos[1] - y[i-1]
        dist = np.sqrt(diff_x**2 + diff_y**2) + 1e-3
        attract_x = electric_strength * diff_x / dist
        attract_y = electric_strength * diff_y / dist

        # Initialize repulsive force
        repel_x = np.zeros(num_particles)
        repel_y = np.zeros(num_particles)

        for j in range(num_particles):
            dx = x[i-1][j] - x[i-1]
            dy = y[i-1][j] - y[i-1]
            d2 = dx**2 + dy**2 + 1e-3  # avoid divide by zero
            inv_d2 = 1 / d2
            inv_d2[j] = 0  # don't self-repel

            fx = repulsion_strength * np.sum(dx * inv_d2)
            fy = repulsion_strength * np.sum(dy * inv_d2)

            repel_x[j] = fx
            repel_y[j] = fy

        # Combine forces
        total_dx = dxdt + attract_x + repel_x
        total_dy = dydt + attract_y + repel_y

        new_x = x[i-1] + total_dx * dt
        new_y = y[i-1] + total_dy * dt
        new_y = np.clip(new_y, -box_height/2, box_height/2)

        # Wall with central channel
        trying_to_cross_left = (x[i-1] > right_wall) & (new_x <= right_wall)
        trying_to_cross_right = (x[i-1] < left_wall) & (new_x >= left_wall)
        trying_to_cross = trying_to_cross_left | trying_to_cross_right

        in_channel = (y[i-1] >= channel_y_range[0]) & (y[i-1] <= channel_y_range[1])
        reflect = trying_to_cross & ~in_channel
        new_x[reflect] = x[i-1][reflect]

        x[i] = new_x
        y[i] = new_y

    return x, y

# Run simulation
x_rep, y_rep = simulate_with_repulsion()

# Plotting
fig, ax = plt.subplots(figsize=(8, 6))
scat = ax.scatter(x_rep[0], y_rep[0], s=10, color='orange')
ax.set_xlim(-box_width/2, box_width/2)
ax.set_ylim(-box_height/2, box_height/2)
ax.set_title("Positive Ions with Repulsion + Electrical Gradient")

# Draw walls and channel
def draw_environment():
    ymin, ymax = channel_y_range
    if ymin > -box_height/2:
        ax.plot([left_wall, left_wall], [-box_height/2, ymin], 'k-')
        ax.plot([right_wall, right_wall], [-box_height/2, ymin], 'k-')
    if ymax < box_height/2:
        ax.plot([left_wall, left_wall], [ymax, box_height/2], 'k-')
        ax.plot([right_wall, right_wall], [ymax, box_height/2], 'k-')
    ax.axvspan(left_wall, right_wall,
               (ymin + box_height/2) / box_height,
               (ymax + box_height/2) / box_height,
               color='gray', alpha=0.2)

draw_environment()
ax.plot(*neg_charge_pos, 'bo', markersize=8)

def update(frame):
    scat.set_offsets(np.c_[x_rep[frame], y_rep[frame]])
    return scat,

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("repulsion_and_gradient.mp4", writer="ffmpeg", fps=30)

