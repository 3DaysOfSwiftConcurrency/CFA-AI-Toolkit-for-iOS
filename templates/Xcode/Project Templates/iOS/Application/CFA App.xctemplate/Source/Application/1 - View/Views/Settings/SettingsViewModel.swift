import Observation

@MainActor
@Observable
final class SettingsViewModel {
    private let settingsFeature: SettingsFeature

    init(settingsFeature: SettingsFeature = AppModel.shared.settingsFeature) {
        self.settingsFeature = settingsFeature
    }

    var selectedTheme: ThemeSelection { settingsFeature.selectedTheme }

    func selectTheme(_ selection: ThemeSelection) {
        settingsFeature.selectTheme(selection)
    }

    func title(for selection: ThemeSelection) -> String {
        switch selection {
        case .automatic: "Automatic"
        case .light: "Light"
        case .dark: "Dark"
        }
    }
}
