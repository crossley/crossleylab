# Basal Ganglia Spiking Network Tutorial

This folder contains an open-loop, matrix-based tutorial progression
for building basal ganglia spiking network models with Izhikevich neurons.
Each lesson injects a square pulse into sensory cortex and shows voltage
(`v`) plus synaptic output (`g`) traces.

## File Overview

1. `01_direct_pathway.py`
   - Direct pathway only: `Sensory Cortex -> D1 -> GPi -> Thalamus -> Motor Cortex`.
   - Demonstrates disinhibition and drive facilitation through the direct route.

2. `02_add_indirect_pathway.py`
   - Adds indirect branch: `Sensory Cortex -> D2 -> GPe`.
   - Uses a two-column pathway layout (direct and indirect) without duplicating shared downstream neurons.

3. `03_add_hyperdirect_pathway.py`
   - Adds hyperdirect branch: `Sensory Cortex -> STN`.
   - Uses a three-column layout (direct, indirect, hyperdirect) to compare pathway-specific activity.

4. `04_stn_gpe_loop.py`
   - Full direct+indirect+hyperdirect model with reciprocal `STN <-> GPe`.
   - Runs two separate regimes (stable and high-gain) for comparison.

5. `05_dopamine_modulation.py`
   - Full open-loop model with dopamine-modulated corticostriatal efficacy.
   - Runs three separate conditions: low DA, baseline DA, high DA.

## Notes

- All lessons keep shared simulation constants for easier comparison.
- The update method is matrix-based (`W.T @ g`) throughout.
- Plot style is consistent across files, with synaptic output emphasized over voltage.
