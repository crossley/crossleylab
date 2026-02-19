"""
04: Izhikevich Single Neuron

Model implemented:
- Two-variable Izhikevich spiking model with threshold-reset rule.
- Equations:
  dv/dt = 0.04*v^2 + 5*v + 140 - u + I
  du/dt = a*(b*v - u)
  if v >= 30 mV: v <- c and u <- u + d

Why this matters in the progression:
- File 03 introduced the quadratic voltage term without spikes.
- This file adds threshold-reset dynamics to produce explicit spikes.
- It is the first complete spiking model in the tutorial sequence.
"""

import numpy as np
import matplotlib.pyplot as plt

# Simulation timing
T = 400.0          # total simulated time (ms)
dt = 0.25          # sample interval (ms)
t = np.arange(0, T + dt, dt)
n = t.size

# Izhikevich parameters (regular-spiking style)
a = 0.02
b = 0.2
c = -65.0
d = 8.0

# -------------------------------------------------------------------------
# Experiment A: Step family around firing threshold
# Student interpretation:
# - Smaller currents may remain subthreshold.
# - Larger currents cross threshold and generate spikes.
# - This shows excitability differences across input levels.
# -------------------------------------------------------------------------
I_A = np.zeros((3, n))
I_A[0, (t >= 100) & (t < 320)] = 6.0
I_A[1, (t >= 100) & (t < 320)] = 8.0
I_A[2, (t >= 100) & (t < 320)] = 10.0

v_A = np.zeros((3, n))
u_A = np.zeros((3, n))
dvdt_A = np.zeros((3, n))
dudt_A = np.zeros((3, n))
spk_A = np.zeros((3, n))

v_A[:, 0] = -65.0
u_A[:, 0] = b * v_A[:, 0]

# Euler integration for Experiment A
for i in range(n - 1):
    for k in range(3):
        dvdt_A[k, i] = 0.04 * v_A[k, i] * v_A[k, i] + 5.0 * v_A[k, i] + 140.0 - u_A[k, i] + I_A[k, i]
        dudt_A[k, i] = a * (b * v_A[k, i] - u_A[k, i])

        v_A[k, i + 1] = v_A[k, i] + dvdt_A[k, i] * dt
        u_A[k, i + 1] = u_A[k, i] + dudt_A[k, i] * dt

        if v_A[k, i + 1] >= 30.0:
            spk_A[k, i + 1] = 1.0
            v_A[k, i + 1] = c
            u_A[k, i + 1] = u_A[k, i + 1] + d

dvdt_A[:, -1] = dvdt_A[:, -2]
dudt_A[:, -1] = dudt_A[:, -2]

# Plot Experiment A right after simulation
fig, ax = plt.subplots(3, 1, figsize=(8, 7), sharex=True)
ax[0].plot(t, I_A[0], color='tab:gray', label='I = 6')
ax[0].plot(t, I_A[1], color='tab:green', label='I = 8')
ax[0].plot(t, I_A[2], color='black', label='I = 10')
ax[0].set_ylabel('I')
ax[0].set_title('04A: Step Family Around Threshold')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_A[0], color='tab:gray', label='I = 6')
ax[1].plot(t, v_A[1], color='tab:green', label='I = 8')
ax[1].plot(t, v_A[2], color='tab:blue', label='I = 10')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='lower right', fontsize=8)

ax[2].plot(t, u_A[0], color='tab:gray', label='I = 6')
ax[2].plot(t, u_A[1], color='tab:orange', label='I = 8')
ax[2].plot(t, u_A[2], color='tab:red', label='I = 10')
ax[2].set_ylabel('u')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right', fontsize=8)

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment B: Moderate vs strong sustained depolarization
# Student interpretation:
# - Both conditions can spike, but spike rate and adaptation differ.
# - u increases over time and reduces excitability during sustained input.
# -------------------------------------------------------------------------
I_B = np.zeros((2, n))
I_B[0, (t >= 90) & (t < 350)] = 10.0
I_B[1, (t >= 90) & (t < 350)] = 14.0

v_B = np.zeros((2, n))
u_B = np.zeros((2, n))
dvdt_B = np.zeros((2, n))
dudt_B = np.zeros((2, n))
spk_B = np.zeros((2, n))

v_B[:, 0] = -65.0
u_B[:, 0] = b * v_B[:, 0]

