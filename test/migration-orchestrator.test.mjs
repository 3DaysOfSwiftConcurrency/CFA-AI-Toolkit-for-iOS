import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { auditProject, initialState, validateState } from '../skills/cfa-migration-orchestrator/scripts/orchestrator-state.mjs';

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

test('generic checkpoints cannot create an invalid blocked state', t => {
  const directory = project(t, 'cfa-migration-engine-blocked-checkpoint-');
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  assert.equal(spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target']).status, 0);
  const blocked = spawnSync(process.execPath, [script, 'checkpoint', ledger, '--phase', 'blocked', '--next-action', 'Await approval.', '--action', 'Found a blocker.', '--result', 'Needs a decision.'], { encoding: 'utf8' });
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /Usage:/);
  assert.equal(spawnSync(process.execPath, [script, 'validate', ledger], { encoding: 'utf8' }).status, 0);
});

test('block repairs an interrupted blocked checkpoint', t => {
  const directory = project(t, 'cfa-migration-engine-repair-block-');
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  assert.equal(spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target']).status, 0);
  const content = fs.readFileSync(ledger, 'utf8').replace('"phase": "audit"', '"phase": "blocked"');
  fs.writeFileSync(ledger, content);
  assert.notEqual(spawnSync(process.execPath, [script, 'validate', ledger], { encoding: 'utf8' }).status, 0);
  assert.equal(spawnSync(process.execPath, [script, 'block', ledger, '--reason', 'Simulator service stalled.', '--unblock-condition', 'User approves restart.', '--next-action', 'Restart and retry.'], { encoding: 'utf8' }).status, 0);
  assert.equal(spawnSync(process.execPath, [script, 'validate', ledger], { encoding: 'utf8' }).status, 0);
});

test('engine stores a validated Codex continuation target in the existing ledger', t => {
  const directory = project(t, 'cfa-migration-engine-continuation-');
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  assert.equal(spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target']).status, 0);
  const result = spawnSync(process.execPath, [script, 'continuation', ledger, '--codex-thread', 'thread-123'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const status = spawnSync(process.execPath, [script, 'status', ledger], { encoding: 'utf8' });
  assert.match(status.stdout, /"threadId": "thread-123"/);
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

test('engine records blocked and completed states only with their required evidence', t => {
  const directory = project(t, 'cfa-migration-engine-completion-');
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  assert.equal(spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target']).status, 0);
  assert.equal(spawnSync(process.execPath, [script, 'block', ledger, '--reason', 'Simulator unavailable.', '--unblock-condition', 'Simulator service recovers.', '--next-action', 'Continue source review.'], { encoding: 'utf8' }).status, 0);
  assert.equal(spawnSync(process.execPath, [script, 'validate', ledger], { encoding: 'utf8' }).status, 0);
  assert.equal(spawnSync(process.execPath, [script, 'checkpoint', ledger, '--phase', 'audit', '--next-action', 'Resume audit.', '--action', 'Resumed after service recovery.', '--result', 'Source review continues.'], { encoding: 'utf8' }).status, 0);
  const ids = ['baseline', 'build', 'tests', 'behaviour-regression', 'primitive-inventory', 'navigator-review', 'hybrid-review', 'final-cfa-audit', 'human-architecture-review'];
  for (const id of ids) assert.equal(spawnSync(process.execPath, [script, 'evidence', ledger, '--id', id, '--revision', 'abc123', '--kind', 'check', '--outcome', 'passed', '--summary', id], { encoding: 'utf8' }).status, 0);
  const flags = ['--baseline', '--build', '--tests', '--behaviour-regression', '--primitive-inventory', '--navigator-review', '--hybrid-review', '--final-cfa-audit', '--human-architecture-review'];
  assert.equal(spawnSync(process.execPath, [script, 'complete', ledger, ...flags.flatMap((flag, index) => [flag, ids[index]])], { encoding: 'utf8' }).status, 0);
  const status = spawnSync(process.execPath, [script, 'status', ledger], { encoding: 'utf8' });
  assert.match(status.stdout, /"phase": "completed"/);
  const claim = JSON.parse(spawnSync(process.execPath, [script, 'claim-continuation', ledger, '--token', 'terminal-token'], { encoding: 'utf8' }).stdout);
  assert.deepEqual(claim, {
    claimed: false,
    status: 'completed',
    reason: '🎉 The migration to Swift Concurrency using CFA is complete.',
    nextAction: 'No further migration work is required. The required completion evidence is recorded.'
  });
  assert.equal(spawnSync(process.execPath, [script, 'validate', ledger], { encoding: 'utf8' }).status, 0);
  fs.writeFileSync(path.join(directory, 'baseline.txt'), 'changed after verification');
  const changed = spawnSync(process.execPath, [script, 'validate', ledger], { encoding: 'utf8' });
  assert.notEqual(changed.status, 0);
  assert.match(changed.stderr, /source changed after its completion evidence/);
});

test('engine refuses completed state when build, tests, or behaviour evidence is limited', () => {
  const state = initialState('Migrate app', 'App target');
  const ids = ['baseline', 'build', 'tests', 'behaviour-regression', 'primitive-inventory', 'navigator-review', 'hybrid-review', 'final-cfa-audit', 'human-architecture-review'];
  state.evidence = ids.map(id => ({ id, revision: 'abc123', kind: 'check', outcome: id === 'tests' ? 'passed-with-limitation' : 'passed', summary: id }));
  state.phase = 'completed';
  state.completionGate = { baseline: 'baseline', build: 'build', tests: 'tests', behaviourRegression: 'behaviour-regression', primitiveInventory: 'primitive-inventory', navigatorReview: 'navigator-review', hybridReview: 'hybrid-review', finalCfaAudit: 'final-cfa-audit', humanArchitectureReview: 'human-architecture-review' };
  assert.ok(validateState(state).includes('completionGate.tests requires passed evidence'));
});

test('engine safely reopens a legacy completed ledger with limited verification', t => {
  const directory = project(t, 'cfa-migration-engine-reopen-');
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  assert.equal(spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target']).status, 0);
  const ids = ['baseline', 'build', 'tests', 'behaviour-regression', 'primitive-inventory', 'navigator-review', 'hybrid-review', 'final-cfa-audit', 'human-architecture-review'];
  for (const id of ids) assert.equal(spawnSync(process.execPath, [script, 'evidence', ledger, '--id', id, '--revision', 'abc123', '--kind', 'check', '--outcome', 'passed', '--summary', id]).status, 0);
  const flags = ['--baseline', '--build', '--tests', '--behaviour-regression', '--primitive-inventory', '--navigator-review', '--hybrid-review', '--final-cfa-audit', '--human-architecture-review'];
  assert.equal(spawnSync(process.execPath, [script, 'complete', ledger, ...flags.flatMap((flag, index) => [flag, ids[index]])]).status, 0);
  const contents = fs.readFileSync(ledger, 'utf8').replace('"outcome": "passed",\n      "summary": "tests"', '"outcome": "passed-with-limitation",\n      "summary": "tests"');
  fs.writeFileSync(ledger, contents);
  assert.notEqual(spawnSync(process.execPath, [script, 'validate', ledger]).status, 0);
  assert.equal(spawnSync(process.execPath, [script, 'reopen', ledger, '--reason', 'The final test gate is limited.', '--next-action', 'Run the full test suite.']).status, 0);
  const status = spawnSync(process.execPath, [script, 'status', ledger], { encoding: 'utf8' });
  assert.match(status.stdout, /"phase": "verify"/);
  assert.equal(spawnSync(process.execPath, [script, 'validate', ledger]).status, 0);
});

test('engine reserves and claims one continuation signal at a time', t => {
  const directory = project(t, 'cfa-migration-engine-continuation-claim-');
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  assert.equal(spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target']).status, 0);
  assert.equal(spawnSync(process.execPath, [script, 'continuation', ledger, '--codex-thread', 'thread-123']).status, 0);
  const prepared = JSON.parse(spawnSync(process.execPath, [script, 'prepare-continuation', ledger], { encoding: 'utf8' }).stdout);
  assert.equal(prepared.queued, true);
  const duplicate = JSON.parse(spawnSync(process.execPath, [script, 'prepare-continuation', ledger], { encoding: 'utf8' }).stdout);
  assert.deepEqual(duplicate, { queued: false, reason: 'A continuation is already pending.', token: prepared.token });
  const stale = JSON.parse(spawnSync(process.execPath, [script, 'claim-continuation', ledger, '--token', 'stale-token'], { encoding: 'utf8' }).stdout);
  assert.equal(stale.claimed, false);
  const claimed = JSON.parse(spawnSync(process.execPath, [script, 'claim-continuation', ledger, '--token', prepared.token], { encoding: 'utf8' }).stdout);
  assert.equal(claimed.claimed, true);
  const next = JSON.parse(spawnSync(process.execPath, [script, 'prepare-continuation', ledger, '--continuation-token', claimed.workerToken], { encoding: 'utf8' }).stdout);
  assert.equal(next.queued, true);
});

test('engine recovers an expired worker lease without allowing the former worker to write', t => {
  const directory = project(t, 'cfa-migration-engine-lease-recovery-');
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  assert.equal(spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target']).status, 0);
  assert.equal(spawnSync(process.execPath, [script, 'continuation', ledger, '--codex-thread', 'thread-123']).status, 0);
  const pending = JSON.parse(spawnSync(process.execPath, [script, 'prepare-continuation', ledger], { encoding: 'utf8' }).stdout);
  const claimed = JSON.parse(spawnSync(process.execPath, [script, 'claim-continuation', ledger, '--token', pending.token, '--lease-seconds', '30'], { encoding: 'utf8' }).stdout);
  const unleased = spawnSync(process.execPath, [script, 'checkpoint', ledger, '--phase', 'audit', '--next-action', 'Review source.', '--action', 'Tried to update.', '--result', 'Should be fenced.'], { encoding: 'utf8' });
  assert.notEqual(unleased.status, 0);
  const expired = fs.readFileSync(ledger, 'utf8').replace(/"expiresAt": "[^"]+"/, '"expiresAt": "1970-01-01T00:00:00.000Z"');
  fs.writeFileSync(ledger, expired);
  const recovery = JSON.parse(spawnSync(process.execPath, [script, 'recover-continuation', ledger], { encoding: 'utf8' }).stdout);
  assert.equal(recovery.queued, true);
  assert.notEqual(recovery.token, claimed.workerToken);
  assert.equal(spawnSync(process.execPath, [script, 'mark-continuation-delivery', ledger, '--token', recovery.token], { encoding: 'utf8' }).status, 0);
  const recentRecovery = JSON.parse(spawnSync(process.execPath, [script, 'recover-continuation', ledger], { encoding: 'utf8' }).stdout);
  assert.equal(recentRecovery.queued, false);
  assert.match(recentRecovery.reason, /queued recently/);
  const formerWorker = spawnSync(process.execPath, [script, 'checkpoint', ledger, '--phase', 'audit', '--next-action', 'Review source.', '--action', 'Former worker update.', '--result', 'Must be rejected.', '--continuation-token', claimed.workerToken], { encoding: 'utf8' });
  assert.notEqual(formerWorker.status, 0);
  const replacement = JSON.parse(spawnSync(process.execPath, [script, 'claim-continuation', ledger, '--token', recovery.token], { encoding: 'utf8' }).stdout);
  const heartbeat = JSON.parse(spawnSync(process.execPath, [script, 'heartbeat-continuation', ledger, '--token', replacement.workerToken], { encoding: 'utf8' }).stdout);
  assert.equal(heartbeat.heartbeated, true);
  const healthy = JSON.parse(spawnSync(process.execPath, [script, 'recover-continuation', ledger], { encoding: 'utf8' }).stdout);
  assert.equal(healthy.queued, false);
  assert.match(healthy.reason, /healthy/);
});

test('a queued continuation reports a later blocker instead of a stale token', t => {
  const directory = project(t, 'cfa-migration-engine-blocked-continuation-');
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  assert.equal(spawnSync(process.execPath, [script, 'init', directory, '--goal', 'Migrate app', '--scope', 'App target']).status, 0);
  assert.equal(spawnSync(process.execPath, [script, 'continuation', ledger, '--codex-thread', 'thread-123']).status, 0);
  const prepared = JSON.parse(spawnSync(process.execPath, [script, 'prepare-continuation', ledger], { encoding: 'utf8' }).stdout);
  assert.equal(spawnSync(process.execPath, [script, 'block', ledger, '--reason', 'Xcode test service is stalled.', '--unblock-condition', 'User approves restart.', '--next-action', 'Restart and retry.']).status, 0);
  const claim = JSON.parse(spawnSync(process.execPath, [script, 'claim-continuation', ledger, '--token', prepared.token], { encoding: 'utf8' }).stdout);
  assert.deepEqual(claim, {
    claimed: false,
    reason: 'Migration is blocked.',
    blocker: { reason: 'Xcode test service is stalled.', unblockCondition: 'User approves restart.' },
    nextAction: 'Restart and retry.'
  });
});

test('engine summarizes inspection evidence without treating scanner leads as verdicts', async () => {
  const report = await auditProject('/project', {
    inspect: async () => ({ sourceFingerprint: 'fingerprint', scope: { swiftFiles: 7 }, findings: [{ code: 'feature-owner' }, { code: 'feature-owner' }, { code: 'task-owner' }] }),
    analyseProject: async () => ({ syntax: { status: 'available' }, compilerIndex: { status: 'not-requested' } }),
    diffCheck: () => ({ status: 'passed' })
  });
  assert.deepEqual(report, {
    sourceFingerprint: 'fingerprint', swiftFiles: 7, findings: 3,
    findingsByCode: { 'feature-owner': 2, 'task-owner': 1 }, syntax: 'available', compilerIndex: 'not-requested', diffCheck: 'passed'
  });
});
