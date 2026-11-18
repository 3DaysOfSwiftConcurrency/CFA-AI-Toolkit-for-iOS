import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyMacOSAppScheme, verifyMacOSAppSchemeFile } from '../scripts/verify-macos-app-scheme.mjs';

function scheme({ launch = true, profile = true, buildForRunning = 'YES', buildForProfiling = 'YES', profileID = 'APP' } = {}) {
  const reference = id => `<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${id}" BuildableName="Modernizer.app" BlueprintName="Modernizer" ReferencedContainer="container:Modernizer.xcodeproj"></BuildableReference>`;
  const runnable = id => `<BuildableProductRunnable runnableDebuggingMode="0">${reference(id)}</BuildableProductRunnable>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Scheme version="1.3">
  <BuildAction><BuildActionEntries><BuildActionEntry buildForRunning="${buildForRunning}" buildForProfiling="${buildForProfiling}">${reference('APP')}</BuildActionEntry></BuildActionEntries></BuildAction>
  <LaunchAction>${launch ? runnable('APP') : ''}</LaunchAction>
  <ProfileAction>${profile ? runnable(profileID) : ''}</ProfileAction>
</Scheme>`;
}

function schemeWithTestTargetFirst() {
  return scheme().replace(
    '<BuildActionEntries>',
    '<BuildActionEntries><BuildActionEntry buildForRunning="NO" buildForProfiling="NO"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="TESTS" BuildableName="ModernizerTests.xctest" BlueprintName="ModernizerTests" ReferencedContainer="container:Modernizer.xcodeproj"></BuildableReference></BuildActionEntry>'
  );
}

test('accepts a shared macOS scheme with matching Build, Run, and Profile targets', () => {
  assert.equal(verifyMacOSAppScheme(scheme()), true);
  assert.equal(verifyMacOSAppScheme(schemeWithTestTargetFirst()), true);
});

test('rejects the empty Run action that leaves Xcode without an executable', () => {
  assert.throws(() => verifyMacOSAppScheme(scheme({ launch: false })), /LaunchAction does not contain a BuildableProductRunnable/);
});

test('rejects app targets that are not enabled for running or profiling', () => {
  assert.throws(() => verifyMacOSAppScheme(scheme({ buildForRunning: 'NO' })), /not enabled for running/);
  assert.throws(() => verifyMacOSAppScheme(scheme({ buildForProfiling: 'NO' })), /not enabled for profiling/);
});

test('rejects a missing or mismatched Profile executable', () => {
  assert.throws(() => verifyMacOSAppScheme(scheme({ profile: false })), /ProfileAction does not contain a BuildableProductRunnable/);
  assert.throws(() => verifyMacOSAppScheme(scheme({ profileID: 'OTHER' })), /does not reference the same app target/);
});

test('requires the runnable scheme to be shared with the project', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-macos-scheme-'));
  try {
    const userScheme = path.join(directory, 'Modernizer.xcscheme');
    fs.writeFileSync(userScheme, scheme());
    assert.throws(() => verifyMacOSAppSchemeFile(userScheme), /shared \.xcscheme/);

    const sharedScheme = path.join(directory, 'Modernizer.xcodeproj/xcshareddata/xcschemes/Modernizer.xcscheme');
    fs.mkdirSync(path.dirname(sharedScheme), { recursive: true });
    fs.writeFileSync(sharedScheme, scheme());
    assert.equal(verifyMacOSAppSchemeFile(sharedScheme), true);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
