import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.stats import multivariate_normal

#################
# parameters
#################

tau = 1
spike_decay = 0.005

n_simulations = 1
n_trials = 1
n_steps = 3000
n_channels = 1

# ctx parameters
ctx_amp = 200
ctx_onset = 1000
ctx_offset = 2000

# striatal dopamine weights
w_da_msn_d1 = 1
w_da_msn_d2 = 1

# direct connection weights
w_ctx_msn_d1 = 0.5
w_msn_d1_gpi = 1.75e2
w_gpi_th = 500
w_th_pm = 700
w_ctx_th = 0.4

# indirect connection weights
w_ctx_msn_d2 = 1
w_msn_d2_gpe = 2.5e2
w_gpe_gpi = 1e1

# hyperdirect connection weights
w_ctx_stn = 1
w_stn_gpi = 1

#################
# allocate arrays
#################
o_ctx = np.zeros(n_steps)

v_msn_d1 = np.zeros((n_steps, n_channels))
u_msn_d1 = np.zeros((n_steps, n_channels))
o_msn_d1 = np.zeros((n_steps, n_channels))
base_msn_d1 = 250

v_msn_d2 = np.zeros((n_steps, n_channels))
u_msn_d2 = np.zeros((n_steps, n_channels))
o_msn_d2 = np.zeros((n_steps, n_channels))
base_msn_d2 = 250

v_gpi = np.zeros((n_steps, n_channels))
o_gpi = np.zeros((n_steps, n_channels))
base_gpi = 77

v_gpe = np.zeros((n_steps, n_channels))
o_gpe = np.zeros((n_steps, n_channels))
base_gpe = 73

v_stn = np.zeros((n_steps, n_channels))
o_stn = np.zeros((n_steps, n_channels))
base_stn = 200

v_th = np.zeros((n_steps, n_channels))
o_th = np.zeros((n_steps, n_channels))
base_th = 0

v_pm = np.zeros((n_steps, n_channels))
o_pm = np.zeros((n_steps, n_channels))
base_pm = 10


#################
# functions
#################
def plot_direct():

    av = 1
    ao = 1
    fig, ax = plt.subplots(5, 1, squeeze=False, figsize=(10, 7))
    ax[0, 0].plot(o_ctx, alpha=ao)
    ax[0, 0].set_title('Cortical Input')
    ax[1, 0].plot(v_msn_d1, alpha=av)
    ax[1, 0].twinx().plot(o_msn_d1, alpha=ao, color='C1')
    ax[1, 0].set_title('Striatum D1 Neuron')
    ax[2, 0].plot(v_gpi, alpha=av)
    ax[2, 0].twinx().plot(o_gpi, alpha=ao, color='C1')
    ax[2, 0].set_title('Globus Pallidus Internal Segment')
    ax[3, 0].plot(v_th, alpha=av)
    ax[3, 0].twinx().plot(o_th, alpha=ao, color='C1')
    ax[3, 0].set_title('Thalamus')
    ax[4, 0].plot(v_pm, alpha=av)
    ax[4, 0].twinx().plot(o_pm, alpha=ao, color='C1')
    ax[4, 0].set_title('Motor Cortex Output')
    plt.tight_layout()
    plt.show()


