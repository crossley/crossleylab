import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LESSONS_PATH = path.join(ROOT, 'src', 'lessons.json');

/** @type {Array<Record<string, unknown>>} */
const lessonsRaw = JSON.parse(fs.readFileSync(LESSONS_PATH, 'utf8'));
const lessons = lessonsRaw.filter((lesson) => lesson.status === 'active');
const validUnits = new Set(['diffusion', 'membrane_potential_emergent', 'action_potential']);
const validStatuses = new Set(['active', 'draft', 'archived']);

const errors = [];

const pushDupErrors = (label, values) => {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`Duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
};

for (const [idx, lesson] of lessons.entries()) {
  const label = `lessons[${idx}]`;
  for (const key of ['id', 'title', 'description', 'htmlPath', 'tsEntry', 'unit', 'order', 'status']) {
    if (!(key in lesson)) errors.push(`Missing ${key} in ${label}`);
  }
  if (typeof lesson.id !== 'string' || !/^inspect_[a-z0-9_]+$/.test(lesson.id)) {
    errors.push(`Invalid lesson id at ${label}: ${String(lesson.id)}`);
  }
  if (typeof lesson.htmlPath !== 'string' || !/^inspect_[a-z0-9_]+\.html$/.test(lesson.htmlPath)) {
    errors.push(`Invalid htmlPath at ${label}: ${String(lesson.htmlPath)}`);
  }
  if (typeof lesson.tsEntry !== 'string' || !/^src\/pages\/inspect_[a-z0-9_]+\.ts$/.test(lesson.tsEntry)) {
    errors.push(`Invalid tsEntry at ${label}: ${String(lesson.tsEntry)}`);
  }
  if (typeof lesson.unit !== 'string' || !validUnits.has(lesson.unit)) {
    errors.push(`Invalid unit at ${label}: ${String(lesson.unit)}`);
  }
  if (typeof lesson.status !== 'string' || !validStatuses.has(lesson.status)) {
    errors.push(`Invalid status at ${label}: ${String(lesson.status)}`);
  }

  const htmlAbs = path.join(ROOT, String(lesson.htmlPath));
  const tsAbs = path.join(ROOT, String(lesson.tsEntry));
  if (!fs.existsSync(htmlAbs)) errors.push(`Missing lesson HTML file: ${lesson.htmlPath}`);
  if (!fs.existsSync(tsAbs)) errors.push(`Missing lesson TS file: ${lesson.tsEntry}`);

  if (fs.existsSync(htmlAbs)) {
    const html = fs.readFileSync(htmlAbs, 'utf8');
    const match = html.match(/<script[^>]*type=\"module\"[^>]*src=\"([^\"]+)\"/i);
    if (!match) {
      errors.push(`No module script tag found in ${lesson.htmlPath}`);
    } else {
      const expected = `/${lesson.tsEntry}`;
      if (match[1] !== expected) {
        errors.push(`Module script mismatch in ${lesson.htmlPath}: expected ${expected}, found ${match[1]}`);
      }
    }
  }
}

pushDupErrors('lesson id', lessons.map((lesson) => String(lesson.id)));
pushDupErrors('lesson htmlPath', lessons.map((lesson) => String(lesson.htmlPath)));
pushDupErrors('lesson tsEntry', lessons.map((lesson) => String(lesson.tsEntry)));
pushDupErrors('lesson order', lessons.map((lesson) => String(lesson.order)));

const listedHtml = lessons.map((lesson) => String(lesson.htmlPath)).sort();
const listedTs = lessons.map((lesson) => path.basename(String(lesson.tsEntry))).sort();

const repoHtml = fs
  .readdirSync(ROOT)
  .filter((name) => /^inspect_[a-z0-9_]+\.html$/.test(name))
  .sort();

const repoTs = fs
  .readdirSync(path.join(ROOT, 'src', 'pages'))
  .filter((name) => /^inspect_[a-z0-9_]+\.ts$/.test(name))
  .sort();

for (const html of repoHtml) {
  if (!listedHtml.includes(html)) errors.push(`HTML exists but not in lessons.json: ${html}`);
}
for (const html of listedHtml) {
  if (!repoHtml.includes(html)) errors.push(`lessons.json references missing HTML: ${html}`);
}
for (const ts of repoTs) {
  if (!listedTs.includes(ts)) errors.push(`TS entry exists but not in lessons.json: src/pages/${ts}`);
}
for (const ts of listedTs) {
  if (!repoTs.includes(ts)) errors.push(`lessons.json references missing TS: src/pages/${ts}`);
}

if (errors.length > 0) {
  console.error('check-pages failed with the following issues:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`check-pages passed: ${lessons.length} active lessons validated.`);
