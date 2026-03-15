import './style.css';
import { lessons } from './lessons';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app root');
}

const unitOrder = ['diffusion', 'membrane_potential_emergent', 'action_potential'] as const;
const unitLabels: Record<(typeof unitOrder)[number], string> = {
  diffusion: 'Diffusion Foundations',
  membrane_potential_emergent: 'Electrical Forces and Membrane Potential from Emergent Membrane Charge Separation',
  action_potential: 'Action Potentials'
};

const groupedCardsHtml = unitOrder
  .map((unit) => {
    const unitLessons = lessons.filter((lesson) => lesson.status === 'active' && lesson.unit === unit);
    if (unitLessons.length === 0) return '';
    const cards = unitLessons
      .map(
        (lesson) => `
          <a class="link-card ready" href="./${lesson.htmlPath}">
            <strong>${lesson.title}</strong>
            <span>${lesson.description}</span>
          </a>`
      )
      .join('');
    return `
      <section class="panel lesson-group">
        <h2 class="section-title">${unitLabels[unit]}</h2>
        <div class="link-list">${cards}
        </div>
      </section>`;
  })
  .join('');

app.innerHTML = `
  <div class="site-shell">
    <header class="page-head">
      <h1 class="landing-title">Electrochemical Signals Progression</h1>
      <p class="eyebrow">A teaching sequence that moves from diffusion, to membrane transport, to electrical attraction, to membrane potential and resting potential, and then to emergent membrane-charge separation models.</p>
    </header>

    ${groupedCardsHtml}
  </div>
`;
