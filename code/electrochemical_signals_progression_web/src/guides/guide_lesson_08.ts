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
      <h1 class="landing-title">Lesson 8 — Voltage as Charge Separation</h1>
      <p class="eyebrow">
        The previous lessons built the full machinery of ion movement: diffusion,
        selective channels, electrical attraction, fixed anions, and the Na/K pump
        that maintains concentration gradients against diffusion. You have now seen
        every component needed to understand the resting potential. In this lesson
        you step back from the simulation mechanics and ask a simpler question:
        what exactly <em>is</em> membrane potential, and how do we calculate it?
        The answer — voltage is charge imbalance — is concrete enough to compute
        with four lines of Python.
      </p>
    </header>

    <!-- ── Step 1 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 1 — What is voltage?</h2>
      <div class="guide-step">
        <p>
          In everyday speech, "voltage" sounds like an exotic quantity that requires
          special equipment to measure. In a biological context the idea is
          surprisingly concrete: <strong>membrane potential is simply the imbalance
          of electrical charge across the membrane</strong>.
        </p>
        <p>
          Think of a set of balance scales. Place equal numbers of positive and
          negative charges on each pan — the scales balance and the reading is zero.
          Now slide a few positive charges from the right pan to the left: the left
          pan tips down. That tipping is the voltage. The bigger the imbalance, the
          larger the reading.
        </p>
        <p>Two important points follow from this analogy:</p>
        <ul>
          <li>
            <strong>Voltage is not the total number of ions.</strong> You could have
            a billion ions on each side and still read zero volts if they are
            perfectly balanced.
          </li>
          <li>
            <strong>Only the <em>difference</em> matters.</strong> Moving even a
            tiny fraction of ions from one side to the other produces a measurable
            voltage.
          </li>
        </ul>
        <p>
          Create a new file called <code>membrane_potential.py</code> for this
          lesson.
        </p>
      </div>
    </section>

    <!-- ── Step 2 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 2 — The membrane as a capacitor</h2>
      <div class="guide-step">
        <p>
          The cell membrane is a lipid bilayer roughly 7–10 nm thick. Lipids do not
          conduct electricity, so the membrane acts as an <strong>insulating
          barrier</strong> between two conducting salt solutions — the cytoplasm
          inside and the extracellular fluid outside.
        </p>
        <p>
          This is exactly the structure of a <em>capacitor</em> in electronics: two
          conducting regions separated by an insulator. When charge accumulates
          differently on the two sides — more positive ions pressing against the
          inner membrane surface than the outer — a potential difference (voltage)
          appears across the insulator.
        </p>
        <p>For the cell membrane the two sides are:</p>
        <ul>
          <li>
            <strong>Inside surface:</strong> the inner leaflet of the bilayer,
            facing the cytoplasm.
          </li>
          <li>
            <strong>Outside surface:</strong> the outer leaflet, facing the
            extracellular space.
          </li>
        </ul>
        <p>
          If there are more net positive charges hugging the inside surface than the
          outside surface, the inside is positive relative to the outside:
          V<sub>m</sub> &gt; 0. If net positive charges are higher outside, the
          inside is negative: V<sub>m</sub> &lt; 0. At rest, neurons maintain
          roughly −70 to −90 mV — the inside is negative.
        </p>
        <p>
          Crucially, only ions <em>very close to the membrane surface</em>
          contribute to this capacitor charge. The vast bulk of ions in the
          interior of the cytoplasm are electrically paired with nearby counter-ions
          and contribute nothing to V<sub>m</sub>. This is why only a tiny
          imbalance is needed to produce a large voltage — we will quantify this in
          Step 6.
        </p>
      </div>
    </section>

    <!-- ── Step 3 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 3 — The formula</h2>
      <div class="guide-step">
        <p>
          The web simulation uses a teaching proxy for membrane potential. This
          proxy is not the Nernst equation and it is not yet the Goldman equation.
          Those later models use ion concentrations, temperature, valence, and
          permeability to predict equilibrium voltages. Here we are doing
          something simpler: isolating the basic physical idea that voltage is
          proportional to the <em>net charge imbalance at the membrane surface</em>.
        </p>
        <p>
          Step 2 explained <em>why</em> a membrane can hold a voltage: the lipid
          bilayer behaves like a capacitor. The formula below is a teaching rule
          for turning that surface charge imbalance into a membrane-potential
          number you can compute in code before you meet the more complete
          biophysical equations in Lessons 9 and 10.
        </p>
        <p>Define the following quantities:</p>
        <ul>
          <li><strong>net_inside</strong> = inside_positive − inside_negative</li>
          <li><strong>net_outside</strong> = outside_positive − outside_negative</li>
          <li>
            <strong>surface_charge_scale</strong> = the number of unpaired
            membrane-adjacent charges that corresponds to a full-scale voltage
            in this teaching model
          </li>
        </ul>
        <p>The membrane potential proxy is then:</p>
        <div class="code-block-wrap">
          <pre class="code-block">V_m = scale × clamp((net_inside − net_outside) / surface_charge_scale, -1, 1)</pre>
        </div>
        <p>
          The <code>scale</code> factor (set to 80 in the simulation) maps the
          surface imbalance onto a biologically plausible millivolt range. The
          simulation uses <code>surface_charge_scale = 200</code>, meaning that a
          left-vs-right net charge difference of 200 membrane-adjacent ions gives
          the full-scale value of ±80 mV. Equal net charges on both sides give
          V<sub>m</sub> = 0.
        </p>
        <p>Two properties of this formula match the real membrane potential:</p>
        <ul>
          <li>
            It is <strong>zero</strong> when the net charge is equal on both sides,
            regardless of how many neutral ion pairs are present in the bulk.
          </li>
          <li>
            It is <strong>signed</strong>: positive when the inside carries more
            net positive charge, negative when the outside does.
          </li>
          <li>
            It depends on the <strong>unpaired surface charge</strong>, not the
            total ion count in the cell.
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 4 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 4 — Python: compute V_m for several scenarios</h2>
      <div class="guide-step">
        <p>
          Translate the formula into a Python function, then test it on three
          biologically motivated scenarios.
        </p>
        <p>
          <strong>Before you run:</strong> create a file called
          <code>membrane_potential.py</code>, paste in the complete script below,
          then run <code>python membrane_potential.py</code>. Success looks like
          three printed membrane potentials: +48.0 mV, 0.0 mV, and −80.0 mV.
        </p>
        <p><strong>Runnable checkpoint — full file so far</strong></p>
        <div class="code-block-wrap">
          <pre class="code-block">def clamp(value, low, high):
    return max(low, min(high, value))

