import{i,a as t}from"./code_copy-BHo0lt66.js";const e=document.querySelector("#app");if(!e)throw new Error("Missing #app root");e.innerHTML=`
<div class="site-shell">
  <div class="nav-line">
    <a href="./index.html">← Back to tutorial home</a>
    <button type="button" class="theme-toggle" data-theme-toggle aria-label="Toggle color theme"></button>
  </div>

  <header class="page-head">
    <p class="eyebrow">Long-Form Python Lab Guide</p>
    <h1>Build the Striatal Reservoir Model from Scratch</h1>
    <p>
      This guide explains how <code>code/striatal_model.py</code> works, then rebuilds
      the same logic step by step. The goal is to make the full script readable,
      editable, and reproducible for your own experiments.
    </p>
  </header>

  <section class="panel lesson-group">
    <h2 class="section-title">What This Model Is Doing</h2>
    <div class="guide-step">
      <p>The model learns two-category decisions with a biologically-inspired architecture:</p>
      <ul>
        <li><strong>Cortex:</strong> stimulus encoder with Gaussian tuning functions over a 2D stimulus space.</li>
        <li><strong>Striatum (MSNs):</strong> sparse competitive reservoir with lateral inhibition and adaptation.</li>
        <li><strong>Readout:</strong> fixed anatomy (first MSN half votes A, second half votes B).</li>
        <li><strong>Learning:</strong> only corticostriatal weights update (<code>W_cx</code>) from trial-level feedback.</li>
      </ul>
      <p>
        Download runnable teaching code:
        <a href="./assets/striatal_model_from_scratch.py"><code>striatal_model_from_scratch.py</code></a>.
      </p>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Stimuli and Categories First: Build Trial Sequences Up Front</h2>
    <div class="guide-step">
      <p>
        Before encoding, define the stimulus distributions and category labels. Acquisition samples from two bounded
        bivariate Gaussian clouds; reversal either flips labels (<code>full_swap</code>) or rotates the geometry
        (<code>partial_rotate</code>).
      </p>
      <pre class="code-block">def build_trials(params, reversal_mode="full_swap"):
    acq_stim, acq_label = make_acquisition_pools(params)

    if reversal_mode == "full_swap":
        rev_stim = acq_stim.copy()
        rev_label = 1 - acq_label
    else:
        rev_stim, rev_label = make_rotated_reversal_pools(params)

    acq_idx = rng_idx_a.integers(0, len(acq_stim), size=params.n_acq)
    rev_idx = rng_idx_r.integers(0, len(rev_stim), size=params.n_rev)

    return (
        [(acq_stim[i].copy(), int(acq_label[i]), "acq") for i in acq_idx]
        + [(rev_stim[i].copy(), int(rev_label[i]), "rev") for i in rev_idx]
    )</pre>
      <div class="figure-grid">
        <figure class="figure-block">
          <img src="./figures/generated_stimuli_scatter.png" alt="Stimulus geometry for acquisition and reversal" />
          <figcaption>
            Stimulus/category geometry is introduced first, so all later encoding and learning steps refer back to this trial stream.
          </figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 1 - Set Parameters and Seeds</h2>
    <div class="guide-step">
      <p>
        Do not start with one giant parameter block. Instead, declare each parameter near the code that first needs it,
        so students can tie each value to a concrete operation.
      </p>
      <pre class="code-block"># Reproducibility and stimulus bounds for trial generation.
stim_lo, stim_hi = 0.0, 100.0
encoder_seed = 42
trial_seed = 99

# Practical defaults for teaching runs.
n_acq = 300
n_rev = 300
n_sim = 12</pre>
      <p>
        These settings are used immediately by trial generation and encoder construction, then later expanded with
        competition and learning parameters only when those steps are introduced.
      </p>
      <p class="teaching-label">At the end of the tutorial</p>
      <p>
        Ask students to collect every parameter they used into one consolidated block for clean experiment handoff.
        This gives conceptual scaffolding early and reproducible script structure at the end.
      </p>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 2 - Encode Stimuli with Gaussian Tuning</h2>
    <div class="guide-step">
      <p>
        Use the full 2D representation. Visual cortex is a <code>100 x 100</code> grid of preferred positions
        (10,000 units), and each unit is a bivariate Gaussian basis function over stimulus space.
      </p>
      <pre class="code-block">cortex_side = 100
sigma_tuning = 10.0

axis = np.linspace(stim_lo, stim_hi, cortex_side)
gx, gy = np.meshgrid(axis, axis)
preferred = np.column_stack([gx.ravel(), gy.ravel()])

def encode_stimulus(stimulus, preferred, sigma_tuning):
    diff = preferred - np.asarray(stimulus, dtype=float)
    sq_dist = np.sum(diff * diff, axis=1)
    x_c = np.exp(-0.5 * sq_dist / (sigma_tuning ** 2))
    norm = np.linalg.norm(x_c)
    return x_c / norm if norm > 0 else x_c</pre>
      <p>
        Every cortical grid element projects to every MSN through <code>W_cx</code>, and dopamine-signed feedback later
        reinforces or depresses those corticostriatal projections.
      </p>
      <div class="figure-grid">
        <figure class="figure-block">
          <img src="./figures/cortex_tuning_100x100.png" alt="2D cortex tuning on a 100 by 100 grid" />
          <figcaption>
            Two-panel view: example receptive fields and one bivariate Gaussian response on the 100 x 100 cortical grid.
          </figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 3 - Build the Competitive Striatal Reservoir</h2>
    <div class="guide-step">
      <p>
        Next introduce striatal competition parameters where they are used: MSN count, k-WTA sparsity,
        noise scale, adaptation, and lateral inhibition. <code>W_cx</code> maps cortex-to-MSN drive,
        while lateral matrices implement within-pool and cross-pool competition.
      </p>
      <pre class="code-block">n_msn = 200
k_frac = 0.05
k = max(1, int(k_frac * n_msn))
sigma_noise = 0.05
lambda_lat = 0.2

w_cx = rng_res.uniform(0.0, 0.1, size=(n_msn, preferred.shape[0]))
w_lat = make_lat_inhibition(n_msn, lambda_lat, seed=reservoir_seed + 500)</pre>
      <div class="figure-grid">
        <figure class="figure-block">
          <img src="./figures/reservoir_architecture_layout.png" alt="Grid-based cortex and MSN pools with dense projection layout" />
          <figcaption>
            Step 3A: architecture layout with 100x100 cortex and A/B MSN pools; all cortical units project to both pools.
          </figcaption>
        </figure>
      </div>
      <div class="figure-grid">
        <figure class="figure-block">
          <img src="./figures/reservoir_connectivity_matrices.png" alt="Corticostriatal and lateral connectivity matrices" />
          <figcaption>
            Step 3B: explicit connectivity matrices for dense <code>W_cx</code> and structured lateral inhibition.
          </figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 4 - Fixed Anatomical Readout and Soft Decision</h2>
    <div class="guide-step">
      <p>
        Keep the readout anatomical and fixed. Show activity progression through inhibition stages, then map final
        winners to A/B channel counts and a soft decision.
      </p>
      <pre class="code-block">split = n_msn // 2

# Stage 1: pre-inhibition drive
pre = w_cx @ x_c + rng.normal(0.0, sigma_noise, size=n_msn)

# Stage 2: within-pool inhibition
within = pre + w_within @ np.clip(pre, 0.0, None)

# Stage 3: cross-pool inhibition
cross = within + w_cross @ np.clip(within, 0.0, None)

# Stage 4: k-WTA winners
idx = np.argpartition(cross, -k)[-k:]
x_s = np.zeros(n_msn)
x_s[idx] = 1.0

n_a = float(x_s[:split].sum())
n_b = float(x_s[split:].sum())</pre>
      <div class="figure-grid">
        <figure class="figure-block">
          <img src="./figures/readout_activity_stages.png" alt="Sequential activity snapshots through inhibition stages" />
          <figcaption>
            Four-stage activity progression: pre-inhibition, within-pool inhibition, cross-pool inhibition, and final k-WTA winners.
          </figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 5 - Apply the Learning Rule in W_cx</h2>
    <div class="guide-step">
      <p>
        Only <code>W_cx</code> learns. Introduce learning-rate and decay exactly where update code appears.
      </p>
      <pre class="code-block">eta = 0.10
decay_rate = 0.002

reward_sign = 1.0 if resp == correct else -1.0
w_cx *= 1.0 - decay_rate
active = x_s > 0
w_cx[active] += eta * reward_sign * np.outer(x_s[active], x_c)
np.clip(w_cx, 0.0, None, out=w_cx)</pre>
      <p class="teaching-label">Interpretation</p>
      <ul>
        <li><code>reward_sign</code> approximates trial-level dopamine sign.</li>
        <li>Plasticity is gated to recruited MSNs only.</li>
        <li>Decay keeps competition responsive over long runs.</li>
      </ul>
      <div class="figure-grid">
        <figure class="figure-block">
          <img src="./figures/wcx_before_after_update.png" alt="Corticostriatal weights before and after one update" />
          <figcaption>
            2 x 2 summary over all 10,000 cortical weights: pre/post averages for active-ensemble MSNs versus non-active MSNs.
          </figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 6 - Run One Simulation and Capture Trace</h2>
    <div class="guide-step">
      <p>
        A single run should return phase accuracies and a full trace dictionary for diagnostics:
        reservoir activity, labels, correctness, surprise, and phase identity.
      </p>
      <pre class="code-block">trace = {
    "x_s": np.array(trace_xs, dtype=float),
    "phase": np.array(trace_phase, dtype=object),
    "label": np.array(trace_label, dtype=int),
    "correct": np.array(trace_correct, dtype=float),
    "surprise": np.array(trace_surprise, dtype=float),
}
return np.array(results.get("acq", [])), np.array(results.get("rev", [])), trace</pre>
      <p>
        This is the minimal interface needed for all downstream metrics in the original script.
      </p>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 7 - Aggregate Across Seeds</h2>
    <div class="guide-step">
      <p>
        Run many simulations with independent seeds, then plot individual rolling trajectories plus a mean curve.
        The model uses this pattern for acquisition, full reversal, and partial reversal comparisons.
      </p>
      <div class="figure-grid">
        <figure class="figure-block">
          <img src="./figures/learning_curves_bioplausible.png" alt="Learning curves for acquisition and reversal" />
          <figcaption>Main performance result: acquisition and reversal curves averaged across simulations.</figcaption>
        </figure>
        <figure class="figure-block">
          <img src="./figures/learning_curves_double_reversal.png" alt="Three phase double reversal learning curves" />
          <figcaption>Three-phase protocol (train -> reverse -> return) for full and partial manipulations.</figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 8 - Add Representational Diagnostics</h2>
    <div class="guide-step">
      <p>
        The key question is not just accuracy, but whether the reservoir assembly changes in a structured way.
        The script computes cosine similarity to acquisition prototypes and Jaccard overlap of top-k assemblies.
      </p>
      <div class="figure-grid">
        <figure class="figure-block">
          <img src="./figures/ensemble_dynamics.png" alt="MSN ensemble dynamics heatmaps" />
          <figcaption>Heatmap view of recruited MSN populations across phases.</figcaption>
        </figure>
        <figure class="figure-block">
          <img src="./figures/assembly_similarity_to_acq.png" alt="Similarity to acquisition assembly" />
          <figcaption>Similarity to acquisition assemblies across each experimental condition.</figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 9 - Surprise and State Signals</h2>
    <div class="guide-step">
      <p>
        The current script records trial-wise surprise and FSI-gain traces. In this version, FSI gain remains fixed,
        but the plotting path is already implemented for dynamic modulation experiments.
      </p>
      <div class="figure-grid">
        <figure class="figure-block">
          <img src="./figures/surprise_fsi_curves.png" alt="Surprise and FSI curves" />
          <figcaption>Surprise traces and FSI-gain channel from the current implementation.</figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Parity Map to <code>striatal_model.py</code></h2>
    <div class="guide-step">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Guide Step</th>
              <th>Key Functions in Original Script</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Encoder</td>
              <td><code>encode_stimulus</code></td>
              <td>Transform 2D input into cortical feature vector.</td>
            </tr>
            <tr>
              <td>Reservoir competition</td>
              <td><code>compete</code></td>
              <td>k-WTA sparse assembly with adaptation and lateral inhibition.</td>
            </tr>
            <tr>
              <td>Trial generation</td>
              <td><code>build_trials</code>, <code>build_trials_three_phase</code></td>
              <td>Create acquisition/reversal/back sequences.</td>
            </tr>
            <tr>
              <td>Single run engine</td>
              <td><code>run_one</code></td>
              <td>Decision, learning, trace collection per trial.</td>
            </tr>
            <tr>
              <td>Curve summaries</td>
              <td><code>rolling_mean_1d</code>, <code>mean_rolling</code>, plotting funcs</td>
              <td>Aggregate and visualize behaviour over seeds.</td>
            </tr>
            <tr>
              <td>Representation analysis</td>
              <td><code>similarity_to_acq_assembly</code>, <code>representation_jaccard</code></td>
              <td>Measure remapping vs reinstatement of assemblies.</td>
            </tr>
            <tr>
              <td>Robustness</td>
              <td><code>run_noise_robustness</code></td>
              <td>Test sensitivity to internal noise.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Run Workflow</h2>
    <div class="guide-step">
      <ol>
        <li>Generate/update figures: <code>npm run figures</code>.</li>
        <li>Inspect the from-scratch code asset and run it locally with Python.</li>
        <li>Compare output traces against <code>code/striatal_model.py</code> in your modelling repo.</li>
        <li>Edit one parameter at a time (noise, eta, k, lateral inhibition) and re-run.</li>
      </ol>
      <pre class="code-block">cd crossleylab/code/striatal_reservoir_model_web
npm install
npm run figures
npm run build</pre>
    </div>
  </section>

  <footer>
    Figures in this guide are generated from the model script outputs plus additional teaching visuals
    created in <code>scripts/generate_figures.py</code>.
  </footer>
</div>
`;i();t();
