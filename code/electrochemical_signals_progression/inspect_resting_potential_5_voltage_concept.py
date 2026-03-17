"""
Voltage as charge separation — static four-scenario figure.

This script is a static (non-animated) visualisation that illustrates how
membrane potential arises from charge imbalance between the inside and outside
of a cell. No dynamics are simulated; the student edits the particle counts at
the top of each scenario and observes the resulting V_m value.

Four pre-defined scenarios are shown as sub-plots on a single figure:
    1. Equal charges on both sides      → V_m = 0   (no potential difference)
    2. Excess positive ions inside      → V_m > 0   (depolarised / reversed)
    3. Excess negative ions inside      → V_m < 0   (typical resting state)
    4. Large anion excess inside        → V_m very negative (deep resting state)

Membrane potential is defined as:
    V_m = (n_pos_inside − n_neg_inside) − (n_pos_outside − n_neg_outside)
        = net charge inside − net charge outside   [qualitative, unitless]

Positive ions (+) are drawn as red circles labelled "+".
Negative ions (−) are drawn as blue circles labelled "−".
The membrane (vertical dashed line) divides inside (left) from outside (right).

Model assumptions / simplifications:
    - Positions are randomised within each half of the box for clarity.
    - No dynamics, no forces — this is a snapshot lesson in charge counting.
    - The student is encouraged to modify the scenario dictionaries and re-run.

Output:
    - Saves 'voltage_concept.png' in the working directory.

Conceptual focus (Lesson 10 — Voltage as Charge Separation):
    Voltage is not stored in a single particle but emerges from the difference
    in net charge across the membrane. A few extra charges on one side are
    enough to set up a measurable potential.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# ── Scenario definitions (edit these to explore) ──────────────────────────────
# Each dict: inside positive, inside negative, outside positive, outside negative
scenarios = [
    {
        "label":    "1. Equal charges",
        "n_pos_in": 10, "n_neg_in": 10,
        "n_pos_out": 10, "n_neg_out": 10,
    },
    {
        "label":    "2. Excess + inside (depolarised)",
        "n_pos_in": 16, "n_neg_in": 6,
        "n_pos_out": 6, "n_neg_out": 6,
    },
    {
        "label":    "3. Excess − inside (resting state)",
        "n_pos_in": 6,  "n_neg_in": 16,
        "n_pos_out": 6, "n_neg_out": 6,
    },
    {
        "label":    "4. Large anion excess (deep resting)",
        "n_pos_in": 6,  "n_neg_in": 30,
        "n_pos_out": 6, "n_neg_out": 0,
    },
]

# ── Layout parameters ─────────────────────────────────────────────────────────
box_w  = 5.0    # half-box half-width (inside and outside each span 0..box_w)
box_h  = 4.0
margin = 0.4

fig, axes = plt.subplots(1, 4, figsize=(18, 5))
fig.suptitle("Membrane Potential as Charge Separation  (V_m = inside net charge − outside net charge)",
             fontsize=12)

np.random.seed(7)

for ax, sc in zip(axes, scenarios):
    n_pi = sc["n_pos_in"];  n_ni = sc["n_neg_in"]
    n_po = sc["n_pos_out"]; n_no = sc["n_neg_out"]

    # V_m = net charge inside − net charge outside
    V_m = (n_pi - n_ni) - (n_po - n_no)

    # Random particle positions inside (x ∈ [-box_w, 0]) and outside (x ∈ [0, box_w])
    def rand_inside(n):
        return (np.random.uniform(margin - box_w, -margin, n),
                np.random.uniform(margin - box_h / 2, box_h / 2 - margin, n))

    def rand_outside(n):
        return (np.random.uniform(margin, box_w - margin, n),
                np.random.uniform(margin - box_h / 2, box_h / 2 - margin, n))

    # Inside positive (red)
    if n_pi > 0:
        xi, yi = rand_inside(n_pi)
        ax.scatter(xi, yi, s=120, color='#e84040', zorder=3)
        for px, py in zip(xi, yi):
            ax.text(px, py, '+', ha='center', va='center',
                    fontsize=7, color='white', fontweight='bold', zorder=4)

    # Inside negative (blue)
    if n_ni > 0:
        xi, yi = rand_inside(n_ni)
        ax.scatter(xi, yi, s=120, color='#4080e8', zorder=3)
        for px, py in zip(xi, yi):
            ax.text(px, py, '−', ha='center', va='center',
                    fontsize=9, color='white', fontweight='bold', zorder=4)

    # Outside positive (red)
    if n_po > 0:
        xo, yo = rand_outside(n_po)
        ax.scatter(xo, yo, s=120, color='#e84040', zorder=3)
        for px, py in zip(xo, yo):
            ax.text(px, py, '+', ha='center', va='center',
                    fontsize=7, color='white', fontweight='bold', zorder=4)

    # Outside negative (blue)
    if n_no > 0:
        xo, yo = rand_outside(n_no)
        ax.scatter(xo, yo, s=120, color='#4080e8', zorder=3)
        for px, py in zip(xo, yo):
            ax.text(px, py, '−', ha='center', va='center',
                    fontsize=9, color='white', fontweight='bold', zorder=4)

    # Membrane (vertical dashed line at x = 0)
    ax.axvline(0, color='k', linestyle='--', lw=1.5)

    # Side labels
    ax.text(-box_w / 2, -box_h / 2 + 0.15, 'INSIDE', ha='center',
            fontsize=8, color='#555555')
    ax.text( box_w / 2, -box_h / 2 + 0.15, 'OUTSIDE', ha='center',
            fontsize=8, color='#555555')

    ax.set_xlim(-box_w, box_w)
    ax.set_ylim(-box_h / 2, box_h / 2)
    ax.set_xticks([]); ax.set_yticks([])
    ax.set_aspect('equal')

    # V_m sign indicator coloured by direction
    vm_color = '#c00000' if V_m > 0 else ('#0040c0' if V_m < 0 else '#444444')
    ax.set_title(f"{sc['label']}\nV_m = {V_m:+d}  (arb. units)",
                 fontsize=9, color=vm_color)

# Legend
pos_patch = mpatches.Patch(color='#e84040', label='Positive ion (+)')
neg_patch = mpatches.Patch(color='#4080e8', label='Negative ion (−)')
fig.legend(handles=[pos_patch, neg_patch], loc='lower center',
           ncol=2, fontsize=10, frameon=False)

plt.tight_layout(rect=[0, 0.06, 1, 1])
plt.savefig("voltage_concept.png", dpi=150, bbox_inches='tight')
plt.close()
