import Foundation
import Testing
@testable import TabBarApp

@MainActor
struct SettingsViewModelTests {
    @Test func forwardsThemeSelectionToThemeManager() {
        let defaults = UserDefaults(suiteName: "SettingsViewModelTests-\(UUID().uuidString)")!
        let themeManager = ThemeManager(defaults: defaults)
        let viewModel = SettingsViewModel()

        viewModel.selectTheme(.forest, using: themeManager)

        #expect(themeManager.selection == .forest)
        #expect(defaults.string(forKey: "selectedTheme") == "forest")
    }
}