def membrane_potential(
    inside_pos,
    inside_neg,
    outside_pos,
    outside_neg,
    scale=80,
    surface_charge_scale=200,
):
    net_inside = inside_pos - inside_neg
    net_outside = outside_pos - outside_neg
    if surface_charge_scale <= 0:
        return 0.0
    imbalance = net_inside - net_outside
    V_m = scale * clamp(imbalance / surface_charge_scale, -1, 1)
    return V_m

# Scenario A: mostly positive inside
vm_A = membrane_potential(
    inside_pos=80,
    inside_neg=20,
    outside_pos=20,
    outside_neg=80,
)
print(f"Scenario A (mostly + inside):  {vm_A:.1f} mV")

# Scenario B: balanced
vm_B = membrane_potential(
    inside_pos=60,
    inside_neg=40,
    outside_pos=60,
    outside_neg=40,
)
print(f"Scenario B (balanced):         {vm_B:.1f} mV")

# Scenario C: more negative inside
vm_C = membrane_potential(
    inside_pos=0,
    inside_neg=100,
    outside_pos=100,
    outside_neg=0,
)
print(f"Scenario C (resting-like):     {vm_C:.1f} mV")</pre>
        </div>
        <p><strong>Expected console output</strong></p>
        <div class="code-block-wrap">
          <pre class="code-block">Scenario A (mostly + inside):  48.0 mV
