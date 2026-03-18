import '../style.css';
import { applyStoredTheme, initThemeToggle } from '../theme';

applyStoredTheme();


const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
<div class="site-shell">
  <div class="nav-line">
    <a href="../index.html">← Back to simulations</a>
    <div class="spacer"></div>
    <button id="theme-toggle" class="theme-btn">☀</button>
  </div>

  <header class="page-head">
    <p class="eyebrow">Python Lab Guide — Lesson 1</p>
    <h1>Brownian Motion: Building a Simulation from Scratch</h1>
    <p>
      In this lesson you will write a complete simulation of Brownian motion
      from first principles — no starter file. You will discover
      <strong>Euler's method</strong> by first trying something that does not
      work, then figuring out why, then fixing it. By the end you will have
      generalised from one particle to many, and understood why arrays are
      the right tool for the job.
    </p>
    <p>
      Create a new file called <code>diffusion.py</code> and open it in your
      editor. You will build the script up section by section.
    </p>
  </header>

  <!-- STEP 1 -->
  <section class="panel lesson-group">
    <h2 class="section-title">Step 1 — What is Brownian motion?</h2>
    <p class="arc-description">Before writing any code, make sure you understand what you are trying to model.</p>
    <div class="guide-step">
      <p>
        A small particle suspended in a fluid is constantly being bumped by
        the surrounding molecules. Because there are so many molecules and
        their collisions are effectively random, the net force on the particle
        at any instant is unpredictable. As a result:
      </p>
      <ul>
        <li>The particle moves in a <strong>random, jittery path</strong> — no preferred direction.</li>
        <li>Over time it <strong>wanders away</strong> from its starting point, but there is no drift — on average it stays put.</li>
        <li>How far it can wander in a given time is set by the <strong>temperature</strong> of the fluid and the <strong>size</strong> of the particle.</li>
        <li>This phenomenon is called <strong>Brownian motion</strong> (after Robert Brown, 1827) or <strong>free diffusion</strong>.</li>
      </ul>
      <p class="teaching-label questions">Questions</p>
      <ul class="guided-questions">
        <li>
          If you increase the temperature of the fluid, what do you predict happens to how far the particle wanders?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>Higher temperature → more energetic collisions from surrounding molecules → larger random kicks → the particle wanders further in the same amount of time. Temperature is the energy source driving diffusion.</p>
            </div>
          </details>
        </li>
        <li>
          If you watch two particles starting from the same spot, do you expect them to end up in the same place after 10 seconds? Why or why not?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>No. Each particle receives independent random kicks at every moment. Even starting from the same position, their paths immediately diverge. After 10 seconds they will almost certainly be in different places — and if you repeat the experiment, neither particle will end up in the same place twice.</p>
            </div>
          </details>
        </li>
      </ul>
    </div>
  </section>

  <!-- STEP 2 -->
  <section class="panel lesson-group">
    <h2 class="section-title">Step 2 — What do you need to simulate it?</h2>
    <p class="arc-description">Think about what the simulation must keep track of before writing a single line of code.</p>
    <div class="guide-step">
      <p>To watch a particle move through 2D space over time, you need:</p>
      <ul>
        <li><strong>Position</strong> — the particle has an x-coordinate and a y-coordinate at every moment in time.</li>
        <li><strong>History</strong> — you want to see the whole path, not just where it is right now. So you need to <em>store</em> positions at every time step. That is a natural job for <strong>arrays</strong>.</li>
        <li><strong>Time passing</strong> — positions change step by step. You need a <strong>loop</strong> that runs once per time step and updates the position each time through.</li>
      </ul>
      <p>You will use two Python libraries:</p>
      <ul>
        <li><strong>NumPy</strong> (<code>numpy</code>) — for creating and working with arrays.</li>
        <li><strong>Matplotlib</strong> (<code>matplotlib</code>) — for plotting the path.</li>
      </ul>
      <p>Start your file with these imports and a few parameters:</p>
      <pre class="code-block">import numpy as np
import matplotlib.pyplot as plt

N = 1000      # number of time steps
sigma = 0.5   # step size (controls how fast the particle wanders)</pre>
    </div>
  </section>

  <!-- STEP 3 -->
  <section class="panel lesson-group">
    <h2 class="section-title">Step 3 — One particle: set up the arrays</h2>
    <p class="arc-description">Allocate storage for the particle's entire path before the loop runs.</p>
    <div class="guide-step">
      <p>
        You need two arrays — one for x-positions, one for y-positions — each
        with <code>N</code> entries (one per time step). Fill them with
        zeros to start; the loop will overwrite them.
      </p>
      <pre class="code-block">x = np.zeros(N)
