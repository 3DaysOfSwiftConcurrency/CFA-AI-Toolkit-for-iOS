import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { requestCodexContinuation } from '../mcp/cfa-migration-engine.mjs';

const server = path.resolve('mcp/cfa-migration-engine.mjs');
function project(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-mcp-project-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'MIGRATION_LEDGER.md'), '# Migration ledger\n');
  fs.writeFileSync(path.join(directory, 'HomeView.swift'), 'import SwiftUI\nstruct HomeView: View { var body: some View { Text("Home") } }\n');
  assert.equal(spawnSync('git', ['init', '-q', directory]).status, 0);
  assert.equal(spawnSync('git', ['-C', directory, 'config', 'user.email', 'test@example.com']).status, 0);
  assert.equal(spawnSync('git', ['-C', directory, 'config', 'user.name', 'Test User']).status, 0);
  assert.equal(spawnSync('git', ['-C', directory, 'add', '.']).status, 0);
  assert.equal(spawnSync('git', ['-C', directory, 'commit', '-qm', 'Baseline']).status, 0);
  return directory;
}
async function connected(t) {
  const transport = new StdioClientTransport({ command: process.execPath, args: [server], cwd: process.cwd(), stderr: 'pipe' });
  const client = new Client({ name: 'cfa-migration-engine-test', version: '1.0.0' });
  await client.connect(transport);
  t.after(async () => { await client.close(); });
  return client;
}

test('MCP server exposes the shared CFA workflow and its migration tools', async t => {
  const client = await connected(t);
  const [{ resources }, { tools }] = await Promise.all([client.listResources(), client.listTools()]);
  assert.deepEqual(resources.map(resource => resource.uri).sort(), [
    'cfa://migration-engine/specification',
    'cfa://migration-engine/state-reference',
    'cfa://migration-engine/workflow'
  ]);
  assert.deepEqual(tools.map(tool => tool.name).sort(), [
    'cfa_migration_audit', 'cfa_migration_block', 'cfa_migration_checkpoint', 'cfa_migration_claim_continuation',
    'cfa_migration_complete', 'cfa_migration_enable_continuation', 'cfa_migration_evidence', 'cfa_migration_init', 'cfa_migration_reopen', 'cfa_migration_review_leads', 'cfa_migration_status', 'cfa_migration_validate'
  ]);
  const specification = await client.readResource({ uri: 'cfa://migration-engine/specification' });
  assert.match(specification.contents[0].text, /Cooperative Feature Architecture/);
});

test('Codex continuation queues only active migrations in their configured chat', () => {
  const calls = [];
  const result = requestCodexContinuation({ continuation: { host: 'codex', threadId: 'thread-123', pending: { token: 'token-123' } }, phase: 'fix', nextAction: 'Review the next source lead.' }, {
    execute: (...args) => { calls.push(args); return { status: 0, stdout: '', stderr: '' }; }
  });
  assert.deepEqual(result, { queued: true, threadId: 'thread-123', resumed: true });
  assert.deepEqual(calls[0][0], 'codex');
  assert.deepEqual(calls[0][1].slice(0, 5), ['queue', '--thread', 'thread-123', '--resume', '--message']);
  assert.match(calls[0][1][5], /token token-123/);
  assert.match(calls[0][1][5], /not the current migration state/);
  assert.deepEqual(requestCodexContinuation({ continuation: { host: 'codex', threadId: 'thread-123', pending: { token: 'token-123' } }, phase: 'completed', nextAction: 'Done.' }), {
    queued: false,
    status: 'completed',
    reason: '🎉 The migration to Swift Concurrency using CFA is complete.'
  });
  assert.throws(() => requestCodexContinuation({ continuation: { host: 'codex', threadId: 'thread-123', pending: { token: 'token-123' } }, phase: 'verify', nextAction: 'Run tests.' }, {
    execute: () => ({ status: 0, stderr: 'Warning: could not resume thread thread-123', stdout: '' })
  }), /Could not queue Codex continuation/);
  assert.deepEqual(requestCodexContinuation({ continuation: { host: 'codex', threadId: 'thread-123', pending: { token: 'token-123' } }, phase: 'audit', nextAction: 'Continue source review.' }, {
    execute: () => ({ status: 0, stderr: 'Warning: message was queued, but could not resume thread thread-123: thread already has an active writer', stdout: '' })
  }), { queued: true, threadId: 'thread-123', resumed: false });
  assert.deepEqual(requestCodexContinuation({ continuation: { host: 'codex', threadId: 'thread-123' }, phase: 'audit', nextAction: 'Continue source review.' }), { queued: false, reason: 'No continuation reservation is pending.' });
});

test('MCP server returns current source locations as review leads without writing a ledger', async t => {
  const directory = project(t);
  const client = await connected(t);
  const result = await client.callTool({ name: 'cfa_migration_review_leads', arguments: { project: directory } });
  assert.equal(result.isError, undefined, JSON.stringify(result));
  assert.match(result.content[0].text, /app-model-missing/);
  assert.equal(fs.readFileSync(path.join(directory, 'MIGRATION_LEDGER.md'), 'utf8'), '# Migration ledger\n');
});

test('MCP server runs the existing engine without creating a second ledger format', async t => {
  const directory = project(t);
  const client = await connected(t);
  const initialized = await client.callTool({ name: 'cfa_migration_init', arguments: { project: directory, goal: 'Audit the app', scope: 'Main app target' } });
  assert.equal(initialized.isError, undefined);
  const ledger = path.join(directory, 'MIGRATION_LEDGER.md');
  const audited = await client.callTool({ name: 'cfa_migration_audit', arguments: { project: directory, ledger, evidenceId: 'mcp-audit' } });
  assert.equal(audited.isError, undefined, JSON.stringify(audited));
  const valid = await client.callTool({ name: 'cfa_migration_validate', arguments: { ledger } });
  assert.equal(valid.isError, undefined, JSON.stringify(valid));
  const contents = fs.readFileSync(ledger, 'utf8');
  assert.match(contents, /CFA Migration Engine state: managed/);
  assert.match(contents, /"id": "mcp-audit"/);
  assert.equal(fs.existsSync(path.join(directory, '.cfa')), false);
});
