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
});
