# Shared Physics Reference

Equations and parameter conventions shared across the Python
and web simulation tracks.

All simulations use **forward Euler integration** with a fixed
timestep `dt`. Unless noted, units are arbitrary simulation
units (a.u.) — the goal is pedagogical illustration, not
biophysical accuracy.

---

## 1. Free Diffusion (L1)

### Equation

```
dx/dt = ξ_x(t),   dy/dt = ξ_y(t)

ξ_x, ξ_y ~ Normal(0, σ²)
```

### Euler step

```
x_new = reflect(x + ξ_x · dt, −L, L)
y_new = reflect(y + ξ_y · dt, −L, L)
```

`reflect(v, lo, hi)` bounces the particle off the wall
instead of letting it leave the chamber.

### Parameters

| Symbol | Python | Web default | Meaning |
|--------|--------|-------------|---------|
| σ | 0.5 (hardcoded) | `diffusionSd` (user) | Diffusion rate |
| dt | 1.0 ms | 1.0 ms | Timestep |
| N | 200 | 200 | Particle count |

**Difference:** Python hardcodes σ = 0.5; web exposes it as
`diffusionSd`. The physics is identical when `diffusionSd = 0.5`.

---

## 2. Membrane and Pore (L2)

A vertical wall at x = 0 divides the chamber. Crossing is
only allowed if the particle's y-coordinate falls within the
channel opening.

### Crossing rule

```
if x crosses x = 0 AND y_channel_min ≤ y ≤ y_channel_max:
    allow crossing
else:
    x_new = x_old  (particle stays on same side)
```

### Permeability variant (L3)

In the probabilistic-gate version the channel is always
geometrically open but each crossing attempt succeeds only
with probability `p`:

```
if x crosses wall AND in_channel:
    if random() < p:   allow crossing
    else:              reject (x stays)
```

**Python** uses channel width as a permeability proxy.
**Web** uses open probability `p` directly. Both produce the
same qualitative behaviour (slower equilibration at lower
permeability) but via different mechanisms.

---

## 3. Electrical Field Attraction (L6)

### Drift term

A fixed "charge source" at position `(cx, cy)` applies a
distance-normalised drift to each particle:

```
Δx = source_strength · (cx − x) / dist(particle, source)
Δy = source_strength · (cy − y) / dist(particle, source)
```

where `dist = sqrt((cx−x)² + (cy−y)²)`.

This is **not** a Coulomb 1/r² field — it is a heuristic
distance-normalised attraction that keeps forces bounded and
pedagogically transparent.

### Full step with diffusion

```
x_new = reflect(x + (ξ_x + Δx) · dt,  −L, L)
y_new = reflect(y + (ξ_y + Δy) · dt,  −L, L)
```

**Python (L6):** one source per panel (side-by-side weak/strong).  
**Web (L6):** up to 3 user-adjustable sources; same formula per
source, drifts summed.

---

## 4. Nernst Equilibrium (L11)

### Simulation voltage proxy

Compartment imbalance (dimensionless, not in mV):

```
V_sim = (N_right − N_left) / N_total
```

### Nernst equation overlay

```
E_K = (RT/zF) · ln([K]_out / [K]_in)
       ≈ goldmanScale · log(N_right / N_left)
```

where `goldmanScale` is a display scaling factor (not a
physical constant) chosen so V_sim and E_K share the same
axis range.

---

## 5. Goldman Equation (L12)

### Formula (identical in Python and web)

```
V_Goldman = goldmanScale · log(
    (P_A · N_Aout  +  P_B · N_Bout) /
    (P_A · N_Ain   +  P_B · N_Bin)
)
```

where `N_Xout` and `N_Xin` are particle counts in each
compartment, and `P_A`, `P_B` are the permeabilities
(channel width in Python; open probability in web).

Web adds a small epsilon inside the log for numerical
stability when a compartment is empty.

**Difference:** Python permeability proxy = channel **width**
(geometric); web permeability = Bernoulli open **probability**.
Both scale monotonically from 0 to 1 and produce the same
qualitative Goldman behaviour.

---

## 6. Na/K Pump (L9)

### Pump step

On each timestep, each Na⁺ particle on the inside has
probability `p_pump` of being teleported to the outside, and
each K⁺ particle on the outside has probability `p_pump` of
being teleported to the inside:

```
for each Na⁺ inside:
    if random() < p_pump:  move to outside (random y, inside x range)

for each K⁺ outside:
    if random() < p_pump:  move to inside (random y, outside x range)
```

This is an active-transport caricature — the pump acts against
both concentration and electrical gradients.

---

## 7. Markov Channel Gating (L15)

Each of `numChannels` channels is either open (`O`) or closed
(`C`) at each timestep.

### State transitions

```
C → O  with probability  α · dt
O → C  with probability  β · dt
```

Steady-state open fraction: `P_open = α / (α + β)`

The macroscopic current is the count of open channels at each
timestep.

---

## 8. Action Potential (L18, HH-style)

### Gating variables

```
m'  = α_m(V)·(1−m) − β_m(V)·m      (Na⁺ activation)
h'  = α_h(V)·(1−h) − β_h(V)·h      (Na⁺ inactivation)
n'  = α_n(V)·(1−n) − β_n(V)·n      (K⁺ activation)
```

### Conductances (simplified HH)

```
g_Na = g_Na_max · m² · h
g_K  = g_K_max  · n²
```

### Membrane potential

```
C_m · dV/dt = I_ext − g_Na·(V − E_Na) − g_K·(V − E_K) − g_L·(V − E_L)
```

All integrated with forward Euler.

---

## Parameter Glossary

| Symbol | Meaning |
|--------|---------|
| dt | Euler timestep (ms a.u.) |
| σ / diffusionSd | Standard deviation of per-step random displacement |
| L | Half-width of the square chamber |
| p | Channel open probability (Bernoulli trial per crossing) |
| P_A, P_B | Permeability of ion type A, B |
| goldmanScale | Display scale factor; maps log-ratio to voltage-proxy axis |
| p_pump | Per-timestep pump success probability |
| α, β | Markov channel opening/closing rates |
| E_Na, E_K, E_L | Reversal potentials for Na⁺, K⁺, leak |
| g_max | Maximal conductance |
| C_m | Membrane capacitance |

---

## Known Divergences Between Tracks

| Lesson | Python | Web | Notes |
|--------|--------|-----|-------|
| L1–L4 | σ = 0.5 hardcoded | σ = `diffusionSd` (user) | Same physics, different exposure |
| L3 | Channel width as permeability | Open probability as permeability | Same qualitative effect |
| L6 | One source per side-by-side panel | Up to 3 adjustable sources | Web is a superset |
| L7–L8 | Pairwise repulsion term (1/r²) | No pairwise repulsion | Web omits for performance |
| L12 | Width-proxy permeability | Bernoulli-probability permeability | Different mechanism, same Goldman formula |
| L15 | Static PNG | Interactive animation | Web is richer |
