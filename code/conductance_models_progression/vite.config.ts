import { resolve } from 'node:path';
import { defineConfig } from 'vite';

import lessonsData from './src/lessons.json';

const lessonInputs = Object.fromEntries(
  lessonsData
    .filter((lesson) => lesson.status === 'active')
    .map((lesson) => [lesson.id, resolve(__dirname, lesson.htmlPath)])
);

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        ...lessonInputs
      }
    }
  }
});
