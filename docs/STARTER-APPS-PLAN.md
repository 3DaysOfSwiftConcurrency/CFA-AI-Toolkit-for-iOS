# CLI-friendly CFA starter apps

## Goal

Every maintained CFA starter is a ready-to-open Xcode project and can also be
created reproducibly from the command line. The generator copies a canonical
starter; it must never grow a second hand-maintained implementation.

## Supported now

| CLI starter | Canonical project | Pattern it demonstrates |
| --- | --- | --- |
| `tab-bar` | Tab Bar App | Home and Settings tabs, appearance preferences and complete CFA slices |
| `foundation` | Tab Bar App | Complete CFA foundation with AppModel, feature slices, Settings and tests |
| `habit-tracker` | Habit Tracker | Persistence, editing, daily state and streaks |
| `habit-tracker-pro` | Habit Tracker Pro | Trends and StoreKit entitlement handling |
| `day-streak` | Todays Twenty | Durable sequential practice and streak calculation |
| `remote-list` | Remote List | Remote loading, cache restoration, retry and shared refresh |

All generated projects use `com.3DaysOfSwiftConcurrency.<AppName>` for the app
and `com.3DaysOfSwiftConcurrency.<AppName>.<AppName>Tests` for the unit-test
target. Creation refuses to overwrite a destination. The generator’s regression
check creates every starter, validates its Xcode project file, verifies app and
test identifiers, and parses every generated Swift file.

## Next slices

1. Keep **CFA App** as the complete neutral Xcode template. Use **Tab Bar App**
   as the CLI foundation so every generated project starts with AppModel,
   feature ownership, Settings, tests, and the four root folders.
2. Retire feature-rich templates from the Xcode chooser after their equivalent
   starters have command-line creation coverage. Keep them only while their
   generated-source contracts remain deliberately supported.
4. Add generation-level source, project-identity and runtime checks for each
   starter as iOS runtime availability permits.

## Command

```sh
node scripts/create-cfa-project.mjs --starter remote-list --name ReadingList --out ./ReadingList
```

Use `--list` to view supported starters. `--template` is accepted as a
compatibility alias for `--starter`.
