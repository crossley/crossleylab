import '../style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app root');

app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <a href="./">← Back to lessons</a>
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>

    <header class="page-head">
      <h1 class="landing-title">Lesson 2 — Diffusion Through a Membrane Channel</h1>
      <p class="eyebrow">
        You already know how to simulate a random walk. Now add a wall. Then add a gap.
        Then add a rule: particles can only cross through the gap. That rule is a
        <em>membrane channel</em> — and writing it in code means learning boolean arrays.
      </p>
    </header>

    <!-- ── Step 1 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 1 — Why does a membrane matter?</h2>
      <div class="guide-step">
        <p>
          In Lesson 1, particles moved freely through open space and spread out evenly.
          Real cells cannot afford that. A neuron must keep sodium (Na⁺) mostly outside and
          potassium (K⁺) mostly inside. If ions mixed freely, those gradients would vanish
          and the cell would lose its ability to signal.
        </p>
        <p>
          The solution is a <strong>plasma membrane</strong> — a thin lipid bilayer that ions
          cannot cross on their own. The only way through is via a <strong>protein channel</strong>,
          a narrow pore embedded in the membrane.
        </p>
        <p>
          In this lesson you will simulate exactly that: a box divided by a wall, with a single
          gap (the channel) that particles may pass through.
        </p>
        <p>
          Start a new file called <code>diffusion_through_channel.py</code>.
          Copy the import block and parameters from Lesson 1 — we will modify them.
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
      <h2 class="section-title">Step 2 — Set up the box and starting positions</h2>
      <div class="guide-step">
        <p>
          The simulation lives inside a rectangular box. Define its size, then place all
          particles randomly in the <strong>left half</strong> only. We want to watch them
          spread to the right through the channel.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">T = 1000
dt = 1.0
t = np.arange(0, T, dt)
N = t.shape[0]

num_particles = 100
box_width = 100
box_height = 60

x = np.zeros((N, num_particles))
y = np.zeros((N, num_particles))

x[0] = np.random.uniform(low=-box_width/2 + 1, high=0, size=num_particles)
y[0] = np.random.uniform(low=-box_height/2 + 1, high=box_height/2 - 1, size=num_particles)</pre>
        </div>
        <p>
          Notice <code>np.random.uniform</code> instead of <code>np.random.normal</code>.
          Uniform draws a value equally likely anywhere between <code>low</code> and
          <code>high</code>. We want particles spread evenly across the left compartment —
          not clustered near the centre.
        </p>
        <ul class="guided-questions">
          <li>
            Why do we set <code>high=0</code> for the x initial positions?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>x = 0 is the centre of the box — the location of the membrane wall.
                Setting <code>high=0</code> means all particles start strictly in the
                left half, so we can watch them diffuse across to the right.</p>
              </div>
            </details>
          </li>
          <li>
            Why use <code>np.random.uniform</code> here but <code>np.random.normal</code>
            for the random steps?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Uniform is appropriate for an initial position: we want each location
                in the compartment to be equally likely, with hard cut-offs at the walls.
                Normal is appropriate for a random <em>step</em>: small steps are more
                likely than large ones, which matches the physics of Brownian kicks from
                surrounding molecules.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 3 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 3 — Define the wall and channel</h2>
      <div class="guide-step">
        <p>
          The membrane sits at x = 0 and has a small but nonzero thickness. Define the
          wall boundaries and the vertical range of the channel gap:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">wall_thickness = 4
left_wall  = -wall_thickness / 2
right_wall =  wall_thickness / 2

