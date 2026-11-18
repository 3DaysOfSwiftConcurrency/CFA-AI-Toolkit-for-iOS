# CFA Migration Engine MCP server

The CFA Migration Engine can run as a local MCP server. It exposes the existing
ledger-based Engine; it does not independently implement CFA rules.

The server provides eight tools:

- `cfa_migration_init`, `cfa_migration_audit`, `cfa_migration_status` and
  `cfa_migration_validate`
- `cfa_migration_checkpoint`, `cfa_migration_evidence`,
  `cfa_migration_block` and `cfa_migration_complete`

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
