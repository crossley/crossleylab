"""
Brute-force network construction.
We write out each neuron update explicitly and pass signals forward by hand.
This makes the flow of information very clear, but it gets repetitive as
networks grow.
"""
import numpy as np
import matplotlib.pyplot as plt

# ------------------------------------------------------------
# Izhikevich regular spiking neuron with spike-triggered synapse
# ------------------------------------------------------------
# dv/dt = (k (v - vr)(v - vt) - u + I) / C
# du/dt = a (b (v - vr) - u)
# dg/dt = (-g + A * spike) / tau_g
# If v >= vpeak: v -> c, u -> u + d, spike = 1
# ------------------------------------------------------------

# ------------------------------------------------------------
# Pseudocode (brute force)
# ------------------------------------------------------------
# for t in timesteps:
#     update neuron A using I_in and baseline
#     update neuron B using g_A and baseline
#     update neuron C using g_B and baseline
# ------------------------------------------------------------

# simulation time
DT = 0.1
T = 3000
t = np.arange(0, T, DT)
n_steps = t.shape[0]

# keep initial conditions consistent across lessons
np.random.seed(0)

# input current (square pulse)
# NOTE: Keep this high enough to drive A to spike so activity propagates.
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

# ------------------------------------------------------------
# Network 1: feedforward excitation (A -> B -> C)
# Intended behavior: A spikes during the pulse, B follows, then C follows.
# Student prompt: Notice the timing delays. Try changing w_AB or w_BC to see
# how coupling strength affects propagation (or failure to propagate).
# ------------------------------------------------------------

w_AB = 80
w_BC = 80

E_A = 0
E_B = 0
E_C = 0

vA = np.zeros(n_steps)
uA = np.zeros(n_steps)
gA = np.zeros(n_steps)
spikeA = np.zeros(n_steps)

vB = np.zeros(n_steps)
uB = np.zeros(n_steps)
gB = np.zeros(n_steps)
spikeB = np.zeros(n_steps)

vC = np.zeros(n_steps)
uC = np.zeros(n_steps)
gC = np.zeros(n_steps)
spikeC = np.zeros(n_steps)

vA[0] = vr + np.random.rand() * 5
vB[0] = vr + np.random.rand() * 5
vC[0] = vr + np.random.rand() * 5

for i in range(1, n_steps):
    dt = t[i] - t[i - 1]

    I_A = I_in[i - 1] + E_A
    I_B = w_AB * gA[i - 1] + E_B
    I_C = w_BC * gB[i - 1] + E_C

    dvdt_A = (k * (vA[i - 1] - vr) * (vA[i - 1] - vt) - uA[i - 1] + I_A) / C
    dudt_A = a * (b * (vA[i - 1] - vr) - uA[i - 1])
    dgdt_A = (-gA[i - 1] + psp_amp * spikeA[i - 1]) / psp_decay

    vA[i] = vA[i - 1] + dvdt_A * dt
    uA[i] = uA[i - 1] + dudt_A * dt
    gA[i] = gA[i - 1] + dgdt_A * dt

    if vA[i] >= vpeak:
        vA[i - 1] = vpeak
        vA[i] = c
        uA[i] = uA[i] + d
        spikeA[i] = 1

    dvdt_B = (k * (vB[i - 1] - vr) * (vB[i - 1] - vt) - uB[i - 1] + I_B) / C
    dudt_B = a * (b * (vB[i - 1] - vr) - uB[i - 1])
    dgdt_B = (-gB[i - 1] + psp_amp * spikeB[i - 1]) / psp_decay

    vB[i] = vB[i - 1] + dvdt_B * dt
    uB[i] = uB[i - 1] + dudt_B * dt
    gB[i] = gB[i - 1] + dgdt_B * dt

    if vB[i] >= vpeak:
        vB[i - 1] = vpeak
        vB[i] = c
        uB[i] = uB[i] + d
        spikeB[i] = 1

    dvdt_C = (k * (vC[i - 1] - vr) * (vC[i - 1] - vt) - uC[i - 1] + I_C) / C
    dudt_C = a * (b * (vC[i - 1] - vr) - uC[i - 1])
    dgdt_C = (-gC[i - 1] + psp_amp * spikeC[i - 1]) / psp_decay

    vC[i] = vC[i - 1] + dvdt_C * dt
    uC[i] = uC[i - 1] + dudt_C * dt
    gC[i] = gC[i - 1] + dgdt_C * dt

    if vC[i] >= vpeak:
        vC[i - 1] = vpeak
        vC[i] = c
        uC[i] = uC[i] + d
        spikeC[i] = 1

