"""
Skeleton: 2D Brownian diffusion (no barriers, no forces).

Your task is to fill in the particle position update inside the simulation
loop. Work through the steps in the lab guide as you go:

    guides/lesson_01_free_diffusion.html

Do not change anything outside the marked TODO sections on your first pass.
Once the simulation runs correctly, try the parameter explorations described
in the lab guide.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# ---------------------------------------------------------------------------
# Parameters — read these carefully before filling in the TODOs below.
# ---------------------------------------------------------------------------

# Total simulated time (ms)
T = 1000

# Timestep: how much time passes on each loop iteration (ms)
dt = 1.0

# Vector of time samples: [0, 1, 2, ..., T-dt]
t = np.arange(0, T, dt)

# Total number of timesteps
N = t.shape[0]

# Number of particles
num_particles = 100

# Diffusion rate: controls how far each particle moves per timestep
diffusion_sd = 0.5

# ---------------------------------------------------------------------------
# State: arrays to store particle positions at every timestep
# ---------------------------------------------------------------------------

# x[i] holds the x-coordinate of every particle at timestep i
x = np.zeros((N, num_particles))

# y[i] holds the y-coordinate of every particle at timestep i
y = np.zeros((N, num_particles))

# Initial condition: all particles start in a small cluster at the origin
x[0] = np.random.normal(loc=0.0, scale=0.1, size=num_particles)
y[0] = np.random.normal(loc=0.0, scale=0.1, size=num_particles)

# ---------------------------------------------------------------------------
# Simulation loop
# ---------------------------------------------------------------------------

for i in range(1, N):

    # Draw a random displacement for each particle in x and y.
    # Each displacement is drawn from a Normal distribution with mean 0
    # and standard deviation diffusion_sd.
    dxdt = np.random.normal(loc=0.0, scale=diffusion_sd, size=num_particles)
    dydt = np.random.normal(loc=0.0, scale=diffusion_sd, size=num_particles)

    # -----------------------------------------------------------------------
    # TODO (Step 1 — try this first, then read Step 2 before fixing it):
    #
    #   Set x[i] and y[i] using only the random displacements:
    #
    #       x[i] = dxdt
    #       y[i] = dydt
    #
    #   Run the script. Watch the animation. What is wrong?
    # -----------------------------------------------------------------------

    # -----------------------------------------------------------------------
    # TODO (Step 2 — the correct Euler update):
    #
    #   Each particle's new position should be its OLD position plus the
    #   random displacement. Replace the lines above with:
    #
    #       x[i] = x[i-1] + dxdt * dt
    #       y[i] = y[i-1] + dydt * dt
    #
    #   The previous position x[i-1] acts as an anchor — particles remember
    #   where they were. Run it again. This is Brownian motion.
    # -----------------------------------------------------------------------

    pass  # remove this line once you have filled in the update above

# ---------------------------------------------------------------------------
# Animation — do not modify below this line
# ---------------------------------------------------------------------------

fig, ax = plt.subplots()
scat = ax.scatter(x[0], y[0], s=10)
ax.set_xlim(-50, 50)
ax.set_ylim(-50, 50)
ax.set_xticks([])
ax.set_yticks([])
ax.set_title("2D Diffusion of Particles")


def update(frame):
    scat.set_offsets(np.c_[x[frame], y[frame]])
    return scat,


ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("diffusion_simulation.mp4", writer="ffmpeg", fps=30)
