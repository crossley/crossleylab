import{a,i as n}from"./theme-BJJ86vkc.js";a();const o=document.querySelector("#app");o.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <a href="./">← Back to lessons</a>
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>

    <header class="page-head">
      <h1 class="landing-title">Lesson 6 — Fixed Anions: Attraction Without Separation</h1>
      <p class="eyebrow">
        Every living nerve cell contains large, negatively charged protein molecules
        that are permanently trapped inside. These fixed anions attract all positively
        charged ions — Na⁺ and K⁺ alike — toward the inside of the cell. In this
        lesson you will add that inward electrical pull to Lesson 4's two-ion
        selective-permeability code, and discover a surprising result: the anions
        attract <em>both</em> ions inward, so they cannot explain why Na⁺ ends up
        predominantly outside and K⁺ predominantly inside. Something else must be
        responsible for that separation.
      </p>
    </header>

    <!-- ── Step 1 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 1 — Why fixed anions matter</h2>
      <div class="guide-step">
        <p>
          In Lesson 4 you had two ion types (Na⁺ and K⁺), a membrane, and two
          selective channels. Starting with all particles on the right (outside), you
          watched diffusion drive ions leftward through the channels until concentrations
          were equal on both sides. With no other forces, the end state was always equal
          concentrations — a 50/50 split.
        </p>
        <p>
          Real cells are not at 50/50. The cytoplasm contains roughly 400 mM K⁺ and
          only 15 mM Na⁺; the extracellular fluid has roughly 145 mM Na⁺ and only
          5 mM K⁺. Something is maintaining that asymmetry.
        </p>
        <p>
          One candidate is the collection of large, negatively charged proteins trapped
          inside the cell — metabolic enzymes, cytoskeletal proteins, RNA, and DNA, all
          of which carry net negative charge at physiological pH. Because they are too
          large to cross the membrane, they sit permanently inside the cell and exert a
          steady electrical pull on all mobile cations (positive ions).
        </p>
        <p>
          This lesson models that pull as a uniform inward drift. Instead of one point
          source (Lesson 5), we will treat the anions as a vertical strip on the inside,
          whose net effect is simply a force pointing left (into the inside compartment).
          Create a new file called <code>anion_drift.py</code> to extend Lesson 4's
          code.
        </p>
        <ul class="guided-questions">
          <li>
            Why can a large protein stay permanently inside the cell while Na⁺ can
            (in principle) cross the membrane?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Ion channels are protein pores sized and shaped to admit one specific
                small ion. Large proteins (hundreds to thousands of amino acids) are far
                too big to fit through any ion channel pore and have no dedicated
                transporter. Once synthesised inside the cell, they are effectively
                trapped there for the life of the protein.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 2 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 2 — Setup: extend Lesson 4</h2>
      <div class="guide-step">
        <p>
          Start from Lesson 4's setup — the same box, membrane, two ion types, and two
          channels. Add one new parameter: <code>field_strength</code>, which controls
          how strongly the fixed anions attract mobile cations. A larger value means a
          stronger inward pull.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# ── box ──────────────────────────────────────────────────────────────
box_width  = 100
box_height = 100

# ── membrane ──────────────────────────────────────────────────────────
wall_x         = 0
channel_half_w = 2
left_wall      = wall_x - channel_half_w
right_wall     = wall_x + channel_half_w

# ── selective channels ────────────────────────────────────────────────
na_channel_y_min =  10
na_channel_y_max =  25
k_channel_y_min  = -25
k_channel_y_max  = -10

# ── particles ─────────────────────────────────────────────────────────
num_na = 100
num_k  = 100
num_particles = num_na + num_k

diffusion_sd = 1.5
num_steps    = 800

# ── fixed anion field ─────────────────────────────────────────────────
field_strength = 0.3    # drift speed toward inside; try 0 to turn off
anion_x        = -box_width / 4   # centre of the inside (left) compartment

# ── type array ────────────────────────────────────────────────────────
ion_type = np.zeros(num_particles, dtype=int)
ion_type[num_na:] = 1   # 0 = Na⁺, 1 = K⁺

# ── initial positions: all particles start on the right (outside) ──────
x = np.zeros((num_steps, num_particles))
y = np.zeros((num_steps, num_particles))

