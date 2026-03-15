#!/usr/bin/env node
import { execSync } from 'node:child_process';

const steps = [
  { name: 'Lint', cmd: 'npm run lint' },
  { name: 'Check pages', cmd: 'npm run check-pages' },
  { name: 'Build', cmd: 'npm run build' }
];

for (const step of steps) {
  console.log(`\n==> ${step.name}`);
  try {
    execSync(step.cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`\nDeploy check failed at step: ${step.name}`);
    process.exit(typeof error?.status === 'number' ? error.status : 1);
  }
}

console.log('\nDeploy check passed.');
console.log('GitHub Pages publish path: /crossleylab/electrochemical-signals/');
console.log('Publisher workflow: ../../.github/workflows/pages.yml');
console.log('Trigger deploy by pushing your commit to origin/main.');
