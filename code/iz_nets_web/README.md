# iz_nets_web

Interactive browser version of the `A -> B -> C` Izhikevich network with live controls.

## Run locally

```bash
cd code/iz_nets_web
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## Build for static hosting (GitHub Pages)

```bash
cd code/iz_nets_web
npm install
npm run build
```

Deploy the `dist/` folder to GitHub Pages.

## Notes

- Rendering is fully client-side (no backend required).
- Controls include hold-to-nudge `- / +` controls for `w_AB`, `w_BC`, and `E_A/E_B/E_C`.
- Views include square-pulse input trace to A plus per-neuron dual-axis traces (`v` on left axis, `g` on right axis).
- Solver `dt` is fixed at `0.01` internally for stability; traces are sampled on a fixed simulated-time grid.
