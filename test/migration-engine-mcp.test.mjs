import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

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
    'cfa_migration_audit', 'cfa_migration_block', 'cfa_migration_checkpoint', 'cfa_migration_complete',
    'cfa_migration_evidence', 'cfa_migration_init', 'cfa_migration_status', 'cfa_migration_validate'
  ]);
  const specification = await client.readResource({ uri: 'cfa://migration-engine/specification' });
  assert.match(specification.contents[0].text, /Cooperative Feature Architecture/);
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
