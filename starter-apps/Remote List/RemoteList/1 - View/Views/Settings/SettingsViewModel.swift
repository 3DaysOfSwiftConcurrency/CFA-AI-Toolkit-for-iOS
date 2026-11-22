import Foundation
import Observation

@MainActor
@Observable
final class SettingsViewModel {
    private let appInformation: AppInformation
    private let developerWebsiteAddress = "https://3daysofswiftconcurrency.com"

    init(appInformation: AppInformation = .current) {
        self.appInformation = appInformation
    }

    func selectTheme(_ theme: AppColourTheme, using themeManager: ThemeManager) {
        themeManager.selectedTheme = theme
    }

    func themeName(_ theme: AppColourTheme) -> String {
        switch theme {
        case .automatic: "Automatic"
        case .ocean: "Ocean"
        case .graphite: "Graphite"
        case .midnight: "Midnight"
        case .systemGrey: "System Grey"
        case .forest: "Forest"
        case .terracotta: "Terracotta"
        case .lavender: "Lavender"
        }
    }

    var appName: String { appInformation.appName }

    var developerWebsiteURL: URL? {
        URL(string: developerWebsiteAddress)
    }

    var versionDescription: String { appInformation.versionDescription }
}