x[0] = np.random.uniform(right_wall + 1, box_width / 2, num_particles)
y[0] = np.random.uniform(-box_height / 2, box_height / 2, num_particles)</pre>
        </div>
        <p>
          The new variable <code>anion_x</code> marks the horizontal position of the
          anion strip — the centre of the inside compartment. The drift function in the
          next step will pull each cation toward this position.
        </p>
        <ul class="guided-questions">
          <li>
            We set <code>anion_x = -box_width / 4</code>. Where is that on the
            x-axis, and which compartment does it sit in?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>With <code>box_width = 100</code>, <code>anion_x = -25</code>. The
                membrane sits at <code>x = 0</code> (with walls from <code>-2</code> to
                <code>+2</code>), so <code>x = -25</code> is well inside the left
                (inside) compartment. Placing the anion strip at the midpoint of that
                compartment gives a representative target for the inward drift.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 3 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 3 — The anion field drift function</h2>
      <div class="guide-step">
        <p>
          Unlike Lesson 5's point-charge source (which required a 2-D inverse-square
          formula), the anion field is modelled as a <strong>1-D softened drift</strong>
          toward a vertical strip. The drift only acts in the x direction — it pulls
          each particle horizontally toward <code>anion_x</code>. The y direction is
          unchanged (the anions are spread across the full height of the inside).
        </p>
        <p>
          The formula is:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">def anion_field_drift(particle_x, anion_x, strength, softening=5.0):
    """
    Compute a 1-D drift toward the anion strip at anion_x.

    Parameters
    ----------
    particle_x : array of current x positions
    anion_x    : scalar x position of the anion strip (inside compartment)
    strength   : field strength (larger = stronger inward pull)
    softening  : prevents infinite force when a particle is exactly at anion_x

    Returns
    -------
    drift_x : array of x-direction drift values (one per particle)
    """
    dx = anion_x - particle_x          # positive when particle is right of anion_x
    r  = np.abs(dx) + softening        # softened 1-D distance; always &gt; 0
    return strength * dx / r</pre>
        </div>
        <p>
          Compare this to Lesson 5's <code>field_drift()</code>. The 2-D version
          needed <code>r_cubed = (dx² + dy² + ε²)^(3/2)</code>. Here we need only the
          x-component, so the distance is just <code>|dx| + ε</code> — the 1-D
          equivalent. Dividing by <code>r</code> rather than <code>r³</code> gives
          a weaker distance dependence: a more uniform pull across the inside
          compartment, which better reflects the smeared-out anion distribution.
        </p>
        <ul class="guided-questions">
          <li>
            For a particle currently at <code>x = +30</code> (outside), is
            <code>drift_x</code> positive or negative, and which direction does
            that move the particle?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><code>dx = anion_x - particle_x = -25 - 30 = -55</code>. Because
                <code>dx</code> is negative, <code>drift_x</code> is negative, pushing
                the particle in the negative x direction — leftward, toward the inside.
                This is correct: the anions attract the cation inward.</p>
              </div>
            </details>
          </li>
          <li>
            Why does the drift act only in the x direction and not in y?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The anions are modelled as a uniform vertical strip spanning the full
                height of the inside compartment. By symmetry, the upward and downward
                contributions from anions above and below a particle cancel out,
                leaving only a net horizontal (leftward) attraction. A fully detailed
                simulation would track every anion, but this 1-D approximation captures
                the key effect with much less code.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 4 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 4 — The update loop with drift</h2>
      <div class="guide-step">
        <p>
          The loop structure is identical to Lesson 4 — diffusion, wall crossing check,
          reflection — with one addition: compute the drift <em>before</em> the random
          step and add it to the x update. The y direction is unchanged.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">is_na = (ion_type == 0)
is_k  = (ion_type == 1)

