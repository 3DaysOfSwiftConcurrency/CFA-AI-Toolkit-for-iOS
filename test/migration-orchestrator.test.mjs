import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { initialState, validateState } from '../skills/cfa-migration-orchestrator/scripts/orchestrator-state.mjs';

const script = path.resolve('skills/cfa-migration-orchestrator/scripts/orchestrator-state.mjs');
function project(t, name = 'cfa-migration-engine-') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), name));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'MIGRATION_LEDGER.md'), '# CFA migration ledger\n');
  assert.equal(spawnSync('git', ['init', '-q', directory]).status, 0);
  assert.equal(spawnSync('git', ['-C', directory, 'config', 'user.email', 'test@example.com']).status, 0);
  assert.equal(spawnSync('git', ['-C', directory, 'config', 'user.name', 'Test User']).status, 0);
  fs.writeFileSync(path.join(directory, 'baseline.txt'), 'baseline');
  assert.equal(spawnSync('git', ['-C', directory, 'add', 'baseline.txt', 'MIGRATION_LEDGER.md']).status, 0);
  assert.equal(spawnSync('git', ['-C', directory, 'commit', '-qm', 'Baseline']).status, 0);
  return directory;
}

test('engine stores a resumable state block in the existing migration ledger', t => {
  const directory = project(t);
  const result = spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  const contents = fs.readFileSync(ledger, 'utf8');
  assert.match(contents, /CFA Migration Engine state: managed/);
  assert.equal(fs.existsSync(path.join(directory, '.cfa')), false);
  const state = JSON.parse(contents.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.equal(state.baseline.dirty, false);
  assert.match(state.baseline.revision, /^[0-9a-f]{40}$/);
  assert.equal(spawnSync(process.execPath, [script, 'validate', ledger], { encoding: 'utf8' }).status, 0);
});

test('engine records checkpoints and evidence in the same ledger', t => {
  const directory = project(t, 'cfa-migration-engine-checkpoint-');
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  assert.equal(spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target']).status, 0);
  assert.equal(spawnSync(process.execPath, [script, 'checkpoint', ledger, '--phase', 'fix', '--next-action', 'Run focused tests.', '--action', 'Audited app launch.', '--result', 'Found one safe fix.'], { encoding: 'utf8' }).status, 0);
  assert.equal(spawnSync(process.execPath, [script, 'evidence', ledger, '--id', 'launch-audit', '--revision', 'abc123', '--kind', 'source', '--outcome', 'observed', '--summary', 'Audited launch ownership.'], { encoding: 'utf8' }).status, 0);
  const status = spawnSync(process.execPath, [script, 'status', ledger], { encoding: 'utf8' });
  assert.match(status.stdout, /"phase": "fix"/);
  assert.match(status.stdout, /"evidence": 1/);
  assert.equal(spawnSync(process.execPath, [script, 'validate', ledger], { encoding: 'utf8' }).status, 0);
});

test('engine preserves existing ledgers and rejects invalid requests', t => {
  const directory = project(t, 'cfa-migration-engine-guard-');
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  const first = spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target'], { encoding: 'utf8' });
  assert.equal(first.status, 0, first.stderr);
  const second = spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target'], { encoding: 'utf8' });
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /Refusing to replace/);
  const bad = spawnSync(process.execPath, [script, 'checkpoint', ledger, '--phase', 'unknown', '--next-action', 'Next', '--action', 'Action', '--result', 'Result'], { encoding: 'utf8' });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /Usage:/);
});

test('engine rejects unsupported completion and incomplete blockers', () => {
  const state = initialState('Migrate app', 'App target');
  state.phase = 'completed';
  assert.ok(validateState(state).some(error => error.includes('completionGate')));
  state.phase = 'blocked';
  assert.ok(validateState(state).some(error => error.includes('blocker reason')));
});
