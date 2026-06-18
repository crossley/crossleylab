import './style.css';
import { applyStoredTheme, initThemeToggle } from './theme';
import { lessons } from './lessons';

applyStoredTheme();

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app root');
}

const lessonCards = lessons
  .filter((lesson) => lesson.status === 'active')
  .map(
    (lesson) => `
      <a class="link-card ready" href="./${lesson.htmlPath}">
        <strong>${lesson.title}</strong>
        <span>${lesson.description}</span>
      </a>`
  )
  .join('');

app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>

    <header class="page-head">
      <p class="teaching-label">COGS3020 Week 06</p>
      <h1 class="landing-title">Conductance Models Progression</h1>
      <p class="eyebrow">
        A browser-based progression from passive membrane dynamics to a simplified
        Hodgkin-Huxley-style action potential. Each lesson keeps the same Euler-method
        simulation frame while adding one new biophysical idea.
      </p>
      <ul class="key-points">
        <li>Start with a single passive potassium current and external input.</li>
        <li>Add sodium, then voltage-dependent sodium activation, then sodium inactivation.</li>
        <li>Finish with delayed potassium activation and leak current to recover full spike dynamics.</li>
      </ul>
    </header>

    <section class="panel lesson-group">
      <h2 class="section-title">Arc 1 — From Passive Membranes to Spiking Conductances</h2>
      <p class="arc-description">
        The model family is intentionally pedagogical. Each page mirrors the Week 06 lecture
        progression and preserves its simplified assumptions rather than jumping straight to a
        fully canonical Hodgkin-Huxley implementation.
      </p>
      <div class="link-list">${lessonCards}</div>
    </section>
  </div>
`;

initThemeToggle(document.querySelector<HTMLButtonElement>('#theme-toggle')!);
