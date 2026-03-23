import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        guide_striatal_model: resolve(__dirname, 'guide_striatal_model.html')
      }
    }
  }
});
