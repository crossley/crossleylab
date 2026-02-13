import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# Simulation settings
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

# Initial placement on right side
def init_particles():
    x0 = np.random.uniform(low=right_wall + 1, high=box_width/2 - 1, size=num_particles)
    y0 = np.random.uniform(low=-box_height/2 + 1, high=box_height/2 - 1, size=num_particles)
    return x0, y0

# Channel for both conditions
channel_y_range = (-10, 10)

# Point of fixed negative charge (e.g. attractor location)
neg_charge_pos = np.array([-box_width/2 + 5, 0])  # near far left center

# Simulate diffusion with electrical attraction
def simulate(electric_strength):
    x = np.zeros((N, num_particles))
    y = np.zeros((N, num_particles))
    x[0], y[0] = init_particles()

    for i in range(1, N):
        dxdt = np.random.normal(0.0, 0.5, num_particles)
        dydt = np.random.normal(0.0, 0.5, num_particles)

        # Attraction toward negative point charge
        diff_x = neg_charge_pos[0] - x[i-1]
        diff_y = neg_charge_pos[1] - y[i-1]
        dist = np.sqrt(diff_x**2 + diff_y**2) + 1e-3  # avoid divide by zero

        force_x = electric_strength * diff_x / dist
        force_y = electric_strength * diff_y / dist

        new_x = x[i-1] + (dxdt + force_x) * dt
        new_y = y[i-1] + (dydt + force_y) * dt
        new_y = np.clip(new_y, -box_height/2, box_height/2)

        # Reflect off central wall unless in channel
        trying_to_cross_left = (x[i-1] > right_wall) & (new_x <= right_wall)
        trying_to_cross_right = (x[i-1] < left_wall) & (new_x >= left_wall)
        trying_to_cross = trying_to_cross_left | trying_to_cross_right

        in_channel = (y[i-1] >= channel_y_range[0]) & (y[i-1] <= channel_y_range[1])
        reflect = trying_to_cross & ~in_channel
        new_x[reflect] = x[i-1][reflect]

        x[i] = new_x
        y[i] = new_y

    return x, y

# Run two simulations: weak vs strong field
x_weak, y_weak = simulate(electric_strength=0.001)
x_strong, y_strong = simulate(electric_strength=0.1)

# Setup for 1x2 grid animation
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))
scat1 = ax1.scatter(x_weak[0], y_weak[0], s=10, color='orange')
scat2 = ax2.scatter(x_strong[0], y_strong[0], s=10, color='orange')

for ax in (ax1, ax2):
    ax.set_xlim(-box_width/2, box_width/2)
    ax.set_ylim(-box_height/2, box_height/2)

ax1.set_title("Weak Electrical Gradient")
ax2.set_title("Strong Electrical Gradient")

# Draw wall with central neutral channel
def draw_channel(ax, y_min, y_max):
    if y_min > -box_height/2:
        ax.plot([left_wall, left_wall], [-box_height/2, y_min], 'k-')
        ax.plot([right_wall, right_wall], [-box_height/2, y_min], 'k-')
    if y_max < box_height/2:
        ax.plot([left_wall, left_wall], [y_max, box_height/2], 'k-')
        ax.plot([right_wall, right_wall], [y_max, box_height/2], 'k-')
    ax.axvspan(left_wall, right_wall,
               (y_min + box_height/2) / box_height,
               (y_max + box_height/2) / box_height,
               color='gray', alpha=0.2)

draw_channel(ax1, *channel_y_range)
draw_channel(ax2, *channel_y_range)

# Draw negative charge
ax1.plot(*neg_charge_pos, 'bo', markersize=8, label='Neg Charge')
ax2.plot(*neg_charge_pos, 'bo', markersize=8)

def update(frame):
    scat1.set_offsets(np.c_[x_weak[frame], y_weak[frame]])
    scat2.set_offsets(np.c_[x_strong[frame], y_strong[frame]])
    return scat1, scat2

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("electrical_gradient_comparison.mp4", writer="ffmpeg", fps=30)

