# Re-run everything after reset to regenerate and save the animation comparing narrow vs wide channels

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# Simulation parameters
T = 1000
dt = 1.0
t = np.arange(0, T, dt)
N = t.shape[0]
num_particles = 100
box_width = 100
box_height = 60
wall_thickness = 4
left_wall = -wall_thickness / 2
right_wall = wall_thickness / 2

def simulate_diffusion(channel_y_range):
    x = np.zeros((N, num_particles))
    y = np.zeros((N, num_particles))
    x[0] = np.random.uniform(low=-box_width/2 + 1, high=0, size=num_particles)
    y[0] = np.random.uniform(low=-box_height/2 + 1, high=box_height/2 - 1, size=num_particles)

    for i in range(1, N):
        dxdt = np.random.normal(0.0, 0.5, num_particles)
        dydt = np.random.normal(0.0, 0.5, num_particles)
        new_x = x[i-1] + dxdt * dt
        new_y = y[i-1] + dydt * dt
        new_y = np.clip(new_y, -box_height/2, box_height/2)

        trying_to_cross_left = (x[i-1] < left_wall) & (new_x >= left_wall)
        trying_to_cross_right = (x[i-1] > right_wall) & (new_x <= right_wall)
        in_channel = (y[i-1] >= channel_y_range[0]) & (y[i-1] <= channel_y_range[1])
        reflect = (trying_to_cross_left | trying_to_cross_right) & ~in_channel
        new_x[reflect] = x[i-1][reflect]

        x[i] = new_x
        y[i] = new_y

    return x, y

# Run both simulations
x_narrow, y_narrow = simulate_diffusion(channel_y_range=(-5, 5))
x_wide, y_wide = simulate_diffusion(channel_y_range=(-20, 20))

# Create figure and animation
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))
scat1 = ax1.scatter(x_narrow[0], y_narrow[0], s=10)
scat2 = ax2.scatter(x_wide[0], y_wide[0], s=10)

for ax in (ax1, ax2):
    ax.set_xlim(-box_width/2, box_width/2)
    ax.set_ylim(-box_height/2, box_height/2)

ax1.set_title("Narrow Channel")
ax2.set_title("Wide Channel")

def draw_environment(ax, channel_y_range):
    ax.plot([left_wall, left_wall], [-box_height/2, channel_y_range[0]], 'k-')
    ax.plot([left_wall, left_wall], [channel_y_range[1], box_height/2], 'k-')
    ax.plot([right_wall, right_wall], [-box_height/2, channel_y_range[0]], 'k-')
    ax.plot([right_wall, right_wall], [channel_y_range[1], box_height/2], 'k-')
    ax.axvspan(left_wall, right_wall, color='lightgray', alpha=0.3)

draw_environment(ax1, (-5, 5))
draw_environment(ax2, (-20, 20))

def update(frame):
    scat1.set_offsets(np.c_[x_narrow[frame], y_narrow[frame]])
    scat2.set_offsets(np.c_[x_wide[frame], y_wide[frame]])
    return scat1, scat2

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)

# Save the animation
mp4_path = "compare_narrow_vs_wide_channel.mp4"
ani.save(mp4_path, writer="ffmpeg", fps=30)
