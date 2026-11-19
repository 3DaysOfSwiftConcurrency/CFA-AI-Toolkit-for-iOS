#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { main as engineMain } from '../skills/cfa-migration-orchestrator/scripts/orchestrator-state.mjs';
import { inspect } from '../skills/cfa-architecture-review/scripts/dashboard/src/inspector.mjs';
import { installWatchdog } from './cfa-migration-watchdog-install.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const configuredProjectRoot = process.env.CFA_MIGRATION_PROJECT_ROOT?.trim();

function migrationProject(value) {
  if (!configuredProjectRoot) return value;
  const allowedRoot = fs.realpathSync(configuredProjectRoot);
  const requestedRoot = fs.realpathSync(value);
  if (requestedRoot !== allowedRoot) {
    throw Error('The CFA Migration Engine is scoped to the project selected by its host application.');
  }
  return requestedRoot;
}

function migrationLedger(value) {
  if (!configuredProjectRoot) return value;
  const allowedRoot = fs.realpathSync(configuredProjectRoot);
  const allowedLedger = path.join(allowedRoot, 'MIGRATION_LEDGER.md');
  const requestedLedger = fs.existsSync(value)
    ? fs.realpathSync(value)
    : path.join(fs.realpathSync(path.dirname(value)), path.basename(value));
  if (requestedLedger !== allowedLedger) {
    throw Error('The CFA Migration Engine may update only MIGRATION_LEDGER.md in the project selected by its host application.');
  }
  return requestedLedger;
}

function text(value) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }], structuredContent: typeof value === 'object' ? value : undefined };
}

function continuationMessage(state) {
  const token = state.continuation?.pending?.token;
  return `A CFA migration continuation is ready with token ${token}. This is a wake-up signal, not the current migration state. First call cfa_migration_claim_continuation with this token and the ledger path. If it is stale, blocked, or completed, stop without performing work. If claimed, use the returned workerToken as continuationToken in every state-changing CFA migration call. Heartbeat before an operation likely to exceed the active lease. Continue every independent audit, fix, and verification action until the ledger is completed or a genuine user decision is required.`;
}

export const postMigrationReadabilityOffer = Object.freeze({
  status: 'optional',
  skill: '$enhanced-code-readability',
  prompt: '🎉 The migration to Swift Concurrency using CFA is complete. Would you like a feature-by-feature readability pass now?',
  note: 'This behaviour-preserving maintenance pass is separate from the completed migration and does not reopen its ledger.'
});

export function requestCodexContinuation(state, { execute = spawnSync, codex = 'codex' } = {}) {
  if (!state?.continuation) return { queued: false, reason: 'No Codex continuation is configured.' };
  if (state.phase === 'blocked') return { queued: false, reason: 'Migration is blocked.' };
  if (state.phase === 'completed') {
    return {
      queued: false,
      status: 'completed',
      reason: postMigrationReadabilityOffer.prompt,
      postMigrationReadability: postMigrationReadabilityOffer
    };
  }
  if (!state.continuation.pending?.token) return { queued: false, reason: 'No continuation reservation is pending.' };
  const result = execute(codex, ['queue', '--thread', state.continuation.threadId, '--resume', '--message', continuationMessage(state)], { encoding: 'utf8' });
  const detail = (result.stderr || result.stdout || '').trim();
  if (result.error) throw Error(`Could not queue Codex continuation: ${result.error.message}`);
  if (result.status !== 0) throw Error(`Could not queue Codex continuation: ${detail || `codex exited ${result.status}`}`);
  if (/could not resume thread/i.test(detail) && !/already has an active writer/i.test(detail)) {
    throw Error(`Could not queue Codex continuation: ${detail}`);
  }
  return { queued: true, threadId: state.continuation.threadId, resumed: !/already has an active writer/i.test(detail) };
}

