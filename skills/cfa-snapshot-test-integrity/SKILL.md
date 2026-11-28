---
name: cfa-snapshot-test-integrity
description: Audit, repair and migrate iOS snapshot tests so product screenshots come from the real launched app rather than a synthetic test harness. Use for screenshot-test failures, snapshot-test migration, or test-harness fidelity review; not for ordinary unit tests.
---

# CFA Snapshot Test Integrity

Read [snapshot test integrity](references/snapshot-test-integrity.md) before
changing an iOS screenshot test. Keep product UI snapshots, component layout
snapshots and feature tests as distinct evidence types.

Read the [project workflow and design authority](references/project-workflow.md),
[Swift coding guide](references/swift-coding-guide.md), and
[CFA change gate](references/cfa-change-gate.md) before continuing.

When the task changes an app, apply the
[mandatory final compilation gate](references/project-workflow.md#mandatory-final-compilation-gate).

When explaining a test-boundary decision, use the shared
[decision rationale and verified learning links](references/explanations/guide.md).

Run the bundled scanner before proposing a repair:

```text
node scripts/snapshot-test-integrity.mjs <project-root>
```

Do not change production launch, root-window, navigation or rendering behaviour
to satisfy a test. For a product screenshot, launch the real app, prepare
fixture data outside its UI, navigate through visible controls, wait for
semantic readiness and capture the simulator screen. Do not record or replace
reference images unless the developer explicitly approves a newly stated,
human-reviewed product contract.

For a component snapshot, state its limited layout contract. It cannot prove
native system UI, the application lifecycle or a complete product screen.

When migration exposes an invalid harness, preserve the original evidence and
record the finding before replacement. Do not declare a repair verified until
the saved Xcode result bundle has been inspected.
