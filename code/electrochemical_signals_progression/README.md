# Electrochemical Signalling: Progressive Python Simulations

This repository provides a sequence of Python simulations
showing how electrochemical signalling concepts can be
constructed progressively from simple diffusion to
membrane-potential-like dynamics. The files are intended to
be read and executed in order, with each script adding a
small number of new mechanisms while preserving the
structure introduced earlier. Beginning with unconstrained
Brownian motion, the progression introduces membrane
geometry, channel permeability, electrical bias, particle
interactions, and selective transport, culminating in toy
resting-potential and Goldman-style demonstrations.

## Accompanying Paper

This repository accompanies the following paper:

*[paper title]*

This paper describes a pedagogical framework for teaching
electrochemical signalling and dynamical systems through
progressive simulation.

The repository therefore serves two purposes:

1. **Pedagogical** - demonstrating electrochemical concepts
   through incremental simulation examples.

2. **Conceptual** - illustrating how membrane potential
   emerges from interacting dynamical processes.

---

## Overall Progression

The examples follow a consistent progression:

1. **Diffusion and membrane geometry**

   * random walk diffusion
   * compartment boundaries and channel constraints
   * permeability differences via channel size/selectivity

2. **Electrochemical drift and interactions**

   * electrical bias added to diffusion
   * weak vs strong gradient comparisons
   * particle-particle repulsion and crowding effects

3. **Resting-potential-style dynamics**

   * two ion types with opposite charge signs
   * selective permeability by ion type
   * compartment imbalance traces as qualitative voltage proxies

4. **Numerical methods connection**

   * Euler updates as the integration rule used throughout

---

## File-by-File Overview

### Diffusion and Permeability Foundations

**inspect_diffusion_1.py**
Pure 2D Brownian diffusion with no barriers or forces.

**inspect_diffusion_2.py**
Diffusion in a two-compartment system separated by a wall
with a single channel.

**inspect_diffusion_3.py**
Side-by-side comparison of narrow versus wide channels to
show permeability effects on mixing.

**inspect_diffusion_4.py**
Two particle types with different channel access,
demonstrating selective permeability.

---

### Adding Electrical and Interaction Forces

**inspect_electrochemical_1.py**
Compares weak versus strong electrical attraction superimposed
on diffusion through a channel.

**inspect_electrochemical_2.py**
Adds particle-particle repulsion to diffusion plus electrical
drift.

**inspect_electrochemical_3.py**
Combines electrical drift, repulsion, and type-selective
channels in a two-species setting.

---

### Resting-Potential and Goldman-Style Extensions

**inspect_resting_potential_1.py**
Single-channel toy resting-potential simulation with a
transient depolarizing perturbation.

**inspect_resting_potential_2.py**
Two-ion selective permeability model with per-ion and total
imbalance traces.

**inspect_resting_potential_3.py**
Two-ion model using a distributed negative charge wall to
create a lateral field.

**inspect_resting_potential_4.py**
Adds a Goldman-equation-style permeability-weighted log-ratio
prediction overlay.

---

### Numerical Method Reference

**eulers_method.py**
Standalone Euler-method example connecting the update rule
used in the simulation progression to numerical integration
fundamentals.

---

## Citation

If you use this repository in academic work, please cite:

* *[paper citation]*
* *[Zenodo DOI once released]*

---

## License

MIT License.