y = np.zeros(N)

x[0] = 0.0
y[0] = 0.0</pre>
      <p>
        The last two lines set the particle's starting position to the origin.
        <code>x[0]</code> and <code>y[0]</code> are the positions at step 0.
        The loop will fill in <code>x[1], x[2], ...</code> through <code>x[N-1]</code>.
      </p>
      <p class="teaching-label questions">Questions</p>
      <ul class="guided-questions">
        <li>
          Why do you set <code>x[0] = 0.0</code> separately, outside the loop? What would happen if you forgot to set an initial condition?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>The loop starts at index 1 and computes each new position from the previous one (<code>x[i-1]</code>). If <code>x[0]</code> is not set explicitly, it remains 0 from <code>np.zeros</code> — which is fine here, but in general a simulation with an uninitialised starting state will produce meaningless output. Setting the initial condition explicitly makes the choice deliberate and clear.</p>
            </div>
          </details>
        </li>
        <li>
          You allocated the full array <em>before</em> the loop rather than building it up step by step. Why might that be a good habit?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>When you append to a list or grow an array one element at a time, Python must repeatedly allocate new memory and copy the data. Pre-allocating a fixed-size array once means memory is claimed up front and no copying happens during the loop — much faster for large simulations. It also makes the array's size explicit and visible at the top of the code.</p>
            </div>
          </details>
        </li>
      </ul>
    </div>
  </section>

  <!-- STEP 4 -->
  <section class="panel lesson-group">
    <h2 class="section-title">Step 4 — Try the wrong update</h2>
    <p class="arc-description">Write a loop that looks plausible. Run it. Something will be wrong — that is the point.</p>
    <div class="guide-step">
      <p>
        At each step you want to move the particle by a small random amount.
        A random displacement from a Normal distribution with mean 0 and
        standard deviation <code>sigma</code> captures the unpredictable
        nature of the molecular collisions. Add this loop:
      </p>
      <pre class="code-block">for i in range(1, N):
    x[i] = np.random.normal(0, sigma)
    y[i] = np.random.normal(0, sigma)</pre>
      <p>Add a plot so you can see the path, then run:</p>
      <pre class="code-block">plt.plot(x, y, lw=0.5)
