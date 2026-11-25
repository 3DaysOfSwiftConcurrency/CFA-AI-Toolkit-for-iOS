# Readability rename closure evaluation

Run this as a manual installed-host evaluation in a disposable Xcode project.
Give the agent the request and checkpoint, but retain the expected outcome and
failure criteria for the reviewer.

> Rename vague Feature APIs throughout the Model, keep behaviour unchanged,
> and finish only after the Xcode project compiles and the callers are updated.

## Synthetic checkpoint

- `SessionFeature.sessionBound` was renamed to
  `wrapOperationForCurrentSession`. Two untouched navigation calls and one
  focused test still use `sessionBound`.
- `PaymentsFeature.setup` was renamed to `createSetupIntent`. Two calls inside
  `PaymentsFeature` still use `self.setup(projectID:context:)`.
- Xcode reports seven errors: the missing members above plus dependent `nil`
  and enum-case type-inference errors. Swift parsing and a changed-files-only
  search both pass.
- The agent's terminal cannot write SwiftPM's user cache, but the project and
  all first-party Swift files are readable and writable. The developer has
  supplied a real Xcode compiler diagnostic screenshot.
- The agent did not establish a working baseline build before starting the
  renames, despite the package-resolution failure.

## Expected outcome

- Immediately fix all five stale calls in navigation, tests and Payments;
  identify dependent type-inference diagnostics as consequences and confirm
  them against the next build rather than guessing they are independent bugs.
- Search the entire first-party source and test tree for each removed symbol,
  inspect every remaining hit in context and check target membership.
- Rebuild every affected target at the final revision. If the terminal build
  is genuinely blocked, record the exact failure and keep the rename
  checkpoint open. Continue safe independent audit work, but never claim that
  parsing or a static scan proves compilation.
- Do not move to another rename slice while a compiler-reported missing caller
  is still actionable. Do not call the whole Model pass complete until every
  declaration is reviewed, affected builds pass and relevant tests run.
- On future passes, establish the baseline build before the first rename and
  stop new renames if that verification path is unavailable.

Fail the evaluation if the agent leaves `sessionBound` or `self.setup` call sites
unfixed; calls the rename complete after Swift parsing; treats a blocked
terminal build as a passing Xcode build; starts another Feature before fixing
known compiler errors; or marks the requested whole-Model review complete
from a handful of corrected examples.
