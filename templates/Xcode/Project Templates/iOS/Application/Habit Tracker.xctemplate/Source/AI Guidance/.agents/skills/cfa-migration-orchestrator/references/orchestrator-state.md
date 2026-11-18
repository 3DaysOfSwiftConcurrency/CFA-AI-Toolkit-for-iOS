# Orchestrator state record

The Engine state makes a migration resumable without treating a prose plan as
progress. It is deliberately small and is stored in the project's existing
`MIGRATION_LEDGER.md`, not in a new folder.

`init` atomically appends one managed state block with a goal, scope, Git revision
and dirty-tree baseline (when Git is available), `audit` phase, an empty evidence
list and a required next action. It refuses to replace an existing state block.
Use `checkpoint` after each audit, fix, and verification checkpoint, and use
`evidence` to append observed facts. `validate` rejects duplicate identifiers,
missing core fields, a completed record without all completion-gate evidence,
and a blocked record without an unblock condition.

`audit` runs the bundled architecture inspector and migration source analysis,
then records their source fingerprint, working-diff result and review-lead
counts in the same state block. The scanner does not establish semantic CFA
compliance; review the reported paths before treating a lead as a finding.

`block` requires the concrete reason, next action and exact unblocking condition.
`complete` accepts every named CFA completion-gate evidence ID and refuses to
write a completed state until each ID is recorded. Build, tests and behaviour
regression evidence must have outcome `passed`; a limitation or unavailable
check keeps the migration in verification. `reopen` explicitly returns a
completed ledger to verification when later evidence or stricter rules show
that work remains.

```sh
node scripts/orchestrator-state.mjs init /path/to/project \
  --goal "Move the agreed app targets to CFA and Swift Concurrency" \
  --scope "Main app and widget; preserve existing behaviour"
node scripts/orchestrator-state.mjs checkpoint /path/to/project/MIGRATION_LEDGER.md \
  --phase audit --next-action "Trace the launch owner" \
  --action "Ran the initial source audit" --result "Selected launch as the first slice"
node scripts/orchestrator-state.mjs evidence /path/to/project/MIGRATION_LEDGER.md \
  --id launch-audit --revision abc123 --kind source --outcome observed \
  --summary "Recorded the source-backed launch inventory"
node scripts/orchestrator-state.mjs audit /path/to/project \
  --ledger /path/to/project/MIGRATION_LEDGER.md --id first-audit
node scripts/orchestrator-state.mjs continuation /path/to/project/MIGRATION_LEDGER.md \
  --codex-thread <current-codex-thread-id>
node scripts/orchestrator-state.mjs reopen /path/to/project/MIGRATION_LEDGER.md \
  --reason "The full test gate is limited" --next-action "Run the full test suite"
node scripts/orchestrator-state.mjs validate /path/to/project/MIGRATION_LEDGER.md
node scripts/orchestrator-state.mjs status /path/to/project/MIGRATION_LEDGER.md
```

For `completed`, `completionGate` must identify evidence IDs for: baseline,
build, tests, behaviour regression, primitive inventory, navigator review,
hybrid review, final CFA audit and human architecture review. Validation proves
the ledger is internally consistent, not that its claims are true.

`continuation` is optional state for a Codex host. It records the Codex thread
that should be resumed after non-terminal Engine updates. The local MCP server
reserves one tokened continuation before it calls the Codex host queue. The
receiving agent must claim that token through MCP before acting; stale, blocked
and completed signals do no work. This prevents a sequence of updates from
accumulating stale prompts. The standalone ledger runner does not attempt to
start an agent by itself.
