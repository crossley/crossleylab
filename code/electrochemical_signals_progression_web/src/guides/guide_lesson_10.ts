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
      <h1 class="landing-title">Lesson 10 — The Goldman Equation</h1>
      <p class="eyebrow">
        Lesson 9 showed that when only K⁺ can cross the membrane, the resting
        membrane potential settles exactly at E<sub>K</sub> — the Nernst potential
        for potassium. But real nerve cells have both K⁺ and Na⁺ channels open at
        rest. When two ions compete to set the voltage, neither one wins completely.
        This lesson derives the Goldman equation — the rule that tells you exactly
        where V<sub>m</sub> lands when multiple ions are simultaneously permeant.
      </p>
    </header>

    <!-- ── Step 1 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 1 — One ion vs two ions</h2>
      <div class="guide-step">
        <p>
          In Lesson 9 you ran a simulation with a single K⁺-selective channel. At
          equilibrium, V<sub>m</sub> settled exactly at the Nernst potential for K⁺:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">E_K = (RT / zF) * ln([K]_out / [K]_in)</pre>
        </div>
        <p>
          The key insight was that <strong>permeability does not appear in the
          Nernst equation</strong>. It only determines how fast the system reaches
          E<sub>K</sub>, not where it ends up. With only one permeant ion there is
          a unique equilibrium voltage, and the system always finds it.
        </p>
        <p>
          Now open the web simulation for this lesson and notice that there are
          <em>two</em> types of channel — one selective for K⁺ and one selective for
          Na⁺. Both are open simultaneously. Watch the V<sub>m</sub> trace settle.
          You will see that it does <strong>not</strong> land on E<sub>K</sub> or on
          E<sub>Na</sub>. It lands somewhere in between.
        </p>
        <p>
          This is the core puzzle of Lesson 10: with two ions, where does V<sub>m</sub>
          go, and why?
        </p>
        <ul class="guided-questions">
          <li>
            In the single-ion case, why does V<sub>m</sub> settle exactly at
            E<sub>K</sub> regardless of the K⁺ permeability?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>At E<sub>K</sub> the electrical force on K⁺ exactly balances its
                diffusion force, so the net K⁺ flux across the membrane is zero. No
                current flows, so V<sub>m</sub> does not change. The permeability only
                controls how quickly current flows to charge or discharge the membrane
                capacitance — it does not shift the equilibrium point itself.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 2 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 2 — V<sub>m</sub> sits between the two Nernst potentials</h2>
      <div class="guide-step">
        <p>
          Think of E<sub>K</sub> and E<sub>Na</sub> as two teams pulling on a rope.
        </p>
        <ul>
          <li>
            K⁺ moves through its channels. Whenever V<sub>m</sub> is above E<sub>K</sub>
            there is net outward K⁺ current, which hyperpolarises the membrane (pulls
            V<sub>m</sub> downward toward E<sub>K</sub>).
          </li>
          <li>
            Na⁺ moves through its channels. Whenever V<sub>m</sub> is below E<sub>Na</sub>
            there is net inward Na⁺ current, which depolarises the membrane (pulls
            V<sub>m</sub> upward toward E<sub>Na</sub>).
          </li>
        </ul>
        <p>
          The membrane potential settles at the voltage where these two opposing
          currents cancel exactly. That voltage depends on both the concentration
          gradients <em>and</em> the permeabilities — the more permeable ion exerts
          a stronger pull.
        </p>
        <p>
          Using biological values:
        </p>
        <ul>
          <li>K<sup>+</sup>: [K]<sub>out</sub> = 5 mM, [K]<sub>in</sub> = 140 mM → E<sub>K</sub> ≈ −88 mV</li>
          <li>Na<sup>+</sup>: [Na]<sub>out</sub> = 145 mM, [Na]<sub>in</sub> = 12 mM → E<sub>Na</sub> ≈ +60 mV</li>
        </ul>
        <p>
          At rest, K⁺ channels are far more numerous and open than Na⁺ channels, so
          the membrane is much more permeable to K⁺. The tug-of-war is lopsided:
          V<sub>m</sub> is pulled well toward E<sub>K</sub> but not all the way there,
          ending up around −75 mV.
        </p>
        <ul class="guided-questions">
          <li>
            If P<sub>K</sub> and P<sub>Na</sub> were exactly equal, where would you
            expect V<sub>m</sub> to land relative to E<sub>K</sub> and E<sub>Na</sub>?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Exactly halfway between E<sub>K</sub> and E<sub>Na</sub>. Equal
                permeabilities mean the two ions pull with equal strength, so the
                balance point is the arithmetic mean. You will verify this numerically
                in Step 5.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 3 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 3 — The Goldman equation</h2>
      <div class="guide-step">
        <p>
          The quantitative version of the tug-of-war argument is the
          <strong>Goldman–Hodgkin–Katz (GHK) voltage equation</strong>, usually
          called the Goldman equation. For two monovalent cations it reads:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">Vm = (RT / F) * ln( (P_K * [K]_out  +  P_Na * [Na]_out)
                  / (P_K * [K]_in   +  P_Na * [Na]_in ) )</pre>
        </div>
        <p>
          Compare this with the Nernst equation for K⁺:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">E_K = (RT / F) * ln( [K]_out / [K]_in )</pre>
        </div>
        <p>
          The Goldman equation reduces to the Nernst equation in two special cases:
        </p>
        <ul>
          <li>
            Set P<sub>Na</sub> = 0. The Na⁺ terms drop out, and the numerator becomes
            P<sub>K</sub> × [K]<sub>out</sub>, denominator P<sub>K</sub> × [K]<sub>in</sub>.
            The P<sub>K</sub> cancels, leaving exactly E<sub>K</sub>.
          </li>
          <li>
            Set P<sub>K</sub> = 0. By the same logic you recover E<sub>Na</sub>.
          </li>
        </ul>
        <p>
          So the Goldman equation is a generalisation: it reduces to the Nernst
          equation when only one ion is permeant, and it interpolates between the
          two Nernst potentials when both ions are present.
        </p>
        <ul class="guided-questions">
          <li>
            Why does the permeability ratio P<sub>Na</sub> / P<sub>K</sub> determine
            where V<sub>m</sub> sits between E<sub>Na</sub> and E<sub>K</sub>, rather
            than the absolute values of P<sub>Na</sub> and P<sub>K</sub> individually?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Inside the logarithm, P<sub>K</sub> appears as a common factor in
                numerator and denominator. You can divide both by P<sub>K</sub> to
                rewrite the Goldman equation purely in terms of the ratio
                P<sub>Na</sub> / P<sub>K</sub> (call it r):
                Vm = (RT/F) ln(([K]<sub>out</sub> + r[Na]<sub>out</sub>) /
                ([K]<sub>in</sub> + r[Na]<sub>in</sub>)). Only the ratio r matters;
                doubling both permeabilities does not change V<sub>m</sub>.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 4 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 4 — Python: compute the Goldman potential</h2>
      <div class="guide-step">
        <p>
          Open a Python script or notebook and enter the biological concentrations
          for a typical mammalian neuron. The resting permeability ratio
          P<sub>Na</sub> / P<sub>K</sub> ≈ 0.04 means K⁺ is about 25 times more
          permeable than Na⁺ at rest.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np

