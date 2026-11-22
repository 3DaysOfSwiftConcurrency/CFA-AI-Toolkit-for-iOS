import fs from 'node:fs/promises';
import path from 'node:path';

const viewFiles = /\.(?:storyboard|xib)$/i;
const appResources = /\.(?:xcprivacy|entitlements|storekit|strings|stringsdict|xcstrings|plist|json|pdf|png|jpe?g|heic|svg|gif|webp|mp3|m4a|wav|mp4|mov|ttf|otf|html|css|js|xml|sqlite|db|mlmodel|mlmodelc|reality|rcproject|scn|sks)$/i;
const folderNames = ['1 - View', '2 - AppModel', '3 - App Resources', '4 - Swift Extensions'];

function destinationFor(file, appRoot) {
  const relative = path.posix.relative(appRoot, file);
  const parts = relative.split('/');
  const name = parts.at(-1);
  if (parts[0] === 'Assets.xcassets' || name === 'Info.plist') return null;
  if (parts.some(part => part.endsWith('.xcassets'))) {
    const catalog = parts.findIndex(part => part.endsWith('.xcassets'));
    return {source: path.posix.join(appRoot, ...parts.slice(0, catalog + 1)),
      destination: path.posix.join(appRoot, parts[catalog]), directory: true};
  }
  let folder;
  if (viewFiles.test(name)) folder = '1 - View';
  else if (appResources.test(name)) folder = '3 - App Resources';
  else return null; // Source, project metadata and unknown formats need ownership review.
  if (parts[0] === folder) return null;
  // Keep localized resources together; moving a .lproj member by itself breaks localization.
  const localized = parts.findIndex(part => part.endsWith('.lproj'));
  const suffix = localized >= 0 ? parts.slice(localized) : [name];
  return {source: file, destination: path.posix.join(appRoot, folder, ...suffix), directory: false};
}

// Reads paths from the complete inventory. Xcode's synchronized groups follow
// disk moves; a classic PBXGroup needs an explicit reference edit and review.
export async function reviewFilePlacement(root, projectFiles) {
  const projects = projectFiles.filter(file => file.endsWith('.xcodeproj/project.pbxproj'));
  const roots = new Map();
  for (const project of projects) {
    const source = await fs.readFile(path.join(root, project), 'utf8');
    const base = path.posix.dirname(path.posix.dirname(project));
    for (const group of source.matchAll(/isa = PBXFileSystemSynchronizedRootGroup;[\s\S]*?\bpath = (?:"([^"]+)"|([^;\s]+));/g)) {
      const appRoot = path.posix.normalize(path.posix.join(base, group[1] ?? group[2]));
      roots.set(appRoot, {project, synchronized: true, source});
    }
    // Classic projects can still be audited, but their resource references
    // cannot safely be changed by a simple filesystem rename.
    for (const file of projectFiles) {
      const parts = file.split('/');
      const appRoot = path.posix.join(base, parts[base === '.' ? 0 : base.split('/').length]);
      if (file.startsWith(`${base === '.' ? '' : base + '/'}${parts[base === '.' ? 0 : base.split('/').length]}/`) &&
          parts.some(part => folderNames.includes(part))) {
        if (!roots.has(appRoot)) roots.set(appRoot, {project, synchronized: false, source});
      }
    }
  }
  const entries = new Map();
  const locations = [];
  for (const file of projectFiles) {
    // Dot-files can contain Finder, Git, or tool configuration metadata.
    // Inventory them, but never treat them as movable app resources.
    if (path.posix.basename(file).startsWith('.')) {
      locations.push({file, status: 'ignored-hidden-file', expected: null});
      continue;
    }
    const appRoot = [...roots.keys()].filter(candidate => file.startsWith(`${candidate}/`)).sort((a, b) => b.length - a.length)[0];
    if (!appRoot || file.includes('.xcodeproj/')) {
      locations.push({file, status: 'outside-app-target', expected: null});
      continue;
    }
    if (/(?:Tests|UITests)$/i.test(path.posix.basename(appRoot))) {
      locations.push({file, status: 'test-target', expected: null});
      continue;
    }
    const placement = destinationFor(file, appRoot);
    if (!placement) {
      const relative = path.posix.relative(appRoot, file);
      const folder = relative.split('/')[0];
      const status = folderNames.includes(folder) || folder.endsWith('.xcassets') || relative === 'Info.plist'
        ? 'in-place' : /\.(?:swift|m|mm|c|cc|cpp|cxx|h|hh|hpp|hxx|pch|modulemap)$/i.test(file)
          ? 'source-ownership-review' : 'unresolved';
      locations.push({file, status, expected: null});
      continue;
    }
    if (placement.destination === placement.source) {
      locations.push({file, status: 'in-place', expected: placement.destination});
      continue;
    }
    locations.push({file, status: 'move', expected: placement.destination});
    if (entries.has(placement.source)) continue;
    const project = roots.get(appRoot);
    const referencedExplicitly = project.source.includes(path.posix.basename(placement.source));
    entries.set(placement.source, {file: placement.source, destination: placement.destination, project: project.project,
      movable: project.synchronized && !referencedExplicitly && !placement.directory,
      reason: !project.synchronized ? 'The Xcode project uses explicit groups or file references; update the project and target membership with the move.'
        : referencedExplicitly ? 'The Xcode project explicitly names this file; check and update the reference with the move.'
          : placement.directory ? 'Move the asset catalog as a unit after checking AppIcon build settings and target membership.'
            : 'Verify runtime paths and resource lookup after the move.'});
  }
  // One localized folder may contain several files. Move each member with its
  // own reference check, and refuse every collision before changing anything.
  return {placements: [...entries.values()], locations};
}

export async function moveFilePlacements(root, entries) {
  const moves = entries.filter(entry => entry.movable);
  const destinations = moves.map(entry => entry.destination);
  if (new Set(destinations).size !== destinations.length) {
    throw Error('Several files have the same destination. No files moved.');
  }
  for (const {file, destination} of moves) {
    if (await fs.stat(path.join(root, destination), {throwIfNoEntry: false})) {
      throw Error(`Destination already exists: ${destination}. No files moved.`);
    }
    const source = await fs.lstat(path.join(root, file));
    if (!source.isFile()) throw Error(`Cannot move a nonregular file: ${file}. No files moved.`);
  }
  for (const {file, destination} of moves) {
    await fs.mkdir(path.dirname(path.join(root, destination)), {recursive: true});
    await fs.rename(path.join(root, file), path.join(root, destination));
  }
  return moves;
}
