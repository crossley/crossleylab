"""
03: Quadratic Voltage Dynamics

Model implemented:
- A one-variable quadratic membrane equation:
  dv/dt = 0.04*v^2 + 5*v + 140 + I
- This script does not yet include threshold-reset spiking.

Why this matters in the progression:
- File 02 introduced coupled v-u dynamics.
- This file introduces the nonlinear quadratic voltage term used by Izhikevich.
- It shows how nonlinear membrane growth can accelerate with depolarization.
"""

import numpy as np
import matplotlib.pyplot as plt

# Simulation timing
T = 300.0          # total simulated time (ms)
dt = 0.25          # sample interval (ms)
t = np.arange(0, T + dt, dt)
n = t.size

# -------------------------------------------------------------------------
# Experiment A: Step family (three amplitudes)
# Student interpretation:
# - Larger steps drive stronger nonlinear acceleration in voltage.
# - The quadratic term makes high-voltage growth faster than a linear model.
# -------------------------------------------------------------------------
I_A = np.zeros((3, n))
I_A[0, (t >= 60) & (t < 220)] = 1.5
I_A[1, (t >= 60) & (t < 220)] = 2.5
I_A[2, (t >= 60) & (t < 220)] = 3.5

v_A = np.zeros((3, n))
dvdt_A = np.zeros((3, n))
v_A[:, 0] = -70.0

# Euler integration for Experiment A
for i in range(n - 1):
    for k in range(3):
        dvdt_A[k, i] = 0.04 * v_A[k, i] * v_A[k, i] + 5.0 * v_A[k, i] + 140.0 + I_A[k, i]
        v_A[k, i + 1] = v_A[k, i] + dvdt_A[k, i] * dt

        # Soft cap keeps no-reset traces visually interpretable.
        if v_A[k, i + 1] > 60.0:
            v_A[k, i + 1] = 60.0

dvdt_A[:, -1] = dvdt_A[:, -2]

# Plot Experiment A right after simulation
fig, ax = plt.subplots(2, 1, figsize=(8, 5), sharex=True)
ax[0].plot(t, I_A[0], color='tab:gray', label='I = 1.5')
ax[0].plot(t, I_A[1], color='tab:green', label='I = 2.5')
ax[0].plot(t, I_A[2], color='black', label='I = 3.5')
ax[0].set_ylabel('I (a.u.)')
ax[0].set_title('03A: Step Family in Quadratic Voltage Model')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_A[0], color='tab:gray', label='I = 1.5')
ax[1].plot(t, v_A[1], color='tab:green', label='I = 2.5')
ax[1].plot(t, v_A[2], color='tab:blue', label='I = 3.5')
ax[1].set_ylabel('v (mV)')
ax[1].set_xlabel('Time (ms)')
ax[1].legend(loc='lower right', fontsize=8)

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment B: Pulse-width comparison (same amplitude)
# Student interpretation:
# - Current amplitude is fixed, but pulse duration changes.
# - Longer depolarizing pulses allow nonlinear growth to continue longer.
# -------------------------------------------------------------------------
I_B = np.zeros((2, n))
I_B[0, (t >= 70) & (t < 130)] = 3.0   # short pulse
I_B[1, (t >= 70) & (t < 210)] = 3.0   # long pulse

v_B = np.zeros((2, n))
dvdt_B = np.zeros((2, n))
v_B[:, 0] = -70.0

# Euler integration for Experiment B
for i in range(n - 1):
    for k in range(2):
        dvdt_B[k, i] = 0.04 * v_B[k, i] * v_B[k, i] + 5.0 * v_B[k, i] + 140.0 + I_B[k, i]
        v_B[k, i + 1] = v_B[k, i] + dvdt_B[k, i] * dt

        if v_B[k, i + 1] > 60.0:
            v_B[k, i + 1] = 60.0

dvdt_B[:, -1] = dvdt_B[:, -2]

# Plot Experiment B right after simulation
fig, ax = plt.subplots(2, 1, figsize=(8, 5), sharex=True)
ax[0].plot(t, I_B[0], color='black', label='Condition 1: short pulse')
ax[0].plot(t, I_B[1], color='tab:purple', linestyle='--', label='Condition 2: long pulse')
ax[0].set_ylabel('I (a.u.)')
ax[0].set_title('03B: Pulse Width Comparison')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_B[0], color='tab:blue', label='Condition 1')
ax[1].plot(t, v_B[1], color='tab:red', linestyle='--', label='Condition 2')
ax[1].set_ylabel('v (mV)')
ax[1].set_xlabel('Time (ms)')
ax[1].legend(loc='lower right', fontsize=8)

plt.tight_layout()
plt.show()

# -------------------------------------------------------------------------
# Experiment C: Ramp vs step (similar peak amplitude)
# Student interpretation:
# - A step introduces abrupt drive; a ramp introduces gradual drive.
# - In a nonlinear model, timing of input delivery can strongly affect the
#   voltage trajectory.
# -------------------------------------------------------------------------
I_C = np.zeros((2, n))

# Condition 1: abrupt step
I_C[0, (t >= 80) & (t < 220)] = 3.0

# Condition 2: ramp up, hold, ramp down
up_idx = (t >= 80) & (t < 160)
hold_idx = (t >= 160) & (t < 200)
down_idx = (t >= 200) & (t < 250)
I_C[1, up_idx] = np.linspace(0.0, 3.0, up_idx.sum(), endpoint=False)
I_C[1, hold_idx] = 3.0
I_C[1, down_idx] = np.linspace(3.0, 0.0, down_idx.sum(), endpoint=False)

v_C = np.zeros((2, n))
dvdt_C = np.zeros((2, n))
v_C[:, 0] = -70.0

# Euler integration for Experiment C
for i in range(n - 1):
    for k in range(2):
        dvdt_C[k, i] = 0.04 * v_C[k, i] * v_C[k, i] + 5.0 * v_C[k, i] + 140.0 + I_C[k, i]
        v_C[k, i + 1] = v_C[k, i] + dvdt_C[k, i] * dt

        if v_C[k, i + 1] > 60.0:
            v_C[k, i + 1] = 60.0

dvdt_C[:, -1] = dvdt_C[:, -2]

# Plot Experiment C right after simulation
fig, ax = plt.subplots(2, 1, figsize=(8, 5), sharex=True)
ax[0].plot(t, I_C[0], color='black', label='Condition 1: step')
ax[0].plot(t, I_C[1], color='tab:purple', linestyle='--', label='Condition 2: ramp')
ax[0].set_ylabel('I (a.u.)')
ax[0].set_title('03C: Ramp vs Step Input')
ax[0].legend(loc='upper right', fontsize=8)

ax[1].plot(t, v_C[0], color='tab:blue', label='Condition 1')
ax[1].plot(t, v_C[1], color='tab:red', linestyle='--', label='Condition 2')
ax[1].set_ylabel('v (mV)')
ax[1].set_xlabel('Time (ms)')
ax[1].legend(loc='lower right', fontsize=8)

plt.tight_layout()
plt.show()
