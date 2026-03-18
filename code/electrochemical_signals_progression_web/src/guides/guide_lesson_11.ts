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
      <h1 class="landing-title">Lesson 11 — Macro vs Micro Currents</h1>
      <p class="eyebrow">
        When a physiologist measures an ion current through a cell membrane with an
        electrode, the trace looks smooth and continuous — like water flowing through
        a pipe. But the membrane is studded with thousands of discrete protein
        channels that are either fully open or fully closed, never anything in between.
        This lesson bridges the gap: you will simulate individual channels switching
        stochastically and watch how their sum produces the smooth macroscopic signal
        seen in real recordings.
      </p>
    </header>

    <!-- ── Step 1 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 1 — The mystery of smooth currents</h2>
      <div class="guide-step">
        <p>
          Macroscopic ion currents — the kind recorded with a sharp electrode inside
          a cell or with a whole-cell patch clamp — look like smooth, graded signals.
          Turn up the stimulus and the current rises proportionally. Turn it down and
          the current falls smoothly back.
        </p>
        <p>
          This smooth appearance suggests a continuous underlying mechanism: more
          driving force, more current, in a perfectly proportional way. It is
          tempting to imagine the membrane as a simple resistor, with conductance
          rising and falling continuously.
        </p>
        <p>
          But the membrane is not a resistor — it is a collection of discrete protein
          pores, each of which is either open (conducting) or closed (insulating).
          How can the sum of thousands of binary switches look smooth?
        </p>
        <p>
          The answer lies in probability and the law of large numbers. This lesson
          builds that answer from the ground up, starting with a single channel.
        </p>
        <ul class="guided-questions">
          <li>
            Before reading further: if each channel is either fully open or fully
            closed, what would you expect a recording of just <em>one</em> channel
            to look like over time?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>A single channel trace should show a series of rectangular pulses:
                the current is either at a fixed non-zero level (open) or at zero
                (closed), with abrupt transitions between the two states. There are
                no intermediate levels. This is exactly what patch-clamp recordings
                of single channels show, confirming the binary nature of channel
                gating.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 2 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 2 — Single-channel recordings</h2>
      <div class="guide-step">
        <p>
          In the 1970s, Erwin Neher and Bert Sakmann developed the
          <strong>patch-clamp technique</strong>: press a fire-polished glass
          pipette against a neuron membrane and apply gentle suction to form a
          gigaohm seal. The tiny patch of membrane inside the pipette tip contains
          just one or a few channels. Their current can be measured directly.
        </p>
        <p>
          The recordings are unambiguous: the current jumps between two levels —
          zero (closed) and a fixed non-zero level (open). There is no graded
          in-between. The channel is a binary switch.
        </p>
        <p>
          Key observations from real single-channel recordings:
        </p>
        <ul>
          <li>The open-state current is fixed (it depends on the single-channel conductance and driving force, not on the gating mechanism).</li>
          <li>The channel spends variable amounts of time in each state before switching.</li>
          <li>Switching appears random: you cannot predict exactly when the next transition will occur.</li>
          <li>The <em>average</em> dwell time in each state is consistent and depends on the channel type and conditions.</li>
        </ul>
        <p>
          These properties suggest a statistical model. In the web simulation for this
          lesson you can see individual channel traces stacked vertically, each showing
          its binary open/closed history.
        </p>
      </div>
    </section>

    <!-- ── Step 3 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 3 — Markov gating: one channel</h2>
      <div class="guide-step">
        <p>
          A <strong>Markov process</strong> is a system that changes state randomly,
          where the probability of the next state depends <em>only</em> on the current
          state — not on any history of past states. This is called the
          <strong>memoryless property</strong>.
        </p>
        <p>
          Ion channels are well described as two-state Markov processes. At each
          timestep:
        </p>
        <ul>
          <li>If the channel is <strong>closed</strong>, it opens with probability <code>p_open</code>.</li>
          <li>If the channel is <strong>open</strong>, it closes with probability <code>p_close</code>.</li>
        </ul>
        <p>
          A channel that has been open for ten steps is no more likely to close than
          one that just opened — each step is an independent coin flip. This matches
          single-channel recordings remarkably well.
        </p>
        <p>
          Simulate one channel over 500 timesteps:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np
import matplotlib.pyplot as plt

num_steps = 500
p_open  = 0.05   # probability of opening each step (if currently closed)
p_close = 0.10   # probability of closing each step (if currently open)

state = np.zeros(num_steps, dtype=int)   # 0 = closed, 1 = open
state[0] = 0   # start closed

