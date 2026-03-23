import './style.css';
import { initializeTheme } from './theme';
import { initializeCodeCopy } from './code_copy';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app root');
}

app.innerHTML = `
<div class="site-shell">
  <div class="nav-line">
    <span></span>
    <button type="button" class="theme-toggle" data-theme-toggle aria-label="Toggle color theme"></button>
  </div>

  <header class="page-head">
    <p class="eyebrow">Crossley Lab Tutorial</p>
    <h1>Striatal Reservoir Model</h1>
    <p>
      A full teaching walkthrough of <code>striatal_model.py</code>, including a
      from-scratch implementation path and visual diagnostics for category
      learning, reversal, and representational change.
    </p>
  </header>

  <section class="panel lesson-group">
    <h2 class="section-title">Instructional Guide</h2>
    <p class="arc-description">
      One long-form, code-first lesson with parity checkpoints against the model
      implementation used in the simulation repo.
    </p>
    <div class="link-list">
      <a class="link-card ready" href="./guide_striatal_model.html">
        <strong>Build the Model from Scratch</strong>
        <span>
          Encoder tuning, reservoir competition, dopamine-like learning rule,
          reversal protocols, and the plotting/diagnostic stack.
        </span>
      </a>
    </div>
  </section>
</div>
`;

initializeTheme();
initializeCodeCopy();