def plot_indirect():

    av = 1
    ao = 1
    fig, ax = plt.subplots(5, 2, squeeze=False, figsize=(12, 7))

    ax[0, 0].plot(o_ctx, alpha=ao)
    ax[0, 0].set_title('Cortical Input')
    ax[1, 0].plot(v_msn_d1, alpha=av)
    ax[1, 0].twinx().plot(o_msn_d1, alpha=ao, color='C1')
    ax[1, 0].set_title('Striatum D1 Neuron')
    ax[2, 0].plot(v_gpi, alpha=av)
    ax[2, 0].twinx().plot(o_gpi, alpha=ao, color='C1')
    ax[2, 0].set_title('Globus Pallidus Internal Segment')
    ax[3, 0].plot(v_th, alpha=av)
    ax[3, 0].twinx().plot(o_th, alpha=ao, color='C1')
    ax[3, 0].set_title('Thalamus')
    ax[4, 0].plot(v_pm, alpha=av)
    ax[4, 0].twinx().plot(o_pm, alpha=ao, color='C1')
    ax[4, 0].set_title('Motor Cortex Output')

    ax[0, 1].plot(o_ctx, alpha=ao)
    ax[0, 1].set_title('Cortical Input')
    ax[1, 1].plot(v_msn_d2, alpha=av)
    ax[1, 1].twinx().plot(o_msn_d2, alpha=ao, color='C1')
    ax[1, 1].set_title('Striatum D2 Neuron')
    ax[2, 1].plot(v_gpe, alpha=av)
    ax[2, 1].twinx().plot(o_gpe, alpha=ao, color='C1')
    ax[2, 1].set_title('Globus Pallidus External Segment')
    ax[3, 1].plot(v_th, alpha=av)

    plt.tight_layout()
    plt.show()


def plot_hyperdirect():

    av = 1
    ao = 1
    fig, ax = plt.subplots(5, 3, squeeze=False, figsize=(12, 7))

    ax[0, 0].plot(o_ctx, alpha=ao)
    ax[0, 0].set_title('Cortical Input')
    ax[1, 0].plot(v_msn_d1, alpha=av)
    ax[1, 0].twinx().plot(o_msn_d1, alpha=ao, color='C1')
    ax[1, 0].set_title('Striatum D1 Neuron')
    ax[2, 0].plot(v_gpi, alpha=av)
    ax[2, 0].twinx().plot(o_gpi, alpha=ao, color='C1')
    ax[2, 0].set_title('Globus Pallidus Internal Segment')
    ax[3, 0].plot(v_th, alpha=av)
    ax[3, 0].twinx().plot(o_th, alpha=ao, color='C1')
    ax[3, 0].set_title('Thalamus')
    ax[4, 0].plot(v_pm, alpha=av)
    ax[4, 0].twinx().plot(o_pm, alpha=ao, color='C1')
    ax[4, 0].set_title('Motor Cortex Output')

    ax[0, 1].plot(o_ctx, alpha=ao)
    ax[0, 1].set_title('Cortical Input')
    ax[1, 1].plot(v_msn_d2, alpha=av)
    ax[1, 1].twinx().plot(o_msn_d2, alpha=ao, color='C1')
    ax[1, 1].set_title('Striatum D2 Neuron')
    ax[2, 1].plot(v_gpe, alpha=av)
    ax[2, 1].twinx().plot(o_gpe, alpha=ao, color='C1')
    ax[2, 1].set_title('Globus Pallidus External Segment')
    ax[3, 1].plot(v_th, alpha=av)

    ax[0, 2].plot(o_ctx, alpha=ao)
    ax[0, 2].set_title('Cortical Input')
    ax[1, 2].plot(v_stn, alpha=av)
    ax[1, 2].twinx().plot(o_stn, alpha=ao, color='C1')
    ax[1, 2].set_title('subthalamic Nucleus')

    plt.tight_layout()
    plt.show()


def update_ctx():

    o = o_ctx
    o_ctx[ctx_onset:ctx_offset] = ctx_amp


def update_msn_d1(i):

    v = v_msn_d1
    u = u_msn_d1
    o = o_msn_d1
    base = base_msn_d1

    # compute inputs
    I = base + w_ctx_msn_d1 * o_ctx[i] * w_da_msn_d1

    C = 50
    vr = -80
    vt = -25
    k = 1
    a = 0.01
    b = -20
    c = -55
    d = 150
    vpeak = 40
    v[0, :] = vr

    v[i + 1, :] = v[i, :] + tau * (k * (v[i, :] - vr) *
                                   (v[i, :] - vt) - u[i, :] + I) / C
    u[i + 1, :] = u[i, :] + tau * a * (b * (v[i, :] - vr) - u[i, :])
    o[i + 1, :] = o[i, :] + spike_decay * (np.heaviside(v[i, :] - vt, vt) -
                                           o[i, :])

    for ii in range(n_channels):
        if v[i + 1, ii] >= vpeak:
            v[i, ii] = vpeak
            v[i + 1, ii] = c
            u[i + 1, ii] = u[i + 1, ii] + d


