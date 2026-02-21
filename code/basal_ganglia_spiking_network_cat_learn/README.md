# Basal Ganglia Category Learning Models

This folder contains spiking-network models for procedural category learning,
including both compact matrix-based code and explicit brute-force variants.

## File Overview

1. `model_cat_learn.py`
   - Matrix-based two-channel direct-pathway model (A/B response channels).
   - Uses visual input maps projected to striatal units.
   - Includes trial-wise reward prediction error and corticostriatal weight updates.

2. `model_cat_learn_brute.py`
   - Brute-force version of the same category-learning architecture.
   - Expands each pathway/unit explicitly for readability.
   - Useful for tracing each update step-by-step.

3. `model_speed_brute.py`
   - Brute-force SPEED-style extension with both subcortical and cortical learning routes.
   - Combines reinforcement-driven and Hebbian-style updates across pathways.

## Notes

- These scripts are longer, full-task simulations (many trials), not short tutorials.
- They are useful as reference implementations for category-learning project work.
