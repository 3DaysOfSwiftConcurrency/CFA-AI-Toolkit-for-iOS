#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ignoredDirectories = new Set(['.git', '.build', 'DerivedData', 'node_modules', 'Pods']);
const sourceExtensions = new Set(['.swift', '.xcscheme', '.xctestplan']);

function usage() {
  console.error('Usage: node snapshot-test-integrity.mjs <project-root> [--strict] [--json <report-path>]');
}

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return ignoredDirectories.has(entry.name) ? [] : walk(entryPath);
    if (sourceExtensions.has(path.extname(entry.name)) || entry.name === 'project.pbxproj') return [entryPath];
    return [];
  });
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function findingsFor(file, root) {
  const source = fs.readFileSync(file, 'utf8');
  const relativePath = path.relative(root, file);
  const isSnapshotTest = /snapshot/i.test(relativePath) || /\b(?:assertSnapshot|SnapshotTesting)\b/.test(source);
  const isLifecycleSource = /(?:AppDelegate|SceneDelegate|\/[^/]+App\.swift)$/i.test(relativePath);
  const findings = [];
  const addMatches = (pattern, severity, rule, message) => {
    for (const match of source.matchAll(pattern)) {
      findings.push({ path: relativePath, line: lineNumber(source, match.index), severity, rule, message });
    }
  };

  addMatches(/\b(?:CFA_UNIT_TEST_HOST|CFA_SNAPSHOT_TEST|SNAPSHOT_TEST_HOST)\b/g, 'error', 'test-only-launch-marker', 'A dedicated test-only launch marker can split product behaviour from test behaviour.');
  if (isLifecycleSource) {
    addMatches(/\b(?:ProcessInfo\.processInfo\.environment|launchEnvironment)\b/g, 'review', 'lifecycle-environment-branch', 'Review lifecycle environment branching: it must not replace the root, window or normal launch flow for tests.');
  }
  if (isSnapshotTest) {
    addMatches(/\b(?:Task\.sleep|Thread\.sleep|\busleep\s*\(|\bsleep\s*\(|asyncAfter\s*\()/g, 'error', 'artificial-wait', 'A snapshot test must wait for observable UI readiness, not elapsed time.');
    addMatches(/\bUIWindow\s*\(/g, 'error', 'synthetic-window', 'A product snapshot must not create a synthetic window.');
    addMatches(/\brootViewController\s*=/g, 'error', 'test-root-replacement', 'A test must not replace an application root controller.');
    addMatches(/assertSnapshot\s*\(\s*of:\s*[^\n]+\.view\b/g, 'review', 'direct-view-snapshot', 'Classify this as component-only or replace it with a simulator-driven product snapshot.');
    addMatches(/\.view\.frame\s*=/g, 'review', 'manual-screen-frame', 'A manually sized screen cannot verify a full product UI or native system chrome.');
    addMatches(/\brecord\s*:\s*true\b/g, 'error', 'reference-recording', 'Do not re-record a reference without an explicit, human-reviewed product contract.');
  }
  return findings;
}

function parseArguments(args) {
  const options = { strict: false, jsonPath: undefined, root: undefined };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--strict') options.strict = true;
    else if (argument === '--json') options.jsonPath = args[++index];
    else if (!options.root) options.root = argument;
    else return undefined;
  }
  return options;
}

export function inspectSnapshotTestIntegrity(root) {
  return walk(root).flatMap(file => findingsFor(file, root));
}

export function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  if (!options?.root || !fs.statSync(options.root, { throwIfNoEntry: false })?.isDirectory()) {
    usage();
    return 2;
  }

  const root = path.resolve(options.root);
  const findings = inspectSnapshotTestIntegrity(root);
  const errors = findings.filter(finding => finding.severity === 'error');
  const report = { root, findings, summary: { errors: errors.length, reviews: findings.length - errors.length } };

  if (options.jsonPath) fs.writeFileSync(path.resolve(options.jsonPath), `${JSON.stringify(report, null, 2)}\n`);
  for (const finding of findings) console.log(`${finding.severity.toUpperCase()} ${finding.path}:${finding.line} [${finding.rule}] ${finding.message}`);
  console.log(`Snapshot test integrity: ${report.summary.errors} blocking finding(s), ${report.summary.reviews} review finding(s).`);
  return options.strict && errors.length > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) process.exitCode = main();