channel_y_range = (-10, 10)</pre>
        </div>
        <p>
          The wall occupies x ∈ [<code>left_wall</code>, <code>right_wall</code>].
          The channel is the gap at the centre: any particle whose y-position falls
          between −10 and +10 is allowed to cross; all others are blocked.
        </p>
        <ul class="guided-questions">
          <li>
            If <code>box_height = 60</code> and <code>channel_y_range = (-10, 10)</code>,
            what fraction of the wall height is open?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The channel spans 20 units out of a total wall height of 60 units,
                so one third of the wall is open.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 4 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 4 — Update loop: start without the wall</h2>
      <div class="guide-step">
        <p>
          Write the loop exactly as you did in Lesson 1 — just the random step, no wall logic yet:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">for i in range(1, N):
    dxdt = np.random.normal(0.0, 0.3, num_particles)
    dydt = np.random.normal(0.0, 0.3, num_particles)

    new_x = x[i-1] + dxdt * dt
    new_y = y[i-1] + dydt * dt

    x[i] = new_x
    y[i] = new_y</pre>
        </div>
        <p>
          Run it (or picture what happens): particles drift in all directions and pass
          through x = 0 freely. The wall does not yet exist in the code, so it has no
          effect in the simulation.
        </p>
        <ul class="guided-questions">
          <li>
            We defined <code>left_wall</code> and <code>right_wall</code> above but haven't
            used them anywhere in the loop. Does Python complain? What does this tell you
            about the relationship between defining a variable and having it affect the
            simulation?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Python does not complain — the variables exist in memory but are simply
                unused. A variable only affects a simulation if it appears in a computation.
                Defining <code>left_wall</code> without ever comparing particle positions
                to it is like drawing a wall on a blueprint that you then never build.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 5 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 5 — Box boundaries with <code>np.clip</code></h2>
      <div class="guide-step">
        <p>
          Before adding the wall, handle the top and bottom boundaries so particles
          don't escape the box. Update the loop:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">    new_y = np.clip(new_y, -box_height/2, box_height/2)</pre>
        </div>
        <p>
          <code>np.clip(arr, a_min, a_max)</code> replaces every value below <code>a_min</code>
          with <code>a_min</code> and every value above <code>a_max</code> with <code>a_max</code>.
          Any particle that would have stepped outside the top or bottom is snapped back to
          the boundary — a hard reflecting wall.
        </p>
        <p>
          Add this line between computing <code>new_y</code> and assigning <code>y[i]</code>.
        </p>
        <ul class="guided-questions">
          <li>
            Why do we clip <code>new_y</code> but not <code>new_x</code>?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The left and right x-boundaries will be handled differently — by the
                wall logic we are about to add. The top and bottom y-boundaries are
                simple hard reflections with no channel gap, so <code>np.clip</code>
                is the right tool there. If we clipped x, we would prevent particles
                from reaching the wall at all.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 6 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 6 — Boolean arrays: "is a particle trying to cross?"</h2>
      <div class="guide-step">
        <p>
          This is the key new idea of the lesson. We need to detect, for every particle
          simultaneously, whether it is attempting to step through the wall.
        </p>
        <p>
          A particle on the <strong>left</strong> is trying to cross if its current x is
          left of <code>left_wall</code> and its proposed new x is to the right of it:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">    trying_to_cross_left  = (x[i-1] &lt; left_wall)  &amp; (new_x &gt;= left_wall)
    trying_to_cross_right = (x[i-1] &gt; right_wall) &amp; (new_x &lt;= right_wall)</pre>
        </div>
        <p>
          Each of these is a <strong>boolean array</strong> — an array of <code>True</code>
          / <code>False</code> values, one per particle. The <code>&amp;</code> operator
          combines them element-by-element: a particle is flagged only if <em>both</em>
          conditions are true simultaneously.
        </p>
        <p>
          To understand what this looks like, try running this small example in a fresh script:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np
a = np.array([1, 3, 5, 7])
print(a &lt; 4)         # [True, True, False, False]
print(a &gt; 2)         # [False, True, True, True]
print((a &lt; 4) &amp; (a &gt; 2))  # [False, True, False, False]</pre>
        </div>
        <ul class="guided-questions">
          <li>
            Why do we check both <code>x[i-1] &lt; left_wall</code> <em>and</em>
            <code>new_x &gt;= left_wall</code>? Wouldn't just checking <code>new_x</code>
            be enough?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Checking only <code>new_x &gt;= left_wall</code> would flag particles
                already on the right side of the wall — they are not trying to cross,
                they are already there. By also requiring <code>x[i-1] &lt; left_wall</code>
                we restrict the flag to particles that were on the left and are now
                proposing to move right across the boundary.</p>
              </div>
            </details>
          </li>
          <li>
            What does <code>trying_to_cross_left</code> look like when no particles are
            near the wall?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>It is an array of all <code>False</code> — every element is False
                because no particle satisfies both conditions at once. This is fine:
                subsequent steps that use this array will simply do nothing.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 7 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 7 — "Is the particle in the channel?"</h2>
      <div class="guide-step">
        <p>
          A crossing attempt is only <em>allowed</em> if the particle is aligned with the
          channel gap. Check the particle's <strong>current</strong> y-position:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">    in_channel = (y[i-1] &gt;= channel_y_range[0]) &amp; (y[i-1] &lt;= channel_y_range[1])</pre>
        </div>
        <p>
          Again a boolean array, one element per particle. A particle is <code>True</code>
          here only if its y falls within the channel opening.
        </p>
        <ul class="guided-questions">
          <li>
            Why do we use <code>y[i-1]</code> (the current position) rather than
            <code>new_y</code> (the proposed position) for this check?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>We want to know where the particle <em>is</em> when it hits the wall,
                not where it would end up after the step. Using <code>y[i-1]</code>
                gives the particle's position at the moment of the crossing attempt,
                which is the physically correct location to test against the channel gap.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 8 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 8 — Combine and reflect blocked particles</h2>
      <div class="guide-step">
        <p>
          A particle should be <strong>blocked</strong> if it is trying to cross
          <em>and</em> it is <strong>not</strong> in the channel. Then, for all blocked
          particles, undo their x-step:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">    reflect = (trying_to_cross_left | trying_to_cross_right) &amp; ~in_channel
    new_x[reflect] = x[i-1][reflect]</pre>
        </div>
        <p>
          Three new operators here:
        </p>
        <ul>
          <li><code>|</code> — element-wise OR: True if either side is true</li>
          <li><code>~</code> — element-wise NOT: flips True to False and vice versa</li>
          <li><code>new_x[reflect]</code> — <strong>boolean indexing</strong>: selects only the
          elements where <code>reflect</code> is True, and assigns back the old position</li>
        </ul>
        <p>
          The last line is the actual "reflect": we overwrite <code>new_x</code> for blocked
          particles with their current (pre-step) x, so they effectively don't move in x.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block"># Full loop so far
