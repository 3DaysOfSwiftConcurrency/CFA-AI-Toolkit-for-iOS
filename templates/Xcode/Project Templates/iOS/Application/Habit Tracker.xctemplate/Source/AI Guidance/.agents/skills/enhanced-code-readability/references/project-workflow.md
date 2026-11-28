# CFA project workflow and design authority

CFA governs engineering boundaries, not a customer's visual identity. Read the
project's existing instructions and current request before applying toolkit
defaults. This policy takes precedence over template styling and design advice.

## Commit existing work before new work

Before beginning a new task in a Git repository, inspect the working tree and
staging area. When there are existing changes unrelated to the new task, review
them and commit that earlier work separately before making new changes. Use a
meaningful commit message and preserve the contents; do not discard, reset or
silently combine them with the new task. This rule also applies before a
read-only review: the commit records the existing changes, but the review does
not otherwise modify the app.

Inspect staged and untracked files before including them. Never commit secrets,
generated private data, or unresolved merge conflicts. If the existing work
cannot be safely committed, explain the specific obstacle and continue any
independent work that does not disturb it. A baseline commit does not authorize
pushing or publishing. User instructions and repository restrictions take
precedence over this default.

## Record the workflow once

Use an existing project instructions file (normally AGENTS.md); merge a small
section rather than replacing instructions. During authorised implementation,
record a mode when the user clearly establishes it:

- **New-product development:** creating and continuing to shape a new app.
- **Established-product maintenance:** maintaining, adopting CFA in, migrating
  or tidying an existing product whose design and behaviour should be preserved.

A suitable entry is `CFA workflow: new-product development` or
`CFA workflow: established-product maintenance`, followed by any important
user-approved design decisions. Do not create a new settings framework for this.

Creating the first files does not end new-product development. Do not infer a
switch from project age, a Git commit, a release number, or the existence of an
Xcode project. Respect a later explicit change of mode. Do not ask the user to
select the mode on every task. With no recorded mode or clear new-app intent,
use design-preserving maintenance behaviour and continue the requested work;
do not block it on a mode question. Read-only reviews never write this record.

## New-product development

App Creation covers both the initial scaffold and ongoing product shaping.
Use [new-app design defaults](new-app-design-defaults.md) where the user has
not supplied a design or made a different choice. These are starting points,
not permanent requirements or CFA conformance criteria.

Suggest relevant design ideas when the user is actively exploring that part
of the product. Do not repeatedly offer themes, footers, icons or branding.
Once the user chooses, declines, removes or replaces a default, respect that
decision in future work. Do not restore it on the next creation-skill invocation.
Record durable decisions briefly in existing project instructions when useful.

This mode is not blanket redesign permission. A request to fix a build, rename
a property, write tests or tidy code remains bounded to that request. Implement
requested UI changes; do not redesign unrelated screens. Reuse current features,
assets and design choices rather than re-scaffolding the app.

## Established-product maintenance

Preserve approved layouts, navigation, copy, branding, colours, theme choices,
Settings content, icons, interactions and accessibility behaviour. Feature work
fits the existing design system. Architecture adoption and concurrency migration
change implementation, not the product designer's decisions.

Never add, replace or repeatedly offer theme palettes, theme selectors, CFA
footers, branding or starter artwork during ordinary maintenance. Their absence
is not an architectural defect, a failed review or a reason to score CFA lower.
Do not require ThemeManager in a product that does not need selectable themes.
Repairing existing icon wiring is appropriate when it is part of the requested
fix; a missing icon does not authorize installing CFA branding.

Explicit requests can opt into individual changes, such as “add CFA footer to
Settings View” or “add colour themes”. Apply only that change, adapting it to
the existing design and preserving saved preferences and legal content.
Mentioning appearance or asking for one colour fix does not opt into the whole
new-app design package. Do not keep asking after an opt-in has been declined.

## Checks and conflicting instructions

Engineering requirements still apply: clear ownership, testable behaviour,
safe persistence, accessibility and honest errors. Separate a demonstrated
functional/accessibility defect from a stylistic preference; report an
out-of-scope defect with evidence, without using it as permission to redesign.
Follow explicit user requirements and project design decisions over defaults.
If a requested structural change cannot preserve behaviour, explain the
specific conflict and obtain direction before changing that behaviour.

## Xcode scheme discovery

Before any Xcode build, test, simulator launch, or presentation check, discover
the real build container and schemes. At the project root, use
`xcodebuild -list -json` with `-workspace <name>.xcworkspace` when exactly one
workspace exists; otherwise use `-project <name>.xcodeproj` only when exactly
one project exists. Do not infer a scheme from an app, target, folder, or
product name.

Use a scheme only when it appears in that command's JSON result. An explicitly
requested scheme must still appear in the result. If there is one discovered
scheme it may be selected; if there are none or more than one, stop and report
the discovered names and the missing choice. Never manufacture a name or
silently switch to an unrelated scheme.

Before executing a test or presentation check, validate the selected scheme's
requested action and explicit destination with a dry run, for example:

```zsh
xcodebuild -workspace "Actual.xcworkspace" -scheme "Actual" \
  -destination 'platform=iOS Simulator,name=Actual Simulator,OS=latest' test -dry-run
```

Use the same discovered container, verified scheme and validated destination
for the real command. If discovery, action validation, or destination validation
fails, report that failure plainly instead of presenting a build, test, or UI
check as successful. The toolkit helper
`scripts/xcode-scheme-discovery.mjs` performs this discovery and dry-run gate
when it is available in the repository.

## Mandatory final compilation gate

For any task that changes an Xcode app or package, compile the changed project
at its final source revision before calling the task complete. Discover the
actual container and scheme as above, build every affected app, extension,
device or package target with an appropriate destination and configuration,
and run relevant tests. A source scan, static check, earlier successful build,
or green tests from before the last edit cannot replace the final build.
After fixing any compiler error, build again; repeat until the affected builds
pass. Record the command, scheme, destination, configuration, targets and result
in the handoff. Rebuild after any subsequent code or project-file change.

If compilation cannot be run or fails, continue safe repairs when possible.
Otherwise state the exact failure or environment blocker and the remaining
verification step. Do not claim that the task or project is finished, verified,
or compilable. For a read-only review, report the build result or explicitly
mark compilation unverified; do not change app code under review-only scope.

Before delivery, compare the changed UI/behaviour with the baseline. Every
intentional visual or interaction change must follow the current request or
an applicable new-app default that the user has not overridden. Record any
unverified visual checks accurately. Do not use source checks as proof of an
unchanged rendered interface.

For snapshot-test work, inspect the test host before accepting a screenshot
result. The normal app root, window and lifecycle are part of the product under
test: do not replace them through test schemes, test plans, launch environment
flags or application branches. Keep fixture data outside the product UI, wait
for observable screen readiness rather than elapsed time, and preserve existing
reference images until a human reviews an explicitly changed product contract.
