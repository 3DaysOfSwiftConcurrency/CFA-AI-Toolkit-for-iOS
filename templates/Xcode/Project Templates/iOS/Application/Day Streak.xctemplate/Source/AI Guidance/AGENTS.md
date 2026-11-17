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
