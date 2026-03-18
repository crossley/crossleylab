import '../style.css';
import { applyStoredTheme, initThemeToggle } from '../theme';

applyStoredTheme();

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <a href="./">← Back to lessons</a>
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>

    <header class="page-head">
      <h1 class="landing-title">Lesson 5 — Electrical Field Attraction</h1>
      <p class="eyebrow">
        The first four lessons covered diffusion: particles moving randomly until they
        spread evenly. But cells are not in equilibrium — Na⁺ stays mostly outside and
        K⁺ stays mostly inside. Something must be pushing back against diffusion.
        This lesson introduces the first of those forces: <em>electrical attraction</em>.
        You will add a deterministic drift term to the random walk and watch two
        competing forces — diffusion and attraction — reach a dynamic balance.
      </p>
    </header>

    <!-- ── Step 1 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 1 — Two forces in competition</h2>
      <div class="guide-step">
        <p>
          In every lesson so far, position updates had only one ingredient:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">new_x = x[i-1] + np.random.normal(0, diffusion_sd, num_particles)</pre>
        </div>
        <p>
          This is pure diffusion: each step is a random kick with no preferred direction.
          The result is particles spreading evenly until concentration is equal everywhere.
        </p>
        <p>
          Now imagine there is a fixed positive charge source at some point in space.
          Positive ions are <em>repelled</em> from it; negative ions are
          <em>attracted</em> toward it. The attraction is not random — it always points
          from the particle toward the source. It is a <strong>deterministic drift</strong>.
        </p>
        <p>
          Adding drift to the update gives:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">new_x = x[i-1] + np.random.normal(0, diffusion_sd, num_particles) + drift_x
new_y = y[i-1] + np.random.normal(0, diffusion_sd, num_particles) + drift_y</pre>
        </div>
        <p>
          <code>drift_x</code> and <code>drift_y</code> are the same for every particle
          at a given position — they depend on where the particle is, not on a random
          draw. As a result, particles near the source get pulled toward it; particles
          far away get pulled less (the field weakens with distance). Diffusion keeps
          spreading them; the drift keeps pulling them back. The two forces find a
          balance.
        </p>
        <p>
          Create a new file called <code>field_attraction.py</code>.
        </p>
      </div>
    </section>

    <!-- ── Step 2 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 2 — Setup: open box, no membrane</h2>
      <div class="guide-step">
        <p>
          This simulation has no membrane — just an open box with particles that drift
          toward a single fixed charge source. Start simple: one particle type, uniform
          random initial positions throughout the whole box.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# ── box ──────────────────────────────────────────────────────────────
box_half = 50     # box runs from -50 to +50 in both x and y

# ── fixed charge source (at the centre) ──────────────────────────────
source_x = 0.0
source_y = 0.0

# ── simulation parameters ─────────────────────────────────────────────
num_particles = 200
diffusion_sd  = 2.0
field_strength = 10.0   # increase to make drift stronger
softening      = 2.0    # prevents infinite force when r → 0
num_steps      = 600

# ── preallocate position history ──────────────────────────────────────
x = np.zeros((num_steps, num_particles))
y = np.zeros((num_steps, num_particles))

# ── initial positions: spread randomly throughout the box ─────────────
x[0] = np.random.uniform(-box_half, box_half, num_particles)
y[0] = np.random.uniform(-box_half, box_half, num_particles)</pre>
        </div>
        <p>
          The <code>softening</code> parameter is a small constant added inside the
          distance calculation to prevent the force from blowing up when a particle
          lands exactly on the source. We will see exactly where it goes in Step 4.
        </p>
        <ul class="guided-questions">
          <li>
            Why do we start particles spread uniformly here, rather than all on one
            side as in Lesson 2?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>There is no membrane in this simulation, so "one side vs the other"
                has no meaning. Starting particles spread uniformly lets you see the
                field attracting them from all directions simultaneously, which makes
                the balance between diffusion and attraction clearest.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 3 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 3 — The drift vector</h2>
      <div class="guide-step">
        <p>
          To drift a particle toward the source, we need a vector that points from the
          particle to the source and shrinks with distance. First, compute the
          displacement from the particle to the source:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">dx = source_x - x[i-1]   # positive when particle is left of source
