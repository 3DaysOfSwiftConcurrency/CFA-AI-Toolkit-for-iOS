import Foundation
import Observation
import SwiftUI

@MainActor
@Observable
final class ThemeManager {
    private let defaults: UserDefaults
    private static let selectedThemeStorageKey = "selectedTheme"
    var selection: ThemeSelection {
        didSet { defaults.set(selection.rawValue, forKey: Self.selectedThemeStorageKey) }
    }
    var selectedTheme: AppColourTheme {
        AppColourTheme.availableThemes.first(where: { $0.id == selection.rawValue }) ?? .automatic
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        selection = ThemeSelection(rawValue: defaults.string(forKey: Self.selectedThemeStorageKey) ?? "") ?? .automatic
    }
}
