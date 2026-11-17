import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

function namedEntries(projectRoot, suffix, readDirectory = fs.readdirSync) {
  return readDirectory(projectRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.endsWith(suffix))
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

/** This module owns safe Xcode container and scheme selection for toolkit checks. */
export function discoverContainer(projectRoot, { readDirectory = fs.readdirSync } = {}) {
  const workspaces = namedEntries(projectRoot, '.xcworkspace', readDirectory);
  if (workspaces.length > 1) {
    throw Error(`Found multiple Xcode workspaces in ${projectRoot}: ${workspaces.join(', ')}. Choose one explicitly; no workspace was guessed.`);
  }
  if (workspaces.length === 1) return { flag: '-workspace', path: path.join(projectRoot, workspaces[0]) };

  const projects = namedEntries(projectRoot, '.xcodeproj', readDirectory);
  if (projects.length !== 1) {
    const detail = projects.length ? `Found: ${projects.join(', ')}.` : 'Found none.';
    throw Error(`${detail} Choose exactly one Xcode project or add an explicit workspace; no project was guessed.`);
  }
  return { flag: '-project', path: path.join(projectRoot, projects[0]) };
}

export function listCommand(container) {
  return ['xcodebuild', '-list', '-json', container.flag, container.path];
}

export function schemesFromList(listing) {
  const schemes = listing.workspace?.schemes ?? listing.project?.schemes;
  if (!Array.isArray(schemes) || !schemes.every(scheme => typeof scheme === 'string' && scheme.trim())) {
    throw Error('xcodebuild -list -json did not return a usable schemes list. Stop before building or testing.');
  }
  return [...new Set(schemes)].sort((left, right) => left.localeCompare(right));
}

export function selectScheme(schemes, requestedScheme) {
  if (requestedScheme !== undefined) {
    if (!schemes.includes(requestedScheme)) {
      throw Error(`Requested scheme "${requestedScheme}" is not in xcodebuild's discovered schemes: ${schemes.join(', ') || '(none)'}. Do not substitute another name.`);
    }
    return requestedScheme;
  }
  if (schemes.length === 1) return schemes[0];
  if (!schemes.length) throw Error('xcodebuild reported no schemes. Create or share a scheme before running a build or test.');
  throw Error(`Multiple schemes are available: ${schemes.join(', ')}. Choose the intended scheme explicitly; no scheme was guessed.`);
}

export function validationCommand({ container, scheme, action, destination }) {
  const supportedActions = new Set(['build', 'test', 'presentation']);
  if (!supportedActions.has(action)) throw Error(`Unsupported Xcode validation action "${action}".`);
  if ((action === 'test' || action === 'presentation') && !destination) {
    throw Error(`${action === 'test' ? 'Tests' : 'Presentation checks'} require an explicit validated simulator destination.`);
  }
  const command = ['xcodebuild', container.flag, container.path, '-scheme', scheme];
  if (destination) command.push('-destination', destination);
  command.push(action === 'test' ? 'test' : 'build', '-dry-run');
  return command;
}

export function runCommand(command, { run = spawnSync, cwd } = {}) {
  const [executable, ...argumentsList] = command;
  const result = run(executable, argumentsList, { cwd, encoding: 'utf8' });
  if (result.error) throw Error(`Could not run ${executable}: ${result.error.message}`);
  if (result.status !== 0) throw Error(`${command.join(' ')} failed:\n${result.stderr || result.stdout || 'No diagnostic output.'}`);
  return result.stdout;
}

export function discoverScheme(projectRoot, { requestedScheme, run = spawnSync, readDirectory = fs.readdirSync } = {}) {
  const container = discoverContainer(projectRoot, { readDirectory });
  const output = runCommand(listCommand(container), { run, cwd: projectRoot });
  let listing;
  try { listing = JSON.parse(output); } catch { throw Error('xcodebuild -list -json returned invalid JSON. Stop before building or testing.'); }
  return { container, scheme: selectScheme(schemesFromList(listing), requestedScheme) };
}

function parseArguments(argumentsList) {
  const [projectRoot, ...options] = argumentsList;
  if (!projectRoot) throw Error('Usage: node xcode-scheme-discovery.mjs <project-root> [--scheme <name>] [--action build|test|presentation] [--destination <destination>]');
  let requestedScheme;
  let action = 'build';
  let destination;
  for (let index = 0; index < options.length; index += 2) {
    const flag = options[index], value = options[index + 1];
    if (!value || !['--scheme', '--action', '--destination'].includes(flag)) throw Error('Usage: node xcode-scheme-discovery.mjs <project-root> [--scheme <name>] [--action build|test|presentation] [--destination <destination>]');
    if (flag === '--scheme') requestedScheme = value;
    if (flag === '--action') action = value;
    if (flag === '--destination') destination = value;
  }
  return { projectRoot: path.resolve(projectRoot), requestedScheme, action, destination };
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const discovered = discoverScheme(options.projectRoot, options);
    const command = validationCommand({ ...discovered, action: options.action, destination: options.destination });
    runCommand(command, { cwd: options.projectRoot });
    console.log(JSON.stringify({ container: discovered.container, scheme: discovered.scheme, validationCommand: command }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
