"""
06: MSN-like vs Cortical Pyramidal-like Izhikevich Cells

Model implemented:
- Two Izhikevich neurons with different parameter sets representing
  MSN-like and cortical pyramidal-like response tendencies.

Why this matters in the progression:
- File 05 compared generic RS-like and FS-like parameter sets.
- This file applies the same modeling framework to a specific biological
  comparison used in computational-neuroscience teaching.
- It shows how cell-class-like behavior can emerge from parameter choice
  and input drive.
"""

import numpy as np
import matplotlib.pyplot as plt

# Simulation timing
T = 600.0          # total simulated time (ms)
dt = 0.25          # sample interval (ms)
t = np.arange(0, T + dt, dt)
n = t.size

# Parameter sets for a teaching demo (not biophysical fits)
# 0: Striatal MSN-like
# 1: Cortical pyramidal-like
a_vals = np.array([0.01, 0.02])
b_vals = np.array([0.20, 0.20])
c_vals = np.array([-80.0, -65.0])
d_vals = np.array([15.0, 8.0])

# -------------------------------------------------------------------------
# Experiment A: Matched input amplitude for both cells
# Student interpretation:
# - Both cells get the same current waveform and amplitude.
# - Different outputs reflect parameter-driven excitability differences.
# -------------------------------------------------------------------------
I_base_A = np.zeros(n)
I_base_A[(t >= 150) & (t < 500)] = 1.0
I_gain_A = np.array([9.0, 9.0])

v_A = np.zeros((2, n))
u_A = np.zeros((2, n))
dvdt_A = np.zeros((2, n))
dudt_A = np.zeros((2, n))

v_A[:, 0] = np.array([-80.0, -65.0])
u_A[:, 0] = b_vals * v_A[:, 0]

# Euler integration for Experiment A
for i in range(n - 1):
    for k in range(2):
        I_k = I_base_A[i] * I_gain_A[k]

        dvdt_A[k, i] = 0.04 * v_A[k, i] * v_A[k, i] + 5.0 * v_A[k, i] + 140.0 - u_A[k, i] + I_k
        dudt_A[k, i] = a_vals[k] * (b_vals[k] * v_A[k, i] - u_A[k, i])

        v_A[k, i + 1] = v_A[k, i] + dvdt_A[k, i] * dt
        u_A[k, i + 1] = u_A[k, i] + dudt_A[k, i] * dt

        if v_A[k, i + 1] >= 30.0:
            v_A[k, i + 1] = c_vals[k]
            u_A[k, i + 1] = u_A[k, i + 1] + d_vals[k]

dvdt_A[:, -1] = dvdt_A[:, -2]
dudt_A[:, -1] = dudt_A[:, -2]

# Plot Experiment A right after simulation
fig, ax = plt.subplots(3, 1, figsize=(9, 8), sharex=True)
ax[0].plot(t, I_base_A * I_gain_A[0], label='MSN-like input', color='tab:purple')
ax[0].plot(t, I_base_A * I_gain_A[1], label='Pyramidal-like input', color='tab:gray', linestyle='--')
ax[0].set_ylabel('I')
ax[0].set_title('06A: Matched Input Amplitude')
ax[0].legend(loc='upper right')

ax[1].plot(t, v_A[0], label='MSN-like v', color='tab:purple')
ax[1].plot(t, v_A[1], label='Pyramidal-like v', color='tab:blue')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='upper right')

ax[2].plot(t, u_A[0], label='MSN-like u', color='tab:red')
ax[2].plot(t, u_A[1], label='Pyramidal-like u', color='tab:orange')
ax[2].set_ylabel('u')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right')

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment B: Compensated input amplitude
# Student interpretation:
# - MSN-like cell receives stronger drive to offset higher threshold tendency.
# - This allows clearer side-by-side comparison of response regimes.
# -------------------------------------------------------------------------
I_base_B = np.zeros(n)
I_base_B[(t >= 150) & (t < 500)] = 1.0
I_gain_B = np.array([12.0, 9.0])

v_B = np.zeros((2, n))
u_B = np.zeros((2, n))
dvdt_B = np.zeros((2, n))
dudt_B = np.zeros((2, n))

v_B[:, 0] = np.array([-80.0, -65.0])
u_B[:, 0] = b_vals * v_B[:, 0]

