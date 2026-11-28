#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { claimContinuation, createTaskState, heartbeatContinuation, markContinuationDelivery, recoverContinuation, reserveContinuation, validateTaskState } from './cfa-task-continuation-contract.mjs';
import { installTaskWatchdog } from './cfa-task-continuation-watchdog-install.mjs';

function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function write(file, state) { const temp = `${file}.${process.pid}.tmp`; fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 }); fs.renameSync(temp, file); }
function option(args, name) { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; }
function requireText(value, name) { if (!value?.trim()) throw Error(`${name} is required.`); return value; }
function valid(state) { const errors = validateTaskState(state); if (errors.length) throw Error(errors.join('\n')); return state; }
const ledgerStart = '<!-- CFA Migration Engine state: managed -->';
const ledgerEnd = '<!-- /CFA Migration Engine state -->';

function readMigrationLedger(file) {
  const ledger = fs.readFileSync(file, 'utf8');
  const first = ledger.indexOf(ledgerStart), last = ledger.indexOf(ledgerEnd);
  if (first < 0 || last <= first) throw Error('The migration ledger has no valid CFA Migration Engine state block.');
  const block = ledger.slice(first + ledgerStart.length, last).trim();
  const match = block.match(/^```json\s*\n([\s\S]*?)\n```$/);
  if (!match) throw Error('The migration ledger state must contain one JSON code block.');
  const state = JSON.parse(match[1]);
  if (!state?.goal?.trim() || !state?.nextAction?.trim() || !state?.continuation?.threadId) {
    throw Error('The migration ledger does not contain a usable continuation state.');
  }
  if (state.phase === 'blocked' || state.phase === 'completed') {
    throw Error(`The migration ledger is ${state.phase}; it cannot reopen a delivery adapter.`);
  }
  if (!state.continuation.pending?.token) {
    throw Error('The active migration ledger has no pending continuation token to deliver.');
  }
  return state;
}

function usage() { return 'Usage: cfa-task-continuation-runner.mjs init <state.json> --objective <text> --acceptance <text> --next-action <text> --thread <id> [--watchdog] | status <state.json> | reopen-from-ledger <state.json> --ledger <MIGRATION_LEDGER.md> | checkpoint <state.json> --next-action <text> --evidence <text> --token <token> | prepare <state.json> --token <token> | recover <state.json> | mark-delivery <state.json> --token <token> | claim <state.json> --token <token> | heartbeat <state.json> --token <token> | block <state.json> --reason <text> --unblock-condition <text> | complete <state.json>'; }

export function main(args, { out = console.log, installWatchdog = installTaskWatchdog } = {}) {
  const [command, input, ...rest] = args; if (!command || !input) throw Error(usage()); const file = path.resolve(input);
  if (command === 'init') { if (fs.existsSync(file)) throw Error('Refusing to replace existing task state.'); const state = createTaskState({ objective: requireText(option(rest, '--objective'), 'objective'), acceptanceCriteria: requireText(option(rest, '--acceptance'), 'acceptance'), nextAction: requireText(option(rest, '--next-action'), 'next action'), threadId: requireText(option(rest, '--thread'), 'thread') }); write(file, state); const watchdog = rest.includes('--watchdog') ? installWatchdog(file) : null; out(JSON.stringify({ state, watchdog })); return { state, watchdog }; }
  const state = valid(read(file)); const token = option(rest, '--token');
  if (command === 'status') { out(JSON.stringify(state)); return state; }
  if (command === 'reopen-from-ledger') {
    const ledgerFile = option(rest, '--ledger');
    if (!ledgerFile || rest.length !== 2 || rest[0] !== '--ledger') throw Error(usage());
    if (state.state !== 'completed') throw Error('Only a completed generic task can hand off to an active migration ledger.');
    const authorityFile = path.resolve(ledgerFile);
    const ledger = readMigrationLedger(authorityFile);
    const handoff = {
      authority: 'migration-ledger',
      ledger: authorityFile,
      token: ledger.continuation.pending.token,
      threadId: ledger.continuation.threadId,
      nextAction: ledger.nextAction,
      claimCommand: `node orchestrator-state.mjs claim-continuation ${authorityFile} --token ${ledger.continuation.pending.token}`
    };
    state.state = 'replaced';
    state.nextAction = `Delegated to authoritative migration ledger: ${authorityFile}`;
    state.evidence.push(`Delegated completed generic task to active migration ledger at ${authorityFile}.`);
    state.continuation.pending = null;
    state.continuation.active = null;
    state.authority = handoff;
    write(file, valid(state)); out(JSON.stringify({ reopened: true, handoff })); return { reopened: true, handoff };
  }
  if (command === 'prepare') { if (state.continuation.active?.token === token) state.continuation.active = null; const result = reserveContinuation(state); write(file, state); out(JSON.stringify(result)); return result; }
  if (command === 'recover') { const result = recoverContinuation(state); write(file, state); out(JSON.stringify(result)); return result; }
  if (command === 'mark-delivery') { const result = markContinuationDelivery(state, requireText(token, 'token')); write(file, state); out(JSON.stringify(result)); return result; }
  if (command === 'claim') { const result = claimContinuation(state, requireText(token, 'token')); write(file, state); out(JSON.stringify(result)); return result; }
  if (command === 'heartbeat') { const result = heartbeatContinuation(state, requireText(token, 'token')); write(file, state); out(JSON.stringify(result)); return result; }
  if (command === 'checkpoint') { if (state.continuation.active?.token !== token) throw Error('An active worker token is required.'); state.nextAction = requireText(option(rest, '--next-action'), 'next action'); state.evidence.push(requireText(option(rest, '--evidence'), 'evidence')); write(file, state); out(JSON.stringify(state)); return state; }
  if (command === 'block') { state.state = 'blocked'; state.blocker = { reason: requireText(option(rest, '--reason'), 'reason'), unblockCondition: requireText(option(rest, '--unblock-condition'), 'unblock condition') }; state.continuation.pending = null; state.continuation.active = null; write(file, valid(state)); out(JSON.stringify(state)); return state; }
  if (command === 'complete') { state.state = 'completed'; state.nextAction = 'No further task work is required.'; state.continuation.pending = null; state.continuation.active = null; write(file, valid(state)); out(JSON.stringify(state)); return state; }
  throw Error(usage());
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
