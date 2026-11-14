import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { verifyXcodeTemplateStructure } from '../scripts/verify-xcode-template-structure.mjs';

const root = path.resolve(import.meta.dirname, '..');
const app = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate');
const tests = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App Tests.xctemplate');

test('CFA App is an honestly blank, strict-concurrency foundation', () => {
  assert.equal(verifyXcodeTemplateStructure(app), true);
  const source = fs.readdirSync(path.join(app, 'Source', 'Application'), { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.swift'))
    .map(file => fs.readFileSync(path.join(app, 'Source', 'Application', file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /GitRepos|GitHub|URLSession|RepoCache|SettingsFeature|ThemeManager/);
  assert.match(source, /struct RootView: View/);
  assert.doesNotMatch(source, /AppModel|ViewModel|@Observable|@State private var viewModel/);
});

test('CFA App test component creates no ceremonial tests', () => {
  assert.equal(fs.existsSync(path.join(tests, 'Source/AppModel tests/AppModelTests.swift')), false);
  assert.equal(fs.existsSync(path.join(tests, 'Source/View model tests/ContentViewModelTests.swift')), false);
  assert.deepEqual(fs.readdirSync(path.join(tests, 'Source'), { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.swift')), []);
  execFileSync('plutil', ['-lint', path.join(tests, 'TemplateInfo.plist')]);
});

test('Remote List starter has no stale template residue', () => {
  const starter = path.join(root, 'starter-apps/Remote List');
  assert.equal(fs.existsSync(path.join(starter, 'RemoteList.xcodeproj/project.pbxproj')), true);
  assert.equal(fs.existsSync(path.join(starter, 'RemoteList/Assets.xcassets/AppIcon.appiconset/RemoteList-App-Icon.png')), true);
  const appIconSize = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight',
    path.join(starter, 'RemoteList/Assets.xcassets/AppIcon.appiconset/RemoteList-App-Icon.png')], { encoding: 'utf8' });
  assert.match(appIconSize, /pixelWidth: 1024/);
  assert.match(appIconSize, /pixelHeight: 1024/);
  assert.equal(fs.existsSync(path.join(starter, 'RemoteList/2 - AppModel/Features/Remote List/RemoteListFeature.swift')), true);
  const project = fs.readFileSync(path.join(starter, 'RemoteList.xcodeproj/project.pbxproj'), 'utf8');
  assert.match(project, /INFOPLIST_KEY_CFBundleDisplayName = "\$\(PRODUCT_NAME\)";/);
  assert.doesNotMatch(project, /Todays Twenty|public\.app-category\.education/);
  assert.match(project, /INFOPLIST_KEY_UILaunchStoryboardName = LaunchScreen;/);
  assert.equal(fs.existsSync(path.join(starter, 'RemoteList/3 - App Resources/LaunchScreen.storyboard')), true);
  const testSources = fs.readdirSync(path.join(starter, 'RemoteListTests'), { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.swift'))
    .map(file => fs.readFileSync(path.join(starter, 'RemoteListTests', file), 'utf8')).join('\n');
  assert.match(testSources, /@testable import RemoteList/);
  assert.doesNotMatch(testSources, /___PROJECTNAME:identifier___/);
});

test('CFA Blank is the headless creation skeleton without product chrome', () => {
  const skeleton = path.join(root, 'starter-apps/CFA Blank');
  assert.equal(fs.existsSync(path.join(skeleton, 'CFABlank.xcodeproj/project.pbxproj')), true);
  assert.equal(fs.existsSync(path.join(skeleton, 'CFABlank/1 - View/CFABlankApp.swift')), true);
  assert.equal(fs.existsSync(path.join(skeleton, 'CFABlank/1 - View/___PACKAGENAME:identifier___App.swift')), false);
  assert.equal(fs.existsSync(path.join(skeleton, 'CFABlank/1 - View/Views/Root/RootView.swift')), true);
  const source = fs.readdirSync(path.join(skeleton, 'CFABlank'), { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.swift'))
    .map(file => fs.readFileSync(path.join(skeleton, 'CFABlank', file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /Practice|DayStreak|ThemeManager|SettingsFeature|UserDefaults|GitRepos|AppModel|ViewModel|@Observable/);
  assert.deepEqual(fs.readdirSync(path.join(skeleton, 'CFABlankTests'), { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.swift')), []);
  const privacy = fs.readFileSync(path.join(skeleton, 'CFABlank/3 - App Resources/PrivacyInfo.xcprivacy'), 'utf8');
  assert.doesNotMatch(privacy, /UserDefaults|CA92\.1/);
  const project = fs.readFileSync(path.join(skeleton, 'CFABlank.xcodeproj/project.pbxproj'), 'utf8');
  assert.match(project, /INFOPLIST_KEY_CFBundleDisplayName = "\$\(PRODUCT_NAME\)";/);
  assert.doesNotMatch(project, /Todays Twenty|public\.app-category\.education|UILaunchStoryboardName/);
});
