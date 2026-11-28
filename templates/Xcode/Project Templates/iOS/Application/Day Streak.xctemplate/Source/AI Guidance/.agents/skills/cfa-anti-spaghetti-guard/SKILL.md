---
name: cfa-anti-spaghetti-guard
description: Guard CFA Swift and SwiftUI design, implementation, review, and code suggestions against dependency tunnelling, chained feature access, unclear ownership, speculative abstractions, and timing machinery. Use for CFA work; not for non-CFA Swift projects.
---

# CFA Anti-Spaghetti Guard

Apply this guard before proposing Swift code or a CFA design. It protects CFA
boundaries while preserving the requested product behaviour; it is not a
formatting pass.

Read the [project workflow and design authority](references/project-workflow.md),
[Swift coding guide](references/swift-coding-guide.md), and
[CFA change gate](references/cfa-change-gate.md) before continuing. Apply the
[mandatory final compilation gate](references/project-workflow.md#mandatory-final-compilation-gate)
when the task changes an app.

When the ownership or test-boundary decision needs explanation, use the shared
[decision rationale and verified learning links](references/explanations/guide.md).

## Ownership check

Inspect the current composition. State the owner of the domain operation and
durable state, the owner of session/application state when relevant, the owner
of presentation or navigation, and the direct dependency each collaborator
receives.

Do not infer a boundary from a name or earlier conversation. If the requirement
that created the complexity is unclear, challenge it before adding a seam,
helper, protocol, task registry, or delay.

## Rejections

- Do not tunnel through dependencies. Treat every `feature1.feature2` chain as
  a code smell: a caller needing `SessionFeature` and `SettingsFeature`
  receives both directly from composition; it must not use
  `settingsFeature.sessionFeature`.
- Do not add forwarding types or dependency bags without a distinct, present
  ownership responsibility.
- Treat every use of `sleep`—including `Task.sleep`, injected clocks or delay
  closures, debounce helpers, polling loops, or any function that effectively
  waits for time to pass—as a code smell. Challenge its existence before
  proposing or retaining it.
- A delay is allowed only for an explicit, observable product or platform
  requirement. Name that requirement, keep the wait with the owner of that
  behaviour, and test the behaviour rather than elapsed time.
- Never inject `sleep`, artificial delays, clocks, `AsyncStream` gates, or
  test-only waiting closures into a production API merely to manufacture a
  test race. Control the existing provider, repository, request, or operation
  in the test instead.
- Give each task one clear owner, cancellation policy, and observable outcome.
  Do not add a task collection or waiting API without a demonstrated need for
  independent concurrent work.

If a proposal fails a rule above, explain the boundary violation and offer the
smallest compliant shape. Do not present the failing option as valid CFA.
