---
name: enhanced-code-readability
description: "Improve an existing Swift or CFA app's clarity in verified Model-then-View passes. Use for behaviour-preserving naming and flow improvements; not for a mechanical repo-wide rename or new feature work."
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

**Feature APIs are developer-facing documentation.** Read each exposed method and
property as a ViewModel author would, with only its Feature type, signature and
nearby API names visible. Its name and labels must reveal the specific domain
action or returned information; a Task-returning name must reveal what work
starts. `SessionFeature.request(_:)` hides whether it fetches a user, fetches a
GraphQL user or clears an activity indicator. Prefer separate, honest entry
points such as `requestCurrentUser()`, `requestGraphUser()` and
`clearActivityIndicator()` when those are the actual behaviours. A
generic verb is not redeemed by a comment or a private implementation the
caller must open to understand. Judge framework-required names and genuinely
clear contextual names individually rather than mechanically banning words.

For example, rename a method only after tracing its callers and behaviour:
`resolveDeepLink` might become `resolveDeepLinkDestination(for:)` when it
asynchronously determines a destination. Do not call that method a conversion
if URL parsing belongs to a separate router. A guard named
`requireDeepLinkSession` may be essential if it rejects cancellation or an old
login session; make its protection explicit, for example
`ensureDeepLinkSessionIsCurrent(_:)`, rather than deleting it because its
result is not a returned value.

## Inventory every name before declaring the programme complete

First enumerate **every concrete Feature** in the selected app targets, its
source files and extensions (including declarations outside the conventional
Feature folder). For each Feature, enumerate **every function declaration**:
exposed and private methods, static methods and functions in nested Feature
types or extensions. Record its signature, location and access level in the
[naming review record](references/naming-review-record.md). Include initializers
and computed property accessors where their names or effects matter. Enumerate
every stored and computed property too. Do not infer coverage from the number
of Feature folders, files changed, regex hits or representative examples.

Review every function in execution order and at its call sites. For each,
write what it does, what it returns or changes, whether it starts retained
work, and whether its current name and argument labels convey those facts.
Review parameter names, local values and closure captures while reading that
function; record ambiguous ones and the decision. For each stored or computed
property, explain the value and its owner. Mark **keep** with a concrete reason,
**rename** with the replacement and caller updates, or **blocked** with the
compatibility or verification issue. A checked file or a list of only renamed
members does not count as a review of all its declarations. Prioritise public
and internal Feature APIs, but do not omit private functions or state.

Reconcile the discovered and reviewed function and property counts **for each
Feature and for the whole Feature inventory**, including files skipped by a
scanner, new declarations after edits, and conditional compilation branches.
Re-enumerate at the final source revision. Zero unreviewed or unexplained
entries is required to claim the Feature pass complete; every exposed API
must read as a usable description of its behaviour. An intentionally retained
framework callback, protocol requirement or compatibility-sensitive name
needs an explicit reason, not an automatic pass. A static scanner only finds
candidates; the developer-facing judgment requires reading the implementation
and callers.

After the complete Feature pass, apply the same declaration-by-declaration
review to the rest of AppModel, composition, model services, workers and
supporting model files in the agreed targets. Review their properties and the
local names within each function as above. Do not call a requested whole-Model
programme finished when only Feature files have been checked. For an explicitly
narrower request, name its exact scope and report the untouched inventory as
remaining work; never silently narrow a whole-Model request.

For a whole-app readability programme, close the Model inventory and its
verified build checkpoints before beginning the separate **View phase**.
Updating View callers during a Model rename does not count as reviewing the
View. Inventory every first-party presentation file in the agreed targets,
including SwiftUI Views, UIKit controllers, ViewModels, navigation and UI
adapters. Review every function and stored/computed property there, plus its
parameters, local values and closure captures, using the same individual
keep/rename/blocked decisions and final-source count reconciliation. Follow
each screen action through its ViewModel to the already-reviewed Feature API;
names should say what the UI displays, what intent it forwards and what
presentation work it awaits. Keep framework-required callbacks and bindings
with a reason. Review UI slices one at a time, including their tests and
cross-layer callers. A specifically requested View-only pass may start after
the existing Model audit and build evidence have been checked; it need not
repeat the Model audit. Track remaining View files and declarations explicitly
until a final no-change review and successful build close this phase.
Retain a presentation timing or cancellation injection when a focused test
uses it to prove behaviour; simplify its name or flow without discarding that
control merely because the default closure looks longer than an inline call.

## Work one coherent slice at a time

### Rename checkpoint and stop rule

Before the first rename, discover the real Xcode scheme and prove the affected
targets build at the baseline revision. If the baseline has compiler errors,
repair them as a separate verified step before renaming. If package resolution,
cache permissions or tooling prevent a build, do not start new renames: first
restore a working verification path. For a pass already in progress, repair
known broken callers immediately, and leave that checkpoint open until its
final build succeeds.