fig, ax = plt.subplots(3, 1, squeeze=False, figsize=(10, 7))
fig.suptitle('Network 1: Feedforward Excitation (A -> B -> C)')

ax1 = ax[0, 0]
ax2 = ax1.twinx()
ax1.plot(t, vA, 'C0')
ax2.plot(t, gA, 'C1')
ax1.set_title('Neuron A')

ax1 = ax[1, 0]
ax2 = ax1.twinx()
ax1.plot(t, vB, 'C0')
ax2.plot(t, gB, 'C1')
ax1.set_title('Neuron B')

ax1 = ax[2, 0]
ax2 = ax1.twinx()
ax1.plot(t, vC, 'C0')
ax2.plot(t, gC, 'C1')
ax1.set_title('Neuron C')

plt.tight_layout()
plt.show()

# ------------------------------------------------------------
# Network 2: Excite-inhibit-disinhibit (A -> B ⊣ C), B tonic
# Intended behavior: B fires tonically and suppresses C. When A turns on,
# B fires more and C is further suppressed.
# Student prompt: Turn down E_B or w_BC to find the point where C escapes.
# ------------------------------------------------------------

w_AB = 80
w_BC = -120

E_A = 0
E_B = 300
E_C = 0

vA = np.zeros(n_steps)
uA = np.zeros(n_steps)
gA = np.zeros(n_steps)
spikeA = np.zeros(n_steps)

vB = np.zeros(n_steps)
uB = np.zeros(n_steps)
gB = np.zeros(n_steps)
spikeB = np.zeros(n_steps)

vC = np.zeros(n_steps)
uC = np.zeros(n_steps)
gC = np.zeros(n_steps)
spikeC = np.zeros(n_steps)

vA[0] = vr + np.random.rand() * 5
vB[0] = vr + np.random.rand() * 5
vC[0] = vr + np.random.rand() * 5

for i in range(1, n_steps):
    dt = t[i] - t[i - 1]

    I_A = I_in[i - 1] + E_A
    I_B = w_AB * gA[i - 1] + E_B
    I_C = w_BC * gB[i - 1] + E_C

    dvdt_A = (k * (vA[i - 1] - vr) * (vA[i - 1] - vt) - uA[i - 1] + I_A) / C
    dudt_A = a * (b * (vA[i - 1] - vr) - uA[i - 1])
    dgdt_A = (-gA[i - 1] + psp_amp * spikeA[i - 1]) / psp_decay

    vA[i] = vA[i - 1] + dvdt_A * dt
    uA[i] = uA[i - 1] + dudt_A * dt
    gA[i] = gA[i - 1] + dgdt_A * dt

    if vA[i] >= vpeak:
        vA[i - 1] = vpeak
        vA[i] = c
        uA[i] = uA[i] + d
        spikeA[i] = 1

    dvdt_B = (k * (vB[i - 1] - vr) * (vB[i - 1] - vt) - uB[i - 1] + I_B) / C
    dudt_B = a * (b * (vB[i - 1] - vr) - uB[i - 1])
    dgdt_B = (-gB[i - 1] + psp_amp * spikeB[i - 1]) / psp_decay

    vB[i] = vB[i - 1] + dvdt_B * dt
    uB[i] = uB[i - 1] + dudt_B * dt
    gB[i] = gB[i - 1] + dgdt_B * dt

    if vB[i] >= vpeak:
        vB[i - 1] = vpeak
        vB[i] = c
        uB[i] = uB[i] + d
        spikeB[i] = 1

    dvdt_C = (k * (vC[i - 1] - vr) * (vC[i - 1] - vt) - uC[i - 1] + I_C) / C
    dudt_C = a * (b * (vC[i - 1] - vr) - uC[i - 1])
    dgdt_C = (-gC[i - 1] + psp_amp * spikeC[i - 1]) / psp_decay

    vC[i] = vC[i - 1] + dvdt_C * dt
    uC[i] = uC[i - 1] + dudt_C * dt
    gC[i] = gC[i - 1] + dgdt_C * dt

    if vC[i] >= vpeak:
        vC[i - 1] = vpeak
        vC[i] = c
        uC[i] = uC[i] + d
        spikeC[i] = 1

fig, ax = plt.subplots(3, 1, squeeze=False, figsize=(10, 7))
fig.suptitle('Network 2: A -> B ⊣ C (B tonic)')