for i in range(1, num_steps):
    if state[i-1] == 0:
        state[i] = 1 if np.random.random() &lt; p_open  else 0
    else:
        state[i] = 0 if np.random.random() &lt; p_close else 1

plt.figure(figsize=(10, 2))
plt.plot(state, drawstyle='steps-post')
plt.xlabel('Time step')
plt.ylabel('State')
plt.yticks([0, 1], ['Closed', 'Open'])
plt.title('Single channel — Markov gating')
plt.tight_layout()
plt.show()</pre>
        </div>
        <p>
          Run the script several times. Each run produces a different trace because
          the transitions are random, but the statistical character (typical burst
          length, typical closed interval) is the same each time.
        </p>
        <ul class="guided-questions">
          <li>
            The code uses <code>np.random.random() &lt; p_open</code> to decide
            whether a closed channel opens. Explain in words what this test is doing.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><code>np.random.random()</code> draws a number uniformly at random
                from 0 to 1. The probability that this number is less than
                <code>p_open</code> is exactly <code>p_open</code>. So the test
                returns <code>True</code> with probability <code>p_open</code> and
                <code>False</code> with probability 1 − <code>p_open</code>. This
                is a standard way to implement a biased coin flip in code.</p>
              </div>
            </details>
          </li>
          <li>
            What does it mean for ion channel gating to be "memoryless"? Is this
            biologically plausible, and why might it be a good approximation?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Memoryless means the probability of the channel switching state
                at the next timestep does not depend on how long it has already been
                in its current state. Biologically, this is a good approximation
                because each transition is driven by a conformational change that
                depends on the current thermal energy of the protein — not on how
                many previous steps it has gone through. Single-channel recordings
                confirm this: the distribution of open-dwell times is approximately
                exponential, which is the signature of a memoryless (Markov)
                process.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 4 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 4 — Simulate N channels</h2>
      <div class="guide-step">
        <p>
          Now extend the simulation to <code>num_channels</code> independent channels.
          Each channel follows the same Markov rules, but the random draws are
          independent — one channel's state has no effect on any other. Store every
          channel's state in a 2-D array where rows are timesteps and columns are
          channels.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np
import matplotlib.pyplot as plt

num_steps    = 500
num_channels = 10
p_open  = 0.05
p_close = 0.10

# states[i, c] = state of channel c at timestep i  (0=closed, 1=open)
states = np.zeros((num_steps, num_channels), dtype=int)

for c in range(num_channels):
    states[0, c] = 0   # all channels start closed
    for i in range(1, num_steps):
        if states[i-1, c] == 0:
            states[i, c] = 1 if np.random.random() &lt; p_open  else 0
        else:
            states[i, c] = 0 if np.random.random() &lt; p_close else 1

# ── plot: individual channels + macroscopic sum ──────────────────────
fig, axes = plt.subplots(num_channels + 1, 1, figsize=(10, 8), sharex=True)

for c in range(num_channels):
    axes[c].plot(states[:, c], drawstyle='steps-post', lw=0.8)
    axes[c].set_ylim(-0.2, 1.2)
    axes[c].set_yticks([0, 1])
    axes[c].set_yticklabels(['C', 'O'], fontsize=6)

macro = states.sum(axis=1)   # total number of open channels at each step
axes[-1].plot(macro)
axes[-1].set_xlabel('Time step')
axes[-1].set_ylabel('Open channels')
axes[-1].set_title('Macroscopic sum')

