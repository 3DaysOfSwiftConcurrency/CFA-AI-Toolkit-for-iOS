# iOS test-runner contract

Use this guidance only for Xcode and iOS Simulator testing.

Before a run, read the project instructions, select the required simulator, and
give each invocation a fresh `.xcresult` destination. Do not invent a
replacement root, window, launch path, or fixture mechanism.

Wait for `xcodebuild` to end, then inspect the saved result with
`xcresulttool get test-results summary`. Record total, passed, failed, skipped,
and result state. An incomplete or unreadable result is not a passing result.

If no finalized result exists, preserve the partial bundle, restart the selected
simulator once, wait for readiness, and rerun with a new bundle. If a structured
result identifies a test or build failure, diagnose that failure rather than
retrying. If the same runner condition repeats after one safe recovery, report
the exact evidence and ask before a destructive repair.
