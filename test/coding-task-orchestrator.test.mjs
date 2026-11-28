import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { root } from '../scripts/sync.mjs';

const skill = path.join(root, 'skills/coding-task-orchestrator');

test('project guidance installer preserves existing rules and is idempotent', t => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-orchestration-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const agents = path.join(project, 'AGENTS.md');
  fs.writeFileSync(agents, '# Existing project rules\n\nKeep product data private.\n');
  const installer = path.join(skill, 'scripts/install-cfa-orchestration-rule.sh');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = spawnSync('bash', [installer, project], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }

  const contents = fs.readFileSync(agents, 'utf8');
  assert.match(contents, /Keep product data private/);
  assert.equal((contents.match(/CFA-CODING-TASK-ORCHESTRATOR:START/g) ?? []).length, 1);
  assert.match(contents, /authoritative results are inspected/);
});

test('iOS runner documents its required evidence inputs', () => {
  const helper = path.join(skill, 'scripts/run-ios-tests.sh');
  const result = spawnSync('bash', [helper, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /result-bundle/);
  assert.match(result.stdout, /authoritative xcresult summary/);
});
