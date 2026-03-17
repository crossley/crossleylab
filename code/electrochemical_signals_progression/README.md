# Electrochemical Signalling: Progressive Python Simulations

A sequence of Python simulations that build from unconstrained
Brownian motion to a Hodgkin–Huxley-style action potential.
Each script adds one new mechanism while preserving the
structure introduced earlier, making the progression suitable
for students at varying levels of programming comfort.

Scripts are grouped into five arcs that mirror the
accompanying web-based interactive series.

## Running the scripts

Each script requires **NumPy** and **Matplotlib** (with
`ffmpeg` on `PATH` for the MP4-producing scripts).

```bash
pip install numpy matplotlib
python inspect_diffusion_1.py          # opens animation window
```

Output files (`.mp4` or `.png`) are written to the same
directory as the script unless a path is configured at the
top of the file.

---

## Arc 1 — Diffusion and the Concentration Gradient Problem

*How does a substance spread through space, and what role
does a membrane play?*

**inspect_diffusion_1.py** — L1
Pure 2D Brownian motion; particles spread randomly through an
open chamber with no barriers or forces.

**inspect_diffusion_2.py** — L2
A membrane divides the chamber. Particles cross only through
a single pore. Equilibration slows as the pore narrows.

**inspect_diffusion_3.py** — L3
Pore geometry is fixed; a per-crossing probability controls
how often a particle is allowed through. Same final
equilibrium regardless of probability — only the rate changes.

**inspect_diffusion_4.py** — L4
Two ion types (Na⁺ and K⁺ analogues) each cross only through
their own channel type. Selective permeability is demonstrated
without any electrical forces.

**inspect_diffusion_5_probabilistic_gating.py** — L3 extension
Stochastic gate: each crossing attempt succeeds with
probability `open_prob`. Demonstrates that equilibrium is
always 50/50 — permeability controls rate, not outcome.

**inspect_diffusion_6_na_k_biological_ic.py** — L5
Na⁺ starts mostly outside, K⁺ mostly inside, matching
biological initial conditions. Without a pump both converge
to equal concentrations — motivating the need for active
transport.

---

## Arc 2 — Electricity and the Concentration Gradient

*How does an electrical field interact with a concentration
gradient, and what is needed to maintain the biological
ion distributions?*

**inspect_electrochemical_1.py** — L6
A point charge creates an electrical field that biases
particle positions. Diffusion and electrical force act in
opposition.

**inspect_electrochemical_2.py** — L7
Particle–particle repulsion added. Crowding effects compete
with electrical attraction.

**inspect_electrochemical_3.py** — L8
Two ion types with type-selective channels plus electrical
drift and repulsion. Both species are attracted inside by
fixed anions — the biological gradient is not produced.

**inspect_electrochemical_4_nak_pump.py** — L9
A probabilistic Na/K pump teleports Na⁺ out and K⁺ in
against the electrical and concentration gradients,
establishing the biological ion distribution.

---

## Arc 3 — The Resting Potential

*What is membrane potential, how does it arise from ion
gradients, and what determines its value?*

**inspect_resting_potential_1.py** — L10 predecessor
Single-channel toy resting-potential simulation with a
transient depolarising perturbation.

**inspect_resting_potential_2.py** — L11 predecessor
Two-ion selective permeability with per-ion and total
imbalance traces as voltage proxies.

**inspect_resting_potential_3.py** — L12 predecessor
Two-ion model with a distributed negative charge wall
creating a lateral electrical field.

**inspect_resting_potential_4.py** — L12
Goldman-equation-style permeability-weighted log-ratio
prediction overlaid on the simulation trace.

**inspect_resting_potential_5_voltage_concept.py** — L10
Static diagram: four charge-separation scenarios illustrate
how V_m = (inside net charge) − (outside net charge).
Saved as a PNG.

**inspect_resting_potential_6_nernst_one_ion.py** — L11
K⁺ only; the membrane potential and a Nernst-equation proxy
converge as the system reaches electrochemical equilibrium.

**inspect_resting_potential_7_markov_channels.py** — L15
Many two-state (open/closed) channels; stacked single-channel
traces and a summed macroscopic current. Saved as a PNG.

**inspect_resting_potential_8_dynamic_field_vm.py** — L13
K⁺ plus a pump plus an electrode; changing `electrode_charge`
shifts V_m above or below the reversal point and reverses
the direction of net ion flow.

---

## Arc 4 — Voltage and Current

*How do channels that sense voltage produce the currents
measured in electrophysiology experiments?*

*(Web-only lessons for L14–L17; Python coverage to follow.)*

---

## Arc 5 — The Action Potential

**inspect_ap_1_voltage_gated_current_input.py** — L18
Hodgkin–Huxley-style simulation: m²h Na⁺ gating and n² K⁺
gating driven by a current pulse. V_m, gating variables, and
per-ion currents are plotted. Produces a full action potential
waveform.

---

## Numerical Method Reference

**eulers_method.py**
Standalone Euler-method example connecting the forward-Euler
update rule used throughout the progression to the concept of
numerical integration.

---

## Citation

If you use this repository in academic work, please cite:

* *[paper citation]*
* *[Zenodo DOI once released]*

---

## License

MIT License.
