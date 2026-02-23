import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        inspect_diffusion_1: resolve(__dirname, 'inspect_diffusion_1.html'),
        inspect_diffusion_2: resolve(__dirname, 'inspect_diffusion_2.html'),
        inspect_diffusion_3: resolve(__dirname, 'inspect_diffusion_3.html'),
        inspect_diffusion_4: resolve(__dirname, 'inspect_diffusion_4.html'),
        inspect_electrochemical_1: resolve(__dirname, 'inspect_electrochemical_1.html'),
        inspect_electrochemical_2: resolve(__dirname, 'inspect_electrochemical_2.html'),
        inspect_electrochemical_3: resolve(__dirname, 'inspect_electrochemical_3.html'),
        inspect_resting_potential_1: resolve(__dirname, 'inspect_resting_potential_1.html'),
        inspect_resting_potential_2: resolve(__dirname, 'inspect_resting_potential_2.html'),
        inspect_resting_potential_3: resolve(__dirname, 'inspect_resting_potential_3.html'),
        inspect_resting_potential_4: resolve(__dirname, 'inspect_resting_potential_4.html')
      }
    }
  }
});
