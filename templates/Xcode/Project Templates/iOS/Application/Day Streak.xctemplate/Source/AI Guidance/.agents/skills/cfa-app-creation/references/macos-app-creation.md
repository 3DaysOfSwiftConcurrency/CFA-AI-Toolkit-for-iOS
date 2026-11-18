# macOS App Creation Rule

Apply this rule whenever creating or regenerating a native macOS application
project. It supplements CFA ownership rules with Xcode project requirements; it
does not change the View → ViewModel → Feature → service route.

## Create a runnable shared app scheme

A scheme is incomplete when its Build action contains the application target
but its Run action does not name an executable. Building with **Command-B** only
compiles the selected targets. Running with **Command-R** can launch the app only
when the scheme's `LaunchAction` contains a `BuildableProductRunnable` whose
`BuildableReference` identifies the application target.

For every generated macOS app scheme:

1. Store the scheme at
   `<Project>.xcodeproj/xcshareddata/xcschemes/<Scheme>.xcscheme` so the runnable
   configuration is committed with the project.
2. Include the `.app` target in `BuildAction` with `buildForRunning = "YES"` and
   `buildForProfiling = "YES"`.
3. Give `LaunchAction` a `BuildableProductRunnable` that references that same
   app target by `BlueprintIdentifier`, `BuildableName`, and
   `ReferencedContainer`.
4. Give `ProfileAction` the same explicit app runnable.
5. Verify the scheme before handoff. From the toolkit root, run:

   ```zsh
   node scripts/verify-macos-app-scheme.mjs \
     '<Project>.xcodeproj/xcshareddata/xcschemes/<Scheme>.xcscheme'
   ```

6. Ask Xcode to load the scheme and resolve its build settings, then manually
   use **Command-R** when an interactive launch check is available. A successful
   build or `xcodebuild` settings query does not by itself prove that the app
   launched.

Do not accept an empty `LaunchAction`, infer that Build implies Run, or leave the
only working scheme in per-user `xcuserdata`.
