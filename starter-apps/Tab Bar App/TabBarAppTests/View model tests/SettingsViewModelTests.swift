import Foundation
import Testing
@testable import TabBarApp

@MainActor
struct SettingsViewModelTests {
    @Test func forwardsThemeSelectionToSettingsFeature() {
        let defaults = UserDefaults(suiteName: "SettingsViewModelTests-\(UUID().uuidString)")!
        let feature = SettingsFeature(defaults: defaults)
        let viewModel = SettingsViewModel(settingsFeature: feature)

        viewModel.selectTheme(.forest)

        #expect(feature.selectedTheme == .forest)
        #expect(viewModel.selectedTheme == .forest)
    }
}
