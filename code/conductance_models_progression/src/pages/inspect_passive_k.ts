import { renderLessonPage } from './conductance_models_common';

renderLessonPage({
  slug: 'inspect_passive_k',
  title: 'Lesson 1 — Passive Potassium Dynamics',
  eyebrow:
    'A single passive potassium current pulls the membrane back toward the potassium Nernst potential after current injection.',
  intro:
    'This is the simplest membrane model in the sequence. Voltage changes because there is one restoring current, carried by K+, and one external drive, I_ext. Euler’s method is enough to show how a membrane can be displaced from equilibrium and then relax back.',
  previousStep:
    'There is no previous conductance model yet. This page establishes the baseline idea that a membrane can be modeled as a first-order dynamical system with a stable fixed point at E_K.',
  equationLabel: 'Governing Equation',
  equation: `dV/dt = (E_K - V) / tau + I_ext(t)`,
  modelKind: 'passive_k',
  pulseAmplitudes: [0.5, 1.0, 2.0, 3.0],
  defaultParams: {
    T: 10000,
    dt: 1,
    tau: 10,
    KIn: 140,
    KOut: 5
  },
  controls: [
    { key: 'T', label: 'Total duration (ms)', min: 3000, max: 20000, step: 500, digits: 0 },
    { key: 'dt', label: 'dt (ms)', min: 0.25, max: 2, step: 0.25, digits: 2 },
    { key: 'tau', label: 'Membrane time constant tau', min: 2, max: 30, step: 0.5, digits: 1 },
    { key: 'KIn', label: '[K+] inside (mM)', min: 20, max: 200, step: 1, digits: 0 },
    { key: 'KOut', label: '[K+] outside (mM)', min: 1, max: 50, step: 1, digits: 0 }
  ],
  questions: [
    {
      prompt: 'Why does the trace relax back toward E_K after the pulse ends?',
      answer:
        'Because in this model potassium is the only membrane current. Once the external drive is removed, the sign of E_K - V determines the restoring current and pushes voltage back toward the potassium equilibrium potential.'
    },
    {
      prompt: 'What does increasing tau do to the membrane response?',
      answer:
        'A larger tau slows the passive return toward equilibrium. Depolarization and recovery both become more gradual because the same driving difference changes voltage less rapidly per unit time.'
    }
  ]
});
