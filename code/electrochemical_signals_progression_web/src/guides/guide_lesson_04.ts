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
      <h1 class="landing-title">Lesson 4 — Selective Permeability</h1>
      <p class="eyebrow">
        So far every channel accepted any particle that reached it. Real ion channels
        are <em>selective</em>: a Na⁺ channel lets through sodium ions and nothing else;
        a K⁺ channel lets through potassium. This lesson adds a second ion type with its
        own dedicated channel, and introduces the key distinction between
        <em>selectivity</em> (which ion can cross) and <em>permeability</em> (how fast
        it crosses).
      </p>
    </header>

    <!-- ── Step 1 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 1 — Two ion types, two channels</h2>
      <div class="guide-step">
        <p>
          In Lessons 2 and 3 there was one type of particle and one channel. Every
          particle that reached the channel gap was allowed through (or in Lesson 3,
          allowed through with probability <code>p</code>). The channel had no
          preference about <em>who</em> crossed — only <em>whether</em> they could.
        </p>
        <p>
          The cells of your nervous system have membranes studded with many different
          channel proteins, each one shaped to admit only a specific ion. A Na⁺ channel
          will not let K⁺ pass, even if a K⁺ ion is perfectly aligned with the gap.
          This is <strong>selectivity</strong>.
        </p>
        <p>
          In this lesson we will model two ion types — Na⁺ and K⁺ — with one dedicated
          channel each. The Na⁺ channel sits in one part of the wall; the K⁺ channel
          sits somewhere else. A particle may only pass through the channel that belongs
          to its own type.
        </p>
        <p>
          Create a new file called <code>selective_permeability.py</code>.
        </p>
      </div>
    </section>

    <!-- ── Step 2 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 2 — Setup: box, wall, and two channel gaps</h2>
      <div class="guide-step">
        <p>
          The box and wall geometry is the same as Lesson 2. The only new thing is that
          we now define <em>two</em> channel Y-ranges — one for Na⁺ and one for K⁺.
          We will start all particles on the right and let them diffuse leftward.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# ── box ──────────────────────────────────────────────────────────────
box_width  = 100
box_height = 100

# ── wall ─────────────────────────────────────────────────────────────
wall_x         = 0          # wall sits at x = 0
channel_half_w = 2          # wall occupies x ∈ [-channel_half_w, +channel_half_w]
left_wall      = wall_x - channel_half_w
right_wall     = wall_x + channel_half_w

# ── Na⁺ channel gap (upper half of wall) ─────────────────────────────
na_channel_y_min  =  10
na_channel_y_max  =  25

# ── K⁺ channel gap (lower half of wall) ──────────────────────────────
k_channel_y_min   = -25
k_channel_y_max   = -10

# ── particles ─────────────────────────────────────────────────────────
num_na = 100   # number of Na⁺ ions
num_k  = 100   # number of K⁺ ions
num_particles = num_na + num_k

diffusion_sd = 1.5   # standard deviation of each random step</pre>
        </div>
        <p>
          The Na⁺ and K⁺ channels sit at different heights in the wall. A particle
          that reaches the wall at height y will only be allowed to cross if y falls
          inside its own channel's Y-range.
        </p>
      </div>
    </section>

    <!-- ── Step 3 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 3 — Type arrays</h2>
      <div class="guide-step">
        <p>
          We need to track which particles are Na⁺ and which are K⁺. The simplest way
          is a <strong>type array</strong>: an integer array of length
          <code>num_particles</code> where <code>0</code> means Na⁺ and
          <code>1</code> means K⁺.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block"># ion_type[i] = 0 → Na⁺,  ion_type[i] = 1 → K⁺
ion_type = np.zeros(num_particles, dtype=int)
ion_type[num_na:]  = 1   # last num_k entries are K⁺</pre>
        </div>
        <p>
          <code>np.zeros(N, dtype=int)</code> creates an array of <code>N</code> zeros,
          stored as integers. The slice <code>[num_na:]</code> selects every element
          from index <code>num_na</code> to the end, and sets them to <code>1</code>
          in one step.
        </p>
        <p>
          Now we can ask, for every particle, whether it is Na⁺:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">is_na = (ion_type == 0)   # boolean array; True where Na⁺, False where K⁺
