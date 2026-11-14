import Observation

@MainActor
@Observable
final class SettingsViewModel {
    private let settingsFeature: SettingsFeature

    init(settingsFeature: SettingsFeature = AppModel.shared.settingsFeature) {
        self.settingsFeature = settingsFeature
    }

    var selectedTheme: ThemeSelection { settingsFeature.selectedTheme }

    func selectTheme(_ theme: ThemeSelection) {
        settingsFeature.selectTheme(theme)
    }

    func title(for theme: ThemeSelection) -> String {
        switch theme {
        case .automatic: "Automatic"
        case .light: "Light"
        case .dark: "Dark"
        case .ocean: "Ocean"
        case .plum: "Plum"
        case .forest: "Forest"
        case .terracotta: "Terracotta"
        case .indigo: "Indigo"
        }
    }
}
