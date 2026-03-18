import './style.css';
import { applyStoredTheme, initThemeToggle } from './theme';
import { lessons } from './lessons';
import type { LessonArc } from './lessons';

applyStoredTheme();


const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app root');
}

const arcOrder: LessonArc[] = [
  'diffusion',
  'concentration_gradients',
  'resting_potential',
  'voltage_and_current',
  'action_potential'
];

const arcLabels: Record<LessonArc, string> = {
  diffusion: 'Arc 1 — Diffusion and the Concentration Gradient Problem',
  concentration_gradients: 'Arc 2 — Electricity and the Concentration Gradient',
  resting_potential: 'Arc 3 — The Resting Potential',
  voltage_and_current: 'Arc 4 — Voltage and Current',
  action_potential: 'Arc 5 — The Action Potential'
};

const arcDescriptions: Record<LessonArc, string> = {
  diffusion: 'Particles spread by random Brownian motion. A membrane and selective channels are introduced one step at a time.',
  concentration_gradients: 'Electrical forces combine with diffusion. The Na/K pump establishes the biological ion distributions.',
  resting_potential: 'Charge separation creates a voltage across the membrane. The Nernst and Goldman equations emerge from the simulation.',
  voltage_and_current: 'Channels that open and close stochastically produce measurable currents. Voltage controls gating.',
  action_potential: 'Voltage-gated Na⁺ and K⁺ channels combine to produce an all-or-nothing spike.'
};

function lessonCard(lesson: (typeof lessons)[number]): string {
  const isLive = lesson.status === 'active';
  if (isLive) {
    return `
      <a class="link-card ready" href="./${lesson.htmlPath}">
        <strong>${lesson.title}</strong>
        <span>${lesson.description}</span>
      </a>`;
  }
  if (lesson.status === 'draft' || lesson.status === 'rebuild') {
    return `
      <div class="link-card draft">
        <strong>${lesson.title} <em class="badge">Coming soon</em></strong>
        <span>${lesson.description}</span>
      </div>`;
  }
  // 'future' and 'archived' — omit from landing page
  return '';
}

const groupedCardsHtml = arcOrder
  .map((arc) => {
    const arcLessons = lessons.filter((l) => l.arc === arc && l.status !== 'future' && l.status !== 'archived');
    if (arcLessons.length === 0) return '';
    const cards = arcLessons.map(lessonCard).join('');
    return `
      <section class="panel lesson-group">
        <h2 class="section-title">${arcLabels[arc]}</h2>
        <p class="arc-description">${arcDescriptions[arc]}</p>
        <div class="link-list">${cards}
        </div>
      </section>`;
  })
  .join('');

app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>
    <header class="page-head">
      <h1 class="landing-title">Electrochemical Signals in Nerve Cells</h1>
      <p class="eyebrow">A step-by-step journey from Brownian motion through the action potential. Each simulation is interactive — pause, adjust parameters, and explore.</p>
    </header>

    ${groupedCardsHtml}

    <section class="panel lesson-group">
      <h2 class="section-title">Python Lab Guides</h2>
      <p class="arc-description">Step-by-step worksheets that pair with the Python scripts. Work through these if you are building the simulations yourself rather than just running them.</p>
      <div class="link-list">
        <a class="link-card ready" href="./guide_lesson_01.html">
          <strong>Lesson 1 — Free Diffusion and Euler's Method</strong>
          <span>Write the core position-update rule, discover why the anchor matters, and meet Euler's method</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_02.html">
          <strong>Lesson 2 — Diffusion Through a Membrane Channel</strong>
          <span>Add a wall and a gap; learn boolean arrays and logical indexing to enforce who may cross</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_03.html">
          <strong>Lesson 3 — Permeability as Probability</strong>
          <span>Real channels are open or closed, not partially open — model permeability as a crossing probability and write your first function</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_04.html">
          <strong>Lesson 4 — Selective Permeability</strong>
          <span>Two ion types, two dedicated channels — only Na⁺ can use the Na⁺ gap; introduce type arrays and per-type boolean indexing</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_05.html">
          <strong>Lesson 5 — Electrical Field Attraction</strong>
          <span>Add a deterministic drift term to the random walk and watch diffusion compete with electrical attraction around a fixed charge source</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_06.html">
          <strong>Lesson 6 — Na⁺ and K⁺ with Anions</strong>
          <span>Fixed negative anions attract both ion types inward — explore why anions alone cannot explain the biological concentration gradient</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_07.html">
          <strong>Lesson 7 — Na/K Pump</strong>
          <span>Add active transport to the simulation — the pump moves Na⁺ out and K⁺ in against concentration gradients, maintaining the biological distribution</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_08.html">
          <strong>Lesson 8 — Voltage as Charge Separation</strong>
          <span>Membrane potential is just a charge imbalance — explore the static relationship between ion counts and voltage before adding dynamics</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_09.html">
          <strong>Lesson 9 — Nernst Equation</strong>
          <span>Derive E_K = (RT/zF) ln([K⁺]_out/[K⁺]_in) — the voltage at which diffusion and electrical attraction exactly balance for one ion</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_10.html">
          <strong>Lesson 10 — Goldman Equation</strong>
          <span>With two ions, V_m settles between their Nernst potentials — the most permeable ion wins; derive the Goldman equation and connect it to the action potential</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_11.html">
          <strong>Lesson 11 — Macro vs Micro Currents</strong>
          <span>Individual channels gate stochastically (Markov); smooth macroscopic currents emerge from summing many independent binary switches</span>
        </a>
      </div>
    </section>
  </div>
`;

initThemeToggle(document.querySelector<HTMLButtonElement>('#theme-toggle')!);
