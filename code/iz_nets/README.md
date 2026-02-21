# Izhikevich Network Construction Progression

This folder teaches small spiking-network construction methods
using the same 3-neuron motifs and Izhikevich dynamics.

## File Overview

1. `01_bruteforce.py`
   - Hand-written neuron updates and hand-wired signal flow.
   - Includes four motifs:
     - feedforward excitation (`A -> B -> C`)
     - tonic inhibitive control (`A -> B ⊣ C`, with tonic `B`)
     - input-gated inhibition (`A -> inhibitory B -> C`)
     - recurrent excitation (`A -> B -> C -> A`)

2. `02_nested_loops.py`
   - Same motifs using nested loops over pre- and postsynaptic neurons.
   - Connectivity is represented as a weight matrix but summed explicitly.

3. `03_matrix.py`
   - Same motifs using matrix multiplication (`W.T @ g`) for synaptic input.
   - Most compact and scalable implementation of the three files.

## Notes

- The progression keeps model equations and scenarios aligned across files.
- Scripts are intended to be compared side-by-side to see coding style tradeoffs.