is_k  = (ion_type == 1)   # equivalently: is_k = ~is_na</pre>
        </div>
        <p>
          <code>ion_type == 0</code> compares every element of the array to
          <code>0</code> and returns a boolean array of the same length —
          <code>True</code> where the condition holds, <code>False</code> elsewhere.
          This is called <strong>element-wise comparison</strong>, and the result is a
          <strong>boolean mask</strong> that we will use throughout the simulation.
        </p>
        <ul class="guided-questions">
          <li>
            What would <code>ion_type[50]</code> be if <code>num_na = 100</code>?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Index 50 is less than <code>num_na = 100</code>, so it belongs to
                the Na⁺ block. Its value is <code>0</code>.</p>
              </div>
            </details>
          </li>
          <li>
            What does <code>is_na.sum()</code> return?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>NumPy treats <code>True</code> as 1 and <code>False</code> as 0
                when summing a boolean array, so <code>is_na.sum()</code> returns the
                count of Na⁺ particles — in this case <code>100</code>.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 4 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 4 — Initial positions</h2>
      <div class="guide-step">
        <p>
          All particles start on the right side of the membrane. We will use
          <code>np.random.uniform</code> to place them at random positions within the
          right compartment — exactly as in Lesson 2.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">num_steps = 800

# preallocate position history
x = np.zeros((num_steps, num_particles))
y = np.zeros((num_steps, num_particles))

# start all particles randomly on the right side
x[0] = np.random.uniform(right_wall + 1, box_width / 2 - 1, num_particles)
y[0] = np.random.uniform(-box_height / 2 + 1, box_height / 2 - 1, num_particles)</pre>
        </div>
        <p>
          Nothing new here — this is identical to Lesson 2's initialisation. The
          type array handles which particle is which; the positions themselves are all
          set up the same way.
        </p>
      </div>
    </section>

    <!-- ── Step 5 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 5 — The update loop: proposing moves</h2>
      <div class="guide-step">
        <p>
          The per-step logic is mostly the same as Lesson 2: propose a new position,
          enforce box boundaries, then check whether the particle is trying to cross
          the wall.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">for i in range(1, num_steps):
    # propose random steps
    new_x = x[i-1] + np.random.normal(0, diffusion_sd, num_particles)
    new_y = y[i-1] + np.random.normal(0, diffusion_sd, num_particles)

    # enforce box boundaries by clipping
    new_x = np.clip(new_x, -box_width  / 2, box_width  / 2)
    new_y = np.clip(new_y, -box_height / 2, box_height / 2)

    # which particles are trying to cross the wall?
    trying_left  = (x[i-1] &lt;  left_wall) &amp; (new_x &gt;= left_wall)
    trying_right = (x[i-1] &gt;= right_wall) &amp; (new_x &lt;  right_wall)
    trying_to_cross = trying_left | trying_right</pre>
        </div>
        <p>
          Stop here — we have not yet applied any selectivity. In the next step we
          will build the combined channel check that depends on ion type.
        </p>
      </div>
    </section>

    <!-- ── Step 6 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 6 — Per-type channel check</h2>
      <div class="guide-step">
        <p>
          This is the new heart of the simulation. Whether a particle may cross depends
          on two things: (a) it is in the gap belonging to <em>its own type</em>, and
          (b) it is actually trying to cross.
        </p>
        <p>
          First, check whether each particle is aligned with its own channel gap:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">    # is each particle inside the Na⁺ channel gap?
    in_na_channel = (new_y &gt;= na_channel_y_min) &amp; (new_y &lt;= na_channel_y_max)

    # is each particle inside the K⁺ channel gap?
    in_k_channel  = (new_y &gt;= k_channel_y_min)  &amp; (new_y &lt;= k_channel_y_max)</pre>
        </div>
        <p>
          Both arrays are <code>num_particles</code> long and contain
          <code>True</code>/<code>False</code> for every particle. But a K⁺ ion
          aligned with the Na⁺ gap should still be blocked. We combine type
          membership with channel alignment:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">    # a particle is in "its" channel only if it matches both type and position
    in_own_channel = (is_na &amp; in_na_channel) | (is_k &amp; in_k_channel)</pre>
        </div>
        <p>
          Read this out loud: "Na⁺ particles that are in the Na⁺ gap, OR K⁺ particles
          that are in the K⁺ gap." Any other combination — a K⁺ ion at the Na⁺ gap
          height, for example — evaluates to <code>False</code>.
        </p>
        <p>
          Finally, reflect the particles that try to cross but are blocked:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">    # blocked = trying to cross AND not in own channel
    blocked = trying_to_cross &amp; ~in_own_channel

    # undo the x-move for blocked particles; leave y unchanged
    new_x[blocked] = x[i-1][blocked]

    x[i] = new_x
    y[i] = new_y</pre>
        </div>
        <ul class="guided-questions">
          <li>
            A K⁺ particle is at <code>y = 18</code>, which is inside the Na⁺ channel
            gap (<code>y_min=10, y_max=25</code>). Is <code>in_own_channel</code>
            <code>True</code> or <code>False</code> for this particle?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><code>in_own_channel</code> is <code>False</code>. Although the
                particle is inside the Na⁺ gap, it is a K⁺ ion (<code>is_na</code> is
                <code>False</code>), so <code>is_na &amp; in_na_channel</code> is
                <code>False</code>. It is not in its own K⁺ gap either, so the second
                term is also <code>False</code>. The particle is blocked.</p>
              </div>
            </details>
          </li>
          <li>
            Why do we leave <code>new_y</code> unchanged for blocked particles even
            though we reset <code>new_x</code>?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>The membrane is a vertical wall — it only constrains movement in
                the x-direction. A blocked particle bounces back horizontally but is
                free to continue moving vertically. Resetting y would also alter the
                randomness in the y-direction, which has nothing to do with the wall.</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 7 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 7 — Two-colour animation</h2>
      <div class="guide-step">
        <p>
          We now have two ion types and want to see them separately. The trick is to
          pass boolean masks to <code>ax.scatter</code> so each type gets its own
          colour.
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">fig, ax = plt.subplots(figsize=(6, 6))
ax.set_xlim(-box_width  / 2, box_width  / 2)
ax.set_ylim(-box_height / 2, box_height / 2)
ax.set_aspect('equal')
ax.set_facecolor('#0a0e17')

