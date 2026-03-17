import '../style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
<div class="site-shell">
  <div class="nav-line">
    <a href="../index.html">← Back to simulations</a>
    <div class="spacer"></div>
    <button id="theme-toggle" class="theme-btn">☀</button>
  </div>

  <header class="page-head">
    <p class="eyebrow">Python Lab Guide — Lesson 1</p>
    <h1>Free Diffusion and Euler's Method</h1>
    <p>
      In this lesson you will write the core update rule that makes particles
      move. You will first try a version that looks reasonable but is wrong,
      observe what breaks, then fix it — and in doing so discover
      <strong>Euler's method</strong>, the numerical technique used in every
      simulation in this series.
    </p>
    <p>
      Open
      <code>electrochemical_signals_progression/skeletons/inspect_diffusion_1_skeleton.py</code>
      in your editor before you start.
    </p>
  </header>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 1 — Read the parameters</h2>
    <p class="arc-description">Before writing any code, understand what the script is set up to do.</p>
    <div class="guide-step">
      <p>
        Find the <strong>Parameters</strong> block near the top of the script
        (lines 20–35 approximately). Read each parameter and its comment.
        Then answer these questions in your lab notebook:
      </p>
      <ol>
        <li>
          What does <code>T = 1000</code> represent? What about
          <code>dt = 1.0</code>?
        </li>
        <li>
          How many times will the simulation loop run? (Hint: look at how
          <code>N</code> is computed from <code>T</code> and <code>dt</code>.)
        </li>
        <li>
          The arrays <code>x</code> and <code>y</code> have shape
          <code>(N, num_particles)</code>. What does each row represent?
          What does each column represent?
        </li>
      </ol>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 2 — Try the wrong version</h2>
    <p class="arc-description">You need to fill in the update inside the loop. Start with an approach that seems reasonable.</p>
    <div class="guide-step">
      <p>
        Find the <strong>first TODO</strong> inside the <code>for</code> loop.
        Fill it in like this — exactly as shown:
      </p>
      <pre class="code-block">x[i] = dxdt
y[i] = dydt</pre>
      <p>
        Save and run the script:
      </p>
      <pre class="code-block">python inspect_diffusion_1_skeleton.py</pre>
      <p>
        Open the resulting <code>diffusion_simulation.mp4</code> and watch it.
      </p>
      <p class="teaching-label questions">Questions</p>
      <ul class="guided-questions">
        <li>
          Describe in one sentence what the particles are doing. Does it look
          like particles diffusing through a fluid?
        </li>
        <li>
          Try changing <code>diffusion_sd</code> from <code>0.5</code> to
          <code>0.05</code>. Run again. Now what do the particles do?
        </li>
        <li>
          What is the problem with this approach? What is missing?
        </li>
      </ul>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 3 — Fix it: add the anchor</h2>
    <p class="arc-description">Particles should remember where they were. The new position must be built on the old one.</p>
    <div class="guide-step">
      <p>
        Replace the two lines you wrote with the following:
      </p>
      <pre class="code-block">x[i] = x[i-1] + dxdt * dt
