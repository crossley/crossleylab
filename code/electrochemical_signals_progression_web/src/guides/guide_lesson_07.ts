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
      <h1 class="landing-title">Lesson 7 — The Na⁺/K⁺ Pump</h1>
      <p class="eyebrow">
        Lesson 6 showed that fixed anions attract both Na⁺ and K⁺ inward — neither
        ion ends up predominantly outside. Yet in every living nerve cell Na⁺ is
        concentrated outside and K⁺ inside. The difference is the
        <strong>Na⁺/K⁺ pump</strong>: a membrane protein powered by ATP that
        actively ejects Na⁺ and imports K⁺, working directly against their
        concentration gradients. In this lesson you will add pump logic to Lesson 6's
        code and watch the biological gradient emerge from active transport.
      </p>
    </header>

    <!-- ── Step 1 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 1 — What is the Na⁺/K⁺ pump?</h2>
      <div class="guide-step">
        <p>
          The Na⁺/K⁺-ATPase (Na/K pump) is a protein embedded in the plasma membrane
          of almost every animal cell. In each cycle it:
        </p>
        <ul>
          <li>Binds <strong>3 Na⁺</strong> on the inside of the membrane</li>
          <li>Hydrolyses one ATP molecule (releases energy)</li>
          <li>Uses that energy to eject the 3 Na⁺ to the outside</li>
          <li>Simultaneously picks up <strong>2 K⁺</strong> from the outside</li>
          <li>Releases those 2 K⁺ to the inside</li>
        </ul>
        <p>
          Net result per cycle: 3 Na⁺ leave, 2 K⁺ enter. Repeat this millions of times
          per second in millions of pumps, and you get the biological gradient: Na⁺
          high outside, K⁺ high inside.
        </p>
        <p>
          Notice that the pump moves ions <em>against</em> their concentration
          gradients — Na⁺ is pushed out even though there is already more Na⁺ outside;
          K⁺ is pulled in even though there is already more K⁺ inside. This
          <strong>active transport</strong> can only happen by consuming energy (ATP).
          Without a constant supply of ATP, the pump stops and the gradients collapse.
        </p>
        <p>
          Create a new file called <code>nak_pump.py</code>. Start by copying your
          <code>anion_drift.py</code> from Lesson 6 — you will extend it here.
        </p>
        <ul class="guided-questions">
          <li>
            The pump moves 3 Na⁺ out and only 2 K⁺ in per cycle. What does this
            asymmetry do to the net charge balance across the membrane?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Each pump cycle exports one net positive charge (3 out − 2 in = +1
                charge exported). This makes the inside of the membrane slightly more
                negative relative to the outside on every cycle, contributing a small
                direct electrical component to the membrane potential. This is why the
                Na/K pump is called <em>electrogenic</em>.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 2 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 2 — Where the pump fits in the code</h2>
      <div class="guide-step">
        <p>
          The pump acts after the regular per-step physics. Your update loop currently
          has this structure:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">for i in range(1, num_steps):
    drift_x = anion_field_drift(x[i-1], anion_x, field_strength)
    new_x   = x[i-1] + np.random.normal(0, diffusion_sd, num_particles) + drift_x
    new_y   = y[i-1] + np.random.normal(0, diffusion_sd, num_particles)
    new_x   = np.clip(new_x, -box_width / 2,  box_width / 2)
    new_y   = np.clip(new_y, -box_height / 2, box_height / 2)
    # ... wall crossing logic ...
    new_x[blocked] = x[i-1][blocked]
    x[i] = new_x
    y[i] = new_y</pre>
        </div>
        <p>
          The pump step will go <em>after</em> the wall-crossing logic and
          <em>before</em> storing <code>x[i]</code>. The pump teleports one Na⁺ from
          inside to outside and one K⁺ from outside to inside. It does not care about
          channels or walls — it is a direct, energy-driven translocation.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">for i in range(1, num_steps):
    # ... diffusion + drift + wall crossing (unchanged from Lesson 6) ...

    # ── Na/K pump (NEW) ───────────────────────────────────────────────
    new_x = apply_pump(new_x, ion_type, pump_rate, left_wall, right_wall, box_width)

    x[i] = new_x
    y[i] = new_y</pre>
        </div>
        <p>
          Add a new parameter near the top of the file:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">pump_rate = 0.4   # probability that the pump fires each time step (0 = off, 1 = always)</pre>
        </div>
        <ul class="guided-questions">
          <li>
            Why should the pump run <em>after</em> diffusion and wall crossing rather
            than before?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The pump teleports particles from one side to the other regardless
                of the membrane. If we ran it before diffusion, a particle moved by
                the pump could then diffuse back through a channel in the same step,
                partially undoing the pump's work twice as often. Placing it last
                means each particle's final position for this step reflects all
                physical processes: diffusion, drift, wall reflection, and then the
                pump. The ordering is a modelling choice, but this order keeps the
                pump's action most clearly separated from passive transport.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 3 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 3 — Pseudocode for <code>apply_pump()</code></h2>
      <div class="guide-step">
        <p>
          Before writing the real code, plan the logic in plain language:
        </p>
        <ol>
          <li>
            Roll a random number. If it is greater than <code>pump_rate</code>, the
            pump does not fire this step — return immediately.
          </li>
          <li>
            Find all Na⁺ particles that are currently on the <strong>inside</strong>
            (left of <code>left_wall</code>).
          </li>
          <li>
            If at least one Na⁺ is inside, pick one at random and move it to the
            <strong>outside</strong> (place it somewhere randomly on the right side).
          </li>
          <li>
            Find all K⁺ particles that are currently on the <strong>outside</strong>
            (right of <code>right_wall</code>).
          </li>
          <li>
            If at least one K⁺ is outside, pick one at random and move it to the
            <strong>inside</strong> (place it somewhere randomly on the left side).
          </li>
          <li>Return the updated position array.</li>
        </ol>
        <p>
          Two NumPy tools do the heavy lifting:
        </p>
        <ul>
          <li>
            <code>np.where(condition)[0]</code> — returns the <em>indices</em> of
            elements where <code>condition</code> is <code>True</code>.
          </li>
          <li>
            <code>np.random.choice(array)</code> — picks one element from
            <code>array</code> at random (uniformly).
          </li>
        </ul>
        <ul class="guided-questions">
          <li>
            Why do we use <code>np.random.choice()</code> to pick <em>one</em>
            particle per pump cycle, rather than moving all eligible particles at once?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The real Na/K pump is a single protein that processes one set of
                ions per ATP hydrolysis cycle. Moving all eligible particles at once
                would be equivalent to having infinitely many pumps, which would drain
                the gradient almost instantly. Picking one particle per step models a
                realistic pump rate — the pump fires stochastically with probability
                <code>pump_rate</code> per time step, and moves at most one Na⁺ out
                and one K⁺ in per firing. This lets diffusion and the pump compete at
                a realistic balance point.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 4 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 4 — Implement <code>apply_pump()</code></h2>
      <div class="guide-step">
        <p>
          Place this function definition before the simulation loop:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">def apply_pump(x, ion_type, pump_rate, left_wall, right_wall, box_width):
    """
    Move one Na⁺ from inside to outside and one K⁺ from outside to inside,
    each with probability pump_rate per call.

    Parameters
    ----------
    x          : 1-D array of current x positions (modified in place)
    ion_type   : 1-D int array (0 = Na⁺, 1 = K⁺)
    pump_rate  : probability that the pump fires this step
    left_wall  : x coordinate of the left membrane face
    right_wall : x coordinate of the right membrane face
    box_width  : total width of the simulation box

    Returns
    -------
    x : updated position array
    """
    if np.random.random() &gt; pump_rate:
        return x   # pump doesn't fire this step

    # ── pump Na⁺ out (inside → outside) ──────────────────────────────
    na_inside = np.where((ion_type == 0) &amp; (x &lt; left_wall))[0]
    if len(na_inside) &gt; 0:
        pick = np.random.choice(na_inside)
        x[pick] = np.random.uniform(right_wall + 1, box_width / 2 - 1)

    # ── pump K⁺ in (outside → inside) ────────────────────────────────
    k_outside = np.where((ion_type == 1) &amp; (x &gt; right_wall))[0]
    if len(k_outside) &gt; 0:
        pick = np.random.choice(k_outside)
        x[pick] = np.random.uniform(-box_width / 2 + 1, left_wall - 1)

    return x</pre>
        </div>
        <p>
          A few details worth noting:
        </p>
        <ul>
          <li>
            <code>np.where((ion_type == 0) &amp; (x &lt; left_wall))[0]</code> combines
            two boolean conditions with <code>&amp;</code> (element-wise AND) to find
            Na⁺ particles that are also on the inside. The <code>[0]</code> unpacks the
            tuple that <code>np.where</code> returns to get the index array.
          </li>
          <li>
            <code>np.random.uniform(right_wall + 1, box_width / 2 - 1)</code> places
            the pumped Na⁺ at a random position in the outside compartment, away from
            the wall edge. Similarly for K⁺ on the inside.
          </li>
          <li>
            The <code>if len(...) &gt; 0</code> guards prevent a crash when all Na⁺ are
            already outside (or all K⁺ already inside) — the pump simply skips that
            direction.
          </li>
        </ul>
        <ul class="guided-questions">
          <li>
            What does <code>np.where((ion_type == 0) &amp; (x &lt; left_wall))[0]</code>
            return, and what is the data type of the result?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>It returns a NumPy array of integers — the <em>indices</em> of all
                particles that are simultaneously Na⁺ (<code>ion_type == 0</code>) and
                located inside the cell (<code>x &lt; left_wall</code>). The
                <code>[0]</code> unpacks the single-element tuple that
                <code>np.where</code> returns when given a 1-D condition. The dtype is
                <code>int64</code> (or platform equivalent).</p>
              </div>
            </details>
          </li>
          <li>
            Why is <code>x</code> modified inside the function even though Python
            passes arrays by reference? Could this cause unexpected side effects?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>NumPy arrays are mutable objects passed by reference, so
                <code>x[pick] = ...</code> inside the function modifies the original
                array that the caller passed in. This is intentional here — we want
                the change to persist. However, it does mean the caller's array is
                changed even without using the return value. To be safe, the function
                still returns <code>x</code> so the caller can write
                <code>new_x = apply_pump(new_x, ...)</code> making the mutation
                explicit in the calling code.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 5 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 5 — Add the pump to the loop</h2>
      <div class="guide-step">
        <p>
          Here is the complete update loop with both the anion field (Lesson 6) and
          the pump (new):
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">is_na = (ion_type == 0)
is_k  = (ion_type == 1)

