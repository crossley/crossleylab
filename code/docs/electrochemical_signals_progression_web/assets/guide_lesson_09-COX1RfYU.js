import{a as s,i as n}from"./theme-BJJ86vkc.js";s();const o=document.querySelector("#app");o.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <a href="./">← Back to lessons</a>
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>

    <header class="page-head">
      <h1 class="landing-title">Lesson 9 — Nernst Equation</h1>
      <p class="eyebrow">
        In Lesson 8 you saw that membrane potential arises from a charge imbalance
        across the membrane. But that raises a deeper question: for a given ion
        concentration gradient — maintained by the Na/K pump — what is the exact
        equilibrium voltage? In this lesson you will derive the Nernst equation,
        the formula that answers this question for one ion species, and see why it
        predicts the −88 mV equilibrium potential for K⁺ found in real neurons.
      </p>
    </header>

    <!-- ── Step 1 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 1 — Two forces competing on K⁺</h2>
      <div class="guide-step">
        <p>
          By Lesson 7 the Na/K pump had established a steep concentration
          gradient: K⁺ is concentrated <strong>inside</strong> the cell, Na⁺
          is concentrated <strong>outside</strong>. Now open a K⁺-selective
          channel and ask: what happens?
        </p>
        <p>
          Two forces act on every K⁺ ion near the open channel:
        </p>
        <ul>
          <li>
            <strong>Diffusion (outward):</strong> There is more K⁺ inside than
            outside, so the concentration gradient drives K⁺ out through the
            channel — exactly as you saw in Lessons 2 and 3.
          </li>
          <li>
            <strong>Electrical force (inward):</strong> As K⁺ leaves, it takes
            positive charge with it. The fixed negative anions left behind make
            the inside increasingly negative. That growing negative potential
            attracts K⁺ back in.
          </li>
        </ul>
        <p>
          These two forces oppose each other. At first, diffusion wins — there
          is a strong gradient but no electrical potential yet. As more K⁺
          leaves, the electrical pull grows. Eventually the two forces balance
          and K⁺ stops flowing even though the channel is still open.
        </p>
        <p>
          Create a new file called <code>nernst_equation.py</code> for this
          lesson.
        </p>
      </div>
    </section>

    <!-- ── Step 2 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 2 — The equilibrium voltage</h2>
      <div class="guide-step">
        <p>
          The voltage at which K⁺ stops flowing is called the
          <strong>Nernst potential</strong> for K⁺, written E<sub>K</sub>.
          At this voltage:
        </p>
        <ul>
          <li>
            The <em>chemical</em> driving force (diffusion outward) is exactly
            equal and opposite to the <em>electrical</em> driving force
            (attraction inward).
          </li>
          <li>
            There is no <em>net</em> movement of K⁺ — the channel is still
            open and individual ions still cross, but as many cross inward as
            outward. The system is in dynamic equilibrium.
          </li>
        </ul>
        <p>
          Notice what E<sub>K</sub> is <em>not</em>: it is not the voltage at
          which the channel closes. The channel stays open. It is not the
          voltage at which ions stop moving entirely. Ions still cross in both
          directions — they just cancel out. E<sub>K</sub> is the voltage at
          which the <em>net</em> current is zero.
        </p>
        <p>
          Because the inside is made negative by the departing K⁺, E<sub>K</sub>
          must be a <em>negative</em> number (inside negative relative to
          outside). The exact value depends on how large the concentration
          gradient is — a steeper gradient requires a larger electrical force
          to balance it, so it produces a more negative E<sub>K</sub>.
        </p>
      </div>
    </section>

    <!-- ── Step 3 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 3 — The Nernst equation</h2>
      <div class="guide-step">
        <p>
          The Nernst equation is derived by setting the chemical driving force
          equal to the electrical driving force and solving for the voltage.
          The result is:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">E_K = (R * T) / (z * F) * ln([K+]_out / [K+]_in)</pre>
        </div>
        <p>Each term has a clear physical meaning:</p>
        <ul>
          <li>
            <strong>R</strong> — the universal gas constant (8.314 J/mol/K).
            It links energy to temperature.
          </li>
          <li>
            <strong>T</strong> — absolute temperature in Kelvin (body
            temperature ≈ 310 K). Higher temperature means more thermal
            (diffusion) energy, so a larger voltage is needed to oppose it.
          </li>
          <li>
            <strong>z</strong> — the valence (charge) of the ion. For K⁺,
            z = +1. The larger the charge, the more strongly the electrical
            force acts and the smaller the voltage needed to balance diffusion.
          </li>
          <li>
            <strong>F</strong> — Faraday's constant (96 485 C/mol). It
            converts from moles of charge to coulombs, linking chemistry to
            electricity.
          </li>
          <li>
            <strong>ln([K⁺]<sub>out</sub> / [K⁺]<sub>in</sub>)</strong> —
            the natural logarithm of the concentration ratio. Since
            [K⁺]<sub>in</sub> is much greater than [K⁺]<sub>out</sub> in a
            real neuron, this ratio is less than 1 and the logarithm is
            negative — giving a negative E<sub>K</sub> as expected.
          </li>
        </ul>
        <p>
          The prefactor RT/F evaluates to roughly 26.7 mV at body temperature
          (often approximated as 25 mV). This is sometimes called the
          "thermal voltage" — it sets the scale of biological potentials.
        </p>
      </div>
    </section>

    <!-- ── Step 4 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 4 — Python: compute E_K for real neurons</h2>
      <div class="guide-step">
        <p>
          Plug in the biological concentrations of K⁺ measured in real neurons.
          Add the following to <code>nernst_equation.py</code>:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np