plt.scatter(x[0], y[0], color='green', zorder=5, label='start')
plt.scatter(x[-1], y[-1], color='red', zorder=5, label='end')
plt.legend()
plt.axis('equal')
plt.show()</pre>
      <pre class="code-block">python diffusion.py</pre>
      <p class="teaching-label questions">Questions</p>
      <ul class="guided-questions">
        <li>
          Describe what the plot looks like. Does it resemble the wandering path of a particle in a fluid?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>The plot shows a dense cloud of points clustered near the origin — the "path" repeatedly passes through the same region rather than wandering away. It does not look like diffusion; there is no sense of the particle going anywhere.</p>
            </div>
          </details>
        </li>
        <li>
          Where does the path appear to be centred, regardless of how many steps you run? Why?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>It stays centred near (0, 0). Each step draws from <code>Normal(0, sigma)</code> independently — the mean is 0, so every position is drawn from a distribution centred on 0. The particle has no memory of where it was, so it resets to roughly the origin at every step.</p>
            </div>
          </details>
        </li>
        <li>
          What is the particle "forgetting" between each step?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>It is forgetting where it was. The update <code>x[i] = random</code> replaces the position entirely with a fresh draw. There is no connection between step <em>i</em> and step <em>i−1</em> — each position is chosen independently from zero.</p>
            </div>
          </details>
        </li>
      </ul>
    </div>
  </section>

  <!-- STEP 5 -->
  <section class="panel lesson-group">
    <h2 class="section-title">Step 5 — Fix it: add the anchor</h2>
    <p class="arc-description">Each new position must be built on the previous one. Change the loop.</p>
    <div class="guide-step">
      <p>Replace the two lines inside the loop with:</p>
      <pre class="code-block">for i in range(1, N):
    x[i] = x[i-1] + np.random.normal(0, sigma)
    y[i] = y[i-1] + np.random.normal(0, sigma)</pre>
      <p>Run it again. The path should now look like a random walk — the particle wanders outward from the origin, with no tendency to snap back.</p>
      <p class="teaching-label questions">Questions</p>
      <ul class="guided-questions">
        <li>
          What does <code>x[i-1]</code> contribute? In plain language, what is it doing for the simulation?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>It is the particle's current position — the anchor. The new position is the old position <em>plus</em> a small random step. The particle remembers where it was and moves <em>relative to that</em>, so the path is continuous and cumulative rather than resetting each step.</p>
            </div>
          </details>
        </li>
        <li>
          Run the script a few times without changing anything. Does the path look the same each time? Why or why not?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>No, it looks different every time. The random steps are drawn fresh from <code>numpy.random</code> on each run, with a different random seed. This is correct — real Brownian motion is stochastic, so no two paths should be identical.</p>
            </div>
          </details>
        </li>
        <li>
          The particle starts at (0, 0). After 1000 steps, roughly how far from the origin does it end up? Run it five times and note the distances.
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>With <code>sigma = 0.5</code> and <code>N = 1000</code>, the expected root-mean-square displacement is <code>sigma × √N ≈ 0.5 × 31.6 ≈ 15.8</code> units. Individual runs will vary — some shorter, some longer — but most endpoints should be roughly in that ballpark.</p>
            </div>
          </details>
        </li>
      </ul>
    </div>
  </section>

  <!-- STEP 6 -->
  <section class="panel lesson-group">
    <h2 class="section-title">Step 6 — Name the pattern: Euler's method</h2>
    <p class="arc-description">The update rule you just wrote is the most important numerical technique in this course.</p>
    <div class="guide-step">
      <p>Look at your loop:</p>
      <pre class="code-block">x[i] = x[i-1] + np.random.normal(0, sigma)</pre>
      <p>This follows the pattern:</p>
      <pre class="code-block">new_value = old_value + change</pre>
      <p>
        This is called <strong>Euler's method</strong>. It turns a continuous
        differential equation into a discrete update a computer can execute.
        For Brownian motion the "change" is a random kick. In later lessons
        the "change" will be driven by voltage gradients, ion concentrations,
        and channel gating — but the loop structure will be identical.
      </p>
      <p class="teaching-label questions">Questions</p>
      <ul class="guided-questions">
        <li>
          Every simulation in this series uses Euler's method. Based on what you have seen so far, what two things do you need to know to apply it to any system?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>You need: (1) an <strong>initial condition</strong> — where does the system start? (2) a <strong>rate of change</strong> — how does the state update at each step? Given those two things, Euler's method can simulate any system that evolves over time.</p>
            </div>
          </details>
        </li>
      </ul>
    </div>
  </section>

  <!-- STEP 7 -->
  <section class="panel lesson-group">
    <h2 class="section-title">Step 7 — Two particles</h2>
    <p class="arc-description">Extend the simulation to track a second particle. Write everything out long-form.</p>
    <div class="guide-step">
      <p>Give a second particle its own arrays and initial conditions, and extend the loop to update both. Your full script should now look like this:</p>
      <pre class="code-block">import numpy as np
import matplotlib.pyplot as plt

N = 1000
sigma = 0.5

x1 = np.zeros(N)
y1 = np.zeros(N)
x2 = np.zeros(N)
y2 = np.zeros(N)

x1[0] = 0.0
y1[0] = 0.0
x2[0] = 0.0
y2[0] = 0.0

for i in range(1, N):
    x1[i] = x1[i-1] + np.random.normal(0, sigma)
    y1[i] = y1[i-1] + np.random.normal(0, sigma)
    x2[i] = x2[i-1] + np.random.normal(0, sigma)
    y2[i] = y2[i-1] + np.random.normal(0, sigma)

