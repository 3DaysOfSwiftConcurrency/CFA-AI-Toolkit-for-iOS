#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { main as engineMain, readState } from '../skills/cfa-migration-orchestrator/scripts/orchestrator-state.mjs';
import { inspect } from '../skills/cfa-architecture-review/scripts/dashboard/src/inspector.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function text(value) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }], structuredContent: typeof value === 'object' ? value : undefined };
}

function continuationMessage(state) {
  return `Continue the MCP-backed CFA migration immediately. The ledger is in ${state.phase} with next action: ${state.nextAction} Do not conclude because an individual verification check is unavailable. Continue every independent audit, fix and verification action until the ledger is completed or a genuine user decision is required.`;
}

export function requestCodexContinuation(state, { execute = spawnSync, codex = 'codex' } = {}) {
  if (!state?.continuation) return { queued: false, reason: 'No Codex continuation is configured.' };
  if (state.phase === 'blocked' || state.phase === 'completed') return { queued: false, reason: `Migration is ${state.phase}.` };
  const result = execute(codex, ['queue', '--thread', state.continuation.threadId, '--resume', '--message', continuationMessage(state)], { encoding: 'utf8' });
  const detail = (result.stderr || result.stdout || '').trim();
  if (result.error) throw Error(`Could not queue Codex continuation: ${result.error.message}`);
  if (result.status !== 0) throw Error(`Could not queue Codex continuation: ${detail || `codex exited ${result.status}`}`);
  if (/could not resume thread/i.test(detail) && !/already has an active writer/i.test(detail)) {
    throw Error(`Could not queue Codex continuation: ${detail}`);
  }
  return { queued: true, threadId: state.continuation.threadId, resumed: !/already has an active writer/i.test(detail) };
}

async function invoke(args, { continuationLedger, queueContinuation } = {}) {
  const output = [];
  try {
    const value = await engineMain(args, { out: line => output.push(String(line)) });
    if (continuationLedger) {
      const continuation = queueContinuation(readState(continuationLedger));
      if (continuation.queued) return text({ result: value ?? output.join('\n'), continuation });
    }
    return text(value ?? output.join('\n'));
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
  }
}