async function queueNextContinuation(ledger, continuationToken, queueContinuation) {
  const reservation = await engineMain(['prepare-continuation', ledger, ...(continuationToken ? ['--continuation-token', continuationToken] : [])], { out: () => {} });
  if (!reservation.queued) return reservation;
  try {
    const continuation = queueContinuation(reservation.state);
    await engineMain(['mark-continuation-delivery', ledger, '--token', reservation.token], { out: () => {} });
    return continuation;
  } catch (error) {
    await engineMain(['release-continuation', ledger, '--token', reservation.token], { out: () => {} });
    throw error;
  }
}

async function recoverContinuation(ledger, queueContinuation) {
  const recovery = await engineMain(['recover-continuation', ledger], { out: () => {} });
  if (!recovery.queued) return recovery;
  try {
    const continuation = queueContinuation(recovery.state);
    await engineMain(['mark-continuation-delivery', ledger, '--token', recovery.token], { out: () => {} });
    return { ...recovery, continuation };
  } catch (error) {
    return { ...recovery, queueError: error instanceof Error ? error.message : String(error) };
  }
}

async function invoke(args, { continuationLedger, continuationToken, queueContinuation, includePostMigrationReadability = false } = {}) {
  const output = [];
  try {
    const value = await engineMain(args, { out: line => output.push(String(line)) });
    if (continuationLedger) {
      const continuation = await queueNextContinuation(continuationLedger, continuationToken, queueContinuation);
      if (continuation.queued) return text({ result: value ?? output.join('\n'), continuation });
    }
    const result = value ?? output.join('\n');
    return text(includePostMigrationReadability ? { result, postMigrationReadability: postMigrationReadabilityOffer } : result);
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
  }
}