# Euler integration for Experiment B
for i in range(n - 1):
    for k in range(2):
        dvdt_B[k, i] = 0.04 * v_B[k, i] * v_B[k, i] + 5.0 * v_B[k, i] + 140.0 - u_B[k, i] + I_B[k, i]
        dudt_B[k, i] = a * (b * v_B[k, i] - u_B[k, i])

        v_B[k, i + 1] = v_B[k, i] + dvdt_B[k, i] * dt
        u_B[k, i + 1] = u_B[k, i] + dudt_B[k, i] * dt

        if v_B[k, i + 1] >= 30.0:
            spk_B[k, i + 1] = 1.0
            v_B[k, i + 1] = c
            u_B[k, i + 1] = u_B[k, i + 1] + d

dvdt_B[:, -1] = dvdt_B[:, -2]
dudt_B[:, -1] = dudt_B[:, -2]

# Plot Experiment B right after simulation
fig, ax = plt.subplots(3, 1, figsize=(8, 7), sharex=True)
ax[0].plot(t, I_B[0], color='black', label='Condition 1: I = 10')
ax[0].plot(t, I_B[1], color='tab:purple', linestyle='--', label='Condition 2: I = 14')
ax[0].set_ylabel('I')
ax[0].set_title('04B: Sustained Input and Adaptation')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_B[0], color='tab:blue', label='Condition 1')
ax[1].plot(t, v_B[1], color='tab:red', linestyle='--', label='Condition 2')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='lower right', fontsize=8)

ax[2].plot(t, u_B[0], color='tab:orange', label='Condition 1')
ax[2].plot(t, u_B[1], color='tab:brown', linestyle='--', label='Condition 2')
ax[2].set_ylabel('u')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right', fontsize=8)

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment C: Positive pulse then negative pulse
# Student interpretation:
# - Depolarizing and hyperpolarizing phases probe recovery behavior.
# - Compare how v and u settle after opposite perturbations.
# -------------------------------------------------------------------------
I_C = np.zeros((2, n))
I_C[0, (t >= 90) & (t < 170)] = 12.0
I_C[0, (t >= 200) & (t < 290)] = -4.0
I_C[1, (t >= 90) & (t < 170)] = 9.0
I_C[1, (t >= 200) & (t < 290)] = -7.0

v_C = np.zeros((2, n))
u_C = np.zeros((2, n))
dvdt_C = np.zeros((2, n))
dudt_C = np.zeros((2, n))
spk_C = np.zeros((2, n))

v_C[:, 0] = -65.0
u_C[:, 0] = b * v_C[:, 0]

# Euler integration for Experiment C
for i in range(n - 1):
    for k in range(2):
        dvdt_C[k, i] = 0.04 * v_C[k, i] * v_C[k, i] + 5.0 * v_C[k, i] + 140.0 - u_C[k, i] + I_C[k, i]
        dudt_C[k, i] = a * (b * v_C[k, i] - u_C[k, i])

        v_C[k, i + 1] = v_C[k, i] + dvdt_C[k, i] * dt
        u_C[k, i + 1] = u_C[k, i] + dudt_C[k, i] * dt

        if v_C[k, i + 1] >= 30.0:
            spk_C[k, i + 1] = 1.0
            v_C[k, i + 1] = c
            u_C[k, i + 1] = u_C[k, i + 1] + d

dvdt_C[:, -1] = dvdt_C[:, -2]
dudt_C[:, -1] = dudt_C[:, -2]

# Plot Experiment C right after simulation
fig, ax = plt.subplots(3, 1, figsize=(8, 7), sharex=True)
ax[0].plot(t, I_C[0], color='black', label='Condition 1: +12 then -4')
ax[0].plot(t, I_C[1], color='tab:purple', linestyle='--', label='Condition 2: +9 then -7')
ax[0].set_ylabel('I')
ax[0].set_title('04C: Opposite-Polarity Pulses')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_C[0], color='tab:blue', label='Condition 1')
ax[1].plot(t, v_C[1], color='tab:red', linestyle='--', label='Condition 2')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='lower right', fontsize=8)

ax[2].plot(t, u_C[0], color='tab:orange', label='Condition 1')
ax[2].plot(t, u_C[1], color='tab:brown', linestyle='--', label='Condition 2')
ax[2].set_ylabel('u')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right', fontsize=8)

plt.tight_layout()
plt.show()
