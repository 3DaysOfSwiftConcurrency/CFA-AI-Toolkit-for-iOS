#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { inspect } from '../../cfa-architecture-review/scripts/dashboard/src/inspector.mjs';
import { analyseProject } from '../../swift-concurrency-migration/scripts/project-analysis/project-analysis.mjs';

const requiredGate = ['baseline', 'build', 'tests', 'behaviourRegression', 'primitiveInventory', 'navigatorReview', 'hybridReview', 'finalCfaAudit', 'humanArchitectureReview'];
const passedGate = new Set(['build', 'tests', 'behaviourRegression']);
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
function diffCheck(project) {
  const result = spawnSync('git', ['-C', project, 'diff', '--check'], { encoding: 'utf8' });
  if (result.error) return { status: 'unavailable', detail: result.error.message };
  return result.status === 0 ? { status: 'passed', detail: '' } : { status: 'failed', detail: (result.stderr || result.stdout).trim() };
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
  return 'Usage: orchestrator-state.mjs init <project> --goal <text> --scope <text> [--ledger <existing-ledger.md>] | audit <project> --ledger <existing-ledger.md> --id <evidence-id> | validate <ledger.md> | status <ledger.md> | checkpoint <ledger.md> --phase <phase> --next-action <text> --action <text> --result <text> | evidence <ledger.md> --id <id> --revision <revision> --kind <kind> --outcome <outcome> --summary <text> | continuation <ledger.md> --codex-thread <thread-id> | prepare-continuation <ledger.md> | claim-continuation <ledger.md> --token <token> | release-continuation <ledger.md> --token <token> | reopen <ledger.md> --reason <text> --next-action <text> | block <ledger.md> --reason <text> --unblock-condition <text> --next-action <text> | complete <ledger.md> --baseline <id> --build <id> --tests <id> --behaviour-regression <id> --primitive-inventory <id> --navigator-review <id> --hybrid-review <id> --final-cfa-audit <id> --human-architecture-review <id>';
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
  if (state?.continuation !== null && state?.continuation !== undefined &&
      (state.continuation?.host !== 'codex' || !text(state.continuation?.threadId) ||
       (state.continuation.pending !== undefined && state.continuation.pending !== null &&
        !text(state.continuation.pending?.token)))) {
    errors.push('continuation must be null or name a Codex thread');
  }
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
    else for (const key of requiredGate) {
      const id = gate[key];
      const item = evidence.find(candidate => candidate.id === id);
      if (!text(id) || !item) errors.push(`completionGate.${key} must name recorded evidence`);
      else if (passedGate.has(key) && item.outcome !== 'passed') errors.push(`completionGate.${key} requires passed evidence`);
    }
  }
  return errors;
}

export function initialState(goal, scope, project = process.cwd()) {
  return { schemaVersion: 3, goal, scope, baseline: baseline(project), phase: 'audit', nextAction: 'Establish the baseline and select the smallest verified migration slice.', evidence: [], attempts: [], blocker: null, completionGate: null, continuation: null };
}
function checkedState(file) {
  const { state } = extract(readLedger(file));
  const errors = validateState(state);
  if (errors.length) fail(errors.join('\n'));
  return state;
}
export function readState(file) {
  return checkedState(file);
}
export async function auditProject(project, providers = {}) {
  const inspection = await (providers.inspect ?? inspect)(project);
  const analysis = await (providers.analyseProject ?? analyseProject)(project);
  const findings = inspection.findings ?? [];
  const diff = (providers.diffCheck ?? diffCheck)(project);
  const byCode = Object.fromEntries([...findings.reduce((counts, item) =>
    counts.set(item.code, (counts.get(item.code) ?? 0) + 1), new Map()).entries()].sort());
  return {
    sourceFingerprint: inspection.sourceFingerprint ?? analysis.sourceFingerprint,
    swiftFiles: inspection.scope?.swiftFiles ?? analysis.scope?.files ?? null,
    findings: findings.length,
    findingsByCode: byCode,
    syntax: analysis.syntax?.status ?? 'unavailable',
    compilerIndex: analysis.compilerIndex?.status ?? 'unavailable',
    diffCheck: diff.status
  };
}

