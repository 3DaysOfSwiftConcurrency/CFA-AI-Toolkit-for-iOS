import Observation

@MainActor
@Observable
final class SettingsViewModel {
    func selectTheme(_ selection: ThemeSelection, using themeManager: ThemeManager) {
        themeManager.selection = selection
    }

    func title(for selection: ThemeSelection) -> String {
        switch selection {
        case .automatic: "Automatic"
        case .light: "Light"
        case .dark: "Dark"
        }
    }
}
