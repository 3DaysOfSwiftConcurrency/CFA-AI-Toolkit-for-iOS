import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installWatchdog, uninstallWatchdog, watchdogLabel, watchdogPlist } from '../mcp/cfa-migration-watchdog-install.mjs';

test('watchdog schedule runs the local recovery command against one ledger', () => {
  const ledger = '/tmp/CFA Migration/MIGRATION_LEDGER.md';
  const label = watchdogLabel(ledger);
  const plist = watchdogPlist({ ledger, node: '/usr/local/bin/node', intervalSeconds: 60 });
  assert.match(label, /^com\.3DaysOfSwiftConcurrency\.cfa-migration\.[0-9a-f]{16}$/);
  assert.match(plist, new RegExp(`<string>${label}</string>`));
  assert.match(plist, /cfa-migration-watchdog\.mjs<\/string>/);
  assert.match(plist, /MIGRATION_LEDGER\.md<\/string>/);
  assert.match(plist, /<integer>60<\/integer>/);
  assert.match(plist, /<true\/>/);
});

test('watchdog installation registers a user launch agent without a manual step', t => {
  const launchAgentsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-watchdog-launch-agents-'));
  t.after(() => fs.rmSync(launchAgentsDirectory, { recursive: true, force: true }));
  const calls = [];
  const result = installWatchdog('/tmp/CFA Migration/MIGRATION_LEDGER.md', {
    launchAgentsDirectory,
    execute: (...args) => { calls.push(args); return { status: 0, stdout: '', stderr: '' }; }
  });
  assert.equal(path.dirname(result.plist), launchAgentsDirectory);
  assert.equal(fs.existsSync(result.plist), true);
  assert.deepEqual(calls.map(call => call[1][0]), ['bootout', 'bootstrap']);
  const removed = uninstallWatchdog('/tmp/CFA Migration/MIGRATION_LEDGER.md', {
    launchAgentsDirectory,
    execute: (...args) => { calls.push(args); return { status: 0, stdout: '', stderr: '' }; }
  });
  assert.equal(removed.removed, true);
  assert.equal(fs.existsSync(result.plist), false);
  assert.equal(calls.at(-1)[1][0], 'bootout');
});