for i in range(1, num_steps):

    # ── anion field drift (same for all cations) ──────────────────────
    drift_x = anion_field_drift(x[i-1], anion_x, field_strength)

    # ── random diffusion + drift ──────────────────────────────────────
    new_x = x[i-1] + np.random.normal(0, diffusion_sd, num_particles) + drift_x
    new_y = y[i-1] + np.random.normal(0, diffusion_sd, num_particles)

    # ── reflect off outer box walls ───────────────────────────────────
    new_x = np.clip(new_x, -box_width / 2,  box_width / 2)
    new_y = np.clip(new_y, -box_height / 2, box_height / 2)

    # ── wall crossing logic (from Lesson 4) ───────────────────────────
    crossing_right_to_left = (x[i-1] &gt;= right_wall) &amp; (new_x &lt; right_wall)
    crossing_left_to_right = (x[i-1] &lt;= left_wall)  &amp; (new_x &gt; left_wall)

    # Na⁺: only crosses through the Na⁺ channel
    na_blocked = is_na &amp; (
        crossing_right_to_left &amp; ~(
            (y[i-1] &gt;= na_channel_y_min) &amp; (y[i-1] &lt;= na_channel_y_max)
        ) |
        crossing_left_to_right &amp; ~(
            (y[i-1] &gt;= na_channel_y_min) &amp; (y[i-1] &lt;= na_channel_y_max)
        )
    )

    # K⁺: only crosses through the K⁺ channel
    k_blocked = is_k &amp; (
        crossing_right_to_left &amp; ~(
            (y[i-1] &gt;= k_channel_y_min) &amp; (y[i-1] &lt;= k_channel_y_max)
        ) |
        crossing_left_to_right &amp; ~(
            (y[i-1] &gt;= k_channel_y_min) &amp; (y[i-1] &lt;= k_channel_y_max)
        )
    )

    # blocked particles stay put in x
    blocked = na_blocked | k_blocked
    new_x[blocked] = x[i-1][blocked]

    x[i] = new_x
    y[i] = new_y</pre>
        </div>
        <p>
          The wall-crossing logic is carried over directly from Lesson 4. The only
          structural addition is the three lines that compute <code>drift_x</code> and
          add it to <code>new_x</code>. Note that <strong>both</strong> Na⁺ and K⁺
          receive the same drift — the anions attract every cation equally.
        </p>
        <ul class="guided-questions">
          <li>
            Why do blocked particles have their <code>new_x</code> reset to
            <code>x[i-1]</code> rather than to a position on the wall?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>We treat the wall as a reflective barrier: a blocked particle
                simply does not move through the wall this step, so it stays where it
                was. Placing it exactly on the wall surface could cause it to be
                detected as crossing again in the next step (a numerical edge case).
                Keeping it at its previous position is the simplest and safest
                approach.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 5 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 5 — Animate and observe</h2>
      <div class="guide-step">
        <p>
          Use the same two-colour scatter animation from Lesson 4, including the
          visible Na⁺ and K⁺ pore openings. Add a vertical line to mark the anion
          strip so you can see what the particles are drifting toward.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">fig, ax = plt.subplots(figsize=(8, 6))
ax.set_xlim(-box_width / 2, box_width / 2)
ax.set_ylim(-box_height / 2, box_height / 2)
ax.set_aspect('equal')
ax.set_facecolor('#0a0e17')

# draw the membrane with visible Na⁺ and K⁺ pore openings
wall_segments = [
    [(-box_height/2, na_channel_y_min), (na_channel_y_max, box_height/2)],
    [(-box_height/2, k_channel_y_min),  (k_channel_y_max, box_height/2)],
]
for y_bot, y_top in wall_segments[0]:
    ax.plot([left_wall, left_wall],  [y_bot, y_top], color='white', lw=2, zorder=2)
for y_bot, y_top in wall_segments[1]:
    ax.plot([right_wall, right_wall], [y_bot, y_top], color='white', lw=2, zorder=2)

ax.plot([left_wall, right_wall], [na_channel_y_min, na_channel_y_min], color='cyan',    lw=1, ls='--', zorder=2)
ax.plot([left_wall, right_wall], [na_channel_y_max, na_channel_y_max], color='cyan',    lw=1, ls='--', zorder=2)
ax.plot([left_wall, right_wall], [k_channel_y_min,  k_channel_y_min],  color='magenta', lw=1, ls='--', zorder=2)
ax.plot([left_wall, right_wall], [k_channel_y_max,  k_channel_y_max],  color='magenta', lw=1, ls='--', zorder=2)

# anion strip marker
ax.axvline(anion_x, color='yellow', linewidth=1, linestyle='--',
           label='anion strip', zorder=3)

# particle scatter: Na⁺ cyan, K⁺ magenta
sc_na = ax.scatter(x[0][is_na], y[0][is_na], s=6, color='cyan',    label='Na⁺')
sc_k  = ax.scatter(x[0][is_k],  y[0][is_k],  s=6, color='magenta', label='K⁺')
ax.legend(loc='upper right', fontsize=8)

def update(frame):
    sc_na.set_offsets(np.column_stack([x[frame][is_na], y[frame][is_na]]))
    sc_k.set_offsets( np.column_stack([x[frame][is_k],  y[frame][is_k]]))
    return sc_na, sc_k

