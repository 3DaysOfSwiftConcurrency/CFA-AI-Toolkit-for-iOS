# CFA AI Toolkit for iOS 0.5.0

This release adds **CFA Migration Orchestrator**, the ninth toolkit skill. It
owns an authorised whole-app CFA and Swift Concurrency migration across safe
feature-sized passes instead of stopping after a plan, a converted route, or a
single green test.

It establishes and persists a project-local goal and evidence record, loops
through audit, correction and verification, coordinates the detailed migration,
adoption, test and review workflows, and records stall recovery. Completion is
permitted only when the existing final migration gate has evidence at the final
revision. A blocked record must state both the material blocker and the exact
unblock condition.

The included command validates the state record’s internal consistency; it does
not substitute for source review, builds, tests, manual verification, or the
required human architecture review.
