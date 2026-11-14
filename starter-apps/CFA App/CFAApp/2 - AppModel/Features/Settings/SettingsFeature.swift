import Foundation
import Observation

enum ThemeSelection: String, CaseIterable, Identifiable {
    case automatic, light, dark, ocean, plum, forest, terracotta, indigo
    var id: String { rawValue }
}

@MainActor
@Observable
final class SettingsFeature {
    private static let selectedThemeStorageKey = "selectedTheme"
    private let defaults: UserDefaults
    private(set) var selectedTheme: ThemeSelection

    init(defaults: UserDefaults) {
        self.defaults = defaults
        selectedTheme = ThemeSelection(rawValue: defaults.string(forKey: Self.selectedThemeStorageKey) ?? "") ?? .automatic
    }

    func selectTheme(_ theme: ThemeSelection) {
        defaults.set(theme.rawValue, forKey: Self.selectedThemeStorageKey)
        selectedTheme = theme
    }
}