Scenario B (balanced):         0.0 mV
Scenario C (resting-like):     -80.0 mV</pre>
        </div>
        <p>
          Before you look at the output, predict each result from the formula in
          Step 3. Then verify:
        </p>
        <ul>
          <li>
            <strong>Scenario A:</strong> net_inside = 80 − 20 = 60;
            net_outside = 20 − 80 = −60; difference = 120.
            V<sub>m</sub> = 80 × 120 / 200 = <strong>+48 mV</strong>.
          </li>
          <li>
            <strong>Scenario B:</strong> net_inside = 20; net_outside = 20;
            difference = 0. V<sub>m</sub> = <strong>0 mV</strong> — perfectly
            balanced, no voltage.
          </li>
          <li>
            <strong>Scenario C:</strong> net_inside = −100; net_outside = 100;
            difference = −200. V<sub>m</sub> = 80 × −200 / 200 =
            <strong>−80 mV</strong>.
          </li>
        </ul>
        <p>
          Scenario C is the closest to a real resting neuron: the inside carries
          more net negative charge, the outside more net positive charge, and
          V<sub>m</sub> is negative.
        </p>
      </div>
    </section>

    <!-- ── Step 5 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 5 — Plot the scenarios as a bar chart</h2>
      <div class="guide-step">
        <p>
          A bar chart makes it easy to compare V<sub>m</sub> across several
          charge configurations at a glance.
        </p>
        <p>
          <strong>What changed from the previous version?</strong> You are keeping
          the same three scenarios, adding one new scenario where positive charge
          is concentrated outside, and then plotting all four values.
        </p>
        <p>
          <strong>Before you run:</strong> keep using
          <code>membrane_potential.py</code>. If needed, install Matplotlib with
          <code>pip install matplotlib</code>, then replace your file with the full
          script below and run <code>python membrane_potential.py</code>. Success
          looks like the same three printed lines as Step 4 plus a bar chart window.
        </p>
        <p><strong>Runnable checkpoint — full file so far</strong></p>
        <div class="code-block-wrap">
          <pre class="code-block">import matplotlib.pyplot as plt

def clamp(value, low, high):
    return max(low, min(high, value))

def membrane_potential(
    inside_pos,
    inside_neg,
    outside_pos,
    outside_neg,
    scale=80,
    surface_charge_scale=200,
):
    net_inside = inside_pos - inside_neg
    net_outside = outside_pos - outside_neg
    if surface_charge_scale <= 0:
        return 0.0
    imbalance = net_inside - net_outside
    V_m = scale * clamp(imbalance / surface_charge_scale, -1, 1)
    return V_m

# Scenario A: mostly positive inside
vm_A = membrane_potential(
    inside_pos=80,
    inside_neg=20,
    outside_pos=20,
    outside_neg=80,
)
print(f"Scenario A (mostly + inside):  {vm_A:.1f} mV")

# Scenario B: balanced
vm_B = membrane_potential(
    inside_pos=60,
    inside_neg=40,
    outside_pos=60,
    outside_neg=40,
)
print(f"Scenario B (balanced):         {vm_B:.1f} mV")

# Scenario C: more negative inside
vm_C = membrane_potential(
    inside_pos=0,
    inside_neg=100,
    outside_pos=100,
    outside_neg=0,
)
print(f"Scenario C (resting-like):     {vm_C:.1f} mV")

labels = [
    "Mostly +\ninside",
    "Balanced",
    "Resting-like\n(-80 mV)",
    "Mostly +\noutside",
]

vms = [
    membrane_potential(80, 20, 20, 80),
    membrane_potential(60, 40, 60, 40),
    membrane_potential(0, 100, 100, 0),
    membrane_potential(20, 80, 80, 20),
]

colours = ["steelblue" if v >= 0 else "tomato" for v in vms]

plt.figure(figsize=(8, 4))
plt.bar(labels, vms, color=colours, edgecolor="black")
plt.axhline(0, color="black", linewidth=0.8)
plt.ylabel("Membrane potential (mV)")
plt.title("V_m for different charge configurations")
plt.tight_layout()
plt.show()</pre>
        </div>
        <p>
          <strong>Expected result:</strong> the first three scenarios still print
          +48.0 mV, 0.0 mV, and −80.0 mV. The chart then displays one positive bar,
          one zero bar, and two negative bars.
        </p>
        <p>
          If no plot window appears, that is usually a local Python-environment
          issue rather than a logic error in the script. The calculation is still
          correct if the console output matches Step 4.
        </p>
        <p>
          Blue bars represent positive membrane potentials; red bars represent
          negative potentials. The balanced scenario sits exactly at zero — no
          imbalance, no voltage. Notice that the resting-like scenario
          (all charge on opposite sides) reaches the maximum negative value
          of −80 mV permitted by the scale factor.
        </p>
      </div>
    </section>

    <!-- ── Step 6 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 6 — Tiny imbalance, large voltage</h2>
      <div class="guide-step">
        <p>
          One of the most surprising facts about membrane potential is how
          <em>few</em> ions need to be out of balance. In a real neuron, roughly
          one ion in every ten thousand is unpaired. The other 9,999 exist as
          electrically neutral pairs close to their counter-ions and contribute
          nothing to V<sub>m</sub>.
        </p>
        <p>
          <strong>What changed from the previous version?</strong> You are keeping
          the same function and plot, then adding one extra calculation that starts
          with a million ions on each side and shifts only a tiny fraction.
        </p>
        <p>
          <strong>Before you run:</strong> keep using
          <code>membrane_potential.py</code>, replace it with the complete script
          below, and run <code>python membrane_potential.py</code>. Success looks
          like the Step 4 console output, the tiny-imbalance printout, and the same
          bar chart from Step 5.
        </p>
        <p><strong>Runnable checkpoint — full file so far</strong></p>
        <div class="code-block-wrap">
          <pre class="code-block">import matplotlib.pyplot as plt

