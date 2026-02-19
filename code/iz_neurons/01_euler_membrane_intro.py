"""
01: Euler Membrane Introduction

Model implemented:
- A one-variable leaky membrane model integrated with Euler updates.
- Equation:
  dv/dt = (-(v - v_rest) + R*I) / tau

Why this matters in the progression:
- This is the starting point of the tutorial sequence.
- It introduces numerical integration, membrane time constants, and basic
  input-output behavior before adding recovery variables and spiking rules.
"""

import numpy as np
import matplotlib.pyplot as plt

# Simulation timing
T = 300.0          # total simulated time (ms)
dt = 0.25          # sample interval (ms)
t = np.arange(0, T + dt, dt)  # sampled time vector
n = t.size                     # number of time samples

# Simple leaky membrane model:
# dv/dt = (-(v - v_rest) + R*I) / tau
v_rest = -65.0      # resting membrane potential (mV)
tau = 20.0          # membrane time constant (ms)
R = 1.0             # input resistance / gain (a.u.)

# -------------------------------------------------------------------------
# Experiment A: Step family (three positive step sizes)
# Student interpretation:
# - Larger current steps should produce larger voltage deflections.
# - This is a basic input-output sensitivity experiment.
# -------------------------------------------------------------------------
I_A = np.zeros((3, n))
I_A[0, (t >= 60) & (t < 220)] = 4.0
I_A[1, (t >= 60) & (t < 220)] = 8.0
I_A[2, (t >= 60) & (t < 220)] = 12.0

v_A = np.zeros((3, n))
dvdt_A = np.zeros((3, n))
v_A[:, 0] = v_rest

# Euler integration for Experiment A
for i in range(n - 1):
    for k in range(3):
        dvdt_A[k, i] = (-(v_A[k, i] - v_rest) + R * I_A[k, i]) / tau
        v_A[k, i + 1] = v_A[k, i] + dvdt_A[k, i] * dt

dvdt_A[:, -1] = dvdt_A[:, -2]

# Plot Experiment A right after simulation
fig, ax = plt.subplots(2, 1, figsize=(8, 5), sharex=True)
ax[0].plot(t, I_A[0], label='I = 4', color='tab:gray')
ax[0].plot(t, I_A[1], label='I = 8', color='tab:green')
ax[0].plot(t, I_A[2], label='I = 12', color='black')
ax[0].set_ylabel('I (a.u.)')
ax[0].set_title('A) Step Family Input')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_A[0], label='I = 4', color='tab:gray')
ax[1].plot(t, v_A[1], label='I = 8', color='tab:green')
ax[1].plot(t, v_A[2], label='I = 12', color='tab:blue')
ax[1].set_ylabel('v (mV)')
ax[1].set_xlabel('Time (ms)')
ax[1].set_title('A) Voltage Responses')
ax[1].legend(loc='lower right', fontsize=8)

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment B: Positive pulse followed by negative pulse (two conditions)
# Student interpretation:
# - The positive pulse pushes voltage above baseline.
# - The negative pulse pushes voltage below baseline.
# - If both traces return toward the same baseline, that baseline is stable.
# - In this model, v_rest is the stable equilibrium when I = 0.
# -------------------------------------------------------------------------
I_B = np.zeros((2, n))
I_B[0, (t >= 60) & (t < 150)] = 10.0
I_B[0, (t >= 170) & (t < 260)] = -8.0
I_B[1, (t >= 60) & (t < 150)] = 6.0
I_B[1, (t >= 170) & (t < 260)] = -12.0

v_B = np.zeros((2, n))
dvdt_B = np.zeros((2, n))
v_B[:, 0] = v_rest

# Euler integration for Experiment B
for i in range(n - 1):
    for k in range(2):
        dvdt_B[k, i] = (-(v_B[k, i] - v_rest) + R * I_B[k, i]) / tau
        v_B[k, i + 1] = v_B[k, i] + dvdt_B[k, i] * dt

dvdt_B[:, -1] = dvdt_B[:, -2]

# Plot Experiment B right after simulation
fig, ax = plt.subplots(2, 1, figsize=(8, 5), sharex=True)
ax[0].plot(t, I_B[0], color='black', label='Condition 1: +10 then -8')
ax[0].plot(t, I_B[1], color='tab:purple', linestyle='--', label='Condition 2: +6 then -12')
ax[0].set_ylabel('I (a.u.)')
ax[0].set_title('B) Positive Then Negative Pulse')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_B[0], color='tab:blue', label='Condition 1')
ax[1].plot(t, v_B[1], color='tab:red', linestyle='--', label='Condition 2')
ax[1].axhline(v_rest, color='tab:gray', linestyle='--', linewidth=1.0, label='equilibrium (v_rest)')
ax[1].set_ylabel('v (mV)')
ax[1].set_xlabel('Time (ms)')
ax[1].set_title('B) Return Toward Equilibrium After Up/Down Perturbations')
ax[1].legend(loc='lower right', fontsize=8)

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment C: Ramp input (two ramp speeds)
# Student interpretation:
# - Slow and fast ramps can reach the same peak current.
# - Voltage responds more smoothly than input and shows temporal lag.
# - This is one view of low-pass filtering in a leaky membrane.
# -------------------------------------------------------------------------
I_C = np.zeros((2, n))

