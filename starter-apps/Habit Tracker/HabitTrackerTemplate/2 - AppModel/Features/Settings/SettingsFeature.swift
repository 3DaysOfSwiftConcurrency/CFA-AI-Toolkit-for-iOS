import Foundation
import Observation

@MainActor
@Observable
final class SettingsFeature {
    private static let firstWeekdayStorageKey = "firstWeekday"
    private let defaults: UserDefaults
    private(set) var firstWeekday: Int

    init(defaults: UserDefaults) {
        self.defaults = defaults
        let savedValue = defaults.integer(forKey: Self.firstWeekdayStorageKey)
        firstWeekday = [1, 2].contains(savedValue) ? savedValue : 2
    }

    func selectFirstWeekday(_ weekday: Int) {
        guard [1, 2].contains(weekday) else { return }
        defaults.set(weekday, forKey: Self.firstWeekdayStorageKey)
        firstWeekday = weekday
    }
}
