import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("SettingsViewModel")
@MainActor
struct SettingsViewModelTests {
    @Test func forwardsTheThemeSelectionToItsManager() throws {
        let defaults = try #require(UserDefaults(suiteName: UUID().uuidString))
        let themeManager = ThemeManager(defaults: defaults)
        let viewModel = SettingsViewModel()

        viewModel.selectTheme(.light, using: themeManager)

        #expect(themeManager.selection == .light)
        #expect(defaults.string(forKey: "selectedTheme") == "light")
    }
}
