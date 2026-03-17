import './style.css';
import { lessons } from './lessons';
import type { LessonArc } from './lessons';

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

function lessonCard(lesson: (typeof lessons)[number]): string {
  const isLive = lesson.status === 'active' || lesson.status === 'rebuild';
  if (isLive) {
    return `
      <a class="link-card ready" href="./${lesson.htmlPath}">
        <strong>${lesson.title}</strong>
        <span>${lesson.description}</span>
      </a>`;
  }
  if (lesson.status === 'draft') {
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
        <div class="link-list">${cards}
        </div>
      </section>`;
  })
  .join('');

app.innerHTML = `
  <div class="site-shell">
    <header class="page-head">
      <h1 class="landing-title">Electrochemical Signals in Nerve Cells</h1>
      <p class="eyebrow">A step-by-step journey from Brownian motion through the action potential. Each simulation is interactive — pause, adjust parameters, and explore.</p>
    </header>

    ${groupedCardsHtml}
  </div>
`;
