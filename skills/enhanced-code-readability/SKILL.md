---
name: enhanced-code-readability
description: "Improve an existing Swift or CFA app's clarity in small, verified feature-by-feature passes. Use for behaviour-preserving naming and flow improvements; not for a mechanical repo-wide rename or new feature work."
---

# Enhanced code readability

Make code teach its reader. This is a deliberate, behaviour-preserving pass for
an existing app, not a broad rename sweep and not a substitute for feature
work, architecture adoption, or migration verification.

Before writing code, apply [Decide before writing code](references/swift-coding-guide.md#decide-before-writing-code).
Read the [project workflow and design authority](references/project-workflow.md),
[Swift coding guide](references/swift-coding-guide.md), [CFA change gate](references/cfa-change-gate.md),
and [product behaviour contract](references/product-behaviour-contract.md). For
a CFA app, use the [CFA specification](references/cfa-specification.md) to
understand responsibility boundaries before renaming them.

When a naming or flow decision needs explanation, use the shared [decision
rationale and verified learning links](references/explanations/guide.md). Explain
the specific reader-facing consequence in the current code rather than applying
a generic naming rule mechanically.

## The eight-year-old code-book rule

Write as though a curious eight-year-old could follow the story of the code
with a little Swift knowledge. This does not mean replacing accurate domain
language with childish words. It means a reader can see:

- who owns the work;
- what a value represents;
- what an action does and what result it produces; and
- why a guard, task, error path, or state transition exists.

Prefer the clearest true name over the shortest name. A function that performs
networking, waits for a result, or checks freshness should say so through its
name and shape. A predicate should read as a fact. A comment should explain a
surprising reason or preserved product rule, not repeat what an obvious line
already says.

For example, rename a method only after tracing its callers and behaviour:
`resolveDeepLink` might become `resolveDeepLinkDestination(for:)` when it
asynchronously determines a destination. Do not call that method a conversion
if URL parsing belongs to a separate router. A guard named
`requireDeepLinkSession` may be essential if it rejects cancellation or an old
login session; make its protection explicit, for example
`ensureDeepLinkSessionIsCurrent(_:)`, rather than deleting it because its
result is not a returned value.

## Work one coherent slice at a time

Start with the AppModel or one named Feature and its directly related screens,
ViewModels, workers and tests. Do not mechanically rename every matching
identifier in the repository. For each slice:

1. Record the baseline revision and identify the owning type, callers, tests,
   target membership and externally visible contracts. For a whole-codebase
   programme that must survive interruptions, maintain a short
   `READABILITY_LEDGER.md` in the project: scope, completed slices, evidence
   and next slice. Do not create a second migration ledger.
2. Read the code in its execution order. State, in plain language, what each
   public action promises, what each important private helper protects, and
   which asynchronous task owns the work.
3. Make the smallest coherent clarity change. Prefer names that tell the
   action and result; split a dense expression only when named steps make the
   story clearer; keep the control flow straightforward. Update tests so their
   names describe the behaviour they protect.
4. Preserve protocols, framework callbacks, Codable keys, persisted storage
   keys, raw values, analytics names, accessibility identifiers, URLs and
   other external contracts unless a separate authorised change requires one.
   Do not add layers, move ownership, or alter product behaviour merely to
   make names look uniform.
5. Run focused tests and build every affected target after the last rename or
   project edit. A static check cannot replace compilation: repair any compiler
   errors, including missed callers, and build again. Re-read the changed code
   as a new reader, then record build and test evidence before choosing the
   next Feature. Follow the mandatory final compilation gate in
   [project workflow](references/project-workflow.md#mandatory-final-compilation-gate).
   Stop only when the agreed AppModel and Feature scope has been reviewed and
   the final build passes, or report the exact blocker without claiming completion.

When a migration has just completed, this is an optional next programme. Do
not reopen its completed migration ledger, revise its evidence, or start a
readability pass without the developer's approval. Report migration completion
first, then ask whether they want this separate feature-by-feature pass.

Use `$swift-code-quality` for broader Swift correctness or API design and
`$cfa-codebase-tidy` when the requested outcome includes architecture,
concurrency ownership, UI structure, or test-coverage changes beyond
readability.
