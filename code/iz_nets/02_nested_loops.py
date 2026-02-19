"""
Nested-loop network construction.
We keep neurons in arrays, then for each postsynaptic neuron we loop over
all presynaptic neurons to sum their synaptic contributions. This mirrors
the connectivity diagram while avoiding hand-written repetition.
"""
import numpy as np
import matplotlib.pyplot as plt

# ------------------------------------------------------------
# Izhikevich regular spiking neurons with spike-triggered synapses
# Nested loops: presynaptic x postsynaptic summation
# ------------------------------------------------------------
# dv/dt = (k (v - vr)(v - vt) - u + I) / C
# du/dt = a (b (v - vr) - u)
# dg/dt = (-g + A * spike) / tau_g
# If v >= vpeak: v -> c, u -> u + d, spike = 1
# ------------------------------------------------------------

# ------------------------------------------------------------
# Pseudocode (nested loops)
# ------------------------------------------------------------
# for t in timesteps:
#     for post in neurons:
#         I_net = 0
#         for pre in neurons:
#             I_net += w[pre, post] * g[pre]
#         if post is A: add I_in
#         update post using I_net and baseline
# ------------------------------------------------------------

# simulation time
DT = 0.1
T = 3000
t = np.arange(0, T, DT)
n_steps = t.shape[0]

# keep initial conditions consistent across lessons
np.random.seed(0)