function readShared(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

const nonEmpty = z.string().trim().min(1);
const ledger = z.string().trim().min(1);

export function createMigrationEngineServer({ queueContinuation = requestCodexContinuation } = {}) {
  const server = new McpServer({ name: 'cfa-migration-engine', version: packageManifest.version });
  server.registerResource('cfa-migration-workflow', 'cfa://migration-engine/workflow', {
    title: 'CFA migration workflow', mimeType: 'text/markdown', description: 'The shared migration workflow used by the CFA Migration Engine.'
  }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readShared('skills/cfa-migration-orchestrator/SKILL.md') }] }));
  server.registerResource('cfa-specification', 'cfa://migration-engine/specification', {
    title: 'CFA specification', mimeType: 'text/markdown', description: 'The canonical CFA rules; the MCP server does not maintain a second copy.'
  }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readShared('architecture/cfa-specification.md') }] }));
  server.registerResource('cfa-migration-engine-reference', 'cfa://migration-engine/state-reference', {
    title: 'CFA Migration Engine state reference', mimeType: 'text/markdown', description: 'Ledger state and completion-gate semantics.'
  }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readShared('skills/cfa-migration-orchestrator/references/orchestrator-state.md') }] }));

  server.registerTool('cfa_migration_init', {
    title: 'Initialize CFA migration', description: 'Append the Engine state block to an existing migration ledger without replacing any existing engine state.',
    inputSchema: z.object({ project: nonEmpty, goal: nonEmpty, scope: nonEmpty, ledger: ledger.optional() })
  }, ({ project, goal, scope, ledger: ledgerFile }) => invoke(['init', project, '--goal', goal, '--scope', scope, ...(ledgerFile ? ['--ledger', ledgerFile] : [])]));
  server.registerTool('cfa_migration_audit', {
    title: 'Audit a CFA migration', description: 'Run the shared inspector and migration analysis, then record review leads in the existing ledger. Scanner output is not a compliance verdict.',
    inputSchema: z.object({ project: nonEmpty, ledger, evidenceId: nonEmpty })
  }, ({ project, ledger: ledgerFile, evidenceId }) => invoke(['audit', project, '--ledger', ledgerFile, '--id', evidenceId], { continuationLedger: ledgerFile, queueContinuation }));
  server.registerTool('cfa_migration_review_leads', {
    title: 'List CFA review leads', description: 'Read the shared CFA inspector’s current source locations and messages without writing to the project. Leads require semantic review; they are not conformance verdicts.',
    inputSchema: z.object({ project: nonEmpty, code: nonEmpty.optional() })
  }, async ({ project, code }) => {
    try {
      const report = await inspect(project);
      const leads = (report.findings ?? []).filter(finding => !code || finding.code === code);
      return text({ sourceFingerprint: report.sourceFingerprint, findings: leads });
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
    }
  });
  server.registerTool('cfa_migration_status', {
    title: 'Read migration status', description: 'Read the current migration goal, phase, baseline and next action from a validated ledger.',
    inputSchema: z.object({ ledger })
  }, ({ ledger: ledgerFile }) => invoke(['status', ledgerFile]));
  server.registerTool('cfa_migration_validate', {
    title: 'Validate migration ledger', description: 'Check the ledger state is internally consistent. This does not certify semantic CFA compliance.',
    inputSchema: z.object({ ledger })
  }, ({ ledger: ledgerFile }) => invoke(['validate', ledgerFile]));
  server.registerTool('cfa_migration_checkpoint', {
    title: 'Record migration checkpoint', description: 'Record an audit, fix, verification, review or completion-phase checkpoint in the existing ledger.',
    inputSchema: z.object({ ledger, phase: z.enum(['audit', 'fix', 'verify', 'hybrid-review', 'final-audit', 'human-review', 'blocked', 'completed']), nextAction: nonEmpty, action: nonEmpty, result: nonEmpty })
  }, ({ ledger: ledgerFile, phase, nextAction, action, result }) => invoke(['checkpoint', ledgerFile, '--phase', phase, '--next-action', nextAction, '--action', action, '--result', result], { continuationLedger: ledgerFile, queueContinuation }));
  server.registerTool('cfa_migration_evidence', {
    title: 'Record migration evidence', description: 'Append a source, build, test, behaviour or review fact to the existing migration ledger.',
    inputSchema: z.object({ ledger, id: nonEmpty, revision: nonEmpty, kind: nonEmpty, outcome: nonEmpty, summary: nonEmpty })
  }, ({ ledger: ledgerFile, id, revision, kind, outcome, summary }) => invoke(['evidence', ledgerFile, '--id', id, '--revision', revision, '--kind', kind, '--outcome', outcome, '--summary', summary], { continuationLedger: ledgerFile, queueContinuation }));
  server.registerTool('cfa_migration_enable_continuation', {
    title: 'Enable Codex continuation', description: 'Configure this ledger to queue the same Codex chat after every successful non-terminal migration update. Requires a local Codex host with `codex queue` support.',
    inputSchema: z.object({ ledger, codexThreadId: nonEmpty })
  }, ({ ledger: ledgerFile, codexThreadId }) => invoke(['continuation', ledgerFile, '--codex-thread', codexThreadId], { continuationLedger: ledgerFile, queueContinuation }));
  server.registerTool('cfa_migration_block', {
    title: 'Record migration blocker', description: 'Record a genuine external blocker and its exact unblocking condition.',
    inputSchema: z.object({ ledger, reason: nonEmpty, unblockCondition: nonEmpty, nextAction: nonEmpty })
  }, ({ ledger: ledgerFile, reason, unblockCondition, nextAction }) => invoke(['block', ledgerFile, '--reason', reason, '--unblock-condition', unblockCondition, '--next-action', nextAction], { continuationLedger: ledgerFile, queueContinuation }));
  server.registerTool('cfa_migration_complete', {
    title: 'Record completed CFA migration', description: 'Close a migration only when every named completion-gate evidence ID already exists in the ledger.',
    inputSchema: z.object({ ledger, baseline: nonEmpty, build: nonEmpty, tests: nonEmpty, behaviourRegression: nonEmpty, primitiveInventory: nonEmpty, navigatorReview: nonEmpty, hybridReview: nonEmpty, finalCfaAudit: nonEmpty, humanArchitectureReview: nonEmpty })
  }, ({ ledger: ledgerFile, baseline, build, tests, behaviourRegression, primitiveInventory, navigatorReview, hybridReview, finalCfaAudit, humanArchitectureReview }) => invoke(['complete', ledgerFile, '--baseline', baseline, '--build', build, '--tests', tests, '--behaviour-regression', behaviourRegression, '--primitive-inventory', primitiveInventory, '--navigator-review', navigatorReview, '--hybrid-review', hybridReview, '--final-cfa-audit', finalCfaAudit, '--human-architecture-review', humanArchitectureReview], { continuationLedger: ledgerFile, queueContinuation }));
  return server;
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  serveStdio(() => createMigrationEngineServer(), { legacy: 'serve', onerror: error => console.error(error.message) });
}
