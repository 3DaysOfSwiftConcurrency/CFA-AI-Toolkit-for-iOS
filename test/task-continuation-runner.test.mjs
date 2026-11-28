import test from 'node:test';
import assert from 'node:assert/strict';
import { claimContinuation, createTaskState, markContinuationDelivery, recoverContinuation, reserveContinuation } from '../mcp/cfa-task-continuation-contract.mjs';

test('an active task reserves, claims, and replaces an expired worker', () => {
  const task = createTaskState({ objective: 'Finish work', acceptanceCriteria: 'Tests pass', nextAction: 'Run tests', threadId: 'thread-1' });
  const first = reserveContinuation(task);
  assert.equal(first.queued, true);
  const claimed = claimContinuation(task, first.token, { now: 0, leaseSeconds: 30 });
  assert.equal(claimed.claimed, true);
  assert.equal(recoverContinuation(task, { now: 29_000 }).queued, false);
  const replacement = recoverContinuation(task, { now: 31_000 });
  assert.equal(replacement.queued, true);
  assert.notEqual(replacement.token, first.token);
});

test('terminal tasks never queue a replacement worker', () => {
  const task = createTaskState({ objective: 'Finish work', acceptanceCriteria: 'Tests pass', nextAction: 'Run tests', threadId: 'thread-1' });
  task.state = 'completed'; task.nextAction = 'No further task work is required.';
  assert.deepEqual(recoverContinuation(task), { queued: false, reason: 'Task is completed.' });
});

test('a delivered continuation is not redelivered until its retry interval elapses', () => {
  const task = createTaskState({ objective: 'Finish work', acceptanceCriteria: 'Tests pass', nextAction: 'Run tests', threadId: 'thread-1' });
  const pending = recoverContinuation(task, { now: 0 });
  assert.equal(markContinuationDelivery(task, pending.token, { now: 1_000 }).delivered, true);
  assert.deepEqual(recoverContinuation(task, { now: 10_000 }), { queued: false, reason: 'Continuation delivery is still within its retry interval.' });
  assert.equal(recoverContinuation(task, { now: 302_000 }).queued, true);
});
