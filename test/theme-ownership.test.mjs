import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspect} from '../tools/architecture-dashboard/src/inspector.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apps = [
  'starter-apps/Tab Bar App',
  'starter-apps/Remote List',
  'starter-apps/Habit Tracker',
  'starter-apps/Habit Tracker Pro',
  'starter-apps/Todays Twenty'
];

test('shipped CFA starters retain one View-layer theme owner and no model theme state', async () => {
  for (const app of apps) {
    const project = path.join(root, app);
    const report = await inspect(project);
    const themeFindings = report.findings.filter(item => item.code.startsWith('theme-') || item.code === 'writable-theme-environment');
    assert.deepEqual(themeFindings, [], app);
    const themeManagers = report.projectFilePaths.filter(file => file.endsWith('1 - View/Theme/ThemeManager.swift'));
    assert.equal(themeManagers.length, 1, app);
    const source = fs.readFileSync(path.join(project, themeManagers[0]), 'utf8');
    assert.match(source, /UserDefaults/);
    assert.match(source, /didSet/);
  }
});
