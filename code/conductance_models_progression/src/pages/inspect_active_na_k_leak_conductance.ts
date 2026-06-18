import { renderLessonPage } from './conductance_models_common';

renderLessonPage({
  slug: 'inspect_active_na_k_leak_conductance',
  title: 'Lesson 6 — Na + K + Leak Conductance',
  eyebrow:
    'Adding leak current completes the simplified Hodgkin-Huxley-style teaching model and restores a stable return toward rest after the spike.',
  intro:
    'This final page adds a leak conductance with its own reversal potential. The leak term helps set the resting level and gives the model a consistent baseline restorative current alongside active sodium and potassium conductances.',
  previousStep:
    'Lesson 5 had interacting active sodium and potassium channels but no explicit leak path. Adding leak makes the resting state more stable and yields the full depolarize-repolarize-return sequence highlighted in the lecture.',
  equationLabel: 'Full Simplified HH-Style Model',
  equation: `I_Na = g_Na^max m^3 h (V - E_Na)
I_K  = g_K^max n^4 (V - E_K)
I_L  = g_L (V - E_L)

dV/dt = -(I_Na + I_K + I_L) + I_ext(t)`,
  modelKind: 'active_na_k_leak',
  pulseAmplitudes: [0.5, 5.0, 10.0],
  defaultParams: {
    T: 10000,
    dt: 1,
    gKMax: 10,
    gNaMax: 15,
    gL: 0.1,
    EL: -65
  },
  controls: [
    { key: 'T', label: 'Total duration (ms)', min: 3000, max: 20000, step: 500, digits: 0 },
    { key: 'dt', label: 'dt (ms)', min: 0.25, max: 2, step: 0.25, digits: 2 },
    { key: 'gKMax', label: 'g_K max', min: 0.2, max: 20, step: 0.2, digits: 1 },
    { key: 'gNaMax', label: 'g_Na max', min: 0.5, max: 25, step: 0.5, digits: 1 },
    { key: 'gL', label: 'g_L', min: 0.01, max: 1.0, step: 0.01, digits: 2 },
    { key: 'EL', label: 'E_L (mV)', min: -90, max: -40, step: 1, digits: 0 }
  ],
  questions: [
    {
      prompt: 'Why does the leak current matter even though it is small?',
      answer:
        'Leak continuously biases the membrane toward its own reversal potential. That stabilizes the resting state and helps voltage return to baseline after the active conductances relax.'
    },
    {
      prompt: 'Why is this the closest page in the sequence to a Hodgkin-Huxley teaching model?',
      answer:
        'Because it combines sodium activation and inactivation, delayed potassium activation, and a leak pathway in one coupled voltage equation. Those are the core ingredients used to teach the classic action-potential mechanism.'
    }
  ]
});
