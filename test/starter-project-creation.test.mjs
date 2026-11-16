import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createCFAProject, starters } from '../scripts/create-cfa-project.mjs';
import { verifyStarterProjects } from '../scripts/verify-starter-projects.mjs';

function withTemporaryDirectory(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-starter-'));
  try { run(directory); } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

test('every supported starter creates an independently named Xcode project', () => {
  for (const [starterName, starter] of Object.entries(starters)) {
    withTemporaryDirectory(directory => {
      const name = `Created${starterName.replaceAll('-', '')}`;
      const output = path.join(directory, name);
      createCFAProject({ starterName, name, out: output });

      const project = path.join(output, `${name}.xcodeproj`, 'project.pbxproj');
      assert.equal(fs.existsSync(project), true, starterName);
      execFileSync('plutil', ['-lint', project]);
      const projectContents = fs.readFileSync(project, 'utf8');
      assert.match(projectContents, new RegExp(`PRODUCT_BUNDLE_IDENTIFIER = com\\.3DaysOfSwiftConcurrency\\.${name};`));
      assert.match(projectContents, new RegExp(`PRODUCT_BUNDLE_IDENTIFIER = com\\.3DaysOfSwiftConcurrency\\.${name}\\.${name}Tests;`));
      assert.doesNotMatch(projectContents, new RegExp(starter.codeName));
      assert.equal(fs.existsSync(path.join(output, name)), true, starterName);
      assert.equal(fs.existsSync(path.join(output, `${name}Tests`)), true, starterName);
      assert.match(fs.readFileSync(path.join(output, 'AGENTS.md'), 'utf8'), /ARCHITECTURE\.md/);
      assert.match(fs.readFileSync(path.join(output, 'ARCHITECTURE.md'), 'utf8'), /authoritative architecture/);
      assert.match(fs.readFileSync(path.join(output, 'CLAUDE.md'), 'utf8'), /AGENTS\.md/);
      assert.match(fs.readFileSync(path.join(output, '.cursor/rules/cfa-architecture.mdc'), 'utf8'), /alwaysApply: true/);
      for (const skill of ['cfa-app-creation', 'cfa-feature-work', 'cfa-unit-tests', 'swift-code-quality']) {
        assert.equal(fs.existsSync(path.join(output, '.agents/skills', skill, 'SKILL.md')), true, `${starterName}: ${skill}`);
      }
    });
  }
});

test('starter creation rejects unsafe names and existing destinations', () => {
  withTemporaryDirectory(directory => {
    assert.throws(() => createCFAProject({ name: 'Not Safe', out: path.join(directory, 'bad') }), /Invalid app name/);
    const output = path.join(directory, 'Existing');
    fs.mkdirSync(output);
    assert.throws(() => createCFAProject({ name: 'Existing', out: output }), /Destination already exists/);
  });
});

test('the default foundation project includes the required CFA composition', () => {
  withTemporaryDirectory(directory => {
    const output = path.join(directory, 'FoundationProject');
    createCFAProject({ name: 'FoundationProject', out: output });
    const app = path.join(output, 'FoundationProject');

    for (const folder of ['1 - View', '2 - AppModel', '3 - App Resources', '4 - Swift Extensions']) {
      assert.equal(fs.existsSync(path.join(app, folder)), true, folder);
    }

    const appModel = fs.readFileSync(path.join(app, '2 - AppModel', 'AppModel.swift'), 'utf8');
    assert.match(appModel, /final class AppModel/);
    assert.match(appModel, /settingsFeature: SettingsFeature/);
    assert.equal(fs.existsSync(path.join(output, 'FoundationProjectTests', 'FeatureTests', 'SettingsFeatureTests.swift')), true);
  });
});

test('every generated starter project has parseable Swift source', () => {
  assert.equal(verifyStarterProjects(), true);
});