plt.plot(x1, y1, lw=0.5, label='particle 1')
plt.plot(x2, y2, lw=0.5, label='particle 2')
plt.scatter([x1[0], x2[0]], [y1[0], y2[0]], color='green', zorder=5)
plt.scatter([x1[-1], x2[-1]], [y1[-1], y2[-1]], color='red', zorder=5)
plt.legend()
plt.axis('equal')
plt.show()</pre>
      <p>Run it. You should see two independent random walks starting from the same point.</p>
      <p class="teaching-label questions">Questions</p>
      <ul class="guided-questions">
        <li>
          Do the two particles ever end up in the same place at the end of the simulation? Would you expect them to?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>Almost certainly not — they take independent random paths from the same starting point, so it is extremely unlikely they converge to the same endpoint. Occasionally they might land close together by chance, but in general their paths diverge immediately.</p>
            </div>
          </details>
        </li>
        <li>
          Now imagine doing this for 10 particles. How many arrays would you need to declare? How many lines would the loop body have?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>For 10 particles you would need 20 arrays (<code>x1, y1, x2, y2, ..., x10, y10</code>), 20 initial condition assignments, and 20 lines inside the loop body. For 100 particles that becomes 200 arrays and 200 loop lines. This approach does not scale.</p>
            </div>
          </details>
        </li>
      </ul>
    </div>
  </section>

  <!-- STEP 8 -->
  <section class="panel lesson-group">
    <h2 class="section-title">Step 8 — Ten particles: the problem with long-form</h2>
    <p class="arc-description">Write the 10-particle version long-form. Then notice how painful it is.</p>
    <div class="guide-step">
      <p>
        Before reading ahead, try extending your script to 10 particles by
        hand: <code>x1, y1, x2, y2, ..., x10, y10</code>. Add all the array
        declarations, initial conditions, and loop update lines.
      </p>
      <p>Once you have done that (or convinced yourself you could), count the lines you added. Then ask: what if you needed 100 particles? 10,000?</p>
      <p class="teaching-label questions">Questions</p>
      <ul class="guided-questions">
        <li>
          For 10 particles written long-form, how many lines does the loop body contain?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>20 lines — two per particle (one for x, one for y). Plus 20 array declarations and 20 initial condition lines outside the loop. Total: 60 new lines just to add 8 more particles.</p>
            </div>
          </details>
        </li>
        <li>
          What would you have to change in the script to go from 10 particles to 11? Is there a better way?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>You would have to add two more arrays, set their initial conditions, and add two more lines to the loop body — edits in three separate places. A better way is to use a 2D array where one dimension is particles, then changing the count only requires changing one number.</p>
            </div>
          </details>
        </li>
      </ul>
    </div>
  </section>

  <!-- STEP 9 -->
  <section class="panel lesson-group">
    <h2 class="section-title">Step 9 — N particles with arrays</h2>
    <p class="arc-description">Rewrite using 2D arrays. The loop body stays the same size no matter how many particles you add.</p>
    <div class="guide-step">
      <p>Instead of one array per particle, use a single 2D array where rows are time steps and columns are particles. Replace your entire script with this:</p>
      <pre class="code-block">import numpy as np
import matplotlib.pyplot as plt

N = 1000
sigma = 0.5
n_particles = 10

x = np.zeros((N, n_particles))
y = np.zeros((N, n_particles))

x[0, :] = 0.0
y[0, :] = 0.0

for i in range(1, N):
    x[i] = x[i-1] + np.random.normal(0, sigma, n_particles)
    y[i] = y[i-1] + np.random.normal(0, sigma, n_particles)

for p in range(n_particles):
    plt.plot(x[:, p], y[:, p], lw=0.5, alpha=0.6)

