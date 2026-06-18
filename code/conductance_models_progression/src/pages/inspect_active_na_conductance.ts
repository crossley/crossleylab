import { renderLessonPage } from './conductance_models_common';

renderLessonPage({
  slug: 'inspect_active_na_conductance',
  title: 'Lesson 4 — Na Activation + Inactivation',
  eyebrow:
    'Sodium channels now open through m and close through h, so inward sodium current can rise and then collapse during sustained input.',
  intro:
    'This page moves from an abstract smooth nonlinearity to explicit channel-state dynamics. Activation m increases quickly with depolarization, while inactivation h decreases, allowing sodium current to turn on and then self-limit.',
  previousStep:
    'Lesson 3 let voltage modulate sodium conductance instantaneously. Here sodium conductance is built from evolving gating variables, giving the model memory and transient dynamics.',
  equationLabel: 'Gating-Variable Model',
  equation: `I_Na = g_Na^max m^3 h (E_Na - V)

dm/dt = (m_inf(V) - m) / tau_m(V)
dh/dt = (h_inf(V) - h) / tau_h(V)

dV/dt = I_Na + I_K + I_ext(t)`,
  modelKind: 'active_na',
  pulseAmplitudes: [0.5, 5.0, 20.0, 50.0],
  defaultParams: {
    T: 10000,
    dt: 1,
    gK: 0.3,
    gNaMax: 1.2,
    KIn: 140,
    NaOut: 145
  },
  controls: [
    { key: 'T', label: 'Total duration (ms)', min: 3000, max: 20000, step: 500, digits: 0 },
    { key: 'dt', label: 'dt (ms)', min: 0.25, max: 2, step: 0.25, digits: 2 },
    { key: 'gK', label: 'Passive g_K', min: 0.05, max: 1.0, step: 0.05, digits: 2 },
    { key: 'gNaMax', label: 'g_Na max', min: 0.5, max: 4.0, step: 0.1, digits: 2 },
    { key: 'KIn', label: '[K+] inside (mM)', min: 20, max: 200, step: 1, digits: 0 },
    { key: 'NaOut', label: '[Na+] outside (mM)', min: 20, max: 200, step: 1, digits: 0 }
  ],
  questions: [
    {
      prompt: 'Why does sodium current fall even if the input pulse is still on?',
      answer:
        'Because h inactivates sodium channels. Even while depolarization keeps activation high, the decreasing h term reduces effective sodium conductance and collapses the inward current.'
    },
    {
      prompt: 'What new behavior do the m and h traces add that the smooth model lacked?',
      answer:
        'They separate fast activation from slower shutoff. That creates a transient sodium burst with a rise and fall over time, not just an instantaneous voltage-dependent scaling.'
    }
  ]
});