def clamp(value, low, high):
    return max(low, min(high, value))

def membrane_potential(
    inside_pos,
    inside_neg,
    outside_pos,
    outside_neg,
    scale=80,
    surface_charge_scale=200,
):
    net_inside = inside_pos - inside_neg
    net_outside = outside_pos - outside_neg
    if surface_charge_scale <= 0:
        return 0.0
    imbalance = net_inside - net_outside
    V_m = scale * clamp(imbalance / surface_charge_scale, -1, 1)
    return V_m

# Scenario A: mostly positive inside
vm_A = membrane_potential(
    inside_pos=80,
    inside_neg=20,
    outside_pos=20,
    outside_neg=80,
)
print(f"Scenario A (mostly + inside):  {vm_A:.1f} mV")

# Scenario B: balanced
vm_B = membrane_potential(
    inside_pos=60,
    inside_neg=40,
    outside_pos=60,
    outside_neg=40,
)
print(f"Scenario B (balanced):         {vm_B:.1f} mV")

# Scenario C: more negative inside
vm_C = membrane_potential(
    inside_pos=0,
    inside_neg=100,
    outside_pos=100,
    outside_neg=0,
)
print(f"Scenario C (resting-like):     {vm_C:.1f} mV")

labels = [
    "Mostly +\ninside",
    "Balanced",
    "Resting-like\n(-80 mV)",
    "Mostly +\noutside",
]

vms = [
    membrane_potential(80, 20, 20, 80),
    membrane_potential(60, 40, 60, 40),
    membrane_potential(0, 100, 100, 0),
    membrane_potential(20, 80, 80, 20),
]

colours = ["steelblue" if v >= 0 else "tomato" for v in vms]

plt.figure(figsize=(8, 4))
plt.bar(labels, vms, color=colours, edgecolor="black")
plt.axhline(0, color="black", linewidth=0.8)
plt.ylabel("Membrane potential (mV)")
plt.title("V_m for different charge configurations")
plt.tight_layout()

# Start with 1 000 000 of each ion type on each side: perfectly balanced
n = 1_000_000

# Move just 0.01% of ions to create an imbalance
imbalance = int(n * 0.0001)   # = 100 ions

vm_tiny = membrane_potential(
    inside_pos=n,
    inside_neg=n + imbalance,
    outside_pos=n + imbalance,
    outside_neg=n,
)
print(f"Imbalance of {imbalance} out of {n} ions per side")
print(f"V_m = {vm_tiny:.2f} mV")

plt.show()</pre>
        </div>
        <p><strong>Expected console output</strong></p>
        <div class="code-block-wrap">
          <pre class="code-block">Scenario A (mostly + inside):  48.0 mV
