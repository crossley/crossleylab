import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.lines import Line2D

# Simulation parameters
T = 3000
dt = 1.0
t = np.arange(0, T, dt)
N = len(t)
num_particles = 200
box_width = 100
box_height = 100
wall_thickness = 4
left_wall = -wall_thickness / 2
right_wall = wall_thickness / 2

# Forces
electric_strength = 0.1
repulsion_strength = 0.05

# Negative charge attractor
neg_charge_pos = np.array([-box_width / 2 + 20, 0])

# Channels: type A (narrow) and B (wide)
channel_config = {
    0: (30, 31),    # Type A (orange), narrow channel
    1: (-40, -10)   # Type B (blue), wide channel
}

# Assign types and colors
types = np.random.choice([0, 1], size=num_particles)
colors = np.array(['orange' if t == 0 else 'blue' for t in types])

# Define charges per type: type 0 = +1, type 1 = –1
charges = np.array([1 if t == 0 else -1 for t in types])

def init_particles():
    n_type0 = np.sum(types == 0)
    n_type1 = np.sum(types == 1)

    def side_split(n):
        n_left = int(n * 0.6)
        n_right = n - n_left
        return n_left, n_right

    n0_left, n0_right = side_split(n_type0)
    n1_left, n1_right = side_split(n_type1)

    def xy_cluster(n_left, n_right, y_bounds):
        y_l = np.random.uniform(y_bounds[0], y_bounds[1], size=n_left)
        y_r = np.random.uniform(y_bounds[0], y_bounds[1], size=n_right)
        x_l = np.random.uniform(-box_width/2 + 1, left_wall - 1, size=n_left)
        x_r = np.random.uniform(right_wall + 1, box_width/2 - 1, size=n_right)
        return np.concatenate([x_l, x_r]), np.concatenate([y_l, y_r])

    x0, y0 = xy_cluster(n0_left, n0_right, channel_config[0])
    x1, y1 = xy_cluster(n1_left, n1_right, channel_config[1])

    return np.concatenate([x0, x1]), np.concatenate([y0, y1])

def simulate():
    x = np.zeros((N, num_particles))
    y = np.zeros((N, num_particles))
    x[0], y[0] = init_particles()

    V_total = np.zeros(N)
    V_A = np.zeros(N)
    V_B = np.zeros(N)

    for i in range(1, N):
        dxdt = np.random.normal(0.0, 0.5, num_particles)
        dydt = np.random.normal(0.0, 0.5, num_particles)

        # Electrical attraction
        dx = neg_charge_pos[0] - x[i-1]
        dy = neg_charge_pos[1] - y[i-1]
        dist = np.sqrt(dx**2 + dy**2) + 1e-3
        attract_x = electric_strength * charges * dx / dist
        attract_y = electric_strength * charges * dy / dist


        # Repulsion
        repel_x = np.zeros(num_particles)
        repel_y = np.zeros(num_particles)
        for j in range(num_particles):
            dxj = x[i-1][j] - x[i-1]
            dyj = y[i-1][j] - y[i-1]
            d2 = dxj**2 + dyj**2 + 1e-3
            inv_d2 = 1 / d2
            inv_d2[j] = 0
            repel_x[j] = repulsion_strength * np.sum(dxj * inv_d2)
            repel_y[j] = repulsion_strength * np.sum(dyj * inv_d2)

        # Update positions
        total_dx = dxdt + attract_x + repel_x
        total_dy = dydt + attract_y + repel_y

        new_x = x[i-1] + total_dx * dt
        new_y = y[i-1] + total_dy * dt
        new_y = np.clip(new_y, -box_height/2, box_height/2)

        # Channel logic
        channel_min = np.array([channel_config[t][0] for t in types])
        channel_max = np.array([channel_config[t][1] for t in types])
        in_channel = (y[i-1] >= channel_min) & (y[i-1] <= channel_max)

        trying_to_cross_left = (x[i-1] > right_wall) & (new_x <= right_wall)
        trying_to_cross_right = (x[i-1] < left_wall) & (new_x >= left_wall)
        trying_to_cross = trying_to_cross_left | trying_to_cross_right
        reflect = trying_to_cross & ~in_channel
        new_x[reflect] = x[i-1][reflect]

        x[i] = new_x
        y[i] = new_y

        # Voltage: net charge per type and total
        mask_A = (types == 0)
        mask_B = (types == 1)

        V_A[i] = np.sum(x[i][mask_A] < left_wall) - np.sum(x[i][mask_A] > right_wall)
        V_B[i] = np.sum(x[i][mask_B] < left_wall) - np.sum(x[i][mask_B] > right_wall)
        V_total[i] = V_A[i] + V_B[i]

    return x, y, V_A, V_B, V_total

