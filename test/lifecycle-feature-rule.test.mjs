import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

test('the canonical CFA specification prohibits lifecycle-labelled Features', () => {
  const specification = fs.readFileSync(path.join(root, 'architecture/cfa-specification.md'), 'utf8');
  assert.match(specification, /Application lifecycle is not a Feature\./);
  assert.match(specification, /AppLifecycleFeature/);
  assert.match(specification, /system delivery boundaries, not product capabilities/);
});

test('portable project guidance rejects a lifecycle catch-all owner', () => {
  const guidance = fs.readFileSync(path.join(root, 'templates/project-guidance/AGENTS.md'), 'utf8');
  assert.match(guidance, /Do not model application lifecycle as a Feature\./);
  assert.match(guidance, /AppLifecycleFeature/);
});
