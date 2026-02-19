# Izhikevich Tutorial Flow

This folder is a simple progression toward the Izhikevich neuron model.

## Sequence

1. `01_euler_membrane_intro.py`
   - Euler updates on a one-variable membrane model.
2. `02_two_state_system_intro.py`
   - Adds a second state variable (`u`) to introduce coupled dynamics.
3. `03_quadratic_voltage_dynamics.py`
   - Introduces the quadratic voltage term used in Izhikevich dynamics.
4. `04_izhikevich_single_neuron.py`
   - Full Izhikevich equations with threshold and reset.
5. `05_izhikevich_two_parameter_sets.py`
   - Same equations, different parameter sets to show phenotype differences.
6. `06_msn_vs_cortical_pyramidal.py`
   - Final comparison: striatal MSN-like vs cortical pyramidal-like responses.

## Shared style choices

- No function definitions (single top-to-bottom script flow).
- Every script uses:
  - `T` total simulated time (ms)
  - `dt` sample interval (ms)
  - `t` sampled time vector
  - `n` number of samples
- Arrays are allocated before simulation loops.
- State updates are Euler style (`x[i+1] = x[i] + dxdt * dt`).
