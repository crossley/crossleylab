"""
Selective-channel electro-diffusion with repulsion toward a fixed negative attractor.

This script simulates two particle species diffusing in 2D within a box that is
split into left/right compartments by a central wall (membrane). Particles
start on the *right* side and can cross to the left only through channels that
are selective by particle type.

Dynamics per timestep combine:
    1) Brownian motion: Gaussian random steps in x and y.
    2) Electrical drift: attraction toward a fixed negative “source” located on
       the left side (neg_charge_pos), scaled by electric_strength.
    3) Mutual repulsion: a simple pairwise repulsion term (∝ 1 / r^2) computed
       from all other particles, scaled by repulsion_strength, which discourages
       clustering and introduces crowding effects.

Channel selectivity:
    - Each particle is randomly assigned a type (0 or 1) and coloured accordingly.
    - Type 0 (orange) may cross only through a very narrow *top* channel:
          y in [30, 31]
    - Type 1 (blue) may cross only through a wider *bottom* channel:
          y in [-40, -10]
    - If a particle attempts to cross the wall outside its allowed y-window,
      its x-position is reverted (blocked/reflected).

Other constraints / simplifications:
    - Top/bottom boundaries: y is clamped to [-box_height/2, box_height/2].
    - Electrical attraction is a distance-normalised drift toward a point
      (heuristic; not a full electrostatics field solver).
    - Repulsion is computed with an O(N^2) loop (fine for ~200 particles).

Visual output:
    - Draws membrane segments plus coloured translucent channel regions.
    - Shows a legend for both ion types and the negative attractor (red dot).
    - Saves 'selective_channels_gradient.mp4' using ffmpeg.

Conceptual focus:
    - Combining diffusion, electrical bias, and crowding with selective
      permeability to produce type-dependent flux across a membrane-like barrier.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.lines import Line2D

# Simulation parameters
T = 1000
dt = 1.0
t = np.arange(0, T, dt)
N = len(t)
num_particles = 200
box_width = 100
box_height = 100  # increased to comfortably fit both channels
wall_thickness = 4
left_wall = -wall_thickness / 2
right_wall = wall_thickness / 2

# Strengths
electric_strength = 0.1
repulsion_strength = 0.05

# Channel positions and selectivity
channel_config = {
    0: (30, 31),    # Type 0: red → top channel
    1: (-40, -10)   # Type 1: blue → bottom channel
}

# Color assignment
types = np.random.choice([0, 1], size=num_particles)
colors = np.array(['orange' if t == 0 else 'blue' for t in types])

# Fixed negative attractor
neg_charge_pos = np.array([-box_width/2 + 20, 0])

# Initialize particles on right
def init_particles():
    x0 = np.random.uniform(right_wall + 1, box_width/2 - 1, num_particles)
    y0 = np.random.uniform(-box_height/2 + 1, box_height/2 - 1, num_particles)
    return x0, y0

def simulate_selective_channels():
    x = np.zeros((N, num_particles))
    y = np.zeros((N, num_particles))
    x[0], y[0] = init_particles()

    for i in range(1, N):
        dxdt = np.random.normal(0.0, 0.5, num_particles)
        dydt = np.random.normal(0.0, 0.5, num_particles)

        # Attraction to fixed negative source
        diff_x = neg_charge_pos[0] - x[i-1]
        diff_y = neg_charge_pos[1] - y[i-1]
        dist = np.sqrt(diff_x**2 + diff_y**2) + 1e-3
        attract_x = electric_strength * diff_x / dist
        attract_y = electric_strength * diff_y / dist

        # Repulsion from other particles
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

        # Total movement
        total_dx = dxdt + attract_x + repel_x
        total_dy = dydt + attract_y + repel_y

        new_x = x[i-1] + total_dx * dt
        new_y = y[i-1] + total_dy * dt
        new_y = np.clip(new_y, -box_height/2, box_height/2)

        # Channel selectivity check
        channel_min = np.array([channel_config[t][0] for t in types])
        channel_max = np.array([channel_config[t][1] for t in types])
        in_channel = (y[i-1] >= channel_min) & (y[i-1] <= channel_max)

        # Wall crossing
        trying_to_cross_left = (x[i-1] > right_wall) & (new_x <= right_wall)
        trying_to_cross_right = (x[i-1] < left_wall) & (new_x >= left_wall)
        trying_to_cross = trying_to_cross_left | trying_to_cross_right
        reflect = trying_to_cross & ~in_channel
        new_x[reflect] = x[i-1][reflect]

        x[i] = new_x
        y[i] = new_y

    return x, y

# Run simulation
x_sel, y_sel = simulate_selective_channels()

# Plotting
fig, ax = plt.subplots(figsize=(8, 6))
scat = ax.scatter(x_sel[0], y_sel[0], s=10, c=colors)
ax.set_xlim(-box_width/2, box_width/2)
ax.set_ylim(-box_height/2, box_height/2)
ax.set_title("Ion-Specific Channels + Repulsion + Gradient")

# Draw selective channels with matching shading
def draw_environment():
    for ion_type, (ymin, ymax) in channel_config.items():
        color = 'orange' if ion_type == 0 else 'blue'
        if ymin > -box_height/2:
            ax.plot([left_wall, left_wall], [-box_height/2, ymin], 'k-')
            ax.plot([right_wall, right_wall], [-box_height/2, ymin], 'k-')
        if ymax < box_height/2:
            ax.plot([left_wall, left_wall], [ymax, box_height/2], 'k-')
            ax.plot([right_wall, right_wall], [ymax, box_height/2], 'k-')
        ax.axvspan(left_wall, right_wall,
                   (ymin + box_height/2) / box_height,
                   (ymax + box_height/2) / box_height,
                   color=color, alpha=0.2)

draw_environment()
ax.plot(*neg_charge_pos, 'ro', markersize=8)  # red for negative charge

legend_elements = [
    Line2D([0], [0], marker='o', color='w', markerfacecolor='orange', label='Ion type A', markersize=6),
    Line2D([0], [0], marker='o', color='w', markerfacecolor='blue', label='Ion type B', markersize=6),
    Line2D([0], [0], marker='o', color='w', markerfacecolor='red', label='Negative attractor', markersize=6)
]
ax.legend(handles=legend_elements, loc='upper left')

# Animation
def update(frame):
    scat.set_offsets(np.c_[x_sel[frame], y_sel[frame]])
    return scat,

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("selective_channels_gradient.mp4", writer="ffmpeg", fps=30)
