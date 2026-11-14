# CLI-friendly CFA starter apps

## Goal

Every maintained CFA starter is a ready-to-open Xcode project and can also be
created reproducibly from the command line. The generator copies a canonical
starter; it must never grow a second hand-maintained implementation.

## Supported now

| CLI starter | Canonical project | Pattern it demonstrates |
| --- | --- | --- |
| `blank` | CFA Blank | Empty, correctly identified project infrastructure |
| `habit-tracker` | Habit Tracker | Persistence, editing, daily state and streaks |
| `habit-tracker-pro` | Habit Tracker Pro | Trends and StoreKit entitlement handling |
| `day-streak` | Todays Twenty | Durable sequential practice and streak calculation |
| `remote-list` | Git Repos | Remote loading, cache restoration, retry and shared refresh |

All generated projects use `com.3DaysOfSwiftConcurrency.<AppName>` for the app
and `com.3DaysOfSwiftConcurrency.<AppName>.<AppName>Tests` for the unit-test
target. Creation refuses to overwrite a destination.

## Next slices

1. Rebuild **CFA App** as the small default product foundation: Home and
   Settings tabs, real CFA feature ownership and meaningful tests. Ship it as
   both the sole general-purpose Xcode template and `--starter app`.
2. Rename and generalise the Git Repos project into **Remote List**, retaining
   its verified networking/cache behaviour while removing GitHub-specific UI
   and product wording.
3. Retire feature-rich templates from the Xcode chooser after their equivalent
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
