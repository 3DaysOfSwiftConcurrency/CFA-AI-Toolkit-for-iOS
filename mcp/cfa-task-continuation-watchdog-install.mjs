import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const watchdog = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cfa-task-continuation-watchdog.mjs');
function xml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;'); }
export function taskWatchdogLabel(stateFile) { return `com.3DaysOfSwiftConcurrency.cfa-task.${createHash('sha256').update(path.resolve(stateFile)).digest('hex').slice(0, 16)}`; }
export function installTaskWatchdog(stateFile, { launchAgentsDirectory = path.join(os.homedir(), 'Library', 'LaunchAgents'), execute = spawnSync } = {}) {
  const label = taskWatchdogLabel(stateFile), plist = path.join(launchAgentsDirectory, `${label}.plist`);
  const args = [process.execPath, watchdog, path.resolve(stateFile)].map(value => `<string>${xml(value)}</string>`).join('');
  fs.mkdirSync(launchAgentsDirectory, { recursive: true });
  fs.writeFileSync(plist, `<?xml version="1.0"?><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array>${args}</array><key>RunAtLoad</key><true/><key>StartInterval</key><integer>60</integer></dict></plist>`, { mode: 0o600 });
  const domain = `gui/${process.getuid()}`; execute('launchctl', ['bootout', domain, plist], { encoding: 'utf8' });
  const result = execute('launchctl', ['bootstrap', domain, plist], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw Error(`Could not start task continuation watchdog: ${(result.stderr || result.stdout || result.error?.message || 'launchctl failed').trim()}`);
  return { label, plist };
}