plt.tight_layout()
plt.show()</pre>
        </div>
        <p>
          The top rows show binary individual traces. The bottom panel shows their
          sum — the total number of open channels at each timestep. Even with only
          10 channels you can see that the sum is less jagged than any individual
          trace.
        </p>
        <ul class="guided-questions">
          <li>
            The line <code>macro = states.sum(axis=1)</code> sums along axis 1.
            What does <code>axis=1</code> mean here, and why is it the correct axis
            to sum over?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><code>states</code> has shape (num_steps, num_channels). Axis 0
                runs over timesteps; axis 1 runs over channels. Summing over axis 1
                adds up all channels at each timestep, giving an array of shape
                (num_steps,) — one value per timestep representing the total number
                of open channels. Summing over axis 0 instead would give the total
                number of open events per channel across the whole simulation, which
                is not what we want for the macroscopic current trace.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 5 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 5 — Law of large numbers</h2>
      <div class="guide-step">
        <p>
          Change <code>num_channels</code> and re-run the simulation. Try 1, 5, 20,
          and 100. Watch what happens to the macroscopic sum trace each time.
        </p>
        <p>
          With N independent binary channels, each with open probability
          p = p_open / (p_open + p_close), the expected number of open channels at
          any timestep is:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">mean_open = N * p_open / (p_open + p_close)</pre>
        </div>
        <p>
          The standard deviation of the number of open channels (how much the trace
          fluctuates around the mean) scales as:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">std_open = np.sqrt(N * p * (1 - p))</pre>
        </div>
        <p>
          The relative noise — the fluctuations as a fraction of the mean — is:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">relative_noise = std_open / mean_open  ∝  1 / sqrt(N)</pre>
        </div>
        <p>
          Double the number of channels, and the relative noise drops by a factor of
          √2. With 10,000 channels (typical for a small patch of real membrane),
          relative noise is only 1%. The macroscopic trace looks smooth even though
          every individual channel is binary.
        </p>
        <ul class="guided-questions">
          <li>
            If you increase <code>num_channels</code> from 10 to 1000, by roughly
            what factor does the relative noise in the macroscopic trace decrease?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Relative noise ∝ 1/√N. Going from N = 10 to N = 1000 multiplies
                N by 100, so √N increases by a factor of 10. Relative noise therefore
                decreases by a factor of 10. The macro trace with 1000 channels is
                10× smoother (as a fraction of its mean) than the trace with 10
                channels.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 6 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 6 — Mean open probability</h2>
      <div class="guide-step">
        <p>
          For a two-state Markov channel, the long-run fraction of time spent in the
          open state can be derived analytically. At steady state, the rate of
          closed → open transitions must equal the rate of open → closed transitions:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">p_open * (fraction closed) = p_close * (fraction open)</pre>
        </div>
        <p>
          Let the open fraction be P<sub>O</sub>. Then (1 − P<sub>O</sub>) is the
          closed fraction. Solving:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">p_open * (1 - P_O) = p_close * P_O

P_O = p_open / (p_open + p_close)</pre>
        </div>
        <p>
          Verify this against the simulation:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np

num_steps = 5000   # long run for accurate statistics
p_open  = 0.05
p_close = 0.10

state = np.zeros(num_steps, dtype=int)
for i in range(1, num_steps):
    if state[i-1] == 0:
        state[i] = 1 if np.random.random() &lt; p_open  else 0
    else:
        state[i] = 0 if np.random.random() &lt; p_close else 1

P_O_theory    = p_open / (p_open + p_close)
P_O_simulated = state.mean()

