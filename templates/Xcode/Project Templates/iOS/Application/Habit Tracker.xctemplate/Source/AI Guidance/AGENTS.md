# CFA project instructions

This project uses Cooperative Feature Architecture (CFA). Read
`ARCHITECTURE.md` before changing Swift source or suggesting Swift code. It points to the authoritative
CFA specification and Swift coding guide packaged under `.agents/skills`.

Before proposing a CFA design or Swift snippet, apply the local
`cfa-anti-spaghetti-guard` skill. Identify the owner of each responsibility and
show how each collaborator receives its direct dependency. Never reach through
one Feature to another Feature or its collaborators (for example,
`settingsFeature.sessionFeature`). Do not introduce a production delay, sleeper,
or test-only waiting closure merely to create a race in a test; control the
actual provider or request at the existing substitution boundary instead.

When changing or interpreting screenshot tests, apply the local
`cfa-snapshot-test-integrity` skill. A product screenshot must use the normal
launched app on the configured simulator; do not replace the root controller or
window, add a test-only launch path, or wait for an arbitrary elapsed time.

Choose the relevant local workflow skill for the request. Preserve the product's
existing behaviour, design and project instructions; CFA guidance does not
authorise unrelated changes. Keep concrete Feature ownership, ViewModel
presentation boundaries and test evidence aligned with the canonical
specification rather than copying rules into new files.

Do not model application lifecycle as a Feature. The app delegate delivers
lifecycle events to AppModel, which routes them to the relevant real Feature
or focused infrastructure collaborator; `AppLifecycleFeature` and similar
catch-all lifecycle owners are non-CFA.

Before an Xcode build, test, simulator launch, or presentation check, discover
the real `.xcworkspace` or `.xcodeproj` and run `xcodebuild -list -json` against
it. Use only a returned scheme name. If several schemes are returned, ask which
one to use; if none are returned, stop. Do not derive, invent, or substitute a
scheme from a target, app, or folder name. Validate a test or presentation
check with its explicit simulator destination before executing it, then reuse
the same verified container, scheme, and destination for the actual command.

After any app or project edit, build every affected target at the final source
revision before calling the task complete. Run relevant tests and repeat the
build after fixing compiler errors or making further edits. Record the actual
scheme, destination, configuration, targets and outcome. A static check, old
build or test run does not establish final compilation. If building is blocked
or fails, report the exact problem and remaining check; do not claim the task
is finished or the project compiles. For a read-only review, report compilation
as checked or unverified without changing app code.