# Run sim
x_data, y_data, V_A, V_B, V_total = simulate()

# Setup plot
fig, (ax_particles, ax_potential) = plt.subplots(1, 2, figsize=(12, 6))
scat = ax_particles.scatter(x_data[0], y_data[0], s=10, c=colors)
ax_particles.set_xlim(-box_width/2, box_width/2)
ax_particles.set_ylim(-box_height/2, box_height/2)
ax_particles.set_title("Two Ion Types with Selective Channels")

# Draw channels
def draw_environment():
    for ion_type, (ymin, ymax) in channel_config.items():
        color = 'orange' if ion_type == 0 else 'blue'
        ax_particles.plot([left_wall, left_wall], [-box_height/2, ymin], 'k-')
        ax_particles.plot([right_wall, right_wall], [-box_height/2, ymin], 'k-')
        ax_particles.plot([left_wall, left_wall], [ymax, box_height/2], 'k-')
        ax_particles.plot([right_wall, right_wall], [ymax, box_height/2], 'k-')
        ax_particles.axvspan(left_wall, right_wall,
                             (ymin + box_height/2) / box_height,
                             (ymax + box_height/2) / box_height,
                             color=color, alpha=0.2)

draw_environment()
ax_particles.plot(*neg_charge_pos, 'ro', markersize=8, label='Neg charge')
legend_elements = [
    Line2D([0], [0], marker='o', color='w', markerfacecolor='orange', label='Ion A + (narrow)', markersize=6),
    Line2D([0], [0], marker='o', color='w', markerfacecolor='blue', label='Ion B - (wide)', markersize=6),
    Line2D([0], [0], marker='o', color='w', markerfacecolor='red', label='Neg charge', markersize=6)
]
ax_particles.legend(handles=legend_elements, loc='upper right')

# Right panel: membrane potentials
line_A, = ax_potential.plot([], [], color='orange', label='Ion A potential')
line_B, = ax_potential.plot([], [], color='blue', label='Ion B potential')
line_total, = ax_potential.plot([], [], color='purple', label='Total potential')
ax_potential.set_xlim(0, T)
ax_potential.set_ylim(-num_particles, num_particles)
ax_potential.set_xlabel("Time (ms)")
ax_potential.set_ylabel("Membrane Potential (Δcharge)")
ax_potential.set_title("Membrane Potential Over Time")
ax_potential.legend(loc='upper right')

time_vals, V_A_vals, V_B_vals, V_total_vals = [], [], [], []

# Animation
def update(frame):
    scat.set_offsets(np.c_[x_data[frame], y_data[frame]])
    time_vals.append(t[frame])
    V_A_vals.append(V_A[frame])
    V_B_vals.append(V_B[frame])
    V_total_vals.append(V_total[frame])

    line_A.set_data(time_vals, V_A_vals)
    line_B.set_data(time_vals, V_B_vals)
    line_total.set_data(time_vals, V_total_vals)

    return scat, line_A, line_B, line_total

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("goldman_multiline_potential.mp4", writer="ffmpeg", fps=30)
