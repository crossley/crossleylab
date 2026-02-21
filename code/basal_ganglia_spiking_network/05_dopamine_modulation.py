"""
Lesson 5: Dopamine modulation (open loop)
Three stacked runs compare low, baseline, and high dopamine tone.
Dopamine scales corticostriatal efficacy oppositely for D1 and D2 pathways.
"""
import numpy as np
import matplotlib.pyplot as plt

# ------------------------------------------------------------
# Shared simulation constants (kept consistent across lessons)
# ------------------------------------------------------------
DT = 0.1
T = 3000
t = np.arange(0, T, DT)
n_steps = t.shape[0]

np.random.seed(0)

I_amp = 300
I_in = np.zeros(n_steps)
I_in[n_steps // 3:2 * n_steps // 3] = I_amp

# Plot style (fixed across all lessons)
V_ALPHA = 0.25
O_ALPHA = 1.0
O_LINEWIDTH = 2.0

# Cell index map
ctx = 0
d1 = 1
d2 = 2
gpi = 3
gpe = 4
th = 5
stn = 6
pm = 7

labels = {
    ctx: 'Sensory Cortex',
    d1: 'D1 Striatum',
    d2: 'D2 Striatum',
    gpi: 'GPi',
    gpe: 'GPe',
    th: 'Thalamus',
    stn: 'STN',
    pm: 'Motor Cortex',
}

# Izhikevich parameters: [C, vr, vt, vpeak, a, b, c, d, k]
iz_params = np.array([
    [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7],
    [50, -80, -25, 40, 0.01, -20, -55, 150, 1.0],
    [50, -80, -25, 40, 0.01, -20, -55, 150, 1.0],
    [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7],
    [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7],
    [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7],
    [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7],
    [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7],
])

n_cells = iz_params.shape[0]

# tonic drives
E = np.array([0, 0, 0, 300, 260, 500, 0, 0], dtype=float)

# synapse response
psp_amp = 1000
psp_decay = 100

# Baseline connectivity
W_base = np.zeros((n_cells, n_cells))
# direct pathway
W_base[ctx, d1] = 250
W_base[d1, gpi] = -150
# indirect pathway
W_base[ctx, d2] = 250
W_base[d2, gpe] = -120
W_base[gpe, gpi] = -40
# hyperdirect pathway
W_base[ctx, stn] = 220
W_base[stn, gpi] = 80
# STN-GPe loop (stable regime)
W_base[stn, gpe] = 20
W_base[gpe, stn] = -50
# output
W_base[gpi, th] = -120
W_base[th, pm] = 120

# Dopamine levels: low, baseline, high
# DA scales ctx->d1 up and ctx->d2 down as DA increases.
da_conditions = [
    ('Low DA', -0.5),
    ('Baseline DA', 0.0),
    ('High DA', 0.5),
]
k_da = 0.6


def run_simulation(da_level):
    W = W_base.copy()

    d1_scale = max(0.0, 1 + k_da * da_level)
    d2_scale = max(0.0, 1 - k_da * da_level)
    W[ctx, d1] = W_base[ctx, d1] * d1_scale
    W[ctx, d2] = W_base[ctx, d2] * d2_scale

    v = np.zeros((n_cells, n_steps))
    u = np.zeros((n_cells, n_steps))
    g = np.zeros((n_cells, n_steps))
    spike = np.zeros((n_cells, n_steps))

    v[:, 0] = iz_params[:, 1] + np.random.rand(n_cells) * 5

    for i in range(1, n_steps):
        dt = t[i] - t[i - 1]

        I_net = W.T @ g[:, i - 1]
        I_net[ctx] += I_in[i - 1]
        I_net += E

        for j in range(n_cells):
            C, vr, vt, vpeak, a, b, c, d, k = iz_params[j]

            dvdt = (k * (v[j, i - 1] - vr) * (v[j, i - 1] - vt) - u[j, i - 1] + I_net[j]) / C
            dudt = a * (b * (v[j, i - 1] - vr) - u[j, i - 1])
            dgdt = (-g[j, i - 1] + psp_amp * spike[j, i - 1]) / psp_decay

            v[j, i] = v[j, i - 1] + dvdt * dt
            u[j, i] = u[j, i - 1] + dudt * dt
            g[j, i] = g[j, i - 1] + dgdt * dt

            if v[j, i] >= vpeak:
                v[j, i - 1] = vpeak
                v[j, i] = c
                u[j, i] += d
                spike[j, i] = 1

    return v, g


def plot_result(v, g, title):
    pathways = [
        ('Direct Pathway', [ctx, d1, gpi, th, pm]),
        ('Indirect Pathway', [ctx, d2, gpe, None, None]),
        ('Hyperdirect Pathway', [ctx, stn, None, None, None]),
    ]
    fig, ax = plt.subplots(5, len(pathways), squeeze=False, figsize=(13.0, 7.6), sharex=True)
    fig.suptitle(title)

    for col, (pathway_name, cell_list) in enumerate(pathways):
        for row, cell_idx in enumerate(cell_list):
            ax1 = ax[row, col]
            if cell_idx is None:
                ax1.axis('off')
                continue
            ax2 = ax1.twinx()
            ax1.plot(t, v[cell_idx, :], color='C0', alpha=V_ALPHA)
            ax2.plot(t, g[cell_idx, :], color='C1', alpha=O_ALPHA, linewidth=O_LINEWIDTH)
            if row == 0:
                ax1.set_title(pathway_name)
            ax1.set_ylabel(labels[cell_idx], fontsize=8)

    plt.tight_layout()
    plt.show()


for da_label, da_level in da_conditions:
    v, g = run_simulation(da_level)
    plot_result(v, g, f'Lesson 5: Dopamine Modulation - {da_label} (Open Loop)')
