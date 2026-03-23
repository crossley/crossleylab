# Striatal Reservoir Model Web Tutorial

A GitHub Pages-ready instructional site explaining `code/striatal_model.py` step by step and rebuilding the model from scratch.

## Run locally

```bash
npm install
npm run figures
npm run dev
```

## Build

```bash
npm run build
```

## Figure generation

The tutorial uses two figure sources:

- Existing outputs from `striatal_reservoir_model/code/striatal_model.py`
- Additional teaching visuals generated locally (tuning fields + network topology)

Default command:

```bash
npm run figures
```

If you also want to regenerate model outputs first:

```bash
python3 scripts/generate_figures.py --run-model
```

If your model repo is not at the default path, set it explicitly:

```bash
python3 scripts/generate_figures.py --model-root /path/to/striatal_reservoir_model --run-model
```

## Structure

- `src/index.ts`: landing page
- `src/guides/guide_striatal_model.ts`: long-form instructional page
- `public/assets/striatal_model_from_scratch.py`: runnable teaching implementation
- `scripts/generate_figures.py`: figure sync + custom teaching visuals
