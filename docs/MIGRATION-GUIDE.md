# Migrate an existing iOS app with CFA

Use this guide to take an existing iOS app through a CFA and Swift Concurrency
migration. It is appropriate both for a legacy app and for an already
CFA-structured app that needs a verified compliance pass.

The CFA Migration Engine records progress in the project's existing
`MIGRATION_LEDGER.md`. It does not make a copy of the project or create a
second migration directory.

## Choose the right guide

- For a legacy GCD, `OperationQueue`, delegate or callback codebase, follow the
  numbered [step-by-step GCD migration guide](step-by-step-GCD-Migration-Guide.md).
- For an already CFA-structured project whose remaining work is compliance,
  start the same process but say explicitly that this is a compliance audit,
  not a fresh legacy-to-CFA conversion.

## Prepare the machine

1. Use the migration branch and preserve work already present. The Engine
   records a dirty baseline; it never discards changes to make itself clean.
2. Identify every app, test, extension and device target in scope, the minimum
   OS, and behaviour that must remain intact: purchases, stored data, deep
   links, notifications and background work.
3. Configure the local MCP server using [MCP setup](MCP.md). On macOS, run
   `npm ci --omit=dev` in the extracted toolkit release first.
4. Reserve the Mac for the migration. It may restart normal Xcode and
   CoreSimulator services to recover a stalled verification, so do not use it
   for parallel iOS development while the migration runs.

## Start an existing CFA compliance migration

Open Codex with the iOS repository as its working folder and paste this prompt,
replacing the bracketed details:

```text
Use the installed CFA Migration Engine MCP server and CFA Migration
Orchestrator to bring this existing iOS project into verified CFA compliance.

Scope: [targets, boundaries and excluded areas]. Preserve existing work and
product behaviour. This project already has its expected CFA file structure;
this is not a fresh legacy-to-CFA conversion. Do not create a duplicate project
or a new migration directory: use this project's existing MIGRATION_LEDGER.md.

Inspect the repository, ledger, CFA specification, target membership and test
baseline first. Then audit, correct and verify each applicable CFA requirement
until the completion gate is met or a genuine product decision is required.
Enable MCP continuation after recording the scope. Continue independent work
without waiting for another prompt.
```

## Enable uninterrupted continuation

The startup prompt authorises the agent to enable continuation after it records
the scope. The Engine installs a per-ledger macOS watchdog, queues the same
Codex chat after a safe non-terminal update, and replaces a stopped worker only
after its lease expires. Old workers are fenced from writing over replacements.

The mechanism needs macOS, a local Codex host with `codex queue` support, and a
powered-on machine. It recovers stopped agents, expired worker leases and
undelivered continuation signals. It cannot operate while the Mac is off,
resolve unavailable credentials, or invent a product decision.

## Treat discoveries as product-quality evidence

A migration often exposes a bug previously hidden by timing, callbacks or
unclear ownership. That is useful evidence, not a reason to bury the issue.

| Finding | Appropriate action |
| --- | --- |
| Confirmed in-scope defect with clear intended behaviour | Fix it, add regression coverage where practical and record the evidence. |
| Existing behaviour has no clear authority, or changing it affects payment, privacy, data, navigation or compatibility | Preserve it for now, explain the evidence, options and recommendation, then ask for a product decision. |
| Suspected issue without enough evidence | Trace source, run a focused test or controlled check. Do not change behaviour by guesswork. |

When a decision is needed, use this prompt:

```text
Record this as a migration design decision. Explain the observed current
behaviour, evidence, user/product impact, viable options and your
recommendation. Do not silently preserve a confirmed defect or silently change
a product rule. Continue every other independent migration action while this
decision is pending; block only if it prevents all remaining meaningful work.
```

## If the chat or agent stops

Normally, the watchdog redelivers the current continuation. To check manually,
paste this into the same chat:

```text
Read the current CFA Migration Engine ledger and MCP status. If there is a
current continuation, claim it first and obey the returned state. If it is
active, continue independent audit, fix and verification actions. If it is
blocked, completed or stale, do not perform migration work; explain the
recorded condition instead.
```

The ledger, not an old continuation token, is the source of truth.

## What completion means

Completion requires evidence at the final revision: the agreed behaviour
baseline, target and navigator review, legacy-primitives inventory, final CFA
audit, applicable builds/tests and the required human architecture review.
Evidence is tied to a source fingerprint; later source changes need renewed
verification. Read the full [migration completion gate](../architecture/cfa-change-gate.md#migration-progress-and-completion-language).