for i in range(1, num_steps):

    # ── anion field drift ─────────────────────────────────────────────
    drift_x = anion_field_drift(x[i-1], anion_x, field_strength)

    # ── diffusion + drift ─────────────────────────────────────────────
    new_x = x[i-1] + np.random.normal(0, diffusion_sd, num_particles) + drift_x
    new_y = y[i-1] + np.random.normal(0, diffusion_sd, num_particles)

    # ── box walls ─────────────────────────────────────────────────────
    new_x = np.clip(new_x, -box_width / 2,  box_width / 2)
    new_y = np.clip(new_y, -box_height / 2, box_height / 2)

    # ── selective membrane crossing ───────────────────────────────────
    crossing_right_to_left = (x[i-1] &gt;= right_wall) &amp; (new_x &lt; right_wall)
    crossing_left_to_right = (x[i-1] &lt;= left_wall)  &amp; (new_x &gt; left_wall)

    na_blocked = is_na &amp; (
        crossing_right_to_left &amp; ~(
            (y[i-1] &gt;= na_channel_y_min) &amp; (y[i-1] &lt;= na_channel_y_max)
        ) |
        crossing_left_to_right &amp; ~(
            (y[i-1] &gt;= na_channel_y_min) &amp; (y[i-1] &lt;= na_channel_y_max)
        )
    )

    k_blocked = is_k &amp; (
        crossing_right_to_left &amp; ~(
            (y[i-1] &gt;= k_channel_y_min) &amp; (y[i-1] &lt;= k_channel_y_max)
        ) |
        crossing_left_to_right &amp; ~(
            (y[i-1] &gt;= k_channel_y_min) &amp; (y[i-1] &lt;= k_channel_y_max)
        )
    )

    blocked = na_blocked | k_blocked
    new_x[blocked] = x[i-1][blocked]

    # ── Na/K pump (new) ───────────────────────────────────────────────
    new_x = apply_pump(new_x, ion_type, pump_rate, left_wall, right_wall, box_width)

    x[i] = new_x
    y[i] = new_y</pre>
        </div>
        <p>
          The entire pump is one line in the loop — <code>apply_pump(...)</code>.
          Everything else is identical to Lesson 6. This is the Extend pattern at work:
          a new biological mechanism slots in as a single modular function call.
        </p>
        <ul class="guided-questions">
          <li>
            The pump call uses <code>new_x</code> (positions after this step's
            diffusion and wall crossing) rather than <code>x[i-1]</code> (positions
            from the previous step). Why does this matter?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The pump should act on where particles actually are at the end of
                this step — not where they were at the start. A particle that diffused
                from outside to inside in this step should now be eligible to be pumped
                back out. Using <code>new_x</code> ensures the pump sees the most
                up-to-date positions after all passive transport has already occurred
                for this time step.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 6 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 6 — Observe the biological gradient</h2>
      <div class="guide-step">
        <p>
          Use the same animation code from Lesson 6. Run the simulation with the
          default settings (<code>pump_rate = 0.4</code>, <code>field_strength =
          0.3</code>). Then add a counter to print concentrations at the end:
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
          You should see:
        </p>
        <ul>
          <li>
            <strong>Na⁺</strong>: more particles <em>outside</em> than inside — the
            pump is winning against the anion attraction.
          </li>
          <li>
            <strong>K⁺</strong>: more particles <em>inside</em> — both the anion
            field and the pump push K⁺ inward.
          </li>
        </ul>
        <p>
          This is the biological gradient: Na⁺ predominantly outside, K⁺ predominantly
          inside. It does not arise from diffusion or from anions alone — it is
          actively maintained by the pump working against equilibrium.
        </p>
        <ul class="guided-questions">
          <li>
            The pump moves Na⁺ outward against the anion field's inward pull. Which
            mechanism wins at the steady state suggested by your counter output?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The pump wins for Na⁺ — more Na⁺ ends up outside despite the
                anion attraction. For K⁺, the pump and the anion field work in the
                same direction (both import K⁺), so K⁺ is strongly concentrated
                inside. The steady state reflects a balance: the rate at which the
                pump ejects Na⁺ balances the rate at which diffusion and the anion
                field pull it back in.</p>
              </div>
            </details>
          </li>
          <li>
            In the animation, do Na⁺ (cyan) and K⁺ (magenta) visibly separate to
            different sides? Is this separation perfect (all Na⁺ outside) or
            partial?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The separation is partial, not perfect. Diffusion continuously
                moves ions across the membrane through channels, and the pump
                continuously counteracts this. At steady state you will see
                <em>more</em> Na⁺ outside and <em>more</em> K⁺ inside, but some of
                each ion will always be on the "wrong" side — this is the nature of a
                dynamic equilibrium driven by competing fluxes, not a perfect
                sorting.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 7 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 7 — Turn off the pump: gradients collapse</h2>
      <div class="guide-step">
        <p>
          The pump requires ATP. What happens when ATP runs out — for example, when a
          cell is poisoned with <strong>ouabain</strong>, a plant toxin that specifically
          blocks the Na/K pump?
        </p>
        <p>
          Simulate this by setting <code>pump_rate = 0</code> and re-running. The pump
          never fires, so the only forces are diffusion and the anion field.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">pump_rate = 0.0   # pump off — equivalent to ouabain poisoning</pre>
        </div>
        <p>
          You should find that the Na⁺/K⁺ gradient collapses: both ions accumulate on
          the inside (driven by the anion field), as you saw in Lesson 6. There is no
          longer any mechanism to keep Na⁺ predominantly outside.
        </p>
        <p><strong>Experiment — varying pump rate</strong></p>
        <p>
          Try <code>pump_rate = 0.1</code>, then <code>0.4</code>, then <code>0.9</code>.
          Print the final concentrations each time. Does increasing the pump rate
          sharpen the gradient? Is there a rate above which the gradient stops
          improving?
        </p>
        <ul class="guided-questions">
          <li>
            In real neurotoxicology, ouabain poisoning causes neurons to fire
            repetitively and then go silent. Based on what you have just simulated,
            explain why the Na⁺/K⁺ gradient collapsing would first over-excite and
            then silence a neuron.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The resting membrane potential depends on K⁺ being concentrated
                inside (K⁺ leaks out, leaving the inside negative). When the pump
                stops, Na⁺ floods in and K⁺ leaks out — initially this depolarises the
                membrane, triggering action potentials (over-excitation). As the
                gradients continue to collapse, the membrane potential approaches zero,
                there is no longer sufficient driving force to generate action
                potentials, and the neuron goes silent. Eventually the cell swells from
                osmotic influx of Na⁺ and water and can be irreversibly damaged.</p>
              </div>
            </details>
          </li>
          <li>
            In the experiment varying pump rate, is there a ceiling on the gradient
            that can be maintained, even with <code>pump_rate = 1.0</code>? Why?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Yes. Even with the pump firing every step, diffusion continuously
                moves Na⁺ inward and K⁺ outward through open channels. The maximum
                gradient occurs when the pump flux exactly balances the diffusive flux;
                making the pump faster than the diffusive leak provides no additional
                benefit because the gradient itself grows until the leak rate matches
                the pump rate. In practice, the steady-state gradient is limited by
                the ratio of pump rate to channel permeability.</p>
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
            The <code>apply_pump()</code> function has a guard:
            <code>if np.random.random() &gt; pump_rate: return x</code>. What role
            does this line play, and what does <code>pump_rate = 1.0</code> mean
            biologically?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The guard makes the pump stochastic: it fires with probability
                <code>pump_rate</code> on each time step, and does nothing otherwise.
                <code>pump_rate = 1.0</code> means the pump fires on every single time
                step — equivalent to running the pump at its maximum possible rate.
                Biologically, this would correspond to a cell with an unusually high
                density of Na/K pumps and unlimited ATP supply. In practice pump rate
                is regulated by intracellular Na⁺ concentration (more Na⁺ inside =
                faster pump) and ATP availability.</p>
              </div>
            </details>
          </li>
          <li>
            In the code, the pump can move a Na⁺ particle from <code>x = -40</code>
            all the way to <code>x = +35</code> in a single step. In real cells, does
            the Na/K pump work this fast relative to diffusion?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>No — the teleportation is a modelling simplification. Real pumps
                move ions through a conformational change that takes microseconds and
                spans only the membrane thickness (∼8 nm). In the simulation each
                time step and each length unit represent many real-world time and
                length scales, so a single pump event moving the particle across half
                the box is equivalent to the net effect of many pump cycles over the
                modelled time interval. The key feature captured correctly is the
                directionality: Na⁺ always goes out, K⁺ always goes in.</p>
              </div>
            </details>
          </li>
          <li>
            The simulation uses <code>np.random.choice(na_inside)</code> to select
            which Na⁺ to pump. What would happen to the gradient if instead you
            always chose the Na⁺ particle closest to the membrane?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>At steady state, the gradient would be similar — what matters for
                the bulk concentration is how many Na⁺ are pumped out per unit time,
                not which specific particle is chosen. However, always picking the
                nearest particle would deplete the region just inside the membrane of
                Na⁺ first, creating a local concentration gradient near the wall that
                would not exist with random selection. The random-choice rule is
                simpler and avoids introducing artefactual spatial structure.</p>
              </div>
            </details>
          </li>
          <li>
            Over many lessons, you have added diffusion (L1), walls (L2), probabilistic
            gating (L3), selective permeability (L4), electrical drift (L5), fixed
            anions (L6), and now active transport (L7). Which of these mechanisms is
            passive (requires no energy input) and which is active?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><strong>Passive</strong> (no energy input required): diffusion
                (L1–L4), probabilistic channel gating (L3), selective permeability
                (L4), and electrical drift toward fixed anions (L5–L6). These all move
                ions down their electrochemical gradients and are driven by thermal
                energy already present in the system. <strong>Active</strong> (requires
                energy): the Na/K pump (L7). It moves ions against their gradients and
                requires ATP hydrolysis. The distinction is fundamental in physiology:
                passive transport dissipates gradients; active transport maintains
                them.</p>
              </div>
            </details>
          </li>
          <li>
            You now have a simulation that produces a Na⁺ outside / K⁺ inside
            gradient. What additional ingredient would you need to simulate a
            resting membrane potential?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>You would need to track the net charge on each side of the membrane
                and calculate the resulting voltage. In a real cell, the membrane
                potential arises because K⁺ leaks out through resting K⁺ channels
                faster than Na⁺ leaks in, leaving a slight excess of negative charge
                inside. To model this you would need: (1) a way to count net charge
                imbalance rather than just particle counts, and (2) a feedback where
                the growing electrical potential opposes further K⁺ efflux until the
                system reaches the Nernst/Goldman equilibrium — the resting membrane
                potential of roughly −70 mV.</p>
              </div>
            </details>
          </li>
        </ul>
        <p style="margin-top: 16px;">
          Explore the interactive simulation to control pump rate and field strength
          independently, and watch the gradient build and collapse in real time.
        </p>
        <p>
          <a href="../inspect_emergent_nak_pump_gradients.html" class="inline-link">
            Open the Na⁺/K⁺ Pump Gradients web simulation →
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
