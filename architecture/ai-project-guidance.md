# AI-ready CFA projects

This document defines the portable AI-project integration. It does not add
architecture rules. [The CFA specification](cfa-specification.md) and
[Swift coding guide](swift-coding-guide.md) remain the only normative sources.

Every project made by `create-cfa-project.mjs` contains:

- `AGENTS.md`, the portable entry point for people and AI agents;
- `.agents/skills`, an offline copy of the toolkit's eight portable skills;
- `ARCHITECTURE.md`, a short project-local reading map;
- `CLAUDE.md`, which directs Claude Code to the portable entry point; and
- `.cursor/rules/cfa-architecture.mdc`, which directs Cursor to that same entry
  point.

The tool-specific files are adapters, not separate specifications. They must
not duplicate CFA rules, silently override project instructions, or claim that
tool-specific detection proves core CFA compliance. Test core architecture
compliance and each integration separately.

When enabling guidance in an existing project, append marked CFA guidance only;
preserve the developer's instructions and custom editor configuration.
