import { mountTwoIonRestingPage } from './emergent_resting_two_ion_common';
import { DEFAULT_NUM_PARTICLES, DEFAULT_POTENTIAL_SCALE, SIM_COLORS } from './sim_shared';

mountTwoIonRestingPage({
  pageId: 'inspect_emergent_resting_potential_fixed_anions',
  title: 'Goldman Equation from Fixed Intracellular Anions (2 ions)',
  subtitle: 'Two-ion resting potential teaching model.',
  subtitlePoints: [
    'Resting voltage reflects diffusion, field effects, and selective permeability together.',
    'Resting potential is closer to the Nernst potential of the ion with higher permeability'
  ],
  withGoldman: true,
  focusMode: 'goldman',
  type1Color: SIM_COLORS.ionB,
  type1Label: 'K+',
  negMarkerLabel: 'Uniform immobile anions',
  eyebrow: 'Selective Membranes and the Emergence of Resting Potential',
  equationGroupLabel: 'Teaching Note',
  equationDescription: 'Na+ and K+ contribute separate electrical effects around uniformly distributed immobile anions, with active transport controlled by Na+/K+ pump strength.',
  canvasTitle: '',
  canvasModeLabel: '',
  particlePanelTitle: '',
  particleHint: '',
  concentrationPanelTitle: '',
  concentrationHint: '',
  tracePanelTitle: '',
  traceHint: '',
  traceTitle: 'Membrane Potential and Goldman Prediction',
  showGoldmanPredictionTrace: false,
  defaultNumParticles: DEFAULT_NUM_PARTICLES,
  defaultElectricStrength: -0.1,
  defaultT: 2200,
  defaultDt: 1,
  defaultNegX: -4,
  goldmanScaleDefault: DEFAULT_POTENTIAL_SCALE,
  defaultType0ChannelWidth: 10,
  defaultType1ChannelWidth: 24,
  defaultType0Permeability: 0.35,
  defaultType1Permeability: 0.65,
  defaultType0Charge: 1,
  defaultType1Charge: 1
});
