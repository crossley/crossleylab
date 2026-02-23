import"./style-WLU6Igt5.js";const e=document.querySelector("#app");if(!e)throw new Error("Missing #app root");e.innerHTML=`
  <div class="site-shell">
    <header class="page-head">
      <p class="eyebrow">Electrochemical Signals Progression</p>
      <h1>Web Simulations</h1>
      <p class="subtitle">
        Browser ports of the progressive electrochemical signalling simulations.
        Pages mirror the Python filenames. Current iteration includes
        <code>inspect_diffusion_1</code>, <code>inspect_diffusion_2</code>, and
        <code>inspect_diffusion_3</code>, <code>inspect_diffusion_4</code>,
        <code>inspect_electrochemical_1</code>-<code>inspect_electrochemical_3</code>, and
        <code>inspect_resting_potential_1</code>-<code>inspect_resting_potential_4</code>.
      </p>
    </header>

    <section class="panel">
      <h2 class="section-title">Available Pages</h2>
      <div class="link-list">
        <a class="link-card ready" href="./inspect_diffusion_1.html">
          <strong>inspect_diffusion_1</strong>
          <span>2D Brownian diffusion (no barriers, no forces)</span>
        </a>
        <a class="link-card ready" href="./inspect_diffusion_2.html">
          <strong>inspect_diffusion_2</strong>
          <span>Diffusion through a membrane-like wall with a single channel</span>
        </a>
        <a class="link-card ready" href="./inspect_diffusion_3.html">
          <strong>inspect_diffusion_3</strong>
          <span>Side-by-side comparison of narrow vs wide channel permeability</span>
        </a>
        <a class="link-card ready" href="./inspect_diffusion_4.html">
          <strong>inspect_diffusion_4</strong>
          <span>Two particle types with type-selective channels (selective permeability)</span>
        </a>
        <a class="link-card ready" href="./inspect_electrochemical_1.html">
          <strong>inspect_electrochemical_1</strong>
          <span>Weak vs strong electrical attraction (side-by-side comparison)</span>
        </a>
        <a class="link-card ready" href="./inspect_electrochemical_2.html">
          <strong>inspect_electrochemical_2</strong>
          <span>Electrical drift + repulsion through a channel</span>
        </a>
        <a class="link-card ready" href="./inspect_electrochemical_3.html">
          <strong>inspect_electrochemical_3</strong>
          <span>Selective channels + electrical drift + repulsion (two types)</span>
        </a>
        <a class="link-card ready" href="./inspect_resting_potential_1.html">
          <strong>inspect_resting_potential_1</strong>
          <span>Transient depolarizing input perturbing a resting-potential toy model</span>
        </a>
        <a class="link-card ready" href="./inspect_resting_potential_2.html">
          <strong>inspect_resting_potential_2</strong>
          <span>Two-ion selective permeability with per-ion and total imbalance traces</span>
        </a>
        <a class="link-card ready" href="./inspect_resting_potential_3.html">
          <strong>inspect_resting_potential_3</strong>
          <span>Two-ion selective permeability with negative charge wall field</span>
        </a>
        <a class="link-card ready" href="./inspect_resting_potential_4.html">
          <strong>inspect_resting_potential_4</strong>
          <span>Two-ion + Goldman-style prediction overlay</span>
        </a>
      </div>
    </section>
  </div>
`;
