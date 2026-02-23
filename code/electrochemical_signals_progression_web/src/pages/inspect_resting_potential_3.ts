import { mountTwoIonRestingPage } from './resting_two_ion_common';

mountTwoIonRestingPage({
  pageId: 'inspect_resting_potential_3',
  title: 'Two-Ion Selective Permeability (Negative Charge Wall)',
  subtitle: 'Two-ion model with a horizontal electric drift from a negative charge wall (no vertical electrical component) plus per-ion and total imbalance traces.',
  fieldMode: 'wall',
  withGoldman: false,
  type1Color: '#72ffb2',
  type1Label: 'Ion B (-)',
  negMarkerLabel: 'Negative charge wall',
  defaultNumParticles: 140,
  defaultRepulsionStrength: 0.01,
  defaultElectricStrength: 0.1,
  defaultT: 2200,
  defaultDt: 1,
  defaultNegX: -45
});
