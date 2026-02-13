import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# Duration of simulation in ms
T = 1000

# sample rate (ms)
dt = 1.0

# vector of sampled times
t = np.arange(0, T, dt)

# number of samples in total
N = t.shape[0]

# number of particles
num_particles = 100

# state: positions of particles in 2D
x = np.zeros((N, num_particles))
y = np.zeros((N, num_particles))

# initial state (small random cluster)
x[0] = np.random.normal(loc=0.0, scale=0.1, size=num_particles)
y[0] = np.random.normal(loc=0.0, scale=0.1, size=num_particles)

# Euler method: update positions using random walk (Brownian motion)
for i in range(1, N):
    dxdt = np.random.normal(loc=0.0, scale=0.5, size=num_particles)
    dydt = np.random.normal(loc=0.0, scale=0.5, size=num_particles)

    x[i] = x[i-1] + dxdt * dt
    y[i] = y[i-1] + dydt * dt

# Animation setup
fig, ax = plt.subplots()
scat = ax.scatter(x[0], y[0], s=10)
ax.set_xlim(-50, 50)
ax.set_ylim(-50, 50)
ax.set_title("2D Diffusion of Particles")

def update(frame):
    scat.set_offsets(np.c_[x[frame], y[frame]])
    return scat,

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("diffusion_simulation.mp4", writer="ffmpeg", fps=30)
