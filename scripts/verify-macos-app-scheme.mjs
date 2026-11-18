import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function attributes(text) {
  return new Map([...text.matchAll(/([A-Za-z][A-Za-z0-9]*)\s*=\s*"([^"]*)"/g)]
    .map(match => [match[1], match[2]]));
}

function section(xml, elementName) {
  const match = xml.match(new RegExp(`<${elementName}\\b[^>]*>([\\s\\S]*?)<\\/${elementName}>`));
  if (!match) throw Error(`Scheme is missing ${elementName}.`);
  return match[1];
}

function buildableReference(contents, ownerName, requireApp = true) {
  const match = contents.match(/<BuildableReference\b([^>]*)>/);
  if (!match) throw Error(`${ownerName} does not name an executable app target.`);
  const reference = attributes(match[1]);
  for (const name of ['BlueprintIdentifier', 'BuildableName', 'ReferencedContainer']) {
    if (!reference.get(name)?.trim()) throw Error(`${ownerName} has no ${name} in its app target reference.`);
  }
  if (requireApp && !reference.get('BuildableName').endsWith('.app')) {
    throw Error(`${ownerName} names ${reference.get('BuildableName')} instead of a macOS app executable.`);
  }
  return reference;
}

function runnableReference(xml, actionName) {
  const action = section(xml, actionName);
  const runnable = action.match(/<BuildableProductRunnable\b[^>]*>([\s\S]*?)<\/BuildableProductRunnable>/)?.[1];
  if (!runnable) throw Error(`${actionName} does not contain a BuildableProductRunnable for the app.`);
  return buildableReference(runnable, actionName);
}

function matchingBuildEntry(xml, runnableReference) {
  const buildAction = section(xml, 'BuildAction');
  for (const match of buildAction.matchAll(/<BuildActionEntry\b([^>]*)>([\s\S]*?)<\/BuildActionEntry>/g)) {
    const entryAttributes = attributes(match[1]);
    const reference = buildableReference(match[2], 'BuildActionEntry', false);
    if (reference.get('BlueprintIdentifier') !== runnableReference.get('BlueprintIdentifier')) continue;
    if (!reference.get('BuildableName').endsWith('.app')) {
      throw Error(`LaunchAction names ${reference.get('BuildableName')} instead of a macOS app executable.`);
    }
    return { entryAttributes, reference };
  }
  throw Error('LaunchAction app target is not present in BuildAction.');
}

function requireSameReference(expected, actual, actionName) {
  for (const name of ['BlueprintIdentifier', 'BuildableName', 'ReferencedContainer']) {
    if (actual.get(name) !== expected.get(name)) {
      throw Error(`${actionName} does not reference the same app target as LaunchAction (${name}).`);
    }
  }
}

export function verifyMacOSAppScheme(xml) {
  const launchReference = runnableReference(xml, 'LaunchAction');
  const { entryAttributes, reference: buildReference } = matchingBuildEntry(xml, launchReference);
  requireSameReference(buildReference, launchReference, 'LaunchAction');

  if (entryAttributes.get('buildForRunning') !== 'YES') {
    throw Error('The app target is not enabled for running in BuildAction.');
  }
  if (entryAttributes.get('buildForProfiling') !== 'YES') {
    throw Error('The app target is not enabled for profiling in BuildAction.');
  }

  const profileReference = runnableReference(xml, 'ProfileAction');
  requireSameReference(launchReference, profileReference, 'ProfileAction');
  return true;
}

export function verifyMacOSAppSchemeFile(file) {
  const normalized = path.resolve(file).split(path.sep).join('/');
  if (!normalized.includes('.xcodeproj/xcshareddata/xcschemes/') || !normalized.endsWith('.xcscheme')) {
    throw Error('Pass a shared .xcscheme inside <Project>.xcodeproj/xcshareddata/xcschemes.');
  }
  return verifyMacOSAppScheme(fs.readFileSync(file, 'utf8'));
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try {
    const [file, ...extra] = process.argv.slice(2);
    if (!file || extra.length) throw Error('Usage: node verify-macos-app-scheme.mjs <shared-scheme.xcscheme>');
    verifyMacOSAppSchemeFile(file);
    console.log('macOS app scheme has matching Build, Run, and Profile app targets.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
