import{a as i,i as s}from"./theme-BJJ86vkc.js";i();const o=document.querySelector("#app");o.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <a href="./">← Back to lessons</a>
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>

    <header class="page-head">
      <h1 class="landing-title">Lesson 3 — Permeability as Probability</h1>
      <p class="eyebrow">
        In Lesson 2, channel width controlled how quickly particles mixed. But real ion
        channels are not partially open — they are either fully open or fully closed.
        Permeability is not geometry: it is the <em>probability</em> that a crossing
        attempt succeeds. This lesson introduces that idea in code, and along the way
        you will write your first <em>function</em>.
      </p>
    </header>

    <!-- ── Step 1 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 1 — A more realistic channel</h2>
      <div class="guide-step">
        <p>
          In Lesson 2 the channel was a fixed gap in the wall. A particle aligned with
          the gap would always cross. Wider gap → more crossings → faster equilibration.
          That is the right intuition, but the mechanism is wrong for biology.
        </p>
        <p>
          Real ion channels are <strong>gated</strong>: a protein structure opens and
          closes on timescales of milliseconds. At any given moment the channel is either
          fully open (a particle can cross) or fully closed (no crossing, even if the
          particle is perfectly aligned). The <em>permeability</em> of a channel is not
          its physical width — it is how often it happens to be open.
        </p>
        <p>
          We can capture this with a single number: <strong>open probability</strong>
          <code>p</code> ∈ [0, 1]. Each time a particle attempts to cross, we draw a
          random number. If the draw falls below <code>p</code>, the channel is open and
          the crossing succeeds. Otherwise it is blocked.
        </p>
        <p>
          Start a new file called <code>permeability.py</code>.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation</pre>
        </div>
      </div>
    </section>

    <!-- ── Step 2 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 2 — <code>np.random.random()</code> as a gate</h2>
      <div class="guide-step">
        <p>
          <code>np.random.random(n)</code> returns an array of <code>n</code> values
          drawn uniformly from [0, 1). Each value is equally likely to be anywhere in
          that range. Compare the array to a threshold <code>p</code> and you get a
          boolean array that is True with probability <code>p</code>:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np

p = 0.3
gate = np.random.random(10) &lt; p
print(gate)   # roughly 3 of the 10 will be True</pre>
        </div>
        <p>
          Run this a few times. The exact number of True values varies, but it averages
          to <code>p × n</code>. This is the probabilistic gate: on any given attempt,
          a crossing succeeds with probability <code>p</code>.
        </p>
        <ul class="guided-questions">
          <li>
            If <code>p = 1.0</code>, what does <code>np.random.random(n) &lt; p</code> return?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>All True — every draw from [0, 1) is strictly less than 1.0, so
                every crossing attempt succeeds. The channel is always open.</p>
              </div>
            </details>
          </li>
          <li>
            If <code>p = 0.0</code>, what does it return?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>All False — no draw from [0, 1) is less than 0.0, so no crossing
                ever succeeds. The channel is always closed, making the membrane
                completely impermeable.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 3 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 3 — Add the probabilistic gate to the crossing check</h2>
      <div class="guide-step">
        <p>
          The crossing logic from Lesson 2 was:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">reflect = (trying_to_cross_left | trying_to_cross_right) &amp; ~in_channel</pre>
        </div>
        <p>
          That blocked every particle <em>not</em> in the channel. Now we keep the fixed
          channel gap as a geometric constraint (particles still need to be roughly
          aligned), but add a probability check for those that are aligned. A particle in
          the channel is only <em>allowed</em> through if a random draw clears the gate:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">channel_open = np.random.random(num_particles) &lt; permeability