function readShared(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

const nonEmpty = z.string().trim().min(1);
const ledger = z.string().trim().min(1);
const continuationToken = nonEmpty.optional();

export function createMigrationEngineServer({ queueContinuation = requestCodexContinuation, startWatchdog = installWatchdog } = {}) {
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
  server.registerResource('cfa-migration-post-completion-readability', 'cfa://migration-engine/post-migration-readability', {
    title: 'Optional post-migration readability pass', mimeType: 'text/markdown', description: 'The shared, opt-in readability workflow offered only after a completed migration.'
  }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readShared('skills/enhanced-code-readability/SKILL.md') }] }));

  server.registerTool('cfa_migration_init', {
    title: 'Initialize CFA migration', description: 'Append the Engine state block to an existing migration ledger without replacing any existing engine state.',
    inputSchema: z.object({ project: nonEmpty, goal: nonEmpty, scope: nonEmpty, ledger: ledger.optional() })
  }, ({ project, goal, scope, ledger: ledgerFile }) => invoke(['init', migrationProject(project), '--goal', goal, '--scope', scope, ...(ledgerFile ? ['--ledger', migrationLedger(ledgerFile)] : [])]));
  server.registerTool('cfa_migration_audit', {
    title: 'Audit a CFA migration', description: 'Run the shared inspector and migration analysis, then record review leads in the existing ledger. Scanner output is not a compliance verdict.',
    inputSchema: z.object({ project: nonEmpty, ledger, evidenceId: nonEmpty, continuationToken })
  }, ({ project, ledger: ledgerFile, evidenceId, continuationToken: token }) => {
    const selectedLedger = migrationLedger(ledgerFile);
    return invoke(['audit', migrationProject(project), '--ledger', selectedLedger, '--id', evidenceId, ...(token ? ['--continuation-token', token] : [])], { continuationLedger: selectedLedger, continuationToken: token, queueContinuation });
  });
  server.registerTool('cfa_migration_review_leads', {
    title: 'List CFA review leads', description: 'Read the shared CFA inspector’s current source locations and messages without writing to the project. Leads require semantic review; they are not conformance verdicts.',
    inputSchema: z.object({ project: nonEmpty, code: nonEmpty.optional() })
  }, async ({ project, code }) => {
    try {
      const report = await inspect(migrationProject(project));
      const leads = (report.findings ?? []).filter(finding => !code || finding.code === code);
      return text({ sourceFingerprint: report.sourceFingerprint, findings: leads });
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
    }
  });
  server.registerTool('cfa_migration_status', {
    title: 'Read migration status', description: 'Read the current migration goal, phase, baseline and next action from a validated ledger.',
    inputSchema: z.object({ ledger })
  }, ({ ledger: ledgerFile }) => invoke(['status', migrationLedger(ledgerFile)]));
  server.registerTool('cfa_migration_validate', {
    title: 'Validate migration ledger', description: 'Check the ledger state is internally consistent. This does not certify semantic CFA compliance.',
    inputSchema: z.object({ ledger })
  }, ({ ledger: ledgerFile }) => invoke(['validate', migrationLedger(ledgerFile)]));
  server.registerTool('cfa_migration_claim_continuation', {
    title: 'Claim a CFA migration continuation', description: 'Claim one reserved host continuation and return the current ledger state. Stale or terminal signals do no work; a completed migration returns its completion message.',
    inputSchema: z.object({ ledger, token: nonEmpty })
  }, ({ ledger: ledgerFile, token }) => invoke(['claim-continuation', migrationLedger(ledgerFile), '--token', token]));
  server.registerTool('cfa_migration_heartbeat_continuation', {
    title: 'Heartbeat an active CFA migration worker', description: 'Renew the claimed worker lease before a long-running migration action so automatic recovery does not duplicate live work.',
    inputSchema: z.object({ ledger, token: nonEmpty, leaseSeconds: z.number().int().min(30).max(86400).optional() })
  }, ({ ledger: ledgerFile, token, leaseSeconds }) => invoke(['heartbeat-continuation', migrationLedger(ledgerFile), '--token', token, ...(leaseSeconds ? ['--lease-seconds', String(leaseSeconds)] : [])]));
  server.registerTool('cfa_migration_recover_continuation', {
    title: 'Recover a stopped CFA migration', description: 'Inspect the continuation lease and requeue the Codex migration thread only when no worker is healthy. Safe to call repeatedly from a watchdog.',
    inputSchema: z.object({ ledger })
  }, async ({ ledger: ledgerFile }) => {
    try { return text(await recoverContinuation(migrationLedger(ledgerFile), queueContinuation)); }
    catch (error) { return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] }; }
  });
  server.registerTool('cfa_migration_reopen', {
    title: 'Reopen a completed CFA migration', description: 'Move a completed ledger back to verification when new evidence or stricter completion rules show work remains.',
    inputSchema: z.object({ ledger, reason: nonEmpty, nextAction: nonEmpty, continuationToken })
  }, ({ ledger: ledgerFile, reason, nextAction, continuationToken: token }) => {
    const selectedLedger = migrationLedger(ledgerFile);
    return invoke(['reopen', selectedLedger, '--reason', reason, '--next-action', nextAction, ...(token ? ['--continuation-token', token] : [])], { continuationLedger: selectedLedger, continuationToken: token, queueContinuation });
  });
  server.registerTool('cfa_migration_checkpoint', {
    title: 'Record migration checkpoint', description: 'Record an audit, fix, verification, review or completion-phase checkpoint in the existing ledger.',
    inputSchema: z.object({ ledger, phase: z.enum(['audit', 'fix', 'verify', 'hybrid-review', 'final-audit', 'human-review']), nextAction: nonEmpty, action: nonEmpty, result: nonEmpty, continuationToken })
  }, ({ ledger: ledgerFile, phase, nextAction, action, result, continuationToken: token }) => {
    const selectedLedger = migrationLedger(ledgerFile);
    return invoke(['checkpoint', selectedLedger, '--phase', phase, '--next-action', nextAction, '--action', action, '--result', result, ...(token ? ['--continuation-token', token] : [])], { continuationLedger: selectedLedger, continuationToken: token, queueContinuation });
  });
  server.registerTool('cfa_migration_evidence', {
    title: 'Record migration evidence', description: 'Append a source, build, test, behaviour or review fact to the existing migration ledger.',
    inputSchema: z.object({ ledger, id: nonEmpty, revision: nonEmpty, kind: nonEmpty, outcome: nonEmpty, summary: nonEmpty, continuationToken })
  }, ({ ledger: ledgerFile, id, revision, kind, outcome, summary, continuationToken: token }) => {
    const selectedLedger = migrationLedger(ledgerFile);
    return invoke(['evidence', selectedLedger, '--id', id, '--revision', revision, '--kind', kind, '--outcome', outcome, '--summary', summary, ...(token ? ['--continuation-token', token] : [])], { continuationLedger: selectedLedger, continuationToken: token, queueContinuation });
  });
  server.registerTool('cfa_migration_enable_continuation', {
    title: 'Enable self-healing Codex continuation', description: 'Configure the Codex chat and start a local watchdog that redelivers expired migration worker leases without requiring a person to resume work.',
    inputSchema: z.object({ ledger, codexThreadId: nonEmpty })
  }, async ({ ledger: ledgerFile, codexThreadId }) => {
    try {
      const selectedLedger = migrationLedger(ledgerFile);
      const result = await engineMain(['continuation', selectedLedger, '--codex-thread', codexThreadId], { out: () => {} });
      const watchdog = startWatchdog(selectedLedger);
      const continuation = await queueNextContinuation(selectedLedger, null, queueContinuation);
      return text({ result, watchdog, continuation });
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
    }
  });
  server.registerTool('cfa_migration_block', {
    title: 'Record migration blocker', description: 'Record a genuine external blocker and its exact unblocking condition.',
    inputSchema: z.object({ ledger, reason: nonEmpty, unblockCondition: nonEmpty, nextAction: nonEmpty, continuationToken })
  }, ({ ledger: ledgerFile, reason, unblockCondition, nextAction, continuationToken: token }) => {
    const selectedLedger = migrationLedger(ledgerFile);
    return invoke(['block', selectedLedger, '--reason', reason, '--unblock-condition', unblockCondition, '--next-action', nextAction, ...(token ? ['--continuation-token', token] : [])], { continuationLedger: selectedLedger, continuationToken: token, queueContinuation });
  });
  server.registerTool('cfa_migration_complete', {
    title: 'Record completed CFA migration', description: 'Close a migration only when every named completion-gate evidence ID already exists in the ledger, then return an optional separate readability follow-up.',
    inputSchema: z.object({ ledger, baseline: nonEmpty, build: nonEmpty, tests: nonEmpty, behaviourRegression: nonEmpty, primitiveInventory: nonEmpty, navigatorReview: nonEmpty, hybridReview: nonEmpty, finalCfaAudit: nonEmpty, humanArchitectureReview: nonEmpty, continuationToken })
  }, ({ ledger: ledgerFile, baseline, build, tests, behaviourRegression, primitiveInventory, navigatorReview, hybridReview, finalCfaAudit, humanArchitectureReview, continuationToken: token }) => {
    const selectedLedger = migrationLedger(ledgerFile);
    return invoke(['complete', selectedLedger, '--baseline', baseline, '--build', build, '--tests', tests, '--behaviour-regression', behaviourRegression, '--primitive-inventory', primitiveInventory, '--navigator-review', navigatorReview, '--hybrid-review', hybridReview, '--final-cfa-audit', finalCfaAudit, '--human-architecture-review', humanArchitectureReview, ...(token ? ['--continuation-token', token] : [])], { continuationLedger: selectedLedger, continuationToken: token, queueContinuation, includePostMigrationReadability: true });
  });
  return server;
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  serveStdio(() => createMigrationEngineServer(), { legacy: 'serve', onerror: error => console.error(error.message) });
}
