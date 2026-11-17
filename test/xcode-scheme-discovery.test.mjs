import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  discoverContainer,
  discoverScheme,
  listCommand,
  schemesFromList,
  selectScheme,
  validationCommand
} from '../scripts/xcode-scheme-discovery.mjs';
import { root, sync } from '../scripts/sync.mjs';
import { skills } from '../scripts/skill-names.mjs';

function withProject(entries, run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-xcode-schemes-'));
  try {
    for (const entry of entries) fs.mkdirSync(path.join(directory, entry));
    return run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('prefers the only workspace and lists schemes through that container', () => {
  withProject(['App.xcodeproj', 'App.xcworkspace'], projectRoot => {
    const container = discoverContainer(projectRoot);
    assert.deepEqual(container, { flag: '-workspace', path: path.join(projectRoot, 'App.xcworkspace') });
    assert.deepEqual(listCommand(container), ['xcodebuild', '-list', '-json', '-workspace', path.join(projectRoot, 'App.xcworkspace')]);
  });
});

test('refuses ambiguous or absent Xcode containers', () => {
  withProject(['One.xcodeproj', 'Two.xcodeproj'], projectRoot => {
    assert.throws(() => discoverContainer(projectRoot), /multiple.*project|Choose exactly one/i);
  });
  withProject(['One.xcworkspace', 'Two.xcworkspace'], projectRoot => {
    assert.throws(() => discoverContainer(projectRoot), /multiple Xcode workspaces/i);
  });
  withProject([], projectRoot => {
    assert.throws(() => discoverContainer(projectRoot), /Found none.*no project was guessed/i);
  });
});

test('selects only a discovered scheme and never guesses an ambiguous one', () => {
  assert.equal(selectScheme(['App'], undefined), 'App');
  assert.equal(selectScheme(['App', 'AppTests'], 'AppTests'), 'AppTests');
  assert.throws(() => selectScheme(['App'], 'Invented'), /not in xcodebuild's discovered schemes.*Do not substitute/i);
  assert.throws(() => selectScheme(['App', 'AppTests'], undefined), /Multiple schemes.*no scheme was guessed/i);
  assert.throws(() => selectScheme([], undefined), /reported no schemes/i);
  assert.deepEqual(schemesFromList({ workspace: { schemes: ['App', 'App'] } }), ['App']);
  assert.throws(() => schemesFromList({ project: {} }), /did not return a usable schemes list/i);
});

test('discovery uses xcodebuild JSON and preserves the selected scheme for validation', () => {
  withProject(['App.xcodeproj'], projectRoot => {
    const calls = [];
    const run = (executable, argumentsList) => {
      calls.push([executable, argumentsList]);
      return { status: 0, stdout: JSON.stringify({ project: { schemes: ['Actual App'] } }), stderr: '' };
    };
    const discovered = discoverScheme(projectRoot, { requestedScheme: 'Actual App', run });
    assert.equal(discovered.scheme, 'Actual App');
    assert.deepEqual(calls, [['xcodebuild', ['-list', '-json', '-project', path.join(projectRoot, 'App.xcodeproj')]]]);
    assert.deepEqual(validationCommand({ ...discovered, action: 'test', destination: 'platform=iOS Simulator,name=iPhone 17,OS=latest' }), [
      'xcodebuild', '-project', path.join(projectRoot, 'App.xcodeproj'), '-scheme', 'Actual App',
      '-destination', 'platform=iOS Simulator,name=iPhone 17,OS=latest', 'test', '-dry-run'
    ]);
  });
});

test('requires an explicit destination for test and presentation validation', () => {
  const container = { flag: '-project', path: '/tmp/App.xcodeproj' };
  assert.throws(() => validationCommand({ container, scheme: 'App', action: 'test' }), /require an explicit validated simulator destination/i);
  assert.throws(() => validationCommand({ container, scheme: 'App', action: 'presentation' }), /require an explicit validated simulator destination/i);
  assert.deepEqual(validationCommand({ container, scheme: 'App', action: 'build' }), ['xcodebuild', '-project', '/tmp/App.xcodeproj', '-scheme', 'App', 'build', '-dry-run']);
});

test('scheme safeguards are present in every bundled workflow and generated project guidance', () => {
  sync(root, { skipXcodeProjects: true });
  const workflow = fs.readFileSync(path.join(root, 'architecture/project-workflow.md'), 'utf8');
  for (const skill of skills) {
    assert.equal(fs.readFileSync(path.join(root, 'skills', skill, 'references/project-workflow.md'), 'utf8'), workflow, skill);
  }
  assert.match(workflow, /xcodebuild -list -json/);
  assert.match(workflow, /Never manufacture a name or\s+silently switch to an unrelated scheme/);
  assert.match(fs.readFileSync(path.join(root, 'templates/project-guidance/AGENTS.md'), 'utf8'), /Do not derive, invent, or substitute a\s+scheme/);
});
