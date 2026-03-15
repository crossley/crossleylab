# Electrochemical Signals Progression Web

Interactive browser-based teaching simulations for first-year undergraduates learning membrane diffusion, electrochemical balance, resting potential, Nernst reasoning, and pump-driven gradients.

## Run Locally

```bash
npm install
npm run dev
```

Open the local Vite URL (typically `http://localhost:5173`).

## Build

```bash
npm run build
```

Serve the generated `dist/` directory with any static host.

## Quality Gates

```bash
npm run lint
npm run check-pages
npm run deploy-check
```

- `lint`: TypeScript strict compile check (`tsc --noEmit`)
- `check-pages`: validates lesson registry ↔ HTML entrypoints ↔ TS page modules
- `deploy-check`: runs `lint` + `check-pages` + `build` and prints the GitHub Pages deployment target/workflow
- GitHub Actions CI runs `lint`, `check-pages`, and `build` on every push and pull request.

## Deployment

```bash
npm run deploy-check
```

Then commit and push to `main` in the monorepo root (`crossleylab`). GitHub Pages is deployed by `../../.github/workflows/pages.yml`, which publishes this app to `https://crossley.github.io/crossleylab/electrochemical-signals/`.

## Teaching Notes

- The sequence is designed as a progression from simpler particle transport concepts to membrane-potential concepts.
- Many pages use pedagogical proxies (for example, charge-imbalance traces) before introducing mV-scaled comparisons.
- Current compartment convention in the membrane lessons is: `left = inside (cell)`, `right = outside`.
- Evaluation templates are provided in [`docs/evaluation/`](docs/evaluation/).

## Project Structure

- `src/lessons.json`: single lesson registry (title/order/slug/html/entry)
- `src/index.ts`: landing page generated from `src/lessons.json`
- `src/pages/`: page-specific simulations
- `src/pages/resting_two_ion_common.ts`: shared two-ion resting-potential engine
- `src/style.css`: common styles
- `scripts/check-pages.mjs`: registry and entrypoint consistency checks
- `docs/evaluation/`: concept inventory, feedback, observation, and semester templates
