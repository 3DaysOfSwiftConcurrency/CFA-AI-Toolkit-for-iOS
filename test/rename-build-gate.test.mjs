import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyRenameBuild, checkRenameBuild } from '../skills/enhanced-code-readability/scripts/rename-build-gate.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-rename-build-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'Example.xcodeproj'));
  fs.writeFileSync(path.join(root, 'Example.xcodeproj/project.pbxproj'), 'project');
  fs.writeFileSync(path.join(root, 'Feature.swift'), 'func fetchCurrentUser() {}\n');
  return { root, evidencePath: path.join(root, 'READABILITY_BUILD_EVIDENCE.json') };
}

function xcode(runBuild = () => ({ status: 0, stdout: '', stderr: '' })) {
  const calls = [];
  const run = (executable, args) => {
    assert.equal(executable, 'xcodebuild');
    calls.push(args);
    if (args.includes('-list')) return { status: 0, stdout: JSON.stringify({ project: { schemes: ['Example'] } }), stderr: '' };
    return runBuild(args);
  };
  return { calls, run };
}

test('rename checkpoint requires a real build and is invalidated by a later source edit', t => {
  const { root, evidencePath } = fixture(t);
  const { calls, run } = xcode();
  const options = { root, evidencePath, scheme: 'Example', destination: 'generic/platform=iOS Simulator', run };
  const evidence = verifyRenameBuild(options);
  assert.equal(evidence.status, 'verified');
  assert.equal(calls.length, 3);
  assert.ok(calls[1].includes('-dry-run'));
  assert.ok(calls[2].includes('build'));
  assert.equal(checkRenameBuild({ root, evidencePath }).source.sha256, evidence.source.sha256);
  fs.appendFileSync(path.join(root, 'Feature.swift'), 'func requestGraphUser() {}\n');
  assert.throws(() => checkRenameBuild({ root, evidencePath }), /does not match the final source/);
});

test('a failed rebuild removes old success and cannot mark the rename verified', t => {
  const { root, evidencePath } = fixture(t);
  const options = { root, evidencePath, scheme: 'Example', destination: 'generic/platform=iOS Simulator' };
  verifyRenameBuild({ ...options, run: xcode().run });
  const failing = xcode(args => ({ status: args.includes('-dry-run') ? 0 : 65, stdout: '', stderr: 'missing member setup' }));
  assert.throws(() => verifyRenameBuild({ ...options, run: failing.run }), /missing member setup/);
  assert.equal(fs.existsSync(evidencePath), false);
});

test('missing scheme, unavailable Xcode, and source changes during build fail closed', t => {
  const { root, evidencePath } = fixture(t);
  const options = { root, evidencePath, scheme: 'Wrong', destination: 'generic/platform=iOS Simulator' };
  assert.throws(() => verifyRenameBuild({ ...options, evidencePath: path.join(root, 'Feature.swift'), run: xcode().run }), /Evidence path must name/);
  assert.ok(fs.existsSync(path.join(root, 'Feature.swift')));
  assert.throws(() => verifyRenameBuild({ ...options, run: xcode().run }), /not returned/);
  assert.throws(() => verifyRenameBuild({ ...options, scheme: 'Example', run: () => ({ error: Error('unavailable') }) }), /could not run/);
  const modified = xcode(args => {
    if (!args.includes('-dry-run')) fs.appendFileSync(path.join(root, 'Feature.swift'), 'func changed() {}\n');
    return { status: 0, stdout: '', stderr: '' };
  });
  assert.throws(() => verifyRenameBuild({ ...options, scheme: 'Example', run: modified.run }), /Source changed during the build/);
  assert.equal(fs.existsSync(evidencePath), false);
});
