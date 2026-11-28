import test from 'node:test';
import assert from 'node:assert/strict';
import { continuationWakeMessage, queueCodexContinuation } from '../mcp/cfa-continuation-core.mjs';

test('queues one continuation and treats an already-active writer as delivered', () => {
  const calls = [];
  const result = queueCodexContinuation({
    threadId: 'thread-1', message: 'resume safely',
    execute: (...args) => {
      calls.push(args);
      return { status: 0, stdout: 'already has an active writer', stderr: '' };
    }
  });

  assert.deepEqual(result, { queued: true, threadId: 'thread-1', resumed: false });
  assert.deepEqual(calls[0][1], ['queue', '--thread', 'thread-1', '--resume', '--message', 'resume safely']);
});

test('rejects a failed host queue instead of pretending work was resumed', () => {
  assert.throws(() => queueCodexContinuation({
    threadId: 'thread-1', message: 'resume safely',
    execute: () => ({ status: 1, stdout: '', stderr: 'host unavailable' })
  }), /Could not queue Codex continuation: host unavailable/);
});

test('wake-up messages require a claim before autonomous work begins', () => {
  const message = continuationWakeMessage({
    taskName: 'A coding task', token: 'token-1',
    claimInstruction: 'Claim it through the task runner.',
    workInstruction: 'perform the recorded next safe action and heartbeat before long work.'
  });

  assert.match(message, /token-1/);
  assert.match(message, /Claim it through the task runner/);
  assert.match(message, /stale, blocked, or completed, stop without performing work/);
  assert.match(message, /recorded next safe action/);
});