y[i] = y[i-1] + dydt * dt</pre>
      <p>
        Save and run the script again.
      </p>
      <p class="teaching-label questions">Questions</p>
      <ul class="guided-questions">
        <li>
          What changed? Describe the particle motion in one sentence.
        </li>
        <li>
          Why does <code>x[i-1]</code> fix the problem? What role does it
          play?
        </li>
        <li>
          The particles all started at the origin (<code>x[0] ≈ 0</code>).
          Where do they end up after 1000 ms? Is there one answer, or does it
          depend on the run?
        </li>
      </ul>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 4 — This is Euler's method</h2>
    <p class="arc-description">The update rule you just wrote has a name and a general form.</p>
    <div class="guide-step">
      <p>
        The pattern you used:
      </p>
      <pre class="code-block">new_position = old_position + rate × dt</pre>
      <p>
        is called <strong>Euler's method</strong>. It is the simplest way to
        numerically integrate a differential equation. The continuous equation
        for Brownian motion is:
      </p>
      <pre class="code-block">dx/dt = ξ(t),   where ξ ~ Normal(0, σ²)</pre>
      <p>
        Euler's method discretises this as:
      </p>
      <pre class="code-block">x[i] = x[i-1] + ξ · dt</pre>
      <p>
        Every simulation in this series — from free diffusion through to the
        action potential — uses this same update structure. The only thing that
        changes is what the rate term on the right-hand side contains.
      </p>
      <p class="teaching-label questions">Questions</p>
      <ul class="guided-questions">
        <li>
          In the code, what plays the role of the "rate" in
          <code>new = old + rate × dt</code>?
        </li>
        <li>
          If you set <code>dt = 0</code>, nothing would change each step.
          If you set <code>dt</code> very large, what would happen to the
          simulation?
        </li>
      </ul>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 5 — Explore the parameters</h2>
    <p class="arc-description">Make specific changes and record what you observe. One change at a time — reset to defaults between each.</p>
    <div class="guide-step">
      <p>Default values: <code>diffusion_sd = 0.5</code>, <code>dt = 1.0</code>, <code>num_particles = 100</code>.</p>
      <ol>
        <li>
          Set <code>diffusion_sd = 0.1</code>. Run. How far do particles
          spread by <em>t</em> = 1000 ms compared to the default?
        </li>
        <li>
          Set <code>diffusion_sd = 3.0</code>. Run. How far do they spread?
        </li>
        <li>
          Reset <code>diffusion_sd</code>. Set <code>dt = 5.0</code>. Run.
          How does the <em>shape</em> of the motion change?
        </li>
        <li>
          Set <code>num_particles = 500</code>. Run. Does changing particle
          count affect the motion of any individual particle?
        </li>
      </ol>
      <p>
        Look at the final spread of particles along the x-axis.
        In 2D random walk theory, the expected root-mean-square displacement
        after N steps of size σ is:
      </p>
      <pre class="code-block">RMS displacement ≈ σ · √N</pre>
      <p>
        With <code>diffusion_sd = 0.5</code>, <code>dt = 1</code>, and
        <code>T = 1000</code> ms, what does this formula predict?
        Does the animation match?
      </p>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Step 6 — Check your understanding</h2>
    <p class="arc-description">Answer these in writing before moving to Lesson 2.</p>
    <div class="guide-step">
      <ol>
        <li>
          Explain in your own words why <code>x[i] = dxdt</code> does not
          produce Brownian motion, but <code>x[i] = x[i-1] + dxdt * dt</code>
          does.
        </li>
        <li>
          A classmate says: "If I make <code>diffusion_sd</code> very small I
          can make the particles not move at all." Is this correct? What
          actually happens?
        </li>
        <li>
          In the loop, why does the index start at <code>1</code> rather than
          <code>0</code>? What would go wrong if it started at <code>0</code>?
        </li>
        <li>
          The simulation uses <code>dt = 1.0</code> ms. If you halved
          <code>dt</code> to <code>0.5</code> ms but kept
          <code>T = 1000</code> ms the same, how many iterations would the
          loop run? Would the physics change?
        </li>
      </ol>
    </div>
  </section>

  <section class="panel lesson-group">
    <h2 class="section-title">Reference: interactive simulation</h2>
    <p class="arc-description">The web version of this simulation lets you adjust parameters in real time without editing code.</p>
    <div class="guide-step">
      <p>
        <a href="../inspect_diffusion_free.html" class="inline-link">
          Open the Free Diffusion web simulation →
        </a>
      </p>
      <p>
        Use it to check your intuitions from Step 5. The web version runs
        live in the browser — you can pause, change parameters, and rerun
        without waiting for an MP4 to render.
      </p>
    </div>
  </section>

</div>
`;

document.querySelector<HTMLButtonElement>('#theme-toggle')!.addEventListener('click', () => {
  const isLight = document.documentElement.classList.toggle('light');
  document.querySelector<HTMLButtonElement>('#theme-toggle')!.textContent = isLight ? '☽' : '☀';
});
