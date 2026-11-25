import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const excludedDirectories = new Set(['.git', '.build', '.swiftpm', 'Pods', 'Carthage', 'DerivedData', 'node_modules', 'build']);

function sourceFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(entry.name)) visit(absolute);
      } else if (entry.isFile() && (entry.name.endsWith('.swift') || entry.name.endsWith('.pbxproj') ||
        entry.name.endsWith('.xcscheme') || entry.name === 'Package.resolved')) {
        files.push(path.relative(root, absolute));
      }
    }
  }
  visit(root);
  return files.sort();
}

export function sourceFingerprint(root) {
  const hash = crypto.createHash('sha256');
  const files = sourceFiles(root);
  if (!files.length) throw Error(`No Swift or Xcode project files found in ${root}.`);
  for (const file of files) {
    hash.update(file).update('\0').update(fs.readFileSync(path.join(root, file))).update('\0');
  }
  return { sha256: hash.digest('hex'), files: files.length };
}

function containerAt(root) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const workspaces = entries.filter(entry => entry.isDirectory() && entry.name.endsWith('.xcworkspace'));
  const projects = entries.filter(entry => entry.isDirectory() && entry.name.endsWith('.xcodeproj'));
  if (workspaces.length === 1) return ['-workspace', path.join(root, workspaces[0].name)];
  if (!workspaces.length && projects.length === 1) return ['-project', path.join(root, projects[0].name)];
  throw Error('Choose a project root with exactly one workspace, or one project when no workspace exists.');
}

function invoke(argumentsList, root, run) {
  const result = run('xcodebuild', argumentsList, { cwd: root, encoding: 'utf8', maxBuffer: 100 * 1024 * 1024, timeout: 30 * 60 * 1000 });
  if (result.error) throw Error(`xcodebuild could not run: ${result.error.message}`);
  if (result.status !== 0) throw Error(`xcodebuild ${argumentsList.join(' ')} failed (exit ${result.status}):\n${(result.stderr || result.stdout || '').slice(-8000)}`);
  return result.stdout;
}

export function verifyRenameBuild({ root, scheme, destination, evidencePath, action = 'build', run = spawnSync }) {
  if (!scheme || !destination || !evidencePath) throw Error('A scheme, explicit destination and evidence path are required.');
  if (!['build', 'build-for-testing'].includes(action)) throw Error(`Unsupported build action: ${action}`);
  root = path.resolve(root);
  evidencePath = path.resolve(evidencePath);
  if (!/^READABILITY_BUILD_EVIDENCE(?:-[\w-]+)?\.json$/.test(path.basename(evidencePath))) {
    throw Error('Evidence path must name a READABILITY_BUILD_EVIDENCE.json file (optionally with a scheme suffix).');
  }
  // Previous success must never survive a failed rebuild.
  fs.rmSync(evidencePath, { force: true });
  const container = containerAt(root);
  const listing = JSON.parse(invoke(['-list', '-json', ...container], root, run));
  const schemes = listing.workspace?.schemes ?? listing.project?.schemes;
  if (!Array.isArray(schemes) || !schemes.includes(scheme)) throw Error(`Scheme ${scheme} was not returned by xcodebuild -list -json.`);
  const command = [...container, '-scheme', scheme, '-destination', destination, 'CODE_SIGNING_ALLOWED=NO', action];
  const before = sourceFingerprint(root);
  invoke([...command, '-dry-run'], root, run);
  invoke(command, root, run);
  const after = sourceFingerprint(root);
  if (before.sha256 !== after.sha256) throw Error('Source changed during the build; rebuild at the final source revision.');
  const evidence = { status: 'verified', root, scheme, destination, action, command: ['xcodebuild', ...command], source: after };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  return evidence;
}

export function checkRenameBuild({ root, evidencePath }) {
  root = path.resolve(root);
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const current = sourceFingerprint(root);
  if (evidence.status !== 'verified' || evidence.root !== root || evidence.source?.sha256 !== current.sha256 ||
      evidence.source?.files !== current.files) throw Error('Rename build evidence does not match the final source; rebuild before completion.');
  return evidence;
}

function cli(argumentsList) {
  const [action, projectRoot, ...options] = argumentsList;
  const values = {};
  for (let index = 0; index < options.length; index += 2) {
    if (!options[index]?.startsWith('--') || !options[index + 1]) throw Error('Expected paired --scheme, --destination, --evidence or --build-action arguments.');
    values[options[index]] = options[index + 1];
  }
  if (!projectRoot || !values['--evidence']) throw Error('Usage: rename-build-gate.mjs verify|check <project-root> --evidence <file> [--scheme <name> --destination <destination> --build-action build|build-for-testing]');
  const root = path.resolve(projectRoot);
  const evidencePath = path.resolve(values['--evidence']);
  if (action === 'check') return checkRenameBuild({ root, evidencePath });
  if (action === 'verify') return verifyRenameBuild({ root, scheme: values['--scheme'], destination: values['--destination'], evidencePath, action: values['--build-action'] });
  throw Error(`Unknown action: ${action}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(cli(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
