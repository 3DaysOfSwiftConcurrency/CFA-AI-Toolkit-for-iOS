# Migrate an existing iOS app with CFA

Use this guide when the app already has the expected CFA file structure and the
remaining work is verified CFA compliance—not a fresh legacy GCD conversion.
For a legacy codebase, follow the [step-by-step GCD migration guide](step-by-step-GCD-Migration-Guide.md).

There is no separate MCP setup for a Codex user. Installing the CFA AI Toolkit
installs its Migration Engine too. The developer only installs the toolkit once,
opens the existing project and gives Codex one prompt.

## 1. Install the CFA AI Toolkit once

1. Download and extract the CFA AI Toolkit plugin release.
2. Double-click `Install.command`.
3. Wait for installation to complete, then open a new Codex chat.

The installer verifies the release, installs the toolkit and registers the
bundled Migration Engine. It may use Terminal internally, but you do not type an
`npm` command, configure a server or edit an MCP file.

## 2. Open the existing project

Open Codex with the repository you want to audit. Use its intended migration
branch if your team has one. Existing committed and uncommitted work is
preserved and recorded as the baseline.

## 3. Paste one prompt

Replace `ProjectA` with the app name and paste this into the chat:

```text
Using the CFA AI Toolkit, bring ProjectA into verified CFA compliance.
```

If useful, add a sentence naming target boundaries or an explicit non-goal.

## 4. What happens next

The agent checks the current project, CFA specification, existing ledger, target
membership and test baseline. It uses the bundled CFA Migration Engine to update
the existing `MIGRATION_LEDGER.md`; it does not create a duplicate project or
migration folder.

On macOS Codex it enables self-healing continuation for the whole-app workflow.
The Engine can replace a stopped worker after its lease expires and safely
continue from the ledger. The machine is reserved for the migration's Xcode and
Simulator work. Routine Xcode/CoreSimulator recovery is allowed; erasing
simulators, deleting Derived Data, changing signing credentials and discarding
work are not.

## 5. Treat findings as useful evidence

A compliance audit may expose a real defect or a behaviour nobody had explicitly
decided. The migration does not hide that discovery.

- Fix a confirmed, in-scope defect when its intended behaviour is clear.
- Ask for a decision when changing a user-facing product rule, payment, privacy,
  stored data, navigation or compatibility promise.
- Investigate a suspicion before changing code.

The agent records evidence, options and its recommendation, and continues
independent work while a decision is pending. It marks the migration blocked only
when that decision or an external condition prevents every remaining meaningful
action.

## 6. Completion has evidence

Completion applies only to the final revision after the required CFA audit,
legacy-primitives inventory, target/navigator review, applicable builds/tests,
behaviour checks and human architecture review are recorded. Later source
changes require fresh verification.

See the full [migration completion gate](../architecture/cfa-change-gate.md#migration-progress-and-completion-language)
for the detailed evidence list.

