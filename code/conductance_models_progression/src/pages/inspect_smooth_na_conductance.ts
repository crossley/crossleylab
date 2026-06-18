import { renderLessonPage } from './conductance_models_common';

renderLessonPage({
  slug: 'inspect_smooth_na_conductance',
  title: 'Lesson 3 — Smooth Voltage-Dependent Na Conductance',
  eyebrow:
    'Sodium conductance now depends smoothly on voltage, creating positive feedback when the membrane depolarizes.',
  intro:
    'Instead of holding sodium conductance constant, this model lets g_Na rise sigmoidally with membrane potential. That means stronger depolarization recruits more inward sodium current, which can sharpen the voltage response without yet introducing explicit gating variables.',
  previousStep:
    'Lesson 2 used fixed conductances. Here sodium conductance becomes state dependent: voltage changes g_Na, and the changed g_Na feeds back onto voltage.',
  equationLabel: 'New Dynamic Ingredient',
  equation: `g_Na(V) = g_Na^max / (1 + exp(-(V - V_half)/slope))

dV/dt = g_K(E_K - V) + g_Na(V)(E_Na - V) + I_ext(t)`,
  modelKind: 'smooth_na',
  pulseAmplitudes: [0.5, 1.0, 2.0, 4.0, 4.865, 5.0],
  defaultParams: {
    T: 10000,
    dt: 1,
    gK: 0.3,
    gNaMax: 1.2,
    vHalfNa: -40,
    slopeNa: 6
  },
  controls: [
    { key: 'T', label: 'Total duration (ms)', min: 3000, max: 20000, step: 500, digits: 0 },
    { key: 'dt', label: 'dt (ms)', min: 0.25, max: 2, step: 0.25, digits: 2 },
    { key: 'gK', label: 'Baseline g_K', min: 0.05, max: 1.0, step: 0.05, digits: 2 },
    { key: 'gNaMax', label: 'g_Na max', min: 0.2, max: 4.0, step: 0.1, digits: 2 },
    { key: 'vHalfNa', label: 'Na V_half (mV)', min: -80, max: 0, step: 1, digits: 0 },
    { key: 'slopeNa', label: 'Na slope', min: 2, max: 15, step: 0.5, digits: 1 }
  ],
  questions: [
    {
      prompt: 'Why can a larger pulse suddenly produce a much steeper depolarization?',
      answer:
        'Because depolarization increases g_Na, and increased g_Na creates even more inward sodium current. That positive feedback amplifies stronger inputs disproportionately.'
    },
    {
      prompt: 'Why is this still not a full action potential model?',
      answer:
        'There is no explicit sodium inactivation and no delayed potassium activation. The model has voltage-dependent amplification, but it lacks the separate recovery mechanisms that shape spike rise and fall.'
    }
  ]
});
