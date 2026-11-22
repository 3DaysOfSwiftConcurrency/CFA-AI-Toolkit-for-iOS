import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { nativeAppTemplates, verifyNativeTemplateAIContext, verifyXcodeTemplateStructure } from '../scripts/verify-xcode-template-structure.mjs';

const root = path.resolve(import.meta.dirname, '..');
const app = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate');
const tests = path.join(root, 'templates/Xcode/Project Templates/iOS/Application/CFA App Tests.xctemplate');

test('CFA App has the complete, strict-concurrency CFA skeleton', () => {
  assert.equal(verifyXcodeTemplateStructure(app), true);
  const source = fs.readdirSync(path.join(app, 'Source', 'Application'), { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.swift'))
    .map(file => fs.readFileSync(path.join(app, 'Source', 'Application', file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /GitRepos|GitHub|URLSession|RepoCache/);
  assert.match(source, /struct RootView: View/);
  assert.match(source, /final class AppModel/);
  assert.match(source, /final class SettingsFeature/);
  assert.match(source, /final class SettingsViewModel/);
  for (const folder of ['1 - View', '2 - AppModel', '3 - App Resources', '4 - Swift Extensions']) {
    assert.equal(fs.existsSync(path.join(app, 'Source', 'Application', folder)), true, folder);
  }
});

test('every native CFA app template carries portable AI project context', () => {
  for (const template of nativeAppTemplates) assert.equal(verifyNativeTemplateAIContext(template), true, template);
});

test('CFA App test component covers its AppModel, Feature and ViewModel', () => {
  for (const file of [
    'Source/AppModel tests/AppModelTests.swift',
    'Source/FeatureTests/SettingsFeatureTests.swift',
    'Source/View model tests/SettingsViewModelTests.swift'
  ]) assert.equal(fs.existsSync(path.join(tests, file)), true, file);
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
  assert.equal(fs.existsSync(path.join(starter, 'RemoteList/1 - View/LaunchScreen.storyboard')), true);
  const testSources = fs.readdirSync(path.join(starter, 'RemoteListTests'), { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.swift'))
    .map(file => fs.readFileSync(path.join(starter, 'RemoteListTests', file), 'utf8')).join('\n');
  assert.match(testSources, /@testable import RemoteList/);
  assert.doesNotMatch(testSources, /___PROJECTNAME:identifier___/);
});

test('the command-line foundation has all four required CFA root folders', () => {
  const foundation = path.join(root, 'starter-apps', 'Tab Bar App', 'TabBarApp');
  for (const folder of ['1 - View', '2 - AppModel', '3 - App Resources', '4 - Swift Extensions']) {
    assert.equal(fs.existsSync(path.join(foundation, folder)), true, folder);
  }
});