export async function main(args, { out = console.log, providers = {} } = {}) {
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
  if (command === 'audit') {
    const ledgerOption = option(rest, '--ledger'), id = option(rest, '--id');
    if (!target || !text(ledgerOption) || !text(id) || !onlyOptions(rest, ['--ledger', '--id'])) fail(usage());
    const project = path.resolve(target), file = path.resolve(ledgerOption), state = checkedState(file);
    const report = await auditProject(project, providers);
    state.phase = 'audit';
    state.nextAction = `Semantically review ${report.findings} scanner lead(s), starting with the applicable ownership, lifecycle and task-lifetime paths.`;
    state.evidence.push({ id, revision: git(project, ['rev-parse', 'HEAD']) ?? 'unavailable', kind: 'cfa-engine-audit', outcome: 'observed', summary: `Fingerprint ${report.sourceFingerprint ?? 'unavailable'}; ${report.swiftFiles ?? 'unknown'} Swift files; ${report.findings} scanner leads; diff check ${report.diffCheck}; SwiftSyntax ${report.syntax}; compiler index ${report.compilerIndex}; codes ${JSON.stringify(report.findingsByCode)}.` });
    state.attempts.push({ action: 'Ran the CFA architecture inspector and migration project analysis.', result: 'Recorded scanner leads as review candidates; scanner output is not a conformance verdict.' });
    const errors = validateState(state);
    if (errors.length) fail(errors.join('\n'));
    replaceState(file, state); out(JSON.stringify(report, null, 2)); return report;
  }
  const file = target && path.resolve(target);
  if (!file || !['validate', 'status', 'checkpoint', 'evidence', 'continuation', 'prepare-continuation', 'claim-continuation', 'release-continuation', 'reopen', 'block', 'complete'].includes(command)) fail(usage());
  if (command === 'validate') { if (rest.length) fail(usage()); checkedState(file); out('Valid CFA Migration Engine state.'); return; }
  if (command === 'reopen') {
    const reason = option(rest, '--reason'), nextAction = option(rest, '--next-action');
    if (![reason, nextAction].every(text) || !onlyOptions(rest, ['--reason', '--next-action'])) fail(usage());
    const { state } = extract(readLedger(file));
    if (state.phase !== 'completed') fail('Only a completed migration can be reopened.');
    state.phase = 'verify'; state.nextAction = nextAction; state.blocker = null; state.completionGate = null;
    if (state.continuation) state.continuation.pending = null;
    state.attempts.push({ action: 'Reopened completed migration.', result: reason });
    const errors = validateState(state);
    if (errors.length) fail(errors.join('\n'));
    replaceState(file, state); out('Reopened migration in verify phase.'); return state;
  }
  if (command === 'block') {
    const reason = option(rest, '--reason'), unblockCondition = option(rest, '--unblock-condition'), nextAction = option(rest, '--next-action');
    if (![reason, unblockCondition, nextAction].every(text) || !onlyOptions(rest, ['--reason', '--unblock-condition', '--next-action'])) fail(usage());
    const { state } = extract(readLedger(file));
    state.phase = 'blocked'; state.nextAction = nextAction; state.blocker = { reason, unblockCondition };
    state.completionGate = null;
    if (state.continuation) state.continuation.pending = null;
    state.attempts.push({ action: 'Recorded a migration blocker.', result: reason });
    const errors = validateState(state);
    if (errors.length) fail(errors.join('\n'));
    replaceState(file, state); out('Recorded blocked checkpoint.'); return state;
  }
  const state = checkedState(file);
  if (command === 'status') {
    if (rest.length) fail(usage());
    out(JSON.stringify({ goal: state.goal, scope: state.scope, baseline: state.baseline, phase: state.phase, nextAction: state.nextAction, evidence: state.evidence.length, attempts: state.attempts.length, continuation: state.continuation ?? null }, null, 2)); return state;
  }
  if (command === 'checkpoint') {
    const phase = option(rest, '--phase'), nextAction = option(rest, '--next-action'), action = option(rest, '--action'), result = option(rest, '--result');
    const checkpointPhases = new Set(['audit', 'fix', 'verify', 'hybrid-review', 'final-audit', 'human-review']);
    if (!text(phase) || !checkpointPhases.has(phase) || !text(nextAction) || !text(action) || !text(result) || !onlyOptions(rest, ['--phase', '--next-action', '--action', '--result'])) fail(usage());
    state.phase = phase; state.nextAction = nextAction; state.blocker = null; state.completionGate = null;
    state.attempts.push({ action, result });
    const errors = validateState(state);
    if (errors.length) fail(errors.join('\n'));
    replaceState(file, state); out(`Updated ${phase} checkpoint.`); return state;
  }
  if (command === 'continuation') {
    const threadId = option(rest, '--codex-thread');
    if (!text(threadId) || !onlyOptions(rest, ['--codex-thread'])) fail(usage());
    state.continuation = { host: 'codex', threadId, pending: null };
    state.attempts.push({ action: 'Enabled Codex continuation.', result: `Nonterminal checkpoints queue thread ${threadId} to continue.` });
    replaceState(file, state); out('Enabled Codex continuation.'); return state;
  }
  if (command === 'prepare-continuation') {
    if (rest.length) fail(usage());
    if (!state.continuation) { const result = { queued: false, reason: 'No Codex continuation is configured.' }; out(JSON.stringify(result)); return result; }
    if (state.phase === 'blocked' || state.phase === 'completed') { const result = { queued: false, reason: `Migration is ${state.phase}.` }; out(JSON.stringify(result)); return result; }
    if (state.continuation.pending) { const result = { queued: false, reason: 'A continuation is already pending.', token: state.continuation.pending.token }; out(JSON.stringify(result)); return result; }
    const token = randomUUID();
    state.continuation.pending = { token };
    replaceState(file, state);
    const result = { queued: true, token, state };
    out(JSON.stringify(result)); return result;
  }
  if (command === 'claim-continuation' || command === 'release-continuation') {
    const token = option(rest, '--token');
    if (!text(token) || !onlyOptions(rest, ['--token'])) fail(usage());
    if (!state.continuation?.pending || state.continuation.pending.token !== token) {
      const result = { claimed: false, reason: state.phase === 'completed' ? 'Migration is completed.' : 'Continuation is stale or has already been claimed.' };
      out(JSON.stringify(result)); return result;
    }
    state.continuation.pending = null;
    state.attempts.push({ action: command === 'claim-continuation' ? 'Claimed Codex continuation.' : 'Released Codex continuation reservation.', result: command === 'claim-continuation' ? 'The host signal matches the current ledger state.' : 'The host queue did not accept the reserved signal.' });
    replaceState(file, state);
    const result = command === 'claim-continuation' ? { claimed: true, state } : { released: true };
    out(JSON.stringify(result)); return result;
  }
  if (command === 'complete') {
    const flags = ['--baseline', '--build', '--tests', '--behaviour-regression', '--primitive-inventory', '--navigator-review', '--hybrid-review', '--final-cfa-audit', '--human-architecture-review'];
    if (!onlyOptions(rest, flags)) fail(usage());
    const completionGate = { baseline: option(rest, '--baseline'), build: option(rest, '--build'), tests: option(rest, '--tests'), behaviourRegression: option(rest, '--behaviour-regression'), primitiveInventory: option(rest, '--primitive-inventory'), navigatorReview: option(rest, '--navigator-review'), hybridReview: option(rest, '--hybrid-review'), finalCfaAudit: option(rest, '--final-cfa-audit'), humanArchitectureReview: option(rest, '--human-architecture-review') };
    if (!Object.values(completionGate).every(text)) fail(usage());
    state.phase = 'completed'; state.nextAction = 'Migration completion evidence is recorded.'; state.blocker = null; state.completionGate = completionGate;
    if (state.continuation) state.continuation.pending = null;
    const errors = validateState(state); if (errors.length) fail(errors.join('\n'));
    replaceState(file, state); out('Recorded completed migration checkpoint.'); return state;
  }
  const id = option(rest, '--id'), revision = option(rest, '--revision'), kind = option(rest, '--kind'), outcome = option(rest, '--outcome'), summary = option(rest, '--summary');
  if (![id, revision, kind, outcome, summary].every(text) || !onlyOptions(rest, ['--id', '--revision', '--kind', '--outcome', '--summary'])) fail(usage());
  state.evidence.push({ id, revision, kind, outcome, summary });
  const errors = validateState(state);
  if (errors.length) fail(errors.join('\n'));
  replaceState(file, state); out(`Recorded evidence ${id}.`); return state;
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try { await main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
