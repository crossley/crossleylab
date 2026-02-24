# crossleylab

Central onboarding and teaching repository for new and existing members of the Crossley Lab.

Our lab works in computational cognitive neuroscience across:

- behaviour
- neuroimaging
- computational modelling

This repository is an in-progress teaching hub for developing practical skills in all three areas.

## What This Repo Is For

- onboard new lab members quickly
- provide progressive, readable teaching code
- connect conceptual tutorials to manuscript-style explanations
- standardize core computational workflows used in the lab

## Current Status

This repository is actively under construction.

Current strengths:

- behavioural experiment programming progression
- electrochemical/neural dynamics teaching simulations
- Izhikevich neuron/network modelling examples
- paired writing resources (paper-style documents + code)

Current gap:

- imaging-focused onboarding materials are not yet built out in this repo

## Learning Tracks

### 1) Behaviour Track

Start here if you are new to lab task programming.

- Code: `code/behavioural_experiment_progression/`
- Writing: `write/behavioural_experiments/`

Focus:

- building experiments in Python (`pygame`)
- timing and input handling
- state-based experimental control
- complete task structures (action selection, category learning, reaching)

### 2) Modelling Track

Start here if you are new to neuron/network simulations.

- `code/iz_neurons/`
- `code/iz_nets/`
- `code/basal_ganglia_spiking_network/`
- `code/basal_ganglia_spiking_network_cat_learn/`

Focus:

- Euler-based simulation logic
- Izhikevich neuron dynamics
- network implementation styles (bruteforce -> matrix)
- basal ganglia-inspired task and learning models

### 3) Imaging Track (Planned Expansion)

This will be a dedicated onboarding path for lab imaging workflows.

Planned focus:

- data structure standards
- preprocessing pipelines
- first-level/second-level analysis templates
- quality control and reproducibility practices

## Repo Map

- `code/`
  - executable teaching scripts and modelling demos
- `write/`
  - manuscript-style companion documents and references

## Building the Writing Resources

Each writing folder has a `Makefile` (`pdflatex` + `bibtex` workflow).

```bash
cd write/behavioural_experiments && make
cd write/electrochem && make
```

Use `make clean` in either folder to remove LaTeX build artifacts.

## Dependencies

Common Python dependencies used across current code:

- `numpy`
- `matplotlib`
- `pygame`
- `pandas`
- `scipy`

Some animation scripts also require `ffmpeg` for MP4 export.

## Contribution Direction

When adding material, prioritize:

- teaching clarity over optimization
- explicit comments and progressive examples
- reproducible, lightweight scripts
- alignment with one of the onboarding tracks (behaviour, imaging, modelling)


## Honours Onboarding Docs

Simple markdown-based honours onboarding documentation lives in `honours/` (start with `honours/README.md`).

## Short-Term Roadmap

1. Add a structured imaging onboarding module.
2. Add environment setup instructions for new lab members.
3. Add track-level checklists (what to run/read first).
4. Add cross-links between code exercises and writing notes.