R = 8.314    # universal gas constant  (J / mol / K)
T = 310      # body temperature        (Kelvin — approx 37 degrees C)
F = 96485    # Faraday constant        (C / mol)
z = 1        # valence of K+

# Biological K+ concentrations (millimolar)
K_in  = 140   # inside the cell  — high, maintained by Na/K pump
K_out =   5   # outside the cell — low

# Nernst potential for K+
E_K = (R * T) / (z * F) * np.log(K_out / K_in)

# Convert from volts to millivolts for display
E_K_mV = E_K * 1000
print(f"E_K = {E_K_mV:.1f} mV")</pre>
        </div>
        <p>
          Run the script. You should see approximately <strong>−88 mV</strong>.
          This is the equilibrium potential for K⁺ in a typical mammalian
          neuron — the voltage at which K⁺ stops flowing even with its channel
          open.
        </p>
        <p>
          The real resting potential of a neuron (around −70 mV) is slightly
          less negative than E<sub>K</sub> because other ions — particularly
          Na⁺ leaking in — also contribute. But K⁺ permeability dominates,
          so E<sub>K</sub> is the biggest single contributor to the resting
          potential. You will account for multiple ions in Lesson 10 (Goldman
          equation).
        </p>
      </div>
    </section>

    <!-- ── Step 5 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 5 — Plot E_K against the concentration ratio</h2>
      <div class="guide-step">
        <p>
          The Nernst equation predicts that E<sub>K</sub> depends only on the
          <em>ratio</em> of concentrations, not on the absolute values. Sweep
          through a range of ratios to see the full picture. Add the following
          to your script:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import matplotlib.pyplot as plt

# Sweep K_out / K_in from a very unequal gradient to a reversed one
ratio = np.linspace(0.01, 10, 200)   # K_out / K_in
E     = (R * T) / (z * F) * np.log(ratio) * 1000   # convert to mV

# Mark the biological K+ operating point
bio_ratio = K_out / K_in            # 5 / 140 ≈ 0.036
bio_E     = E_K_mV                  # already computed above

