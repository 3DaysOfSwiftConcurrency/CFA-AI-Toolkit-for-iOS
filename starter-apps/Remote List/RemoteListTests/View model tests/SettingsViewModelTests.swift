import Foundation
import Testing
@testable import RemoteList

@Suite("Settings screen") @MainActor
struct SettingsViewModelTests {
    @Test func selectionReachesThemeManager() throws {
        let name = "CFASettingsScreenTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let themeManager = ThemeManager(defaults: defaults)
        let appInformation = AppInformation(
            appName: "CFA Example",
            marketingVersion: "2.3",
            buildNumber: "4"
        )
        let viewModel = SettingsViewModel(
            appInformation: appInformation
        )
        viewModel.selectTheme(.forest, using: themeManager)
        #expect(themeManager.selectedTheme == .forest)
        #expect(viewModel.themeName(.systemGrey) == "System Grey")
        #expect(viewModel.appName == "CFA Example")
        #expect(viewModel.versionDescription == "Version 2.3 (4)")
        #expect(viewModel.developerWebsiteURL?.host() == "3daysofswiftconcurrency.com")
        let missingMetadataViewModel = SettingsViewModel(
            appInformation: AppInformation()
        )
        #expect(missingMetadataViewModel.appName == "App")
        #expect(missingMetadataViewModel.versionDescription == "Version — (—)")
    }
}