ani = animation.FuncAnimation(fig, update, frames=num_steps, interval=30, blit=True)
plt.tight_layout()
plt.show()</pre>
        </div>
        <p>
          Run the simulation. Watch what happens to both Na⁺ (cyan) and K⁺ (magenta)
          over time. You should see both ion types accumulate on the left (inside)
          half of the box, with more ions on the left than on the right once the
          simulation reaches steady state.
        </p>
        <ul class="guided-questions">
          <li>
            After the simulation reaches steady state, is the distribution of Na⁺
            different from the distribution of K⁺? What does that tell you?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Both distributions look roughly the same: both Na⁺ and K⁺ are
                biased toward the inside. The anion field treats all positive ions
                identically — it does not distinguish Na⁺ from K⁺. This tells you
                that fixed anions alone cannot explain the biological gradient, where
                Na⁺ is predominantly outside and K⁺ predominantly inside.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 6 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 6 — Key insight: anions attract both ions equally</h2>
      <div class="guide-step">
        <p>
          To quantify what you have just seen, add a simple concentration counter at
          the end of the simulation. Count how many Na⁺ and K⁺ particles are on each
          side after the last step:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">final_x = x[-1]

na_inside  = np.sum(is_na &amp; (final_x &lt; left_wall))
na_outside = np.sum(is_na &amp; (final_x &gt; right_wall))
k_inside   = np.sum(is_k  &amp; (final_x &lt; left_wall))
k_outside  = np.sum(is_k  &amp; (final_x &gt; right_wall))

