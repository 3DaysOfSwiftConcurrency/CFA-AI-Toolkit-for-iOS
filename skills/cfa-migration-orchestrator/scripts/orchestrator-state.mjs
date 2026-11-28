#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { inspect } from '../../cfa-architecture-review/scripts/dashboard/src/inspector.mjs';
import { analyseProject } from '../../swift-concurrency-migration/scripts/project-analysis/project-analysis.mjs';

const requiredGate = ['baseline', 'build', 'tests', 'behaviourRegression', 'primitiveInventory', 'navigatorReview', 'hybridReview', 'finalCfaAudit', 'humanArchitectureReview'];
const passedGate = new Set(['build', 'tests', 'behaviourRegression']);
const phases = new Set(['audit', 'fix', 'verify', 'hybrid-review', 'final-audit', 'human-review', 'blocked', 'completed']);
const start = '<!-- CFA Migration Engine state: managed -->';
const end = '<!-- /CFA Migration Engine state -->';
const defaultLeaseSeconds = 30 * 60;
const redeliverySeconds = 5 * 60;

function fail(message) { throw Error(message); }
function text(value) { return typeof value === 'string' && value.trim(); }
function git(project, args) {
  try { return execFileSync('git', ['-C', project, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}
function baseline(project) {
  const revision = git(project, ['rev-parse', 'HEAD']);
  const status = git(project, ['status', '--porcelain']);
  const meaningfulStatus = status === null ? '' : status.split('\n').filter(line => !line.endsWith('.cfa-migration.lock')).join('\n');
  return { revision, dirty: meaningfulStatus.length > 0 };
}
function diffCheck(project) {
  const result = spawnSync('git', ['-C', project, 'diff', '--check'], { encoding: 'utf8' });
  if (result.error) return { status: 'unavailable', detail: result.error.message };
  return result.status === 0 ? { status: 'passed', detail: '' } : { status: 'failed', detail: (result.stderr || result.stdout).trim() };
}
function sourceFingerprint(project, ledgerFile = null) {
  let files;
  try {
    files = execFileSync('git', ['-C', project, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'buffer' })
      .toString('utf8').split('\0').filter(Boolean).sort();
  } catch {
    files = [];
  }
  const ignored = ledgerFile ? path.relative(project, ledgerFile) : 'MIGRATION_LEDGER.md';
  const hash = createHash('sha256');
  for (const file of files) {
    if (file === ignored || file.endsWith('.cfa-migration.lock')) continue;
    const absolute = path.join(project, file);
    if (!fs.statSync(absolute, { throwIfNoEntry: false })?.isFile()) continue;
    hash.update(file); hash.update('\0'); hash.update(fs.readFileSync(absolute)); hash.update('\0');
  }
  return hash.digest('hex');
}
function now() { return new Date().toISOString(); }
function expiresAt(leaseSeconds) { return new Date(Date.now() + leaseSeconds * 1000).toISOString(); }
function leaseIsExpired(active) { return !active?.expiresAt || Date.parse(active.expiresAt) <= Date.now(); }
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
async function withLedgerLock(file, operation) {
  const lock = path.join(path.dirname(file), `.${path.basename(file)}.cfa-migration.lock`);
  try {
    const descriptor = fs.openSync(lock, 'wx', 0o600);
    fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, createdAt: now() }));
    fs.closeSync(descriptor);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const age = Date.now() - (fs.statSync(lock, { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
    if (age > defaultLeaseSeconds * 1000) {
      fs.unlinkSync(lock);
      return withLedgerLock(file, operation);
    }
    fail('Another migration worker is updating this ledger. The watchdog will retry automatically.');
  }
  try { return await operation(); }
  finally { fs.unlinkSync(lock, { force: true }); }
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
  return 'Usage: orchestrator-state.mjs init <project> --goal <text> --scope <text> [--ledger <existing-ledger.md>] | audit <project> --ledger <existing-ledger.md> --id <evidence-id> [--continuation-token <token>] | presentation-audit <project> --ledger <existing-ledger.md> --id <evidence-id> [--source-root <relative-source-directory>] [--continuation-token <token>] | validate <ledger.md> | status <ledger.md> | checkpoint <ledger.md> --phase <phase> --next-action <text> --action <text> --result <text> [--continuation-token <token>] | evidence <ledger.md> --id <id> --revision <revision> --kind <kind> --outcome <outcome> --summary <text> [--continuation-token <token>] | continuation <ledger.md> --codex-thread <thread-id> | prepare-continuation <ledger.md> [--continuation-token <token>] | recover-continuation <ledger.md> | mark-continuation-delivery <ledger.md> --token <token> | claim-continuation <ledger.md> --token <token> [--lease-seconds <seconds>] | heartbeat-continuation <ledger.md> --token <token> [--lease-seconds <seconds>] | release-continuation <ledger.md> --token <token> | reopen <ledger.md> --reason <text> --next-action <text> [--continuation-token <token>] | block <ledger.md> --reason <text> --unblock-condition <text> --next-action <text> [--continuation-token <token>] | complete <ledger.md> --baseline <id> --build <id> --tests <id> --behaviour-regression <id> --primitive-inventory <id> --navigator-review <id> --hybrid-review <id> --final-cfa-audit <id> --human-architecture-review <id> [--continuation-token <token>]';
}
function activeWorker(state, token) {
  const active = state.continuation?.active;
  if (!active && !state.continuation?.pending) return;
  if (!active) fail('A migration continuation is pending and must be claimed before changing this ledger.');
  if (active.token !== token) fail('The active migration worker lease must be supplied before changing this ledger.');
}
function leaseSeconds(value) {
  const parsed = value === undefined ? defaultLeaseSeconds : Number(value);
  if (!Number.isInteger(parsed) || parsed < 30 || parsed > 24 * 60 * 60) fail('Lease duration must be between 30 and 86400 seconds.');
  return parsed;
}
function continuationReservation(state) {
  const token = randomUUID();
  state.continuation.pending = { token, preparedAt: now(), lastQueuedAt: null, deliveryAttempts: 0 };
  return token;
}

export function validateState(state, project = null, ledgerFile = null) {
  const errors = [];
  if (![3, 4].includes(state?.schemaVersion)) errors.push('schemaVersion must be 3 or 4');
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
        !text(state.continuation.pending?.token)) ||
       (state.continuation.active !== undefined && state.continuation.active !== null &&
        (!text(state.continuation.active?.token) || !text(state.continuation.active?.claimedAt) ||
         !text(state.continuation.active?.heartbeatAt) || !text(state.continuation.active?.expiresAt))))) {
    errors.push('continuation must be null or name a Codex thread');
  }
  const evidence = Array.isArray(state?.evidence) ? state.evidence : [];
  const ids = new Set();
  for (const item of evidence) {
    if (!text(item?.id) || !text(item?.revision) || !text(item?.kind) || !text(item?.outcome) || !text(item?.summary)) errors.push('each evidence item needs id, revision, kind, outcome and summary');
    else if (state?.schemaVersion >= 4 && !text(item?.sourceFingerprint)) errors.push('each schema 4 evidence item needs a source fingerprint');
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
      else if (state.schemaVersion >= 4 && item.sourceFingerprint !== gate.sourceFingerprint) errors.push(`completionGate.${key} must match the final source fingerprint`);
    }
    if (state.schemaVersion >= 4 && (!gate || !text(gate.sourceFingerprint))) errors.push('completed schema 4 state needs completionGate.sourceFingerprint');
    if (state.schemaVersion >= 4 && gate && project && gate.sourceFingerprint !== sourceFingerprint(project, ledgerFile)) errors.push('completed migration source changed after its completion evidence');
  }
  return errors;
}

