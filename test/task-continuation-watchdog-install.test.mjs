import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installTaskWatchdog, taskWatchdogLabel } from '../mcp/cfa-task-continuation-watchdog-install.mjs';
import { main } from '../mcp/cfa-task-continuation-runner.mjs';

test('watchdog installation writes a private, escaped launch agent and activates it', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-task-watchdog-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const state = path.join(directory, 'task & work.json');
  const calls = [];
  const installed = installTaskWatchdog(state, {
    launchAgentsDirectory: directory,
    execute: (command, args) => { calls.push({ command, args }); return { status: 0, stdout: '', stderr: '' }; }
  });
  assert.equal(installed.label, taskWatchdogLabel(state));
  assert.match(fs.readFileSync(installed.plist, 'utf8'), /task &amp; work\.json/);
  assert.deepEqual(calls.map(call => call.args[0]), ['bootout', 'bootstrap']);
});

test('runner installs a watchdog only when explicitly requested', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-task-watchdog-runner-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const state = path.join(directory, 'task.json');
  const calls = [];
  const result = main(['init', state, '--objective', 'Finish work', '--acceptance', 'Tests pass', '--next-action', 'Run tests', '--thread', 'thread-1', '--watchdog'], {
    out: () => {}, installWatchdog: file => { calls.push(file); return { label: 'test', plist: 'test.plist' }; }
  });
  assert.deepEqual(calls, [state]);
  assert.deepEqual(result.watchdog, { label: 'test', plist: 'test.plist' });
});
