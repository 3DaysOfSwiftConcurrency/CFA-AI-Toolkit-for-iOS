# Why teams use CFA

Cooperative Feature Architecture (CFA) is a deliberately small architecture for
SwiftUI applications using Swift Concurrency. It gives people and coding agents
the same map: a screen presents state through its ViewModel; a concrete Feature
owns a business capability; lower-level services perform storage, networking or
device work; and AppModel composes the live graph.

## For companies and teams

- **A repeatable engineering map.** Named ownership and a visible project
  structure reduce the time needed to locate behaviour and review changes.
- **Safer change at the boundary.** Features own their state and workflows, so
  changes can be tested where their business effect is observable rather than
  through a global object graph.
- **A practical migration path.** CFA describes how to modernise a legacy app
  while preserving its product behaviour, stored data and established design.
- **Reviewable claims.** The architecture dashboard, change gate and test
  guidance help teams inspect evidence. They do not certify an app or replace
  engineering review.

## For developers

- **A shared vocabulary.** `AppModel`, `Feature`, ViewModel and service name
  specific responsibilities rather than implementation fashion.
- **Native concurrency boundaries.** UI-observed Features and ViewModels are
  explicitly MainActor-bound; work such as networking and persistence uses an
  isolation boundary appropriate to the work.
- **Less ceremony.** CFA prefers direct concrete Features and asks for a
  protocol, coordinator or wrapper only when it has an immediate purpose.
- **Tests follow ownership.** ViewModel tests cover presentation, Feature tests
  cover business workflows, and storage tests cover persistence and recovery.

## For AI coding agents

AI agents need durable, local context as much as developers do. Generated CFA
projects include portable `AGENTS.md`, a local set of CFA skills, a concise
`ARCHITECTURE.md`, and opt-in tool adapters for Cursor and Claude. These files
point to the same CFA specification; the adapters do not restate or compete
with it. The result is a project an agent can understand before proposing a
change, even when it cannot access a globally installed toolkit.

## Evidence and limits

CFA is not a promise of fewer defects, faster delivery or automatic compliance.
Those outcomes depend on the product, team, review practice and validation.
The toolkit supplies examples, a change gate and an inspector; use them as
evidence sources and verify the affected user journey on the supported targets.

CFA is a good fit when a SwiftUI app has enduring business capabilities,
concurrent work, or more than one contributor. A tiny prototype or a project
that must follow another established architecture may not benefit from adopting
it. Migration has a real cost: preserve behaviour first, introduce one complete
slice at a time, and do not use architecture work as permission to redesign the
product.

The authoritative rules are the [CFA specification](architecture/cfa-specification.md)
and [Swift coding guide](architecture/swift-coding-guide.md). The
[open-source examples](architecture/spec/examples/open-source-apps.md) identify
real projects to inspect; they are learning evidence, not a claim that every
revision of those projects conforms to every current rule.