dy = source_y - y[i-1]   # positive when particle is below source</pre>
        </div>
        <p>
          These are arrays of length <code>num_particles</code>. Each element is the
          signed distance from one particle to the source along one axis.
        </p>
        <p>
          The electrical force between two charges falls off with the square of the
          distance (Coulomb's law). A convenient softened version is:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">r_squared = dx**2 + dy**2 + softening**2    # softened squared distance
r_cubed   = r_squared * np.sqrt(r_squared)  # (r²)^(3/2) = r³

drift_x = field_strength * dx / r_cubed
drift_y = field_strength * dy / r_cubed</pre>
        </div>
        <p>
          Dividing by <code>r_cubed = (r² + ε²)^(3/2)</code> makes the force fall off
          like 1/r² for large distances (just like real Coulomb attraction) but stay
          finite when r is small (thanks to the softening ε). Multiplying by
          <code>dx</code> points the drift vector in the right direction — toward the
          source when the source is ahead, away when it is behind.
        </p>
        <ul class="guided-questions">
          <li>
            If a particle is directly to the right of the source (<code>dx &lt; 0</code>,
            <code>dy = 0</code>), which direction does the drift point?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><code>dx = source_x - x</code> is negative when the particle is to
                the right of the source. <code>drift_x = strength * dx / r_cubed</code>
                is therefore negative — it pushes the particle in the negative x
                direction, i.e., leftward toward the source. <code>drift_y = 0</code>
                because <code>dy = 0</code>. So the drift points directly left, toward
                the source. This is correct: attraction pulls the particle closer.</p>
              </div>
            </details>
          </li>
          <li>
            What would happen without the softening term (<code>softening = 0</code>)
            if a particle landed exactly on the source?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><code>r_squared</code> would be zero, and dividing by
                <code>r_cubed = 0</code> would give infinity. In Python this would
                produce a <code>nan</code> or <code>inf</code> and the simulation
                would break. The softening constant ensures the denominator is always
                at least <code>softening³ &gt; 0</code>, keeping the force finite.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 4 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 4 — Wrap the drift in a function</h2>
      <div class="guide-step">
        <p>
          You will reuse the drift formula in the next lesson when there are fixed
          anions inside the cell. Write it as a function now so you can call it cleanly
          from multiple places. Place this before the simulation loop:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">def field_drift(particle_x, particle_y, source_x, source_y, strength, softening=2.0):
    """
    Compute the drift velocity toward a point charge source.

    Parameters
    ----------
    particle_x, particle_y : arrays of particle positions
    source_x, source_y     : scalar position of the charge source
    strength               : field strength (larger = stronger pull)
    softening              : prevents infinite force at r=0

    Returns
    -------
    drift_x, drift_y : arrays of drift velocity in x and y
    """
    dx = source_x - particle_x
    dy = source_y - particle_y
    r_squared = dx**2 + dy**2 + softening**2
    r_cubed   = r_squared * np.sqrt(r_squared)
    return strength * dx / r_cubed, strength * dy / r_cubed</pre>
        </div>
        <p>
          This is the same calculation from Step 3, packaged so it is easy to call with
          any source position and strength. The <code>softening=2.0</code> in the
          function signature sets a <strong>default value</strong>: if you call
          <code>field_drift(...)</code> without specifying softening, it uses 2.0
          automatically.
        </p>
      </div>
    </section>

    <!-- ── Step 5 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 5 — The update loop</h2>
      <div class="guide-step">
        <p>
          Now write the simulation loop. The only change from Lesson 1's free diffusion
          is the addition of the drift term:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">for i in range(1, num_steps):
    drift_x, drift_y = field_drift(
        x[i-1], y[i-1],
        source_x, source_y,
        field_strength
    )

    new_x = x[i-1] + np.random.normal(0, diffusion_sd, num_particles) + drift_x
    new_y = y[i-1] + np.random.normal(0, diffusion_sd, num_particles) + drift_y

    # reflect off box walls
    new_x = np.clip(new_x, -box_half, box_half)
    new_y = np.clip(new_y, -box_half, box_half)

    x[i] = new_x
    y[i] = new_y</pre>
        </div>
        <p>
          Compare this to Lesson 1. The only structural addition is the two-line
          <code>field_drift</code> call and adding the result to the random step.
          Everything else — the loop, the clipping, the array indexing — is identical.
          This is the power of the Extend pattern: new physics slots in with minimal
          new code.
        </p>
        <ul class="guided-questions">
          <li>
            Why is it important to add the drift to the <em>random</em> step rather
            than replace it?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Replacing the random step with the drift would remove diffusion
                entirely — particles would simply fall toward the source and stop
                (like a ball rolling into a bowl with no thermal noise). Real ions
                are always subject to thermal noise (Brownian motion). Adding drift
                to the random step models both forces simultaneously: diffusion keeps
                spreading the particles; attraction keeps pulling them back. It is the
                competition between these two that produces the interesting steady-state
                distribution.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 6 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 6 — Animate the result</h2>
      <div class="guide-step">
        <p>
          The animation is simpler than Lesson 4 — one particle type, no wall. Add a
          marker for the source so you can see what the particles are attracted to:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">fig, ax = plt.subplots(figsize=(6, 6))
ax.set_xlim(-box_half, box_half)
ax.set_ylim(-box_half, box_half)
ax.set_aspect('equal')
ax.set_facecolor('#0a0e17')

# particles
sc = ax.scatter(x[0], y[0], s=6, color='cyan')

# mark the charge source
ax.scatter([source_x], [source_y], s=120, color='red', marker='*', zorder=5,
           label='charge source')
ax.legend(loc='upper right', fontsize=8)

def update(frame):
    sc.set_offsets(np.column_stack([x[frame], y[frame]]))
    return (sc,)

ani = animation.FuncAnimation(fig, update, frames=num_steps, interval=30, blit=True)
plt.tight_layout()
plt.show()</pre>
        </div>
        <p>
          Run the simulation. Watch the particles drift inward and cluster around the
          source, while diffusion keeps the cluster from collapsing to a single point.
        </p>
      </div>
    </section>

    <!-- ── Step 7 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 7 — Explore the balance</h2>
      <div class="guide-step">
        <p>
          The interesting behaviour emerges from the competition between the two forces.
          Try the following experiments:
        </p>
        <p><strong>Experiment 1 — Very weak field</strong></p>
        <p>Set <code>field_strength = 0.5</code> and run the simulation.</p>
        <p>
          The drift is so weak relative to diffusion that particles look nearly
          randomly distributed — the clustering is barely visible.
        </p>
        <p><strong>Experiment 2 — Very strong field</strong></p>
        <p>Set <code>field_strength = 500.0</code> and run.</p>
        <p>
          Drift dominates. Almost all particles collapse onto the source almost
          immediately. The steady-state cluster is very tight.
        </p>
        <p><strong>Experiment 3 — Find the balance</strong></p>
        <p>
          Set <code>diffusion_sd = 3.0</code> and then find a value of
          <code>field_strength</code> where the cluster is visible but particles are
          still spread across a substantial fraction of the box. This is the regime
          where diffusion and attraction are comparable in strength.
        </p>
        <ul class="guided-questions">
          <li>
            When <code>field_strength</code> is very large, where do all particles end
            up at equilibrium, and why?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>They cluster tightly around the charge source. When the drift
                force greatly exceeds thermal noise, every particle is pulled toward
                the source faster than diffusion can spread it away. The steady-state
                is a dense cluster centred on the source. In the limit of infinite
                field strength, all particles would sit exactly on the source.</p>
              </div>
            </details>
          </li>
          <li>
            Does increasing <code>diffusion_sd</code> cause the cluster to become
            tighter or more spread out? Why?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>More spread out. Larger diffusion SD means each random step is
                bigger, so thermal noise more effectively fights the attractive drift.
                The cluster's size reflects the balance: the cluster is wider when
                diffusion is strong relative to the field, and narrower when the field
                is strong relative to diffusion.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 8 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 8 — Connection to real cells</h2>
      <div class="guide-step">
        <p>
          The charge source in this simulation is a stand-in for something real inside
          every nerve cell: <strong>large, fixed negative proteins</strong> (mostly
          negatively charged amino acids and nucleic acids) that are too big to cross
          the membrane and are permanently trapped inside the cell.
        </p>
        <p>
          These fixed anions act exactly like the charge source in this simulation —
          they attract positive ions (cations like K⁺ and Na⁺) toward the inside of
          the cell. The result is a biased equilibrium: more positive ions inside than
          outside, even before the Na⁺/K⁺ pump gets involved.
        </p>
        <p>
          In the next lesson you will put the membrane back, add fixed anions inside,
          and watch how the electrical force shifts the equilibrium concentration of
          ions on each side.
        </p>
        <ul class="guided-questions">
          <li>
            The fixed anions cannot cross the membrane. Why does that matter for the
            simulation?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>If the anions could cross, they would themselves diffuse toward
                equal concentration on both sides, eliminating the persistent
                asymmetry. Because they are permanently trapped inside, the electrical
                attraction they create is also permanently present. A fixed source
                produces a steady force; a diffusible source would fade over time as
                the anions spread out.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 9 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 9 — Check your understanding</h2>
      <div class="guide-step">
        <ul class="guided-questions">
          <li>
            What are the two forces competing in this simulation, and what does each
            one do to the particle distribution?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><strong>Diffusion</strong> (the random step) pushes particles toward
                uniform distribution everywhere in the box. <strong>Electrical
                attraction</strong> (the drift term) pulls particles toward the charge
                source, concentrating them. In steady state, the two forces balance:
                particles are denser near the source but not all collapsed onto it.</p>
              </div>
            </details>
          </li>
          <li>
            In the code, how is the strength of the drift force related to distance
            from the source?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The drift magnitude is <code>strength / r³</code> (softened), which
                falls off as 1/r² for large distances. Particles far from the source
                feel a weak drift; particles close to the source feel a strong drift.
                This is the same inverse-square dependence as Coulomb's law.</p>
              </div>
            </details>
          </li>
          <li>
            What is the role of the <code>softening</code> parameter, and what would
            happen if it were set to zero?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Softening prevents the force from becoming infinite when a particle
                is at exactly the same position as the source (r = 0). Without it,
                the denominator would be zero and the calculation would produce
                <code>nan</code> or <code>inf</code>, crashing the simulation.</p>
              </div>
            </details>
          </li>
          <li>
            Could you move the source off-centre (e.g., to <code>source_x = 20,
            source_y = 10</code>) and still have the simulation work correctly?
            What would the cluster look like?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Yes — the <code>field_drift</code> function computes the displacement
                relative to wherever <code>(source_x, source_y)</code> is, so moving
                the source just changes where <code>dx</code> and <code>dy</code> point.
                The cluster would form at the new source position, offset from the
                centre of the box.</p>
              </div>
            </details>
          </li>
          <li>
            Why is the drift a <em>deterministic</em> addition to the step rather
            than another random term?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The electrical force on a particle depends only on its position and
                the source position — not on any random process. Given the same position,
                the drift is always the same vector. The random term models thermal
                noise, which is genuinely unpredictable. Keeping them separate reflects
                the real physics: diffusion is stochastic, electrical force is
                deterministic.</p>
              </div>
            </details>
          </li>
        </ul>
        <p style="margin-top: 16px;">
          When you are ready, open the interactive simulation to control field strength
          and diffusion independently and watch the balance shift in real time.
        </p>
        <p>
          <a href="../inspect_emergent_field_attraction.html" class="inline-link">
            Open the Electrical Field Attraction web simulation →
          </a>
        </p>
      </div>
    </section>

  </div>
`;

initThemeToggle(document.querySelector<HTMLButtonElement>('#theme-toggle')!);

document.querySelectorAll<HTMLElement>('.code-block-wrap').forEach((wrap) => {
  const pre = wrap.querySelector('pre');
  if (!pre) return;
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.textContent = 'Copy';
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(pre.innerText).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
    });
  });
  wrap.appendChild(btn);
});
