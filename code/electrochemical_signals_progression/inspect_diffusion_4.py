"""
Ion-specific diffusion through a shared membrane with type-selective channels.

This script simulates 2D Brownian motion of two particle species in a box split
into left/right compartments by a vertical wall (a membrane) centered at x=0.
Particles start on the left side and execute Gaussian random-walk steps. They
may cross the membrane only if, at the moment of attempting to cross, their
y-position lies within a channel region that is specific to their particle
type.

Particle types and channels:
    - Type 0 (red; labelled Na+): allowed to cross only through a very narrow
      channel near the top of the membrane (y in [10, 11]).
    - Type 1 (blue; labelled K+): allowed to cross only through a wider channel
      near the bottom of the membrane (y in [-30, -10]).

Crossing rule:
    - A particle is considered "trying to cross" if its x-step would take it
      across either wall boundary (left_wall or right_wall).
    - If it tries to cross outside its allowed y-window, the x-position is
      reverted (blocked/reflected), keeping it on its original side.

Other constraints:
    - Top/bottom boundaries: y is clamped into [-box_height/2, box_height/2].
    - No electrical forces, concentration gradients, or particle interactions
      are included: this is purely diffusion + selective permeability.

Visual output:
    - Particles are coloured by type (red/blue).
    - The wall is drawn with coloured translucent spans marking each channel.
    - Saves 'ion_specific_diffusion.mp4' using ffmpeg.

Conceptual focus:
    - Selective permeability: different species experience different effective
      permeability depending on channel placement/width.
    - Even with identical diffusion dynamics, channel selectivity produces
      different cross-membrane flux for each species.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# Simulation parameters
T = 1000
dt = 3.0
t = np.arange(0, T, dt)
N = len(t)
num_particles = 500
box_width = 100
box_height = 80
wall_thickness = 4
left_wall = -wall_thickness / 2
right_wall = wall_thickness / 2

# Particle types: 0 = red (Na+), 1 = blue (K+)
types = np.random.choice([0, 1], size=num_particles)
colors = np.array(['red' if t == 0 else 'blue' for t in types])

# Channels for each type: (y_min, y_max)
channels = {
    0: (10, 11),     # Red (narrow, top)
    1: (-30, -10)    # Blue (wide, bottom)
}

# Initialize positions
x = np.zeros((N, num_particles))
y = np.zeros((N, num_particles))
x[0] = np.random.uniform(-box_width/2 + 1,  -wall_thickness / 2 - 1, size=num_particles)
y[0] = np.random.uniform(-box_height/2 + 1, box_height/2 - 1, size=num_particles)

# Simulation loop
for i in range(1, N):
    dxdt = np.random.normal(0, 0.5, num_particles)
    dydt = np.random.normal(0, 0.5, num_particles)

    new_x = x[i-1] + dxdt * dt
    new_y = y[i-1] + dydt * dt
    new_y = np.clip(new_y, -box_height/2, box_height/2)

    # Check who is trying to cross
    trying_to_cross_left = (x[i-1] < left_wall) & (new_x >= left_wall)
    trying_to_cross_right = (x[i-1] > right_wall) & (new_x <= right_wall)
    trying_to_cross = trying_to_cross_left | trying_to_cross_right

    # Get their allowed channel bounds based on type
    channel_min = np.array([channels[t][0] for t in types])
    channel_max = np.array([channels[t][1] for t in types])
    in_channel = (y[i-1] >= channel_min) & (y[i-1] <= channel_max)

    # Reflect those trying to cross outside their type-specific channel
    reflect = trying_to_cross & ~in_channel
    new_x[reflect] = x[i-1][reflect]

    x[i] = new_x
    y[i] = new_y

# Animation setup
fig, ax = plt.subplots(figsize=(8, 6))
scat = ax.scatter(x[0], y[0], s=10, c=colors)
ax.set_xlim(-box_width/2, box_width/2)
ax.set_ylim(-box_height/2, box_height/2)
ax.set_xticks([])
ax.set_yticks([])
ax.set_title("Ion-Specific Diffusion Through Channels")

# Draw walls and channels
def draw_environment():
    for t, (ymin, ymax) in channels.items():
        # Wall segments above and below the channel
        if ymin > -box_height/2:
            ax.plot([left_wall, left_wall], [-box_height/2, ymin], 'k-')
            ax.plot([right_wall, right_wall], [-box_height/2, ymin], 'k-')
        if ymax < box_height/2:
            ax.plot([left_wall, left_wall], [ymax, box_height/2], 'k-')
            ax.plot([right_wall, right_wall], [ymax, box_height/2], 'k-')

        # Color for the channel: red or blue
        channel_color = 'red' if t == 0 else 'blue'

        # Convert y-values to fraction of height for axvspan (normalized coords)
        ax.axvspan(
            left_wall, right_wall,
            (ymin + box_height / 2) / box_height,
            (ymax + box_height / 2) / box_height,
            color=channel_color, alpha=0.2
        )

draw_environment()

def update(frame):
    scat.set_offsets(np.c_[x[frame], y[frame]])
    return scat,

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("ion_specific_diffusion.mp4", writer="ffmpeg", fps=30)
