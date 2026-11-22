import Foundation
import Observation

@MainActor
@Observable
final class ThemeManager {
    private let defaults: UserDefaults
    private static let selectedColourThemeStorageKey = "selectedColourTheme"
    var selectedTheme: AppColourTheme {
        didSet { defaults.set(selectedTheme.rawValue, forKey: Self.selectedColourThemeStorageKey) }
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        selectedTheme = AppColourTheme(rawValue: defaults.string(forKey: Self.selectedColourThemeStorageKey) ?? "") ?? .automatic
    }
}