# separate scatter objects for Na⁺ and K⁺
sc_na = ax.scatter(x[0][is_na], y[0][is_na], s=6, color='cyan',  label='Na⁺')
sc_k  = ax.scatter(x[0][is_k],  y[0][is_k],  s=6, color='lime',  label='K⁺')
ax.legend(loc='upper left', fontsize=8)

# draw the wall
wall_segments = [
    # left wall: two segments around the Na⁺ gap
    [(-box_height/2, na_channel_y_min), (na_channel_y_max, box_height/2)],
    # right wall: two segments around the K⁺ gap
    [(-box_height/2, k_channel_y_min),  (k_channel_y_max, box_height/2)],
]
for y_bot, y_top in wall_segments[0]:
    ax.plot([left_wall, left_wall],  [y_bot, y_top], color='white', lw=2)
for y_bot, y_top in wall_segments[1]:
    ax.plot([right_wall, right_wall], [y_bot, y_top], color='white', lw=2)

# colour the channel gaps to show which is which
ax.plot([left_wall,  right_wall], [na_channel_y_min, na_channel_y_min], color='cyan', lw=1, ls='--')
ax.plot([left_wall,  right_wall], [na_channel_y_max, na_channel_y_max], color='cyan', lw=1, ls='--')
ax.plot([left_wall,  right_wall], [k_channel_y_min,  k_channel_y_min],  color='lime', lw=1, ls='--')
ax.plot([left_wall,  right_wall], [k_channel_y_max,  k_channel_y_max],  color='lime', lw=1, ls='--')

def update(frame):
    sc_na.set_offsets(np.column_stack([x[frame][is_na], y[frame][is_na]]))
    sc_k.set_offsets( np.column_stack([x[frame][is_k],  y[frame][is_k]]))
    return sc_na, sc_k

