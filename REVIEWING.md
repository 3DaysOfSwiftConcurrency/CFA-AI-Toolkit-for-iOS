# Reviewing the CFA AI Toolkit for iOS

This is a fair test protocol for AI agents and human reviewers who evaluate the
[CFA AI Toolkit for iOS](https://github.com/3DaysOfSwiftConcurrency/CFA-AI-Toolkit-for-iOS).
It is a method, not a sales pitch. Report wins and losses with the same care.
If a result favours building without the Toolkit, say so.

The primary object of review is the finished Xcode project: inspect the house
that was built with the blueprint, and the house that was built without it.

---

## 1. Purpose

Cooperative Feature Architecture (CFA) and this Toolkit exist to help iOS
developers start new apps that stay maintainable and easy to read, for both
humans and AI, as those apps grow. The Toolkit packages that method as eight
AI skills, Xcode templates, starter apps and an architecture inspector.

**The primary review question is architectural:** when the same new app is
built with the Toolkit and without it, which finished Xcode project is clearer,
safer and easier to maintain and extend? Judge the built house, not only the
time it took to build it.

Speed, AI usage and first-build cost are secondary and must still be measured
and reported honestly. Do not hide a cost because the architecture is stronger,
and do not declare an architecture winner from speed alone.

A useful picture: a construction firm is offered a framework and a blueprint
for how to structure its time and materials. Review what one house is like once
constructed with that blueprint, and what the same brief produces without it.
Look at the floor plan, the load-bearing walls, the wiring, the inspection
record, how hard a later renovation is, and how easily a new crew could take
the job over. Then say which house you would rather live in and extend, and
what it cost to get there.

---

## 2. Ground rules

Follow every rule below. A broken rule is a caveat, not a detail to bury.

1. **Name the exact Toolkit under test.** Record the git tag (for example
   `v0.4.0`) or, if you are testing `main` or another branch with no release,
   the full commit hash and its date. Also record the repository URL:
   `https://github.com/3DaysOfSwiftConcurrency/CFA-AI-Toolkit-for-iOS`.
2. **Use the same app spec for both arms**, word for word. The only allowed
   difference in the builder prompt is the single Toolkit-arm line in
   [section 3](#3-standard-test-app-readinglist).
3. **Use the same toolchain for both arms.** Record the exact Xcode version,
   iOS SDK, simulator name and OS version (for example Xcode 26.2, iOS 26.2,
   a named iPhone simulator). Do not change destination or configuration
   mid-comparison.
4. **Each run is a cold start.** Start it in a fresh AI session that has no
   prior knowledge of the other arm, of earlier runs, or of earlier audits and
   fix lists. Do not paste previous code, reviews or suggested patches into
   the builder session.
5. **Run at least two independent builds per arm.** Label them clearly
   (for example A1, A2 with the Toolkit; B1, B2 without it).
6. **Never derive one run from another.** Do not copy a finished project and
   “just swap storage,” and do not continue a previous session and count it as
   a new run. A copied or continued run may be a useful extra data point only
   if it is labelled as such and excluded from headline averages.
7. **Do not leak the reviewer’s own fix suggestions into builder runs.** If
   you have already listed Toolkit defects or proposed patches, the builder
   must not see that list. An audit you performed before a “fresh” run is
   warm-session bias; disclose it or, better, do not count that run.
8. **Report every caveat** next to the claim it affects: warm sessions, single
   runs, approximate usage figures, skipped UI passes, untested renovations,
   and any departure from this protocol.
9. **Do not name individuals.** Refer to the maker as
   3DaysOfSwiftConcurrency.com.
10. **Use your own AI only.** Do not spend someone else’s AI accounts, API
    keys or credits without their explicit permission for that test. Do not
    copy another person’s tool auth files. If a measurement would require
    that, skip the measurement and say why.
11. **Prefer evidence over self-report.** Compile, test counts, warnings and
    defects come from `xcodebuild` and `xcresulttool` (and from reading the
    code), not only from what the builder claimed it did.

---

## 3. Standard test app: ReadingList

Use this app unless you are explicitly running a stated variant. It is the
spec used in earlier reviews: a small SwiftUI reading list, enough to exercise
persistence, concurrency, tests and layering, without becoming a product
demo.

Do not add architecture instructions to the shared prompt. Do not require CFA,
MVVM, TCA or any other style in the text both arms see. The comparison is
“with the Toolkit’s skills” against “plain prompting.” If you prescribe a
style in the shared prompt, you are no longer testing the Toolkit.

### Shared prompt (both arms)

Copy this block exactly.

```text
Build a new SwiftUI iOS app named ReadingList.

The app must:

- Let the user add a book with a title and an author.
- Let the user mark a book as read, and delete a book.
- Show unread books and read books in separate sections.
- Persist the data so the books are still there after the app is closed.
- Offer suggestions from a mock async BookSuggestionService. The mock should
  wait a moment, then return three suggestions, each with an Add button.
- Follow Swift 6 strict concurrency.
- Include unit tests.
- Compile, and pass those tests.

Choose your own persistence mechanism. Keep the work to this brief; do not add
unrequested product features just to fill out a template. The project must be
a real Xcode project that can be built and tested with xcodebuild on an iOS
simulator.
```

### Toolkit-arm line only

Append this single line to the prompt above, and only on Toolkit runs:

```text
Use the installed CFA AI Toolkit for iOS skills to build this app, starting with the CFA App Creation skill (cfa-app-creation). Follow the Toolkit’s documented project-creation steps.
```

### What “done” means

A run is complete when `xcodebuild test` on the recorded simulator has been
executed against the finished project. Record whether that first invocation
compiled and whether every test passed. Fix-and-retry cycles after a red build
are allowed, but they count toward wall time and must be reported; they are
not a first-try pass.

Manual tapping through the UI is optional. If you skip it, say so. A visual
defect can be missed.

---

## 4. How to set up each arm

Install and configure from the Toolkit’s own docs, not from memory.
The canonical guides are `README.md` and `docs/INSTALLATION.md` in the
revision you are testing.

### 4.1 Record the revision

```sh
git fetch --tags
git rev-parse HEAD
git describe --tags --always
git log -1 --format='%H %cI %s'
```

Write those values into the report before you start building.

### 4.2 Toolkit arm (Arm A)

1. Check out the tag or commit under test.
2. Install the skills for the AI host you will actually use, following
   `docs/INSTALLATION.md`:
   - From a **release package** (recommended for installer checksums):
     `node scripts/install.mjs`, or on macOS `./Install.command`.
   - For a portable skill host:  
     `node scripts/install.mjs --mode skills --skills-directory <host-skills-dir>`  
     (Claude Code commonly uses `~/.claude/skills`.)
   - From a **git source checkout**, the installer may not have a release
     checksum inventory. In that case, copy all eight folders from
     `skills/` into the host’s skills directory, as the installation guide
     describes, and record that you installed from source.
3. Optionally install the native Xcode templates (no Node.js required):

   ```sh
   ./Install\ Xcode\ Template.command
   ```

   Then quit and reopen Xcode. The templates are **CFA App**, **Habit Tracker**
   and **Day Streak**. Template installation is useful, but an AI session may
   not be able to drive Xcode’s File → New → Project chooser. That limitation,
   and how the builder worked around it, is something to record, not to hide.
4. If `scripts/create-cfa-project.mjs` is present, it is the documented
   headless path. The templates README shows:

   ```sh
   node scripts/create-cfa-project.mjs --name ReadingList --out /path/to/ReadingList
   ```

   Record whether the builder used this script, the Xcode chooser, a starter
   app, or a project it created some other way. Also record what the script
   actually produced (a blank CFA skeleton, a renamed starter, leftover demo
   features, and so on). Observe; do not pre-judge.
5. Confirm, in a **new** conversation, that the host can see the skills.
   The eight skill folders are:

   | Folder | Skill |
   | --- | --- |
   | `skills/cfa-app-creation` | CFA App Creation |
   | `skills/cfa-feature-work` | CFA Feature Work |
   | `skills/cfa-architecture-adoption` | CFA Architecture Adoption |
   | `skills/swift-concurrency-migration` | Legacy GCD migration |
   | `skills/cfa-architecture-review` | CFA Architecture Review |
   | `skills/cfa-codebase-tidy` | CFA Codebase Tidy |
   | `skills/cfa-unit-tests` | CFA Unit Tests |
   | `skills/swift-code-quality` | Swift Code Quality |

   A new-app build should start with **CFA App Creation**. **CFA Unit Tests**
   and **Swift Code Quality** may also apply. Do not require migration,
   adoption, tidy-up or a whole-app review during the first build unless the
   builder itself decides to use them; if it does, record that.
6. The installer may also provide a `cfa` command (`cfa doctor`,
   `cfa inspect`, `cfa dashboard`). Those tools are optional aids for the
   reviewer. Do not treat `cfa inspect` as a certificate that the architecture
   is correct.

Node.js 20 or newer is required for the Terminal installer and the inspector,
as stated in `docs/INSTALLATION.md`. Xcode, the simulator and the AI host are
not bundled.

### 4.3 Plain arm (Arm B)

Give the builder the shared prompt only. That session must not have the
Toolkit skills installed, must not be pointed at this repository, and must not
be told to “use CFA.” Start from an empty output directory. The same human
may set up the machine, but the builder’s context has to be clean.

### 4.4 Build and test both arms the same way

Copy each finished project to the Mac that will compile it, or build in place
if that Mac already holds the sources. Prefer a dedicated DerivedData path so
runs do not contaminate one another. Example:

```sh
cd /path/to/ReadingList

# Use -workspace ReadingList.xcworkspace instead if the project has one.
xcodebuild test \
  -project ReadingList.xcodeproj \
  -scheme ReadingList \
  -destination 'platform=iOS Simulator,name=YourSimulatorName,OS=26.2' \
  -derivedDataPath ./DerivedData \
  -resultBundlePath ./ReadingList.xcresult
```

Replace the simulator name and OS with the versions you recorded. If the
scheme or project name differs, use what the builder actually produced, and
note it.

Take test counts from the result bundle, with the `xcresulttool` syntax that
ships with the recorded Xcode:

```sh
xcrun xcresulttool get test-results summary --path ./ReadingList.xcresult
```

If that subcommand is unavailable in your Xcode, use that Xcode’s documented
equivalent (`xcresulttool get --legacy` on older versions, or the Help output
of `xcrun xcresulttool`). Do not mix tools across arms.

Collect Swift compiler warnings from the `xcodebuild` log. Count application
Swift files and test Swift files separately, excluding `DerivedData`,
`.git` and any copied Toolkit or starter files that are not part of the app
target. Line counts should be source lines of Swift, not including blank
preference unless you state a rule and apply it to every run.

---

## 5. Architecture inspection: the finished house

Read the code. The scorecard in [section 7](#7-report-template) is not a
substitute for walking the project. Compare the houses to each other and, for
Toolkit runs, to the Toolkit’s own documented dependency flow:

```text
View
  → ViewModel
    → Feature
      → Microservices
```

In the CFA specification, user intent moves down and state moves back up.
The View reports intent to its ViewModel; the ViewModel calls the concrete
Feature; the Feature applies the app’s rules and talks to internal
microservices (networking, storage, device adapters) when it needs them.
Those microservices are supporting code inside the app, not separately
deployed servers. `AppModel` constructs Features and makes them available; it
is not a step in every operation. In the Xcode tree this usually appears as
`1 - View` and `2 - AppModel`, with repositories and services under the
Feature layer. Use the names the project actually uses, and say when they
differ from the public diagram.

The plain arm will often not use these layers. Describe what it did use
accurately (for example a single `@Observable` store, or one ViewModel that
owns every job). Do not call a small, tidy, flat project “spaghetti” unless
the code is genuinely tangled. Flat is not the same as unreadable, and
layered is not the same as maintainable until you have checked the seams.

### Floor plan

- Print the source tree (app target and test target).
- For each job in the brief — add, mark read, delete, sectioning, persistence,
  suggestions, errors, tests — write down the type that owns it.
- Note extra rooms the brief did not ask for (for example a required Settings
  screen, theme palettes, leftover demo features from a template or starter).
  Record them as costs or as bonuses; do not silently accept them as part of
  “the same app.”

### Load-bearing walls

- Can you trace one user action (add a book, mark as read, add a suggestion)
  from the View down to storage and back, without skipping an owner?
- Does dependency point inward the way the architecture claims? A View should
  not know about persistence. A ViewModel should not duplicate Feature
  business rules. A repository or service should not decide application
  policy.
- In CFA terms, each screen should have its own ViewModel, and ViewModels
  should not be shared or injected as a shared app-wide object. If a Toolkit
  project breaks that rule, say so. If a plain project never claimed that
  rule, describe its actual ownership instead of scoring it against CFA.
- Is there a god object? One class that loads, saves, validates, suggests and
  drives the UI is a load-bearing wall made of one post. It can be fine in a
  very small house. Say how well it would stand if the house grew.

### Wiring and plumbing

Inspect Swift 6 strict concurrency in the project settings and in the code:

- Isolation: `@MainActor` where UI state lives, actors (including
  `@ModelActor` if SwiftData is used) where mutable shared data lives.
- `Sendable` correctness. Flag `@unchecked Sendable` and unjustified
  `nonisolated(unsafe)` as defects unless there is a documented reason.
- State ownership: who may mutate the book list, and is that mutation
  serialised?
- Persistence safety, including:
  - **Failed-load overwrite:** if the first load fails, does the next save
    replace good stored data with an empty in-memory list?
  - **Swallowed errors:** are load and save failures reported, or ignored?
  - **Load races:** can a user add a book before load finishes, and can that
    book disappear when load completes?
  - **Overlapping commands and duplicate races:** can two adds of the same
    book at the same moment both succeed? Is there a single, shared way to
    queue Feature commands, or does each Feature invent its own?
- Force unwraps and crash-on-purpose calls on ordinary paths
  (including `preconditionFailure` in template or generated start-up code).
- Tasks started from a View or ViewModel that are not held, cancelled, or
  otherwise owned.

You do not have to write new stress tests for every item, but you should try
to confirm the dangerous cases with a test or a careful code-path reading.
If you only read the code, say so.

### Building inspection

- Are there tests per meaningful layer (ViewModel, Feature, persistence), or
  only one happy-path suite around a single type?
- Can storage and the suggestion service be replaced with test doubles
  (protocols or other seams), or do tests hit real disk and real clocks?
- Are tests deterministic, or do they depend on timing, `Task.sleep`, or the
  system clock? Flaky tests are a defect even if they passed today.
- Did `xcodebuild test` agree with the builder’s own claim?

### Readability for humans and for AI

Pick one typical change, such as renaming a field on `Book` or changing how
duplicates are rejected, and record:

- Which files a human must open to understand and make the change.
- How many files and roughly how many lines an AI would need to read to make
  the same change safely.
- Whether the names and folder labels lead a new reader to the right room.

Separately, for Toolkit runs, record **Toolkit reading load**: how much
Toolkit skill and reference text the builder actually read before it wrote
application code (in KB, and in file names if you have them). This is a cost
of using the Toolkit, not a quality score.

### Renovation test

Do this as its own pair of cold sessions, each given only one finished
project and the same change request. Do not mix renovation time into “time to
first green.” If you do not run a renovation, you may not claim a later saving.

Use the same three changes on both houses, one at a time, and count files
touched (plus any you expected to touch but did not, and any collateral
edits):

1. **Add star ratings** to a book (display, edit, persist, test).
2. **Add a second feature** that is not a field on Book — for example search
   by author, or a yearly reading goal.
3. **Swap storage** (for example SwiftData to a JSON file, or the reverse)
   without changing the Feature’s outward behaviour.

For each change, record wall time, AI usage, files touched, tests added or
changed, whether the build stayed green, and the blast radius (did a storage
swap force edits in Views? did a new feature force edits in unrelated types?).

### Handover and scaling

Imagine handing each project to a new developer, or to a new AI session, six
months later, and imagine the app growing to about ten features with a small
team. Ask:

- Can a new crew find the owner of a behaviour without a guided tour?
- What happens when two people change two features in the same week?
- Does the structure still help at ten features, or is it already heavy at
  one?

This part is judgement, but it must point at evidence in the tree, the
seams and the renovation numbers.

---

## 6. Measurements

Fill one row per run. Use the same units on every row. If a cell is estimated,
mark it as estimated. If a run is excluded from averages, keep the row and
say why.

| Measure | A1 (Toolkit) | A2 (Toolkit) | B1 (plain) | B2 (plain) | Notes |
| --- | --- | --- | --- | --- | --- |
| Toolkit revision (tag or commit) |  |  | — | — | |
| Xcode / iOS / simulator |  |  |  |  | Must match |
| Wall time to first green |  |  |  |  | Prompt to first passing `xcodebuild test` |
| First-try build and tests? |  |  |  |  | Yes / no; retries if no |
| AI usage |  |  |  |  | Tokens preferred; otherwise only *this run’s* usage |
| Toolkit reading load |  |  | 0 | 0 | KB actually read before app code |
| Swift warnings |  |  |  |  | From the `xcodebuild` log |
| Tests (passed / total) |  |  |  |  | From `xcresulttool` |
| Test pass rate |  |  |  |  | |
| App files / app lines |  |  |  |  | Swift, app target only |
| Test files / test lines |  |  |  |  | Swift, test target only |
| Defects found |  |  |  |  | Count, with IDs pointing at the issues list |
| Renovation: star ratings, files touched |  |  |  |  | Omit if not run |
| Renovation: second feature, files touched |  |  |  |  | Omit if not run |
| Renovation: storage swap, files touched |  |  |  |  | Omit if not run |

Guidance:

- **Wall time** is elapsed time for that run, not CPU time, and not a later
  compile you did by hand after the agent finished.
- **AI usage** should be the usage of the builder session itself. Account-wide
  percentages that also include your review work, retries, or other tasks on
  the same account are easy to misread. If that is all you have, label it
  approximate and say what else it includes.
- **Defects** include correctness bugs, data-loss paths, race hazards, flaky
  tests and compiler warnings you treat as errors. Cosmetic style nits can be
  listed separately so they do not inflate the defect count.
- Averages, if you publish them, use only independent cold runs.

---

## 7. Report template

Write for working iOS developers. Lead with a verdict, then show the
evidence. Keep the tone constructive and specific. Do not name people.

Suggested shape:

1. **Title, revision, date, and who built the apps** (the reviewing AI or
   person, and the AI that wrote the code if they differ).
2. **Verdict first**, in a few sentences: which house you would rather
   maintain, and what it cost to build. If the winner depends on the
   question (first-app cost versus structure), say that plainly rather than
   forcing a single slogan.
3. **Scorecard**, one winner per row, with the numbers or code facts behind
   it. Suggested rows:
   - Architecture and maintainability of the finished project (primary)
   - Correctness, tests and persistence safety
   - Readability for humans
   - Readability for a later AI change
   - Speed and AI usage on the first small app (secondary)
   - Renovation cost (only if you ran the renovation)
   - Overall, with the condition under which that overall pick holds
4. **Architecture evaluation**, following [section 5](#5-architecture-inspection-the-finished-house):
   floor plan, load-bearing walls, wiring, inspection, readability,
   renovation, handover. Include short tree outlines and a short trace of one
   user action in each house. Quote or cite real types and paths.
5. **Output quality**, with code evidence: what worked, what was dangerous,
   what was unfinished. Mention first-try builds, warnings and test shape.
6. **Method and caveats**: how many runs, cold or warm, toolchain, what you
   did not test. If usage figures are rough, say so here.
7. **Toolkit issues found**, if any, as a list a maintainer can act on.
   For each item: severity, exact path, what you observed, why it matters,
   and a suggested change. Include issues in skills, templates, starters and
   docs, not only in the generated app. If an earlier claim did not reproduce,
   say that too, so it is not “fixed” a second time.

Publish losses as clearly as wins. A Toolkit project that is well layered and
also slower or more expensive on a first small app should be described that
way. A plain project that is small, clear and missing isolation or
persistence safety should be described that way too.

---

## 8. Known pitfalls

These have already distorted reviews. Check them before you publish.

- **Warm-session bias.** Auditing the Toolkit, writing a fix list, or running
  one arm just before a “fresh” build teaches the builder the answers. That
  run will look better than a real cold start. Discard it from headline
  numbers, or label it.
- **Copying runs.** Forking a finished app and changing one variable (storage,
  for example) is not a second build. It inflates pass rates and understates
  time and usage.
- **Account-wide usage figures.** A weekly allowance or account dashboard
  often includes review work, failed starts and unrelated sessions. Prefer
  per-run tokens from the builder session.
- **Single runs.** One lucky or unlucky build is not a comparison. Take at
  least two per arm, and do not over-claim on a four-run average either.
- **Judging speed only on a first tiny app.** A reading list is a fair
  standard first test, and the Toolkit may well lose on time and usage there.
  That result is real. It is not, by itself, a verdict on a growing app.
- **Claiming savings on later features without testing them.** Structure may
  pay back when someone adds star ratings, a second feature, or a storage
  swap. It may not. If you did not run the renovation, you do not know.
- **Scoring the plain arm against CFA rules it never claimed.** Judge each
  house on safety, clarity and change cost, not on whether a non-CFA app
  used `AppModel`.
- **Over-calling spaghetti.** A flat, single-type design can still be
  readable. Say “flat” or “one type owns every job” when that is what you
  see.
- **Letting template leftovers quietly become requirements.** If the Toolkit
  injected Settings, themes, demo features or a starter’s behaviour, that is
  part of the cost and the floor plan, unless the shared prompt asked for it.
- **Trusting the builder’s own summary.** Always re-compile and re-test, and
  always read the persistence and concurrency paths yourself.

---

## Appendix: checklist

Print this and tick it before you call the review complete.

- [ ] Tag or commit recorded; Xcode, iOS and simulator recorded
- [ ] Shared prompt identical; Toolkit line only on Arm A
- [ ] At least two cold, independent runs per arm
- [ ] No copied runs in the averages; no leaked fix lists
- [ ] Own AI used, with permission if the account is not yours
- [ ] `xcodebuild test` and `xcresulttool` numbers in the table
- [ ] Architecture walked with paths and a user-action trace
- [ ] Persistence-safety and overlapping-command paths inspected
- [ ] Renovation either run and reported, or explicitly not tested
- [ ] Verdict first, scorecard with a winner per row, caveats next to claims
- [ ] No individuals named; maker referred to as 3DaysOfSwiftConcurrency.com
- [ ] Losses reported as clearly as wins