# Physical constants
R = 8.314    # J / (mol K)
T = 310      # K  (body temperature, ~37 °C)
F = 96485    # C / mol

# Biological concentrations  (mM)
K_out,  K_in  = 5,   140
Na_out, Na_in = 145,  12

# Relative permeabilities at rest
P_K  = 1.0
P_Na = 0.04   # Na+ is ~25x less permeable than K+ at rest

# Goldman equation
numerator   = P_K * K_out  + P_Na * Na_out
denominator = P_K * K_in   + P_Na * Na_in
Vm = (R * T / F) * np.log(numerator / denominator) * 1000   # mV

print(f"Vm = {Vm:.1f} mV")</pre>
        </div>
        <p>
          You should get approximately <strong>−75 mV</strong>. This is close to
          the measured resting potential of many neurons (typically −65 to −85 mV
          depending on cell type).
        </p>
        <p>
          Notice that V<sub>m</sub> = −75 mV lies between E<sub>K</sub> ≈ −88 mV
          and E<sub>Na</sub> ≈ +60 mV, much closer to E<sub>K</sub> because
          P<sub>K</sub> dominates.
        </p>
        <ul class="guided-questions">
          <li>
            Change <code>P_Na</code> to <code>0.0</code> and run the code. What is
            the output, and does it match E<sub>K</sub> computed from the Nernst
            equation?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>With P<sub>Na</sub> = 0, the Goldman equation collapses to
                (RT/F) ln(K_out / K_in), which is exactly the Nernst equation for
                K⁺. Using these concentrations: E<sub>K</sub> = (8.314 × 310 / 96485)
                × ln(5 / 140) × 1000 ≈ −88 mV. The Goldman output should match this
                exactly, confirming the reduction to Nernst when one permeability
                is zero.</p>
              </div>
            </details>
          </li>
          <li>
            Now set <code>P_Na = 1.0</code> (equal to P<sub>K</sub>). Is the result
            the midpoint of E<sub>K</sub> and E<sub>Na</sub>? Why or why not?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Not exactly the arithmetic midpoint (−14 mV) because the Goldman
                equation uses a <em>logarithm</em>. The concentrations are weighted
                inside the log, so the result (around −14 mV for these concentrations)
                is a log-weighted combination of E<sub>K</sub> and E<sub>Na</sub>,
                not a simple average. Equal permeabilities mean equal weighting, but
                the log distorts the linear scale.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 5 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 5 — Plot V<sub>m</sub> vs permeability ratio</h2>
      <div class="guide-step">
        <p>
          The tug-of-war picture suggests that V<sub>m</sub> should sweep smoothly
          from E<sub>K</sub> to E<sub>Na</sub> as P<sub>Na</sub> / P<sub>K</sub>
          increases. Verify this by computing V<sub>m</sub> across a wide range of
          ratios and plotting the result.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np