plt.figure(figsize=(7, 4))
plt.plot(ratio, E, color='steelblue', linewidth=2)
plt.plot(bio_ratio, bio_E, 'ro', markersize=8, label='K+ in real neuron')
plt.axhline(0, color='black', linewidth=0.8, linestyle='--')
plt.axvline(1, color='gray',  linewidth=0.8, linestyle='--')
plt.xlabel('Concentration ratio  K_out / K_in')
plt.ylabel('Nernst potential  E_K  (mV)')
plt.title('E_K vs concentration ratio')
plt.legend()
plt.tight_layout()
plt.show()</pre>
        </div>
        <p>Interpret each region of the plot:</p>
        <ul>
          <li>
            <strong>Ratio &lt; 1 (left of the dashed vertical line):</strong>
            K⁺ is more concentrated inside than outside — the biological case.
            E<sub>K</sub> is negative (inside negative). The red dot marks the
            real neuron.
          </li>
          <li>
            <strong>Ratio = 1 (dashed vertical line):</strong> Equal
            concentrations on both sides. No diffusion gradient, so no
            equilibrium voltage is needed. E<sub>K</sub> = 0.
          </li>
          <li>
            <strong>Ratio &gt; 1 (right of the line):</strong> K⁺ is more
            concentrated outside — the reverse of the biological case.
            E<sub>K</sub> is positive (inside positive).
          </li>
        </ul>
        <p>
          The logarithmic shape is important: doubling the gradient from 2:1 to
          4:1 adds the same increment of voltage as doubling from 4:1 to 8:1.
          Large changes in absolute concentration produce smaller and smaller
          changes in E<sub>K</sub>.
        </p>
      </div>
    </section>

    <!-- ── Step 6 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 6 — Permeability does not change E_K</h2>
      <div class="guide-step">
        <p>
          Look carefully at the Nernst equation again:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">E_K = (R * T) / (z * F) * ln([K+]_out / [K+]_in)</pre>
        </div>
        <p>
          There is no term for channel permeability — how wide the channel is,
          how many channels are open, or how fast ions can pass through. The
          Nernst potential depends <em>only</em> on the concentration ratio and
          the physical constants R, T, z, and F.
        </p>
        <p>
          This is a fundamental and non-obvious result. Increasing K⁺
          permeability (opening more K⁺ channels):
        </p>
        <ul>
          <li>
            Does <strong>not</strong> change E<sub>K</sub> — the target
            equilibrium voltage stays the same.
          </li>
          <li>
            Does change <strong>how fast</strong> the membrane reaches
            E<sub>K</sub> — more channels means current flows faster and
            equilibrium is reached sooner.
          </li>
          <li>
            Does change the resting potential of a cell that has
            <em>multiple</em> ion types open simultaneously — increasing K⁺
            permeability pulls the resting potential closer toward E<sub>K</sub>
            by giving K⁺ a stronger "vote" (you will explore this with the
            Goldman equation in Lesson 10).
          </li>
        </ul>
        <p>
          Think of E<sub>K</sub> as the destination and permeability as the
          speed of travel. Opening more K⁺ channels is like widening the road:
          you reach the same destination faster, but the destination itself
          does not move.
        </p>
      </div>
    </section>

    <!-- ── Step 7 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 7 — Explore the simulation</h2>
      <div class="guide-step">
        <p>
          Open the web simulation linked at the bottom of this page. It shows
          K⁺ ions (concentrated on the left/inside), fixed anions inside, an
          adjustable K⁺ channel, and a live readout of V<sub>m</sub> alongside
          the Nernst prediction (the dashed line).
        </p>
        <p>Work through these challenges:</p>
        <ul>
          <li>
            <strong>Permeability test:</strong> Adjust the channel width or
            permeability slider. Watch V<sub>m</sub> approach the Nernst
            prediction. Does E<sub>K</sub> (the dashed line) change as you
            adjust permeability? Does V<sub>m</sub> at equilibrium change?
          </li>
          <li>
            <strong>Gradient test:</strong> Adjust the pump rate (which changes
            how many K⁺ ions are maintained inside). As the gradient steepens,
            does E<sub>K</sub> become more or less negative? Is this consistent
            with the equation?
          </li>
          <li>
            <strong>Equal concentrations:</strong> Reduce the pump until the
            inside and outside K⁺ counts are approximately equal. What does the
            Nernst prediction say E<sub>K</sub> should be? Does the simulation
            agree?
          </li>
          <li>
            <strong>Reversed gradient:</strong> If you could make K⁺ more
            concentrated outside than inside, what sign would E<sub>K</sub>
            have? Check your prediction against the plot from Step 5.
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
            Using the Nernst equation with R = 8.314, T = 310, z = 1,
            F = 96 485, and a concentration ratio of K_out / K_in = 1/10,
            what is E<sub>K</sub> in millivolts? (You may use Python or a
            calculator.)
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>
                  E<sub>K</sub> = (8.314 × 310) / (1 × 96485) × ln(0.1)
                  × 1000.<br>
                  ln(0.1) ≈ −2.303.<br>
                  Prefactor ≈ 0.02672 V.<br>
                  E<sub>K</sub> ≈ 0.02672 × −2.303 × 1000
                  ≈ <strong>−61.5 mV</strong>.<br>
                  A 10-fold gradient produces about −61.5 mV — a useful rule
                  of thumb is "roughly −60 mV per decade of concentration ratio
                  at body temperature."
                </p>
              </div>
            </details>
          </li>
          <li>
            If you double the absolute concentrations on both sides — say from
            K_in = 140 mM, K_out = 5 mM to K_in = 280 mM, K_out = 10 mM —
            does E<sub>K</sub> change?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>
                  No. E<sub>K</sub> depends only on the
                  <em>ratio</em> [K⁺]<sub>out</sub> / [K⁺]<sub>in</sub>.
                  Doubling both concentrations keeps the ratio at 5/140 =
                  10/280, so the Nernst potential is unchanged. What matters
                  is the relative difference, not the absolute quantities.
                </p>
              </div>
            </details>
          </li>
          <li>
            You open more K⁺ channels in the simulation and watch V<sub>m</sub>
            converge to E<sub>K</sub> faster. A fellow student says "opening
            more channels made the Nernst potential more negative." Are they
            correct? Explain.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>
                  No, they are not correct. Opening more K⁺ channels
                  increases permeability, which speeds up how quickly
                  V<sub>m</sub> reaches E<sub>K</sub>. But E<sub>K</sub>
                  itself — the target equilibrium voltage — is set entirely
                  by the concentration ratio and does not change when
                  permeability changes. The student may have confused
                  the <em>speed</em> of convergence with the <em>target</em>
                  voltage.
                </p>
              </div>
            </details>
          </li>
          <li>
            At the Nernst potential, is there any K⁺ movement through the
            channel? Explain.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>
                  Yes — individual K⁺ ions still cross the membrane in both
                  directions. At E<sub>K</sub>, the flux of K⁺ moving outward
                  (driven by diffusion) is exactly equal to the flux moving
                  inward (driven by the electrical potential). The
                  <em>net</em> current is zero, but the gross movement in each
                  direction continues. This is dynamic equilibrium, not a
                  static absence of movement.
                </p>
              </div>
            </details>
          </li>
          <li>
            The Nernst equation contains the factor RT/F. What happens to
            E<sub>K</sub> if the temperature increases (e.g., during a fever)?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>
                  Increasing T increases the prefactor RT/F, which scales the
                  entire equation. Since the logarithm is negative for the
                  biological K⁺ gradient, a larger prefactor makes E<sub>K</sub>
                  more negative. Physically, higher temperature means more
                  thermal energy driving diffusion outward, so a stronger
                  electrical potential (more negative inside) is required to
                  balance it. In practice the change is modest over the range
                  of biological temperatures — a 3–4 K fever shifts
                  E<sub>K</sub> by only about 1–2 mV.
                </p>
              </div>
            </details>
          </li>
        </ul>
        <p style="margin-top: 16px;">
          When you are ready, open the interactive simulation to see the Nernst
          prediction overlaid on the particle dynamics in real time.
        </p>
        <p>
          <a href="./inspect_emergent_nernst_one_ion.html" class="inline-link">
            Open the Nernst Equation web simulation →
          </a>
        </p>
      </div>
    </section>

  </div>
`;n(document.querySelector("#theme-toggle"));document.querySelectorAll(".code-block-wrap").forEach(t=>{const i=t.querySelector("pre");if(!i)return;const e=document.createElement("button");e.className="copy-btn",e.textContent="Copy",e.addEventListener("click",()=>{navigator.clipboard.writeText(i.innerText).then(()=>{e.textContent="Copied!",setTimeout(()=>{e.textContent="Copy"},1800)})}),t.appendChild(e)});