# Condition 1: slow ramp up, brief hold, slow ramp down
up_idx_1 = (t >= 60) & (t < 170)
hold_idx_1 = (t >= 170) & (t < 200)
down_idx_1 = (t >= 200) & (t < 280)
I_C[0, up_idx_1] = np.linspace(0.0, 12.0, up_idx_1.sum(), endpoint=False)
I_C[0, hold_idx_1] = 12.0
I_C[0, down_idx_1] = np.linspace(12.0, 0.0, down_idx_1.sum(), endpoint=False)

# Condition 2: faster ramp up, longer hold, faster ramp down
up_idx_2 = (t >= 60) & (t < 120)
hold_idx_2 = (t >= 120) & (t < 220)
down_idx_2 = (t >= 220) & (t < 260)
I_C[1, up_idx_2] = np.linspace(0.0, 12.0, up_idx_2.sum(), endpoint=False)
I_C[1, hold_idx_2] = 12.0
I_C[1, down_idx_2] = np.linspace(12.0, 0.0, down_idx_2.sum(), endpoint=False)

v_C = np.zeros((2, n))
dvdt_C = np.zeros((2, n))
v_C[:, 0] = v_rest

# Euler integration for Experiment C
for i in range(n - 1):
    for k in range(2):
        dvdt_C[k, i] = (-(v_C[k, i] - v_rest) + R * I_C[k, i]) / tau
        v_C[k, i + 1] = v_C[k, i] + dvdt_C[k, i] * dt

dvdt_C[:, -1] = dvdt_C[:, -2]

# Plot Experiment C right after simulation
fig, ax = plt.subplots(2, 1, figsize=(8, 5), sharex=True)
ax[0].plot(t, I_C[0], color='black', label='Condition 1: slow ramp')
ax[0].plot(t, I_C[1], color='tab:purple', linestyle='--', label='Condition 2: fast ramp')
ax[0].set_ylabel('I (a.u.)')
ax[0].set_title('C) Ramp Up / Hold / Ramp Down')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_C[0], color='tab:blue', label='Condition 1')
ax[1].plot(t, v_C[1], color='tab:red', linestyle='--', label='Condition 2')
ax[1].set_ylabel('v (mV)')
ax[1].set_xlabel('Time (ms)')
ax[1].set_title('C) Voltage Response')
ax[1].legend(loc='lower right', fontsize=8)

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment D: Noisy current (two noise strengths)
# Student interpretation:
# - Both conditions have similar mean input, but different fluctuation size.
# - Voltage is smoother than current, especially in the high-noise condition.
# - This is another view of low-pass filtering in a leaky membrane.
# -------------------------------------------------------------------------
rng = np.random.default_rng(7)
I_D = np.zeros((2, n))

noise_idx = (t >= 60) & (t < 260)
z = rng.standard_normal(noise_idx.sum())
I_D[0, noise_idx] = 5.0 + 1.0 * z
I_D[1, noise_idx] = 5.0 + 3.0 * z

v_D = np.zeros((2, n))
dvdt_D = np.zeros((2, n))
v_D[:, 0] = v_rest

# Euler integration for Experiment D
for i in range(n - 1):
    for k in range(2):
        dvdt_D[k, i] = (-(v_D[k, i] - v_rest) + R * I_D[k, i]) / tau
        v_D[k, i + 1] = v_D[k, i] + dvdt_D[k, i] * dt

dvdt_D[:, -1] = dvdt_D[:, -2]

# Plot Experiment D right after simulation
fig, ax = plt.subplots(2, 1, figsize=(8, 5), sharex=True)
ax[0].plot(t, I_D[0], color='black', label='Condition 1: low noise')
ax[0].plot(t, I_D[1], color='tab:purple', linestyle='--', label='Condition 2: high noise')
ax[0].set_ylabel('I (a.u.)')
ax[0].set_title('D) Noisy Current')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_D[0], color='tab:blue', label='Condition 1')
ax[1].plot(t, v_D[1], color='tab:red', linestyle='--', label='Condition 2')
ax[1].set_ylabel('v (mV)')
ax[1].set_xlabel('Time (ms)')
ax[1].set_title('D) Voltage Response')
ax[1].legend(loc='lower right', fontsize=8)

plt.tight_layout()
plt.show()
