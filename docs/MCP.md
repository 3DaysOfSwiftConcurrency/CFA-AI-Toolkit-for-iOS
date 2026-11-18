# CFA Migration Engine MCP server

The CFA Migration Engine is bundled with the CFA AI Toolkit for iOS. It gives an
agent durable migration state, audit tools and self-healing Codex continuation
without maintaining a second copy of the CFA rules.

## Codex users: nothing extra to configure

Install the plugin release once by double-clicking `Install.command`. The
installer registers the bundled local MCP server and the release already carries
the server's production runtime. You do **not** run `npm ci`, edit an MCP
configuration file or start a server.

Then open the iOS project in a new Codex chat and say:

```text
Using the CFA AI Toolkit, migrate ProjectA to Swift Concurrency.
```

The Migration Orchestrator uses the server when it is available. Read the
[numbered GCD migration guide](step-by-step-GCD-Migration-Guide.md) for the
complete user journey, or [Migrate an existing iOS app with CFA](MIGRATION-GUIDE.md)
for an already structured app that needs a compliance pass.

## What the bundled server provides

The server provides fourteen tools:

- `cfa_migration_init`, `cfa_migration_audit`, `cfa_migration_review_leads`,
  `cfa_migration_status` and `cfa_migration_validate`
- `cfa_migration_checkpoint`, `cfa_migration_evidence`,
  `cfa_migration_block`, `cfa_migration_reopen` and
  `cfa_migration_complete`
- `cfa_migration_claim_continuation`,
  `cfa_migration_enable_continuation`,
  `cfa_migration_heartbeat_continuation` and
  `cfa_migration_recover_continuation`

It also exposes the shared workflow, canonical CFA specification and Engine
state reference as read-only resources. The tools use the selected project's
existing `MIGRATION_LEDGER.md`, so an MCP client and Codex can resume the same
authorised migration.

The local server uses standard input/output. It opens no network port and does
not send project source to a CFA service.

## Self-healing Codex continuation

For a whole-app migration on macOS Codex, the agent enables continuation after
it records the scope. The Engine creates a per-ledger watchdog and queues the
same Codex chat after each safe non-terminal update. A claimed worker has a
time-bounded lease and renews it before long work. If an agent stops, the lease
expires or a signal goes unclaimed, the watchdog safely resumes the current
ledger action. It removes itself when the migration becomes blocked or
completed.

This requires a powered-on Mac, a local Codex host with `codex queue` support,
and the normal permissions to work in the selected repository. It cannot make a
product decision, work while the Mac is off, or bypass required source review,
builds and tests.

## Another MCP client

A non-Codex MCP client can start the included server from the extracted plugin
folder using this standard-input/output configuration:

```json
{
  "mcpServers": {
    "cfa-migration-engine": {
      "command": "node",
      "args": ["/absolute/path/to/ios-app-development-cfa/mcp/cfa-migration-engine.mjs"],
      "cwd": "/absolute/path/to/ios-app-development-cfa"
    }
  }
}
```

This is the only case where a developer configures the server manually. The
plugin release includes its production dependencies; keep its folder intact and
use the Node.js version that installed the toolkit.
