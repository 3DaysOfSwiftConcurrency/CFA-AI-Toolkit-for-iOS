# CFA Migration Engine MCP server

The CFA Migration Engine can run as a local MCP server. It exposes the existing
ledger-based Engine; it does not independently implement CFA rules.

The server provides fourteen tools:

- `cfa_migration_init`, `cfa_migration_audit`, `cfa_migration_review_leads`,
  `cfa_migration_status` and `cfa_migration_validate`
- `cfa_migration_checkpoint`, `cfa_migration_evidence`,
  `cfa_migration_block`, `cfa_migration_reopen` and `cfa_migration_complete`
- `cfa_migration_claim_continuation`,
  `cfa_migration_enable_continuation`,
  `cfa_migration_heartbeat_continuation` and
  `cfa_migration_recover_continuation`

It also exposes the shared workflow, canonical CFA specification and Engine state
reference as read-only MCP resources. The tools use the same
`MIGRATION_LEDGER.md` state block as the local runner, so an MCP client and Codex
can safely resume the same authorised migration.

## Install the local runtime

From an extracted CFA toolkit release, run this once:

```sh
npm ci --omit=dev
```

This installs the pinned MCP server runtime locally. The server itself is stdio-only:
it opens no network port and sends no project source to a CFA service.

## Client configuration

Configure an MCP-capable client to start Node with the absolute path to the server:

```json
{
  "mcpServers": {
    "cfa-migration-engine": {
      "command": "node",
      "args": ["/absolute/path/to/ios-app-development-cfa/mcp/cfa-migration-engine.mjs"]
    }
  }
}
```

Keep the server inside the same extracted toolkit directory where you ran `npm ci`.
That keeps the server, its shared CFA specification and its pinned MCP runtime at the
same version. Restart the client after changing its MCP configuration.

## Scope and safeguards

The server only changes the selected project's existing `MIGRATION_LEDGER.md` when a
write-oriented tool is called. It refuses to replace an existing Engine state block.
It does not modify Swift source, run an Xcode build, execute a test suite or declare
scanner leads to be CFA violations. Those actions and judgments remain explicit work
performed by the agent and recorded as evidence.

## Self-healing Codex continuation

MCP by itself is a request/response protocol: it cannot keep an agent running
after the host has ended a turn. When the server is used locally by Codex, call
`cfa_migration_enable_continuation` with the current Codex thread ID. The
Engine stores that target in the existing ledger, installs one macOS user
watchdog for that ledger, and queues the Codex chat after each successful
non-terminal migration update:

```sh
codex queue --thread <thread-id> --resume --message "Continue the MCP-backed CFA migration…"
```

This resumes the same Codex chat with the ledger's current phase and next
action. Claiming the signal creates a time-bounded worker lease. State-changing
calls carry the returned token; a heartbeat renews it before long work. If the
agent or host stops, the watchdog detects the expired lease, fences the old
worker, and safely queues a replacement signal. It also redelivers an
unclaimed signal at a bounded interval.

The watchdog is a per-ledger macOS `LaunchAgent` under the current user's
`Library/LaunchAgents` directory. It removes itself when the ledger becomes
blocked or completed. It does not run builds, alter source, or bypass a genuine
product decision: it only restores the safe next migration action.

This unattended mode requires macOS, a local Codex host with `codex queue`
support, and a machine that remains powered on. The ordinary ledger and audit
tools remain usable from any supported MCP client. This is a Codex-host
integration, not a duplicate set of CFA rules in the MCP server.
