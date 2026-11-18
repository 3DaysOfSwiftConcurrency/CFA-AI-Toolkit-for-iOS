#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const requiredGate = ['baseline', 'build', 'tests', 'behaviourRegression', 'primitiveInventory', 'navigatorReview', 'hybridReview', 'finalCfaAudit', 'humanArchitectureReview'];

function fail(message) { throw Error(message); }
function read(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`Cannot read state record ${file}: ${error.message}`); }
}
function text(value) { return typeof value === 'string' && value.trim(); }
export function validateState(state) {
  const errors = [];
  if (state?.schemaVersion !== 2) errors.push('schemaVersion must be 2');
  for (const key of ['goal', 'scope', 'phase', 'nextAction']) if (!text(state?.[key])) errors.push(`${key} must be a non-empty string`);
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
  if (state?.phase === 'blocked') {
    if (!text(state?.blocker?.reason) || !text(state?.blocker?.unblockCondition)) errors.push('blocked state needs blocker reason and unblockCondition');
  }
  if (state?.phase === 'completed') {
    const gate = state.completionGate;
    if (!gate || typeof gate !== 'object') errors.push('completed state needs completionGate');
    else for (const key of requiredGate) {
      const id = gate[key];
      if (!text(id) || !ids.has(id)) errors.push(`completionGate.${key} must name recorded evidence`);
    }
  }
  return errors;
}
function git(project, args) {
  try { return execFileSync('git', ['-C', project, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}
function baseline(project) {
  const revision = git(project, ['rev-parse', 'HEAD']);
  const status = git(project, ['status', '--porcelain']);
  return { revision, dirty: status === null ? false : status.length > 0 };
}
export function initialState(goal, scope, project = process.cwd()) {
  return { schemaVersion: 2, goal, scope, baseline: baseline(project), phase: 'audit', nextAction: 'Establish the baseline and select the smallest verified migration slice.', evidence: [], attempts: [], blocker: null, completionGate: null };
}
function write(file, value) {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
}
function usage() { return 'Usage: orchestrator-state.mjs init <project> --goal <text> --scope <text> [--out <file>] | validate <record> | status <record>'; }
function arg(args, name) { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; }
function main(args) {
  const [command, target] = args;
  if (command === 'init') {
    const goal = arg(args, '--goal'), scope = arg(args, '--scope');
    if (!target || !text(goal) || !text(scope)) fail(usage());
    const project = path.resolve(target);
    if (!fs.statSync(project, { throwIfNoEntry: false })?.isDirectory()) fail(`Project directory does not exist: ${project}`);
    const file = path.resolve(arg(args, '--out') ?? path.join(target, '.cfa', 'migration-orchestrator.json'));
    if (fs.existsSync(file)) fail(`Refusing to overwrite existing state record: ${file}`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    write(file, initialState(goal, scope, project));
    console.log(file);
    return;
  }
  if (!target || !['validate', 'status'].includes(command)) fail(usage());
  const state = read(path.resolve(target));
  const errors = validateState(state);
  if (errors.length) fail(errors.join('\n'));
  if (command === 'status') console.log(JSON.stringify({ goal: state.goal, scope: state.scope, phase: state.phase, nextAction: state.nextAction, evidence: state.evidence.length, attempts: state.attempts.length }, null, 2));
  else console.log('Valid migration orchestrator state.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
