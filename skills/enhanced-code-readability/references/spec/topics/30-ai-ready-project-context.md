## AI-ready project context

Generated CFA projects must provide a portable `AGENTS.md` entry point and the
relevant local CFA skills so a coding agent can identify the architecture before
editing source. A project-local `ARCHITECTURE.md` may provide a reading map, and
tool-specific files for Cursor or Claude may direct their hosts to the portable
entry point. These files are integration adapters, not alternate architecture
specifications: they must point to this specification and the Swift coding guide
instead of duplicating or contradicting their rules. Preserve a project's
existing instructions and tool configuration when adding CFA guidance. Validate
core CFA compliance independently from whether a particular editor recognises
its adapter.
