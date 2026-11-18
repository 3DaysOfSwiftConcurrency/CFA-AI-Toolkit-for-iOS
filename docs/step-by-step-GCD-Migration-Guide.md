# Step-by-step GCD migration guide

This guide is for an existing iOS app that still uses Grand Central Dispatch,
`OperationQueue`, callbacks or delegate completion routes.

There is one visible setup: install the CFA AI Toolkit. You do **not** configure
an MCP server, start a server, edit a configuration file or run `npm ci`.
The toolkit installer includes the CFA Migration Engine and Codex starts it when
a migration needs it.

## 1. Install the CFA AI Toolkit once

1. Download the CFA AI Toolkit plugin release and extract the ZIP.
2. Double-click `Install.command` in the extracted folder.
3. Wait for the installer to say that installation is complete.
4. Open a new Codex chat.

The installer verifies the release, installs the toolkit and registers its
bundled local Migration Engine. It may open Terminal while it performs those
steps, but you do not need to type a command there.

## 2. Open the existing iOS project

Open Codex with the repository for the app you want to migrate. For example,
open the `ProjectA` folder—not a copied project and not a new empty folder.

If your team normally uses a migration branch, open that branch first. Existing
committed or uncommitted work is preserved and recorded as the migration
baseline; the workflow never cleans it by discarding work.

## 3. Paste one prompt

Paste this into the new Codex chat, replacing `ProjectA` with your app name:

```text
Using the CFA AI Toolkit, migrate ProjectA to Swift Concurrency.
```

That is enough to start. If you already know boundaries that matter, add one
plain sentence, for example: “Include the iOS app and unit tests, but do not
change the Widget extension.”

## 4. What the migration does next

The agent first inspects the project, existing migration notes, targets, test
baseline and current concurrency routes. It then uses the bundled CFA Migration
Engine to maintain the existing `MIGRATION_LEDGER.md`.

For a whole-app migration on macOS Codex, it enables self-healing continuation.
That means the Engine can resume safe work after a stopped agent or an expired
worker lease. It records progress in the ledger; it does not make a duplicate
project or a second migration folder.

While the migration is active, the Mac is reserved for that migration's Xcode
and Simulator work. The workflow may restart ordinary Xcode/CoreSimulator
services to recover a stalled check. It does not erase simulator content, delete
Derived Data, change signing credentials or discard app work.

## 5. Expect useful discoveries

A concurrency migration often reveals bugs that had been hidden by timing,
callbacks or unclear ownership. That is useful: the goal is not to blindly
preserve every accidental behaviour.

- A confirmed in-scope bug with clear intended behaviour can be fixed and
  covered by a regression test.
- A user-facing behaviour with no clear product authority is a design decision.
  The agent explains what it found, the options and its recommendation, then
  asks for your choice.
- A suspected problem is investigated with source tracing or a focused check;
  the agent does not change behaviour by guesswork.

The agent continues every other independent migration action while one decision
is pending. It asks you only when the decision prevents meaningful remaining
work.

## 6. Know when it is really complete

A converted file or a green focused test is not a completed app migration. The
Engine completes only after the final revision has recorded the agreed behaviour
baseline, CFA audit, legacy-concurrency inventory, target/navigator review,
applicable builds and tests, and human architecture review.

Its completion message is:

```text
🎉 The migration to Swift Concurrency using CFA is complete.
```

For the detailed completion evidence, read the
[migration completion gate](../architecture/cfa-change-gate.md#migration-progress-and-completion-language).
For an already CFA-structured app that needs a compliance pass rather than a
legacy conversion, use [Migrate an existing iOS app with CFA](MIGRATION-GUIDE.md).

