# CFA Engineering Philosophy

This document describes how CFA engineers make everyday implementation and
review decisions. It accompanies the authoritative CFA specification, Swift
coding guide, and CFA change gate. When a specific CFA rule applies, follow
that rule. This philosophy explains how to choose the simplest clear design
within those boundaries.

## KISS Always Decides

Keep it simple is CFA's deciding principle. Choose the smallest, clearest
design that meets the current product requirement, preserves correct behaviour,
and gives every responsibility an understandable owner.

KISS does not mean writing the fewest characters, omitting needed tests, or
flattening important boundaries. It means rejecting code, types, abstractions,
dependencies, and processes that do not provide a present and explainable
benefit. When two designs can meet the requirement, choose the one a new
developer can understand, test, change, and safely remove most easily.

Do not justify complexity with a possible future use. Add a boundary when it
has a real responsibility, substitution need, lifecycle, or ownership reason
now.

## Separate Concerns Pragmatically

CFA separates responsibilities so that a reader can find them, not so that an
architecture diagram has more boxes. Views describe the interface. ViewModels
own screen presentation state and screen workflows. Features own business
behaviour and authoritative feature state. Lower-level services own focused
storage, transport, device, or processing work.

Keep the route visible:

```text
View → ViewModel → Feature → focused supporting service
```

Use the fewest of these steps that keeps the responsibility clear. Do not move
business rules into a ViewModel, persistence into a View, or feature state into
an unowned helper merely to reduce a file count. Equally, do not introduce a
coordinator, wrapper, manager, protocol, actor, module, or extra Feature when
an existing owner can express the work clearly.

Every non-trivial type must earn its existence. A developer should be able to
complete the sentence, “This type owns …” with one concrete responsibility. If
the answer is vague, duplicated, or only says that the type forwards work,
remove it or merge the work into its existing owner.

## Make Ownership Explicit

One owner is accountable for each shared value, business decision, asynchronous
operation, and durable side effect. That owner defines the API, state,
concurrency policy, and error behaviour that other code observes.

Name the owner and trace the path to it. A button action or a View `.task`
should be followable from the View, through its ViewModel, into the Feature
that owns the work, then back through observed state or a reported outcome.
The same vertical slice should be understandable in reverse: a reader starting
at a Feature operation can find the screen intent that starts it.

AppModel composes concrete Features. It is not a second owner for feature
state, a service container, or a place to hide screen workflows.

## Prefer Structured Concurrency and Honest Lifetimes

Use structured concurrency when child work belongs to a parent operation. Use
an unstructured `Task` only when its work has an independently managed
lifetime, and make its owner, stored handle, cancellation policy, and cleanup
plain to see.

Features define what happens when asynchronous calls overlap: share one
execution, queue commands, replace obsolete work, or use another policy with a
specific product reason. ViewModels own screen-created task handles; Features
own feature work that can outlive one screen; AppModel owns app-wide listeners.
Views do not hide task ownership or retain task handles.

Do not make concurrency look simpler by silently changing required behaviour.
Preserve independent work where it must be independent, keep UI-observed state
responsive, and test cancellation, reentrancy, stale results, failure, retry,
and overlap when they affect the feature's contract.

## Write for the Eight-Year-Old Reader

It is unlikely that an eight-year-old will read the project. Write as though
one could. This is not a request to weaken the design; it is a standard for
making intent, responsibilities, and outcomes immediately understandable.

An ideal CFA project reads almost like a book. A developer opening Xcode should
see the View layer at the top and the model beneath it. Inside the model, named
Features should reveal how each capability works. A reader should not have to
decode clever syntax, a dense chain, or a vague object graph to discover what a
button does.

Prefer readable, maintainable code over clever, compressed code. Break a chain
into named intermediate values when that exposes a meaningful step. Keep a
short chain when it is already obvious. The standard is understanding, not a
maximum name length or an arbitrary ban on chaining.

## Let Names Explain the Code

Names communicate the information a value contains, the responsibility a type
fulfils, and the action and result a function performs. A reader should usually
understand a declaration without inspecting its implementation.

Avoid generic names such as `result`, `data`, `value`, `item`, `object`, `x`,
`temp`, `var`, and `manager` when they conceal useful domain meaning. Use a
concise name only when its scope already makes the meaning unmistakable, such
as a framework-required `id` or a small loop variable with a clear element
type.

Prefer names that expose the domain:

```swift
// Avoid
let result = await service.get(id)

// Prefer
let customerOrders = try await orderService.fetchOrders(for: customerID)
```

Types name their responsibility. Functions name the action they perform and,
where helpful, its meaningful outcome. ViewModel methods describe the work,
not the gesture that reached them: `save()` rather than `savePressed()`.
Use the same domain term along a vertical slice, including the concrete Feature
type, its AppModel property, the ViewModel dependency, initializer labels, and
tests.

## Depend on What the Product Needs Now

Use dependency injection when it creates a real boundary: deterministic tests,
a volatile dependency such as time, a genuine external capability, or multiple
current implementations. Keep dependencies narrow and purpose-named.

Prefer concrete Features to speculative `FeatureAPI` protocols. Test the
concrete Feature with controlled storage, transport, clock, or provider
dependencies. Keep a protocol only when it represents a genuine substitution
boundary, public contract, or real second implementation. Remove confirmed
unused protocols and other dead abstractions within the work's scope.

Start with native Swift, Apple's frameworks, and small internal components the
team owns. Add a third-party service SDK only when its current value clearly
outweighs the dependency's integration, maintenance, privacy, reliability, and
testing cost. Keep external services behind an honest, focused boundary; do
not allow an SDK's shapes and lifecycle to spread through Views and Features.

Compose collaborating values and Features rather than building an application
inheritance hierarchy. Inheritance is appropriate only where the platform or a
real substitutable base contract requires it; it is not CFA's default tool for
sharing behaviour.

## Test the Behaviour We Promise

Tests make the architecture real. Every concrete Feature needs focused API and
behaviour coverage, and every ViewModel needs its own named test file and
suite. Feature tests exercise business rules, state publication, errors,
retries, concurrency policies, and supporting dependency boundaries.
ViewModel tests exercise screen workflows and user-visible outcomes without
requiring a rendered interface.

Test an exhaustive behaviour matrix for the feature's actual contract, not
only its happy path. Include valid and invalid inputs, empty and restored
states, failures, retries, cancellation, overlapping work, and boundary cases
whenever those behaviours are possible. Use controlled dependencies and
directly await async work. Do not substitute arbitrary sleeps, timing luck, or
implementation-detail assertions for evidence of behaviour.

## A Practical Decision Check

Before accepting a change, ask:

1. Does KISS choose this design over a simpler clear alternative?
2. Can I point to one owner for each state, decision, task, and side effect?
3. Can I trace the whole vertical slice from intent to Feature and back?
4. Does every type, dependency, protocol, and SDK solve a present problem?
5. Would a new developer understand the names and control flow without
   reconstructing a hidden chain of work?
6. Do focused Feature and ViewModel tests demonstrate the behaviour promised?

Do not use SOLID or another named design doctrine as a substitute for these
questions. CFA chooses direct, readable, owned code over compliance with an
abstract checklist.