plt.scatter(x[0, :], y[0, :], color='green', zorder=5, label='start')
plt.scatter(x[-1, :], y[-1, :], color='red', zorder=5, label='end')
plt.legend()
plt.axis('equal')
plt.show()</pre>
      <p>Run it. Then change <code>n_particles</code> to 100 and run again. The loop body did not change at all.</p>
      <p class="teaching-label questions">Questions</p>
      <ul class="guided-questions">
        <li>
          <code>x</code> now has shape <code>(N, n_particles)</code>. What does <code>x[i]</code> refer to? What does <code>x[:, p]</code> refer to?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p><code>x[i]</code> is a 1D array of length <code>n_particles</code> — the x-positions of all particles at time step <em>i</em>. <code>x[:, p]</code> is a 1D array of length <code>N</code> — the full x-history of particle <em>p</em> across all time steps.</p>
            </div>
          </details>
        </li>
        <li>
          <code>np.random.normal(0, sigma, n_particles)</code> draws <code>n_particles</code> random numbers at once. Why is that important here?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>Each particle needs its own independent random kick. Passing <code>n_particles</code> as the size argument generates all of them in one call and returns an array of that length. This lets the single line <code>x[i] = x[i-1] + ...</code> update all particles simultaneously, without a nested loop over particles.</p>
            </div>
          </details>
        </li>
        <li>
          Change <code>n_particles</code> to 500. How does the cloud of end-points look compared to 10 particles? What shape does it approach?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>With 500 particles the cloud of red end-points becomes clearly circular and roughly Gaussian — dense in the centre, thinning toward the edges. With only 10 particles the shape is too sparse to see this. This circular spread is the 2D signature of diffusion: the distribution of end-points approaches a 2D Gaussian centred on the origin.</p>
            </div>
          </details>
        </li>
        <li>
          Change <code>sigma</code> from <code>0.5</code> to <code>0.1</code>. How does the spread of end-points change? Try <code>sigma = 2.0</code>.
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>Smaller <code>sigma</code> → smaller steps → tighter cloud. Larger <code>sigma</code> → larger steps → much wider spread. The radius scales as <code>sigma × √N</code>: with <code>sigma = 0.1</code> the expected spread is ~3.2 units; with <code>sigma = 2.0</code> it is ~63 units.</p>
            </div>
          </details>
        </li>
      </ul>
    </div>
  </section>

  <!-- STEP 10 -->
  <section class="panel lesson-group">
    <h2 class="section-title">Step 10 — Check your understanding</h2>
    <p class="arc-description">Answer these in writing before moving to Lesson 2.</p>
    <div class="guide-step">
      <ul class="guided-questions">
        <li>
          Explain in your own words why <code>x[i] = np.random.normal(0, sigma)</code> does not produce Brownian motion, but <code>x[i] = x[i-1] + np.random.normal(0, sigma)</code> does.
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>The first version sets the position to a fresh random draw centred on zero at every step — the particle has no memory and resets each time. The second version adds the random step to wherever the particle currently is, so displacement accumulates over time. The <code>x[i-1]</code> term is what gives the particle its history.</p>
            </div>
          </details>
        </li>
        <li>
          What are the two ingredients of Euler's method? Write the general update rule in words (not code).
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>The two ingredients are an <strong>initial condition</strong> and a <strong>rule for how the state changes</strong>. In words: <em>new state = old state + change</em>. The "change" encodes the physics or dynamics of the system being modelled.</p>
            </div>
          </details>
        </li>
        <li>
          In the final script, the loop body is two lines regardless of how many particles you simulate. Why? What feature of NumPy makes this possible?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>NumPy operations act on entire arrays at once (vectorisation). When <code>x[i-1]</code> is a 1D array of length <code>n_particles</code> and <code>np.random.normal(0, sigma, n_particles)</code> produces another array of the same length, their sum is computed element-wise in a single statement — updating all particles simultaneously without a Python-level loop.</p>
            </div>
          </details>
        </li>
        <li>
          A classmate argues: "We should set <code>x[0, :] = 0</code> inside the loop at <code>i = 0</code> rather than outside it." What is wrong with this argument?
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>The loop runs <code>for i in range(1, N)</code> — it starts at index 1, not 0. Index 0 is never visited by the loop. If you set <code>x[0]</code> inside the loop, it would never execute. Initial conditions must be set before the loop so that <code>x[i-1]</code> is valid on the very first iteration (<code>i = 1</code>).</p>
            </div>
          </details>
        </li>
        <li>
          In theory, the root-mean-square distance a particle travels from the origin after <code>N</code> steps of size <code>sigma</code> is approximately <code>sigma × √N</code>. With <code>sigma = 0.5</code> and <code>N = 1000</code>, what does this predict? Check it roughly by eye using your 500-particle simulation.
          <details>
            <summary>Show answer</summary>
            <div class="answer-body">
              <p>Predicted RMS displacement: <code>0.5 × √1000 ≈ 15.8</code> units. With 500 particles the bulk of the red endpoint cloud should be roughly within 15–20 units of the origin — most particles land in that band, with a few outliers further out.</p>
            </div>
          </details>
        </li>
      </div>
      <p style="margin-top: 16px;">
        When you are done, compare your simulation to the interactive web version — which scales to thousands of particles and lets you adjust parameters in real time.
      </p>
      <p>
        <a href="../inspect_diffusion_free.html" class="inline-link">
          Open the Free Diffusion web simulation →
        </a>
      </p>
    </div>
  </section>

</div>
`;

// Theme toggle
initThemeToggle(document.querySelector<HTMLButtonElement>('#theme-toggle')!);

// Copy buttons on code blocks
document.querySelectorAll<HTMLPreElement>('.code-block').forEach((pre) => {
  const wrap = document.createElement('div');
  wrap.className = 'code-block-wrap';
  pre.parentNode!.insertBefore(wrap, pre);
  wrap.appendChild(pre);

  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.textContent = 'Copy';
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(pre.textContent ?? '').then(() => {
      btn.textContent = '✓ Copied';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  });
  wrap.appendChild(btn);
});