ani = animation.FuncAnimation(fig, update, frames=num_steps, interval=30, blit=True)
plt.tight_layout()
plt.show()</pre>
        </div>
        <p>
          <code>x[frame][is_na]</code> first selects all x-positions at the current
          frame, then boolean-indexes to keep only those belonging to Na⁺ particles.
          The result is a 1-D array of Na⁺ x-coordinates.
        </p>
        <p>
          Run the simulation now. You should see cyan particles drifting left through
          the upper gap and lime particles drifting left through the lower gap. Try
          swapping which type uses which gap by changing the channel definitions — the
          physics is symmetric.
        </p>
      </div>
    </section>

    <!-- ── Step 8 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 8 — Track concentrations per type</h2>
      <div class="guide-step">
        <p>
          Just as in Lesson 2 we tracked what fraction of particles were on each side,
          we can now do that separately for Na⁺ and K⁺. Add this to the update loop:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block"># preallocate concentration histories
na_left_frac = np.zeros(num_steps)
k_left_frac  = np.zeros(num_steps)</pre>
        </div>
        <p>
          Inside the loop, after updating positions:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">    na_left_frac[i] = (x[i][is_na] &lt; left_wall).mean()
    k_left_frac[i]  = (x[i][is_k]  &lt; left_wall).mean()</pre>
        </div>
        <p>
          <code>(x[i][is_na] &lt; left_wall)</code> is a boolean array — <code>True</code>
          wherever a Na⁺ particle is on the left. <code>.mean()</code> on a boolean
          array gives the fraction of <code>True</code> values, so this is the
          fraction of Na⁺ on the left.
        </p>
        <p>
          To plot both concentration traces after the animation, add a second subplot:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">fig, (ax_sim, ax_trace) = plt.subplots(1, 2, figsize=(12, 5))

# ... (simulation and animation in ax_sim as before) ...

ax_trace.plot(na_left_frac, color='cyan', label='Na⁺ left')
ax_trace.plot(k_left_frac,  color='lime', label='K⁺ left')
ax_trace.axhline(0.5, color='white', lw=0.8, ls='--', label='50 %')
ax_trace.set_ylim(0, 1)
ax_trace.set_xlabel('Time step')
ax_trace.set_ylabel('Fraction on left side')
ax_trace.set_title('Equilibration by ion type')
ax_trace.legend()
ax_trace.set_facecolor('#0a0e17')
ax_trace.tick_params(colors='white')
ax_trace.yaxis.label.set_color('white')
ax_trace.xaxis.label.set_color('white')
ax_trace.title.set_color('white')</pre>
        </div>
      </div>
    </section>

    <!-- ── Step 9 ───────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 9 — Selectivity vs permeability</h2>
      <div class="guide-step">
        <p>
          Now that both ion types equilibrate, we can explore the two key variables:
          the <em>width</em> of each channel (which controls permeability — the rate
          of crossing) and the <em>position</em> of each channel (which controls
          selectivity — which type can cross).
        </p>
        <p><strong>Experiment 1 — Different rates</strong></p>
        <p>
          Make the Na⁺ channel very wide and the K⁺ channel very narrow:
        </p>
        <div class="code-block-wrap">
          <pre class="code-block">na_channel_y_min =  5
na_channel_y_max =  40   # wide Na⁺ channel

