# Minimum-visible refresh controls

Use these presentation components when a product explicitly requires a refresh
indicator to be visible for a minimum duration. They measure from presentation
start, so a 20-second request stays visible for 20 seconds—not 20.3 seconds.

The Feature or ViewModel starts work immediately and reports completion
immediately. It does not receive a clock, sleeper, scheduler, or delay closure.

## UIKit

Add `MinimumVisibleRefreshControl.swift` to the presentation target and use it
as a normal `UIRefreshControl`:

```swift
private let refreshControl = MinimumVisibleRefreshControl(frame: .zero)

func refreshDidFinish() {
  refreshControl.endRefreshing()
}
```

For user-initiated pulls, the control records its own `.valueChanged` start.
For programmatic refreshes, it records `beginRefreshing()`.

## SwiftUI

Add `MinimumVisibleRefreshable.swift` to the presentation target:

```swift
List(items) { item in
  Text(item.title)
}
.minimumVisibleRefreshable {
  await viewModel.refresh()
}
```

The modifier keeps SwiftUI's refresh indicator active only for the remaining
portion of the requested minimum duration.

## Rules

- Do not add a fixed delay after a request completes.
- Do not inject a scheduler, clock, sleep closure, or test gate into a Feature
  or ViewModel for refresh presentation.
- Default to immediate dismissal unless an observable product requirement calls
  for a minimum visible duration.
- Test feature completion independently from indicator presentation. Do not use
  wall-clock sleeps in tests.