import matplotlib.pyplot as plt

R, T, F = 8.314, 310, 96485
K_out,  K_in  = 5,   140
Na_out, Na_in = 145,  12

# Nernst potentials for reference
E_K  = (R * T / F) * np.log(K_out  / K_in)  * 1000   # mV
E_Na = (R * T / F) * np.log(Na_out / Na_in) * 1000   # mV

# Sweep the ratio P_Na / P_K from 0.001 to 10  (log scale)
ratios = np.logspace(-3, 1, 300)
P_K = 1.0
Vm_values = []

for r in ratios:
    P_Na = r * P_K
    num = P_K * K_out  + P_Na * Na_out
    den = P_K * K_in   + P_Na * Na_in
    Vm_values.append((R * T / F) * np.log(num / den) * 1000)

Vm_values = np.array(Vm_values)

plt.figure(figsize=(8, 5))
plt.semilogx(ratios, Vm_values, lw=2, label='Vm (Goldman)')
plt.axhline(E_K,  linestyle='--', label=f'E_K  = {E_K:.0f} mV')
plt.axhline(E_Na, linestyle='--', label=f'E_Na = {E_Na:.0f} mV')
plt.axvline(0.04, linestyle=':', label='Rest  (P_Na/P_K = 0.04)')
plt.xlabel('P_Na / P_K  (log scale)')
plt.ylabel('Membrane potential  (mV)')
plt.title('Goldman equation: Vm vs permeability ratio')
plt.legend()
plt.tight_layout()
plt.show()</pre>
        </div>
        <p>
          The dashed lines mark E<sub>K</sub> and E<sub>Na</sub> — the asymptotes
          that V<sub>m</sub> approaches but never quite reaches unless one
          permeability is truly zero. The dotted vertical line marks the resting
          condition.
        </p>
        <ul class="guided-questions">
          <li>
            On the plot, what happens to V<sub>m</sub> as the ratio
            P<sub>Na</sub> / P<sub>K</sub> approaches zero on the left side of
            the x-axis?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>V<sub>m</sub> approaches E<sub>K</sub> ≈ −88 mV asymptotically.
                As Na⁺ permeability becomes negligible the Goldman equation reduces
                to the Nernst equation for K⁺, so K⁺ fully determines V<sub>m</sub>.
                The curve never quite touches E<sub>K</sub> while the ratio is merely
                small rather than exactly zero, but it gets arbitrarily close.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 6 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 6 — The action potential connection</h2>
      <div class="guide-step">
        <p>
          The Goldman equation reveals something profound about how nerve cells
          generate action potentials. The permeability ratio is not fixed — it
          changes dramatically during electrical signalling.
        </p>
        <p><strong>At rest:</strong></p>
        <p>
          P<sub>Na</sub> / P<sub>K</sub> ≈ 0.04. K⁺ channels are open; Na⁺
          channels are almost entirely closed. V<sub>m</sub> ≈ −75 mV, close to
          E<sub>K</sub>.
        </p>
        <p><strong>During the action potential upstroke:</strong></p>
        <p>
          A depolarising stimulus opens voltage-gated Na⁺ channels. Suddenly
          P<sub>Na</sub> rises by a factor of hundreds.
          P<sub>Na</sub> / P<sub>K</sub> shifts from 0.04 to values well above 1.
          From the plot you made in Step 5, you can read off where V<sub>m</sub>
          goes: it shoots toward E<sub>Na</sub> ≈ +60 mV.
        </p>
        <p>
          This is the entire action potential upstroke explained by the Goldman
          equation: a sudden large increase in Na⁺ permeability swings the
          tug-of-war from K⁺-dominated to Na⁺-dominated, driving V<sub>m</sub>
          from −75 mV toward +60 mV in under a millisecond.
        </p>
        <p>
          Repolarisation follows when the Na⁺ channels inactivate and delayed
          K⁺ channels open, swinging the ratio back.
        </p>
        <ul class="guided-questions">
          <li>
            Using your plot from Step 5, estimate what P<sub>Na</sub> / P<sub>K</sub>
            ratio is needed for V<sub>m</sub> to reach +30 mV (roughly the peak of
            an action potential in many neurons).
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>From the Goldman sweep, V<sub>m</sub> reaches around +30 mV when
                P<sub>Na</sub> / P<sub>K</sub> ≈ 5–10. You can find the exact value
                by adding a line to your Python script:
                <code>ratios[np.argmin(np.abs(Vm_values - 30))]</code>.
                The exact number depends on your concentration values, but ratios in
                the range 5–15 typically produce a +30 mV Goldman potential with
                biological concentrations.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 7 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 7 — Explore the web simulation</h2>
      <div class="guide-step">
        <p>
          Open the web simulation linked at the bottom of this page. It shows two
          ion types (K⁺ and Na⁺) moving through their respective selective channels,
          with the Na⁺/K⁺ pump maintaining biological gradients. The V<sub>m</sub>
          trace is displayed alongside reference lines for E<sub>K</sub> and
          E<sub>Na</sub>.
        </p>
        <p><strong>Experiment 1 — Match the Goldman prediction</strong></p>
        <p>
          Set the K⁺ permeability to maximum and the Na⁺ permeability to a low
          value (about 4% of K⁺). Note V<sub>m</sub>. Does it agree with the ~−75 mV
          you computed in Step 4?
        </p>
        <p><strong>Experiment 2 — Find the midpoint</strong></p>
        <p>
          Adjust the permeability sliders until V<sub>m</sub> sits as close as
          possible to the midpoint between E<sub>K</sub> and E<sub>Na</sub>. What
          permeability ratio does this require? Is it P<sub>Na</sub> / P<sub>K</sub>
          = 1, or something different? (Hint: remember that the Goldman equation uses
          a logarithm, and the two Nernst potentials are not symmetric around zero.)
        </p>
        <p><strong>Experiment 3 — Pump rate and concentration</strong></p>
        <p>
          Reduce the pump rate. The pump maintains the concentration gradients that
          determine E<sub>K</sub> and E<sub>Na</sub>. Watch what happens to the
          reference lines and to V<sub>m</sub> as the gradients slowly collapse.
        </p>
        <ul class="guided-questions">
          <li>
            When the pump is switched off and the concentration gradients collapse,
            what do you predict happens to both E<sub>K</sub> and E<sub>Na</sub>,
            and therefore to V<sub>m</sub>?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>As concentrations equalise across the membrane, [K]<sub>out</sub>
                / [K]<sub>in</sub> → 1 and [Na]<sub>out</sub> / [Na]<sub>in</sub>
                → 1. The Nernst equation gives (RT/F) ln(1) = 0 for both ions, so
                both E<sub>K</sub> and E<sub>Na</sub> approach 0 mV. With both
                reference lines at zero, the Goldman equation also gives V<sub>m</sub>
                → 0 mV. The cell loses its resting potential and can no longer signal.</p>
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
            What are the two inputs to the Goldman equation, and why do both matter
            for determining V<sub>m</sub>?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The two inputs are <strong>concentration gradients</strong>
                (the intracellular and extracellular concentrations of each ion,
                which set E<sub>K</sub> and E<sub>Na</sub>) and
                <strong>permeabilities</strong> (the relative ease with which each
                ion crosses the membrane, which determines how strongly each ion
                pulls V<sub>m</sub> toward its Nernst potential). The concentration
                gradient alone sets the equilibrium voltage for each ion; the
                permeability determines how much weight each ion has in the tug-of-war.</p>
              </div>
            </details>
          </li>
          <li>
            The Nernst equation contains no permeability term, but the Goldman
            equation does. Explain why permeability appears in Goldman but not
            in Nernst.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>With a single permeant ion there is only one equilibrium voltage:
                the Nernst potential where the diffusion and electrical forces on
                that ion exactly cancel. Permeability does not change this balance
                point, so it drops out. With two permeant ions there is no voltage
                that simultaneously satisfies both ions' equilibrium conditions.
                Instead, V<sub>m</sub> settles where total current is zero — a
                weighted compromise. The weights are the permeabilities, so they
                necessarily appear in the equation.</p>
              </div>
            </details>
          </li>
          <li>
            A student argues: "If we double both P<sub>K</sub> and P<sub>Na</sub>,
            V<sub>m</sub> must change because there is more total current." Is this
            correct?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>No. Doubling both permeabilities doubles the K⁺ current and
                doubles the Na⁺ current equally. The ratio P<sub>Na</sub> /
                P<sub>K</sub> is unchanged. Inside the Goldman logarithm, P<sub>K</sub>
                cancels out of the numerator and denominator, so V<sub>m</sub> is
                identical. More current charges the membrane capacitance faster, but
                the steady-state V<sub>m</sub> — where currents cancel — does not move.</p>
              </div>
            </details>
          </li>
          <li>
            At rest, V<sub>m</sub> ≈ −75 mV even though E<sub>K</sub> ≈ −88 mV.
            This means there is a small steady inward Na⁺ current. How is the cell
            in steady state if Na⁺ is continuously leaking in?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The Na⁺/K⁺ pump continuously extrudes the Na⁺ that leaks in
                (3 Na⁺ out per 2 K⁺ in per pump cycle). The pump current is small
                but exactly matches the passive Na⁺ leak, so there is no net charge
                accumulation and V<sub>m</sub> stays constant. This is a
                <em>dynamic</em> steady state, not a true thermodynamic equilibrium:
                the pump uses ATP to maintain the offset between V<sub>m</sub> and
                E<sub>K</sub>.</p>
              </div>
            </details>
          </li>
          <li>
            Suppose a toxin blocked all K⁺ channels while leaving Na⁺ channels
            unaffected. Use the Goldman equation to predict what would happen to
            V<sub>m</sub>.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Setting P<sub>K</sub> = 0 in the Goldman equation leaves only the
                Na⁺ terms. The P<sub>Na</sub> factors cancel, and V<sub>m</sub>
                reduces to the Nernst potential for Na⁺: E<sub>Na</sub> ≈ +60 mV.
                The membrane would depolarise strongly (from −75 mV toward +60 mV),
                and the cell would be unable to repolarise or generate normal action
                potentials. This is similar to what happens during the peak of an
                action potential upstroke.</p>
              </div>
            </details>
          </li>
        </ul>
        <p style="margin-top: 16px;">
          When you are ready, open the interactive simulation to manipulate
          permeabilities in real time and watch V<sub>m</sub> track the Goldman
          prediction.
        </p>
        <p>
          <a href="../inspect_emergent_resting_potential_fixed_anions.html" class="inline-link">
            Open the Resting Potential web simulation →
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
