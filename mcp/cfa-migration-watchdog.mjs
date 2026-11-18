#!/usr/bin/env node
import { main as engineMain } from '../skills/cfa-migration-orchestrator/scripts/orchestrator-state.mjs';
import { requestCodexContinuation } from './cfa-migration-engine.mjs';
import { uninstallWatchdog } from './cfa-migration-watchdog-install.mjs';

function option(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

function usage() {
  return 'Usage: cfa-migration-watchdog.mjs --ledger <path> [--interval-seconds <seconds>] [--once]';
}

async function recover(ledger) {
  const recovery = await engineMain(['recover-continuation', ledger], { out: () => {} });
  if (!recovery.queued) {
    if (/Migration is (blocked|completed)\./.test(recovery.reason ?? '')) return { ...recovery, watchdog: uninstallWatchdog(ledger) };
    return recovery;
  }
  const continuation = requestCodexContinuation(recovery.state);
  await engineMain(['mark-continuation-delivery', ledger, '--token', recovery.token], { out: () => {} });
  return { ...recovery, continuation };
}

const args = process.argv.slice(2);
const ledger = option(args, '--ledger');
const once = args.includes('--once');
const intervalSeconds = Number(option(args, '--interval-seconds') ?? 60);
if (!ledger || !Number.isInteger(intervalSeconds) || intervalSeconds < 30 || !args.every((value, index) => !value.startsWith('--') || ['--ledger', '--interval-seconds', '--once'].includes(value) || index > 0 && ['--ledger', '--interval-seconds'].includes(args[index - 1]))) {
  console.error(usage()); process.exitCode = 1;
} else {
  const run = async () => {
    try { console.log(JSON.stringify(await recover(ledger))); }
    catch (error) { console.error(error instanceof Error ? error.message : String(error)); }
  };
  await run();
  if (!once) setInterval(run, intervalSeconds * 1000);
}