Treat each coherent rename slice as an open checkpoint until the build proves
its caller closure. Keep a short record with the original declaration, new
name, affected targets, all call sites found across first-party source and
tests, the exact final-revision build command and its result. Follow this
loop without waiting for the developer to say “continue”:

1. Rename the declaration and every matching caller, including calls in the
   declaring type, presentation/navigation code, tests and extensions.
2. Search the entire first-party Swift tree for the removed spelling. Resolve
   every hit in type context; do not assume a zero-hit scan of changed files
   covers untouched callers.
3. Build the affected targets. If any compiler diagnostic remains, fix it
   immediately, search again and rerun the build. Do not start another Feature
   or record a verified checkpoint between a failed build and its repair.
4. Only after the final build succeeds, record that revision and its build
   evidence as verified. A subsequent source or project edit reopens affected
   checkpoints and requires another build.

Use the [rename build gate](scripts/rename-build-gate.mjs) for an executable
checkpoint when Node and Xcode are available. For each affected scheme, run
`verify <project-root> --scheme <discovered-scheme> --destination
<explicit-destination> --evidence <project-root>/READABILITY_BUILD_EVIDENCE.json`;
use a separate evidence file per scheme and `--build-action build-for-testing`
when test sources changed. The command discovers the scheme, dry-runs, builds,
and writes evidence only on success. Run `check` on every evidence file before
claiming completion. It rejects source changed after the build, and a failed
rebuild removes earlier success evidence. If the gate cannot run, retain the
checkpoint as blocked; never invent an evidence file or treat a manual source
scan as a substitute for a build.

The workflow may stop as **complete** only when all requested declarations
have decisions, every rename checkpoint is verified at the final revision,
all affected targets compile and relevant tests pass. A cache, toolchain or
permission failure is **blocked**, not complete: record it, continue only
independent safe work, and do not publish a finished handoff or commit a
verified checkpoint. Do not hide missed callers behind a deprecated alias or
replace the compiler gate with Swift parsing.

**A rename is complete only after a successful build at the final source
revision.** Editing a declaration and its known callers is an applied,
unverified rename. Parsing, search results, token comparisons, or passing
tests do not establish that the affected targets compile. Build every affected
app, extension, test or package target after the last rename in the slice;
repair any compilation errors immediately and rebuild. In particular, a
method rename must search **all first-party Swift source and tests**, including
Views, navigation adapters, extensions, same-type calls and test helpers, for
the old spelling. Inspect each hit in its type context; a search limited to
the Feature folder or previously known callers is insufficient. If a build
reports a missing member, fix every related call site, then build again before
making another naming change. If Xcode or a dependency blocks
the build before compilation, keep the rename and slice explicitly open,
record the exact failure and remaining build command, and do not report it as
finished or choose the next Feature as though it passed. A later code change
invalidates earlier build evidence for that affected target.

For a whole-Model pass, start with one named Feature and inspect its related
screens, ViewModels, workers and tests as callers. Cover every Feature before
moving to the rest of AppModel. Begin the View naming inventory only after the
Model phase closes, unless the developer explicitly chooses another scope.
An explicitly narrow AppModel-only request can start there. Do not mechanically
rename every matching identifier in the repository.
For each slice:

1. Record the baseline revision, the complete inventory above, the owning
   type, callers, tests, target membership and externally visible contracts.
   For a whole-codebase programme that must survive interruptions, maintain
   `READABILITY_LEDGER.md` in the project with per-declaration decisions,
   per-Feature counts, evidence and the next unfinished slice. Do not create
   a second migration ledger.
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
5. Re-enumerate the current slice and reconcile its decisions with the final
   declarations; trace every renamed call site, including cleanup and error
   paths. Run focused tests and build every affected target after the last
   rename or project edit. A static check cannot replace compilation: repair
   compiler errors, including missed callers, and build again. Re-read the
   changed code
   as a new reader, then record build and test evidence before choosing the
   next Feature. Follow the mandatory final compilation gate in
   [project workflow](references/project-workflow.md#mandatory-final-compilation-gate).
   Stop only when every declaration and property in the agreed Model and/or
   View phase has a recorded decision, no actionable naming issue remains,
   and the final build passes. If discovery, compilation or tests are blocked,
   report exact counts and the blocker without claiming completion.

When a migration has just completed, this is an optional next programme. Do
not reopen its completed migration ledger, revise its evidence, or start a
readability pass without the developer's approval. Report migration completion
first, then ask whether they want this separate feature-by-feature pass.

Use `$swift-code-quality` for broader Swift correctness or API design and
`$cfa-codebase-tidy` when the requested outcome includes architecture,
concurrency ownership, UI structure, or test-coverage changes beyond
readability.
