import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createCFAProject, starters } from '../scripts/create-cfa-project.mjs';

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
