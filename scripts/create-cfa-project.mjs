import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Each entry names one maintained, ready-to-open starter project. The project is
// copied directly so the CLI never creates a second, drifting implementation.
export const starters = {
  app: { source: 'CFA App', codeName: 'CFAApp', displayName: 'CFA App', summary: 'A small Home and Settings tab app with complete CFA slices.' },
  blank: { source: 'CFA Blank', codeName: 'CFABlank', displayName: 'CFA Blank', summary: 'Empty CFA project infrastructure; add the first complete feature yourself.' },
  'habit-tracker': { source: 'Habit Tracker', codeName: 'HabitTrackerTemplate', displayName: 'Habit Tracker', summary: 'Habits, daily progress, persistence, and streaks.' },
  'habit-tracker-pro': { source: 'Habit Tracker Pro', codeName: 'HabitTrackerPro', displayName: 'Habit Tracker Pro', summary: 'Habit tracking plus trends and a StoreKit purchase example.' },
  'day-streak': { source: 'Todays Twenty', codeName: 'TimesThirty', displayName: 'Todays Twenty', summary: 'A durable daily-practice workflow and reusable day-streak feature.' },
  'remote-list': { source: 'Git Repos', codeName: 'GitRepos', displayName: 'Git Repos', summary: 'A remote list with caching, shared refresh, retry, and external links.' }
};

function usage() {
  return [
    'Usage: node scripts/create-cfa-project.mjs --starter <starter> --name <AppName> --out <directory>',
    '',
    'Supported starters:',
    ...Object.entries(starters).map(([name, starter]) => `  ${name.padEnd(18)} ${starter.summary}`),
    '',
    'Use --list to print this catalogue. AppName must be a bundle-identifier-safe Swift name.'
  ].join('\n');
}

function readArguments(argv) {
  if (argv.length === 1 && argv[0] === '--list') return { list: true };
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) values.set(argv[index], argv[index + 1]);
  const starterName = values.get('--starter') ?? values.get('--template') ?? 'blank';
  const name = values.get('--name');
  const out = values.get('--out');
  if ((argv.length !== 4 && argv.length !== 6) || !starters[starterName] || !name || !out || !/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
    throw Error(usage());
  }
  return { starterName, name, out: path.resolve(out) };
}

function renamePaths(directory, from, to) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) renamePaths(source, from, to);
    const renamed = entry.name.replaceAll(from, to);
    if (renamed !== entry.name) fs.renameSync(source, path.join(directory, renamed));
  }
}

function isTextProjectFile(file) {
  return /\.(swift|pbxproj|xcscheme|md|plist|json|storekit|storyboard)$/.test(file);
}

function rewriteProjectIdentity(directory, starter, name) {
  const targetBundleIdentifier = `com.3DaysOfSwiftConcurrency.${name}`;
  for (const relative of fs.readdirSync(directory, { recursive: true, encoding: 'utf8' })) {
    const file = path.join(directory, relative);
    if (!fs.statSync(file).isFile() || !isTextProjectFile(file)) continue;
    const contents = fs.readFileSync(file, 'utf8')
      .replaceAll(`com.3DaysOfSwiftConcurrency.${starter.codeName}`, targetBundleIdentifier)
      .replaceAll(starter.codeName, name)
      .replaceAll(starter.displayName, name);
    fs.writeFileSync(file, contents);
  }
}

export function createCFAProject({ starterName = 'blank', name, out }) {
  const starter = starters[starterName];
  if (!starter) throw Error(`Unknown starter: ${starterName}\n\n${usage()}`);
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) throw Error(`Invalid app name: ${name}`);
  if (fs.existsSync(out)) throw Error(`Destination already exists: ${out}`);
  fs.cpSync(path.join(root, 'starter-apps', starter.source), out, { recursive: true });
  renamePaths(out, starter.codeName, name);
  rewriteProjectIdentity(out, starter, name);
  return out;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = readArguments(process.argv.slice(2));
    if (options.list) console.log(usage());
    else console.log(`Created ${createCFAProject(options)}`);
  }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
