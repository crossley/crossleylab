import { mountTwoIonRestingPage } from './resting_two_ion_common';

mountTwoIonRestingPage({
  pageId: 'inspect_resting_potential_2',
  title: 'Two-Ion Selective Permeability (Point Attractor)',
  subtitle: 'Two ion types with opposite charge signs, selective channels, electrical drift toward a point attractor, and per-ion + total imbalance traces.',
  fieldMode: 'point',
  withGoldman: false,
  type1Color: '#42c8ff',
  type1Label: 'Ion B (-)',
  negMarkerLabel: 'Negative attractor',
  defaultNumParticles: 120,
  defaultRepulsionStrength: 0.05,
  defaultElectricStrength: 0.1,
  defaultT: 2000,
  defaultDt: 1,
  defaultNegX: -30
});
