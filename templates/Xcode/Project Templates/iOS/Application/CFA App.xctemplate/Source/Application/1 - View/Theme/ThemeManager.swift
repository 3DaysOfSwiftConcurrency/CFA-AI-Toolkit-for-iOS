import Observation
import SwiftUI

@MainActor
@Observable
final class ThemeManager {
    private let settingsFeature: SettingsFeature

    init(settingsFeature: SettingsFeature = AppModel.shared.settingsFeature) {
        self.settingsFeature = settingsFeature
    }

    var selectedTheme: AppColourTheme {
        AppColourTheme(selection: settingsFeature.selectedTheme)
    }
}
