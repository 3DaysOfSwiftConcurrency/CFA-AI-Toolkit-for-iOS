# CFA AI Toolkit for iOS

This is the independent CFA AI Toolkit for iOS, not the Trend app. Maintain `architecture/cfa-specification.md`
as the canonical architecture and `tools/architecture-dashboard` as the canonical executable.
Run `node scripts/sync.mjs` to refresh generated skill dependencies. Never copy reports,
private source, absolute workstation paths or credentials into releases.

The public display brand is CFA AI Toolkit for iOS. Keep the existing repository
URL and plugin identifier stable for compatibility.
Cooperative Feature Architecture (CFA) remains the architecture name. Use the
subtitle “AI skills and tools to build, modernise, test and maintain SwiftUI apps
with Swift Concurrency.” AppModel is the composition-root type, not the public product
name. Respect a customer's bundle prefix.

Name each concrete feature owner with a `Feature` suffix, such as
`SettingsFeature`. The AppModel property, ViewModel dependency, initializer
label and local references use the matching `settingsFeature` name. Keep
lower-level services distinct; their names describe their actual jobs.
The canonical rules live in `architecture/cfa-specification.md` and
`architecture/swift-coding-guide.md`. Read `CFA-ENGINEERING-PHILOSOPHY.md`
when making or reviewing design choices: KISS decides between valid options;
the philosophy complements but does not replace specific canonical rules.
Keep `architecture/ai-project-guidance.md` as the integration contract for
portable project instructions and editor adapters; those adapters must point
back to the canonical rules rather than duplicating them.

The toolkit ships thirteen skills. Keep the nine project workflows distinct: app creation, CFA feature work, architecture
adoption, Legacy GCD migration, migration orchestration, enhanced code readability, read-only architecture review,
iterative CFA codebase tidying, and CFA unit tests. Swift Code Quality provides guidance
across those workflows and follows the active task scope. Legacy GCD migration
preserves product behaviour while moving the implementation to CFA and Swift
Concurrency. The CFA Anti-Spaghetti Guard is a mandatory proposal check before
Swift code or CFA design recommendations. Snapshot Test Integrity protects real
simulator evidence from synthetic test harnesses. The dashboard is a tool used by
architecture review. Coding Task Orchestrator keeps authorized coding work moving
until its applicable checks have complete, inspectable results.

Run `npm test`, `npm run validate`, and `python3 scripts/release.py` for release changes.
When editing a starter app or Xcode template, build every affected target at
the final revision and report the command and result. Repair compiler errors
and rebuild before calling the app work complete; if the build cannot run,
report the blocker without claiming compilation succeeded.
All runtime dependencies must be packaged or stated as prerequisites. Test installation
in a temporary destination. Do not alter a real personal marketplace during tests.
Do not infer native host compatibility or public publication from a valid manifest.

Do not publish to a remote repository or release service without an explicit destination
and authorization. The source repository can be committed/tagged locally for preparation.

## Public documentation

Write READMEs, release announcements and articles for the developer using the
product. Never copy prompts, assistant responses, conversational history or
internal task reports into them. Keep editorial approval status, publication
checklists, incidental broken-link investigations, test-run narration and
speculative disclaimers out of public product copy. Retain useful installation
instructions and material product constraints. Internal verification belongs in
maintainer records, not reader-facing prose. This is Matthew Thomas's explicit
standing preference.
