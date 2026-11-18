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
  const result = spawnSync(process.execPath, [script, 'init', project, '--goal', 'Migrate app', '--scope', 'App target'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const record = path.join(project, '.cfa', 'migration-orchestrator.json');
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

test('orchestrator completion requires every named evidence record', () => {
  const state = initialState('Migrate app', 'App target');
  state.phase = 'completed';
  const keys = ['baseline', 'build', 'tests', 'behaviourRegression', 'primitiveInventory', 'navigatorReview', 'hybridReview', 'finalCfaAudit', 'humanArchitectureReview'];
  state.completionGate = Object.fromEntries(keys.map(key => [key, key]));
  state.evidence = keys.map(id => ({ id, revision: 'abc123', kind: 'check', outcome: 'passed', summary: id }));
  assert.deepEqual(validateState(state), []);
});
