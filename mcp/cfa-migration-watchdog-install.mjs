import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const watchdog = path.join(directory, 'cfa-migration-watchdog.mjs');

function escapeXML(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function watchdogLabel(ledger) {
  return `com.3DaysOfSwiftConcurrency.cfa-migration.${createHash('sha256').update(path.resolve(ledger)).digest('hex').slice(0, 16)}`;
}

export function watchdogPlist({ ledger, node = process.execPath, intervalSeconds = 60 }) {
  const label = watchdogLabel(ledger);
  const argumentsList = [node, watchdog, '--ledger', path.resolve(ledger), '--once'];
  const values = argumentsList.map(value => `      <string>${escapeXML(value)}</string>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
${values}
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StartInterval</key>
    <integer>${intervalSeconds}</integer>
    <key>ProcessType</key>
    <string>Background</string>
  </dict>
</plist>
`;
}

export function installWatchdog(ledger, { launchAgentsDirectory = path.join(os.homedir(), 'Library', 'LaunchAgents'), execute = spawnSync } = {}) {
  const label = watchdogLabel(ledger);
  const plist = path.join(launchAgentsDirectory, `${label}.plist`);
  fs.mkdirSync(launchAgentsDirectory, { recursive: true });
  fs.writeFileSync(plist, watchdogPlist({ ledger }), { mode: 0o600 });
  const domain = `gui/${process.getuid()}`;
  execute('launchctl', ['bootout', domain, plist], { encoding: 'utf8' });
  const result = execute('launchctl', ['bootstrap', domain, plist], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw Error(`Could not start CFA migration watchdog: ${(result.stderr || result.stdout || result.error?.message || 'launchctl failed').trim()}`);
  }
  return { label, plist };
}

export function uninstallWatchdog(ledger, { launchAgentsDirectory = path.join(os.homedir(), 'Library', 'LaunchAgents'), execute = spawnSync } = {}) {
  const label = watchdogLabel(ledger);
  const plist = path.join(launchAgentsDirectory, `${label}.plist`);
  execute('launchctl', ['bootout', `gui/${process.getuid()}`, plist], { encoding: 'utf8' });
  fs.rmSync(plist, { force: true });
  return { label, plist, removed: true };
}