# Euler integration for Experiment B
for i in range(n - 1):
    for k in range(2):
        I_k = I_base_B[i] * I_gain_B[k]

        dvdt_B[k, i] = 0.04 * v_B[k, i] * v_B[k, i] + 5.0 * v_B[k, i] + 140.0 - u_B[k, i] + I_k
        dudt_B[k, i] = a_vals[k] * (b_vals[k] * v_B[k, i] - u_B[k, i])

        v_B[k, i + 1] = v_B[k, i] + dvdt_B[k, i] * dt
        u_B[k, i + 1] = u_B[k, i] + dudt_B[k, i] * dt

        if v_B[k, i + 1] >= 30.0:
            v_B[k, i + 1] = c_vals[k]
            u_B[k, i + 1] = u_B[k, i + 1] + d_vals[k]

dvdt_B[:, -1] = dvdt_B[:, -2]
dudt_B[:, -1] = dudt_B[:, -2]

# Plot Experiment B right after simulation
fig, ax = plt.subplots(3, 1, figsize=(9, 8), sharex=True)
ax[0].plot(t, I_base_B * I_gain_B[0], label='MSN-like input', color='tab:purple')
ax[0].plot(t, I_base_B * I_gain_B[1], label='Pyramidal-like input', color='tab:gray', linestyle='--')
ax[0].set_ylabel('I')
ax[0].set_title('06B: Compensated Input Amplitude')
ax[0].legend(loc='upper right')

ax[1].plot(t, v_B[0], label='MSN-like v', color='tab:purple')
ax[1].plot(t, v_B[1], label='Pyramidal-like v', color='tab:blue')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='upper right')

ax[2].plot(t, u_B[0], label='MSN-like u', color='tab:red')
ax[2].plot(t, u_B[1], label='Pyramidal-like u', color='tab:orange')
ax[2].set_ylabel('u')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right')

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment C: Positive pulse then negative pulse
# Student interpretation:
# - Opposite-polarity inputs probe depolarization, inhibition, and recovery.
# - Compare how each cell class returns after these perturbations.
# -------------------------------------------------------------------------
I_base_C = np.zeros((2, n))
I_base_C[0, (t >= 160) & (t < 300)] = 1.0
I_base_C[0, (t >= 340) & (t < 470)] = -0.7
I_base_C[1, (t >= 160) & (t < 300)] = 1.0
I_base_C[1, (t >= 340) & (t < 470)] = -0.7
I_gain_C = np.array([12.0, 9.0])

v_C = np.zeros((2, n))
u_C = np.zeros((2, n))
dvdt_C = np.zeros((2, n))
dudt_C = np.zeros((2, n))

v_C[:, 0] = np.array([-80.0, -65.0])
u_C[:, 0] = b_vals * v_C[:, 0]

# Euler integration for Experiment C
for i in range(n - 1):
    for k in range(2):
        I_k = I_base_C[k, i] * I_gain_C[k]

        dvdt_C[k, i] = 0.04 * v_C[k, i] * v_C[k, i] + 5.0 * v_C[k, i] + 140.0 - u_C[k, i] + I_k
        dudt_C[k, i] = a_vals[k] * (b_vals[k] * v_C[k, i] - u_C[k, i])

        v_C[k, i + 1] = v_C[k, i] + dvdt_C[k, i] * dt
        u_C[k, i + 1] = u_C[k, i] + dudt_C[k, i] * dt

        if v_C[k, i + 1] >= 30.0:
            v_C[k, i + 1] = c_vals[k]
            u_C[k, i + 1] = u_C[k, i + 1] + d_vals[k]

dvdt_C[:, -1] = dvdt_C[:, -2]
dudt_C[:, -1] = dudt_C[:, -2]

# Plot Experiment C right after simulation
fig, ax = plt.subplots(3, 1, figsize=(9, 8), sharex=True)
ax[0].plot(t, I_base_C[0] * I_gain_C[0], label='MSN-like input', color='tab:purple')
ax[0].plot(t, I_base_C[1] * I_gain_C[1], label='Pyramidal-like input', color='tab:gray', linestyle='--')
ax[0].set_ylabel('I')
ax[0].set_title('06C: Opposite-Polarity Pulses')
ax[0].legend(loc='upper right')

ax[1].plot(t, v_C[0], label='MSN-like v', color='tab:purple')
ax[1].plot(t, v_C[1], label='Pyramidal-like v', color='tab:blue')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='upper right')

ax[2].plot(t, u_C[0], label='MSN-like u', color='tab:red')
ax[2].plot(t, u_C[1], label='Pyramidal-like u', color='tab:orange')
ax[2].set_ylabel('u')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right')

plt.tight_layout()
plt.show()
