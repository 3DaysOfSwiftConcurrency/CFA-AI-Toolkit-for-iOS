import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { inspectSnapshotTestIntegrity, main } from '../tools/snapshot-test-integrity/snapshot-test-integrity.mjs';

function project(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-integrity-'));
  for (const [relativePath, source] of Object.entries(files)) {
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, source);
  }
  return root;
}

test('finds synthetic snapshot harnesses without treating ordinary production code as a violation', () => {
  const root = project({
    'App/AppDelegate.swift': 'final class AppDelegate { func start() {} }',
    'AppTests/ScreenSnapshotTests.swift': 'let window = UIWindow()\nThread.sleep(forTimeInterval: 1)\nassertSnapshot(of: view.view, as: .image)'
  });
  try {
    const rules = inspectSnapshotTestIntegrity(root).map(finding => finding.rule);
    assert.deepEqual(rules.sort(), ['artificial-wait', 'direct-view-snapshot', 'synthetic-window']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('strict mode rejects a test-only launch marker', () => {
  const root = project({
    'App/AppDelegate.swift': 'if ProcessInfo.processInfo.environment["CFA_UNIT_TEST_HOST"] == "1" {}'
  });
  try {
    assert.equal(main([root, '--strict']), 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('does not classify an unrelated unit test as a snapshot test', () => {
  const root = project({
    'AppTests/FeatureTests.swift': 'Thread.sleep(forTimeInterval: 1)\nlet window = UIWindow()'
  });
  try {
    assert.deepEqual(inspectSnapshotTestIntegrity(root), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