ax1 = ax[0, 0]
ax2 = ax1.twinx()
ax1.plot(t, vA, 'C0')
ax2.plot(t, gA, 'C1')
ax1.set_title('Neuron A')

ax1 = ax[1, 0]
ax2 = ax1.twinx()
ax1.plot(t, vB, 'C0')
ax2.plot(t, gB, 'C1')
ax1.set_title('Neuron B (tonic)')

ax1 = ax[2, 0]
ax2 = ax1.twinx()
ax1.plot(t, vC, 'C0')
ax2.plot(t, gC, 'C1')
ax1.set_title('Neuron C')

plt.tight_layout()
plt.show()

# ------------------------------------------------------------
# Network 3: A excites inhibitory neuron B, B inhibits C
# Intended behavior: B is quiet until A turns on; C is suppressed only
# during the A pulse (contrast with Network 2).
# Student prompt: Increase E_B slightly to make B tonic and compare with
# Network 2. How does C change?
# ------------------------------------------------------------

w_AB = 100
w_BC = -140

E_A = 0
E_B = 0
E_C = 0

vA = np.zeros(n_steps)
uA = np.zeros(n_steps)
gA = np.zeros(n_steps)
spikeA = np.zeros(n_steps)

vB = np.zeros(n_steps)
uB = np.zeros(n_steps)
gB = np.zeros(n_steps)
spikeB = np.zeros(n_steps)

vC = np.zeros(n_steps)
uC = np.zeros(n_steps)
gC = np.zeros(n_steps)
spikeC = np.zeros(n_steps)

vA[0] = vr + np.random.rand() * 5
vB[0] = vr + np.random.rand() * 5
vC[0] = vr + np.random.rand() * 5

for i in range(1, n_steps):
    dt = t[i] - t[i - 1]

    I_A = I_in[i - 1] + E_A
    I_B = w_AB * gA[i - 1] + E_B
    I_C = w_BC * gB[i - 1] + E_C

    dvdt_A = (k * (vA[i - 1] - vr) * (vA[i - 1] - vt) - uA[i - 1] + I_A) / C
    dudt_A = a * (b * (vA[i - 1] - vr) - uA[i - 1])
    dgdt_A = (-gA[i - 1] + psp_amp * spikeA[i - 1]) / psp_decay

    vA[i] = vA[i - 1] + dvdt_A * dt
    uA[i] = uA[i - 1] + dudt_A * dt
    gA[i] = gA[i - 1] + dgdt_A * dt

    if vA[i] >= vpeak:
        vA[i - 1] = vpeak
        vA[i] = c
        uA[i] = uA[i] + d
        spikeA[i] = 1

    dvdt_B = (k * (vB[i - 1] - vr) * (vB[i - 1] - vt) - uB[i - 1] + I_B) / C
    dudt_B = a * (b * (vB[i - 1] - vr) - uB[i - 1])
    dgdt_B = (-gB[i - 1] + psp_amp * spikeB[i - 1]) / psp_decay

    vB[i] = vB[i - 1] + dvdt_B * dt
    uB[i] = uB[i - 1] + dudt_B * dt
    gB[i] = gB[i - 1] + dgdt_B * dt

    if vB[i] >= vpeak:
        vB[i - 1] = vpeak
        vB[i] = c
        uB[i] = uB[i] + d
        spikeB[i] = 1

    dvdt_C = (k * (vC[i - 1] - vr) * (vC[i - 1] - vt) - uC[i - 1] + I_C) / C
    dudt_C = a * (b * (vC[i - 1] - vr) - uC[i - 1])
    dgdt_C = (-gC[i - 1] + psp_amp * spikeC[i - 1]) / psp_decay

    vC[i] = vC[i - 1] + dvdt_C * dt
    uC[i] = uC[i - 1] + dudt_C * dt
    gC[i] = gC[i - 1] + dgdt_C * dt

    if vC[i] >= vpeak:
        vC[i - 1] = vpeak
        vC[i] = c
        uC[i] = uC[i] + d
        spikeC[i] = 1

fig, ax = plt.subplots(3, 1, squeeze=False, figsize=(10, 7))
fig.suptitle('Network 3: A excites inhibitory B, B inhibits C')

ax1 = ax[0, 0]
ax2 = ax1.twinx()
ax1.plot(t, vA, 'C0')
ax2.plot(t, gA, 'C1')
ax1.set_title('Neuron A')

ax1 = ax[1, 0]
ax2 = ax1.twinx()
ax1.plot(t, vB, 'C0')
ax2.plot(t, gB, 'C1')
ax1.set_title('Neuron B')

