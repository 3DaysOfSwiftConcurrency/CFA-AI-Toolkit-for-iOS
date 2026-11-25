# Naming review record

Keep this record in the app's `READABILITY_LEDGER.md` for a whole-app pass. It
tracks decisions, not just edits. Start with the actual target's Feature types,
then all model files outside those Features. Search declarations with a
Swift-aware parser where available; reconcile its file list with the Xcode
target and project tree. If a parser is unavailable, inspect every source file
and declaration manually. Do not turn a missing parser into a zero count.

## Scope and inventory

| Target | Feature or model area | Source files and extensions | Functions found / reviewed | Properties found / reviewed | Unresolved | Build and tests at final revision |
| --- | --- | --- | --- | --- | --- | --- |
| App target | SessionFeature | Feature file and extensions | To count / 0 | To count / 0 | To assess | Pending |

Replace placeholder counts from the source. Include private and static
functions, nested types, initializers, stored and computed properties. Note
conditional compilation, external declarations and files the scanner did not
read. Recount after edits; the total reviewed must equal the current total
found in every row. A missing source file, an unresolved decision or a build
blocker prevents a completed verdict.

## Declaration decisions

| Location and signature | Visibility | Action, result and side effect | Callers / contract | Name decision and reason | Local and parameter names checked |
| --- | --- | --- | --- | --- | --- |
| SessionFeature.request(_: Operation) | Exposed | Fetches one of two users or clears activity and returns updated user | Profile, Activity, root tab | Rename: one verb hides three different operations | Yes; record unclear values separately |

Give **every function and property** its own row, including a specific reason
when keeping its name. Mark unresolved items explicitly. For each function,
inspect its parameter names, local values, closure captures, completion,
cancellation and failure paths. Record local names requiring change in that
row or in a linked subsection. Framework-required callbacks and compatibility
contracts can keep their spelling with the reason recorded.

Before closing a Feature or model area, compare this table with a fresh source
inventory, check all callers and tests, and record the final build result. A
source parse or a list of changed names cannot establish compilation or full
naming coverage.
