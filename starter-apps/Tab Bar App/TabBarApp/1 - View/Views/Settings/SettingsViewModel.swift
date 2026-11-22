import Observation

@MainActor
@Observable
final class SettingsViewModel {

    func selectTheme(_ theme: ThemeSelection, using themeManager: ThemeManager) {
        themeManager.selection = theme
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
