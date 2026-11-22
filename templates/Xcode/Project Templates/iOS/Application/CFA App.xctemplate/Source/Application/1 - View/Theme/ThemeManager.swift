import Foundation
import Observation
import SwiftUI

@MainActor
@Observable
final class ThemeManager {
    private let defaults: UserDefaults
    private static let selectedThemeKey = "selectedTheme"

    var selection: ThemeSelection {
        didSet { defaults.set(selection.rawValue, forKey: Self.selectedThemeKey) }
    }

    var selectedTheme: AppColourTheme {
        AppColourTheme(selection: selection)
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        selection = ThemeSelection(rawValue: defaults.string(forKey: Self.selectedThemeKey) ?? "") ?? .automatic
    }
}
