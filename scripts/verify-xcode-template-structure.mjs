import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(scriptDirectory, '..');
export const defaultTemplate = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate');

function readInfo(template) {
  return JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(template, 'TemplateInfo.plist')], { encoding: 'utf8' }));
}

export function verifyXcodeTemplateStructure(template = defaultTemplate) {
  const info = readInfo(template);
  const expected = [
    ['1 - View/___PACKAGENAME:identifier___App.swift', 'Source/Application/1 - View/___PACKAGENAME:identifier___App.swift'],
    ['1 - View/Views/Root/RootView.swift', 'Source/Application/1 - View/Views/Root/RootView.swift']
  ];
  for (const [name, source] of expected) {
    if (info.Definitions?.[name]?.Path !== source || !fs.existsSync(path.join(template, source))) throw Error(`CFA App template structure: missing ${name}.`);
  }
  const settings = info.Targets?.[0]?.SharedSettings ?? {};
  if (settings.SWIFT_VERSION !== '6.0' || settings.SWIFT_STRICT_CONCURRENCY !== 'complete') throw Error('CFA App template structure: missing Swift 6 strict concurrency settings.');
  const sources = expected.map(([, source]) => fs.readFileSync(path.join(template, source), 'utf8')).join('\n');
  if (/GitRepos|GitHub|URLSession|RepoCache|SettingsFeature|ThemeManager/.test(sources)) throw Error('CFA App template structure: contains product-specific demo dependencies.');
  if (!/struct RootView: View/.test(sources)) throw Error('CFA App template structure: missing the structural root View.');
  if (/AppModel|ViewModel|@Observable|@State private var viewModel/.test(sources)) throw Error('CFA App template structure: contains ceremonial CFA layers without a product feature.');
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { verifyXcodeTemplateStructure(process.argv[2] ? path.resolve(process.argv[2]) : defaultTemplate); console.log('CFA App neutral template verified.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
