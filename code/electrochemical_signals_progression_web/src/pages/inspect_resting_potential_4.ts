import { mountTwoIonRestingPage } from './resting_two_ion_common';

mountTwoIonRestingPage({
  pageId: 'inspect_resting_potential_4',
  title: 'Two-Ion Selective Permeability + Goldman Overlay',
  subtitle: 'Two-ion model with a negative charge wall field and a Goldman-style permeability-weighted log-ratio prediction overlay.',
  fieldMode: 'wall',
  withGoldman: true,
  type1Color: '#72ffb2',
  type1Label: 'Ion B (-)',
  negMarkerLabel: 'Negative charge wall',
  defaultNumParticles: 120,
  defaultRepulsionStrength: 0.05,
  defaultElectricStrength: 0.1,
  defaultT: 2200,
  defaultDt: 1,
  defaultNegX: -45,
  goldmanScaleDefault: 20
});