allowed      = in_channel &amp; channel_open
reflect      = (trying_to_cross_left | trying_to_cross_right) &amp; ~allowed</pre>
        </div>
        <p>
          Compare the two versions. The only change is that <code>~in_channel</code>
          (block everyone outside the channel) has become <code>~allowed</code> (block
          everyone who is either outside the channel <em>or</em> inside the channel but
          whose gate happened to be closed this step).
        </p>
        <ul class="guided-questions">
          <li>
            Why do we keep the geometric channel gap (<code>in_channel</code>) at all?
            Could we just use <code>reflect = (trying_to_cross) &amp; ~channel_open</code>?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Removing <code>in_channel</code> would mean that particles hitting any
                part of the wall — not just the gap region — could also cross if their
                random draw happens to be below <code>p</code>. In the biological picture
                a channel is a physical pore located at a specific position; particles
                can only interact with it when they are in the right place. The geometric
                gap keeps the channel localised. (That said, for a very wide gap or high
                particle density the distinction matters less.)</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 4 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 4 — Writing your first function</h2>
      <div class="guide-step">
        <p>
          We want to run the simulation twice — once with low permeability and once with
          high — and compare them side by side. We could copy-paste the entire loop. But
          there is a better way: wrap the simulation in a <strong>function</strong>.
        </p>
        <p>
          A function is a named block of code that you can call as many times as you
          like, each time with different inputs. Define one with <code>def</code>:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">def function_name(parameter1, parameter2):
    # code that uses the parameters
    result = parameter1 + parameter2
    return result</pre>
        </div>
        <p>
          The <strong>parameters</strong> are the inputs the function expects. The
          <code>return</code> statement sends a value back to whoever called the function.
          Call it like this:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">answer = function_name(3, 4)   # answer is now 7</pre>
        </div>
        <ul class="guided-questions">
          <li>
            Why is copy-pasting the entire simulation loop a bad idea?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>If you later find a bug or want to change the physics, you have to
                fix it in every copy. With a function you fix it once. More copies also
                means more places to introduce new mistakes when editing. Functions
                enforce the principle of writing each piece of logic exactly once.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 5 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 5 — Wrap the simulation in a function</h2>
      <div class="guide-step">
        <p>
          Here is the full simulation wrapped into a function. <code>permeability</code>
          is the parameter — it is the only thing that will differ between our two runs.
          Everything else (box size, number of particles, step size) stays the same.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">T = 1000
dt = 1.0
t = np.arange(0, T, dt)
N = t.shape[0]

num_particles  = 100
box_width      = 100
box_height     = 60
wall_thickness = 4
left_wall      = -wall_thickness / 2
right_wall     =  wall_thickness / 2
channel_y_range = (-10, 10)

def simulate(permeability):
    x = np.zeros((N, num_particles))
    y = np.zeros((N, num_particles))
    x[0] = np.random.uniform(-box_width/2 + 1, 0, num_particles)
    y[0] = np.random.uniform(-box_height/2 + 1, box_height/2 - 1, num_particles)

    for i in range(1, N):
        dxdt  = np.random.normal(0.0, 0.3, num_particles)
        dydt  = np.random.normal(0.0, 0.3, num_particles)
        new_x = x[i-1] + dxdt * dt
        new_y = y[i-1] + dydt * dt

        new_y = np.clip(new_y, -box_height/2, box_height/2)

        trying_to_cross_left  = (x[i-1] &lt; left_wall)  &amp; (new_x &gt;= left_wall)
        trying_to_cross_right = (x[i-1] &gt; right_wall) &amp; (new_x &lt;= right_wall)
        in_channel   = (y[i-1] &gt;= channel_y_range[0]) &amp; (y[i-1] &lt;= channel_y_range[1])
        channel_open = np.random.random(num_particles) &lt; permeability
        allowed      = in_channel &amp; channel_open
        reflect      = (trying_to_cross_left | trying_to_cross_right) &amp; ~allowed

        new_x[reflect] = x[i-1][reflect]
        x[i] = new_x
        y[i] = new_y

    return x, y</pre>
        </div>
        <p>
          Notice that the shared parameters (<code>N</code>, <code>num_particles</code>,
          <code>box_width</code>, etc.) are defined <em>outside</em> the function.
          Because they are in the outer scope, the function can see them without them
          being passed as arguments. Only <code>permeability</code> varies, so only
          that is a parameter.
        </p>
        <ul class="guided-questions">
          <li>
            The function ends with <code>return x, y</code>. What does this return?
            How many values does it send back?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>It returns two arrays — <code>x</code> and <code>y</code> — packed
                together as a tuple. Python allows returning multiple values by separating
                them with a comma. The caller can unpack them with
                <code>x_result, y_result = simulate(p)</code>.</p>
              </div>
            </details>
          </li>
          <li>
            Why are <code>T</code>, <code>num_particles</code>, and the box dimensions
            defined outside the function rather than inside it?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>They are shared constants used by both simulation runs. Defining them
                outside means they are written once and both calls to <code>simulate</code>
                use the same values automatically. If they were inside the function they
                would be re-created on every call — redundant and harder to change
                consistently.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 6 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 6 — Call the function twice</h2>
      <div class="guide-step">
        <p>
          Run the simulation for both a low and a high permeability. Unpacking the
          return value looks like this:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">x_low,  y_low  = simulate(permeability=0.1)
