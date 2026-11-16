import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("SettingsViewModel")
@MainActor
struct SettingsViewModelTests {
    @Test func forwardsTheThemeSelectionToItsFeature() throws {
        let defaults = try #require(UserDefaults(suiteName: UUID().uuidString))
        let settingsFeature = SettingsFeature(defaults: defaults)
        let viewModel = SettingsViewModel(settingsFeature: settingsFeature)

        viewModel.selectTheme(.light)

        #expect(viewModel.selectedTheme == .light)
    }
}
