# Snapshot test integrity

## Purpose

A product snapshot is evidence of what a user sees in the launched app. It is
not evidence of a controller or view manually rendered by a test harness.

## Classify before changing a test

Classify each image assertion as one of the following before changing source,
references, or test infrastructure.

- **Product UI snapshot.** It verifies a user-visible screen, native control,
  safe-area behaviour, keyboard, or app lifecycle. It must drive the normal
  app through `XCUIApplication` on the configured simulator and capture that
  app's screen.
- **Component layout snapshot.** It verifies layout wholly owned by the app.
  It may construct that component directly, but must not claim to verify
  navigation, app launch, native UIKit or SwiftUI chrome, keyboard, safe-area,
  or accessibility behaviour.
- **Invalid or obsolete snapshot.** Its harness replaces application UI,
  manufactures timing, or has no defensible product contract. Preserve its
  reference as migration evidence, then retire or replace it deliberately.

## Product UI snapshot rules

A product UI snapshot must:

1. launch the normal app with its ordinary root controller, window and
   lifecycle;
2. prepare deterministic data outside the app UI, such as a fixture account
   and a fixture service or server-side seed;
3. navigate through visible app controls, unless the specific product contract
   being exercised is an existing supported deep link;
4. wait for meaningful UI evidence, such as a title, row and the absence of a
   loading indicator; and
5. capture the actual simulator screen only after those conditions hold.

`waitForExistence(timeout:)` is a bounded semantic condition. `sleep`, polling
and a delayed response only to make a screenshot happen are prohibited.

## Prohibitions

Never introduce or retain a test-only branch that replaces an app or scene
root, a window, or a root view controller. Do not create a blank test host,
synthetic window, fake native control glyph, private test navigation route, or
production delay to manufacture a snapshot state.

Never overwrite a failing product reference merely to make a comparison pass.
Freeze the reference, determine whether the app or the harness changed, and
record the decision. A new product-screen reference is allowed only for a
newly stated device-sized contract and human-reviewed product outcome; it is
not a replacement for discarded evidence.

## Repair workflow

1. Run the integrity scanner before migration work and save its report.
2. Preserve the original reference image and test result.
3. Prove the real simulator behaviour independently of the direct-view test.
4. Remove test-only lifecycle or UI substitutions before diagnosing rendering.
5. Replace invalid product snapshots with simulator-driven UI tests.
6. Re-run the saved result bundle and inspect the actual outcome.

Use the scanner from the toolkit root:

```text
node tools/snapshot-test-integrity/snapshot-test-integrity.mjs <project-root>
```

Use `--strict` only after the project has triaged its existing findings. It
blocks newly introduced high-confidence violations; warnings remain a review
queue rather than a reason to mask unrelated existing work.