x_high, y_high = simulate(permeability=0.9)</pre>
        </div>
        <p>
          Each call runs the full <code>N</code>-step loop independently, storing a
          complete trajectory. You now have four arrays: position histories for both
          runs.
        </p>
        <ul class="guided-questions">
          <li>
            What is the shape of <code>x_low</code>?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><code>(N, num_particles)</code> — i.e., <code>(1000, 100)</code>.
                Row <code>i</code> holds the x-positions of all 100 particles at
                time step <code>i</code>.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 7 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 7 — Side-by-side subplots</h2>
      <div class="guide-step">
        <p>
          Create a figure with two axes arranged side by side, one for each simulation:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

scat1 = ax1.scatter(x_low[0],  y_low[0],  s=10)
scat2 = ax2.scatter(x_high[0], y_high[0], s=10)

for ax in (ax1, ax2):
    ax.set_xlim(-box_width/2, box_width/2)
    ax.set_ylim(-box_height/2, box_height/2)
    ax.set_xticks([])
    ax.set_yticks([])

ax1.set_title("Low permeability  (p = 0.1)")
ax2.set_title("High permeability (p = 0.9)")

def draw_wall(ax):
    ax.plot([left_wall,  left_wall],  [-box_height/2, channel_y_range[0]], 'k-')
    ax.plot([left_wall,  left_wall],  [channel_y_range[1],  box_height/2], 'k-')
    ax.plot([right_wall, right_wall], [-box_height/2, channel_y_range[0]], 'k-')
    ax.plot([right_wall, right_wall], [channel_y_range[1],  box_height/2], 'k-')
    ax.axvspan(left_wall, right_wall, color='lightgray', alpha=0.3)

