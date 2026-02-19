"""
02: Two-State System Introduction

Model implemented:
- A two-variable dynamical system with membrane variable v and recovery variable u.
- Equations:
  dv/dt = (-(v + 65) - u + I) / tau_v
  du/dt = a * (b*v - u)

Why this matters in the progression:
- File 01 used a single-state leaky membrane.
- This file adds a slow recovery process (u), introducing feedback and memory.
- This prepares for Izhikevich-style spiking models where v-u coupling shapes firing.
"""

import numpy as np
import matplotlib.pyplot as plt

# Simulation timing
T = 300.0          # total simulated time (ms)
dt = 0.25          # sample interval (ms)
t = np.arange(0, T + dt, dt)
n = t.size

# Two-state model parameters
a = 0.03
b = 0.22
tau_v = 15.0

# -------------------------------------------------------------------------
# Experiment A: Step family (three amplitudes)
# Student interpretation:
# - v changes quickly when current turns on.
# - u changes more slowly and provides negative feedback.
# - Larger inputs produce larger depolarization and larger recovery responses.
# -------------------------------------------------------------------------
I_A = np.zeros((3, n))
I_A[0, (t >= 60) & (t < 220)] = 4.0
I_A[1, (t >= 60) & (t < 220)] = 8.0
I_A[2, (t >= 60) & (t < 220)] = 12.0

v_A = np.zeros((3, n))
u_A = np.zeros((3, n))
dvdt_A = np.zeros((3, n))
dudt_A = np.zeros((3, n))

v_A[:, 0] = -65.0
u_A[:, 0] = b * v_A[:, 0]

# Euler integration for Experiment A
for i in range(n - 1):
    for k in range(3):
        dvdt_A[k, i] = (-(v_A[k, i] + 65.0) - u_A[k, i] + I_A[k, i]) / tau_v
        dudt_A[k, i] = a * (b * v_A[k, i] - u_A[k, i])

        v_A[k, i + 1] = v_A[k, i] + dvdt_A[k, i] * dt
        u_A[k, i + 1] = u_A[k, i] + dudt_A[k, i] * dt

dvdt_A[:, -1] = dvdt_A[:, -2]
dudt_A[:, -1] = dudt_A[:, -2]

# Plot Experiment A right after simulation
fig, ax = plt.subplots(3, 1, figsize=(8, 7), sharex=True)
ax[0].plot(t, I_A[0], color='tab:gray', label='I = 4')
ax[0].plot(t, I_A[1], color='tab:green', label='I = 8')
ax[0].plot(t, I_A[2], color='black', label='I = 12')
ax[0].set_ylabel('I (a.u.)')
ax[0].set_title('02A: Step Family in a Two-State System')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_A[0], color='tab:gray', label='I = 4')
ax[1].plot(t, v_A[1], color='tab:green', label='I = 8')
ax[1].plot(t, v_A[2], color='tab:blue', label='I = 12')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='lower right', fontsize=8)

ax[2].plot(t, u_A[0], color='tab:gray', label='I = 4')
ax[2].plot(t, u_A[1], color='tab:orange', label='I = 8')
ax[2].plot(t, u_A[2], color='tab:red', label='I = 12')
ax[2].set_ylabel('u (a.u.)')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right', fontsize=8)

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment B: Positive pulse then negative pulse (two conditions)
# Student interpretation:
# - Positive current pushes v upward; negative current pushes v downward.
# - u also shifts and affects how quickly the system returns.
# - Returning toward baseline after both perturbation directions is a sign
#   of stable behavior around baseline.
# -------------------------------------------------------------------------
I_B = np.zeros((2, n))
I_B[0, (t >= 60) & (t < 150)] = 10.0
I_B[0, (t >= 170) & (t < 260)] = -8.0
I_B[1, (t >= 60) & (t < 150)] = 6.0
I_B[1, (t >= 170) & (t < 260)] = -12.0

v_B = np.zeros((2, n))
u_B = np.zeros((2, n))
dvdt_B = np.zeros((2, n))
dudt_B = np.zeros((2, n))

v_B[:, 0] = -65.0
u_B[:, 0] = b * v_B[:, 0]

# Euler integration for Experiment B
for i in range(n - 1):
    for k in range(2):
        dvdt_B[k, i] = (-(v_B[k, i] + 65.0) - u_B[k, i] + I_B[k, i]) / tau_v
        dudt_B[k, i] = a * (b * v_B[k, i] - u_B[k, i])

        v_B[k, i + 1] = v_B[k, i] + dvdt_B[k, i] * dt
        u_B[k, i + 1] = u_B[k, i] + dudt_B[k, i] * dt

