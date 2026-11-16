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
