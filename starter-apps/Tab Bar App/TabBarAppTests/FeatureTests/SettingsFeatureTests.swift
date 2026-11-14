import Foundation
import Testing
@testable import TabBarApp

@MainActor
struct SettingsFeatureTests {
    @Test func selectsAndPersistsTheme() {
        let suiteName = "SettingsFeatureTests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { UserDefaults.standard.removePersistentDomain(forName: suiteName) }
        let feature = SettingsFeature(defaults: defaults)

        #expect(feature.selectedTheme == .automatic)
        feature.selectTheme(.ocean)
        #expect(feature.selectedTheme == .ocean)
        #expect(SettingsFeature(defaults: defaults).selectedTheme == .ocean)
    }
}
