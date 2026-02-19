"""
05: Izhikevich Two Parameter Sets

Model implemented:
- Two Izhikevich neurons simulated in parallel.
- Both neurons use the same equations but different parameter sets.

Why this matters in the progression:
- File 04 introduced a single spiking Izhikevich neuron.
- This file shows that changing parameters (a, b, c, d) changes phenotype.
- It demonstrates that one model form can represent multiple neuron types.
"""

import numpy as np
import matplotlib.pyplot as plt

# Simulation timing
T = 450.0          # total simulated time (ms)
dt = 0.25          # sample interval (ms)
t = np.arange(0, T + dt, dt)
n = t.size

# Cell A: regular spiking-like
# Cell B: fast spiking-like
a_vals = np.array([0.02, 0.10])
b_vals = np.array([0.20, 0.20])
c_vals = np.array([-65.0, -65.0])
d_vals = np.array([8.0, 2.0])

# -------------------------------------------------------------------------
# Experiment A: Baseline comparison with moderate input
# Student interpretation:
# - Same input, different firing patterns due to parameter differences.
# - Compare spike timing and adaptation across RS-like and FS-like cells.
# -------------------------------------------------------------------------
I_A = np.zeros(n)
I_A[(t >= 100) & (t < 360)] = 11.0

v_A = np.zeros((2, n))
u_A = np.zeros((2, n))
dvdt_A = np.zeros((2, n))
dudt_A = np.zeros((2, n))

v_A[:, 0] = -65.0
u_A[:, 0] = b_vals * v_A[:, 0]

# Euler integration for Experiment A
for i in range(n - 1):
    for k in range(2):
        dvdt_A[k, i] = 0.04 * v_A[k, i] * v_A[k, i] + 5.0 * v_A[k, i] + 140.0 - u_A[k, i] + I_A[i]
        dudt_A[k, i] = a_vals[k] * (b_vals[k] * v_A[k, i] - u_A[k, i])

        v_A[k, i + 1] = v_A[k, i] + dvdt_A[k, i] * dt
        u_A[k, i + 1] = u_A[k, i] + dudt_A[k, i] * dt

        if v_A[k, i + 1] >= 30.0:
            v_A[k, i + 1] = c_vals[k]
            u_A[k, i + 1] = u_A[k, i + 1] + d_vals[k]

dvdt_A[:, -1] = dvdt_A[:, -2]
dudt_A[:, -1] = dudt_A[:, -2]

# Plot Experiment A right after simulation
fig, ax = plt.subplots(3, 1, figsize=(8, 7), sharex=True)
ax[0].plot(t, I_A, color='black')
ax[0].set_ylabel('I')
ax[0].set_title('05A: Moderate Input, Two Parameter Sets')

ax[1].plot(t, v_A[0], label='Cell A (RS-like)', color='tab:blue')
ax[1].plot(t, v_A[1], label='Cell B (FS-like)', color='tab:green')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='upper right')

ax[2].plot(t, u_A[0], label='u A', color='tab:orange')
ax[2].plot(t, u_A[1], label='u B', color='tab:red')
ax[2].set_ylabel('u')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right')

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment B: Weak input near threshold
# Student interpretation:
# - Near threshold, small differences in parameters can produce clearly
#   different outcomes (few spikes vs more sustained spiking).
# -------------------------------------------------------------------------
I_B = np.zeros(n)
I_B[(t >= 100) & (t < 360)] = 8.5

v_B = np.zeros((2, n))
u_B = np.zeros((2, n))
dvdt_B = np.zeros((2, n))
dudt_B = np.zeros((2, n))

v_B[:, 0] = -65.0
u_B[:, 0] = b_vals * v_B[:, 0]

# Euler integration for Experiment B
for i in range(n - 1):
    for k in range(2):
        dvdt_B[k, i] = 0.04 * v_B[k, i] * v_B[k, i] + 5.0 * v_B[k, i] + 140.0 - u_B[k, i] + I_B[i]
        dudt_B[k, i] = a_vals[k] * (b_vals[k] * v_B[k, i] - u_B[k, i])

        v_B[k, i + 1] = v_B[k, i] + dvdt_B[k, i] * dt
        u_B[k, i + 1] = u_B[k, i] + dudt_B[k, i] * dt

        if v_B[k, i + 1] >= 30.0:
            v_B[k, i + 1] = c_vals[k]
            u_B[k, i + 1] = u_B[k, i + 1] + d_vals[k]

dvdt_B[:, -1] = dvdt_B[:, -2]
dudt_B[:, -1] = dudt_B[:, -2]

# Plot Experiment B right after simulation
fig, ax = plt.subplots(3, 1, figsize=(8, 7), sharex=True)
ax[0].plot(t, I_B, color='black')
ax[0].set_ylabel('I')
ax[0].set_title('05B: Weak Input Near Threshold')

ax[1].plot(t, v_B[0], label='Cell A (RS-like)', color='tab:blue')
ax[1].plot(t, v_B[1], label='Cell B (FS-like)', color='tab:green')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='upper right')

ax[2].plot(t, u_B[0], label='u A', color='tab:orange')
ax[2].plot(t, u_B[1], label='u B', color='tab:red')
ax[2].set_ylabel('u')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right')

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment C: Strong input
# Student interpretation:
# - Strong drive reveals rate differences and adaptation contrasts.
# - The parameter sets separate clearly under high depolarization.
# -------------------------------------------------------------------------
I_C = np.zeros(n)
I_C[(t >= 100) & (t < 360)] = 14.0

v_C = np.zeros((2, n))
u_C = np.zeros((2, n))
dvdt_C = np.zeros((2, n))
dudt_C = np.zeros((2, n))

v_C[:, 0] = -65.0
u_C[:, 0] = b_vals * v_C[:, 0]

# Euler integration for Experiment C
for i in range(n - 1):
    for k in range(2):
        dvdt_C[k, i] = 0.04 * v_C[k, i] * v_C[k, i] + 5.0 * v_C[k, i] + 140.0 - u_C[k, i] + I_C[i]
        dudt_C[k, i] = a_vals[k] * (b_vals[k] * v_C[k, i] - u_C[k, i])

        v_C[k, i + 1] = v_C[k, i] + dvdt_C[k, i] * dt
        u_C[k, i + 1] = u_C[k, i] + dudt_C[k, i] * dt

        if v_C[k, i + 1] >= 30.0:
            v_C[k, i + 1] = c_vals[k]
            u_C[k, i + 1] = u_C[k, i + 1] + d_vals[k]

dvdt_C[:, -1] = dvdt_C[:, -2]
dudt_C[:, -1] = dudt_C[:, -2]

# Plot Experiment C right after simulation
fig, ax = plt.subplots(3, 1, figsize=(8, 7), sharex=True)
ax[0].plot(t, I_C, color='black')
ax[0].set_ylabel('I')
ax[0].set_title('05C: Strong Input, Two Parameter Sets')

ax[1].plot(t, v_C[0], label='Cell A (RS-like)', color='tab:blue')
ax[1].plot(t, v_C[1], label='Cell B (FS-like)', color='tab:green')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='upper right')

ax[2].plot(t, u_C[0], label='u A', color='tab:orange')
ax[2].plot(t, u_C[1], label='u B', color='tab:red')
ax[2].set_ylabel('u')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right')

plt.tight_layout()
plt.show()