k_channel_y_min  = -15
k_channel_y_max  = -10   # narrow K⁺ channel</pre>
        </div>
        <p>
          Run it and watch the concentration trace. Na⁺ equilibrates quickly; K⁺
          is much slower because its channel is narrow and crossings are rare.
        </p>
        <p><strong>Experiment 2 — Final concentrations</strong></p>
        <p>
          Leave the unequal channel widths in place and run for a very large number
          of steps (e.g., <code>num_steps = 3000</code>). Does either ion end up
          at a higher or lower final concentration on the left despite the unequal
          channel widths?
        </p>
        <ul class="guided-questions">
          <li>
            Which ion equilibrates faster in Experiment 1, and why?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Na⁺ equilibrates faster because its channel gap is wider. More
                particles are aligned with it at any given moment, so crossings happen
                more frequently. K⁺ must find the narrow gap, so crossings are rarer
                and mixing takes longer.</p>
              </div>
            </details>
          </li>
          <li>
            Does channel width affect the final (equilibrium) concentrations?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>No. Given enough time, both ions reach 50 % on each side regardless
                of channel width. Width controls <em>how fast</em> equilibrium is
                approached, not <em>where</em> equilibrium sits. Both directions of
                crossing are equally affected by the channel width, so there is no
                net bias.</p>
              </div>
            </details>
          </li>
          <li>
            Can you make Na⁺ equilibrate on the left while K⁺ stays mostly on the
            right? If not, why not?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>No — not with these channels and no additional forces. Both ion
                types start on the right and the only force acting is random diffusion.
                Diffusion always pushes toward equal concentration on both sides.
                You can make K⁺ equilibrate very slowly by narrowing its channel, but
                given infinite time it will reach 50/50 too. Something beyond a
                geometric channel is required to sustain an asymmetric distribution.
                (That something is the Na⁺/K⁺ pump, which appears later in the
                series.)</p>
              </div>
            </details>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Step 10 ─────────────────────────────────────────────── -->
    <section class="panel lesson-group">
      <h2 class="section-title">Step 10 — Check your understanding</h2>
      <div class="guide-step">
        <ul class="guided-questions">
          <li>
            What is the difference between selectivity and permeability?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><strong>Selectivity</strong> refers to which ion type is allowed
                through at all — it is a yes/no property of the channel protein.
                <strong>Permeability</strong> refers to how easily (or how quickly)
                the allowed ion can cross — it is a rate or probability. A channel can
                be highly selective (only Na⁺) but low-permeability (rare crossings),
                or vice-versa.</p>
              </div>
            </details>
          </li>
          <li>
            In the code, what single line encodes the selectivity rule?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p><code>in_own_channel = (is_na &amp; in_na_channel) | (is_k &amp; in_k_channel)</code>.
                This line ensures that a particle is only considered "in a channel"
                if it is both the right type AND aligned with that type's gap. The
                boolean mask combines type membership with geometric position to
                implement selectivity.</p>
              </div>
            </details>
          </li>
          <li>
            What would happen if you set <code>ion_type[:] = 0</code> (make all
            particles Na⁺) but kept both channel definitions?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>All particles would be Na⁺ (<code>is_na</code> all True,
                <code>is_k</code> all False), so <code>in_own_channel</code> would
                collapse to just <code>in_na_channel</code>. The K⁺ gap would be
                ignored entirely. The simulation would behave exactly like Lesson 2
                with a single Na⁺-type channel.</p>
              </div>
            </details>
          </li>
          <li>
            Could you model three ion types (Na⁺, K⁺, Cl⁻) by extending the
            pattern in this lesson? What would you need to add?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Yes. You would need: (1) a third value in <code>ion_type</code>
                (e.g., <code>2</code> for Cl⁻), (2) a third boolean selector
                <code>is_cl = (ion_type == 2)</code>, (3) a third channel Y-range,
                (4) a third term in the <code>in_own_channel</code> expression
                <code>| (is_cl &amp; in_cl_channel)</code>, and (5) a third scatter
                object and concentration trace. The pattern scales naturally to any
                number of ion types.</p>
              </div>
            </details>
          </li>
          <li>
            Why does starting all particles on the right make pedagogical sense here,
            even though real cells have ions on both sides?
            <details>
              <summary>Show answer</summary>
              <div class="answer-body">
                <p>Starting all particles on one side makes the direction of net
                diffusion completely unambiguous — you can clearly see each ion type
                moving leftward through its dedicated channel. If ions started on both
                sides, the traces would immediately be flat near 50 %, and it would be
                harder to visualise the channel-specific movement. The biological
                starting conditions (Na⁺ outside, K⁺ inside) are introduced in
                Lesson 5, after students have understood the mechanics.</p>
              </div>
            </details>
          </li>
        </ul>
        <p style="margin-top: 16px;">
          When you are ready, open the interactive simulation to control each channel's
          width independently and watch Na⁺ and K⁺ equilibrate at different rates in
          real time.
        </p>
        <p>
          <a href="../inspect_diffusion_selective.html" class="inline-link">
            Open the Selective Permeability web simulation →
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
