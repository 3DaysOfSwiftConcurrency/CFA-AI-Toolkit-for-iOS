#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const requiredGate = ['baseline', 'build', 'tests', 'behaviourRegression', 'primitiveInventory', 'navigatorReview', 'hybridReview', 'finalCfaAudit', 'humanArchitectureReview'];
const phases = new Set(['audit', 'fix', 'verify', 'hybrid-review', 'final-audit', 'human-review', 'blocked', 'completed']);
const start = '<!-- CFA Migration Engine state: managed -->';
const end = '<!-- /CFA Migration Engine state -->';

function fail(message) { throw Error(message); }
function text(value) { return typeof value === 'string' && value.trim(); }
function git(project, args) {
  try { return execFileSync('git', ['-C', project, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}
function baseline(project) {
  const revision = git(project, ['rev-parse', 'HEAD']);
  const status = git(project, ['status', '--porcelain']);
  return { revision, dirty: status === null ? false : status.length > 0 };
}
function extract(ledger) {
  const first = ledger.indexOf(start), last = ledger.indexOf(end);
  if (first < 0 || last < 0 || last <= first || ledger.indexOf(start, first + start.length) >= 0 || ledger.indexOf(end, last + end.length) >= 0) {
    fail('Expected exactly one CFA Migration Engine state block in the ledger.');
  }
  const block = ledger.slice(first + start.length, last).trim();
  const match = block.match(/^```json\s*\n([\s\S]*?)\n```$/);
  if (!match) fail('CFA Migration Engine state must contain one JSON code block.');
  try { return { state: JSON.parse(match[1]), range: [first, last + end.length] }; }
  catch (error) { fail(`Cannot read CFA Migration Engine state: ${error.message}`); }
}
function block(state) { return `${start}\n\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n${end}`; }
function readLedger(file) {
  try { return fs.readFileSync(file, 'utf8'); }
  catch (error) { fail(`Cannot read migration ledger ${file}: ${error.message}`); }
}
function writeLedger(file, ledger) {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(temporary, ledger, { mode: 0o600 });
  fs.renameSync(temporary, file);
}
function replaceState(file, state) {
  const ledger = readLedger(file);
  const { range } = extract(ledger);
  writeLedger(file, `${ledger.slice(0, range[0])}${block(state)}${ledger.slice(range[1])}`);
}
function option(args, name) { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; }
function onlyOptions(args, names) {
  for (let index = 0; index < args.length; index += 1) {
    if (!args[index].startsWith('--')) continue;
    if (!names.includes(args[index]) || !args[index + 1]) return false;
    index += 1;
  }
  return true;
}
function usage() {
  return 'Usage: orchestrator-state.mjs init <project> --goal <text> --scope <text> [--ledger <existing-ledger.md>] | validate <ledger.md> | status <ledger.md> | checkpoint <ledger.md> --phase <phase> --next-action <text> --action <text> --result <text> | evidence <ledger.md> --id <id> --revision <revision> --kind <kind> --outcome <outcome> --summary <text>';
}

export function validateState(state) {
  const errors = [];
  if (state?.schemaVersion !== 3) errors.push('schemaVersion must be 3');
  for (const key of ['goal', 'scope', 'phase', 'nextAction']) if (!text(state?.[key])) errors.push(`${key} must be a non-empty string`);
  if (!phases.has(state?.phase)) errors.push('phase must be a known migration phase');
  if (!state?.baseline || typeof state.baseline !== 'object') errors.push('baseline must be recorded');
  else {
    if (state.baseline.revision !== null && !text(state.baseline.revision)) errors.push('baseline.revision must be a revision or null');
    if (typeof state.baseline.dirty !== 'boolean') errors.push('baseline.dirty must be a boolean');
  }
  if (!Array.isArray(state?.evidence)) errors.push('evidence must be an array');
  if (!Array.isArray(state?.attempts)) errors.push('attempts must be an array');
  const evidence = Array.isArray(state?.evidence) ? state.evidence : [];
  const ids = new Set();
  for (const item of evidence) {
    if (!text(item?.id) || !text(item?.revision) || !text(item?.kind) || !text(item?.outcome) || !text(item?.summary)) errors.push('each evidence item needs id, revision, kind, outcome and summary');
    else if (ids.has(item.id)) errors.push(`duplicate evidence id: ${item.id}`); else ids.add(item.id);
  }
  for (const item of Array.isArray(state?.attempts) ? state.attempts : []) if (!text(item?.action) || !text(item?.result)) errors.push('each attempt needs action and result');
  if (state?.phase === 'blocked' && (!text(state?.blocker?.reason) || !text(state?.blocker?.unblockCondition))) errors.push('blocked state needs blocker reason and unblockCondition');
  if (state?.phase === 'completed') {
    const gate = state.completionGate;
    if (!gate || typeof gate !== 'object') errors.push('completed state needs completionGate');
    else for (const key of requiredGate) if (!text(gate[key]) || !ids.has(gate[key])) errors.push(`completionGate.${key} must name recorded evidence`);
  }
  return errors;
}

export function initialState(goal, scope, project = process.cwd()) {
  return { schemaVersion: 3, goal, scope, baseline: baseline(project), phase: 'audit', nextAction: 'Establish the baseline and select the smallest verified migration slice.', evidence: [], attempts: [], blocker: null, completionGate: null };
}
function checkedState(file) {
  const { state } = extract(readLedger(file));
  const errors = validateState(state);
  if (errors.length) fail(errors.join('\n'));
  return state;
}

export function main(args, { out = console.log } = {}) {
  const [command, target, ...rest] = args;
  if (command === 'init') {
    const goal = option(rest, '--goal'), scope = option(rest, '--scope'), suppliedLedger = option(rest, '--ledger');
    if (!target || !text(goal) || !text(scope) || !onlyOptions(rest, ['--goal', '--scope', '--ledger'])) fail(usage());
    const project = path.resolve(target);
    if (!fs.statSync(project, { throwIfNoEntry: false })?.isDirectory()) fail(`Project directory does not exist: ${project}`);
    const file = path.resolve(suppliedLedger ?? path.join(project, 'MIGRATION_LEDGER.md'));
    const ledger = readLedger(file);
    if (ledger.includes(start) || ledger.includes(end)) fail(`Refusing to replace existing CFA Migration Engine state: ${file}`);
    writeLedger(file, `${ledger.trimEnd()}\n\n## CFA Migration Engine\n\n${block(initialState(goal, scope, project))}\n`);
    out(file); return file;
  }
  const file = target && path.resolve(target);
  if (!file || !['validate', 'status', 'checkpoint', 'evidence'].includes(command)) fail(usage());
  if (command === 'validate') { if (rest.length) fail(usage()); checkedState(file); out('Valid CFA Migration Engine state.'); return; }
  const state = checkedState(file);
  if (command === 'status') {
    if (rest.length) fail(usage());
    out(JSON.stringify({ goal: state.goal, scope: state.scope, baseline: state.baseline, phase: state.phase, nextAction: state.nextAction, evidence: state.evidence.length, attempts: state.attempts.length }, null, 2)); return state;
  }
  if (command === 'checkpoint') {
    const phase = option(rest, '--phase'), nextAction = option(rest, '--next-action'), action = option(rest, '--action'), result = option(rest, '--result');
    if (!text(phase) || !phases.has(phase) || !text(nextAction) || !text(action) || !text(result) || !onlyOptions(rest, ['--phase', '--next-action', '--action', '--result'])) fail(usage());
    state.phase = phase; state.nextAction = nextAction; state.attempts.push({ action, result }); replaceState(file, state); out(`Updated ${phase} checkpoint.`); return state;
  }
  const id = option(rest, '--id'), revision = option(rest, '--revision'), kind = option(rest, '--kind'), outcome = option(rest, '--outcome'), summary = option(rest, '--summary');
  if (![id, revision, kind, outcome, summary].every(text) || !onlyOptions(rest, ['--id', '--revision', '--kind', '--outcome', '--summary'])) fail(usage());
  state.evidence.push({ id, revision, kind, outcome, summary });
  const errors = validateState(state);
  if (errors.length) fail(errors.join('\n'));
  replaceState(file, state); out(`Recorded evidence ${id}.`); return state;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
