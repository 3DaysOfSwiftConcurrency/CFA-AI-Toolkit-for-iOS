# Orchestrator state record

The state record makes a migration resumable without treating a prose plan as
progress. It is deliberately small and project-local.

`init` creates a record with a goal, scope, `audit` phase, an empty evidence
list and a required next action. Use a normal editor to append factual evidence
or attempts after each audit, fix, and verification checkpoint. Each evidence
item needs an identifier, revision, kind, outcome and summary. Each attempt
needs an action and result. `validate` rejects duplicate identifiers, missing
core fields, a completed record without all completion-gate evidence, and a
blocked record without an unblock condition.

```sh
node scripts/orchestrator-state.mjs init /path/to/project \
  --goal "Move the agreed app targets to CFA and Swift Concurrency" \
  --scope "Main app and widget; preserve existing behaviour"
node scripts/orchestrator-state.mjs validate /path/to/project/.cfa/migration-orchestrator.json
node scripts/orchestrator-state.mjs status /path/to/project/.cfa/migration-orchestrator.json
```

For `completed`, `completionGate` must identify evidence IDs for: baseline,
build, tests, behaviour regression, primitive inventory, navigator review,
hybrid review, final CFA audit and human architecture review. Validation proves
the ledger is internally consistent, not that its claims are true.