Scenario B (balanced):         0.0 mV
Scenario C (resting-like):     -80.0 mV
Imbalance of 100 out of 1000000 ions per side
V_m = -80.00 mV</pre>
        </div>
        <p>
          This result makes an important modelling point. In this teaching proxy,
          a left-right surface-charge difference of 200 reaches the full-scale
          limit of ±80 mV, so this example hits the negative cap. The qualitative
          lesson is the important one: a tiny fraction of ions can generate a large
          membrane voltage.
        </p>
        <p>
          With one million ions on each side, shifting just 100 ions (0.01%)
          already produces a measurable voltage. This has profound physiological
          consequences:
        </p>
        <ul>
          <li>
            The Na/K pump can maintain the resting potential while moving only a
            tiny fraction of the total ion population — it is energetically
            efficient.
          </li>
          <li>
            When an action potential fires and Na⁺ rushes in, the membrane
            depolarises very rapidly — only a tiny ion flux is needed to flip
            V<sub>m</sub> from −70 mV to +40 mV.
          </li>
          <li>
            After the action potential, the pump needs to correct only that tiny
            imbalance to restore the resting state. The bulk of ions are already
            in the right place.
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 7 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 7 — Explore the simulation</h2>
      <div class="guide-step">
        <p>
          Open the web simulation linked at the bottom of this page. You will
          see four sliders — one for each of the four ion counts (inside
          positive, inside negative, outside positive, outside negative) — and
          a live readout of V<sub>m</sub> that updates instantly as you drag.
        </p>
        <p>Work through these challenges:</p>
        <ul>
          <li>
            <strong>Maximum positive V<sub>m</sub>:</strong> Drag the sliders
            to produce the largest positive membrane potential possible. Which
            configuration achieves it?
          </li>
          <li>
            <strong>Resting potential:</strong> Aim for exactly −80 mV. What
            combination of ions achieves this? Is there more than one
            configuration that gives −80 mV?
          </li>
          <li>
            <strong>Zero voltage with unequal totals:</strong> Find a
            configuration where V<sub>m</sub> = 0 mV but the two sides do not
            have equal numbers of each ion — they just have equal
            <em>net</em> charge.
          </li>
          <li>
            <strong>Role of neutral pairs:</strong> Add the same number of
            positive and negative ions to one side, or to both sides. Does
            V<sub>m</sub> change? Use the formula from Step 3 to explain why.
          </li>
        </ul>
        <p>
          The simulation makes the formula tangible: you are literally dragging
          virtual charges across a membrane and watching the voltage respond
          in real time.
        </p>
      </div>
    </section>

    <!-- ── Step 8 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 8 — Check your understanding</h2>
      <div class="guide-step">
        <ul class="guided-questions">
          <li>
            A cell has 120 positive ions and 80 negative ions inside, and 80
            positive and 120 negative outside. Using
            <code>scale = 80</code> and <code>surface_charge_scale = 200</code>,
            what is V<sub>m</sub>? Show your working.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>
                  net_inside = 120 − 80 = 40.<br>
                  net_outside = 80 − 120 = −40.<br>
                  net_inside − net_outside = 40 − (−40) = 80.<br>
                  V<sub>m</sub> = 80 × 80 / 200 = <strong>+32 mV</strong>.
                  The inside has more net positive charge, so the membrane
                  potential is positive (the cell is slightly depolarised
                  relative to the extreme resting state).
                </p>
              </div>
            </details>
          </li>
          <li>
            If you add equal numbers of positive and negative ions to both
            sides, does V<sub>m</sub> change? Explain using the formula.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>
                  No, V<sub>m</sub> does not change. Adding equal
                  positive-negative pairs leaves
                  <code>net_inside</code> and <code>net_outside</code>
                  unchanged. The unpaired surface charge is therefore the
                  same, so V<sub>m</sub> stays the same. Neutral ion pairs
                  do not contribute to the membrane potential.
                </p>
              </div>
            </details>
          </li>
          <li>
            What does the <code>if surface_charge_scale &lt;= 0: return 0.0</code> guard clause
            prevent, and is the returned value physically reasonable?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>
                  It prevents an invalid scaling step: dividing by zero or a
                  negative surface-charge scale would make the teaching proxy
                  meaningless. Returning 0.0 is reasonable as a fallback
                  because the model should only produce a voltage when a valid
                  membrane-charge scale has been defined.
                </p>
              </div>
            </details>
          </li>
          <li>
            Why is membrane potential described as "inside relative to outside"
            rather than as a single absolute number?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>
                  Voltage is always a <em>difference</em> between two
                  reference points; it has no absolute meaning on its own. By
                  convention, neuroscientists define V<sub>m</sub> as the
                  electrical potential of the intracellular fluid minus that
                  of the extracellular fluid. A resting potential of −70 mV
                  means the inside is 70 mV more negative than the outside —
                  not that the cytoplasm has some cosmic absolute charge.
                </p>
              </div>
            </details>
          </li>
          <li>
            Approximately what fraction of ions needs to be unbalanced to
            generate a resting potential of around −70 mV, and why does this
            fraction matter physiologically?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>
                  Roughly one ion in ten thousand (about 0.01%) needs to be
                  unpaired. This matters because it means the cell does not
                  need to move large numbers of ions to establish or change
                  V<sub>m</sub>. A brief opening of a small cluster of sodium
                  channels is enough to produce the rapid voltage swing of an
                  action potential. It also means the Na/K pump can restore
                  the resting state very efficiently, since it only needs to
                  correct a tiny imbalance in the total ion population.
                </p>
              </div>
            </details>
          </li>
        </ul>
        <p style="margin-top: 16px;">
          When you are ready, open the interactive simulation to experiment with
          charge configurations and watch the membrane potential respond in real
          time.
        </p>
        <p>
          <a href="./inspect_emergent_membrane_potential_intro.html" class="inline-link">
            Open the Voltage as Charge Separation web simulation →
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
