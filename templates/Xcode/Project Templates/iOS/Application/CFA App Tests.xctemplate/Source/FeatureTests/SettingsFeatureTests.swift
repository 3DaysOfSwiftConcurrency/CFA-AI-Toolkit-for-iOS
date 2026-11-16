import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("SettingsFeature")
@MainActor
struct SettingsFeatureTests {
    @Test func savesTheSelectedTheme() throws {
        let defaults = try #require(UserDefaults(suiteName: UUID().uuidString))
        let settingsFeature = SettingsFeature(defaults: defaults)

        settingsFeature.selectTheme(.dark)

        #expect(settingsFeature.selectedTheme == .dark)
    }
}
