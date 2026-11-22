import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(scriptDirectory, '..');
export const defaultTemplate = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate');
export const nativeAppTemplates = ['CFA App.xctemplate', 'Habit Tracker.xctemplate', 'Day Streak.xctemplate']
  .map(name => path.join(root, 'templates/Xcode/Project Templates/iOS/Application', name));

function readInfo(template) {
  return JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(template, 'TemplateInfo.plist')], { encoding: 'utf8' }));
}

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const child = path.join(directory, entry.name);
    return entry.isDirectory() ? files(child).map(file => path.join(entry.name, file)) : [entry.name];
  }).sort();
}

function verifyCopiedTree(source, destination, description, { ignoredDestinationPrefix } = {}) {
  const sourceFiles = files(source);
  const destinationFiles = files(destination).filter(file => !ignoredDestinationPrefix || !file.startsWith(ignoredDestinationPrefix));
  if (JSON.stringify(sourceFiles) !== JSON.stringify(destinationFiles)) {
    throw Error(`Native CFA template has stale ${description} files. Run npm run sync.`);
  }
  for (const relative of sourceFiles) {
    if (!fs.readFileSync(path.join(source, relative)).equals(fs.readFileSync(path.join(destination, relative)))) {
      throw Error(`Native CFA template has stale ${description}: ${relative}. Run npm run sync.`);
    }
  }
}

export function verifyNativeTemplateAIContext(template) {
  const info = readInfo(template);
  const expected = {
    '../AGENTS.md': 'AGENTS.md',
    '../ARCHITECTURE.md': 'ARCHITECTURE.md',
    '../CLAUDE.md': 'CLAUDE.md',
    '../.cursor/rules/cfa-architecture.mdc': '.cursor/rules/cfa-architecture.mdc',
    '../.agents/skills': '.agents/skills'
  };
  for (const [destination, relative] of Object.entries(expected)) {
    if (info.Definitions?.[destination]?.Path !== `Source/AI Guidance/${relative}` ||
        !info.Nodes?.includes(destination) ||
        !fs.existsSync(path.join(template, 'Source', 'AI Guidance', relative))) {
      throw Error(`Native CFA template is missing portable AI context: ${destination}.`);
    }
  }
  for (const skill of ['cfa-app-creation', 'cfa-feature-work', 'cfa-unit-tests', 'swift-code-quality']) {
    if (!fs.existsSync(path.join(template, 'Source', 'AI Guidance', '.agents', 'skills', skill, 'SKILL.md'))) {
      throw Error(`Native CFA template is missing portable skill: ${skill}.`);
    }
  }
  const context = path.join(template, 'Source', 'AI Guidance');
  verifyCopiedTree(path.join(root, 'templates', 'project-guidance'), context, 'project guidance', { ignoredDestinationPrefix: '.agents/' });
  verifyCopiedTree(path.join(root, 'skills'), path.join(context, '.agents', 'skills'), 'portable skills');
  return true;
}

export function verifyXcodeTemplateStructure(template = defaultTemplate) {
  const info = readInfo(template);
  const expected = [
    ['1 - View/___PACKAGENAME:identifier___App.swift', 'Source/Application/1 - View/___PACKAGENAME:identifier___App.swift'],
    ['1 - View/Views/Root/RootView.swift', 'Source/Application/1 - View/Views/Root/RootView.swift'],
    ['1 - View/Theme/AppColourTheme.swift', 'Source/Application/1 - View/Theme/AppColourTheme.swift'],
    ['1 - View/Theme/ThemeManager.swift', 'Source/Application/1 - View/Theme/ThemeManager.swift'],
    ['1 - View/Views/Settings/SettingsView.swift', 'Source/Application/1 - View/Views/Settings/SettingsView.swift'],
    ['1 - View/Views/Settings/SettingsViewModel.swift', 'Source/Application/1 - View/Views/Settings/SettingsViewModel.swift'],
    ['2 - AppModel/AppModel.swift', 'Source/Application/2 - AppModel/AppModel.swift'],
    ['1 - View/Theme/ThemeManager.swift', 'Source/Application/1 - View/Theme/ThemeManager.swift'],
    ['1 - View/LaunchScreen.storyboard', 'Source/Application/1 - View/LaunchScreen.storyboard'],
    ['3 - App Resources/PrivacyInfo.xcprivacy', 'Source/Application/3 - App Resources/PrivacyInfo.xcprivacy'],
    ['4 - Swift Extensions/Date+StartOfDay.swift', 'Source/Application/4 - Swift Extensions/Date+StartOfDay.swift']
  ];
  for (const [name, source] of expected) {
    if (info.Definitions?.[name]?.Path !== source ||
        !info.Nodes?.includes(name) || !fs.existsSync(path.join(template, source))) {
      throw Error(`CFA App template structure: missing ${name}.`);
    }
  }
  const settings = info.Targets?.[0]?.SharedSettings ?? {};
  if (settings.SWIFT_VERSION !== '6.0' || settings.SWIFT_STRICT_CONCURRENCY !== 'complete') throw Error('CFA App template structure: missing Swift 6 strict concurrency settings.');
  const component = info.Options?.find(option => option.Identifier === 'cfaUnitTests')
    ?.Units?.Include?.Components?.[0];
  if (component?.Identifier !== 'com.3daysofswift.cfa.unit-tests' || component.Name !== '___PACKAGENAME___Tests') {
    throw Error('CFA App template structure: missing the required CFA unit-test component.');
  }
  const sources = expected.map(([, source]) => fs.readFileSync(path.join(template, source), 'utf8')).join('\n');
  if (/GitRepos|GitHub|URLSession|RepoCache/.test(sources)) throw Error('CFA App template structure: contains product-specific demo dependencies.');
  if (!/struct RootView: View/.test(sources) || !/final class AppModel/.test(sources) ||
      !/final class ThemeManager/.test(sources) || !/final class SettingsViewModel/.test(sources) ||
      /final class AppearanceFeature|final class SettingsFeature/.test(sources)) {
    throw Error('CFA App template structure: missing required CFA infrastructure.');
  }
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { verifyXcodeTemplateStructure(process.argv[2] ? path.resolve(process.argv[2]) : defaultTemplate); console.log('CFA App neutral template verified.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
