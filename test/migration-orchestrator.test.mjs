import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { initialState, validateState } from '../skills/cfa-migration-orchestrator/scripts/orchestrator-state.mjs';

const script = path.resolve('skills/cfa-migration-orchestrator/scripts/orchestrator-state.mjs');

test('orchestrator initializes a project-local resumable state record', t => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-orchestrator-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '-q', project]).status, 0);
  assert.equal(spawnSync('git', ['-C', project, 'config', 'user.email', 'test@example.com']).status, 0);
  assert.equal(spawnSync('git', ['-C', project, 'config', 'user.name', 'Test User']).status, 0);
  fs.writeFileSync(path.join(project, 'baseline.txt'), 'baseline');
  assert.equal(spawnSync('git', ['-C', project, 'add', 'baseline.txt']).status, 0);
  assert.equal(spawnSync('git', ['-C', project, 'commit', '-qm', 'Baseline']).status, 0);
  const result = spawnSync(process.execPath, [script, 'init', project, '--goal', 'Migrate app', '--scope', 'App target'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const record = path.join(project, '.cfa', 'migration-orchestrator.json');
  const state = JSON.parse(fs.readFileSync(record, 'utf8'));
  assert.equal(state.baseline.dirty, false);
  assert.match(state.baseline.revision, /^[0-9a-f]{40}$/);
  assert.equal(spawnSync(process.execPath, [script, 'validate', record], { encoding: 'utf8' }).status, 0);
  const status = spawnSync(process.execPath, [script, 'status', record], { encoding: 'utf8' });
  assert.match(status.stdout, /"phase": "audit"/);
});

test('orchestrator rejects unsupported completion and incomplete blocker records', () => {
  const state = initialState('Migrate app', 'App target');
  state.phase = 'completed';
  assert.ok(validateState(state).some(error => error.includes('completionGate')));
  state.phase = 'blocked';
  assert.ok(validateState(state).some(error => error.includes('blocker reason')));
});

test('orchestrator records a dirty baseline and refuses a missing project', t => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-orchestrator-dirty-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '-q', project]).status, 0);
  fs.writeFileSync(path.join(project, 'uncommitted.txt'), 'existing work');
  const result = spawnSync(process.execPath, [script, 'init', project, '--goal', 'Migrate app', '--scope', 'App target'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(fs.readFileSync(path.join(project, '.cfa', 'migration-orchestrator.json'), 'utf8'));
  assert.equal(state.baseline.revision, null);
  assert.equal(state.baseline.dirty, true);
  const missing = spawnSync(process.execPath, [script, 'init', path.join(project, 'missing'), '--goal', 'Migrate app', '--scope', 'App target'], { encoding: 'utf8' });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Project directory does not exist/);
});

test('orchestrator completion requires every named evidence record', () => {
  const state = initialState('Migrate app', 'App target');
  state.phase = 'completed';
  const keys = ['baseline', 'build', 'tests', 'behaviourRegression', 'primitiveInventory', 'navigatorReview', 'hybridReview', 'finalCfaAudit', 'humanArchitectureReview'];
  state.completionGate = Object.fromEntries(keys.map(key => [key, key]));
  state.evidence = keys.map(id => ({ id, revision: 'abc123', kind: 'check', outcome: 'passed', summary: id }));
  assert.deepEqual(validateState(state), []);
});
