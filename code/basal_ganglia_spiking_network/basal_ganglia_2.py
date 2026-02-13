import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.stats import multivariate_normal

tau = 0.1
T = 3000
t = np.arange(0, T, tau)
n_steps = t.shape[0]

# define input signal
I_in = np.zeros(n_steps)
I_in[n_steps//3:2*n_steps//3] = 5e1

# Cells: CTX, D1, D2, GPi, GPe, Thal, STN
# Direct: CTX -> D1 -> GPi
# Indirect: CTX -> D2 -> GPe -> GPi
# Hyperdirect: CTX -> STN -> GPi
# Output: GPi -> Thal -> CTX
# Gain limiter: STN <-> GPe

# # striatal projection neuron
# C = 50; vr = -80; vt = -25; vpeak = 40;
# a = 0.01; b = -20; c = -55; d = 150; k = 1;

# # regular spiking neuron
# C = 100; vr = -60; vt = -40; vpeak = 35;
# a = 0.03; b = -2; c = -50; d = 100; k = 0.7;

iz_params = np.array([
    [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7],  # ctx (rs) 0
    [50, -80, -25, 40, 0.01, -20, -55, 150, 1],  # d1 (spn) 1
    [50, -80, -25, 40, 0.01, -20, -55, 150, 1],  # d2 (spn) 2
    [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7],  # gpi (rs) 3
    [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7],  # gpe (rs) 4
    [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7],  # thal (rs) 5
    [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7]  # stn (rs) 6
])

# baseline firing (high for GPi, GPe, and thal)
E = np.array([0, 0, 0, 300, 300, 500, 0])

n_cells = iz_params.shape[0]

# response of each spike on post synaptic membrane v
psp_amp = 1e3
psp_decay = 100

# allocate memory for each neuron
v = np.zeros((n_cells, n_steps))
u = np.zeros((n_cells, n_steps))
g = np.zeros((n_cells, n_steps))
spike = np.zeros((n_cells, n_steps))
v[:, 0] = iz_params[:, 1] + np.random.rand(n_cells) * 100

# connection weight matrix
w = np.zeros((n_cells, n_cells))

# direct pathway
w[0, 1] = 1 * 100
w[1, 3] = -1 * 125

# indirect pathway
# w[0, 2] = 1 * 100
# w[2, 4] = -1 * 100
# w[4, 3] = -1 * 25

# hyperdirect pathway
w[0, 6] = 1 * 90
w[6, 3] = 1 * 50

# stn-gpe feedback
w[6, 4] = 1
w[4, 6] = -1 * 50

# output
w[3, 5] = -1 * 100
w[5, 0] = 1

# input into cells from other cells
I_net = np.zeros((n_cells, n_steps))

for i in range(1, n_steps):

    dt = t[i] - t[i - 1]

    I_net = np.zeros((n_cells, n_steps))
    for jj in range(n_cells):
        for kk in range(n_cells):
            if jj != kk:
                I_net[jj, i - 1] += w[kk, jj] * g[kk, i - 1]
            if jj == 0:
                I_net[jj, i - 1] += I_in[i - 1]

        C = iz_params[jj, 0]
        vr = iz_params[jj, 1]
        vt = iz_params[jj, 2]
        vpeak = iz_params[jj, 3]
        a = iz_params[jj, 4]
        b = iz_params[jj, 5]
        c = iz_params[jj, 6]
        d = iz_params[jj, 7]
        k = iz_params[jj, 8]

        dvdt = (k * (v[jj, i - 1] - vr) * (v[jj, i - 1] - vt) - u[jj, i - 1] +
                I_net[jj, i - 1] + E[jj]) / C
        dudt = a * (b * (v[jj, i - 1] - vr) - u[jj, i - 1])
        dgdt = (-g[jj, i - 1] + psp_amp * spike[jj, i - 1]) / psp_decay

        v[jj, i] = v[jj, i - 1] + dvdt * dt
        u[jj, i] = u[jj, i - 1] + dudt * dt
        g[jj, i] = g[jj, i - 1] + dgdt * dt

        if v[jj, i] >= vpeak:
            v[jj, i - 1] = vpeak
            v[jj, i] = c
            u[jj, i] = u[jj, i] + d
            spike[jj, i] = 1

fig, ax = plt.subplots(3, 4, squeeze=False)
# ctx
ax[1, 0].set_title('ctx')
ax1 = ax[1, 0]
ax2 = ax1.twinx()
ax1.plot(t, v[0, :], 'C0')
ax2.plot(t, g[0, :], 'C1')
# stn
ax[0, 1].set_title('stn')
ax1 = ax[0, 1]
ax2 = ax1.twinx()
ax1.plot(t, v[6, :], 'C0')  # stn
ax2.plot(t, g[6, :], 'C1')  # stn
# d1
ax[1, 1].set_title('d1')
ax1 = ax[1, 1]
ax2 = ax1.twinx()
ax1.plot(t, v[1, :], 'C0')  # d1
ax2.plot(t, g[1, :], 'C1')  # d1
# d2
ax[2, 1].set_title('d2')
ax1 = ax[2, 1]
ax2 = ax1.twinx()
ax1.plot(t, v[2, :], 'C0')  # d2
ax2.plot(t, g[2, :], 'C1')  # d2
# gpi
ax[1, 2].set_title('gpi')
ax1 = ax[1, 2]
ax2 = ax1.twinx()
ax1.plot(t, v[3, :], 'C0')  # gpi
ax2.plot(t, g[3, :], 'C1')  # gpi
# gpe
ax[2, 2].set_title('gpe')
ax1 = ax[2, 2]
ax2 = ax1.twinx()
ax1.plot(t, v[4, :], 'C0')  # gpe
ax2.plot(t, g[4, :], 'C1')  # gpe
# thal
ax[1, 3].set_title('thal')
ax1 = ax[1, 3]
ax2 = ax1.twinx()
ax1.plot(t, v[5, :], 'C0')  # thal
ax2.plot(t, g[5, :], 'C1')  # thal
plt.tight_layout()
plt.show()
