import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {inspect} from '../src/inspector.mjs';
import {moveFilePlacements} from '../src/file-placement.mjs';

async function project(t, synchronized = true) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-placement-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  await fs.mkdir(path.join(root, 'Demo.xcodeproj'));
  await fs.mkdir(path.join(root, 'Demo/1 - View'), {recursive: true});
  await fs.writeFile(path.join(root, 'Demo.xcodeproj/project.pbxproj'), synchronized
    ? 'isa = PBXFileSystemSynchronizedRootGroup; path = Demo; sourceTree = "<group>";'
    : 'isa = PBXGroup; path = Demo; sourceTree = "<group>";');
  await fs.writeFile(path.join(root, 'Demo/1 - View/App.swift'), 'struct App {}');
  for (const file of ['LaunchScreen.storyboard', 'Settings.xib', 'PrivacyInfo.xcprivacy', 'Config.json', 'App-Bridging-Header.h']) {
    await fs.writeFile(path.join(root, 'Demo', file), file);
  }
  return root;
}

test('inventories every project file and moves safe non-Swift resources in a synchronized Xcode group', async t => {
  const root = await project(t);
  const before = await inspect(root);
  assert.ok(before.scope.projectFiles > before.scope.swiftFiles);
  assert.deepEqual(before.filePlacements.map(item => [item.file, item.destination]), [
    ['Demo/Config.json', 'Demo/3 - App Resources/Config.json'],
    ['Demo/LaunchScreen.storyboard', 'Demo/1 - View/LaunchScreen.storyboard'],
    ['Demo/PrivacyInfo.xcprivacy', 'Demo/3 - App Resources/PrivacyInfo.xcprivacy'],
    ['Demo/Settings.xib', 'Demo/1 - View/Settings.xib']
  ]);
  assert.ok(before.filePlacements.every(item => item.movable));
  assert.equal(before.fileLocations.length, before.scope.projectFiles);
  assert.equal(before.fileLocations.find(item => item.file === 'Demo/App-Bridging-Header.h')?.status, 'source-ownership-review');
  assert.ok(before.findings.some(item => item.code === 'file-placement' && item.file === 'Demo/LaunchScreen.storyboard'));
  await moveFilePlacements(root, before.filePlacements);
  assert.equal((await inspect(root)).filePlacements.length, 0);
  assert.equal(await fs.readFile(path.join(root, 'Demo/1 - View/LaunchScreen.storyboard'), 'utf8'), 'LaunchScreen.storyboard');
  assert.equal(await fs.readFile(path.join(root, 'Demo/App-Bridging-Header.h'), 'utf8'), 'App-Bridging-Header.h');
  assert.notEqual((await inspect(root)).sourceFingerprint, before.sourceFingerprint);
});

test('keeps unfamiliar app files visible until their owner is decided', async t => {
  const root = await project(t);
  await fs.writeFile(path.join(root, 'Demo/CustomPayload.unknown'), 'payload');
  const report = await inspect(root);
  assert.equal(report.fileLocations.find(item => item.file === 'Demo/CustomPayload.unknown')?.status, 'unresolved');
  assert.ok(report.findings.some(item => item.code === 'file-placement-unresolved' && item.file === 'Demo/CustomPayload.unknown'));
});

test('scans hidden files without treating them as unresolved app files', async t => {
  const root = await project(t);
  await fs.writeFile(path.join(root, 'Demo/.DS_Store'), 'Finder metadata');
  await fs.writeFile(path.join(root, 'Demo/.custom-config'), 'tool configuration');
  const report = await inspect(root);
  assert.equal(report.fileLocations.find(item => item.file === 'Demo/.DS_Store')?.status, 'ignored-hidden-file');
  assert.equal(report.fileLocations.find(item => item.file === 'Demo/.custom-config')?.status, 'ignored-hidden-file');
  assert.equal(report.fileLocations.length, report.scope.projectFiles);
  assert.ok(!report.findings.some(item => item.file === 'Demo/.DS_Store'));
  assert.ok(!report.findings.some(item => item.file === 'Demo/.custom-config'));
});

test('does not treat a synchronized unit-test group as the app resource root', async t => {
  const root = await project(t);
  await fs.appendFile(path.join(root, 'Demo.xcodeproj/project.pbxproj'), '\nisa = PBXFileSystemSynchronizedRootGroup; path = DemoTests; sourceTree = "<group>";');
  await fs.mkdir(path.join(root, 'DemoTests'));
  await fs.writeFile(path.join(root, 'DemoTests/FeatureTests.swift'), 'struct FeatureTests {}');
  const report = await inspect(root);
  assert.equal(report.fileLocations.find(item => item.file === 'DemoTests/FeatureTests.swift')?.status, 'test-target');
  assert.ok(!report.filePlacements.some(item => item.file.startsWith('DemoTests/')));
});

test('does not move classic Xcode references or overwrite a destination', async t => {
  const classic = await project(t, false);
  const report = await inspect(classic);
  assert.equal(report.filePlacements.find(item => item.file.endsWith('.storyboard'))?.movable, false);
  assert.deepEqual(await moveFilePlacements(classic, report.filePlacements), []);
  const synchronized = await project(t);
  const planned = (await inspect(synchronized)).filePlacements;
  await fs.writeFile(path.join(synchronized, 'Demo/1 - View/LaunchScreen.storyboard'), 'existing');
  await assert.rejects(moveFilePlacements(synchronized, planned), /Destination already exists/);
  assert.equal(await fs.readFile(path.join(synchronized, 'Demo/Config.json'), 'utf8'), 'Config.json');
});