for i in range(1, N):
    dxdt = np.random.normal(0.0, 0.3, num_particles)
    dydt = np.random.normal(0.0, 0.3, num_particles)

    new_x = x[i-1] + dxdt * dt
    new_y = y[i-1] + dydt * dt

    new_y = np.clip(new_y, -box_height/2, box_height/2)

    trying_to_cross_left  = (x[i-1] &lt; left_wall)  &amp; (new_x &gt;= left_wall)
    trying_to_cross_right = (x[i-1] &gt; right_wall) &amp; (new_x &lt;= right_wall)
    in_channel = (y[i-1] &gt;= channel_y_range[0]) &amp; (y[i-1] &lt;= channel_y_range[1])
    reflect = (trying_to_cross_left | trying_to_cross_right) &amp; ~in_channel
    new_x[reflect] = x[i-1][reflect]

    x[i] = new_x
    y[i] = new_y</pre>
        </div>
        <ul class="guided-questions">
          <li>
            What would happen if you wrote <code>reflect = (trying_to_cross_left | trying_to_cross_right)</code>
            without the <code>&amp; ~in_channel</code> part?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Every particle attempting to cross would be reflected — including those
                aligned with the channel gap. The membrane would become completely
                impermeable: no particle would ever cross, regardless of where the
                channel is. The <code>&amp; ~in_channel</code> is exactly the part that
                creates the opening.</p>
              </div>
            </details>
          </li>
          <li>
            Explain in plain English what <code>new_x[reflect] = x[i-1][reflect]</code> does.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>It selects the particles that should be blocked (those where
                <code>reflect</code> is True) and overwrites their proposed new
                x-position with their current x-position. The net effect is that
                those particles do not move in x this time step — they are stopped
                at the wall.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 9 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 9 — Draw the wall</h2>
      <div class="guide-step">
        <p>
          Set up the figure and add a helper function that draws the membrane geometry:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">fig, ax = plt.subplots()
scat = ax.scatter(x[0], y[0], s=10)
ax.set_xlim(-box_width/2, box_width/2)
ax.set_ylim(-box_height/2, box_height/2)
ax.set_xticks([])
ax.set_yticks([])
ax.set_title("Diffusion Through a Channel")

def draw_environment():
    # Left wall segment (below and above channel)
    ax.plot([left_wall, left_wall], [-box_height/2, channel_y_range[0]], 'k-')
    ax.plot([left_wall, left_wall], [channel_y_range[1],  box_height/2], 'k-')
    # Right wall segment
    ax.plot([right_wall, right_wall], [-box_height/2, channel_y_range[0]], 'k-')
    ax.plot([right_wall, right_wall], [channel_y_range[1],  box_height/2], 'k-')
    # Shade the wall region
    ax.axvspan(left_wall, right_wall, color='lightgray', alpha=0.3)

draw_environment()</pre>
        </div>
        <p>
          The wall is drawn in two segments on each face — leaving the gap undrawn.
          <code>ax.axvspan</code> shades the entire wall thickness so it is visually clear.
        </p>
        <ul class="guided-questions">
          <li>
            Why are there two <code>ax.plot</code> calls for each face of the wall
            (left and right) instead of one?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The wall has a gap (the channel) in the middle. To leave the gap
                visually open we must draw two separate line segments: one from the
                bottom of the box to the bottom of the channel, and one from the top
                of the channel to the top of the box. A single line from bottom to
                top would draw across the channel and obscure the opening.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 10 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 10 — Animate and observe</h2>
      <div class="guide-step">
        <p>
          Add the animation and save it:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">def update(frame):
    scat.set_offsets(np.c_[x[frame], y[frame]])
    return scat,