ax1 = ax[2, 0]
ax2 = ax1.twinx()
ax1.plot(t, vC, 'C0')
ax2.plot(t, gC, 'C1')
ax1.set_title('Neuron C')

plt.tight_layout()
plt.show()

# ------------------------------------------------------------
# Network 4: Recurrent excitation loop (A -> B -> C -> A)
# Intended behavior: activity reverberates while A is driven and may
# persist briefly after the pulse depending on weights.
# Student prompt: Explore higher/lower w_CA to test when feedback sustains
# spiking vs. dies out.
# ------------------------------------------------------------

w_AB = 70
w_BC = 70
w_CA = 70

E_A = 0
E_B = 0
E_C = 0

vA = np.zeros(n_steps)
uA = np.zeros(n_steps)
gA = np.zeros(n_steps)
spikeA = np.zeros(n_steps)

vB = np.zeros(n_steps)
uB = np.zeros(n_steps)
gB = np.zeros(n_steps)
spikeB = np.zeros(n_steps)

vC = np.zeros(n_steps)
uC = np.zeros(n_steps)
gC = np.zeros(n_steps)
spikeC = np.zeros(n_steps)

vA[0] = vr + np.random.rand() * 5
vB[0] = vr + np.random.rand() * 5
vC[0] = vr + np.random.rand() * 5

for i in range(1, n_steps):
    dt = t[i] - t[i - 1]

    I_A = I_in[i - 1] + w_CA * gC[i - 1] + E_A
    I_B = w_AB * gA[i - 1] + E_B
    I_C = w_BC * gB[i - 1] + E_C

    dvdt_A = (k * (vA[i - 1] - vr) * (vA[i - 1] - vt) - uA[i - 1] + I_A) / C
    dudt_A = a * (b * (vA[i - 1] - vr) - uA[i - 1])
    dgdt_A = (-gA[i - 1] + psp_amp * spikeA[i - 1]) / psp_decay

    vA[i] = vA[i - 1] + dvdt_A * dt
    uA[i] = uA[i - 1] + dudt_A * dt
    gA[i] = gA[i - 1] + dgdt_A * dt

    if vA[i] >= vpeak:
        vA[i - 1] = vpeak
        vA[i] = c
        uA[i] = uA[i] + d
        spikeA[i] = 1

    dvdt_B = (k * (vB[i - 1] - vr) * (vB[i - 1] - vt) - uB[i - 1] + I_B) / C
    dudt_B = a * (b * (vB[i - 1] - vr) - uB[i - 1])
    dgdt_B = (-gB[i - 1] + psp_amp * spikeB[i - 1]) / psp_decay

    vB[i] = vB[i - 1] + dvdt_B * dt
    uB[i] = uB[i - 1] + dudt_B * dt
    gB[i] = gB[i - 1] + dgdt_B * dt

    if vB[i] >= vpeak:
        vB[i - 1] = vpeak
        vB[i] = c
        uB[i] = uB[i] + d
        spikeB[i] = 1

    dvdt_C = (k * (vC[i - 1] - vr) * (vC[i - 1] - vt) - uC[i - 1] + I_C) / C
    dudt_C = a * (b * (vC[i - 1] - vr) - uC[i - 1])
    dgdt_C = (-gC[i - 1] + psp_amp * spikeC[i - 1]) / psp_decay

    vC[i] = vC[i - 1] + dvdt_C * dt
    uC[i] = uC[i - 1] + dudt_C * dt
    gC[i] = gC[i - 1] + dgdt_C * dt

    if vC[i] >= vpeak:
        vC[i - 1] = vpeak
        vC[i] = c
        uC[i] = uC[i] + d
        spikeC[i] = 1

fig, ax = plt.subplots(3, 1, squeeze=False, figsize=(10, 7))
fig.suptitle('Network 4: Recurrent Excitation Loop (A -> B -> C -> A)')

ax1 = ax[0, 0]
ax2 = ax1.twinx()
ax1.plot(t, vA, 'C0')
ax2.plot(t, gA, 'C1')
ax1.set_title('Neuron A')

ax1 = ax[1, 0]
ax2 = ax1.twinx()
ax1.plot(t, vB, 'C0')
ax2.plot(t, gB, 'C1')
ax1.set_title('Neuron B')

ax1 = ax[2, 0]
ax2 = ax1.twinx()
ax1.plot(t, vC, 'C0')
ax2.plot(t, gC, 'C1')
ax1.set_title('Neuron C')

plt.tight_layout()
plt.show()