# input current (square pulse)
I_amp = 200
I_in = np.zeros(n_steps)
I_in[n_steps // 3:2 * n_steps // 3] = I_amp

# Izhikevich parameters (regular spiking)
C = 100
vr = -60
vt = -40
vpeak = 35
k = 0.7
a = 0.03
b = -2
c = -50
d = 100

# synapse parameters
psp_amp = 1000
psp_decay = 100

n_cells = 3

# ------------------------------------------------------------
# Network 1: feedforward excitation (A -> B -> C)
# Intended behavior: A spikes during the pulse, B follows, then C follows.
# Student prompt: Notice the timing delays. Try changing w_AB or w_BC to see
# how coupling strength affects propagation (or failure to propagate).
# ------------------------------------------------------------

w = np.zeros((n_cells, n_cells))
# A -> B -> C
w[0, 1] = 80
w[1, 2] = 80

E = np.array([0, 0, 0])

v = np.zeros((n_cells, n_steps))
u = np.zeros((n_cells, n_steps))
g = np.zeros((n_cells, n_steps))
spike = np.zeros((n_cells, n_steps))

v[:, 0] = vr + np.random.rand(n_cells) * 5

for i in range(1, n_steps):
    dt = t[i] - t[i - 1]

    for j in range(n_cells):
        I_net = 0
        for pre in range(n_cells):
            I_net += w[pre, j] * g[pre, i - 1]

        if j == 0:
            I_net += I_in[i - 1]

        I_net += E[j]

        dvdt = (k * (v[j, i - 1] - vr) * (v[j, i - 1] - vt) - u[j, i - 1] + I_net) / C
        dudt = a * (b * (v[j, i - 1] - vr) - u[j, i - 1])
        dgdt = (-g[j, i - 1] + psp_amp * spike[j, i - 1]) / psp_decay

        v[j, i] = v[j, i - 1] + dvdt * dt
        u[j, i] = u[j, i - 1] + dudt * dt
        g[j, i] = g[j, i - 1] + dgdt * dt

        if v[j, i] >= vpeak:
            v[j, i - 1] = vpeak
            v[j, i] = c
            u[j, i] = u[j, i] + d
            spike[j, i] = 1

fig, ax = plt.subplots(3, 1, squeeze=False, figsize=(10, 7))
fig.suptitle('Network 1: Feedforward Excitation (A -> B -> C)')

for idx, name in enumerate(['Neuron A', 'Neuron B', 'Neuron C']):
    ax1 = ax[idx, 0]
    ax2 = ax1.twinx()
    ax1.plot(t, v[idx, :], 'C0')
    ax2.plot(t, g[idx, :], 'C1')
    ax1.set_title(name)

plt.tight_layout()
plt.show()

# ------------------------------------------------------------
# Network 2: Excite-inhibit-disinhibit (A -> B ⊣ C), B tonic
# Intended behavior: B fires tonically and suppresses C. When A turns on,
# B fires more and C is further suppressed.
# Student prompt: Turn down E_B or w_BC to find the point where C escapes.
# ------------------------------------------------------------

w = np.zeros((n_cells, n_cells))
# A excites B, B inhibits C
w[0, 1] = 80
w[1, 2] = -120

E = np.array([0, 300, 0])

v = np.zeros((n_cells, n_steps))
u = np.zeros((n_cells, n_steps))
g = np.zeros((n_cells, n_steps))
spike = np.zeros((n_cells, n_steps))

v[:, 0] = vr + np.random.rand(n_cells) * 5

for i in range(1, n_steps):
    dt = t[i] - t[i - 1]

    for j in range(n_cells):
        I_net = 0
        for pre in range(n_cells):
            I_net += w[pre, j] * g[pre, i - 1]

        if j == 0:
            I_net += I_in[i - 1]

        I_net += E[j]

        dvdt = (k * (v[j, i - 1] - vr) * (v[j, i - 1] - vt) - u[j, i - 1] + I_net) / C
        dudt = a * (b * (v[j, i - 1] - vr) - u[j, i - 1])
        dgdt = (-g[j, i - 1] + psp_amp * spike[j, i - 1]) / psp_decay

        v[j, i] = v[j, i - 1] + dvdt * dt
        u[j, i] = u[j, i - 1] + dudt * dt
        g[j, i] = g[j, i - 1] + dgdt * dt

        if v[j, i] >= vpeak:
            v[j, i - 1] = vpeak
            v[j, i] = c
            u[j, i] = u[j, i] + d
            spike[j, i] = 1

fig, ax = plt.subplots(3, 1, squeeze=False, figsize=(10, 7))
fig.suptitle('Network 2: A -> B ⊣ C (B tonic)')

for idx, name in enumerate(['Neuron A', 'Neuron B (tonic)', 'Neuron C']):
    ax1 = ax[idx, 0]
    ax2 = ax1.twinx()
    ax1.plot(t, v[idx, :], 'C0')
    ax2.plot(t, g[idx, :], 'C1')
    ax1.set_title(name)

plt.tight_layout()
plt.show()

# ------------------------------------------------------------
# Network 3: A excites inhibitory neuron B, B inhibits C
# Intended behavior: B is quiet until A turns on; C is suppressed only
# during the A pulse (contrast with Network 2).
# Student prompt: Increase E_B slightly to make B tonic and compare with
# Network 2. How does C change?
# ------------------------------------------------------------

w = np.zeros((n_cells, n_cells))
# A excites B, B inhibits C
w[0, 1] = 100
w[1, 2] = -140

E = np.array([0, 0, 0])

v = np.zeros((n_cells, n_steps))
u = np.zeros((n_cells, n_steps))
g = np.zeros((n_cells, n_steps))
spike = np.zeros((n_cells, n_steps))

v[:, 0] = vr + np.random.rand(n_cells) * 5

for i in range(1, n_steps):
    dt = t[i] - t[i - 1]

    for j in range(n_cells):
        I_net = 0
        for pre in range(n_cells):
            I_net += w[pre, j] * g[pre, i - 1]

        if j == 0:
            I_net += I_in[i - 1]

        I_net += E[j]

        dvdt = (k * (v[j, i - 1] - vr) * (v[j, i - 1] - vt) - u[j, i - 1] + I_net) / C
        dudt = a * (b * (v[j, i - 1] - vr) - u[j, i - 1])
        dgdt = (-g[j, i - 1] + psp_amp * spike[j, i - 1]) / psp_decay

        v[j, i] = v[j, i - 1] + dvdt * dt
        u[j, i] = u[j, i - 1] + dudt * dt
        g[j, i] = g[j, i - 1] + dgdt * dt

        if v[j, i] >= vpeak:
            v[j, i - 1] = vpeak
            v[j, i] = c
            u[j, i] = u[j, i] + d
            spike[j, i] = 1

fig, ax = plt.subplots(3, 1, squeeze=False, figsize=(10, 7))
fig.suptitle('Network 3: A excites inhibitory B, B inhibits C')

for idx, name in enumerate(['Neuron A', 'Neuron B', 'Neuron C']):
    ax1 = ax[idx, 0]
    ax2 = ax1.twinx()
    ax1.plot(t, v[idx, :], 'C0')
    ax2.plot(t, g[idx, :], 'C1')
    ax1.set_title(name)

plt.tight_layout()
plt.show()

# ------------------------------------------------------------
# Network 4: Recurrent excitation loop (A -> B -> C -> A)
# Intended behavior: activity reverberates while A is driven and may
# persist briefly after the pulse depending on weights.
# Student prompt: Explore higher/lower w_CA to test when feedback sustains
# spiking vs. dies out.
# ------------------------------------------------------------

w = np.zeros((n_cells, n_cells))
# A -> B -> C -> A
w[0, 1] = 70
w[1, 2] = 70
w[2, 0] = 70

E = np.array([0, 0, 0])

v = np.zeros((n_cells, n_steps))
u = np.zeros((n_cells, n_steps))
g = np.zeros((n_cells, n_steps))
spike = np.zeros((n_cells, n_steps))

v[:, 0] = vr + np.random.rand(n_cells) * 5

for i in range(1, n_steps):
    dt = t[i] - t[i - 1]

    for j in range(n_cells):
        I_net = 0
        for pre in range(n_cells):
            I_net += w[pre, j] * g[pre, i - 1]

        if j == 0:
            I_net += I_in[i - 1]

        I_net += E[j]

        dvdt = (k * (v[j, i - 1] - vr) * (v[j, i - 1] - vt) - u[j, i - 1] + I_net) / C
        dudt = a * (b * (v[j, i - 1] - vr) - u[j, i - 1])
        dgdt = (-g[j, i - 1] + psp_amp * spike[j, i - 1]) / psp_decay

        v[j, i] = v[j, i - 1] + dvdt * dt
        u[j, i] = u[j, i - 1] + dudt * dt
        g[j, i] = g[j, i - 1] + dgdt * dt

        if v[j, i] >= vpeak:
            v[j, i - 1] = vpeak
            v[j, i] = c
            u[j, i] = u[j, i] + d
            spike[j, i] = 1

fig, ax = plt.subplots(3, 1, squeeze=False, figsize=(10, 7))
fig.suptitle('Network 4: Recurrent Excitation Loop (A -> B -> C -> A)')

for idx, name in enumerate(['Neuron A', 'Neuron B', 'Neuron C']):
    ax1 = ax[idx, 0]
    ax2 = ax1.twinx()
    ax1.plot(t, v[idx, :], 'C0')
    ax2.plot(t, g[idx, :], 'C1')
    ax1.set_title(name)

plt.tight_layout()
plt.show()
