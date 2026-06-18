import { renderLessonPage } from './conductance_models_common';

renderLessonPage({
  slug: 'inspect_passive_two_ion',
  title: 'Lesson 2 — Passive Na + K Dynamics',
  eyebrow:
    'Adding a constant sodium conductance shifts the resting voltage away from E_K and toward a conductance-weighted balance.',
  intro:
    'Now the membrane is influenced by two ionic driving forces at once. Potassium still pulls voltage toward E_K, sodium pulls toward E_Na, and the observed resting level sits between them according to the relative conductances.',
  previousStep:
    'Compared with Lesson 1, the membrane is no longer controlled by a single restoring current. Constant sodium conductance means the resting state is now a balance point rather than pure relaxation to E_K.',
  equationLabel: 'Governing Equation',
  equation: `dV/dt = g_K(E_K - V) + g_Na(E_Na - V) + I_ext(t)`,
  modelKind: 'passive_two_ion',
  pulseAmplitudes: [0.5, 1.0, 2.0, 3.0],
  defaultParams: {
    T: 10000,
    dt: 1,
    gK: 0.3,
    gNa: 0.1,
    KIn: 140,
    KOut: 5,
    NaIn: 15,
    NaOut: 145
  },
  controls: [
    { key: 'T', label: 'Total duration (ms)', min: 3000, max: 20000, step: 500, digits: 0 },
    { key: 'dt', label: 'dt (ms)', min: 0.25, max: 2, step: 0.25, digits: 2 },
    { key: 'gK', label: 'g_K', min: 0.05, max: 1.5, step: 0.05, digits: 2 },
    { key: 'gNa', label: 'g_Na', min: 0.01, max: 1.0, step: 0.01, digits: 2 },
    { key: 'KIn', label: '[K+] inside (mM)', min: 20, max: 200, step: 1, digits: 0 },
    { key: 'KOut', label: '[K+] outside (mM)', min: 1, max: 50, step: 1, digits: 0 },
    { key: 'NaIn', label: '[Na+] inside (mM)', min: 1, max: 80, step: 1, digits: 0 },
    { key: 'NaOut', label: '[Na+] outside (mM)', min: 20, max: 200, step: 1, digits: 0 }
  ],
  questions: [
    {
      prompt: 'Why does the resting voltage move when you increase g_Na?',
      answer:
        'Because sodium now contributes more strongly to the total membrane current. The zero-current balance shifts toward E_Na, so the membrane rests at a less negative voltage.'
    },
    {
      prompt: 'Why is the membrane still stable even with two currents?',
      answer:
        'Both currents are restorative around the balance point. If voltage moves too negative or too positive, the combined Na and K driving forces push it back toward the weighted equilibrium.'
    }
  ]
});
