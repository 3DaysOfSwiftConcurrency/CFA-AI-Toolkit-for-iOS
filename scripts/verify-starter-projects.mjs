import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCFAProject, starters } from './create-cfa-project.mjs';

function swiftSources(directory) {
  return fs.readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.swift'))
    .map(file => path.join(directory, file));
}

function verifyStarter(starterName, outputRoot) {
  const starter = starters[starterName];
  if (!starter) throw Error(`Unknown starter: ${starterName}`);
  const name = `Verified${starterName.replaceAll('-', '')}`;
  const output = path.join(outputRoot, name);
  createCFAProject({ starterName, name, out: output });

  const project = path.join(output, `${name}.xcodeproj`, 'project.pbxproj');
  execFileSync('plutil', ['-lint', project], { stdio: 'pipe' });
  const projectContents = fs.readFileSync(project, 'utf8');
  const appBundleID = `com.3DaysOfSwiftConcurrency.${name}`;
  const testBundleID = `${appBundleID}.${name}Tests`;
  if (!projectContents.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${appBundleID};`) ||
      !projectContents.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${testBundleID};`)) {
    throw Error(`${starterName}: generated bundle identifiers are incomplete.`);
  }
  if (projectContents.includes(starter.codeName)) {
    throw Error(`${starterName}: generated project still contains its source code name.`);
  }
  for (const source of swiftSources(output)) {
    execFileSync('xcrun', ['swiftc', '-parse', source], { stdio: 'pipe' });
  }
}

export function verifyStarterProjects() {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-starter-verification-'));
  try {
    for (const starterName of Object.keys(starters)) verifyStarter(starterName, outputRoot);
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
  return true;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    verifyStarterProjects();
    console.log(`Verified ${Object.keys(starters).length} CLI starter projects.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