ani = animation.FuncAnimation(fig, update, frames=N, interval=30, blit=True)
ani.save("diffusion_through_channel.mp4", writer="ffmpeg", fps=30)
plt.show()</pre>
        </div>
        <p>Run the simulation. You should see particles start on the left and gradually
        spread to the right through the channel. Now explore:</p>
        <ul>
          <li>Change <code>channel_y_range = (-5, 5)</code>. Does mixing slow down?</li>
          <li>Change <code>channel_y_range = (-30, 30)</code>. What happens? Why?</li>
          <li>Change <code>x[0]</code> so particles start on <em>both</em> sides.
          What is the long-run outcome?</li>
        </ul>
        <ul class="guided-questions">
          <li>
            After a long time, roughly half the particles end up on each side regardless
            of where they started. Why?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Passive diffusion is driven by random motion with no preference for
                direction. Once particles can cross in both directions, crossings from
                left-to-right and right-to-left happen at equal rates when concentrations
                are equal. The system reaches <em>dynamic equilibrium</em>: crossings
                still occur but there is no net flux.</p>
              </div>
            </details>
          </li>
          <li>
            A narrower channel slows the approach to equilibrium but doesn't change the
            final state. What does this tell you about the role of the channel in biology?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Channel width (or, more generally, permeability) controls the
                <em>rate</em> at which ions cross, not the equilibrium they approach.
                In a real cell, channels don't just sit open — they can open and close,
                and different channel types are selective for different ions. By
                controlling permeability, a cell controls the rate and direction of ion
                flow without needing to do chemical work.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 11 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 11 — Check your understanding</h2>
      <div class="guide-step">
        <p class="arc-description">Answer these in writing before moving to Lesson 3.</p>
        <ul class="guided-questions">
          <li>
            What is a boolean array? Give an example of how one arises naturally in this simulation.
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>A boolean array is an array where every element is either True or False.
                In this simulation, <code>trying_to_cross_left = (x[i-1] &lt; left_wall) &amp; (new_x &gt;= left_wall)</code>
                produces one: each element is True for the particles that were on the left
                and have proposed a step to the right across the wall face, and False for
                all others.</p>
              </div>
            </details>
          </li>
          <li>
            What do the operators <code>&amp;</code>, <code>|</code>, and <code>~</code>
            do when applied to boolean arrays?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><code>&amp;</code> (AND): True only when both corresponding elements
                are True. <code>|</code> (OR): True when at least one element is True.
                <code>~</code> (NOT): flips each element — True becomes False, False
                becomes True. All three operate element-by-element across the whole array
                at once.</p>
              </div>
            </details>
          </li>
          <li>
            In the line <code>new_x[reflect] = x[i-1][reflect]</code>, what does
            using a boolean array as an index do?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Boolean indexing selects only the elements where the boolean array
                is True. On the left side, <code>new_x[reflect]</code> refers to only
                those entries of <code>new_x</code> where <code>reflect</code> is True.
                Assigning to them overwrites just those entries, leaving the rest unchanged.
                It is equivalent to a loop that checks each particle individually and
                conditionally resets its x — but written in one concise line.</p>
              </div>
            </details>
          </li>
          <li>
            Why doesn't the channel location appear in the <code>reflect</code> logic for
            the y-direction — only for x?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The membrane is vertical (it blocks motion in the x-direction). The
                channel gap is a range of y-values, so the y-position of a particle
                determines whether it is aligned with the opening. But the wall itself
                does not block y-motion — particles can move freely up and down. The
                <code>reflect</code> variable modifies <code>new_x</code> only, because
                the wall is only in the path of x-steps.</p>
              </div>
            </details>
          </li>
          <li>
            What would happen to the simulation if you forgot the <code>np.clip</code>
            line for the y-boundaries?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Particles would escape above and below the box. Over time they would
                spread infinitely in y. The channel gap is defined as a y-range, so
                particles far outside the box would never be "in the channel" and would
                always be reflected if they tried to cross in x — but that wouldn't matter
                because they've already escaped the physical domain of interest. The
                simulation would no longer represent a bounded compartment.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

  </div>
`;

document.querySelector<HTMLButtonElement>('#theme-toggle')!.addEventListener('click', () => {
  const isLight = document.documentElement.classList.toggle('light');
  document.querySelector<HTMLButtonElement>('#theme-toggle')!.textContent = isLight ? '☽' : '☀';
});

// Copy buttons for code blocks
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
