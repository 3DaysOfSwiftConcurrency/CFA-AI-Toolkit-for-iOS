import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { main } from '../mcp/cfa-task-continuation-runner.mjs';
import { recover } from '../mcp/cfa-task-continuation-watchdog.mjs';

test('watchdog queues the recorded next action for an unclaimed active task', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-task-runner-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const state = path.join(directory, 'task.json');
  main(['init', state, '--objective', 'Finish migration', '--acceptance', 'Verify tests', '--next-action', 'Run focused tests', '--thread', 'thread-1'], { out: () => {} });
  const calls = [];
  const result = recover(state, { queue: input => { calls.push(input); return { queued: true }; } });
  assert.deepEqual(result, { queued: true });
  assert.equal(calls[0].threadId, 'thread-1');
  assert.match(calls[0].message, /Run focused tests/);
  assert.match(calls[0].message, /Do not emit a final response/);
  const persisted = JSON.parse(fs.readFileSync(state, 'utf8'));
  assert.equal(persisted.continuation.pending.deliveryAttempts, 1);
  assert.ok(persisted.continuation.pending.lastDeliveredAt);
  assert.deepEqual(recover(state, { queue: () => { throw Error('must not redeliver within retry interval'); } }), { queued: false, reason: 'Continuation delivery is still within its retry interval.' });
});

test('completed generic task delegates to an active migration ledger without copying its lease', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-task-ledger-handoff-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const task = path.join(directory, 'task.json');
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  main(['init', task, '--objective', 'Completed cleanup', '--acceptance', 'Audit passed', '--next-action', 'Run audit', '--thread', 'old-thread'], { out: () => {} });
  main(['complete', task], { out: () => {} });
  fs.writeFileSync(ledger, `# Migration\n\n<!-- CFA Migration Engine state: managed -->\n\n\`\`\`json\n${JSON.stringify({
    schemaVersion: 3,
    goal: 'Prepare UIKit for SwiftUI',
    scope: 'View layer',
    baseline: { revision: 'abc', dirty: false },
    phase: 'audit',
    nextAction: 'Extract the next explicit lifecycle owner.',
    evidence: [], attempts: [], blocker: null, completionGate: null,
    continuation: { host: 'codex', threadId: 'migration-thread', pending: { token: 'ledger-token' }, active: null }
  }, null, 2)}\n\`\`\`\n\n<!-- /CFA Migration Engine state -->\n`);
  let result;
  main(['reopen-from-ledger', task, '--ledger', ledger], { out: value => { result = JSON.parse(value); } });
  assert.deepEqual(result, {
    reopened: true,
    handoff: {
      authority: 'migration-ledger', ledger, token: 'ledger-token', threadId: 'migration-thread',
      nextAction: 'Extract the next explicit lifecycle owner.',
      claimCommand: `node orchestrator-state.mjs claim-continuation ${ledger} --token ledger-token`
    }
  });
  const persisted = JSON.parse(fs.readFileSync(task, 'utf8'));
  assert.equal(persisted.state, 'replaced');
  assert.equal(persisted.authority.ledger, ledger);
  assert.equal(persisted.continuation.pending, null);
});
