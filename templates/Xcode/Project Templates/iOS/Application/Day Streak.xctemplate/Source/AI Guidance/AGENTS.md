# CFA project instructions

This project uses Cooperative Feature Architecture (CFA). Read
`ARCHITECTURE.md` before changing Swift source. It points to the authoritative
CFA specification and Swift coding guide packaged under `.agents/skills`.

Choose the relevant local skill for the request. Preserve the product's
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
