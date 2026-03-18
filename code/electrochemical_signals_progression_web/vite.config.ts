import { resolve } from 'node:path';
import { defineConfig } from 'vite';

import lessonsData from './src/lessons.json';

const lessonInputs = Object.fromEntries(
  lessonsData
    .filter((lesson) => lesson.status === 'active')
    .map((lesson) => [lesson.id, resolve(__dirname, lesson.htmlPath)])
);

const guideInputs = {
  guide_lesson_01: resolve(__dirname, 'guide_lesson_01.html'),
  guide_lesson_02: resolve(__dirname, 'guide_lesson_02.html'),
  guide_lesson_03: resolve(__dirname, 'guide_lesson_03.html'),
  guide_lesson_04: resolve(__dirname, 'guide_lesson_04.html'),
  guide_lesson_05: resolve(__dirname, 'guide_lesson_05.html'),
  guide_lesson_06: resolve(__dirname, 'guide_lesson_06.html'),
  guide_lesson_07: resolve(__dirname, 'guide_lesson_07.html'),
  guide_lesson_08: resolve(__dirname, 'guide_lesson_08.html'),
  guide_lesson_09: resolve(__dirname, 'guide_lesson_09.html'),
  guide_lesson_10: resolve(__dirname, 'guide_lesson_10.html'),
  guide_lesson_11: resolve(__dirname, 'guide_lesson_11.html')
};

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        ...lessonInputs,
        ...guideInputs
      }
    }
  }
});
