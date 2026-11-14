# Starter Apps

Working apps to get you going fast. Open an Xcode project, explore its screens,
features and tests, then make it your own. No template installation is required.

## Create a named copy from the command line

Every maintained starter can be copied into a new, safely renamed Xcode project:

```sh
node scripts/create-cfa-project.mjs --starter remote-list --name ReadingList --out ./ReadingList
```

Run `node scripts/create-cfa-project.mjs --list` for the full catalogue. The
command renames the app, unit-test target, project, schemes and bundle
identifiers. It refuses to overwrite an existing directory. The generated app
uses `com.3DaysOfSwiftConcurrency.<AppName>` and the test target uses
`com.3DaysOfSwiftConcurrency.<AppName>.<AppName>Tests`.

Maintainers can verify all generated copies without opening Xcode:

```sh
node scripts/verify-starter-projects.mjs
```

This checks project-file syntax, rewritten app/test identifiers and Swift source
syntax. It does not replace a device or simulator build and UI validation.

| Starter app | What you get | Open in Xcode |
| --- | --- | --- |
| [CFA App](CFA%20App/README.md) | Home and Settings tabs, app composition, appearance preferences and focused tests | [CFAApp.xcodeproj](CFA%20App/CFAApp.xcodeproj) |
| [Habit Tracker](Habit%20Tracker/README.md) | Habits, daily progress, streaks, SwiftData storage and Settings | [HabitTrackerTemplate.xcodeproj](Habit%20Tracker/HabitTrackerTemplate.xcodeproj) |
| [Habit Tracker Pro](Habit%20Tracker%20Pro/README.md) | Habit Tracker plus charts and a one-time StoreKit unlock | [HabitTrackerPro.xcodeproj](Habit%20Tracker%20Pro/HabitTrackerPro.xcodeproj) |
| [Todays Twenty](Todays%20Twenty/README.md) | Daily multiplication practice, saved sessions and reusable day-streak behaviour | [TimesThirty.xcodeproj](Todays%20Twenty/TimesThirty.xcodeproj) |
| [Git Repos](Git%20Repos/README.md) | GitHub networking, JSON cache restoration, shared refresh and remote-list presentation; created with `--starter remote-list` | [GitRepos.xcodeproj](Git%20Repos/GitRepos.xcodeproj) |
| [CFA Blank](CFA%20Blank/README.md) | Honestly blank foundation; add the first complete CFA feature when its journey is known | [CFABlank.xcodeproj](CFA%20Blank/CFABlank.xcodeproj) |

These are customisable starting points, not a guarantee of App Store readiness.
Read each app's setup, verification and distribution notes. Configure your own
signing, product identity, artwork and any live services before distribution.
The Todays Twenty project retains its existing internal name, TimesThirty;
moving the folder does not rename targets, bundle identifiers or storage paths.

## Templates versus Starter Apps

[Xcode Templates](../templates/Xcode/README.md) appear in File → New → Project
after installation. CFA App is the general-purpose foundation; Habit Tracker and
Day Streak are feature-rich templates. Day Streak currently creates the
multiplication-practice experience demonstrated by Todays Twenty, not a blank
daily-activity app.

Starter Apps are ready-to-open projects. Habit Tracker and Todays Twenty are also
the editable sources of their native templates. Maintain one source, not two:

| Edit this starter app | Generate this Xcode template | Command from the toolkit root |
| --- | --- | --- |
| Habit Tracker | Habit Tracker | `python3 scripts/sync-habit-template.py` |
| Todays Twenty | Day Streak | `python3 scripts/sync-day-streak-template.py` |
| Habit Tracker Pro | None; standalone purchase example | No generation step |
| Git Repos | None; optional remote-list and cache example | No generation step |

Use each generation command with `--check` to detect stale template output.
Do not hand-edit generated template sources. The Xcode template installer installs
three app templates and their three unit-test template components. Toolkit packages
include the starter projects separately.
