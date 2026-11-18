#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { main as engineMain } from '../skills/cfa-migration-orchestrator/scripts/orchestrator-state.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function text(value) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }], structuredContent: typeof value === 'object' ? value : undefined };
}

async function invoke(args) {
  const output = [];
  try {
    const value = await engineMain(args, { out: line => output.push(String(line)) });
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

export function createMigrationEngineServer() {
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
  }, ({ project, ledger: ledgerFile, evidenceId }) => invoke(['audit', project, '--ledger', ledgerFile, '--id', evidenceId]));
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
  }, ({ ledger: ledgerFile, phase, nextAction, action, result }) => invoke(['checkpoint', ledgerFile, '--phase', phase, '--next-action', nextAction, '--action', action, '--result', result]));
  server.registerTool('cfa_migration_evidence', {
    title: 'Record migration evidence', description: 'Append a source, build, test, behaviour or review fact to the existing migration ledger.',
    inputSchema: z.object({ ledger, id: nonEmpty, revision: nonEmpty, kind: nonEmpty, outcome: nonEmpty, summary: nonEmpty })
  }, ({ ledger: ledgerFile, id, revision, kind, outcome, summary }) => invoke(['evidence', ledgerFile, '--id', id, '--revision', revision, '--kind', kind, '--outcome', outcome, '--summary', summary]));
  server.registerTool('cfa_migration_block', {
    title: 'Record migration blocker', description: 'Record a genuine external blocker and its exact unblocking condition.',
    inputSchema: z.object({ ledger, reason: nonEmpty, unblockCondition: nonEmpty, nextAction: nonEmpty })
  }, ({ ledger: ledgerFile, reason, unblockCondition, nextAction }) => invoke(['block', ledgerFile, '--reason', reason, '--unblock-condition', unblockCondition, '--next-action', nextAction]));
  server.registerTool('cfa_migration_complete', {
    title: 'Record completed CFA migration', description: 'Close a migration only when every named completion-gate evidence ID already exists in the ledger.',
    inputSchema: z.object({ ledger, baseline: nonEmpty, build: nonEmpty, tests: nonEmpty, behaviourRegression: nonEmpty, primitiveInventory: nonEmpty, navigatorReview: nonEmpty, hybridReview: nonEmpty, finalCfaAudit: nonEmpty, humanArchitectureReview: nonEmpty })
  }, ({ ledger: ledgerFile, baseline, build, tests, behaviourRegression, primitiveInventory, navigatorReview, hybridReview, finalCfaAudit, humanArchitectureReview }) => invoke(['complete', ledgerFile, '--baseline', baseline, '--build', build, '--tests', tests, '--behaviour-regression', behaviourRegression, '--primitive-inventory', primitiveInventory, '--navigator-review', navigatorReview, '--hybrid-review', hybridReview, '--final-cfa-audit', finalCfaAudit, '--human-architecture-review', humanArchitectureReview]));
  return server;
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  serveStdio(() => createMigrationEngineServer(), { legacy: 'serve', onerror: error => console.error(error.message) });
}