dvdt_B[:, -1] = dvdt_B[:, -2]
dudt_B[:, -1] = dudt_B[:, -2]

# Plot Experiment B right after simulation
fig, ax = plt.subplots(3, 1, figsize=(8, 7), sharex=True)
ax[0].plot(t, I_B[0], color='black', label='Condition 1: +10 then -8')
ax[0].plot(t, I_B[1], color='tab:purple', linestyle='--', label='Condition 2: +6 then -12')
ax[0].set_ylabel('I (a.u.)')
ax[0].set_title('02B: Up/Down Perturbations in a Two-State System')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_B[0], color='tab:blue', label='Condition 1')
ax[1].plot(t, v_B[1], color='tab:red', linestyle='--', label='Condition 2')
ax[1].axhline(-65.0, color='tab:gray', linestyle='--', linewidth=1.0, label='baseline')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='lower right', fontsize=8)

ax[2].plot(t, u_B[0], color='tab:orange', label='Condition 1')
ax[2].plot(t, u_B[1], color='tab:brown', linestyle='--', label='Condition 2')
ax[2].set_ylabel('u (a.u.)')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right', fontsize=8)

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment C: Ramp comparison (slow vs fast ramp)
# Student interpretation:
# - Slow and fast ramps can reach the same peak current.
# - v and u show lag relative to changing input.
# - The u variable highlights slower recovery dynamics across ramp conditions.
# -------------------------------------------------------------------------
I_C = np.zeros((2, n))

# Condition 1: slow ramp up, brief hold, slow ramp down
up_idx_1 = (t >= 60) & (t < 170)
hold_idx_1 = (t >= 170) & (t < 200)
down_idx_1 = (t >= 200) & (t < 280)
I_C[0, up_idx_1] = np.linspace(0.0, 10.0, up_idx_1.sum(), endpoint=False)
I_C[0, hold_idx_1] = 10.0
I_C[0, down_idx_1] = np.linspace(10.0, 0.0, down_idx_1.sum(), endpoint=False)

# Condition 2: fast ramp up, long hold, fast ramp down
up_idx_2 = (t >= 60) & (t < 120)
hold_idx_2 = (t >= 120) & (t < 220)
down_idx_2 = (t >= 220) & (t < 260)
I_C[1, up_idx_2] = np.linspace(0.0, 10.0, up_idx_2.sum(), endpoint=False)
I_C[1, hold_idx_2] = 10.0
I_C[1, down_idx_2] = np.linspace(10.0, 0.0, down_idx_2.sum(), endpoint=False)

v_C = np.zeros((2, n))
u_C = np.zeros((2, n))
dvdt_C = np.zeros((2, n))
dudt_C = np.zeros((2, n))

v_C[:, 0] = -65.0
u_C[:, 0] = b * v_C[:, 0]

# Euler integration for Experiment C
for i in range(n - 1):
    for k in range(2):
        dvdt_C[k, i] = (-(v_C[k, i] + 65.0) - u_C[k, i] + I_C[k, i]) / tau_v
        dudt_C[k, i] = a * (b * v_C[k, i] - u_C[k, i])

        v_C[k, i + 1] = v_C[k, i] + dvdt_C[k, i] * dt
        u_C[k, i + 1] = u_C[k, i] + dudt_C[k, i] * dt

dvdt_C[:, -1] = dvdt_C[:, -2]
dudt_C[:, -1] = dudt_C[:, -2]

# Plot Experiment C right after simulation
fig, ax = plt.subplots(3, 1, figsize=(8, 7), sharex=True)
ax[0].plot(t, I_C[0], color='black', label='Condition 1: slow ramp')
ax[0].plot(t, I_C[1], color='tab:purple', linestyle='--', label='Condition 2: fast ramp')
ax[0].set_ylabel('I (a.u.)')
ax[0].set_title('02C: Ramp Inputs in a Two-State System')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_C[0], color='tab:blue', label='Condition 1')
ax[1].plot(t, v_C[1], color='tab:red', linestyle='--', label='Condition 2')
ax[1].set_ylabel('v (mV)')
ax[1].legend(loc='lower right', fontsize=8)

ax[2].plot(t, u_C[0], color='tab:orange', label='Condition 1')
ax[2].plot(t, u_C[1], color='tab:brown', linestyle='--', label='Condition 2')
ax[2].set_ylabel('u (a.u.)')
ax[2].set_xlabel('Time (ms)')
ax[2].legend(loc='upper right', fontsize=8)

plt.tight_layout()
plt.show()