def update_msn_d2(i):

    v = v_msn_d2
    u = u_msn_d2
    o = o_msn_d2
    base = base_msn_d2

    # compute inputs
    I = base + w_ctx_msn_d2 * o_ctx[i] * w_da_msn_d2

    C = 50
    vr = -80
    vt = -25
    k = 1
    a = 0.01
    b = -20
    c = -55
    d = 150
    vpeak = 40
    v[0, :] = vr

    v[i + 1, :] = v[i, :] + tau * (k * (v[i, :] - vr) *
                                   (v[i, :] - vt) - u[i, :] + I) / C
    u[i + 1, :] = u[i, :] + tau * a * (b * (v[i, :] - vr) - u[i, :])
    o[i + 1, :] = o[i, :] + spike_decay * (np.heaviside(v[i, :] - vt, vt) -
                                           o[i, :])

    for ii in range(n_channels):
        if v[i + 1, ii] >= vpeak:
            v[i, ii] = vpeak
            v[i + 1, ii] = c
            u[i + 1, ii] = u[i + 1, ii] + d


def update_gpi(i):

    v = v_gpi
    o = o_gpi
    base = base_gpi
    I = base - w_msn_d1_gpi * o_msn_d1[i, :] - w_gpe_gpi * o_gpe[i, :]
    update_qif(v, o, I, i)


def update_gpe(i):

    v = v_gpe
    o = o_gpe
    base = base_gpe
    I = base - w_msn_d2_gpe * o_msn_d2[i, :]
    update_qif(v, o, I, i)

def update_stn(i):

    v = v_stn
    o = o_stn
    base = base_stn
    I = base - w_ctx_stn * o_stn[i, :]
    update_qif(v, o, I, i)

def update_th(i):

    v = v_th
    o = o_th
    base = base_th
    I = base - w_gpi_th * o_gpi[i, :] + w_ctx_th * o_ctx[i]
    update_qif(v, o, I, i)


def update_pm(i):

    v = v_pm
    o = o_pm
    base = base_pm
    I = w_th_pm * o_th[i, :] + np.random.normal(base, 100, n_channels)
    update_qif(v, o, I, i)


def update_qif(v, o, I, i):

    C = 25
    vr = -60
    vt = -40
    k = 0.7
    c = -50
    vpeak = 35
    v[0, :] = vr

    v[i + 1, :] = v[i, :] + tau * (k * (v[i, :] - vr) * (v[i, :] - vt) + I) / C
    o[i + 1, :] = o[i, :] + spike_decay * (np.heaviside(v[i, :] - vt, vt) -
                                           o[i, :])

    for ii in range(v.shape[1]):
        if v[i + 1, ii] >= vpeak:
            v[i, ii] = vpeak
            v[i + 1, ii] = c


#################
# Simulate the model
#################

# direct pathway
# for j in range(n_trials):

#     update_ctx()

#     for k in range(n_steps - 1):

#         update_msn_d1(k)
#         update_gpi(k)
#         update_th(k)
#         update_pm(k)

#     plot_direct()

# direct and indirect pathway
for j in range(n_trials):

    update_ctx()

    for k in range(n_steps - 1):

        update_msn_d1(k)
        update_msn_d2(k)
        update_gpi(k)
        update_gpe(k)
        update_th(k)
        update_pm(k)

    plot_indirect()

# # direct, indirect, and hyperdirect pathway
# for j in range(n_trials):

#     update_ctx()

#     for k in range(n_steps - 1):

#         update_stn(k)
#         update_msn_d1(k)
#         update_msn_d2(k)
#         update_gpi(k)
#         update_gpe(k)
#         update_th(k)
#         update_pm(k)

#     plot_hyperdirect()