export function initialState(goal, scope, project = process.cwd()) {
  return { schemaVersion: 4, goal, scope, baseline: baseline(project), phase: 'audit', nextAction: 'Establish the baseline and select the smallest verified migration slice.', evidence: [], attempts: [], blocker: null, completionGate: null, continuation: null };
}
function checkedState(file) {
  const { state } = extract(readLedger(file));
  const errors = validateState(state, path.dirname(file), file);
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

function swiftFiles(root) {
  const excluded = new Set(['.build', '.git', 'DerivedData', 'node_modules']);
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (excluded.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith('.swift')) files.push(absolute);
    }
  }
  visit(root);
  return files.sort();
}

function matchingLines(source, pattern) {
  return source.split(/\r?\n/).flatMap((line, index) => pattern.test(line) ? [index + 1] : []);
}

/**
 * Finds presentation-migration leads without deciding whether any one lead is
 * a defect. UIKit projects use many legitimate lifecycle and presentation APIs;
 * their owner and behaviour must be reviewed before a migration changes them.
 */
export function presentationAuditProject(project, { sourceRoot, ...providers } = {}) {
  const root = sourceRoot ? path.resolve(project, sourceRoot) : project;
  if (!root.startsWith(`${project}${path.sep}`) && root !== project) fail('Presentation audit source root must be inside the selected project.');
  if (!fs.statSync(root, { throwIfNoEntry: false })?.isDirectory()) fail(`Presentation audit source root does not exist: ${root}`);
  const files = (providers.swiftFiles ?? swiftFiles)(root);
  const leads = [];
  const add = (file, code, lines) => {
    if (lines.length) leads.push({ file: path.relative(project, file), code, lines });
  };
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    add(file, 'uikit-controller', matchingLines(source, /:\s*(?:UI|NS)(?:Table|Collection)?ViewController\b/));
    add(file, 'method-swizzle', matchingLines(source, /\b(?:method_exchangeImplementations|class_(?:add|replace)Method)\b/));
    add(file, 'legacy-presentation-hook', matchingLines(source, /\b(?:bindViewModel|bindStyles)\s*\(/));
    add(file, 'lifecycle-named-api', matchingLines(source, /\bfunc\s+(?:viewDidLoad|viewWillAppear|viewDidAppear|viewWillDisappear|viewDidDisappear|viewDidLayoutSubviews)\s*\(/));
    add(file, 'composition-reach-through', matchingLines(source, /\bAppModel\.shared\b/));
    add(file, 'presentation-notification', matchingLines(source, /\bNotificationCenter\.default\.post\s*\(/));
  }
  const counts = Object.fromEntries([...leads.reduce((result, lead) =>
    result.set(lead.code, (result.get(lead.code) ?? 0) + lead.lines.length), new Map()).entries()].sort());
  return { sourceRoot: path.relative(project, root) || '.', swiftFiles: files.length, leads, counts };
}

export async function main(args, { out = console.log, providers = {}, locked = false } = {}) {
  const [command, target, ...rest] = args;
  const readOnly = new Set(['validate', 'status']);
  const suppliedLedger = option(rest, '--ledger');
  const ledger = command === 'init' && target ? path.resolve(suppliedLedger ?? path.join(target, 'MIGRATION_LEDGER.md')) :
    ['audit', 'presentation-audit'].includes(command) && suppliedLedger ? path.resolve(suppliedLedger) : target ? path.resolve(target) : null;
  if (!locked && ledger && !readOnly.has(command)) {
    return withLedgerLock(ledger, () => main(args, { out, providers, locked: true }));
  }
  if (command === 'init') {
    const goal = option(rest, '--goal'), scope = option(rest, '--scope');
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
    const ledgerOption = option(rest, '--ledger'), id = option(rest, '--id'), continuationToken = option(rest, '--continuation-token');
    if (!target || !text(ledgerOption) || !text(id) || !onlyOptions(rest, ['--ledger', '--id', '--continuation-token'])) fail(usage());
    const project = path.resolve(target), file = path.resolve(ledgerOption), state = checkedState(file);
    activeWorker(state, continuationToken);
    const report = await auditProject(project, providers);
    state.phase = 'audit';
    state.nextAction = `Semantically review ${report.findings} scanner lead(s), starting with the applicable ownership, lifecycle and task-lifetime paths.`;
    state.evidence.push({ id, revision: git(project, ['rev-parse', 'HEAD']) ?? 'unavailable', sourceFingerprint: sourceFingerprint(project, file), kind: 'cfa-engine-audit', outcome: 'observed', summary: `Fingerprint ${report.sourceFingerprint ?? 'unavailable'}; ${report.swiftFiles ?? 'unknown'} Swift files; ${report.findings} scanner leads; diff check ${report.diffCheck}; SwiftSyntax ${report.syntax}; compiler index ${report.compilerIndex}; codes ${JSON.stringify(report.findingsByCode)}.` });
    state.attempts.push({ action: 'Ran the CFA architecture inspector and migration project analysis.', result: 'Recorded scanner leads as review candidates; scanner output is not a conformance verdict.' });
    const errors = validateState(state, project, file);
    if (errors.length) fail(errors.join('\n'));
    replaceState(file, state); out(JSON.stringify(report, null, 2)); return report;
  }
  if (command === 'presentation-audit') {
    const ledgerOption = option(rest, '--ledger'), id = option(rest, '--id'), sourceRoot = option(rest, '--source-root'), continuationToken = option(rest, '--continuation-token');
    if (!target || !text(ledgerOption) || !text(id) || !onlyOptions(rest, ['--ledger', '--id', '--source-root', '--continuation-token'])) fail(usage());
    const project = path.resolve(target), file = path.resolve(ledgerOption), state = checkedState(file);
    if (state.phase === 'completed') fail('Reopen the completed migration before recording a UIKit-to-SwiftUI presentation audit.');
    activeWorker(state, continuationToken);
    const report = presentationAuditProject(project, { ...providers, sourceRoot });
    state.phase = 'audit';
    state.nextAction = 'Trace the smallest screen-sized presentation lead, record its current behaviour, and extract one responsibility before replacing UIKit rendering.';
    state.evidence.push({ id, revision: git(project, ['rev-parse', 'HEAD']) ?? 'unavailable', sourceFingerprint: sourceFingerprint(project, file), kind: 'presentation-migration-audit', outcome: 'observed', summary: `Inspected ${report.swiftFiles} Swift files under ${report.sourceRoot}. Lead occurrences ${JSON.stringify(report.counts)}. These are source-review leads, not defect or ownership verdicts.` });
    state.attempts.push({ action: 'Ran the UIKit-to-SwiftUI presentation audit.', result: 'Recorded lifecycle, swizzle, composition, and notification leads for semantic ownership review before any renderer replacement.' });
    const errors = validateState(state, project, file);
    if (errors.length) fail(errors.join('\n'));
    replaceState(file, state); out(JSON.stringify(report, null, 2)); return report;
  }
  const file = target && path.resolve(target);
  if (!file || !['validate', 'status', 'checkpoint', 'evidence', 'continuation', 'prepare-continuation', 'recover-continuation', 'mark-continuation-delivery', 'claim-continuation', 'heartbeat-continuation', 'release-continuation', 'reopen', 'block', 'complete'].includes(command)) fail(usage());
  if (command === 'validate') { if (rest.length) fail(usage()); checkedState(file); out('Valid CFA Migration Engine state.'); return; }
  if (command === 'reopen') {
    const reason = option(rest, '--reason'), nextAction = option(rest, '--next-action'), continuationToken = option(rest, '--continuation-token');
    if (![reason, nextAction].every(text) || !onlyOptions(rest, ['--reason', '--next-action', '--continuation-token'])) fail(usage());
    const { state } = extract(readLedger(file));
    if (state.phase !== 'completed') fail('Only a completed migration can be reopened.');
    activeWorker(state, continuationToken);
    state.phase = 'verify'; state.nextAction = nextAction; state.blocker = null; state.completionGate = null;
    if (state.continuation) { state.continuation.pending = null; state.continuation.active = null; }
    state.attempts.push({ action: 'Reopened completed migration.', result: reason });
    const errors = validateState(state, path.dirname(file), file);
    if (errors.length) fail(errors.join('\n'));
    replaceState(file, state); out('Reopened migration in verify phase.'); return state;
  }
  if (command === 'block') {
    const reason = option(rest, '--reason'), unblockCondition = option(rest, '--unblock-condition'), nextAction = option(rest, '--next-action'), continuationToken = option(rest, '--continuation-token');
    if (![reason, unblockCondition, nextAction].every(text) || !onlyOptions(rest, ['--reason', '--unblock-condition', '--next-action', '--continuation-token'])) fail(usage());
    const { state } = extract(readLedger(file));
    if (state.continuation?.active) activeWorker(state, continuationToken);
    state.phase = 'blocked'; state.nextAction = nextAction; state.blocker = { reason, unblockCondition };
    state.completionGate = null;
    if (state.continuation) { state.continuation.pending = null; state.continuation.active = null; }
    state.attempts.push({ action: 'Recorded a migration blocker.', result: reason });
    const errors = validateState(state, path.dirname(file), file);
    if (errors.length) fail(errors.join('\n'));
    replaceState(file, state); out('Recorded blocked checkpoint.'); return state;
  }
  const state = checkedState(file);
  if (command === 'status') {
    if (rest.length) fail(usage());
    out(JSON.stringify({ goal: state.goal, scope: state.scope, baseline: state.baseline, phase: state.phase, nextAction: state.nextAction, evidence: state.evidence.length, attempts: state.attempts.length, continuation: state.continuation ?? null }, null, 2)); return state;
  }
  if (command === 'checkpoint') {
    const phase = option(rest, '--phase'), nextAction = option(rest, '--next-action'), action = option(rest, '--action'), result = option(rest, '--result'), continuationToken = option(rest, '--continuation-token');
    const checkpointPhases = new Set(['audit', 'fix', 'verify', 'hybrid-review', 'final-audit', 'human-review']);
    if (!text(phase) || !checkpointPhases.has(phase) || !text(nextAction) || !text(action) || !text(result) || !onlyOptions(rest, ['--phase', '--next-action', '--action', '--result', '--continuation-token'])) fail(usage());
    activeWorker(state, continuationToken);
    state.phase = phase; state.nextAction = nextAction; state.blocker = null; state.completionGate = null;
    state.attempts.push({ action, result });
    const errors = validateState(state, path.dirname(file), file);
    if (errors.length) fail(errors.join('\n'));
    replaceState(file, state); out(`Updated ${phase} checkpoint.`); return state;
  }
  if (command === 'continuation') {
    const threadId = option(rest, '--codex-thread');
    if (!text(threadId) || !onlyOptions(rest, ['--codex-thread'])) fail(usage());
    state.continuation = { host: 'codex', threadId, pending: null, active: null };
    state.attempts.push({ action: 'Enabled Codex continuation.', result: `Nonterminal checkpoints queue thread ${threadId} to continue.` });
    replaceState(file, state); out('Enabled Codex continuation.'); return state;
  }
  if (command === 'prepare-continuation') {
    const continuationToken = option(rest, '--continuation-token');
    if (!onlyOptions(rest, ['--continuation-token'])) fail(usage());
    if (!state.continuation) { const result = { queued: false, reason: 'No Codex continuation is configured.' }; out(JSON.stringify(result)); return result; }
    if (state.phase === 'blocked' || state.phase === 'completed') { const result = { queued: false, reason: `Migration is ${state.phase}.` }; out(JSON.stringify(result)); return result; }
    if (state.continuation.active) {
      if (state.continuation.active.token !== continuationToken) {
        const result = { queued: false, reason: 'The active migration worker lease must finish, heartbeat, or expire before another continuation is queued.' };
        out(JSON.stringify(result)); return result;
      }
      state.continuation.active = null;
    }
    if (state.continuation.pending) { const result = { queued: false, reason: 'A continuation is already pending.', token: state.continuation.pending.token }; out(JSON.stringify(result)); return result; }
    const token = continuationReservation(state);
    replaceState(file, state);
    const result = { queued: true, token, state };
    out(JSON.stringify(result)); return result;
  }
  if (command === 'recover-continuation') {
    if (rest.length) fail(usage());
    if (!state.continuation) { const result = { queued: false, reason: 'No Codex continuation is configured.' }; out(JSON.stringify(result)); return result; }
    if (state.phase === 'blocked' || state.phase === 'completed') { const result = { queued: false, reason: `Migration is ${state.phase}.` }; out(JSON.stringify(result)); return result; }
    if (state.continuation.active && !leaseIsExpired(state.continuation.active)) {
      const result = { queued: false, reason: 'An active migration worker lease is still healthy.', active: state.continuation.active };
      out(JSON.stringify(result)); return result;
    }
    if (state.continuation.active) {
      state.attempts.push({ action: 'Recovered an expired Codex continuation lease.', result: 'The previous migration worker stopped heartbeating before recording another checkpoint.' });
      state.continuation.active = null;
    }
    if (!state.continuation.pending) continuationReservation(state);
    const lastQueuedAt = state.continuation.pending.lastQueuedAt;
    if (lastQueuedAt && Date.parse(lastQueuedAt) > Date.now() - redeliverySeconds * 1000) {
      const result = { queued: false, reason: 'The pending migration continuation was queued recently.', pending: state.continuation.pending };
      out(JSON.stringify(result)); return result;
    }
    replaceState(file, state);
    const result = { queued: true, token: state.continuation.pending.token, state };
    out(JSON.stringify(result)); return result;
  }
  if (command === 'mark-continuation-delivery') {
    const token = option(rest, '--token');
    if (!text(token) || !onlyOptions(rest, ['--token'])) fail(usage());
    if (state.continuation?.pending?.token !== token) fail('Only the current pending continuation can be marked as delivered.');
    state.continuation.pending.lastQueuedAt = now();
    state.continuation.pending.deliveryAttempts = Number(state.continuation.pending.deliveryAttempts ?? 0) + 1;
    replaceState(file, state);
    const result = { delivered: true, pending: state.continuation.pending };
    out(JSON.stringify(result)); return result;
  }
  if (command === 'heartbeat-continuation') {
    const token = option(rest, '--token'), seconds = option(rest, '--lease-seconds');
    if (!text(token) || !onlyOptions(rest, ['--token', '--lease-seconds'])) fail(usage());
    const duration = leaseSeconds(seconds);
    if (!state.continuation?.active || state.continuation.active.token !== token) fail('Only the active migration worker can heartbeat this ledger.');
    state.continuation.active.heartbeatAt = now(); state.continuation.active.expiresAt = expiresAt(duration);
    replaceState(file, state);
    const result = { heartbeated: true, active: state.continuation.active };
    out(JSON.stringify(result)); return result;
  }
  if (command === 'claim-continuation' || command === 'release-continuation') {
    const token = option(rest, '--token'), seconds = option(rest, '--lease-seconds');
    if (!text(token) || !onlyOptions(rest, command === 'claim-continuation' ? ['--token', '--lease-seconds'] : ['--token'])) fail(usage());
    if (state.phase === 'blocked') {
      const result = { claimed: false, reason: 'Migration is blocked.', blocker: state.blocker, nextAction: state.nextAction };
      out(JSON.stringify(result)); return result;
    }
    if (state.phase === 'completed') {
      const result = {
        claimed: false,
        status: 'completed',
        reason: '🎉 The migration to Swift Concurrency using CFA is complete.',
        nextAction: 'No further migration work is required. The required completion evidence is recorded.'
      };
      out(JSON.stringify(result)); return result;
    }
    if (!state.continuation?.pending || state.continuation.pending.token !== token) {
      const result = { claimed: false, reason: 'Continuation is stale or has already been claimed.' };
      out(JSON.stringify(result)); return result;
    }
    if (command === 'claim-continuation') {
      const claimedAt = now();
      state.continuation.pending = null;
      const duration = leaseSeconds(seconds);
      state.continuation.active = { token, claimedAt, heartbeatAt: claimedAt, expiresAt: expiresAt(duration) };
    } else {
      state.continuation.pending = null;
    }
    state.attempts.push({ action: command === 'claim-continuation' ? 'Claimed Codex continuation.' : 'Released Codex continuation reservation.', result: command === 'claim-continuation' ? 'The host signal matches the current ledger state.' : 'The host queue did not accept the reserved signal.' });
    replaceState(file, state);
    const result = command === 'claim-continuation' ? { claimed: true, workerToken: token, leaseSeconds: leaseSeconds(seconds), state } : { released: true };
    out(JSON.stringify(result)); return result;
  }
  if (command === 'complete') {
    const flags = ['--baseline', '--build', '--tests', '--behaviour-regression', '--primitive-inventory', '--navigator-review', '--hybrid-review', '--final-cfa-audit', '--human-architecture-review'];
    const continuationToken = option(rest, '--continuation-token');
    if (!onlyOptions(rest, [...flags, '--continuation-token'])) fail(usage());
    activeWorker(state, continuationToken);
    const completionGate = { baseline: option(rest, '--baseline'), build: option(rest, '--build'), tests: option(rest, '--tests'), behaviourRegression: option(rest, '--behaviour-regression'), primitiveInventory: option(rest, '--primitive-inventory'), navigatorReview: option(rest, '--navigator-review'), hybridReview: option(rest, '--hybrid-review'), finalCfaAudit: option(rest, '--final-cfa-audit'), humanArchitectureReview: option(rest, '--human-architecture-review') };
    if (!Object.values(completionGate).every(text)) fail(usage());
    if (state.schemaVersion >= 4) completionGate.sourceFingerprint = sourceFingerprint(path.dirname(file), file);
    state.phase = 'completed'; state.nextAction = 'Migration completion evidence is recorded.'; state.blocker = null; state.completionGate = completionGate;
    if (state.continuation) { state.continuation.pending = null; state.continuation.active = null; }
    const errors = validateState(state, path.dirname(file), file); if (errors.length) fail(errors.join('\n'));
    replaceState(file, state); out('Recorded completed migration checkpoint.'); return state;
  }
  const id = option(rest, '--id'), revision = option(rest, '--revision'), kind = option(rest, '--kind'), outcome = option(rest, '--outcome'), summary = option(rest, '--summary'), continuationToken = option(rest, '--continuation-token');
  if (![id, revision, kind, outcome, summary].every(text) || !onlyOptions(rest, ['--id', '--revision', '--kind', '--outcome', '--summary', '--continuation-token'])) fail(usage());
  activeWorker(state, continuationToken);
  state.evidence.push({ id, revision, sourceFingerprint: sourceFingerprint(path.dirname(file), file), kind, outcome, summary });
  const errors = validateState(state, path.dirname(file), file);
  if (errors.length) fail(errors.join('\n'));
  replaceState(file, state); out(`Recorded evidence ${id}.`); return state;
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try { await main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