draw_wall(ax1)
draw_wall(ax2)</pre>
        </div>
        <p>
          <code>plt.subplots(1, 2)</code> creates one row of two axes. The tuple
          unpacking <code>(ax1, ax2)</code> gives you each axis as a separate variable.
          The <code>for ax in (ax1, ax2):</code> loop applies the same formatting to
          both axes without repeating each line twice.
        </p>
        <ul class="guided-questions">
          <li>
            What would <code>plt.subplots(2, 2)</code> produce?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>A 2×2 grid of four axes. The return value would be
                <code>fig, axes</code> where <code>axes</code> is a 2×2 numpy array
                of axis objects — you would access them as <code>axes[0, 0]</code>,
                <code>axes[0, 1]</code>, etc.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 8 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 8 — Animate both panels</h2>
      <div class="guide-step">
        <p>
          The update function now moves scatter plots in both panels:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">def update(frame):
    scat1.set_offsets(np.c_[x_low[frame],  y_low[frame]])
    scat2.set_offsets(np.c_[x_high[frame], y_high[frame]])
    return scat1, scat2

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("permeability.mp4", writer="ffmpeg", fps=30)
plt.show()</pre>
        </div>
        <p>
          Both panels play the same number of frames at the same speed — you are
          watching the same elapsed time unfold at two different permeabilities.
        </p>
      </div>
    </section>

    <!-- ── Step 9 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 9 — Observe and explore</h2>
      <div class="guide-step">
        <p>
          Run the simulation. Watch both panels. Then try these variations:
        </p>
        <ul>
          <li>
            Change to <code>simulate(permeability=0.01)</code> and
            <code>simulate(permeability=1.0)</code>. How extreme is the difference?
          </li>
          <li>
            Keep permeability the same in both panels but change
            <code>channel_y_range</code>: one narrow, one wide. How does geometric
            channel size compare to probabilistic permeability as a rate-control
            mechanism?
          </li>
          <li>
            What is the equilibrium state in both panels regardless of permeability?
          </li>
        </ul>
        <ul class="guided-questions">
          <li>
            Both panels eventually reach the same equilibrium (roughly 50 particles on
            each side). Why doesn't permeability affect the equilibrium, only the rate?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Equilibrium is determined by thermodynamics, not kinetics. At
                equilibrium, the rate of crossings from left to right equals the rate
                from right to left. A lower permeability reduces <em>both</em> rates
                equally — it doesn't favour one direction. So the same balance point is
                reached, just more slowly. Permeability is a kinetic parameter, not a
                thermodynamic one.</p>
              </div>
            </details>
          </li>
          <li>
            In this model, at each time step every particle in the channel independently
            draws a random number. What does this say about whether channels have
            memory?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The channel has no memory — each draw is independent of all previous
                draws. This is the Markov property: the outcome at step <em>i</em>
                depends only on the current state, not on history. Real ion channels
                are also well described as Markov processes on short timescales.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 10 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 10 — Check your understanding</h2>
      <div class="guide-step">
        <p class="arc-description">Answer these in writing before moving to Lesson 4.</p>
        <ul class="guided-questions">
          <li>
            What is a function in Python? What are its three key parts?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>A function is a named, reusable block of code. Its three key parts
                are: (1) the <strong>name</strong>, which lets you call it; (2) the
                <strong>parameters</strong>, which are the inputs it accepts (listed
                inside the parentheses after <code>def</code>); and (3) the
                <strong>return value</strong>, which is the output it sends back when
                called (specified with <code>return</code>).</p>
              </div>
            </details>
          </li>
          <li>
            How does <code>np.random.random(n) &lt; p</code> implement a probabilistic
            gate?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><code>np.random.random(n)</code> draws <code>n</code> values
                uniformly from [0, 1). Comparing each to <code>p</code> gives True
                for the fraction of values that fall below <code>p</code>. On average,
                a fraction <code>p</code> of the array is True — so each element is
                independently True with probability <code>p</code>. This is the gate:
                a particle "passes" when its element is True.</p>
              </div>
            </details>
          </li>
          <li>
            Permeability controls the <em>rate</em> of equilibration but not the
            <em>equilibrium</em> itself. In one sentence, explain why.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Permeability scales both the left-to-right and right-to-left
                crossing rates by the same factor, so the balance point where net flux
                is zero is unchanged — only how quickly that balance is reached.</p>
              </div>
            </details>
          </li>
          <li>
            What is the Markov property, and why does this simulation have it?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The Markov property means the next state depends only on the current
                state, not on history. This simulation has it because each random step
                and each gate draw is independent of all previous steps — the particle
                has no memory of where it has been or whether its previous crossing
                attempts succeeded or failed.</p>
              </div>
            </details>
          </li>
          <li>
            If you set <code>permeability = 1.0</code>, does the simulation reduce
            exactly to Lesson 2 with a very wide channel? What is the same and what
            is different?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>With <code>p = 1.0</code>, every particle in the channel
                is always allowed through — <code>channel_open</code> is all True, so
                <code>allowed = in_channel</code> exactly. This is equivalent to
                Lesson 2's logic, but the geometric channel gap is still present. A
                very wide channel in Lesson 2 also allowed nearly every crossing, so
                the outcomes are similar but the mechanisms differ: here the limit is
                probabilistic (open probability → 1), there it was geometric (gap
                → full wall height).</p>
              </div>
            </details>
          </li>
        </ul>
        <p style="margin-top: 16px;">
          When you are done, explore the interactive version — adjust open probability
          for each ion type independently and watch how permeability controls the
          mixing rate in real time.
        </p>
        <p>
          <a href="./inspect_diffusion_selective_permeability_rate.html" class="inline-link">
            Open the Permeability as Probability web simulation →
          </a>
        </p>
      </div>
    </section>

  </div>
`;s(document.querySelector("#theme-toggle"));document.querySelectorAll(".code-block-wrap").forEach(t=>{const a=t.querySelector("pre");if(!a)return;const e=document.createElement("button");e.className="copy-btn",e.textContent="Copy",e.addEventListener("click",()=>{navigator.clipboard.writeText(a.innerText).then(()=>{e.textContent="Copied!",setTimeout(()=>{e.textContent="Copy"},1800)})}),t.appendChild(e)});