print(f"Theoretical P_O = {P_O_theory:.3f}")
print(f"Simulated   P_O = {P_O_simulated:.3f}")</pre>
        </div>
        <p>
          The two numbers should agree closely for a long run (<code>num_steps =
          5000</code> or more). With shorter runs, random variation is larger.
        </p>
        <ul class="guided-questions">
          <li>
            Using the formula P<sub>O</sub> = p_open / (p_open + p_close), what
            happens to the open probability as <code>p_close</code> approaches zero?
            What does this mean physically?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>As p_close → 0, P<sub>O</sub> → p_open / (p_open + 0) = 1. The
                channel almost never closes once it opens. Physically, this describes
                a channel locked in the open state — one that conducts almost
                continuously. Some toxins and mutations produce this effect
                (constitutively open channels), which can be lethal because the ion
                gradients collapse.</p>
              </div>
            </details>
          </li>
          <li>
            The formula P<sub>O</sub> = p_open / (p_open + p_close) is derived from
            a <em>balance condition</em>. What does it mean physically that the
            opening rate must equal the closing rate at steady state?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>At steady state the fraction of channels in each state is
                constant over time — not because individual channels stop switching,
                but because the rate of new channels entering the open state exactly
                equals the rate of channels leaving it. This dynamic balance is
                analogous to a chemical equilibrium: molecules continuously interconvert
                but the concentrations of each species remain stable. For Markov channels,
                it means the open probability is a fixed number even though any
                individual channel is constantly flickering.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 7 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 7 — From micro to macro</h2>
      <div class="guide-step">
        <p>
          You now have all the pieces of the micro-to-macro picture:
        </p>
        <ol>
          <li>Each channel is binary — open or closed, never partial.</li>
          <li>Each channel gates stochastically according to a Markov rule: open with probability <code>p_open</code> per step, close with probability <code>p_close</code> per step.</li>
          <li>The long-run open probability is P<sub>O</sub> = p_open / (p_open + p_close).</li>
          <li>The macroscopic conductance of a membrane patch is N × P<sub>O</sub> × γ, where N is the number of channels and γ is the single-channel conductance.</li>
          <li>Relative fluctuations in the macroscopic signal scale as 1/√N, so large N produces a smooth-looking trace.</li>
        </ol>
        <p>
          This framework connects the molecular world (individual channel proteins
          undergoing conformational changes) to the cellular world (smooth conductance
          changes recorded by an electrode).
        </p>
        <p>
          Open the web simulation linked below. It shows individual channel traces
          stacked vertically, with the macroscopic sum displayed at the bottom. Vary
          the number of channels and the transition probabilities. Watch how the macro
          trace smooths out as N increases, and how changing P<sub>O</sub> shifts the
          mean level of the macroscopic current.
        </p>
        <ul class="guided-questions">
          <li>
            If you double N but halve P<sub>O</sub> (by increasing p_close), what
            happens to the mean macroscopic current, and what happens to its
            variability?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Mean open channels = N × P<sub>O</sub>. Doubling N and halving
                P<sub>O</sub> leaves the product unchanged, so the mean macroscopic
                current is the same. However, the absolute variability (standard
                deviation) scales as √(N × P<sub>O</sub> × (1 − P<sub>O</sub>)).
                With double N and half P<sub>O</sub>, the argument changes, and the
                standard deviation changes slightly depending on the exact values.
                But the relative noise (std / mean) falls as 1/√N, so it decreases.
                More channels with lower open probability produces the same mean
                current with less noise — an important principle in membrane
                biophysics.</p>
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
            What does it mean for an ion channel to be "binary"? What evidence from
            real experiments supports this view?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Binary means the channel exists in exactly two conductance
                states — fully open or fully closed — with no intermediate values.
                The evidence comes from single-channel patch-clamp recordings, which
                show current traces that jump between two discrete levels (zero and a
                fixed non-zero current). The transitions are abrupt, and the current
                in the open state is constant (fixed by the single-channel conductance
                and driving force). This is seen across hundreds of channel types in
                many cell types and species.</p>
              </div>
            </details>
          </li>
          <li>
            Why is the Markov model a good description of ion channel gating? What
            key property does it capture?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The Markov model captures the <em>memoryless</em> nature of
                channel gating: the probability of switching state depends only on
                the current state, not on how long the channel has been in that state
                or any earlier history. This is validated experimentally because the
                distribution of open-dwell times is exponential, which is the
                hallmark of a memoryless (geometrically distributed) process. The
                model also correctly predicts the steady-state open probability
                P<sub>O</sub> = p_open / (p_open + p_close).</p>
              </div>
            </details>
          </li>
          <li>
            A student sets <code>p_open = 0.5</code> and <code>p_close = 0.5</code>.
            What is the theoretical P<sub>O</sub>? What does the individual channel
            trace look like?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>P<sub>O</sub> = 0.5 / (0.5 + 0.5) = 0.5. The channel is open
                exactly half the time on average. Because both p_open and p_close are
                large (0.5), the channel switches state very rapidly — about every
                two steps on average. The individual trace will flicker rapidly
                between 0 and 1, with very short dwell times in each state. The
                macro trace (with many such channels) would be nearly flat at N/2
                open channels with small fluctuations.</p>
              </div>
            </details>
          </li>
          <li>
            In the simulation, channels are independent — one channel's state does not
            influence another. Is this realistic? What would happen if channels were
            correlated?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Independence is a good first approximation for channels separated
                by distances larger than their interaction range. In practice, some
                channel types cluster and can influence each other (e.g., via local
                changes in voltage or Ca²⁺ concentration). If channels were positively
                correlated — tending to open and close together — the macroscopic
                noise would be larger than the 1/√N prediction (because groups of
                channels count as fewer independent switches). Negative correlation
                would reduce noise below the 1/√N prediction. Independence gives the
                baseline 1/√N scaling.</p>
              </div>
            </details>
          </li>
          <li>
            Whole-cell patch-clamp records the sum of all channels in the membrane.
            A single-channel recording isolates one channel. If you know the
            macroscopic conductance, the single-channel conductance γ, and the
            open probability P<sub>O</sub>, how would you estimate the number of
            channels N?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The macroscopic conductance G = N × P<sub>O</sub> × γ. Rearranging:
                N = G / (P<sub>O</sub> × γ). You measure G from the whole-cell
                recording (G = I / V), measure γ from the single-channel recording
                (the step size in the patch-clamp trace), and measure P<sub>O</sub>
                from the fraction of time the channel is open in the single-channel
                record. Dividing gives an estimate of N. This approach has been used
                to count channel densities in real neurons.</p>
              </div>
            </details>
          </li>
        </ul>
        <p style="margin-top: 16px;">
          When you are ready, open the interactive simulation to see individual
          Markov channels gating in real time and watch their sum produce a
          macroscopic current.
        </p>
        <p>
          <a href="../inspect_emergent_nak_discrete_markov_channels.html" class="inline-link">
            Open the Discrete Markov Channels web simulation →
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
