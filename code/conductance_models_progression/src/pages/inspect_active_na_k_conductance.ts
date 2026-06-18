import { renderLessonPage } from './conductance_models_common';

renderLessonPage({
  slug: 'inspect_active_na_k_conductance',
  title: 'Lesson 5 — Active Na + K Conductance',
  eyebrow:
    'Delayed potassium activation adds an opposing outward current that helps terminate depolarization and shape a spike-like waveform.',
  intro:
    'The final missing active ingredient is potassium activation n. Sodium still provides the rapid inward drive, but potassium now activates more slowly and builds the outward current that restores the membrane after depolarization.',
  previousStep:
    'Lesson 4 had dynamic sodium but only a passive potassium term. This page upgrades potassium into an explicitly gated active conductance, which creates the classic competition behind spike generation.',
  equationLabel: 'Coupled Na/K Conductance Model',
  equation: `I_Na = g_Na^max m^3 h (E_Na - V)
I_K  = g_K^max n^4 (E_K - V)

dm/dt = (m_inf(V) - m) / tau_m(V)
dh/dt = (h_inf(V) - h) / tau_h(V)
dn/dt = (n_inf(V) - n) / tau_n(V)

dV/dt = I_Na + I_K + I_ext(t)`,
  modelKind: 'active_na_k',
  pulseAmplitudes: [0.5, 5.0, 20.0, 50.0],
  defaultParams: {
    T: 10000,
    dt: 1,
    gKMax: 0.3,
    gNaMax: 1.2,
    KOut: 5,
    NaOut: 145
  },
  controls: [
    { key: 'T', label: 'Total duration (ms)', min: 3000, max: 20000, step: 500, digits: 0 },
    { key: 'dt', label: 'dt (ms)', min: 0.25, max: 2, step: 0.25, digits: 2 },
    { key: 'gKMax', label: 'g_K max', min: 0.2, max: 20, step: 0.2, digits: 1 },
    { key: 'gNaMax', label: 'g_Na max', min: 0.5, max: 20, step: 0.5, digits: 1 },
    { key: 'KOut', label: '[K+] outside (mM)', min: 1, max: 50, step: 1, digits: 0 },
    { key: 'NaOut', label: '[Na+] outside (mM)', min: 20, max: 200, step: 1, digits: 0 }
  ],
  questions: [
    {
      prompt: 'Why does adding n make the voltage waveform more spike-like?',
      answer:
        'Because potassium activation is delayed relative to sodium activation. Sodium can drive a rapid upswing first, then potassium catches up and provides the strong outward current that repolarizes the membrane.'
    },
    {
      prompt: 'What would happen if g_K max were made very small?',
      answer:
        'Repolarization would weaken and slow down. The membrane would remain depolarized longer because the model would lack a strong delayed outward current to oppose sodium-driven depolarization.'
    }
  ]
});
