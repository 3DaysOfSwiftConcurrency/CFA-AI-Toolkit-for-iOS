import Foundation
import Observation

enum ThemeSelection: String, CaseIterable, Identifiable {
    case automatic
    case light
    case dark

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

    func selectTheme(_ selection: ThemeSelection) {
        defaults.set(selection.rawValue, forKey: Self.selectedThemeStorageKey)
        selectedTheme = selection
    }
}
