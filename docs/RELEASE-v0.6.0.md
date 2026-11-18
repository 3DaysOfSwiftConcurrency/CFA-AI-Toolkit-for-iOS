# CFA AI Toolkit for iOS 0.6.0

This release turns the CFA Migration Engine into a practical unattended
migration workflow for supported local Codex environments.

The local MCP server continues to read the canonical CFA workflow and
specification rather than duplicating architecture rules. It now adds a durable
continuation protocol around the existing `MIGRATION_LEDGER.md`:

- a claimed worker holds a renewable lease;
- every state-changing action carries that worker token;
- an expired or stopped worker is fenced and safely replaced;
- a per-ledger macOS watchdog redelivers unclaimed work and removes itself when
  the migration is blocked or complete;
- completion evidence is bound to the final source fingerprint, and ledger
  writes are serialized.

The engine was accepted against the already CFA-structured Kickstarter iOS
application. It recorded a final semantic CFA audit and human architecture
review, then ran the Library-iOS suite on its required iPad mini (A17 Pro),
iOS 18.6 reference simulator: **2,500 passed, 0 failed, 0 skipped**.

The unattended continuation mode requires macOS, a local Codex host with
`codex queue` support, and a powered-on machine. It does not bypass source
review, required builds/tests, or a genuine product decision. Other MCP clients
can use the same ledger and audit tools without enabling the Codex watchdog.