print(f"Na⁺  inside: {na_inside:3d}   outside: {na_outside:3d}")
print(f"K⁺   inside: {k_inside:3d}   outside: {k_outside:3d}")</pre>
        </div>
        <p>
          You will see that both Na⁺ and K⁺ have more particles inside than outside.
          The exact numbers vary (random walk), but both ratios are similar.
        </p>
        <p>
          This is the central lesson of this simulation:
        </p>
        <p>
          <strong>Fixed anions attract all cations inward. They can account for K⁺
          being concentrated inside (K⁺ is attracted inward and K⁺ channels are
          open at rest), but they also attract Na⁺ inward — which is the
          opposite of the biological reality.</strong> In living cells, Na⁺ is
          kept predominantly <em>outside</em>. Something must be actively pushing
          Na⁺ out against both diffusion and electrical attraction. That something
          is the Na⁺/K⁺ pump — the topic of Lesson 7.
        </p>
        <ul class="guided-questions">
          <li>
            Suppose you ran this simulation with only K⁺ channels open and Na⁺
            channels closed. Would fixed anions then fully explain the real K⁺
            gradient?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>They would help — the anion attraction would bias K⁺ toward the
                inside, and if the Na⁺ channels were closed (Na⁺ cannot cross), K⁺
                could build up inside over time. However, the real K⁺ gradient is far
                steeper than diffusion and anion attraction alone can produce. The Na/K
                pump actively imports K⁺ and the resulting membrane potential further
                concentrates it. Anions provide a partial explanation, not the full
                one.</p>
              </div>
            </details>
          </li>
          <li>
            The anion field pulls Na⁺ inward, but in real cells Na⁺ is predominantly
            outside. Name one mechanism (which you will implement in Lesson 7) that
            opposes the inward drift of Na⁺.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The Na⁺/K⁺ pump. It uses ATP to move three Na⁺ ions out of the
                cell for every two K⁺ ions it moves in, working directly against
                both diffusion and the electrical attraction of fixed anions. This
                active transport maintains the low intracellular Na⁺ concentration
                seen in living cells.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 7 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 7 — Explore: field strength experiments</h2>
      <div class="guide-step">
        <p>
          Experiment with the <code>field_strength</code> parameter to understand how
          strongly the anion field biases concentrations.
        </p>
        <p><strong>Experiment 1 — Turn off the field</strong></p>
        <p>
          Set <code>field_strength = 0</code> and run the simulation. Both ions should
          now distribute evenly — 50% inside, 50% outside at equilibrium (the Lesson 4
          result). This confirms the field is solely responsible for the inward bias.
        </p>
        <p><strong>Experiment 2 — Strong field</strong></p>
        <p>
          Set <code>field_strength = 2.0</code> and run. Both Na⁺ and K⁺ should pile
          up heavily on the inside — the anion attraction overwhelms diffusion and most
          ions never make it back through the channels. The inside concentration rises
          far above 50%.
        </p>
        <p><strong>Experiment 3 — Asymmetric channels</strong></p>
        <p>
          Keep <code>field_strength = 0.3</code>. Now widen the K⁺ channel
          (<code>k_channel_y_max = 35</code>) and narrow the Na⁺ channel
          (<code>na_channel_y_max = 12</code>). Do the two ions end up at different
          concentrations inside, even though the field treats them the same?
        </p>
        <ul class="guided-questions">
          <li>
            In Experiment 3, which ion has a higher inside concentration, and why?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>K⁺ should have a higher inside concentration. A wider K⁺ channel
                means more K⁺ particles can cross per unit time (higher permeability),
                so more K⁺ enters and the field traps more of it inside. Na⁺, with a
                narrower channel, crosses less frequently even though it experiences the
                same inward attraction. Channel width (permeability) modulates how
                quickly each ion reaches its steady-state bias, not whether it is
                attracted.</p>
              </div>
            </details>
          </li>
          <li>
            If you removed the membrane entirely (no wall), how would the steady-state
            distribution change?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Without a membrane, particles could move freely anywhere. The anion
                field would still attract them toward <code>anion_x</code>, but they
                could also diffuse back rightward without any barrier. The steady state
                would be a concentration gradient centred on the anion strip, not a
                sharp inside/outside split. The membrane is essential for maintaining
                a compartment-level concentration difference.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 8 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 8 — Check your understanding</h2>
      <div class="guide-step">
        <ul class="guided-questions">
          <li>
            What is the biological source of the fixed anions inside a nerve cell?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Large, negatively charged molecules that cannot cross the membrane:
                proteins (cytoskeletal and enzymatic), nucleic acids (DNA, RNA), and
                negatively charged phospholipid head groups. At physiological pH most
                of these carry net negative charge. Because they are too large for any
                ion channel, they are permanently trapped inside the cell.</p>
              </div>
            </details>
          </li>
          <li>
            In the code, the line <code>drift_x = anion_field_drift(x[i-1], anion_x,
            field_strength)</code> is called once and applied to all particles. Why is
            that valid — why don't Na⁺ and K⁺ need separate drift calculations?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Fixed anions attract all cations through simple electrostatic force,
                which depends on charge and distance — not on whether the ion is Na⁺ or
                K⁺. Both carry a single positive charge (+1), so the force on a Na⁺ at
                position x is identical to the force on a K⁺ at the same position x.
                One call to <code>anion_field_drift</code> with the full position array
                computes the correct drift for every particle regardless of type.</p>
              </div>
            </details>
          </li>
          <li>
            What would you need to add to this simulation so that Na⁺ ends up
            predominantly outside and K⁺ predominantly inside, as in a real cell?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>An active Na⁺/K⁺ pump: a mechanism that, at each time step, moves
                some Na⁺ ions from inside to outside and some K⁺ ions from outside to
                inside, regardless of their concentration gradient. Because this
                transport works against both diffusion and the anion field, it requires
                energy (ATP in real cells). Lesson 7 implements exactly this.</p>
              </div>
            </details>
          </li>
          <li>
            In this simulation, the anion strip is modelled as a fixed vertical line at
            <code>anion_x = -box_width / 4</code>. What important simplification does
            this make compared to a real cell?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>In reality, fixed anions are distributed throughout the cytoplasm,
                not concentrated on a single line. A full simulation would place
                thousands of individual anion particles that each exert their own
                Coulomb field. Our uniform-strip approximation replaces all of that
                with a single, smooth drift function — much cheaper to compute and
                sufficient for visualising the key effect (inward attraction of all
                cations) without adding complexity that would obscure the main
                pedagogical point.</p>
              </div>
            </details>
          </li>
          <li>
            The lesson title says "Still No Gradient." What gradient is missing, and
            why does it matter for understanding the resting membrane potential?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The <em>differential</em> gradient — Na⁺ high outside, K⁺ high
                inside — is missing. In this simulation both ions accumulate on the
                same side (inside), so there is no ion-specific separation. The
                resting membrane potential arises precisely because K⁺ is
                concentrated inside (and leaks out down its gradient through resting
                K⁺ channels), leaving net negative charge behind. Without separate
                gradients for the two ions, there is no driving force for this
                selective leak and therefore no stable membrane potential.</p>
              </div>
            </details>
          </li>
        </ul>
        <p style="margin-top: 16px;">
          When you are ready, explore the interactive simulation to see both ion types
          responding to the anion field in real time, and compare the result with and
          without the pump.
        </p>
        <p>
          <a href="./inspect_emergent_two_ion_selective_channels.html" class="inline-link">
            Open the Two-Ion Selective Channels web simulation →
          </a>
        </p>
      </div>
    </section>

  </div>
`;n(document.querySelector("#theme-toggle"));document.querySelectorAll(".code-block-wrap").forEach(t=>{const i=t.querySelector("pre");if(!i)return;const e=document.createElement("button");e.className="copy-btn",e.textContent="Copy",e.addEventListener("click",()=>{navigator.clipboard.writeText(i.innerText).then(()=>{e.textContent="Copied!",setTimeout(()=>{e.textContent="Copy"},1800)})}),t.appendChild(e)});
