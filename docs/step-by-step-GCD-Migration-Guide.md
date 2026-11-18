# Step-by-step GCD migration guide

This guide is for an existing iOS app that still has Grand Central Dispatch,
`OperationQueue`, callback-style APIs, delegate completion routes or other
pre-Swift-Concurrency code. It uses the CFA Migration Engine and its local MCP
server to make the work durable and, on a supported Codex/macOS host,
continuable without repeatedly prompting a developer.

Do not use this guide to claim that an existing CFA-structured app is a fresh
legacy migration. For that case, use the [general migration guide](MIGRATION-GUIDE.md)
and ask for a CFA compliance audit instead.

## 1. Create and protect the migration branch

Create or switch to the branch intended for the migration. Commit work that is
ready to preserve if that fits the team's normal practice; uncommitted changes
are also allowed, and the Engine records them as its baseline.

Choose the app, test, extension and device targets that are in scope. State
important behaviour that must remain true, such as sign-in, purchases, saved
data, deep links, notifications and background refresh.

## 2. Prepare one migration machine

Install the toolkit, then configure the local server according to
[MCP setup](MCP.md). In the extracted toolkit release, install its local runtime:

```sh
npm ci --omit=dev
```

For unattended continuation, use a macOS machine with a local Codex host that
supports `codex queue`. Keep it powered on and reserve Xcode and its simulators
for the migration. The workflow may restart ordinary Xcode/CoreSimulator
services after a stalled check; it will not erase simulator content, delete
Derived Data, change signing credentials or remove files without permission.

## 3. Open Codex in the existing repository

Start a Codex chat whose working folder is the existing iOS repository. Do not
clone the app into a new folder for the migration. The Engine adds its managed
state to the existing `MIGRATION_LEDGER.md`, alongside any project migration
notes already there.

## 4. Paste the start prompt

Replace the bracketed parts, then paste this message into the Codex chat:

```text
Use the installed CFA Migration Engine MCP server and the CFA Migration
Orchestrator to migrate this existing iOS project from legacy GCD, callbacks and
OperationQueue paths to Swift Concurrency and CFA.

Goal: [describe the authorised migration outcome].
Scope: [list the app, tests, extensions and device targets; list exclusions].
Preserve existing work and product behaviour. Do not create a duplicate project
or a new migration directory. Use this project's existing MIGRATION_LEDGER.md.

First inspect the repository, current CFA specification, existing migration
ledger, target membership, legacy-concurrency inventory and build/test baseline.
Record the scope and initialise or resume the ledger. Then audit, make the
smallest coherent fixes and verify them at each current revision. Enable
host-enforced MCP continuation after scope is recorded. Continue every
independent audit, fix and verification action without waiting for another
prompt, until the evidence-backed completion gate is met or a genuine product
decision prevents all remaining meaningful work.
```

## 5. Expect an evidence-first audit

The first pass maps the current code and records facts before broad changes:

1. Existing GCD, callback, delegate, timer, lock and `OperationQueue` routes.
2. Feature ownership, state ownership, task lifetime and cancellation behaviour.
3. Xcode navigator structure, target membership, deployment targets and current
   build/test evidence.
4. Existing product behaviour that a migration must preserve.

Scanner results are leads for source review, not automatic CFA violations. The
agent should trace each relevant route before calling it a defect or changing
it.

## 6. Let the Engine continue safe work

After continuation is enabled, a per-ledger watchdog resumes the same Codex chat
after safe, non-terminal updates. A claimed worker receives a lease; it must
renew the lease before a long build or test. If the agent stops, the lease
expires, or a queued wake-up is not claimed, the Engine safely redelivers the
current action.

You should not need to paste repetitive “continue” messages. The status and
ledger determine the current action; a continuation token only wakes a worker
and is never a substitute for reading current state.

## 7. Handle bugs and product decisions deliberately

Concurrency migrations frequently expose bugs that had been hidden by timing or
ambiguous ownership. That is one of the most useful outcomes of the work.

- If evidence shows a clear, in-scope defect and the intended behaviour is
  known, fix it and add a regression check where practical.
- If the code's current behaviour affects a user-facing product rule but there
  is no authority for the desired outcome, the agent must show the evidence,
  options and recommendation, then ask for a decision.
- If the evidence is incomplete, the agent must investigate; it must not guess,
  silently preserve a confirmed defect or silently redesign the product.

Use this response prompt when the agent presents a decision:

```text
Treat this as a migration design decision. Record the current observed
behaviour, evidence, user impact, options and your recommendation. Keep
working on all independent migration slices. Do not mark the migration blocked
unless this decision prevents every remaining meaningful action.
```

## 8. Recover only when needed

The watchdog normally handles a stopped worker. If you want a manual status
check, paste this into the same chat:

```text
Read the current CFA Migration Engine ledger and MCP status for this project.
If an active continuation exists, claim it first and use the returned current
ledger state. Continue independent work only when claimed. If the state is
blocked, completed or stale, do not perform migration work; explain the
recorded condition and evidence.
```

A blocked state means there is a precise recorded condition that prevents all
safe remaining work—not merely one unavailable simulator, signing profile or
focused test. The agent must continue source review, other checks and other
safe fixes before reporting that condition.

## 9. Review the completion report

Do not treat a green focused test, a single converted feature or a clean scanner
as whole-app completion. The final report must be tied to the final revision and
include:

1. The before/after navigator and Feature ownership map.
2. The final inventory of legacy concurrency paths, including intentional
   retained boundaries and reasons.
3. Final CFA audit and hybrid implementation review.
4. Passing applicable builds, tests and behaviour checks for every scoped target.
5. Required human architecture review.
6. A completion ledger whose evidence matches the final source fingerprint.

Only then is the migration eligible for the Engine's completion message:

```text
🎉 The migration to Swift Concurrency using CFA is complete.
```

## 10. Start the next change normally

Completion does not freeze the app. It proves the recorded migration scope at
that source revision. A later source change needs normal review and verification;
a material change to the completed migration scope reopens the associated
completion evidence.

For the precise completion criteria, see the
[migration completion gate](../architecture/cfa-change-gate.md#migration-progress-and-completion-language).

