---
name: cfa-migration-orchestrator
description: "Orchestrate an authorised CFA and Swift Concurrency migration across an app until its evidence-backed completion gate or a genuine blocker. Use for whole migration ownership; not for a single conversion or a read-only review."
---

# CFA Migration Orchestrator

Own an authorised, whole-app CFA and Swift Concurrency migration from its
agreed goal through a verified handoff. This is an execution workflow, not a
continuation reminder: keep taking safe, in-scope migration actions until the
completion gate is met or a genuine blocker prevents every useful next action.

Before writing code, apply [Decide before writing code](references/swift-coding-guide.md#decide-before-writing-code). Read the [Swift coding guide](references/swift-coding-guide.md) when resolving its broader migration decisions.

Read [project workflow and design authority](references/project-workflow.md),
the [CFA change gate](references/cfa-change-gate.md), the
[product behaviour contract](references/product-behaviour-contract.md), the
[reference feature](references/reference-feature.md). Use the complete
[CFA specification](references/cfa-specification.md) for the final audit.

When explaining a substantial migration decision, use [decision rationale and
verified learning links](references/explanations/guide.md). Keep the explanation
specific to the observed migration rather than presenting a general rule as
evidence that this app is complete.

## Establish and persist the goal

Before changing code, state the authorised migration scope, affected targets,
behaviour contract, non-goals, final evidence required, and the next smallest
feature-sized slice. Initialise the CFA Migration Engine inside the project's
existing migration ledger with:

```sh
node /path/to/cfa-migration-orchestrator/scripts/orchestrator-state.mjs init \
  /path/to/project --goal "<authorised migration goal>" --scope "<targets and boundaries>"
```

The default ledger is `MIGRATION_LEDGER.md`; the command refuses to create a
new folder or overwrite an existing Engine block. It stores a managed JSON
state block alongside the project's existing migration evidence. This is a
progress index, not a substitute for source review, builds, tests, or the
migration evidence tool. Update it only with facts observed in the current
project revision; validate it after each checkpoint with `validate <ledger>`.

Use `audit /path/to/project --ledger /path/to/project/MIGRATION_LEDGER.md --id <id>`
to run the bundled CFA inspector and migration source analysis. It records a
source fingerprint and scanner summary in the ledger. Its leads require semantic
review; it never declares CFA conformance automatically.

## Execute the loop

For each slice, repeatedly:

1. **Audit:** inspect source, target membership, the relevant behaviour and
   legacy primitives. Record concrete findings and the next action.
2. **Fix:** make the smallest coherent CFA and concurrency change that preserves
   the recorded contract. Use `$swift-concurrency-migration` for the detailed
   conversion rules; use `$cfa-architecture-adoption` when ownership and
   placement are the active concern, `$cfa-unit-tests` for test design, and
   `$cfa-architecture-review` for the final independent review. These are
   coordinated roles, not completion claims delegated to another skill.
3. **Verify:** run the affected build, tests and applicable controlled/manual
   checks at the revision containing the fix. Re-audit the changed path. A
   green focused test does not close unrelated findings.
4. **Persist and continue:** record evidence, resolved and open findings, then
   select the next safe slice. Do not wait for “continue” after a pass, test
   batch, checkpoint, or commit.

After a correction, audit again. Do not mark an item resolved merely because a
file changed; tie it to verification at the current revision.

## Recover from stalls

When an attempt produces no new evidence or repeats the same failed action,
record the failed attempt and change the approach: reduce the slice, trace a
caller or owner, inspect the build/target configuration, run a narrower
controlled check, or ask the developer only for a material product decision.
An unavailable simulator, one failing test, or a missing optional tool is not
by itself a blocker while source review, other tests, audits, or safe fixes
remain. Continue those independent actions and record the unavailable check.

Mark the state `blocked` only when an external approval, missing decision,
credential, unavailable required environment, or unsafe/destructive operation
prevents every remaining meaningful in-scope action. Name the blocker, evidence,
impact, and the exact condition that unblocks it. Never convert uncertainty
into invented behaviour.

## Finish accurately

Mark the state `completed` only after the final revision has the required
migration completion evidence: behaviour baseline and regression checks,
affected builds and tests, remaining-primitive inventory, CFA file/navigator
inspection, hybrid implementation review, final CFA audit and the required
human architecture review. The completion gate remains authoritative. If any
required check cannot run, report the migration as continuing or blocked as
appropriate; do not call it complete.

For the record format and command details, read
[orchestrator state reference](references/orchestrator-state.md).
