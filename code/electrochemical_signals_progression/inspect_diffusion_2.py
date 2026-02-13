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
channel_y_range = (-10, 10)

x = np.zeros((N, num_particles))
y = np.zeros((N, num_particles))
x[0] = np.random.uniform(low=-box_width/2 + 1, high=0, size=num_particles)
y[0] = np.random.uniform(low=-box_height/2 + 1, high=box_height/2 - 1, size=num_particles)

wall_thickness = 4  # thickness of boundary region
left_wall = -wall_thickness / 2
right_wall = wall_thickness / 2

for i in range(1, N):
    dxdt = np.random.normal(0.0, 0.3, num_particles)
    dydt = np.random.normal(0.0, 0.3, num_particles)

    new_x = x[i-1] + dxdt * dt
    new_y = y[i-1] + dydt * dt

    new_y = np.clip(new_y, -box_height/2, box_height/2)

    trying_to_cross_left = (x[i-1] < left_wall) & (x[i-1] + dxdt * dt >= left_wall)
    trying_to_cross_right = (x[i-1] > right_wall) & (x[i-1] + dxdt * dt <= right_wall)
    in_channel = (y[i-1] >= channel_y_range[0]) & (y[i-1] <= channel_y_range[1])
    reflect = (trying_to_cross_left | trying_to_cross_right) & ~in_channel
    new_x[reflect] = x[i-1][reflect]

    x[i] = new_x
    y[i] = new_y

fig, ax = plt.subplots()
scat = ax.scatter(x[0], y[0], s=10)
ax.set_xlim(-box_width/2, box_width/2)
ax.set_ylim(-box_height/2, box_height/2)
ax.set_title("Diffusion Through a Channel")

def draw_environment():
    # Left wall
    ax.plot([left_wall, left_wall], [-box_height/2, channel_y_range[0]], 'k-')
    ax.plot([left_wall, left_wall], [channel_y_range[1], box_height/2], 'k-')
    # Right wall
    ax.plot([right_wall, right_wall], [-box_height/2, channel_y_range[0]], 'k-')
    ax.plot([right_wall, right_wall], [channel_y_range[1], box_height/2], 'k-')
    # Optional: shade the wall region
    ax.axvspan(left_wall, right_wall, color='lightgray', alpha=0.3)

draw_environment()

def update(frame):
    scat.set_offsets(np.c_[x[frame], y[frame]])
    return scat,

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("diffusion_through_channel.mp4", writer="ffmpeg", fps=30)
